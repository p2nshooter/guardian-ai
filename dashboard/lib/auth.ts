/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Authentication & sessions — pure Web Crypto, no third-party auth.
 *
 * The session JWT carries the member's plan ("tier") and paid-until date, so
 * most requests never read the records. The entitlement inside the token is
 * re-read from R2 at most once per hour (ENT_TTL) or immediately after a payment, via
 * loadSession().
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { getData, secret } from "./db";
import type { Data } from "./data";
import { isPlanId, type Tier } from "./plans";

export const COOKIE_NAME = "axto_session";
const JWT_TTL = 7 * 24 * 3600;  // 7 days
const ENT_TTL = 3600;           // re-check subscription every hour

export type Role = "admin" | "member";

export interface Session {
  sub: string;
  email: string;
  role: Role;
  name: string;
  tier: Tier;          // active plan ("none" = free account)
  until: number;       // epoch seconds the plan is paid until (0 = n/a)
  ent: number;         // epoch seconds the entitlement was loaded
  iat: number;
  exp: number;
}

// ── base64url ────────────────────────────────────────────────────────────
function b64u(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s: string): Uint8Array<ArrayBuffer> {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const enc = (s: string) => new TextEncoder().encode(s);

let _key: CryptoKey | null = null;
async function jwtKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const s = secret("JWT_SECRET");
  if (!s) throw new Error("JWT_SECRET is not set");
  _key = await crypto.subtle.importKey("raw", enc(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return _key;
}

export async function signSession(p: Omit<Session, "iat" | "exp">): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload: Session = { ...p, iat, exp: iat + JWT_TTL };
  const head = b64u(enc(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64u(enc(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await jwtKey(), enc(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    // Only the canonical encoding is accepted: the last base64url character has
    // two unused bits, so an altered token could otherwise decode to the same bytes.
    const sig = unb64u(s);
    if (b64u(sig) !== s) return null;
    const ok = await crypto.subtle.verify("HMAC", await jwtKey(), sig, enc(`${h}.${b}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(b)));
    if (!p?.sub || typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    // Tokens from the previous platform used role "client" and carried no plan.
    return {
      sub: String(p.sub), email: String(p.email || ""), role: p.role === "admin" ? "admin" : "member",
      name: String(p.name || ""), tier: (isPlanId(p.tier) ? p.tier : "none") as Tier,
      until: Number(p.until) || 0, ent: Number(p.ent) || 0, iat: Number(p.iat) || 0, exp: p.exp,
    };
  } catch {
    return null;
  }
}

// ── Passwords: PBKDF2-SHA256, 100k iterations (Workers' maximum) ──────────
// Format "pbkdf2:<iter>:<saltHex>:<hashHex>" — identical to the previous
// platform, so existing admin passwords keep working.
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h: string): Uint8Array<ArrayBuffer> => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey("raw", enc(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, km, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2:100000:${hex(salt)}:${hex(await pbkdf2(password, salt, 100000))}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, it, saltHex, hashHex] = stored.split(":");
  if (algo !== "pbkdf2" || !saltHex || !hashHex) return false;
  const got = hex(await pbkdf2(password, unhex(saltHex), parseInt(it, 10) || 100000));
  if (got.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

export function passwordProblem(pw: string): string | null {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Use at least one letter and one number.";
  return null;
}

export function normEmail(e: unknown): string {
  return String(e || "").trim().toLowerCase();
}
export function isEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

// ── Entitlement loading ───────────────────────────────────────────────────
/**
 * Current entitlement of a user, or null when the account is gone or suspended.
 * With `issuedAt` (the token's iat) it is also null for a session issued before
 * the last password change — that is how a reset signs out every other device.
 */
export async function loadEntitlement(db: Data, userId: string, issuedAt?: number): Promise<Omit<Session, "iat" | "exp"> | null> {
  const [u, sub] = await Promise.all([db.users.get(userId), db.subscriptions.get(userId)]);
  if (!u || (u.status && u.status !== "active")) return null;
  if (issuedAt !== undefined && Number(u.sessions_valid_after) > 0 && issuedAt < Number(u.sessions_valid_after)) return null;
  const role: Role = u.role === "admin" ? "admin" : "member";
  const endMs = sub?.current_period_end ? Date.parse(sub.current_period_end) : 0;
  const paid = sub?.status === "active" && isPlanId(sub.plan) && endMs > Date.now();
  return {
    sub: u.id, email: u.email, role, name: u.name || "",
    tier: role === "admin" ? "enterprise" : paid ? (sub!.plan as Tier) : "none",
    until: paid ? Math.floor(endMs / 1000) : 0,
    ent: Math.floor(Date.now() / 1000),
  };
}

/** Every session issued before now is refused from now on (password change / reset). */
export async function signOutOtherSessions(db: Data, userId: string): Promise<void> {
  const at = String(Math.floor(Date.now() / 1000));
  await db.users.update(userId, (u) => ({ ...u, sessions_valid_after: at })).catch(() => {});
}

/** Effective tier right now (expires the moment the paid period ends, even mid-token). */
export function effectiveTier(s: Session): Tier {
  if (s.role === "admin") return "enterprise";
  if (s.tier === "none") return "none";
  return s.until * 1000 > Date.now() ? s.tier : "none";
}

// ── Cookie helpers ────────────────────────────────────────────────────────
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: JWT_TTL });
  return res;
}
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export async function issueSession(res: NextResponse, ent: Omit<Session, "iat" | "exp">): Promise<NextResponse> {
  return setSessionCookie(res, await signSession(ent));
}

/**
 * Read the session from the request. If the embedded entitlement is older than
 * an hour (or `fresh` is requested) it is reloaded and `refreshed` holds
 * a new token that the caller should set on its response via `respond()`.
 */
export async function loadSession(req: NextRequest, opts: { fresh?: boolean } = {}): Promise<{ session: Session; refreshed: string | null } | null> {
  const s = await verifySession(req.cookies.get(COOKIE_NAME)?.value);
  if (!s) return null;
  const stale = opts.fresh || Date.now() / 1000 - s.ent > ENT_TTL;
  if (!stale) return { session: s, refreshed: null };
  try {
    const ent = await loadEntitlement(getData(req), s.sub, s.iat);
    if (!ent) return null; // deleted or suspended account, or signed out by a password change
    const token = await signSession(ent);
    const session = (await verifySession(token))!;
    return { session, refreshed: token };
  } catch {
    return { session: s, refreshed: null }; // DB hiccup: keep the (signed) token we have
  }
}

/**
 * Session for a plan-gated feature. The cookie's plan can be up to an hour old;
 * when it would DENY access, re-read the plan once before refusing, so a
 * payment that was just confirmed (webhook, on-chain, admin approval) works at
 * once. The allowed path costs nothing extra.
 */
export async function loadSessionFor(req: NextRequest, allowed: (tier: Tier) => boolean): Promise<{ session: Session; refreshed: string | null } | null> {
  const ctx = await loadSession(req);
  if (!ctx || allowed(effectiveTier(ctx.session)) || ctx.refreshed) return ctx;
  return (await loadSession(req, { fresh: true })) || ctx;
}

/** JSON response that also persists a refreshed session token when there is one. */
export function respond(data: unknown, ctx: { refreshed: string | null } | null, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  if (ctx?.refreshed) setSessionCookie(res, ctx.refreshed);
  return res;
}

export const unauthorized = () => NextResponse.json({ error: "Please sign in." }, { status: 401 });
export const forbidden = (msg = "You do not have access to this.") => NextResponse.json({ error: msg }, { status: 403 });

/** Admin routes re-read the account on every call: a demoted, suspended or signed-out admin loses access at once. */
export async function requireAdmin(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx || ctx.session.role !== "admin") return null;
  return ctx;
}
