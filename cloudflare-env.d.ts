declare namespace Cloudflare {
 interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY?: string;
  MAINTENANCE_MODE?: string;
  BUCKET?: R2Bucket;
 }
}
