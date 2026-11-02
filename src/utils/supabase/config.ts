export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Supabase Auth is used for the owner login when the project URL and publishable key are set. */
export function supabaseAuthEnabled(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}
