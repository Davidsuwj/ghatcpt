import { env } from "cloudflare:workers";
import { db } from "@/db/raw";
import { guard,body,fail,HttpError,ownConversation } from "@/lib/server";
import { retrieve,Doc } from "@/lib/retrieve";
import { ensureDeepSeekModel,connectSharedKnowledge } from "@/lib/models";
import { DEEPSEEK_MODEL,ProviderError,buildMessages,deepSeekTokens,openDeepSeek,usedSources,ChatTurn } from "@/lib/deepseek";

async function saveExchange(id:string,question:string,answer:string,sources:Doc[]) {
 const now=new Date().toISOString();
 const statements=[
  db().prepare(`INSERT INTO "Message" (conversation_id,message_no,role,content,sent_at) SELECT ?,COALESCE(MAX(message_no),0)+1,'user',?,? FROM "Message" WHERE conversation_id=?`).bind(id,question,now,id),
  db().prepare(`INSERT INTO "Message" (conversation_id,message_no,role,content,sent_at) SELECT ?,COALESCE(MAX(message_no),0)+1,'assistant',?,? FROM "Message" WHERE conversation_id=?`).bind(id,answer,now,id),
  ...sources.map(d=>db().prepare('INSERT INTO "MessageCitation" (conversation_id,message_no,kb_id,document_no) SELECT ?,MAX(message_no),?,? FROM "Message" WHERE conversation_id=?').bind(id,d.kb_id,d.document_no,id))
 ];
 await db().batch(statements,{conversationId:id});
 const saved=await db().batch([db().prepare('SELECT * FROM "Message" WHERE conversation_id=? ORDER BY message_no').bind(id),db().prepare('SELECT * FROM "MessageCitation" WHERE conversation_id=?').bind(id)]);
 return {ok:true,citations:sources.length,messages:saved[0].results,references:saved[1].results};
}
function generationError(error:unknown){
 if(error instanceof ProviderError)return new HttpError(error.status,error.message);
 if(error instanceof Error&&["AbortError","TimeoutError"].includes(error.name))return new HttpError(504,"回覆等候逾時，請再試一次。");
 return new HttpError(503,"回覆未完成或未儲存，請稍後再試。");
}
export async function POST(request:Request){
 try{
  const user=await guard(request,true);const input=await body(request);
  if(typeof input.content!=="string"||!input.content.trim()||input.content.length>4000||typeof input.conversation_id!=="string")throw new HttpError(400,"請輸入 1 到 4000 字的訊息。");
  const id=input.conversation_id,question=input.content.trim();
  const conv=await ownConversation(id,user.userId);
  await ensureDeepSeekModel();
  const model=await db().prepare('SELECT model_name FROM "Chatbot" WHERE bot_id=?').bind(conv.bot_id).first<{model_name:string}>();
  if(!model||!["retrieval-v1",DEEPSEEK_MODEL].includes(model.model_name))throw new HttpError(409,"這個模型尚未連線。");
  await connectSharedKnowledge(String(conv.bot_id));
  const docs=await db().prepare('SELECT d.* FROM "Document" d JOIN "BotKnowledge" bk ON d.kb_id=bk.kb_id WHERE bk.bot_id=? ORDER BY d.kb_id,d.document_no').bind(conv.bot_id).all<Doc>();
  if(!env.DEEPSEEK_API_KEY)throw new HttpError(503,"DeepSeek 尚未設定金鑰。");
  const previous=await db().prepare('SELECT role,content FROM "Message" WHERE conversation_id=? AND role IN (\'user\',\'assistant\') ORDER BY message_no DESC LIMIT 20').bind(id).all<ChatTurn>();
  const result=retrieve(question,docs.results,previous.results.find(m=>m.role==="user")?.content);
  const abort=new AbortController();
  const signal=AbortSignal.any([request.signal,abort.signal,AbortSignal.timeout(90000)]);
  let upstream:Response;
  try{upstream=await openDeepSeek(env.DEEPSEEK_API_KEY,buildMessages(previous.results.reverse(),question,result.matched),signal)}catch(e){throw generationError(e)}
  const finish=async(answer:string)=>{
   if(!answer.trim())throw new ProviderError(502,"DeepSeek 傳回空白回覆，請再試一次。");
   return {...await saveExchange(id,question,answer,usedSources(answer,result.matched)),mode:"deepseek",model:DEEPSEEK_MODEL};
  };
  if(input.stream!==true){
   try{let answer="";for await(const token of deepSeekTokens(upstream))answer+=token;return Response.json(await finish(answer));}catch(e){throw generationError(e)}finally{abort.abort()}
  }
  const encoder=new TextEncoder();let cancelled=false;
  const stream=new ReadableStream({
   async start(controller){
    const emit=(event:unknown)=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify(event)+"\n"))};
    try{
     let answer="";
     for await(const token of deepSeekTokens(upstream)){answer+=token;emit({type:"delta",text:token});}
     if(cancelled)return;
     emit({type:"done",...await finish(answer)});
    }catch(e){if(!cancelled){const error=generationError(e);emit({type:"error",error:error.message,status:error.status})}}
    finally{abort.abort();if(!cancelled)controller.close()}
   },
   cancel(){cancelled=true;abort.abort()},
  });
  return new Response(stream,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-store, no-transform","X-Content-Type-Options":"nosniff"}});
 }catch(e){return fail(e)}
}
