/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AXTO CONNECT — who is calling the developer API.
 *
 *   Authorization: Bearer axto_sk_…   a member's API key (server-side apps)
 *   ?token=axto_st_… / Bearer axto_st_… a short-lived stream token minted with a
 *                                      key, for browsers (EventSource / WebSocket
 *                                      cannot send headers); scoped to channels
 *   axto_session cookie               the member's own portal session (console)
 *
 * Keys are random 32-byte values, stored only as SHA-256 digests, shown once.
 * Every call re-reads the member's plan, so a lapsed plan stops the API at once.
 * ============================================================================ */
import type { NextRequest } from "next/server";
import { now, secret } from "../db";
import type { Data } from "../data";
import { loadEntitlement, loadSession, effectiveTier } from "../auth";
import { limitsFor, type Tier } from "../plans";

export const SCOPES = ["ai:run", "events:read", "events:write", "rtc", "mcp"] as const;
export type Scope = (typeof SCOPES)[number];
export const KEY_PREFIX = "axto_sk_";
export const TOKEN_PREFIX = "axto_st_";

export interface Caller {
  userId: string; email: string; tier: Tier; scopes: Scope[];
  keyId?: string; origins: string[]; via: "key" | "token" | "session";
  channels?: string[];            // stream tokens only: the channels they may read
}

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

/** A fresh key: "axto_sk_" + 43 base64url characters (256 bits). */
export function newApiKey(): string {
  return KEY_PREFIX + b64u(crypto.getRandomValues(new Uint8Array(32)));
}

export function cleanScopes(v: unknown): Scope[] {
  const list = Array.isArray(v) ? v : String(v || "").split(/[\s,]+/);
  const out = Array.from(new Set(list.map((x) => String(x).trim()).filter((x): x is Scope => (SCOPES as readonly string[]).includes(x))));
  return out.length ? out : [...SCOPES];
}

/** "https://app.example.com" style origins (or "*"); anything else is dropped. */
export function cleanOrigins(v: unknown): string[] {
  const list = Array.isArray(v) ? v : String(v || "").split(/[\s,]+/);
  const out: string[] = [];
  for (const raw of list) {
    const s = String(raw).trim().replace(/\/+$/, "");
    if (!s) continue;
    if (s === "*") { out.push("*"); continue; }
    try {
      const u = new URL(s);
      if ((u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) && u.pathname === "/" && !u.search) out.push(u.origin);
    } catch {}
  }
  return Array.from(new Set(out)).slice(0, 20);
}

// ── short-lived stream tokens (HMAC-SHA256, key derived from JWT_SECRET) ──
let tokenKey: CryptoKey | null = null;
async function streamKey(): Promise<CryptoKey> {
  if (tokenKey) return tokenKey;
  const s = secret("JWT_SECRET");
  if (!s) throw new Error("JWT_SECRET is not set");
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), "HKDF", false, ["deriveKey"]);
  tokenKey = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("axto.io/connect"), info: new TextEncoder().encode("stream-token") },
    base, { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign", "verify"]);
  return tokenKey;
}
export interface StreamClaims { sub: string; kid: string; ch: string[]; sc: Scope[]; og: string[]; exp: number }
export async function mintStreamToken(c: Omit<StreamClaims, "exp">, ttlSeconds: number): Promise<{ token: string; expiresAt: string }> {
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, Math.min(24 * 3600, Math.floor(ttlSeconds)));
  const body = b64u(new TextEncoder().encode(JSON.stringify({ ...c, exp })));
  const sig = b64u(new Uint8Array(await crypto.subtle.sign("HMAC", await streamKey(), new TextEncoder().encode(body))));
  return { token: `${TOKEN_PREFIX}${body}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
}
export async function verifyStreamToken(token: string): Promise<StreamClaims | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const [body, sig] = token.slice(TOKEN_PREFIX.length).split(".");
  if (!body || !sig) return null;
  try {
    const raw = unb64u(sig);
    if (b64u(raw) !== sig) return null;
    if (!(await crypto.subtle.verify("HMAC", await streamKey(), raw, new TextEncoder().encode(body)))) return null;
    const c = JSON.parse(new TextDecoder().decode(unb64u(body))) as StreamClaims;
    return c.exp > Date.now() / 1000 && c.sub ? c : null;
  } catch { return null; }
}

function bearer(req: NextRequest): string {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (m) return m[1];
  // WebSocket clients can pass a token as a subprotocol: "axto.token.<token>"
  const proto = req.headers.get("sec-websocket-protocol") || "";
  const p = proto.split(",").map((x) => x.trim()).find((x) => x.startsWith("axto.token."));
  if (p) return p.slice("axto.token.".length);
  return new URL(req.url).searchParams.get("token") || "";
}

export class ConnectError extends Error { constructor(message: string, public status = 401, public code = "unauthenticated") { super(message); } }

/** Resolve the caller or throw ConnectError. `allowSession` lets the portal console use the cookie. */
export async function authenticate(req: NextRequest, db: Data, opts: { allowSession?: boolean } = {}): Promise<Caller> {
  const token = bearer(req);
  if (token.startsWith(KEY_PREFIX)) {
    // A key in a URL would end up in logs and history: refuse it there.
    if (new URL(req.url).searchParams.get("token") === token) throw new ConnectError("Send API keys in the Authorization header. In a browser, mint a stream token with POST /api/v1/tokens.", 400, "invalid_argument");
    const row = await db.apiKeys.find("hash", await sha256Hex(token));
    if (!row || row.revoked_at) throw new ConnectError("This API key is not valid (it may have been revoked).");
    const ent = await loadEntitlement(db, row.user_id);
    if (!ent) throw new ConnectError("The account behind this key is not active.", 403, "permission_denied");
    const tier = ent.role === "admin" ? "enterprise" : ent.tier;
    if (limitsFor(tier).apiKeys <= 0) throw new ConnectError("The developer API needs a paid plan.", 402, "failed_precondition");
    // Touch last-used at most once a minute (one write per key per minute at most).
    if (!row.last_used_at || Date.now() - Date.parse(row.last_used_at) > 60_000) await db.apiKeys.update(row.id, (k) => ({ ...k, last_used_at: now() })).catch(() => {});
    return { userId: row.user_id, email: ent.email, tier, scopes: cleanScopes(row.scopes), keyId: row.id, origins: row.origins ? row.origins.split(" ") : [], via: "key" };
  }
  if (token.startsWith(TOKEN_PREFIX)) {
    const c = await verifyStreamToken(token);
    if (!c) throw new ConnectError("This stream token is not valid or has expired. Mint a new one.");
    const key = await db.apiKeys.get(c.kid).catch(() => null);
    if (!key || key.revoked_at) throw new ConnectError("The key that minted this token was revoked.");
    const ent = await loadEntitlement(db, c.sub);
    if (!ent) throw new ConnectError("The account behind this token is not active.", 403, "permission_denied");
    const tier = ent.role === "admin" ? "enterprise" : ent.tier;
    if (limitsFor(tier).apiKeys <= 0) throw new ConnectError("The developer API needs a paid plan.", 402, "failed_precondition");
    return { userId: c.sub, email: ent.email, tier, scopes: c.sc, keyId: c.kid, origins: c.og, via: "token", channels: c.ch };
  }
  if (opts.allowSession) {
    const ctx = await loadSession(req, { fresh: true });
    if (ctx) {
      const tier = effectiveTier(ctx.session);
      if (limitsFor(tier).apiKeys <= 0) throw new ConnectError("The developer API needs a paid plan.", 402, "failed_precondition");
      return { userId: ctx.session.sub, email: ctx.session.email, tier, scopes: [...SCOPES], origins: [], via: "session" };
    }
  }
  throw new ConnectError("Send an API key: Authorization: Bearer axto_sk_…");
}

export function requireScope(c: Caller, s: Scope) {
  if (!c.scopes.includes(s)) throw new ConnectError(`This key does not have the "${s}" scope.`, 403, "permission_denied");
}

/** May this caller read `channel`? Stream tokens are limited to their channels ("*" = all). */
export function canReadChannel(c: Caller, channel: string): boolean {
  if (!c.channels) return true;
  return c.channels.some((p) => p === "*" || p === channel || (p.endsWith("*") && channel.startsWith(p.slice(0, -1))));
}
