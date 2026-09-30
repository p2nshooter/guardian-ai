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
import { resolveChatAll, ByoxMissingKey } from "@/lib/ai/byox";
import { chatStream, toTextStream, inputSize, MAX_INPUT_CHARS, providerInfo, supportsResearch, statusLine, type Connection } from "@/lib/ai/providers";
import { getTask, sanitizeMessages, type BuiltTask } from "@/lib/ai/tasks";
import "@/lib/ai/register";
import { limitsFor, planForApp, PLANS, isPlanId } from "@/lib/plans";
import { getCloudApp } from "@/lib/apps";
import { recordByoxRequest } from "@/lib/usage";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { CORE_WORKSPACES } from "@/lib/legal/workspaces";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const app = String(b?.app || "");
  // Plan gate: the app itself, and for Legal AI the Pro-only workspaces.
  const needsAllLegal = app === "legal" && !CORE_WORKSPACES.includes(String(b?.task || ""));
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes(app) && (!needsAllLegal || limitsFor(tier).legalWorkspaces === "all"));
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const handler = getTask(app);
  if (!handler) return fail("Unknown app.");
  if (!getCloudApp(app)?.live) return fail("This app is coming soon.", 503);

  const tier = effectiveTier(s);
  if (!limitsFor(tier).apps.includes(app)) {
    const need = planForApp(app);
    return fail(`This app needs the ${isPlanId(need) ? PLANS[need].name : "a paid"} plan or higher.`, 402, { upgrade: true });
  }
  const rl = await rateLimit(req, "byox-run", s.sub, { max: 60, windowSeconds: 60 });
  if (rl.limited) return fail("You're sending requests very quickly. Please wait a moment.", 429);

  const messages = sanitizeMessages(b?.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return fail("Write a request first.");
  const options = typeof b?.options === "object" && b.options ? Object.fromEntries(Object.entries(b.options).map(([k, v]) => [k, String(v).slice(0, 8000)])) : {};
  const wantResearch = options.research === "1";
  const input = { task: b?.task ? String(b.task) : undefined, messages, options, documents: b?.documents };

  // Validate once (plan, workspace, inputs) before touching any key.
  const probe = handler.build({ ...input, research: false }, tier);
  if ("error" in probe) return fail(probe.error, probe.status || 400, { upgrade: probe.status === 402 });
  if (inputSize(probe.system, probe.messages) > MAX_INPUT_CHARS) {
    return fail("This is too long for one request (about 150,000 tokens). Remove some documents or split them into separate runs.", 413);
  }

  const db = getDB(req);
  let conns: Connection[];
  try {
    conns = await resolveChatAll(db, s.sub, { provider: b?.provider, model: b?.model });
  } catch (e) {
    if (e instanceof ByoxMissingKey) return fail(e.message, 412, { needKey: true });
    throw e;
  }
  await recordByoxRequest(db, s.sub).catch(() => {});

  const plan = (c: Connection): BuiltTask => {
    const research = wantResearch && supportsResearch(c);
    const built = research ? handler.build({ ...input, research: true }, tier) : probe;
    return "error" in built ? probe as BuiltTask : built;
  };

  async function* failover(): AsyncGenerator<string> {
    for (let i = 0; i < conns.length; i++) {
      const c = conns[i];
      const built = plan(c);
      const gen = chatStream(c, built.system, built.messages, { research: built.research, maxOutputTokens: built.maxOutputTokens, temperature: built.temperature });
      let first: IteratorResult<string>;
      try {
        first = await gen.next();
      } catch (err: any) {
        const next = conns[i + 1];
        if (!next) throw err;
        yield statusLine("note", `${providerInfo(c.provider)!.name} failed (${String(err?.message || err).slice(0, 120)}) — continuing with ${providerInfo(next.provider)!.name}.`);
        continue;
      }
      if (i > 0 || (wantResearch && !built.research)) {
        yield statusLine("note", `Answer by ${providerInfo(c.provider)!.name} · ${c.model}${wantResearch && !built.research ? " · live research not supported by this provider" : ""}`);
      }
      if (!first.done) yield first.value;
      yield* gen;
      return;
    }
  }

  const head = conns[0];
  const res = new NextResponse(toTextStream(failover()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no",
      "X-AI-Mode": "byox", "X-AI-Provider": head.provider, "X-AI-Model": encodeURIComponent(head.model),
      "X-AI-Research": wantResearch && supportsResearch(head) ? "1" : "0",
      "X-Task-Title": encodeURIComponent(probe.title),
    },
  });
  if (ctx.refreshed) setSessionCookie(res, ctx.refreshed);   // plan was re-read: keep the browser in sync
  return res;
}
