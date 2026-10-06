import { db } from "@/db/raw";
import { seedRows } from "@/db/seed";
import { guard,fail,HttpError } from "@/lib/server";
export async function POST(request:Request){try{
 await guard(request,true);const count=await db().prepare('SELECT COUNT(*) AS n FROM "KnowledgeBase"').first<{n:number}>();if(count?.n)throw new HttpError(409,"已有知識庫資料。");
 const statements=["KnowledgeBase","Chatbot","Document","BotKnowledge"].flatMap(table=>seedRows[table].map(row=>{
  const cols=Object.keys(row);return db().prepare(`INSERT INTO "${table}" (${cols.map(c=>`"${c}"`).join(",")}) VALUES (${cols.map(()=>"?").join(",")}) ON CONFLICT DO NOTHING`).bind(...cols.map(c=>row[c]));
 }));await db().batch(statements);return Response.json({ok:true});
}catch(e){return fail(e)}}
