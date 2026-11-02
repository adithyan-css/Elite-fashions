import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __efClient?: ReturnType<typeof createClient> };

const client =
  globalForDb.__efClient ??
  createClient({
    url: process.env.DATABASE_URL ?? "file:./data/store.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__efClient = client;

export const db = drizzle(client, { schema });
export { schema };
