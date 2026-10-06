declare namespace Cloudflare {
  interface Env {
    DEEPSEEK_API_KEY?: string;
    PGHOST?: string;
    PGPORT?: string;
    PGUSER?: string;
    PGPASSWORD?: string;
    PGDATABASE?: string;
    PGSCHEMA?: string;
    PGSSLMODE?: string;
    BUCKET?: R2Bucket;
  }
}
