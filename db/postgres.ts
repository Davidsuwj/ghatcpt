import pg from "pg";
import type { ClientConfig,QueryResult } from "pg";
pg.types.setTypeParser(20,value=>{const number=Number(value);return Number.isSafeInteger(number)?number:value});

export type DatabaseResult<T=Record<string,any>>={results:T[];meta:{changes:number}};

// SQL values always stay bound parameters. Quoted SQL text is never rewritten.
export function postgresParameters(sql:string){
 let index=0,quote="",result="";
 for(let i=0;i<sql.length;i++){
  const char=sql[i];
  if(quote){result+=char;if(char===quote){if(sql[i+1]===quote){result+=sql[++i]}else quote="";}continue;}
  if(char==="'"||char==='"'){quote=char;result+=char;}
  else result+=char==="?"?`$${++index}`:char;
 }
 return result;
}
function format(result:QueryResult):DatabaseResult{
 const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?value.toISOString():value])));
 return {results:rows,meta:{changes:result.rowCount??0}};
}
export class Statement{
 sql:string;values:unknown[];private database:PostgresDatabase;
 constructor(sql:string,values:unknown[],database:PostgresDatabase){this.sql=sql;this.values=values;this.database=database}
 bind(...values:unknown[]){return new Statement(this.sql,values,this.database)}
 async all<T=Record<string,any>>():Promise<DatabaseResult<T>>{return await this.database.execute(this) as DatabaseResult<T>}
 async first<T=Record<string,any>>():Promise<T|null>{return (await this.all<T>()).results[0]??null}
 async run(){return this.database.execute(this)}
}
export class PostgresDatabase{
 private config:ClientConfig;
 constructor(config:ClientConfig){this.config=config}
 prepare(sql:string){return new Statement(postgresParameters(sql),[],this)}
 async execute(statement:Statement){
  const client=new pg.Client(this.config);
  try{await client.connect();return format(await client.query(statement.sql,statement.values));}
  finally{await client.end().catch(()=>{})}
 }
 async batch(statements:Statement[],options:{conversationId?:string}={}){
  const client=new pg.Client(this.config);
  try{
   await client.connect();await client.query("BEGIN");
   if(options.conversationId)await client.query('SELECT conversation_id FROM "Conversation" WHERE conversation_id=$1 FOR UPDATE',[options.conversationId]);
   const results=[];
   for(const statement of statements)results.push(format(await client.query(statement.sql,statement.values)));
   await client.query("COMMIT");return results;
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error}
  finally{await client.end().catch(()=>{})}
 }
}
