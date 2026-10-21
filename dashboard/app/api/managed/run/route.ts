/* AXTO — POST /api/managed/run · Managed AI generation. Returns 423 while locked.
 * Completely separate from /api/byox/run: different credentials, usage table and plans. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getAI } from "@/lib/db";
import { loadSession, unauthorized } from "@/lib/auth";
import { managedEnabled, managedStream } from "@/lib/ai/managed";
import { toTextStream, inputSize, MAX_INPUT_CHARS, type ChatMessage } from "@/lib/ai/providers";
import { readJson, fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const db = getData(req);
  if (!(await managedEnabled(db))) {
    return NextResponse.json({ error: "Managed AI is coming soon. Your apps already work with your own AI keys (BYOX)." }, { status: 423 });
  }
  const b = await readJson(req);
  const messages: ChatMessage[] = Array.isArray(b?.messages) ? b.messages.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string") : [];
  if (!messages.length) return fail("Nothing to send.");
  const system = "You are AXTO, a precise and helpful professional assistant.";
  if (inputSize(system, messages) > MAX_INPUT_CHARS) return fail("This request is too long. Shorten the text and try again.", 413);
  try {
    const { gen, provider, model } = await managedStream(db, getAI(req), ctx.session.sub, system, messages);
    return new NextResponse(toTextStream(gen), { headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Mode": "managed", "X-AI-Provider": provider, "X-AI-Model": model, "Cache-Control": "no-store" } });
  } catch (e: any) {
    return fail(String(e?.message || e), 402);
  }
}
