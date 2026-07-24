/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * PUBLIC install counter — /api/installs/count
 * Returns ONLY counts (total + per product), never any install ID, hostname,
 * IP or client detail. Powers the landing-page live counter so visitors can
 * see which AXTO apps are the most-used ("viral") — numbers only.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery } from "@/lib/db";

const CORS: Record<string, string> = { "Access-Control-Allow-Origin": "*" };
const EMPTY = { total: 0, products: {} as Record<string, number>, updated_at: new Date(0).toISOString() };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json(EMPTY, { headers: CORS }); }
  try {
    const rows = await dbQuery<{ product: string; c: number }>(
      db,
      `SELECT product, COUNT(*) AS c FROM installs WHERE status = 'active' GROUP BY product`
    );
    const products: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const n = Number(r.c) || 0;
      products[r.product] = n;
      total += n;
    }
    return NextResponse.json(
      { total, products, updated_at: new Date().toISOString() },
      { headers: { ...CORS, "cache-control": "public, max-age=60" } }
    );
  } catch {
    // Table may not exist yet (pre-migration) — counts are simply zero.
    return NextResponse.json(EMPTY, { headers: CORS });
  }
}
