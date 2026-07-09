/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// /api/admin/licenses/active — live "active license info" for the admin panel.
//
// Returns a compact, decision-ready view of every license that is currently
// usable (status='active', not expired, is_enabled=1), plus headline counts
// and breakdowns the dashboard renders as cards. A license is considered
// ON/usable only when BOTH the lifecycle status is active AND the explicit
// on/off switch (is_enabled) is 1 — exactly matching what license-validate
// enforces, so what the admin sees here is what a deployed engine experiences.
// ═══════════════════════════════════════════════════════════════════════════
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const url      = new URL(req.url);
  const product  = url.searchParams.get("product");  // optional filter
  const onlyOn   = url.searchParams.get("on") === "1";

  // ── Headline counts (cheap aggregates) ──────────────────────────────────
  const counts = await dbFirst<any>(db, `
    SELECT
      COUNT(*)                                                                   AS total,
      SUM(CASE WHEN status='active' AND is_enabled=1 AND expires_at > datetime('now') THEN 1 ELSE 0 END) AS active_on,
      SUM(CASE WHEN is_enabled=0 THEN 1 ELSE 0 END)                              AS switched_off,
      SUM(CASE WHEN status='suspended' THEN 1 ELSE 0 END)                        AS suspended,
      SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END)                          AS revoked,
      SUM(CASE WHEN status='expired' OR expires_at <= datetime('now') THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN license_type='trial' AND status='active' AND expires_at > datetime('now') THEN 1 ELSE 0 END) AS active_trials,
      SUM(CASE WHEN activated_manually=1 THEN 1 ELSE 0 END)                      AS manual_grants,
      SUM(CASE WHEN status='active' AND is_enabled=1 AND expires_at > datetime('now')
                AND expires_at <= datetime('now','+30 day') THEN 1 ELSE 0 END)  AS expiring_30d
    FROM licenses
  `);

  // ── Per-product active breakdown ────────────────────────────────────────
  const byProduct = await dbQuery<any>(db, `
    SELECT product, COUNT(*) AS active
    FROM licenses
    WHERE status='active' AND is_enabled=1 AND expires_at > datetime('now')
    GROUP BY product ORDER BY active DESC
  `);

  // ── The active license rows themselves (decision-ready columns only) ─────
  const filters: string[] = ["l.status='active'", "l.expires_at > datetime('now')"];
  const args: any[] = [];
  if (onlyOn) filters.push("l.is_enabled=1");
  if (product) { filters.push("l.product = ?"); args.push(product); }

  const licenses = await dbQuery<any>(db, `
    SELECT
      l.id, l.license_key, l.product, l.package_code, l.license_type,
      l.status, l.is_enabled, l.activated_manually, l.manual_activated_at,
      l.expires_at, l.bound_machine_id, l.max_nodes, l.trial_days,
      l.gateway, l.created_at,
      CAST((julianday(l.expires_at) - julianday('now')) AS INTEGER) AS days_left,
      c.name AS client_name, c.email AS client_email, c.organization
    FROM licenses l
    LEFT JOIN clients c ON c.id = l.client_id
    WHERE ${filters.join(" AND ")}
    ORDER BY days_left ASC
    LIMIT 1000
  `, args);

  return NextResponse.json({
    summary: {
      total:          counts?.total          || 0,
      active_on:      counts?.active_on       || 0,   // status active AND switch ON AND not expired
      switched_off:   counts?.switched_off    || 0,   // explicit OFF
      suspended:      counts?.suspended       || 0,
      revoked:        counts?.revoked         || 0,
      expired:        counts?.expired         || 0,
      active_trials:  counts?.active_trials   || 0,
      manual_grants:  counts?.manual_grants   || 0,
      expiring_30d:   counts?.expiring_30d    || 0,
    },
    by_product: byProduct,
    licenses,
  });
}
