import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { pgOptions } from "./options";

const globalForDb = globalThis as unknown as { __efSql?: ReturnType<typeof postgres> };

const sql = globalForDb.__efSql ?? postgres(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5433/elite", pgOptions());

if (process.env.NODE_ENV !== "production") globalForDb.__efSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
