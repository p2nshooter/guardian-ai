import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";

const COOKIE_NAME = "axto_session";
const JWT_EXPIRY  = 7 * 24 * 60 * 60; // 7 days

interface JWTPayload {
  sub:   string;
  email: string;
  role:  "admin" | "client";
  iat:   number;
  exp:   number;
}

// ── Base64url helpers ─────────────────────────────────────────────────────
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad.padEnd(pad.length + (4 - pad.length % 4) % 4, "="));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ── JWT Key ───────────────────────────────────────────────────────────────
let _key: CryptoKey | null = null;
async function getJWTKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  _key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" } as any, false, ["sign", "verify"]
  );
  return _key;
}

// ── Sign JWT ──────────────────────────────────────────────────────────────
export async function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const full: JWTPayload = { ...payload, iat, exp: iat + JWT_EXPIRY };

  const header  = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body    = b64urlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const key     = await getJWTKey();
  const sigBuf  = await crypto.subtle.sign("HMAC" as any, key, new TextEncoder().encode(`${header}.${body}`));

  return `${header}.${body}.${b64urlEncode(sigBuf)}`;
}

// ── Verify JWT ────────────────────────────────────────────────────────────
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const key   = await getJWTKey();
    const valid = await crypto.subtle.verify(
      "HMAC" as any, key, b64urlDecode(sig).buffer as unknown as ArrayBuffer,
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Get current user from request ────────────────────────────────────────
export async function getUser(req: NextRequest): Promise<JWTPayload | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifyJWT(cookie);
}

export async function requireUser(req: NextRequest): Promise<JWTPayload | null> {
  return getUser(req);
}

export async function requireAdmin(req: NextRequest): Promise<JWTPayload | null> {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

// ── Set/clear session cookie ──────────────────────────────────────────────
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",
    path:     "/",
    maxAge:   JWT_EXPIRY,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

// ── Magic link flow ───────────────────────────────────────────────────────
export async function createMagicToken(email: string, req: NextRequest): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const db = getDB(req);
  await dbRun(db,
    `INSERT INTO magic_links (id, email, token, expires_at, used)
     VALUES (?, ?, ?, datetime('now', '+15 minutes'), 0)
     ON CONFLICT(email) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at, used=0`,
    [newId(), email.toLowerCase(), token]
  );
  return token;
}

export async function verifyMagicToken(
  token: string, req: NextRequest
): Promise<{ id: string; email: string; role: "admin" | "client" } | null> {
  try {
    const db   = getDB(req);
    const link = await dbFirst<{ email: string; used: number; expires_at: string }>(
      db,
      `SELECT email, used, expires_at FROM magic_links WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      [token]
    );
    if (!link) return null;

    await dbRun(db, `UPDATE magic_links SET used = 1 WHERE token = ?`, [token]);

    let user = await dbFirst<{ id: string; email: string; role: string }>(
      db, `SELECT id, email, role FROM users WHERE email = ?`, [link.email]
    );

    if (!user) {
      const id = newId();
      await dbRun(db,
        `INSERT INTO users (id, email, role, created_at) VALUES (?, ?, 'client', ?)`,
        [id, link.email, now()]
      );
      user = { id, email: link.email, role: "client" };
    }

    return { id: user.id, email: user.email, role: user.role as "admin" | "client" };
  } catch {
    return null;
  }
}
