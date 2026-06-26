/* ==============================================================================
 * Payment-methods registry (admin-editable, DB-backed).
 * Everything is OFF by default; only methods with enabled=1 are ever returned,
 * so disabled methods are hidden in the client checkout AND the admin UI AND the
 * API. The owner enabled exactly: USDT (TRC20), BNB, ETH, BTC.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
import type { PaymentMethod } from "@/lib/payments/crypto";

// Public-safe shape: NEVER expose anything but what a payer needs.
export interface PublicPaymentMethod {
  id: string; symbol: string; name: string; network: string;
  category: "crypto" | "fiat"; confirmations: number;
}

export function toPublic(m: PaymentMethod): PublicPaymentMethod {
  return { id: m.id, symbol: m.symbol, name: m.name, network: m.network, category: m.category, confirmations: m.confirmations };
}

// Only ENABLED methods. Disabled rows are never returned → hidden everywhere.
export async function getEnabledMethods(db: any): Promise<PaymentMethod[]> {
  try {
    const rows = await db.prepare(
      "SELECT * FROM payment_methods WHERE enabled = 1 ORDER BY sort_order ASC",
    ).all();
    return (rows?.results || []) as PaymentMethod[];
  } catch {
    return [];
  }
}

// A single enabled method by id (or null if missing/disabled).
export async function getEnabledMethod(db: any, id: string): Promise<PaymentMethod | null> {
  try {
    const row = await db.prepare(
      "SELECT * FROM payment_methods WHERE id = ? AND enabled = 1",
    ).bind(id).first();
    return (row as PaymentMethod) || null;
  } catch {
    return null;
  }
}

// Public list for the client checkout (no addresses leaked until an intent is made).
export async function getPublicMethods(db: any): Promise<PublicPaymentMethod[]> {
  const methods = await getEnabledMethods(db);
  return methods.map(toPublic);
}
