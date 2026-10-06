import { db } from "@/db/raw";
import { catalog } from "@/lib/catalog";
import { guard,fail,syncUser } from "@/lib/server";
import { ensureDeepSeekModel } from "@/lib/models";
export async function GET(request:Request){try{
 const user=await guard(request);const profile=await syncUser(user);await ensureDeepSeekModel();const names=Object.keys(catalog);
 const result=await db().batch(names.map(name=>{
  const filter=name==="User"?'user_id=?':name==="Conversation"?'user_id=?':["Message","MessageCitation"].includes(name)?'conversation_id IN (SELECT conversation_id FROM "Conversation" WHERE user_id=?)':"";
  const query=db().prepare(`SELECT * FROM "${name}" ${filter?`WHERE ${filter}`:""} ORDER BY ${catalog[name].pk.map(x=>`"${x}"`).join(",")}`);return filter?query.bind(user.userId):query;
 }));return Response.json({user:profile,tables:Object.fromEntries(names.map((name,i)=>[name,result[i].results]))},{headers:{"Cache-Control":"private, no-store"}});
}catch(e){return fail(e)}}
