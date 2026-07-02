/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Public self-service reseller application. No auth required — anyone can
 * apply. Creates a `pending` reseller row (referral code generated up front
 * so the admin can approve with one click, but a pending code earns zero
 * commission — see lib/reseller.ts's `AND status = 'active'` gate). The
 * admin reviews and approves via /admin/resellers.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun } from "@/lib/db";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const company = String(body.company || "").trim();
  const notes = String(body.notes || "").trim().slice(0, 2000);

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const existing = await dbFirst<any>(db, `SELECT id, status FROM resellers WHERE email = ?`, [email]);
    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ error: "You already have an application pending review. We'll email you once it's approved." }, { status: 409 });
      }
      return NextResponse.json({ error: "An account already exists for this email. Contact hallo@axto.io if you believe this is a mistake." }, { status: 409 });
    }

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
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, datetime('now'), datetime('now'))`,
      [id, email, name, company, code, notes]
    );

    return NextResponse.json({
      success: true,
      message: "Application received. Our team reviews every reseller application manually — you'll hear from us at this email once it's approved.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to submit application" }, { status: 500 });
  }
}
