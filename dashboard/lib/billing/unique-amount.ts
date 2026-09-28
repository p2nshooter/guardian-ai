/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * UNIQUE TRANSFER AMOUNT for manual bank transfers (BNI). Every order gets its
 * own 3-digit code added to the rupiah price (Rp 3.284.000 → Rp 3.284.517), so
 * when a transfer lands in the bank app the admin can tell exactly which order
 * it pays — search that amount in Admin → Orders and press "Mark paid".
 * Confirmation stays manual; the code only identifies the order.
 * ============================================================================ */
import { dbQuery } from "../db";

const WINDOW_DAYS = 14;

/** base (already rounded to Rp 1.000) + a code 1…999 no open bank order is using. */
export async function uniqueIdrAmount(db: any, base: number): Promise<{ amount: number; code: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
  const rows = await dbQuery<{ amount_local: number }>(db,
    `SELECT amount_local FROM orders WHERE gateway = 'manual' AND status = 'pending' AND created_at >= ?`, [since]);
  const taken = new Set(rows.map((r) => Math.round(r.amount_local)));
  const start = 1 + (crypto.getRandomValues(new Uint16Array(1))[0] % 999);
  for (let i = 0; i < 999; i++) {
    const code = ((start - 1 + i) % 999) + 1;
    if (!taken.has(Math.round(base) + code)) return { amount: Math.round(base) + code, code };
  }
  // 999 open bank orders at the same price at once — fall back to a 4-digit code.
  const code = 1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000);
  return { amount: Math.round(base) + code, code };
}

/** Digits of a pasted amount ("Rp 3.284.517", "3,284,517.00") → 3284517, else null. */
export function parseIdrQuery(q: string): number | null {
  const s = q.trim();
  if (!/^(rp\.?\s*)?[0-9][0-9.,\s]*$/i.test(s)) return null;
  const noDecimals = s.replace(/[.,]00$/, "");
  const n = Number(noDecimals.replace(/[^0-9]/g, ""));
  return n >= 1000 ? n : null;
}
