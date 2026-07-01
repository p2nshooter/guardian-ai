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
import { getDB, dbQuery, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PACKAGE_INFO } from "@/lib/stripe";

const uid = () => `promo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ── GET /api/admin/promo-pricing ──────────────────────────────────────────────
// Lists every promo row (past, active and future) newest-first.
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    const rows = await dbQuery<any>(db, `SELECT * FROM promo_pricing ORDER BY created_at DESC`);
    return NextResponse.json({ promos: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load promos" }, { status: 500 });
  }
}

// ── POST /api/admin/promo-pricing ─────────────────────────────────────────────
// Body: { packageCode, label, promoPrice, promoPriceMonthly?, startsAt, endsAt }
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { packageCode, label, promoPrice, promoPriceMonthly, startsAt, endsAt } = body;
  const pkg = (PACKAGE_INFO as any)[packageCode];
  if (!packageCode || !pkg) return NextResponse.json({ error: `Unknown package code: ${packageCode}` }, { status: 400 });
  if (typeof promoPrice !== "number" || promoPrice <= 0) return NextResponse.json({ error: "promoPrice must be > 0" }, { status: 400 });
  if (!startsAt || !endsAt) return NextResponse.json({ error: "startsAt and endsAt are required" }, { status: 400 });
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const id = uid();
  try {
    await dbRun(
      db,
      `INSERT INTO promo_pricing
         (id, package_code, product, label, promo_price, promo_price_monthly, starts_at, ends_at, enabled, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))`,
      [id, packageCode, pkg.product, label || "", promoPrice, promoPriceMonthly || 0, startsAt, endsAt, user.email ?? "admin"]
    );
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create promo" }, { status: 500 });
  }
}

// ── PATCH /api/admin/promo-pricing ────────────────────────────────────────────
// Body: { id, enabled? , label?, promoPrice?, promoPriceMonthly?, startsAt?, endsAt? }
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (typeof body.enabled === "boolean")            { fields.push("enabled = ?");             values.push(body.enabled ? 1 : 0); }
  if (typeof body.label === "string")               { fields.push("label = ?");                values.push(body.label); }
  if (typeof body.promoPrice === "number")          { fields.push("promo_price = ?");          values.push(body.promoPrice); }
  if (typeof body.promoPriceMonthly === "number")   { fields.push("promo_price_monthly = ?");  values.push(body.promoPriceMonthly); }
  if (typeof body.startsAt === "string")            { fields.push("starts_at = ?");             values.push(body.startsAt); }
  if (typeof body.endsAt === "string")              { fields.push("ends_at = ?");               values.push(body.endsAt); }
  if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  fields.push("updated_at = datetime('now')");
  values.push(id);

  try {
    await dbRun(db, `UPDATE promo_pricing SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update promo" }, { status: 500 });
  }
}

// ── DELETE /api/admin/promo-pricing?id=... ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    await dbRun(db, `DELETE FROM promo_pricing WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to delete promo" }, { status: 500 });
  }
}
