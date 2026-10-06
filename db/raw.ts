import { env } from "cloudflare:workers";
import { PostgresDatabase } from "./postgres";
export function db(){
 if(!env.PGHOST||!env.PGUSER||!env.PGPASSWORD||!env.PGDATABASE)throw new Error("PostgreSQL 尚未設定。");
 const schema=env.PGSCHEMA||"ghatcpt";
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw new Error("資料庫綱目設定不正確。");
 return new PostgresDatabase({host:env.PGHOST,port:Number(env.PGPORT||5432),user:env.PGUSER,password:env.PGPASSWORD,database:env.PGDATABASE,
  ssl:env.PGSSLMODE==="disable"?false:true,options:`-c search_path=${schema} -c timezone=UTC`,
  application_name:"ghatcpt",connectionTimeoutMillis:8000,query_timeout:15000,statement_timeout:15000});
}
