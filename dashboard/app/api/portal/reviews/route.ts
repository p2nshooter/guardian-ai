/* ==============================================================================
 * POST /api/portal/reviews   (client) — submit a review (goes to pending)
 * GET  /api/portal/reviews   (client) — list my own submitted reviews + status
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { validateReview } from "@/lib/reviews";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const rows = await db.prepare(
    "SELECT id, rating, title, body, status, featured, created_at FROM reviews WHERE client_email = ? ORDER BY created_at DESC",
  ).bind((user as any).email).all();
  return NextResponse.json({ reviews: rows?.results || [] });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const b = await req.json().catch(() => ({}));

  const v = validateReview({
    rating: b.rating, body: b.body, title: b.title, companyName: b.companyName,
    showCompany: !!b.showCompany, language: b.language, product: b.product, logoDataUrl: b.logoDataUrl,
  });
  if (!v.ok) return NextResponse.json({ error: "invalid review", details: v.errors }, { status: 400 });

  // One review per client per product.
  const existing = await db.prepare(
    "SELECT id FROM reviews WHERE client_email = ? AND product = ?",
  ).bind((user as any).email, String(b.product || "")).first();
  if (existing) return NextResponse.json({ error: "You already submitted a review for this product" }, { status: 409 });

  const id = uid("rev");
  await db.prepare(
    `INSERT INTO reviews
       (id, client_email, client_name, company_name, show_company, admin_show_company, logo_data,
        product, rating, title, body, language, status, featured, flagged, flag_reason)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
  ).bind(
    id, (user as any).email, String(b.clientName || (user as any).name || ""),
    String(b.companyName || ""), b.showCompany ? 1 : 0, String(b.logoDataUrl || ""),
    String(b.product || ""), Math.round(Number(b.rating)), String(b.title || "").slice(0, 120),
    String(b.body || "").trim().slice(0, 1000), String(b.language || "en"),
    v.flagged ? 1 : 0, v.flagReason,
  ).run();

  return NextResponse.json({
    ok: true, id, status: "pending",
    note: "Thank you! Your review is awaiting moderation before it appears on the site.",
    flagged: v.flagged,
  });
}
