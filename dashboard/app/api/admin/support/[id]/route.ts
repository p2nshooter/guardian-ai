/* AXTO — /api/admin/support/:id (admin only)
 *   GET  → the conversation (all messages, incl. AI answers and system notes); marks it read
 *   POST {action: "reply", text, email?} | {action: "close" | "reopen" | "ai_on" | "ai_off" | "resolve_handoff"}
 *        A reply is shown in the visitor's chat and e-mailed to them (email=false to skip). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { addMessage, cleanText, getThreadRow, readThread } from "@/lib/support/store";
import { emailVisitorReply } from "@/lib/support/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getDB(req);
  const row = await getThreadRow(db, id);
  if (!row) return fail("Conversation not found.", 404);
  const t = await readThread(id);
  if (row.unread_admin) await dbRun(db, `UPDATE support_threads SET unread_admin = 0 WHERE id = ?`, [id]);
  const { token_hash: _omit, ...thread } = row;
  return respond({ thread: { ...thread, unread_admin: 0 }, messages: t?.doc.messages || [] }, ctx);
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getDB(req);
  const row = await getThreadRow(db, id);
  if (!row) return fail("Conversation not found.", 404);
  const b = await readJson(req);
  const set = (sql: string, args: unknown[] = []) => dbRun(db, `UPDATE support_threads SET ${sql} WHERE id = ?`, [...args, id]);

  switch (b?.action) {
    case "reply": {
      const text = cleanText(b?.text);
      if (!text) return fail("Write a reply first.");
      const name = (ctx.session.name || "").split(" ")[0] || "AXTO team";
      await addMessage(db, row, "admin", name, text);
      await set("needs_admin = 0");
      if (b?.email !== false) await emailVisitorReply(row, text).catch(() => {});
      await audit(db, ctx.session, "support.reply", "support_thread", id, {}, req);
      break;
    }
    case "close": await set("status = 'closed', needs_admin = 0, unread_admin = 0"); break;
    case "reopen": await set("status = 'open'"); break;
    case "ai_on": await set("ai_enabled = 1"); break;
    case "ai_off": await set("ai_enabled = 0"); break;
    case "resolve_handoff": await set("needs_admin = 0"); break;
    default: return fail("Unknown action.");
  }
  const [fresh, t] = await Promise.all([getThreadRow(db, id), readThread(id)]);
  const { token_hash: _omit, ...thread } = fresh!;
  return respond({ ok: true, thread, messages: t?.doc.messages || [] }, ctx);
}
