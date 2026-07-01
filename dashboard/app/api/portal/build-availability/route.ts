/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * /api/portal/build-availability
 *
 * GET ?product=guardian  (or no product → all)
 * Returns: { availability: Record<"product:format", boolean> }
 *
 * Requires a logged-in user (not admin).
 * Called by the client portal to decide whether to show
 * a Download button or a "Coming Soon" badge per format.
 */
export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const ALL_PRODUCTS = [
  "guardian", "orchestra", "vault", "edge",
  "soc", "compliance", "sentinel", "antivirus", "studio", "legal",
];
const ALL_FORMATS = ["docker", "exe-linux", "exe-windows"] as const;
type Format = typeof ALL_FORMATS[number];

// Honest defaults when no admin row exists:
//   docker      → ON  (CI builds a Docker image for every product)
//   exe-linux   → OFF (no workflow builds a standalone Linux binary — ever)
//   exe-windows → OFF (a Windows .exe must be verified running & production-
//                      ready before an admin flips it ON; never auto-ON)
// This guarantees a client is never shown a download that doesn't exist.
function defaultEnabled(_product: string, format: Format): boolean {
  return format === "docker";
}

async function readAvailability(db: any, filterProduct?: string): Promise<Record<string, boolean>> {
  // Ensure table exists (idempotent)
  await dbRun(db,
    `CREATE TABLE IF NOT EXISTS build_formats (
       product TEXT NOT NULL, format TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
       updated_at TEXT NOT NULL DEFAULT (datetime('now')),
       PRIMARY KEY (product, format)
     )`, []
  );

  const rows = await dbQuery<{ product: string; format: string; enabled: number }>(
    db, `SELECT product, format, enabled FROM build_formats`
  );

  const products = filterProduct ? [filterProduct] : ALL_PRODUCTS;
  const result: Record<string, boolean> = {};

  for (const prod of products) {
    for (const fmt of ALL_FORMATS) {
      const key = `${prod}:${fmt}`;
      const row = rows.find(r => r.product === prod && r.format === fmt);
      result[key] = row !== undefined ? row.enabled === 1 : defaultEnabled(prod, fmt);
    }
  }

  return result;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url     = new URL(req.url);
  const product = url.searchParams.get("product") || undefined;

  if (product && !ALL_PRODUCTS.includes(product))
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    // DB unavailable — return defaults
    const result: Record<string, boolean> = {};
    const products = product ? [product] : ALL_PRODUCTS;
    for (const p of products)
      for (const f of ALL_FORMATS)
        result[`${p}:${f}`] = defaultEnabled(p, f);
    return NextResponse.json({ availability: result, source: "defaults" });
  }

  try {
    const availability = await readAvailability(db, product);
    return NextResponse.json({ availability });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
