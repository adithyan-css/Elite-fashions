import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq, gt, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session-token";
import { supabaseAuthEnabled } from "@/utils/supabase/config";
import { createClient as createSupabase } from "@/utils/supabase/server";

export type Admin = { id: number; email: string; name: string; role: "owner" | "staff"; mustChangePassword: boolean };

const MAX_FAILS = 5;
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("timing-equaliser-not-a-password", 12));
const WINDOW_MS = 15 * 60 * 1000;

function toAdmin(u: typeof s.adminUsers.$inferSelect): Admin {
  return { id: u.id, email: u.email, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword };
}

/** The signed-in admin, or null. Reads cookies, so call it inside a Suspense boundary or an action. */
export async function getAdmin(): Promise<Admin | null> {
  if (supabaseAuthEnabled()) {
    const supabase = await createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    if (!email) return null;
    const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
    return u ? toAdmin(u) : null; // a Supabase user who is not in admin_users gets no access
  }
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, session.uid));
  if (!u || u.sessionVersion !== session.sv) return null;
  return toAdmin(u);
}

export async function requireAdmin(opts: { allowPasswordChange?: boolean; ownerOnly?: boolean } = {}): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword && !opts.allowPasswordChange) redirect("/admin/account?first=1");
  if (opts.ownerOnly && admin.role !== "owner") redirect("/admin");
  return admin;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

export async function isLockedOut(ip: string, email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.loginAttempts)
    .where(and(eq(s.loginAttempts.success, false), gt(s.loginAttempts.createdAt, since), or(eq(s.loginAttempts.ip, ip), eq(s.loginAttempts.email, email))));
  return n >= MAX_FAILS;
}

async function setLocalSession(u: { id: number; sessionVersion: number }) {
  const token = await signSession(u.id, u.sessionVersion);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export type LoginResult = { ok: true; mustChangePassword: boolean } | { ok: false; error: string };

export async function login(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const ip = await clientIp();
  if (!email || !password || email.length > 200 || password.length > 200) return { ok: false, error: "Enter your email and password" };
  if (await isLockedOut(ip, email)) return { ok: false, error: "Too many wrong attempts. Please wait 15 minutes and try again." };

  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
  let good = false;
  if (supabaseAuthEnabled()) {
    const supabase = await createSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    good = !error && Boolean(u);
    if (!error && !u) await supabase.auth.signOut();
  } else {
    // compare against a dummy hash when the user does not exist, so timing does not reveal valid emails
    const hash = u?.passwordHash ?? getDummyHash();
    good = (await bcrypt.compare(password, hash)) && Boolean(u);
  }
  await db.insert(s.loginAttempts).values({ ip, email, success: good });
  if (!good || !u) return { ok: false, error: "Wrong email or password" };
  if (!supabaseAuthEnabled()) await setLocalSession(u);
  return { ok: true, mustChangePassword: u.mustChangePassword };
}

export async function logout(everywhere = false) {
  const admin = await getAdmin();
  if (supabaseAuthEnabled()) {
    const supabase = await createSupabase();
    await supabase.auth.signOut({ scope: everywhere ? "global" : "local" });
  }
  if (admin && everywhere) {
    await db.update(s.adminUsers).set({ sessionVersion: sql`${s.adminUsers.sessionVersion} + 1` }).where(eq(s.adminUsers.id, admin.id));
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters";
  if (pw.length > 128) return "Use at most 128 characters";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Use letters and at least one number";
  return null;
}

export async function changePassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Please sign in again" };
  const problem = passwordProblem(next);
  if (problem) return { ok: false, error: problem };
  if (current === next) return { ok: false, error: "Choose a password different from the current one" };
  const [u] = await db.select().from(s.adminUsers).where(eq(s.adminUsers.id, admin.id));

  if (supabaseAuthEnabled()) {
    const supabase = await createSupabase();
    const check = await supabase.auth.signInWithPassword({ email: u.email, password: current });
    if (check.error) return { ok: false, error: "Current password is wrong" };
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, error: error.message };
    await db.update(s.adminUsers).set({ mustChangePassword: false }).where(eq(s.adminUsers.id, u.id));
    return { ok: true };
  }
  if (!(await bcrypt.compare(current, u.passwordHash))) return { ok: false, error: "Current password is wrong" };
  const [updated] = await db
    .update(s.adminUsers)
    .set({ passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false, sessionVersion: sql`${s.adminUsers.sessionVersion} + 1` })
    .where(eq(s.adminUsers.id, u.id))
    .returning();
  await setLocalSession(updated); // other devices are signed out, this one stays in
  return { ok: true };
}
