/* ==============================================================================
 * Trial request flow
 *   POST /api/portal/trial-request        (client) — submit a 2-week trial request
 *   GET  /api/admin/trial-requests        (admin)  — list pending/all requests
 *   POST /api/admin/trial-requests        (admin)  — { id, action: approve|reject, auto }
 *                                                     approve → issues trial license + invoice
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createLicense } from "@/lib/license";

const TRIAL_DAYS = 14; // 2 weeks
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ── Client submits a trial request ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const body = await req.json().catch(() => ({}));
  const product = String(body.product || "").trim();
  if (!product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  // One trial per email per product.
  const existing = await db.prepare(
    "SELECT id FROM trial_requests WHERE user_email = ? AND product = ? AND status IN ('pending','approved')",
  ).bind((user as any).email, product).first();
  if (existing) return NextResponse.json({ error: "A trial for this product already exists" }, { status: 409 });

  const id = uid("trq");
  await db.prepare(
    `INSERT INTO trial_requests (id, user_email, product, package_code, company, country, use_case, machine_hint, trial_days, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  ).bind(
    id, (user as any).email, product, String(body.packageCode || `trial_${product}`),
    String(body.company || ""), String(body.country || ""), String(body.useCase || ""),
    String(body.machineHint || ""), TRIAL_DAYS,
  ).run();

  return NextResponse.json({ ok: true, id, status: "pending", trialDays: TRIAL_DAYS });
}
