/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const clients = await dbQuery<any>(db, `
    SELECT c.*,
      (SELECT COUNT(*) FROM licenses l WHERE l.client_id = c.id) as license_count,
      (SELECT COUNT(*) FROM licenses l WHERE l.client_id = c.id AND l.status = 'active') as active_count
    FROM clients c
    ORDER BY c.created_at DESC
    LIMIT 500
  `);

  return NextResponse.json({ clients });
}

// Best-effort: ensure the clients.status column exists (idempotent).
async function ensureStatusColumn(db: any) {
  try {
    await dbRun(db, `ALTER TABLE clients ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`, []);
  } catch { /* already exists — fine */ }
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, action, name, organization, country, phone } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }

  // ── Ban / Unban ───────────────────────────────────────────────────────────
  // Banning suspends every active license the client holds so the portal blocks
  // downloads & activation; unbanning restores those suspended-by-ban licenses.
  if (action === "ban" || action === "unban") {
    await ensureStatusColumn(db);
    const banned = action === "ban";
    await dbRun(db, `UPDATE clients SET status=?, updated_at=? WHERE id=?`,
      [banned ? "banned" : "active", now(), id]);
    if (banned) {
      await dbRun(db,
        `UPDATE licenses SET status='suspended', updated_at=? WHERE client_id=? AND status='active'`,
        [now(), id]);
    } else {
      await dbRun(db,
        `UPDATE licenses SET status='active', updated_at=? WHERE client_id=? AND status='suspended'`,
        [now(), id]);
    }
    return NextResponse.json({ success: true, status: banned ? "banned" : "active" });
  }

  // ── Profile update (default) ──────────────────────────────────────────────
  await dbRun(
    db,
    `UPDATE clients SET name=?, organization=?, country=?, phone=?, updated_at=? WHERE id=?`,
    [name || "", organization || "", country || "", phone || "", now(), id]
  );

  return NextResponse.json({ success: true });
}

// ── Delete a client entirely (cascade licenses + invoices) ───────────────────
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Cascade: remove dependent rows first, then the client. Each is best-effort
  // so a missing table on an older schema never blocks the deletion.
  try { await dbRun(db, `DELETE FROM invoices WHERE license_id IN (SELECT id FROM licenses WHERE client_id=?)`, [id]); } catch {}
  try { await dbRun(db, `DELETE FROM licenses WHERE client_id=?`, [id]); } catch {}
  await dbRun(db, `DELETE FROM clients WHERE id=?`, [id]);

  return NextResponse.json({ success: true, deleted: id });
}
