/* AXTO — /api/support (public)
 *   GET  → topics for the dropdown, whether an admin is online, whether the AI can answer
 *   POST {topic, name, email, message, website?} → starts a conversation.
 *        Returns {id, token, messages}. The token is the visitor's key to the
 *        conversation (store it client-side); only its hash is kept.
 * Rate-limited per IP; `website` is a honeypot field bots fill in. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { loadSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, fail, ipOf } from "@/lib/http";
import { TOPICS, getTopic } from "@/lib/support/topics";
import { createThread, getPresence, getThreadRow, publicMessages, readThread, cleanText } from "@/lib/support/store";
import { aiConfigured, supportAiSettings } from "@/lib/support/ai";
import { autoReply, notifyAdmin } from "@/lib/support/service";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function GET() {
  const [presence, ai] = await Promise.all([getPresence(), supportAiSettings()]);
  return NextResponse.json({
    topics: TOPICS.map((t) => ({ id: t.id, label: t.label, hint: t.hint, handoff: t.handoff })),
    adminOnline: presence.online,
    aiAvailable: aiConfigured(ai),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  if (b?.website) return NextResponse.json({ ok: true });               // honeypot
  const rl = await rateLimit(req, "support-new", ipOf(req) || "anon", { max: 6, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many new conversations. Please try again later or e-mail us.", 429);

  const ctx = await loadSession(req).catch(() => null);
  const topic = getTopic(b?.topic);
  const message = cleanText(b?.message);
  const name = cleanText(b?.name || ctx?.session.name, 80);
  const email = cleanText(b?.email || ctx?.session.email, 254).toLowerCase();
  if (message.length < 2) return fail("Write a message first.");
  if (email && !EMAIL_RE.test(email)) return fail("That e-mail address doesn't look right.");
  if (topic.handoff && !email) return fail("Add your e-mail so our team can send you the proposal.");

  const db = getDB(req);
  const { id, token } = await createThread(db, {
    name, email, topic: topic.id, source: "chat", userId: ctx?.session.sub || null,
    needsAdmin: topic.handoff, first: { name: name || "Visitor", text: message },
  });
  const row = (await getThreadRow(db, id))!;
  await notifyAdmin(row, message, topic.handoff ? "New request" : "New chat").catch(() => {});
  await autoReply(db, row).catch(() => null);
  const t = await readThread(id);
  return NextResponse.json({ ok: true, id, token, messages: t ? publicMessages(t.doc) : [] }, { headers: { "Cache-Control": "no-store" } });
}
