/* AXTO — POST /api/byox/run {app, task?, messages, provider?, model?, options?, documents?}
 * Streams text generated with the MEMBER'S OWN AI keys (BYOX). No AXTO-provided
 * AI is ever used here — see /api/managed/run for the separate, locked path.
 *
 * Failover: if the chosen provider fails before producing any text (bad key,
 * quota, outage), the next saved key of the SAME member is tried; a status
 * line tells the member which provider answered. Live research (options.research
 * = "1") is used when the answering provider supports it. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { loadSessionFor, unauthorized, effectiveTier, setSessionCookie } from "@/lib/auth";
import { toTextStream } from "@/lib/ai/providers";
import { prepareRun, runAllowed } from "@/lib/ai/run-core";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const app = String(b?.app || "");
  // Plan gate: the app itself, and for Legal AI the Pro-only workspaces.
  const ctx = await loadSessionFor(req, (tier) => runAllowed(tier, app, String(b?.task || "")));
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const rl = await rateLimit(req, "byox-run", s.sub, { max: 60, windowSeconds: 60 });
  if (rl.limited) return fail("You're sending requests very quickly. Please wait a moment.", 429);

  const run = await prepareRun(getDB(req), s.sub, effectiveTier(s), b || {});
  if (!run.ok) return fail(run.error, run.status, run.extra || {});

  const res = new NextResponse(toTextStream(run.stream), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no",
      "X-AI-Mode": "byox", "X-AI-Provider": run.meta.provider, "X-AI-Model": encodeURIComponent(run.meta.model),
      "X-AI-Research": run.meta.research ? "1" : "0",
      "X-Task-Title": encodeURIComponent(run.meta.title),
    },
  });
  if (ctx.refreshed) setSessionCookie(res, ctx.refreshed);   // plan was re-read: keep the browser in sync
  return res;
}
