/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Admin control for installs — /api/admin/installs
 * Everything about an install ID is controlled here: list them (with the app
 * they run + effective countdown), extend time per ID, revoke, ban, or
 * reactivate. Revoked/banned IDs are locked server-side by /api/license-validate.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getFreeAccessStatus, normalizeDate } from "@/lib/free-access";

async function ensureTable(db: any) {
  try {
    await dbRun(db, `CREATE TABLE IF NOT EXISTS installs (
      install_id TEXT NOT NULL, product TEXT NOT NULL,
      first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
      hostname TEXT NOT NULL DEFAULT '', version TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
      expires_override TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (install_id, product))`, []);
  } catch { /* exists */ }
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 }); }
  await ensureTable(db);

  const url = new URL(req.url);
  const product = url.searchParams.get("product") || "";
  const status = url.searchParams.get("status") || "";
  const q = url.searchParams.get("q") || "";

  const where: string[] = [];
  const params: any[] = [];
  if (product) { where.push("product = ?"); params.push(product); }
  if (status) { where.push("status = ?"); params.push(status); }
  if (q) { where.push("(install_id LIKE ? OR hostname LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await dbQuery<any>(db,
    `SELECT install_id, product, first_seen, last_seen, hostname, version, ip, status, expires_override, notes
     FROM installs ${whereSql} ORDER BY last_seen DESC LIMIT 1000`, params);

  const byProduct = await dbQuery<{ product: string; c: number; active: number }>(db,
    `SELECT product, COUNT(*) AS c, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
     FROM installs GROUP BY product ORDER BY c DESC`);

  const totals = await dbFirst<{ total: number; active: number; revoked: number; banned: number }>(db,
    `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) AS revoked,
      SUM(CASE WHEN status='banned' THEN 1 ELSE 0 END) AS banned
     FROM installs`);

  const program = await getFreeAccessStatus(req);
  return NextResponse.json({ installs: rows, byProduct, totals, program });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { install_id, product, action } = body;
  if (!install_id || !product || !action) {
    return NextResponse.json({ error: "install_id, product and action are required" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 }); }
  await ensureTable(db);

  const row = await dbFirst<any>(db,
    `SELECT * FROM installs WHERE install_id = ? AND product = ?`, [install_id, product]);
  if (!row) return NextResponse.json({ error: "Install not found" }, { status: 404 });

  if (action === "revoke") {
    await dbRun(db, `UPDATE installs SET status='revoked' WHERE install_id=? AND product=?`, [install_id, product]);
  } else if (action === "ban") {
    await dbRun(db, `UPDATE installs SET status='banned' WHERE install_id=? AND product=?`, [install_id, product]);
  } else if (action === "activate") {
    await dbRun(db, `UPDATE installs SET status='active' WHERE install_id=? AND product=?`, [install_id, product]);
  } else if (action === "note") {
    await dbRun(db, `UPDATE installs SET notes=? WHERE install_id=? AND product=?`, [String(body.notes ?? "").slice(0, 500), install_id, product]);
  } else if (action === "clear_override") {
    await dbRun(db, `UPDATE installs SET expires_override='' WHERE install_id=? AND product=?`, [install_id, product]);
  } else if (action === "extend") {
    // Extend by N days from the CURRENT effective end (max of override / global
    // program end / now), or set an explicit `until` date.
    let target: string | null = null;
    if (body.until) {
      target = normalizeDate(body.until);
      if (!target) return NextResponse.json({ error: "Invalid 'until' date" }, { status: 400 });
    } else {
      const days = Number(body.days);
      if (!days || days <= 0) return NextResponse.json({ error: "Provide positive 'days' or an 'until' date" }, { status: 400 });
      const program = await getFreeAccessStatus(req);
      const base = Math.max(
        row.expires_override ? new Date(row.expires_override).getTime() : 0,
        new Date(program.endISO).getTime(),
        Date.now()
      );
      target = new Date(base + days * 86_400_000).toISOString();
    }
    await dbRun(db, `UPDATE installs SET expires_override=? WHERE install_id=? AND product=?`, [target, install_id, product]);
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const updated = await dbFirst<any>(db,
    `SELECT install_id, product, first_seen, last_seen, hostname, version, ip, status, expires_override, notes
     FROM installs WHERE install_id = ? AND product = ?`, [install_id, product]);
  return NextResponse.json({ ok: true, install: updated, at: now() });
}
