/* AXTO — POST /api/byox/prepare {app, task?, messages, options?, documents?}
 * Local Mode helper for apps whose expert instructions stay on the server
 * (Legal AI). The browser sends the request with every piece of the member's
 * content replaced by placeholders (lib/ai/local-mask.ts); this route checks
 * the plan and the operator's switch, assembles the system prompt and message
 * layout around those placeholders and returns it. No AI is called, no key is
 * read, nothing is stored or logged; the browser puts the real text back and
 * talks to the model on the member's own device. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSessionFor, unauthorized, effectiveTier, respond } from "@/lib/auth";
import { runAllowed } from "@/lib/ai/run-core";
import { buildRun } from "@/lib/ai/run-build";
import { localModeFor } from "@/lib/ai/local-settings";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const app = String(b?.app || "");
  const ctx = await loadSessionFor(req, (tier) => runAllowed(tier, app, String(b?.task || "")));
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const rl = await rateLimit(req, "byox-prepare", s.sub, { max: 120, windowSeconds: 60 });
  if (rl.limited) return fail("You're sending requests very quickly. Please wait a moment.", 429);
  const tier = effectiveTier(s);
  if (!(await localModeFor(getData(req), tier))) return fail("Local Mode is not available on this account right now.", 403, { local: true });

  const r = buildRun(tier, { app, task: b?.task, messages: b?.messages, options: b?.options, documents: b?.documents });
  if (!r.ok) return fail(r.error, r.status, r.extra || {});
  const { system, messages, title, maxOutputTokens, temperature } = r.probe;
  return respond({ task: { system, messages, title, maxOutputTokens, temperature }, research: r.wantResearch }, ctx);
}
