/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Payment gateway registry + encrypted credential access.
 * Credentials are stored AES-GCM encrypted in D1 `payment_gateways` and are
 * edited from Admin → Payments.
 * ============================================================================ */
import { dbFirst, dbQuery } from "../db";
import { decryptObj } from "../gateway-crypto";

export type GatewayId = "stripe" | "paypal" | "xendit" | "midtrans" | "nowpayments" | "manual";

export interface GatewayInfo {
  id: GatewayId;
  label: string;          // shown to customers
  methods: string;        // what the customer can pay with
  currency: "USD" | "IDR";
  fields: { key: string; label: string; secret?: boolean; placeholder?: string }[];
  webhookPath?: string;   // to paste into the gateway dashboard
}

export const GATEWAYS: GatewayInfo[] = [
  { id: "stripe", label: "Card (Stripe)", methods: "Visa, Mastercard, Amex, Apple Pay, Google Pay", currency: "USD",
    fields: [{ key: "secret_key", label: "Secret key", secret: true, placeholder: "sk_live_…" }, { key: "webhook_secret", label: "Webhook signing secret", secret: true, placeholder: "whsec_…" }],
    webhookPath: "/api/webhooks/stripe" },
  { id: "paypal", label: "PayPal", methods: "PayPal balance or card", currency: "USD",
    fields: [{ key: "client_id", label: "Client ID" }, { key: "client_secret", label: "Client secret", secret: true }, { key: "mode", label: "Mode (live / sandbox)", placeholder: "live" }, { key: "webhook_id", label: "Webhook ID (optional)" }],
    webhookPath: "/api/webhooks/paypal" },
  { id: "xendit", label: "Indonesia — QRIS, VA, e-wallet (Xendit)", methods: "QRIS, bank virtual account, OVO, DANA, ShopeePay", currency: "IDR",
    fields: [{ key: "secret_key", label: "Secret key", secret: true, placeholder: "xnd_production_…" }, { key: "webhook_token", label: "Callback verification token", secret: true }],
    webhookPath: "/api/webhooks/xendit" },
  { id: "midtrans", label: "Indonesia — QRIS, VA, GoPay (Midtrans)", methods: "QRIS, bank transfer, GoPay, card", currency: "IDR",
    fields: [{ key: "server_key", label: "Server key", secret: true, placeholder: "Mid-server-…" }, { key: "client_key", label: "Client key" }, { key: "is_production", label: "Production (true / false)", placeholder: "true" }],
    webhookPath: "/api/webhooks/midtrans" },
  { id: "nowpayments", label: "Crypto (USDT, BTC, ETH…)", methods: "150+ cryptocurrencies", currency: "USD",
    fields: [{ key: "api_key", label: "API key", secret: true }, { key: "ipn_secret", label: "IPN secret", secret: true }],
    webhookPath: "/api/webhooks/nowpayments" },
  { id: "manual", label: "Bank transfer (manual)", methods: "Transfer, then we confirm within 1 business day", currency: "USD",
    fields: [{ key: "instructions", label: "Payment instructions shown to customers", placeholder: "Bank, account name, account number, SWIFT…" }] },
];

export function gatewayInfo(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((g) => g.id === id);
}

export async function gatewayCreds(db: any, id: GatewayId): Promise<Record<string, string> | null> {
  const row = await dbFirst<{ credentials_enc: string; is_active: number }>(db,
    `SELECT credentials_enc, is_active FROM payment_gateways WHERE gateway = ?`, [id]);
  if (!row?.is_active || !row.credentials_enc) return null;
  try {
    return await decryptObj<Record<string, string>>(row.credentials_enc);
  } catch {
    return null;
  }
}

/** Gateways a customer can use right now (active + has credentials). */
export async function activeGateways(db: any): Promise<GatewayInfo[]> {
  const rows = await dbQuery<{ gateway: string; is_active: number; credentials_enc: string }>(db,
    `SELECT gateway, is_active, credentials_enc FROM payment_gateways WHERE is_active = 1`);
  const on = new Set(rows.filter((r) => r.credentials_enc).map((r) => r.gateway));
  return GATEWAYS.filter((g) => on.has(g.id));
}

// ── USD → IDR ───────────────────────────────────────────────────────────────
// Admin-set rate (platform_config.usd_idr_rate) wins; otherwise a cached public
// rate; otherwise a conservative constant. Amounts are rounded up to Rp1,000.
const FALLBACK_IDR = 16500;

export async function usdIdrRate(db: any, kv?: any): Promise<number> {
  try {
    const row = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'usd_idr_rate'`);
    const v = Number(row?.value);
    if (Number.isFinite(v) && v > 1000) return v;
  } catch {}
  try {
    const cached = kv ? Number(await kv.get("fx:USDIDR")) : 0;
    if (cached > 1000) return cached;
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cf: { cacheTtl: 43200 } } as any);
    const j: any = await r.json();
    const rate = Number(j?.rates?.IDR);
    if (rate > 1000) {
      if (kv) await kv.put("fx:USDIDR", String(rate), { expirationTtl: 43200 }).catch(() => {});
      return rate;
    }
  } catch {}
  return FALLBACK_IDR;
}

export function toIdr(usd: number, rate: number): number {
  return Math.ceil((usd * rate) / 1000) * 1000;
}
