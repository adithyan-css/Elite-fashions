import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./data/store.db";
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.execute("PRAGMA journal_mode=WAL").catch(() => {});
console.log("migrations applied to", url.startsWith("file:") ? url : "remote database");
client.close();
