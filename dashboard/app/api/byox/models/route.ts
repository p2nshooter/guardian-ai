/* AXTO — POST /api/byox/models {provider} · models available on the member's own
 * account for that provider (BYOM picker). Uses the saved key; never returns it. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { hasKey, resolveChatAll } from "@/lib/ai/byox";
import { listModels, providerInfo } from "@/lib/ai/providers";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const provider = String(b?.provider || "");
  const info = providerInfo(provider);
  if (!info?.chat) return fail("Choose a chat provider.");
  const rl = await rateLimit(req, "byox-models", ctx.session.sub, { max: 30, windowSeconds: 600 });
  if (rl.limited) return fail("Too many requests. Please wait a few minutes.", 429);
  const db = getData(req);
  if (!(await hasKey(db, ctx.session.sub, provider))) return fail("Add a key for that provider first.");
  try {
    const conn = (await resolveChatAll(db, ctx.session.sub, { provider })).find((c) => c.provider === provider)!;
    const models = await listModels(conn);
    return respond({ ok: true, provider, current: conn.model, models: models.slice(0, 500) }, ctx);
  } catch (e: any) {
    return respond({ ok: false, message: String(e?.message || e).slice(0, 300), models: info.models }, ctx);
  }
}
