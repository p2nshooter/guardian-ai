/* ==============================================================================
 * GET  /api/admin/reviews?status=pending|approved|rejected|all|flagged
 * POST /api/admin/reviews   — { id, action }
 *   action = approve | reject | feature | unfeature | show_company | hide_company
 *   Admin has the final say on what appears on the public index.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const status = new URL(req.url).searchParams.get("status") || "pending";
  let rows;
  if (status === "all") rows = await db.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 300").all();
  else if (status === "flagged") rows = await db.prepare("SELECT * FROM reviews WHERE flagged = 1 ORDER BY created_at DESC LIMIT 300").all();
  else rows = await db.prepare("SELECT * FROM reviews WHERE status = ? ORDER BY created_at DESC LIMIT 300").bind(status).all();
  return NextResponse.json({ reviews: rows?.results || [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });
  const rev: any = await db.prepare("SELECT * FROM reviews WHERE id = ?").bind(id).first();
  if (!rev) return NextResponse.json({ error: "review not found" }, { status: 404 });

  const now = new Date().toISOString();
  const actor = (admin as any)?.email || "admin";
  const sets: Record<string, () => Promise<any>> = {
    approve: () => db.prepare("UPDATE reviews SET status='approved', decided_at=?, decided_by=? WHERE id=?").bind(now, actor, id).run(),
    reject: () => db.prepare("UPDATE reviews SET status='rejected', featured=0, decided_at=?, decided_by=? WHERE id=?").bind(now, actor, id).run(),
    // Featuring auto-approves so an admin can publish in one click.
    feature: () => db.prepare("UPDATE reviews SET featured=1, status='approved', decided_at=?, decided_by=? WHERE id=?").bind(now, actor, id).run(),
    unfeature: () => db.prepare("UPDATE reviews SET featured=0 WHERE id=?").bind(id).run(),
    show_company: () => db.prepare("UPDATE reviews SET admin_show_company=1 WHERE id=?").bind(id).run(),
    hide_company: () => db.prepare("UPDATE reviews SET admin_show_company=0 WHERE id=?").bind(id).run(),
  };
  if (!sets[action]) return NextResponse.json({ error: "invalid action" }, { status: 400 });
  await sets[action]();
  return NextResponse.json({ ok: true, id, action });
}
