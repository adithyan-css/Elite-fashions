import type { Options } from "postgres";

/**
 * Connection options shared by the app and the scripts.
 * - Supabase (and any non-local host) requires TLS.
 * - The Supabase transaction pooler (port 6543) does not support prepared statements,
 *   and must not receive pipelined queries: it can hand the pieces of pipelined
 *   queries to different server connections, which then wait forever (ClientRead).
 */
export function pgOptions(url = process.env.DATABASE_URL ?? ""): Options<Record<string, never>> {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url === "";
  const pooler = /:6543\//.test(url) || /pooler\.supabase\.com/.test(url);
  return {
    max: Number(process.env.DATABASE_POOL_MAX ?? (pooler ? 5 : 10)),
    idle_timeout: 20,
    connect_timeout: 15,
    max_pipeline: pooler ? 1 : 100,
    queue_timeout: pooler ? 20 : 0,
    ssl: local ? false : "require",
    prepare: !pooler,
    onnotice: () => {},
  };
}
