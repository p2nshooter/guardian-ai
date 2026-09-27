/* AXTO — /api/admin/support (admin only)
 *   GET ?status=open|answered|closed|all&topic=&q= → inbox (newest activity first) + counters + presence
 *   PUT {online}                                   → admin presence (the chat widget shows "online";
 *                                                     the AI answers only while nobody is online) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson } from "@/lib/http";
import { getPresence, setPresence } from "@/lib/support/store";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const status = u.searchParams.get("status") || "open";
  const topic = u.searchParams.get("topic") || "";
  const q = (u.searchParams.get("q") || "").trim().slice(0, 100);
  const where: string[] = [];
  const args: unknown[] = [];
  if (status !== "all") { where.push("status = ?"); args.push(status); }
  if (topic) { where.push("topic = ?"); args.push(topic); }
  if (q) { where.push("(name LIKE ? OR email LIKE ? OR subject LIKE ? OR last_preview LIKE ?)"); args.push(...Array(4).fill(`%${q}%`)); }
  const db = getDB(req);
  const [threads, counts, presence] = await Promise.all([
    dbQuery<any>(db, `SELECT id, user_id, name, email, topic, source, status, needs_admin, ai_enabled, subject, last_from, last_preview,
                             unread_admin, message_count, last_message_at, created_at
                        FROM support_threads ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
                       ORDER BY needs_admin DESC, last_message_at DESC LIMIT 200`, args),
    dbFirst<any>(db, `SELECT SUM(status = 'open') AS open, SUM(status = 'answered') AS answered, SUM(status = 'closed') AS closed,
                             SUM(unread_admin > 0) AS unread, SUM(needs_admin = 1 AND status != 'closed') AS handoff FROM support_threads`),
    getPresence(),
  ]);
  return respond({ threads, counts: counts || {}, presence }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const presence = await setPresence(!!b?.online, (ctx.session.name || "").split(" ")[0] || "AXTO team");
  return respond({ ok: true, presence }, ctx);
}
