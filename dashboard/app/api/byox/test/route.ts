/* AXTO — POST /api/byox/test {provider} · verify a saved BYOX key with a tiny request. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { resolveChat, resolveStt } from "@/lib/ai/byox";
import { providerInfo, chatStream, collect } from "@/lib/ai/providers";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const provider = String(b?.provider || "");
  const info = providerInfo(provider);
  if (!info) return fail("Unknown provider.");
  const rl = await rateLimit(req, "byox-test", ctx.session.sub, { max: 20, windowSeconds: 600 });
  if (rl.limited) return fail("Too many tests. Please wait a few minutes.", 429);
  const db = getData(req);
  const started = Date.now();
  try {
    if (!info.chat) {
      const c = await resolveStt(db, ctx.session.sub, provider);
      const r = await fetch("https://api.deepgram.com/v1/projects", { headers: { Authorization: `Token ${c.apiKey}` } });
      if (!r.ok) throw new Error(`Deepgram rejected the key (${r.status}).`);
      return respond({ ok: true, message: "Key works.", ms: Date.now() - started }, ctx);
    }
    const c = await resolveChat(db, ctx.session.sub, { provider });
    if (c.provider !== provider) throw new Error("No key saved for this provider.");
    const text = await Promise.race([
      collect(chatStream(c, "You are a connectivity check. Reply with exactly: OK", [{ role: "user", content: "Reply with OK." }], { maxOutputTokens: 1024 })),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error("The provider did not answer within 45 seconds.")), 45000)),
    ]);
    return respond({ ok: true, message: `Connected to ${info.name} · model ${c.model}`, reply: text.slice(0, 80), ms: Date.now() - started }, ctx);
  } catch (e: any) {
    return respond({ ok: false, message: String(e?.message || e).slice(0, 300) }, ctx, { status: 200 });
  }
}
