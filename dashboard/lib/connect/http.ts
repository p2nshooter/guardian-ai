/* ==============================================================================
 * AXTO CONNECT — HTTP plumbing shared by every /api/v1 route: CORS per key,
 * JSON errors with a stable code, per-member rate limits from the plan.
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../rate-limit";
import { limitsFor } from "../plans";
import { ConnectError, type Caller } from "./auth";

const ALLOW_HEADERS = "Authorization, Content-Type, Last-Event-ID, Connect-Protocol-Version, Connect-Timeout-Ms, Idempotency-Key, Mcp-Session-Id, MCP-Protocol-Version";
const EXPOSE = "X-AI-Provider, X-AI-Model, X-RateLimit-Remaining, Retry-After, Mcp-Session-Id";

/** CORS headers for a caller: only origins listed on the key (or "*") may call from a browser. */
export function corsHeaders(req: NextRequest, caller?: Caller | null): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  const allowed = caller ? caller.origins.includes("*") || caller.origins.includes(origin) || caller.via === "session" : true;
  if (!allowed) return {};
  return { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Expose-Headers": EXPOSE };
}

/** Preflight: the real request is authorised (and its origin checked against the key) when it arrives. */
export function preflight(req: NextRequest, methods = "GET, POST, OPTIONS"): NextResponse {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": methods, "Access-Control-Allow-Headers": ALLOW_HEADERS, "Access-Control-Max-Age": "86400", "Vary": "Origin" },
  });
}

/** A browser call from an origin the key does not list is refused (server-side calls have no Origin). */
export function originProblem(req: NextRequest, caller: Caller): ConnectError | null {
  const origin = req.headers.get("origin");
  if (!origin || caller.via === "session") return null;
  const self = new URL(req.url).origin;
  if (origin === self) return null;
  if (caller.origins.includes("*") || caller.origins.includes(origin)) return null;
  return new ConnectError(`Origin ${origin} is not allowed for this key. Add it under Developers → API keys → Allowed origins.`, 403, "permission_denied");
}

export function apiError(req: NextRequest, e: unknown, caller?: Caller | null): NextResponse {
  if (e instanceof ConnectError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status, headers: corsHeaders(req, caller) });
  }
  throw e;
}

export function apiJson(req: NextRequest, caller: Caller | null, data: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...corsHeaders(req, caller), ...extra } });
}

/** Per-member limit from the plan (requests per minute across all keys). */
export async function limit(req: NextRequest, caller: Caller, cost = 1): Promise<string> {
  const rpm = Math.max(1, limitsFor(caller.tier).apiRpm);
  let r = { limited: false, remaining: rpm, retryAfterSeconds: 0 };
  for (let i = 0; i < cost; i++) r = await rateLimit(req, "connect", caller.userId, { max: rpm, windowSeconds: 60 });
  if (r.limited) throw new ConnectError(`Rate limit reached (${rpm} requests per minute on your plan). Retry in ${r.retryAfterSeconds} s.`, 429, "resource_exhausted");
  return String(r.remaining);
}
