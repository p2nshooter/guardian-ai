/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Payment gateway registry + encrypted settings access.
 * Every credential, bank account and wallet address lives in ONE encrypted R2
 * document (lib/secure-store.ts, name "payments") edited from Admin → Payments.
 * Nothing payment-related is stored in D1 or in the repository.
 * ============================================================================ */
import { dbFirst, dbQuery, getR2, now } from "../db";
import { readSecure, writeSecure } from "../secure-store";
import { decryptObj } from "../gateway-crypto";

export type GatewayId = "stripe" | "paypal" | "xendit" | "midtrans" | "nowpayments" | "manual" | "crypto";

export interface GatewayField { key: string; label: string; secret?: boolean; placeholder?: string; multiline?: boolean }
export interface GatewayInfo {
  id: GatewayId;
  label: string;          // shown to customers
  methods: string;        // what the customer can pay with
  currency: "USD" | "IDR";
  fields: GatewayField[];
  /** A gateway can be activated once one of these field groups is complete. */
  requires: string[][];
  confirmation: "automatic" | "admin";
  webhookPath?: string;   // to paste into the gateway dashboard
}

export const GATEWAYS: GatewayInfo[] = [
  { id: "stripe", label: "Card (Stripe)", methods: "Visa, Mastercard, Amex, Apple Pay, Google Pay", currency: "USD", confirmation: "automatic",
    fields: [{ key: "secret_key", label: "Secret key", secret: true, placeholder: "sk_live_…" }, { key: "webhook_secret", label: "Webhook signing secret", secret: true, placeholder: "whsec_…" }],
    requires: [["secret_key", "webhook_secret"]], webhookPath: "/api/webhooks/stripe" },
  { id: "paypal", label: "PayPal", methods: "PayPal balance or card", currency: "USD", confirmation: "automatic",
    fields: [{ key: "client_id", label: "Client ID" }, { key: "client_secret", label: "Client secret", secret: true }, { key: "mode", label: "Mode (live / sandbox)", placeholder: "live" }, { key: "webhook_id", label: "Webhook ID (optional)" }],
    requires: [["client_id", "client_secret"]], webhookPath: "/api/webhooks/paypal" },
  { id: "xendit", label: "Indonesia — QRIS, VA, e-wallet (Xendit)", methods: "QRIS, bank virtual account, OVO, DANA, ShopeePay", currency: "IDR", confirmation: "automatic",
    fields: [{ key: "secret_key", label: "Secret key", secret: true, placeholder: "xnd_production_…" }, { key: "webhook_token", label: "Callback verification token", secret: true }],
    requires: [["secret_key", "webhook_token"]], webhookPath: "/api/webhooks/xendit" },
  { id: "midtrans", label: "Indonesia — QRIS, VA, GoPay (Midtrans)", methods: "QRIS, bank transfer, GoPay, card", currency: "IDR", confirmation: "automatic",
    fields: [{ key: "server_key", label: "Server key", secret: true, placeholder: "Mid-server-…" }, { key: "client_key", label: "Client key" }, { key: "is_production", label: "Production (true / false)", placeholder: "true" }],
    requires: [["server_key"]], webhookPath: "/api/webhooks/midtrans" },
  { id: "nowpayments", label: "Crypto — automatic (NOWPayments)", methods: "USDT, BTC, ETH and 150+ coins, confirmed automatically", currency: "USD", confirmation: "automatic",
    fields: [{ key: "api_key", label: "API key", secret: true }, { key: "ipn_secret", label: "IPN secret", secret: true }],
    requires: [["api_key", "ipn_secret"]], webhookPath: "/api/webhooks/nowpayments" },
  { id: "crypto", label: "Crypto — direct wallet transfer", methods: "USDT / USDC / BTC / ETH / SOL straight to our wallet, confirmed by our team", currency: "USD", confirmation: "admin",
    fields: [
      { key: "usdt_trc20", label: "USDT · TRC20 (Tron) address", secret: true },
      { key: "usdt_erc20", label: "USDT · ERC20 (Ethereum) address", secret: true },
      { key: "usdt_bep20", label: "USDT · BEP20 (BNB Chain) address", secret: true },
      { key: "usdc_erc20", label: "USDC · ERC20 address", secret: true },
      { key: "btc", label: "BTC address", secret: true },
      { key: "eth", label: "ETH address", secret: true },
      { key: "sol", label: "SOL address", secret: true },
      { key: "instructions", label: "Extra instructions (optional)", multiline: true },
    ],
    requires: [["usdt_trc20"], ["usdt_erc20"], ["usdt_bep20"], ["usdc_erc20"], ["btc"], ["eth"], ["sol"]] },
  { id: "manual", label: "Bank transfer (BNI / local bank)", methods: "Transfer to our bank account, confirmed by our team within 1 business day", currency: "IDR", confirmation: "admin",
    fields: [
      { key: "bank_name", label: "Bank", placeholder: "BNI (Bank Negara Indonesia)" },
      { key: "account_number", label: "Account number", secret: true },
      { key: "account_name", label: "Account holder name", secret: true },
      { key: "branch", label: "Branch (optional)" },
      { key: "swift_code", label: "SWIFT / BIC for international transfers (optional)", placeholder: "BNINIDJA" },
      { key: "instructions", label: "Extra instructions (optional)", multiline: true },
    ],
    requires: [["account_number", "account_name"], ["instructions"]] },
];

export const CRYPTO_ASSETS: { key: string; asset: string; network: string }[] = [
  { key: "usdt_trc20", asset: "USDT", network: "TRC20 (Tron)" },
  { key: "usdt_erc20", asset: "USDT", network: "ERC20 (Ethereum)" },
  { key: "usdt_bep20", asset: "USDT", network: "BEP20 (BNB Chain)" },
  { key: "usdc_erc20", asset: "USDC", network: "ERC20 (Ethereum)" },
  { key: "btc", asset: "BTC", network: "Bitcoin" },
  { key: "eth", asset: "ETH", network: "Ethereum" },
  { key: "sol", asset: "SOL", network: "Solana" },
];

export interface GatewaySetting { active: boolean; testMode?: boolean; creds: Record<string, string>; updatedAt?: string }
export interface PaymentSettings { gateways: Partial<Record<GatewayId, GatewaySetting>>; updatedAt?: string; updatedBy?: string }

export function gatewayInfo(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((g) => g.id === id);
}

export function isConfigured(g: GatewayInfo, creds: Record<string, string> | undefined): boolean {
  if (!creds) return false;
  return g.requires.some((group) => group.every((k) => String(creds[k] || "").trim()));
}

export async function paymentSettings(): Promise<PaymentSettings> {
  const s = await readSecure<PaymentSettings>(undefined, "payments", { gateways: {} });
  return { ...s, gateways: s.gateways || {} };
}

export async function savePaymentSettings(s: PaymentSettings): Promise<void> {
  await writeSecure(undefined, "payments", s);
}

/**
 * One-time move of the v2 settings (D1 `payment_gateways`, encrypted rows) into
 * the encrypted R2 documents. Runs when an admin opens Payments and no R2
 * document exists yet; the D1 rows are left untouched (nothing is lost).
 */
export async function migrateLegacyPayments(db: any): Promise<number> {
  if (await getR2().head("secure/payments.json.enc")) return 0;
  let rows: { gateway: string; credentials_enc: string; is_active: number; is_test_mode: number }[] = [];
  try {
    rows = await dbQuery(db, `SELECT gateway, credentials_enc, is_active, is_test_mode FROM payment_gateways WHERE credentials_enc != ''`);
  } catch {
    return 0;
  }
  const settings: PaymentSettings = { gateways: {}, updatedAt: now(), updatedBy: "migration:d1" };
  let email: Record<string, string> | null = null;
  for (const r of rows) {
    let creds: Record<string, string>;
    try { creds = await decryptObj<Record<string, string>>(r.credentials_enc); } catch { continue; }
    if (r.gateway === "resend") { email = { api_key: creds.api_key || "" }; continue; }
    const g = gatewayInfo(r.gateway);
    if (!g) continue;
    const kept: Record<string, string> = {};
    for (const f of g.fields) if (creds[f.key]) kept[f.key] = String(creds[f.key]);
    settings.gateways[g.id] = { active: !!r.is_active && isConfigured(g, kept), testMode: !!r.is_test_mode, creds: kept, updatedAt: now() };
  }
  await savePaymentSettings(settings);
  if (email?.api_key && !(await getR2().head("secure/email.json.enc"))) await writeSecure(undefined, "email", email);
  return Object.keys(settings.gateways).length;
}

/** Credentials of an ACTIVE, fully configured gateway (else null). `_db` kept for call-site compatibility. */
export async function gatewayCreds(_db: any, id: GatewayId): Promise<Record<string, string> | null> {
  const g = gatewayInfo(id);
  if (!g) return null;
  try {
    const cur = (await paymentSettings()).gateways[id];
    return cur?.active && isConfigured(g, cur.creds) ? cur.creds : null;
  } catch {
    return null;
  }
}

/** Gateways a customer can use right now (active + configured). */
export async function activeGateways(_db: any): Promise<GatewayInfo[]> {
  try {
    const s = await paymentSettings();
    return GATEWAYS.filter((g) => s.gateways[g.id]?.active && isConfigured(g, s.gateways[g.id]!.creds));
  } catch {
    return [];
  }
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
