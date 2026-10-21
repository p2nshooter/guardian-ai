/* AXTO — /api/admin/support (admin only)
 *   GET ?status=open|answered|closed|all&topic=&q= → inbox (newest activity first) + counters + presence
 *   PUT {online}                                   → admin presence (the chat widget shows "online";
 *                                                     the AI answers only while nobody is online) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
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
  const db = getData(req);
  // The "recent" index (newest activity first) carries every column the inbox shows: no document reads.
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await db.supportThreads.list("recent", "all", { cursor, limit: 1000 });
    for (const e of page.entries) all.push({ id: e.id, ...e.meta });
    cursor = page.cursor;
  } while (cursor && all.length < 20_000);
  const needle = q.toLowerCase();
  const hit = (t: any) => !needle || [t.name, t.email, t.subject, t.last_preview].some((v) => String(v || "").toLowerCase().includes(needle));
  const threads = all
    .filter((t) => (status === "all" || t.status === status) && (!topic || t.topic === topic) && hit(t))
    .sort((a, b) => (Number(b.needs_admin) - Number(a.needs_admin)) || String(b.last_message_at).localeCompare(String(a.last_message_at)))
    .slice(0, 200);
  const counts = {
    open: all.filter((t) => t.status === "open").length,
    answered: all.filter((t) => t.status === "answered").length,
    closed: all.filter((t) => t.status === "closed").length,
    unread: all.filter((t) => Number(t.unread_admin) > 0).length,
    handoff: all.filter((t) => Number(t.needs_admin) === 1 && t.status !== "closed").length,
  };
  return respond({ threads, counts, presence: await getPresence() }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const presence = await setPresence(!!b?.online, (ctx.session.name || "").split(" ")[0] || "AXTO team");
  return respond({ ok: true, presence }, ctx);
}
