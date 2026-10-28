/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SITE ACQUISITION — the whole of AXTO (domain, code, apps, accounts, brand)
 * offered for sale on /acquire, paid through the same gateways as every other
 * order. When the payment is VERIFIED (webhook, PayPal capture, on-chain
 * confirmation, or an admin marking a bank wire as received) the buyer's
 * account is made an administrator automatically and the owner is notified;
 * the transfer of external accounts (domain registrar, Cloudflare, GitHub,
 * payment providers) is then completed together (checklist on /acquire).
 *
 * Since 28 Oct 2026 (owner, REQUESTS 120; docs/BLUEPRINT-V4.md §34) the sale runs
 * as an AUCTION by default: rounds with a random opening bid between US$10M and
 * US$100M, real bids and a real deadline (lib/sale-auction.ts); the winner pays
 * the winning bid through this same checkout. "fixed" keeps the asking price.
 *
 * Settings live in the setting "site_sale" (Admin → Site sale). The bank
 * accounts below are the owner's public BNI receiving accounts (the same ones
 * published on ulyah.com); the admin can change every value.
 * ============================================================================ */
import { now } from "./db";
import type { Data } from "./data";
import { SALE_AUCTION_DEFAULTS, sanitizeSaleAuction, type SaleAuctionSettings } from "./sale-auction-terms";

export const SALE_KEY = "site_sale";
export const DEFAULT_PRICE_USD = 10_000_000;
/** Gateways that may carry the sale, in the order buyers see them (PayPal first). */
export const SALE_GATEWAYS = ["paypal", "nowpayments", "crypto", "manual", "stripe"] as const;
export type SaleGateway = (typeof SALE_GATEWAYS)[number];
/** PayPal limits a single payment (typically $10,000 – $60,000 depending on the payer's account). */
export const PAYPAL_TYPICAL_MAX_USD = 60_000;
export const STRIPE_MAX_USD = 999_999;

export interface BankAccount { currency: string; number: string }
export type SaleMode = "auction" | "fixed";
export interface SaleSettings {
  status: "open" | "paused" | "sold";
  /** "auction" (owner, 28 Oct 2026): rounds, bids, the winner pays; "fixed": anyone pays `priceUsd`. */
  mode: SaleMode;
  auction: SaleAuctionSettings;
  priceUsd: number;
  autoGrantAdmin: boolean;          // make the buyer an admin the moment the payment is verified
  gateways: SaleGateway[];          // offered on /acquire (each must also be active in Admin → Payments)
  whatsapp: string;                 // for payment proof and handover coordination
  bank: { name: string; holder: string; swift: string; code: string; branch: string; accounts: BankAccount[] };
  soldTo?: { userId: string; email: string; orderId: string; paidAt: string; company?: string };
  updatedAt?: string;
}

export const SALE_DEFAULTS: SaleSettings = {
  status: "open",
  mode: "auction",
  auction: { ...SALE_AUCTION_DEFAULTS },
  priceUsd: DEFAULT_PRICE_USD,
  autoGrantAdmin: true,
  gateways: [...SALE_GATEWAYS],
  whatsapp: "+6285691234561",
  bank: {
    name: "BNI (Bank Negara Indonesia) — wondr by BNI multicurrency",
    holder: "YUSRON EFENDI",
    swift: "BNINIDJA",
    code: "009",
    branch: "",
    accounts: [
      { currency: "USD", number: "2090571495" },
      { currency: "IDR", number: "2090571484" },
      { currency: "EUR", number: "2090571542" },
      { currency: "SGD", number: "2090571508" },
      { currency: "GBP", number: "2090571520" },
      { currency: "AUD", number: "2090571519" },
      { currency: "JPY", number: "2090571564" },
      { currency: "CNY", number: "2090571531" },
      { currency: "HKD", number: "2090571553" },
      { currency: "MYR", number: "2090571575" },
      { currency: "SAR", number: "2090571586" },
      { currency: "KRW", number: "2090571597" },
      { currency: "THB", number: "2090571609" },
    ],
  },
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Accept stored / submitted settings and return valid ones (unknown fields dropped). */
export function sanitizeSale(v: any, base: SaleSettings = SALE_DEFAULTS): SaleSettings {
  if (!v || typeof v !== "object") return { ...base, auction: { ...base.auction } };
  const price = Number(v.priceUsd);
  const gws = Array.isArray(v.gateways) ? v.gateways.filter((g: unknown): g is SaleGateway => (SALE_GATEWAYS as readonly string[]).includes(String(g))) : base.gateways;
  const b = v.bank && typeof v.bank === "object" ? v.bank : {};
  const accounts: BankAccount[] = Array.isArray(b.accounts)
    ? b.accounts.map((a: any) => ({ currency: str(a?.currency, 10).toUpperCase(), number: str(a?.number, 40).replace(/[^\dA-Za-z-]/g, "") }))
        .filter((a: BankAccount) => /^[A-Z]{3}$/.test(a.currency) && a.number).slice(0, 30)
    : base.bank.accounts;
  return {
    status: v.status === "paused" || v.status === "sold" ? v.status : "open",
    mode: v.mode === "fixed" || v.mode === "auction" ? v.mode : base.mode,
    auction: sanitizeSaleAuction(v.auction, base.auction),
    priceUsd: Number.isFinite(price) && price >= 1000 ? Math.round(price) : base.priceUsd,
    autoGrantAdmin: typeof v.autoGrantAdmin === "boolean" ? v.autoGrantAdmin : base.autoGrantAdmin,
    gateways: Array.from(new Set(gws)),
    whatsapp: str(v.whatsapp, 30).replace(/[^\d+ ]/g, "") || base.whatsapp,
    bank: {
      name: str(b.name) || base.bank.name, holder: str(b.holder) || base.bank.holder,
      swift: str(b.swift, 11).toUpperCase() || base.bank.swift, code: str(b.code, 10) || base.bank.code,
      branch: str(b.branch), accounts,
    },
    soldTo: v.soldTo && typeof v.soldTo === "object" && typeof v.soldTo.orderId === "string" ? {
      userId: str(v.soldTo.userId, 80), email: str(v.soldTo.email), orderId: str(v.soldTo.orderId, 80), paidAt: str(v.soldTo.paidAt, 40), company: str(v.soldTo.company) || undefined,
    } : undefined,
    updatedAt: str(v.updatedAt, 40) || undefined,
  };
}

export async function getSale(db: Data): Promise<SaleSettings> {
  try {
    const raw = await db.config.get(SALE_KEY);
    return raw ? sanitizeSale(JSON.parse(raw)) : { ...SALE_DEFAULTS };
  } catch {
    return { ...SALE_DEFAULTS };
  }
}

export async function saveSale(db: Data, s: SaleSettings): Promise<void> {
  await db.config.set(SALE_KEY, JSON.stringify({ ...s, updatedAt: now() }));
}

/** Can this gateway carry this amount at all? (PayPal is offered; its own limits may still apply.) */
export function saleGatewayAllowed(s: SaleSettings, gateway: string, amountUsd: number): boolean {
  if (!(s.gateways as string[]).includes(gateway)) return false;
  if (gateway === "stripe") return amountUsd <= STRIPE_MAX_USD;
  return true;
}

/** The account a wire in `currency` should go to (USD by default). */
export function accountFor(s: SaleSettings, currency = "USD"): BankAccount | undefined {
  return s.bank.accounts.find((a) => a.currency === currency) || s.bank.accounts.find((a) => a.currency === "USD") || s.bank.accounts[0];
}

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
