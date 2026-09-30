/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Lifetime (perpetual, OFFLINE) self-hosted licences — the single source of
 * truth for prices, payment rules and the activation-file format.
 *
 * One-time payment, no subscription, no connection to axto.io after
 * activation. Each device gets an Ed25519-signed `.axto-license` file bound to
 * ONE app and ONE machine id; the engine verifies it locally (air-gapped).
 * The device limit (1–100) applies per app. Enterprise deals may still be
 * negotiated by a person through Support — never by the AI.
 * ============================================================================ */
import { SELF_HOSTED_SLUGS } from "./selfhosted";

export type LifetimeScope = "app" | "suite";

export interface LifetimeTier { devices: number; label: string; app: number; suite: number }

/** Default list prices in USD. `app` = one self-hosted app, `suite` = all 10 apps. */
export const LIFETIME_TIERS: LifetimeTier[] = [
  { devices: 1,   label: "1 device",      app: 24_900,    suite: 149_000 },
  { devices: 5,   label: "up to 5",       app: 99_000,    suite: 590_000 },
  { devices: 10,  label: "up to 10",      app: 179_000,   suite: 990_000 },
  { devices: 25,  label: "up to 25",      app: 390_000,   suite: 1_990_000 },
  { devices: 50,  label: "up to 50",      app: 690_000,   suite: 3_490_000 },
  { devices: 100, label: "up to 100",     app: 1_190_000, suite: 5_900_000 },
];

export const LIFETIME_INCLUDES = [
  "Top-tier features of the chosen app(s), forever, for the purchased major version",
  "Works fully offline — Ed25519-signed activation file per device, no calls to axto.io",
  "12 months of updates included",
  "AXTO Setup for Windows, Linux and macOS, plus Docker images (x86-64 and ARM64)",
  "Payment by bank/wire transfer (invoice), crypto, or card",
];

/** Major version a licence sold today covers; engines newer than this refuse the file. */
export const LIFETIME_MAJOR = 3;
/** Months of new builds (downloads) included from the purchase date. */
export const UPDATE_MONTHS = 12;
/** Stripe's per-charge ceiling. Above it, card is not offered — wire or crypto only. */
export const CARD_MAX_USD = 999_999;
/** Gateways that can carry a lifetime amount (IDR wallets / QRIS and PayPal cap far lower). */
export const LIFETIME_GATEWAYS = ["manual", "crypto", "nowpayments", "stripe"] as const;
export const ACTIVATION_FORMAT = "axto-lifetime-1";

export const isScope = (x: unknown): x is LifetimeScope => x === "app" || x === "suite";

/** Merge the admin override (platform_config.lifetime_prices) over the defaults, ignoring junk. */
export function mergeLifetimePrices(overrideJson: string | null | undefined): LifetimeTier[] {
  const tiers = LIFETIME_TIERS.map((t) => ({ ...t }));
  if (!overrideJson) return tiers;
  try {
    const o = JSON.parse(overrideJson);
    for (const t of tiers) {
      const r = Array.isArray(o) ? o.find((x: any) => Number(x?.devices) === t.devices) : null;
      const app = Number(r?.app), suite = Number(r?.suite);
      if (Number.isFinite(app) && app > 0) t.app = Math.round(app);
      if (Number.isFinite(suite) && suite > 0) t.suite = Math.round(suite);
    }
  } catch {}
  return tiers;
}

export async function getLifetimePrices(db: any): Promise<LifetimeTier[]> {
  try {
    const row = await db.prepare(`SELECT value FROM platform_config WHERE key = 'lifetime_prices'`).first();
    return mergeLifetimePrices(row?.value);
  } catch {
    return mergeLifetimePrices(null);
  }
}

/** Price for a device count (rounded UP to the next tier). null = more than 100 devices. */
export function lifetimePrice(devices: number, scope: LifetimeScope, tiers: LifetimeTier[] = LIFETIME_TIERS): number | null {
  if (!Number.isInteger(devices) || devices < 1) return null;
  const t = tiers.find((x) => devices <= x.devices);
  return t ? t[scope] : null;
}

/** The tier a device count is billed at — the licence is issued for the tier's full device count. */
export function tierFor(devices: number, tiers: LifetimeTier[] = LIFETIME_TIERS): LifetimeTier | null {
  return Number.isInteger(devices) && devices >= 1 ? tiers.find((x) => devices <= x.devices) || null : null;
}

export function gatewayAllowed(gateway: string, amountUsd: number): boolean {
  if (!(LIFETIME_GATEWAYS as readonly string[]).includes(gateway)) return false;
  return gateway !== "stripe" || amountUsd <= CARD_MAX_USD;
}

/** Apps a licence covers. */
export function productsOf(lic: { scope: string; product: string }): string[] {
  return lic.scope === "suite" ? [...SELF_HOSTED_SLUGS] : SELF_HOSTED_SLUGS.includes(lic.product) ? [lic.product] : [];
}

/** AXTO Setup credential of a lifetime licence (see cf-migrations/0059). */
export const INSTALL_KEY_RE = /^LIFE-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/;
export const isInstallKey = (k: string) => INSTALL_KEY_RE.test(k);
export function newInstallKey(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `LIFE-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24)}`;
}

export function newLicenseId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `LT-${hex}`;
}

/** Installation ids every engine persists: 32 lowercase hex characters. */
export const isMachineId = (x: unknown): x is string => typeof x === "string" && /^[0-9a-f]{32}$/.test(x);

export interface ActivationFields {
  licenseId: string; product: string; machineId: string; scope: LifetimeScope;
  devices: number; major: number; updatesUntil: string; issuedAt: string;
  entitlements: string;           // "package=…;k=v;…" from lib/entitlements (signed, top tier)
}

/**
 * Canonical signed payload of a `.axto-license` file. Field order must match
 * OFFLINE_FIELDS in every engine's license.py byte for byte:
 *   format|license_id|product|machine_id|scope|devices|major|updates_until|issued_at|entitlements
 */
export function activationPayload(f: ActivationFields): string {
  const clean = (v: string | number) => String(v).replace(/[|\r\n]/g, "");
  return [ACTIVATION_FORMAT, f.licenseId, f.product, f.machineId, f.scope, f.devices, f.major, f.updatesUntil.slice(0, 10), f.issuedAt, f.entitlements]
    .map(clean).join("|");
}

/** The `.axto-license` file body (JSON) — `customer` is informational only, never trusted. */
export function activationFile(payload: string, signature: string, customer: string): string {
  return JSON.stringify({ format: ACTIVATION_FORMAT, payload, signature, customer }, null, 2) + "\n";
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
