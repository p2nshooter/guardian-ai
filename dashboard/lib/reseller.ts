/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Reseller commission tracking. Tier is looked up by the reseller's cumulative
 * sales volume BEFORE the current sale (volume-based tiers, not per-order),
 * and commission is always clamped to a 25% ceiling regardless of what an
 * admin configures in reseller_commission_tiers — that ceiling is a business
 * rule, not just a starting default.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun } from "@/lib/db";

export const MAX_COMMISSION_PCT = 25;

const uid = () => `rs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface Tier { min_volume_usd: number; commission_pct: number }

/** Highest tier whose min_volume_usd the reseller's current cumulative volume has reached. */
export async function resolveCommissionPct(db: any, totalSalesUsd: number): Promise<number> {
  const tiers = await dbQuery<Tier>(
    db,
    `SELECT min_volume_usd, commission_pct FROM reseller_commission_tiers ORDER BY min_volume_usd ASC`
  );
  let pct = 0;
  for (const t of tiers) {
    if (totalSalesUsd >= t.min_volume_usd) pct = t.commission_pct;
  }
  return Math.min(pct, MAX_COMMISSION_PCT);
}

/**
 * Record a commissioned sale for a reseller, if the referral code matches an
 * active reseller. Best-effort: never throws — a tracking failure must never
 * block the actual license/payment that already succeeded.
 */
export async function recordResellerSale(
  db: any,
  params: { referralCode?: string; amountUsd: number; licenseId?: string; clientEmail?: string }
): Promise<void> {
  const code = (params.referralCode || "").trim();
  if (!code || params.amountUsd <= 0) return;

  try {
    const reseller = await dbFirst<any>(
      db,
      `SELECT id, total_sales_usd FROM resellers WHERE referral_code = ? AND status = 'active'`,
      [code]
    );
    if (!reseller) return;

    const pct = await resolveCommissionPct(db, reseller.total_sales_usd || 0);
    const commissionUsd = Math.round(params.amountUsd * (pct / 100) * 100) / 100;

    await dbRun(
      db,
      `INSERT INTO reseller_sales (id, reseller_id, license_id, client_email, order_amount_usd, commission_pct, commission_usd, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [uid(), reseller.id, params.licenseId || "", params.clientEmail || "", params.amountUsd, pct, commissionUsd]
    );
    await dbRun(
      db,
      `UPDATE resellers SET total_sales_usd = total_sales_usd + ?, updated_at = datetime('now') WHERE id = ?`,
      [params.amountUsd, reseller.id]
    );
  } catch {
    // Reseller tracking is best-effort — never let it break a real payment.
  }
}
