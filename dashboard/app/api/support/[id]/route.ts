/* AXTO — /api/support/:id (the visitor's own conversation)
 *   GET  (header x-support-token, or the signed-in owner) → messages + status.
 *        Send `if-none-match` with the last etag to get 304 while nothing changed.
 *   POST {text} | {action: "human"} → adds a message; the AI answers when no
 *        admin is online; "human" flags the conversation for the team. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun } from "@/lib/db";
import { loadSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, fail } from "@/lib/http";
import { addMessage, canAccess, cleanText, getPresence, getThreadRow, publicMessages, readThread } from "@/lib/support/store";
import { autoReply, notifyAdmin } from "@/lib/support/service";

type Params = { params: Promise<{ id: string }> };

async function authorize(req: NextRequest, id: string) {
  const db = getDB(req);
  const row = await getThreadRow(db, id);
  const ctx = await loadSession(req).catch(() => null);
  const ok = await canAccess(row, req.headers.get("x-support-token") || "", ctx?.session.sub);
  return ok ? { db, row: row! } : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const a = await authorize(req, id);
  if (!a) return fail("Conversation not found.", 404);
  const [t, presence] = await Promise.all([readThread(id), getPresence()]);
  if (!t) return fail("Conversation not found.", 404);
  const etag = `"${t.etag}${presence.online ? "1" : "0"}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  return NextResponse.json(
    { id, status: a.row.status, topic: a.row.topic, adminOnline: presence.online, messages: publicMessages(t.doc) },
    { headers: { ETag: etag, "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const a = await authorize(req, id);
  if (!a) return fail("Conversation not found.", 404);
  const rl = await rateLimit(req, "support-msg", id, { max: 20, windowSeconds: 600 });
  if (rl.limited) return fail("You're sending messages very quickly — please wait a moment.", 429);
  const b = await readJson(req);
  const { db, row } = a;

  if (b?.action === "human") {
    await dbRun(db, `UPDATE support_threads SET needs_admin = 1 WHERE id = ?`, [id]);
    await addMessage(db, row, "system", "", row.email
      ? "We've asked a team member to take over — you'll get a reply by e-mail if we're not online."
      : "We've asked a team member to take over. Add your e-mail in your next message so we can reply.");
    await notifyAdmin(row, "The visitor asked to talk to a person.", "Handoff requested").catch(() => {});
  } else {
    const text = cleanText(b?.text);
    if (!text) return fail("Write a message first.");
    const wasUnread = row.unread_admin > 0;
    await addMessage(db, row, "visitor", row.name || "Visitor", text);
    const fresh = (await getThreadRow(db, id))!;
    if (!wasUnread && (fresh.needs_admin || !(await getPresence()).online)) await notifyAdmin(fresh, text, "New message").catch(() => {});
    await autoReply(db, fresh).catch(() => null);
  }
  const t = await readThread(id);
  return NextResponse.json({ ok: true, messages: t ? publicMessages(t.doc) : [] }, { headers: { "Cache-Control": "no-store" } });
}
