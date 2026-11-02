import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "ef_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signSession(uid: number, sv: number): Promise<string> {
  return new SignJWT({ sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(uid))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setAudience("ef-admin")
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<{ uid: number; sv: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "ef-admin" });
    const uid = Number(payload.sub);
    const sv = Number(payload.sv);
    return Number.isInteger(uid) && Number.isInteger(sv) ? { uid, sv } : null;
  } catch {
    return null;
  }
}
