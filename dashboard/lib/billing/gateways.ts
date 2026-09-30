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

/** Every automatic gateway keeps TWO separate credential sets. "sandbox" = the
 * provider's test environment (no real money), "live" = real payments. */
export type PayEnv = "live" | "sandbox";
export const PAY_ENVS: PayEnv[] = ["live", "sandbox"];
export const isPayEnv = (v: unknown): v is PayEnv => v === "live" || v === "sandbox";

export interface GatewayField {
  key: string; label: string; secret?: boolean; multiline?: boolean;
  placeholder?: string;              // live example
  sandboxPlaceholder?: string;       // sandbox example (defaults to placeholder)
  hint?: string;                     // where to find it
  /** Required key prefixes per environment — catches a live key pasted into Sandbox and vice versa. */
  prefix?: Partial<Record<PayEnv, string[]>>;
}
export interface GatewayInfo {
  id: GatewayId;
  label: string;          // shown to customers
  methods: string;        // what the customer can pay with
  currency: "USD" | "IDR";
  fields: GatewayField[];
  /** A gateway can be offered once one of these field groups is complete (for the chosen environment). */
  requires: string[][];
  confirmation: "automatic" | "admin";
  /** Environments this method has. Bank transfer and direct wallets are real accounts: live only. */
  envs: PayEnv[];
  webhookPath?: string;   // to paste into the gateway dashboard
  events?: string;        // which notifications to enable there
  keysAt?: string;        // where the admin finds the keys
}

export const GATEWAYS: GatewayInfo[] = [
  { id: "stripe", label: "Card (Stripe)", methods: "Visa, Mastercard, Amex, Apple Pay, Google Pay", currency: "USD", confirmation: "automatic", envs: ["live", "sandbox"],
    fields: [
      { key: "secret_key", label: "Secret key", secret: true, placeholder: "sk_live_…", sandboxPlaceholder: "sk_test_…", prefix: { live: ["sk_live_", "rk_live_"], sandbox: ["sk_test_", "rk_test_"] } },
      { key: "webhook_secret", label: "Webhook signing secret", secret: true, placeholder: "whsec_…", prefix: { live: ["whsec_"], sandbox: ["whsec_"] } },
    ],
    requires: [["secret_key", "webhook_secret"]], webhookPath: "/api/webhooks/stripe",
    events: "checkout.session.completed, checkout.session.async_payment_succeeded",
    keysAt: "Stripe Dashboard → Developers → API keys (Test mode toggle for sandbox) · Webhooks → Add endpoint" },
  { id: "paypal", label: "PayPal", methods: "PayPal balance or card", currency: "USD", confirmation: "automatic", envs: ["live", "sandbox"],
    fields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client secret", secret: true },
      { key: "webhook_id", label: "Webhook ID", hint: "Needed to verify PayPal's notifications; payments also confirm when the buyer returns." },
    ],
    requires: [["client_id", "client_secret"]], webhookPath: "/api/webhooks/paypal", events: "PAYMENT.CAPTURE.COMPLETED",
    keysAt: "developer.paypal.com → Apps & Credentials (Sandbox / Live tabs) → your app" },
  { id: "xendit", label: "Indonesia — QRIS, VA, e-wallet (Xendit)", methods: "QRIS, bank virtual account, OVO, DANA, ShopeePay", currency: "IDR", confirmation: "automatic", envs: ["live", "sandbox"],
    fields: [
      { key: "secret_key", label: "Secret key", secret: true, placeholder: "xnd_production_…", sandboxPlaceholder: "xnd_development_…", prefix: { live: ["xnd_production_"], sandbox: ["xnd_development_"] } },
      { key: "webhook_token", label: "Callback verification token", secret: true },
    ],
    requires: [["secret_key", "webhook_token"]], webhookPath: "/api/webhooks/xendit", events: "Invoices → Invoice paid",
    keysAt: "Xendit Dashboard (Test / Live switch) → Settings → API keys · Webhooks" },
  { id: "midtrans", label: "Indonesia — QRIS, VA, GoPay (Midtrans)", methods: "QRIS, bank transfer, GoPay, card", currency: "IDR", confirmation: "automatic", envs: ["live", "sandbox"],
    fields: [
      { key: "server_key", label: "Server key", secret: true, placeholder: "Mid-server-…", sandboxPlaceholder: "SB-Mid-server-…", prefix: { live: ["Mid-server-"], sandbox: ["SB-Mid-server-"] } },
      { key: "client_key", label: "Client key", placeholder: "Mid-client-…", sandboxPlaceholder: "SB-Mid-client-…", prefix: { live: ["Mid-client-"], sandbox: ["SB-Mid-client-"] } },
    ],
    requires: [["server_key"]], webhookPath: "/api/webhooks/midtrans", events: "Payment notification URL",
    keysAt: "Midtrans Dashboard (Sandbox / Production switch) → Settings → Access keys · Payment → Notification URL" },
  { id: "nowpayments", label: "Crypto — automatic (NOWPayments)", methods: "USDT, BTC, ETH and 150+ coins, confirmed automatically", currency: "USD", confirmation: "automatic", envs: ["live", "sandbox"],
    fields: [{ key: "api_key", label: "API key", secret: true }, { key: "ipn_secret", label: "IPN secret", secret: true }],
    requires: [["api_key", "ipn_secret"]], webhookPath: "/api/webhooks/nowpayments", events: "IPN (instant payment notifications)",
    keysAt: "nowpayments.io (live) or account-sandbox.nowpayments.io (sandbox) → Settings → Payments / IPN" },
  { id: "crypto", label: "Crypto — direct wallet transfer", methods: "USDT / USDC / BTC / ETH / SOL straight to our wallet, confirmed on-chain automatically", currency: "USD", confirmation: "automatic", envs: ["live"],
    fields: [
      { key: "usdt_trc20", label: "USDT · TRC20 (Tron) address", secret: true },
      { key: "usdt_erc20", label: "USDT · ERC20 (Ethereum) address", secret: true },
      { key: "usdt_bep20", label: "USDT · BEP20 (BNB Chain) address", secret: true },
      { key: "usdc_erc20", label: "USDC · ERC20 address", secret: true },
      { key: "btc", label: "BTC address", secret: true },
      { key: "eth", label: "ETH address", secret: true },
      { key: "sol", label: "SOL address", secret: true },
      { key: "etherscan_api_key", label: "Etherscan API v2 key — auto-confirms ERC20 / BEP20 / ETH (free at etherscan.io)", secret: true },
      { key: "tron_api_key", label: "TronGrid API key (optional — raises TRC20 rate limits)", secret: true },
      { key: "instructions", label: "Extra instructions (optional)", multiline: true },
    ],
    requires: [["usdt_trc20"], ["usdt_erc20"], ["usdt_bep20"], ["usdc_erc20"], ["btc"], ["eth"], ["sol"]] },
  { id: "manual", label: "Bank transfer (BNI / local bank)", methods: "Transfer to our bank account, confirmed by our team within 1 business day", currency: "IDR", confirmation: "admin", envs: ["live"],
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

export interface GatewaySetting {
  active: boolean;              // offered at checkout
  mode: PayEnv;                 // which credential set checkout uses
  live: Record<string, string>;
  sandbox: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
}
export interface PaymentSettings { gateways: Partial<Record<GatewayId, GatewaySetting>>; updatedAt?: string; updatedBy?: string }

export function gatewayInfo(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((g) => g.id === id);
}

export function isConfigured(g: GatewayInfo, creds: Record<string, string> | undefined): boolean {
  if (!creds) return false;
  return g.requires.some((group) => group.every((k) => String(creds[k] || "").trim()));
}

/** A value whose prefix belongs to the OTHER environment ("" = fine). */
export function prefixProblem(g: GatewayInfo, env: PayEnv, creds: Record<string, string>): string {
  for (const f of g.fields) {
    const v = String(creds[f.key] || "");
    const want = f.prefix?.[env];
    if (!v || !want || want.some((p) => v.startsWith(p))) continue;
    const other: PayEnv = env === "live" ? "sandbox" : "live";
    const isOther = (f.prefix?.[other] || []).some((p) => v.startsWith(p));
    return isOther
      ? `${f.label}: this is a ${other} key — paste it under ${other === "live" ? "Live" : "Sandbox"}.`
      : `${f.label}: a ${env === "live" ? "Live" : "Sandbox"} key starts with ${want.join(" or ")}.`;
  }
  return "";
}

/** Settings written before v3.2.1 had one credential set (+ a test flag): file it under the right environment. */
function normalize(g: GatewayInfo, raw: any): GatewaySetting {
  if (raw && (raw.live || raw.sandbox)) {
    return { active: !!raw.active, mode: isPayEnv(raw.mode) && g.envs.includes(raw.mode) ? raw.mode : "live",
             live: { ...(raw.live || {}) }, sandbox: g.envs.includes("sandbox") ? { ...(raw.sandbox || {}) } : {}, updatedAt: raw.updatedAt, updatedBy: raw.updatedBy };
  }
  const creds: Record<string, string> = { ...(raw?.creds || {}) };
  let env: PayEnv = "live";
  if (g.envs.includes("sandbox")) {
    const k = String(creds.secret_key || creds.server_key || "");
    if (raw?.testMode || String(creds.mode || "").toLowerCase() === "sandbox" || /^(sk_test_|rk_test_|xnd_development_|SB-Mid-)/.test(k)
        || (g.id === "midtrans" && String(creds.is_production).toLowerCase() !== "true")) env = "sandbox";
  }
  delete creds.mode; delete creds.is_production;          // replaced by the environment itself
  return { active: !!raw?.active, mode: env, live: env === "live" ? creds : {}, sandbox: env === "sandbox" ? creds : {}, updatedAt: raw?.updatedAt };
}

export function gatewaySetting(s: PaymentSettings, id: GatewayId): GatewaySetting {
  const g = gatewayInfo(id)!;
  return normalize(g, s.gateways[id]);
}

export async function paymentSettings(opts: { fresh?: boolean } = {}): Promise<PaymentSettings> {
  const s = await readSecure<PaymentSettings>(undefined, "payments", { gateways: {} }, opts);
  const gateways: PaymentSettings["gateways"] = {};
  for (const g of GATEWAYS) if (s.gateways?.[g.id]) gateways[g.id] = normalize(g, s.gateways[g.id]);
  return { ...s, gateways };
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
    for (const f of [...g.fields, { key: "mode" }, { key: "is_production" }]) if (creds[f.key]) kept[f.key] = String(creds[f.key]);
    const st = normalize(g, { active: !!r.is_active, testMode: !!r.is_test_mode, creds: kept });
    st.active = st.active && isConfigured(g, st[st.mode]);
    settings.gateways[g.id] = { ...st, updatedAt: now() };
  }
  await savePaymentSettings(settings);
  if (email?.api_key && !(await getR2().head("secure/email.json.enc"))) await writeSecure(undefined, "email", email);
  return Object.keys(settings.gateways).length;
}

/** Marker on the credentials handed to providers: which environment they belong to. */
export const ENV_KEY = "__env";

/** Credentials of an environment if it is configured (else null) — for webhooks and returns of orders in that environment. */
export async function gatewayCredsFor(id: GatewayId, env: PayEnv): Promise<Record<string, string> | null> {
  const g = gatewayInfo(id);
  if (!g || !g.envs.includes(env)) return null;
  try {
    const st = gatewaySetting(await paymentSettings({ fresh: true }), id);
    return isConfigured(g, st[env]) ? { ...st[env], [ENV_KEY]: env } : null;
  } catch {
    return null;
  }
}

/** Every configured environment of a gateway (webhooks verify against each, then check the order's environment). */
export async function gatewayCredsAll(id: GatewayId): Promise<Record<string, string>[]> {
  const out: Record<string, string>[] = [];
  for (const env of PAY_ENVS) {
    const c = await gatewayCredsFor(id, env);
    if (c) out.push(c);
  }
  return out;
}

/** Credentials checkout uses: the gateway must be offered and its chosen environment configured. `_db` kept for call-site compatibility. */
export async function gatewayCreds(_db: any, id: GatewayId): Promise<Record<string, string> | null> {
  const g = gatewayInfo(id);
  if (!g) return null;
  try {
    const st = gatewaySetting(await paymentSettings({ fresh: true }), id);
    if (!st.active || !isConfigured(g, st[st.mode])) return null;
    return { ...st[st.mode], [ENV_KEY]: st.mode };
  } catch {
    return null;
  }
}

/** Gateways a customer can use right now (offered + configured), with the environment in use.
 * `fresh` for checkout: an admin's switch shows up at once (route bundles don't share the read cache). */
export async function activeGateways(_db: any, opts: { fresh?: boolean } = {}): Promise<(GatewayInfo & { mode: PayEnv })[]> {
  try {
    const s = await paymentSettings(opts);
    return GATEWAYS.flatMap((g) => {
      const st = s.gateways[g.id];
      return st?.active && isConfigured(g, st[st.mode]) ? [{ ...g, mode: st.mode }] : [];
    });
  } catch {
    return [];
  }
}

/** Every stored secret value (support AI redaction). */
export async function allPaymentSecrets(): Promise<string[]> {
  const s = await paymentSettings();
  return Object.values(s.gateways).flatMap((st) => [...Object.values(st?.live || {}), ...Object.values(st?.sandbox || {})]).map(String);
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
