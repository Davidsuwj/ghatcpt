import { db } from "@/db/raw";
import { catalog,Row } from "@/lib/catalog";
import { guard,body,fail,HttpError,ownConversation,syncUser } from "@/lib/server";
async function mutate(request:Request){try{
 const user=await guard(request,true);const input=await body(request);const table=input.table;const spec=typeof table==="string"?catalog[table]:undefined;if(!spec)throw new HttpError(400,"未知的資料表。");
 const keys=input.keys??{},values=input.values??{};const pk=spec.pk;const where=pk.map(k=>`"${k}" = ?`).join(" AND ");
 if(request.method!=="POST"&&pk.some(k=>keys[k]===undefined||keys[k]===""))throw new HttpError(400,"缺少完整主鍵。");
 if(table==="User")throw new HttpError(403,"帳號資料由登入身分管理。");
 if(table==="Conversation"){
  if(request.method!=="POST")await ownConversation(keys.conversation_id,user.userId);
  if(request.method!=="DELETE"){
   if(values.user_id!==undefined&&values.user_id!==user.userId)throw new HttpError(403,"不能替其他使用者建立或轉移對話。");
   values.user_id=user.userId;await syncUser(user);
  }
 }
 if(["Message","MessageCitation"].includes(table)){
  if(request.method!=="POST")await ownConversation(keys.conversation_id,user.userId);
  if(request.method!=="DELETE")await ownConversation(values.conversation_id,user.userId);
 }
 if(request.method==="DELETE"){const result=await db().prepare(`DELETE FROM "${table}" WHERE ${where}`).bind(...pk.map(k=>keys[k])).run();if(!result.meta.changes)throw new HttpError(404,"資料已不存在。");return Response.json({ok:true});}
 const clean:Row={};
 for(const field of spec.fields){
  if(field.auto){if(request.method==="POST")clean[field.key]=field.key.endsWith("_at")?new Date().toISOString():crypto.randomUUID();continue;}
  const raw=values[field.key];if(raw===undefined)throw new HttpError(400,`缺少${field.label}。`);
  if(field.kind==="number"){const n=Number(raw);if(!Number.isSafeInteger(n)||n<1)throw new HttpError(400,`${field.label}必須是正整數。`);clean[field.key]=n;continue;}
  if(typeof raw!=="string")throw new HttpError(400,`${field.label}格式不正確。`);const v=raw.trim();if(!v&&!field.optional)throw new HttpError(400,`${field.label}不可空白。`);if(v.length>(field.kind==="long"?20000:300))throw new HttpError(400,`${field.label}太長。`);
  if(field.kind==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new HttpError(400,"電子郵件格式不正確。");
  if(field.kind==="url"&&v){try{if(!["https:","http:"].includes(new URL(v).protocol))throw new Error()}catch{throw new HttpError(400,"來源網址必須是完整的 http 或 https 網址。");}}
  if(field.options&&!field.options.includes(v))throw new HttpError(400,"角色不在允許範圍內。");clean[field.key]=field.kind==="email"?v.toLowerCase():v;
 }
 if(request.method==="POST"){const cols=Object.keys(clean);await db().prepare(`INSERT INTO "${table}" (${cols.map(c=>`"${c}"`).join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).bind(...cols.map(c=>clean[c])).run();}
 else{for(const k of pk)if(clean[k]!==undefined&&String(clean[k])!==String(keys[k]))throw new HttpError(400,"主鍵不可修改，請刪除後重新建立關聯。");const cols=Object.keys(clean).filter(k=>!pk.includes(k));if(!cols.length)throw new HttpError(400,"關聯表請以新增與刪除調整。");if(table==="Conversation"){const old=await db().prepare('SELECT bot_id FROM "Conversation" WHERE conversation_id=?').bind(keys.conversation_id).first();if(old&&old.bot_id!==clean.bot_id){const found=await db().prepare('SELECT COUNT(*) AS n FROM "Message" WHERE conversation_id=?').bind(keys.conversation_id).first<{n:number}>();if(found?.n)throw new HttpError(409,"已有訊息的對話不能更換機器人，請建立新對話。");}}
 const result=await db().prepare(`UPDATE "${table}" SET ${cols.map(c=>`"${c}"=?`).join(",")} WHERE ${where}`).bind(...cols.map(c=>clean[c]),...pk.map(k=>keys[k])).run();if(!result.meta.changes)throw new HttpError(404,"資料已不存在。");}
 return Response.json({ok:true,record:clean},{status:request.method==="POST"?201:200});
 }catch(e){return fail(e)}}
export const POST=mutate;export const PUT=mutate;export const DELETE=mutate;
