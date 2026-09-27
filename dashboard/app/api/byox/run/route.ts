/* AXTO — POST /api/byox/run {app, task?, messages, provider?, model?, options?}
 * Streams text generated with the MEMBER'S OWN AI key (BYOX). No AXTO-provided
 * AI is ever used here — see /api/managed/run for the separate, locked path. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { loadSession, unauthorized, effectiveTier } from "@/lib/auth";
import { resolveChat, ByoxMissingKey } from "@/lib/ai/byox";
import { chatStream, toTextStream, inputSize, MAX_INPUT_CHARS } from "@/lib/ai/providers";
import { getTask, sanitizeMessages } from "@/lib/ai/tasks";
import "@/lib/ai/register";
import { limitsFor, planForApp, PLANS, isPlanId } from "@/lib/plans";
import { getCloudApp } from "@/lib/apps";
import { recordByoxRequest } from "@/lib/usage";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const b = await readJson(req);
  const app = String(b?.app || "");
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
  const built = handler.build({ task: b?.task ? String(b.task) : undefined, messages, options }, tier);
  if ("error" in built) return fail(built.error, built.status || 400, { upgrade: built.status === 402 });
  if (inputSize(built.system, built.messages) > MAX_INPUT_CHARS) {
    return fail("This is too long for one request (about 150,000 tokens max). Split the document or shorten it.", 413);
  }

  const db = getDB(req);
  let conn;
  try {
    conn = await resolveChat(db, s.sub, { provider: b?.provider, model: b?.model });
  } catch (e) {
    if (e instanceof ByoxMissingKey) return fail(e.message, 412, { needKey: true });
    throw e;
  }
  await recordByoxRequest(db, s.sub).catch(() => {});
  const stream = toTextStream(chatStream(conn, built.system, built.messages));
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no",
      "X-AI-Mode": "byox", "X-AI-Provider": conn.provider, "X-AI-Model": encodeURIComponent(conn.model),
      "X-Task-Title": encodeURIComponent(built.title),
    },
  });
}
