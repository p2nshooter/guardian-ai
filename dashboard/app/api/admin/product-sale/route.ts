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
import { getDB, dbQuery, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const ALL_PRODUCTS = ["guardian", "orchestra", "vault", "edge", "soc", "compliance", "sentinel", "antivirus", "studio", "legal"];

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    // DB not available — return defaults from PACKAGE_INFO
    const { PACKAGE_INFO } = await import("@/lib/stripe");
    const products: Record<string, boolean> = {};
    for (const p of ALL_PRODUCTS) {
      // Check if any non-trial, non-bundle package for this product has forSale !== false
      const forSale = Object.values(PACKAGE_INFO).some(
        v => v.product === p && !v.isBundle && !v.isTrial && v.forSale !== false
      );
      products[p] = forSale;
    }
    return NextResponse.json({ products });
  }

  // Try to read from DB first (migration 0029)
  try {
    const rows = await dbQuery<{ product: string; for_sale: number }>(
      db,
      `SELECT product, MIN(for_sale) as for_sale FROM license_packages WHERE is_active = 1 AND code NOT LIKE 'trial_%' GROUP BY product`
    );
    const products: Record<string, boolean> = {};
    for (const p of ALL_PRODUCTS) {
      const row = rows.find(r => r.product === p);
      // Default: guardian, orchestra, antivirus = for sale; others = not for sale
      products[p] = row ? row.for_sale === 1 : (p === "guardian" || p === "orchestra" || p === "antivirus");
    }
    return NextResponse.json({ products });
  } catch {
    // for_sale column doesn't exist yet — use PACKAGE_INFO defaults
    const { PACKAGE_INFO } = await import("@/lib/stripe");
    const products: Record<string, boolean> = {};
    for (const p of ALL_PRODUCTS) {
      products[p] = Object.values(PACKAGE_INFO).some(
        v => v.product === p && !v.isBundle && !v.isTrial && v.forSale !== false
      );
    }
    return NextResponse.json({ products });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { product, forSale } = body;
  if (!product || !ALL_PRODUCTS.includes(product)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const val = forSale ? 1 : 0;

  try {
    await dbRun(db, `UPDATE license_packages SET for_sale = ? WHERE product = ?`, [val, product]);
  } catch {
    // for_sale column might not exist — try adding it
    try {
      await dbRun(db, `ALTER TABLE license_packages ADD COLUMN for_sale INTEGER NOT NULL DEFAULT 1`, []);
      await dbRun(db, `UPDATE license_packages SET for_sale = ? WHERE product = ?`, [val, product]);
    } catch {
      return NextResponse.json({ error: "Failed to update. Run migration 0029." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, product, forSale: !!forSale });
}
