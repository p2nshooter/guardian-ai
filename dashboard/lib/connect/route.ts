/* AXTO CONNECT — one wrapper for every /api/v1 handler: switched on by the
 * operator, caller authenticated, browser origin allowed, plan rate limit. */
import type { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getData } from "../db";
import type { Data } from "../data";
import { authenticate, ConnectError, type Caller } from "./auth";
import { apiError, limit, originProblem } from "./http";
import { getConnectSettings } from "./settings";

export async function withCaller(
  req: NextRequest,
  fn: (caller: Caller, db: Data, remaining: string) => Promise<Response | NextResponse>,
  opts: { allowSession?: boolean; cost?: number } = {},
): Promise<Response | NextResponse> {
  const db = getData(req);
  let caller: Caller | null = null;
  try {
    const settings = await getConnectSettings(db);
    if (!settings.enabled) throw new ConnectError("The developer API is switched off at the moment.", 503, "unavailable");
    caller = await authenticate(req, db, { allowSession: opts.allowSession });
    const bad = originProblem(req, caller);
    if (bad) throw bad;
    const remaining = await limit(req, caller, opts.cost ?? 1);
    return await fn(caller, db, remaining);
  } catch (e) {
    return apiError(req, e, caller);
  }
}

/** Resolve after `ms` unless the client went away. */
export const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((r) => {
  const t = setTimeout(r, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true });
});

/** Run background work after the response (webhook fan-out) when the platform allows it. */
export function background(p: Promise<unknown>) {
  try {
    getRequestContext().ctx.waitUntil(p.catch(() => {}));
    return;
  } catch {}
  p.catch(() => {});
}
