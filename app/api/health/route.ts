import { db } from "@/db/raw";
import { guard,fail } from "@/lib/server";
export async function GET(request:Request){
 try{
  await guard(request);
  const result=await db().prepare('SELECT current_database() AS database,current_schema() AS schema,1 AS connected').first();
  return Response.json({ok:true,backend:"postgresql",database:result?.database,schema:result?.schema,connected:result?.connected===1},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return fail(error)}
}
