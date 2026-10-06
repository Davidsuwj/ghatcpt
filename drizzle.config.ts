import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./postgres/migrations",
  schema: "./db/schema.ts",
  dialect: "postgresql",
});
