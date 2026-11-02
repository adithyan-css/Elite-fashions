import type { Options } from "postgres";

/**
 * Connection options shared by the app and the scripts.
 * - Supabase (and any non-local host) requires TLS.
 * - The Supabase transaction pooler (port 6543) does not support prepared statements.
 */
export function pgOptions(url = process.env.DATABASE_URL ?? ""): Options<Record<string, never>> {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || url === "";
  const pooler = /:6543\//.test(url) || /pooler\.supabase\.com/.test(url);
  return {
    max: Number(process.env.DATABASE_POOL_MAX ?? (pooler ? 5 : 10)),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? false : "require",
    prepare: !pooler,
    onnotice: () => {},
  };
}
