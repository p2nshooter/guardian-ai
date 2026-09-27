/* AXTO — GET /api/admin/audit?q=&page= · audit log (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const args: unknown[] = [];
  let where = "1 = 1";
  if (q) { where = "(actor_email LIKE ? OR action LIKE ? OR entity_id LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = await dbQuery(getDB(req),
    `SELECT id, actor_email, action, entity_type, entity_id, metadata, ip_address, created_at FROM audit_log WHERE ${where} ORDER BY created_at DESC LIMIT 100 OFFSET ${(page - 1) * 100}`, args);
  return respond({ entries: rows, page }, ctx);
}
