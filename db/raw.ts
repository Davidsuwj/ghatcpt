import { env } from "cloudflare:workers";
export function db(){
 if(!env.DB)throw new Error("資料庫暫時無法使用。");
 return env.DB;
}
