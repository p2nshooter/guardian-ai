/* AXTO — GET /api/admin/audit?q=&page= · audit log (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";

const PAGE = 100;
/** Search reads at most this many log entries back (summaries only — one list call per 1,000). */
const SCAN = 20_000;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const db = getData(req);
  const skip = (page - 1) * PAGE;
  const hit = (m: Record<string, unknown>) => !q || [m.actor_email, m.action, m.entity_id].some((v) => String(v || "").toLowerCase().includes(q));
  const entries: Record<string, unknown>[] = [];
  let seen = 0, matched = 0;
  let cursor: string | undefined;
  do {
    const res = await db.audit.list("all", "all", { cursor, limit: 1000 });
    for (const e of res.entries) {
      if (!hit(e.meta)) continue;
      matched += 1;
      if (matched > skip) entries.push({ id: e.id, ...e.meta });
      if (entries.length >= PAGE) break;
    }
    seen += res.entries.length;
    cursor = res.cursor;
  } while (cursor && entries.length < PAGE && seen < SCAN);
  return respond({ entries, page }, ctx);
}
