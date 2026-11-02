import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";
import { supabaseAuthEnabled } from "@/utils/supabase/config";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Optimistic guard for the admin area. Every admin page and action ALSO checks the session on
 * the server (requireAdmin), so this only keeps signed-out visitors away from admin screens.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  let response = NextResponse.next({ request });
  let signedIn: boolean;
  if (supabaseAuthEnabled()) {
    const r = await updateSession(request);
    response = r.response;
    signedIn = r.signedIn;
  } else {
    signedIn = Boolean(await verifySession(request.cookies.get(SESSION_COOKIE)?.value));
  }

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
