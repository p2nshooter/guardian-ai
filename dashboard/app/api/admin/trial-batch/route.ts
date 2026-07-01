/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Trial batch codes — admin generates 100 trial claim-codes per product+tier
 * (up to Enterprise + Lifetime) for each of the 10 products, to hand out on
 * behalf of axto.io. Each activated code becomes a 7-day trial license. Admin
 * can enable/disable/delete/regenerate; disabled or expired codes stop working.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PACKAGE_INFO } from "@/lib/stripe";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Human-friendly, unambiguous claim code: TRIAL-XXXX-XXXX-XXXX
function trialCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TRIAL-${seg()}-${seg()}-${seg()}`;
}

// ── GET /api/admin/trial-batch ────────────────────────────────────────────────
// Returns a per-(product, package_code) summary of available/claimed/disabled
// counts plus the recent batches so the admin can manage them.
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    const rows = await dbQuery<any>(
      db,
      `SELECT product, package_code,
              SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available,
              SUM(CASE WHEN status='claimed'   THEN 1 ELSE 0 END) AS claimed,
              SUM(CASE WHEN status='disabled'  THEN 1 ELSE 0 END) AS disabled,
              COUNT(*) AS total
       FROM trial_batch_codes
       GROUP BY product, package_code`
    );
    const batches = await dbQuery<any>(
      db,
      `SELECT batch_id, product, package_code, COUNT(*) AS count, MIN(created_at) AS created_at,
              SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available
       FROM trial_batch_codes GROUP BY batch_id ORDER BY created_at DESC LIMIT 60`
    );
    return NextResponse.json({ summary: rows, batches });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load" }, { status: 500 });
  }
}

// ── POST /api/admin/trial-batch ───────────────────────────────────────────────
// Actions: generate | set_batch_status | delete_batch | list_codes | set_code_status
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const { action } = body;

  if (action === "generate") {
    const { packageCode, count } = body;
    const pkg = (PACKAGE_INFO as any)[packageCode];
    if (!packageCode || !pkg) return NextResponse.json({ error: `Unknown package: ${packageCode}` }, { status: 400 });
    const n = Math.min(Math.max(Number(count) || 100, 1), 500);
    const batchId = uid("batch");
    // Build a single multi-row insert; D1 handles ~100 rows fine in one statement.
    const values: string[] = [];
    const binds: any[] = [];
    for (let i = 0; i < n; i++) {
      values.push("(?, ?, ?, ?, ?, 'available', ?, datetime('now'))");
      binds.push(uid("tc"), trialCode(), pkg.product, packageCode, batchId, user.email ?? "admin");
    }
    await dbRun(
      db,
      `INSERT INTO trial_batch_codes (id, code, product, package_code, batch_id, status, created_by, created_at) VALUES ${values.join(",")}`,
      binds
    );
    return NextResponse.json({ success: true, batchId, generated: n });
  }

  if (action === "list_codes") {
    const { batchId } = body;
    if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
    const codes = await dbQuery<any>(db, `SELECT id, code, status, claimed_email, claimed_at FROM trial_batch_codes WHERE batch_id = ? ORDER BY created_at ASC`, [batchId]);
    return NextResponse.json({ codes });
  }

  if (action === "set_batch_status") {
    const { batchId, status } = body; // status: available | disabled
    if (!batchId || !["available", "disabled"].includes(status)) {
      return NextResponse.json({ error: "batchId and valid status required" }, { status: 400 });
    }
    // Only flip codes that aren't already claimed — claimed codes keep their link.
    await dbRun(
      db,
      `UPDATE trial_batch_codes SET status = ?, disabled_at = CASE WHEN ?='disabled' THEN datetime('now') ELSE '' END
       WHERE batch_id = ? AND status != 'claimed'`,
      [status, status, batchId]
    );
    return NextResponse.json({ success: true });
  }

  if (action === "delete_batch") {
    const { batchId } = body;
    if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
    // Never delete codes that were already claimed (they back a live license).
    await dbRun(db, `DELETE FROM trial_batch_codes WHERE batch_id = ? AND status != 'claimed'`, [batchId]);
    return NextResponse.json({ success: true });
  }

  if (action === "set_code_status") {
    const { codeId, status } = body;
    if (!codeId || !["available", "disabled"].includes(status)) {
      return NextResponse.json({ error: "codeId and valid status required" }, { status: 400 });
    }
    await dbRun(db, `UPDATE trial_batch_codes SET status = ? WHERE id = ? AND status != 'claimed'`, [status, codeId]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
