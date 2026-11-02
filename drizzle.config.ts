import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/store.db";
const remote = !url.startsWith("file:");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: remote ? "turso" : "sqlite",
  dbCredentials: remote ? { url, authToken: process.env.DATABASE_AUTH_TOKEN } : { url },
} satisfies Config;
