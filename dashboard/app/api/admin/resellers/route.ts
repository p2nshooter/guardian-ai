/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MAX_COMMISSION_PCT } from "@/lib/reseller";
import { sendResellerStatusEmail } from "@/lib/email";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ── GET /api/admin/resellers ──────────────────────────────────────────────────
// Returns resellers (with tier + recent sales summary) and the commission tier ladder.
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    const resellers = await dbQuery<any>(db, `SELECT * FROM resellers ORDER BY total_sales_usd DESC`);
    const tiers = await dbQuery<any>(db, `SELECT * FROM reseller_commission_tiers ORDER BY min_volume_usd ASC`);
    const sales = await dbQuery<any>(db, `SELECT * FROM reseller_sales ORDER BY created_at DESC LIMIT 100`);
    return NextResponse.json({ resellers, tiers, sales });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load resellers" }, { status: 500 });
  }
}

// ── POST /api/admin/resellers ─────────────────────────────────────────────────
// Body: { action: "create_reseller" | "update_reseller" | "update_tier" | "mark_paid", ... }
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

  if (action === "create_reseller") {
    const { email, name, company, notes } = body;
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    const existing = await dbFirst(db, `SELECT id FROM resellers WHERE email = ?`, [email.toLowerCase()]);
    if (existing) return NextResponse.json({ error: "A reseller with this email already exists" }, { status: 400 });

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const dup = await dbFirst(db, `SELECT id FROM resellers WHERE referral_code = ?`, [code]);
      if (!dup) break;
      code = randomCode();
    }

    const id = uid("rsl");
    await dbRun(
      db,
      `INSERT INTO resellers (id, email, name, company, referral_code, status, total_sales_usd, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', 0, ?, datetime('now'), datetime('now'))`,
      [id, email.toLowerCase(), name || "", company || "", code, notes || ""]
    );
    return NextResponse.json({ success: true, id, referralCode: code });
  }

  if (action === "update_reseller") {
    const { id, status, name, company, notes } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Registration promises "you'll hear from us once it's approved" — fetch
    // the prior state so we only email on an actual pending -> active/rejected
    // transition, not on every unrelated edit (e.g. fixing a typo'd company name).
    const before = (status === "active" || status === "rejected")
      ? await dbFirst<any>(db, `SELECT email, name, status, referral_code FROM resellers WHERE id = ?`, [id])
      : null;

    const fields: string[] = [];
    const values: any[] = [];
    if (typeof status === "string")  { fields.push("status = ?");  values.push(status); }
    if (typeof name === "string")    { fields.push("name = ?");    values.push(name); }
    if (typeof company === "string") { fields.push("company = ?"); values.push(company); }
    if (typeof notes === "string")   { fields.push("notes = ?");   values.push(notes); }
    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await dbRun(db, `UPDATE resellers SET ${fields.join(", ")} WHERE id = ?`, values);

    if (before && before.status !== status && before.email) {
      try {
        await sendResellerStatusEmail({
          to: before.email, name: before.name || "there",
          status: status as "active" | "rejected", referralCode: before.referral_code,
        });
      } catch (e: any) {
        console.error("[resellers] status-change email failed:", e.message);
      }
    }

    return NextResponse.json({ success: true });
  }

  if (action === "update_tier") {
    const { id, tierName, minVolumeUsd, commissionPct } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (typeof commissionPct === "number" && (commissionPct < 0 || commissionPct > MAX_COMMISSION_PCT)) {
      return NextResponse.json({ error: `commissionPct must be between 0 and ${MAX_COMMISSION_PCT}` }, { status: 400 });
    }
    const fields: string[] = [];
    const values: any[] = [];
    if (typeof tierName === "string")      { fields.push("tier_name = ?");      values.push(tierName); }
    if (typeof minVolumeUsd === "number")  { fields.push("min_volume_usd = ?"); values.push(minVolumeUsd); }
    if (typeof commissionPct === "number") { fields.push("commission_pct = ?"); values.push(commissionPct); }
    if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    values.push(id);
    await dbRun(db, `UPDATE reseller_commission_tiers SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  }

  if (action === "mark_paid") {
    const { saleId } = body;
    if (!saleId) return NextResponse.json({ error: "saleId is required" }, { status: 400 });
    await dbRun(db, `UPDATE reseller_sales SET status = 'paid', paid_at = datetime('now') WHERE id = ?`, [saleId]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
