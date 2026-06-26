/* ==============================================================================
 * Admin trial-requests management
 *   GET  /api/admin/trial-requests?status=pending   — list requests
 *   POST /api/admin/trial-requests                   — { id, action, auto }
 *        action = "approve" → issue 2-week trial license + free invoice, notify client
 *        action = "reject"  → mark rejected
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createLicense } from "@/lib/license";
import { writeInvoice } from "@/lib/invoice";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const rows = status === "all"
    ? await db.prepare("SELECT * FROM trial_requests ORDER BY requested_at DESC LIMIT 200").all()
    : await db.prepare("SELECT * FROM trial_requests WHERE status = ? ORDER BY requested_at DESC LIMIT 200").bind(status).all();
  return NextResponse.json({ requests: rows?.results || [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const { id, action, auto } = await req.json().catch(() => ({}));
  if (!id || !action) return NextResponse.json({ error: "id and action are required" }, { status: 400 });

  const tr: any = await db.prepare("SELECT * FROM trial_requests WHERE id = ?").bind(id).first();
  if (!tr) return NextResponse.json({ error: "request not found" }, { status: 404 });
  if (tr.status !== "pending") return NextResponse.json({ error: `already ${tr.status}` }, { status: 409 });

  const now = new Date().toISOString();
  const actor = (admin as any)?.email || "admin";

  if (action === "reject") {
    await db.prepare("UPDATE trial_requests SET status='rejected', decided_at=?, decided_by=? WHERE id=?")
      .bind(now, actor, id).run();
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action !== "approve") return NextResponse.json({ error: "invalid action" }, { status: 400 });

  // Issue a trial license via the same smart-license issuer used everywhere.
  let issued;
  try {
    issued = await createLicense({
      clientName: tr.company || tr.user_email,
      clientEmail: tr.user_email,
      product: tr.product,
      packageCode: tr.package_code || `trial_${tr.product}`,
      licenseType: "trial",
      isTrial: true,
      trialDays: tr.trial_days || 14,
      manualActivation: true,   // admin-approved, no separate user signup needed
      skipUser: false,
    } as any, req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "issue failed" }, { status: 400 });
  }

  const licenseId = (issued as any)?.licenseId || (issued as any)?.id || "";
  const expiresAt = (issued as any)?.expiresAt || "";

  // Free trial invoice (elegant "Complimentary — No Charge" wording in renderer).
  let invId = "";
  try {
    invId = await writeInvoice(db, {
      email: tr.user_email, product: tr.product, licenseId, kind: "trial",
      amountUsd: 0, gateway: "trial", paymentRef: tr.id,
    });
  } catch { /* invoice non-fatal for issuance, but normally always written */ }

  await db.prepare(
    "UPDATE trial_requests SET status='approved', auto_approved=?, decided_at=?, decided_by=?, license_id=? WHERE id=?",
  ).bind(auto ? 1 : 0, now, actor, licenseId, id).run();

  return NextResponse.json({ ok: true, status: "approved", licenseId, expiresAt, invoiceId: invId });
}
