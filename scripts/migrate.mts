import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { pgOptions } from "../src/db/options.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { ...pgOptions(url), max: 1 });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
console.log("migrations applied to", new URL(url).host);
await sql.end();
