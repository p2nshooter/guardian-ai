/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime  = "edge";
export const dynamic  = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun, dbFirst } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getAllPackagesWithLivePrices } from "@/lib/pricing";
import { PACKAGE_INFO } from "@/lib/stripe";

// ── GET /api/admin/pricing ────────────────────────────────────────────────────
// Returns all packages with their current live prices (DB-first, static fallback)
// and static reference prices so the admin UI can show "default" side-by-side.
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const packages = await getAllPackagesWithLivePrices(req);
    return NextResponse.json({ packages, source: packages[0]?.source ?? "static" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load pricing" }, { status: 500 });
  }
}

// ── PUT /api/admin/pricing ────────────────────────────────────────────────────
// Body: { code: string, price: number, priceMonthly?: number }
//   OR: { updates: Array<{ code, price, priceMonthly? }> } for bulk updates
//
// Rules:
//   - Admin only
//   - price must be > 0
//   - priceMonthly defaults to Math.round(price / 10) if not supplied
//   - Self-healing: tries ALTER TABLE if column is missing
export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Normalise single vs bulk update
  let updates: { code: string; price: number; priceMonthly?: number }[] = [];

  if (Array.isArray(body.updates)) {
    updates = body.updates;
  } else if (body.code && body.price !== undefined) {
    updates = [{ code: body.code, price: body.price, priceMonthly: body.priceMonthly }];
  } else {
    return NextResponse.json({ error: "Provide { code, price } or { updates: [...] }" }, { status: 400 });
  }

  // Validate all entries first
  const knownCodes = new Set(Object.keys(PACKAGE_INFO as object));
  for (const u of updates) {
    if (!u.code || !knownCodes.has(u.code)) {
      return NextResponse.json({ error: `Unknown package code: ${u.code}` }, { status: 400 });
    }
    if (typeof u.price !== "number" || u.price <= 0) {
      return NextResponse.json({ error: `Invalid price for ${u.code}: must be > 0` }, { status: 400 });
    }
    if (u.priceMonthly !== undefined && (typeof u.priceMonthly !== "number" || u.priceMonthly <= 0)) {
      return NextResponse.json({ error: `Invalid priceMonthly for ${u.code}` }, { status: 400 });
    }
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const applied: string[] = [];
  const failed: { code: string; error: string }[] = [];

  for (const u of updates) {
    const monthly = u.priceMonthly ?? Math.round(u.price / 10);
    try {
      const result = await dbRun(
        db,
        `UPDATE license_packages SET price_usd = ?, price_monthly = ?, updated_at = datetime('now')
         WHERE code = ? AND is_active = 1`,
        [u.price, monthly, u.code]
      );
      // If no row was updated, insert to self-heal missing rows
      if ((result as any)?.changes === 0) {
        const existing = await dbFirst(db, `SELECT id FROM license_packages WHERE code = ?`, [u.code]);
        if (!existing) {
          // Package isn't in DB at all — insert minimal row from PACKAGE_INFO
          const pkg = (PACKAGE_INFO as any)[u.code];
          await dbRun(
            db,
            `INSERT OR IGNORE INTO license_packages
               (id, code, name, product, price_usd, price_monthly, is_active, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`,
            [
              `pkg-${u.code}`, u.code,
              pkg?.name ?? u.code, pkg?.product ?? "unknown",
              u.price, monthly,
            ]
          );
        }
      }
      applied.push(u.code);
    } catch (err: any) {
      // Self-heal: if price_usd column is missing (migration 0034 not yet applied), run it
      if (String(err?.message ?? "").includes("no column")) {
        try {
          await dbRun(db, `ALTER TABLE license_packages ADD COLUMN price_usd REAL NOT NULL DEFAULT 0`, []);
          await dbRun(db, `ALTER TABLE license_packages ADD COLUMN price_monthly REAL NOT NULL DEFAULT 0`, []);
          await dbRun(
            db,
            `UPDATE license_packages SET price_usd = ?, price_monthly = ?, updated_at = datetime('now') WHERE code = ?`,
            [u.price, monthly, u.code]
          );
          applied.push(u.code);
        } catch (err2: any) {
          failed.push({ code: u.code, error: String(err2?.message ?? err2) });
        }
      } else {
        failed.push({ code: u.code, error: String(err?.message ?? err) });
      }
    }
  }

  // Audit log
  try {
    await dbRun(
      db,
      `INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
       VALUES (?, 'price_update', 'pricing', ?, ?, ?, datetime('now'))`,
      [
        `price-${Date.now()}`,
        applied.join(","),
        user.email ?? "admin",
        JSON.stringify({ applied, failed, by: user.email }),
      ]
    );
  } catch { /* audit logging is best-effort */ }

  if (failed.length > 0 && applied.length === 0) {
    return NextResponse.json({ error: "All updates failed", failed }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    applied,
    failed: failed.length > 0 ? failed : undefined,
  });
}
