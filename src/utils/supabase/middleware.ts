import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

/** Refreshes the Supabase session cookie on every admin request and reports whether a user is signed in. */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Do not run code between createServerClient and getUser(): getUser() revalidates the token with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, signedIn: Boolean(user) };
}
