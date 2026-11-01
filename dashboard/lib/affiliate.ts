/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * THE AFFILIATE PROGRAMME (docs/BUSINESS-MASTER-BLUEPRINT.md §4.1 B, §7.1, §7.4;
 * REQUESTS 131). Runs by itself:
 *
 *   join        a signed-in member accepts the terms and gets a code (?ref=<code>)
 *   click       the link remembers the code in a first-party cookie (cookieDays)
 *   sign-up     the new account is tied to that affiliate once and for all
 *   paid order  a commission is created once per order ("cm_<order>"), held for the
 *               refund window; a large one, or one from the affiliate's own network,
 *               waits for one admin look
 *   refund      the commission is reversed; one already paid is clawed back from the
 *               next payout ("cm_<order>_cb", negative)
 *   tick        held → payable after the window (re-checking the order); from the 5th
 *               of each month one payout per affiliate ("po_<affiliate>_<YYYYMM>"):
 *               PayPal Payouts by itself when enabled, otherwise one owner approval
 *
 * Everything lives in R2: create-once ids make every step idempotent, compare-and-swap
 * updates make races harmless. Payout destinations are stored encrypted.
 * ============================================================================ */
import type { Data } from "./data";
import type { AffiliateDoc, AffPayoutDoc, CommissionDoc, OrderDoc, ReferralDoc } from "./data/schema";
import { ConflictError } from "./r2/store";
import { readMeta } from "./data/meta";
import { getPrograms, isOpen, type Programs } from "./programs";

export const AFF_TERMS_VERSION = "2026-10-29";
export const REF_COOKIE = "axto_ref";
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Orders that never earn a commission: the sale of the site itself, an investor's capital. */
const EXCLUDED_PLANS = new Set(["acquisition", "invest"]);
/** Orders that earn the partner-fee rate (built with the reseller and white-label phases). */
const PARTNER_FEE_PLANS = new Set(["reseller", "whitelabel"]);

/* ---- small rules ------------------------------------------------------------------ */

/** A referral code: 4–16 of a–z and 0–9. */
export const isCode = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{4,16}$/.test(v);

/** One mailbox, however it is written: case, "+tags", and the dots Gmail ignores. */
export function mailbox(email: string): string {
  const [user = "", domain = ""] = email.trim().toLowerCase().split("@");
  const base = user.split("+")[0]!;
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  return `${d === "gmail.com" ? base.replace(/\./g, "") : base}@${d}`;
}

/** A stable, non-reversible fingerprint of a network address (the address itself is never stored). */
export async function netHash(ip: string): Promise<string> {
  if (!ip) return "";
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`axto-aff|${ip}`)));
  return [...h.slice(0, 10)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const B32 = "abcdefghjkmnpqrstuvwxyz23456789";
function newCode(name: string): string {
  const base = (name || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "").slice(0, 7) || "ref";
  const r = crypto.getRandomValues(new Uint8Array(4));
  return base + [...r].map((b) => B32[b % B32.length]).join("");
}

/* ---- payout destinations ---------------------------------------------------------- */

export type PayoutMethod = "paypal" | "usdt" | "wire";
export interface PayoutInput {
  method?: unknown; paypalEmail?: unknown; usdtAddress?: unknown;
  bankName?: unknown; bankHolder?: unknown; bankAccount?: unknown; bankSwift?: unknown; bankCountry?: unknown;
}
export type PayoutDetails =
  | { method: "paypal"; email: string }
  | { method: "usdt"; network: "TRC20"; address: string }
  | { method: "wire"; bank: string; holder: string; account: string; swift: string; country: string };

const s = (v: unknown, max = 120) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function payoutDetails(i: PayoutInput): PayoutDetails | { error: string } {
  if (i.method === "paypal") {
    const email = s(i.paypalEmail, 160).toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? { method: "paypal", email } : { error: "Enter the e-mail address of your PayPal account." };
  }
  if (i.method === "usdt") {
    const address = s(i.usdtAddress, 64);
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) ? { method: "usdt", network: "TRC20", address } : { error: "Enter a USDT address on TRC20 (it starts with T and has 34 characters)." };
  }
  if (i.method === "wire") {
    const d = { bank: s(i.bankName), holder: s(i.bankHolder), account: s(i.bankAccount, 40).replace(/\s/g, ""), swift: s(i.bankSwift, 11).toUpperCase(), country: s(i.bankCountry, 60) };
    if (!d.bank || !d.holder || !/^[A-Z0-9]{6,34}$/i.test(d.account) || !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(d.swift) || !d.country) {
      return { error: "Enter the bank, the account holder, the account number or IBAN, the SWIFT/BIC code and the country." };
    }
    return { method: "wire", ...d };
  }
  return { error: "Choose how you want to be paid." };
}

/** What may be shown back: enough to recognise the destination, never enough to use it. */
export function payoutLabel(d: PayoutDetails): string {
  if (d.method === "paypal") { const [u = "", dom = ""] = d.email.split("@"); return `PayPal ${u.slice(0, 1)}•••@${dom}`; }
  if (d.method === "usdt") return `USDT (TRC20) ${d.address.slice(0, 4)}…${d.address.slice(-6)}`;
  return `${d.bank} ••••${d.account.slice(-4)}`;
}

/* ---- joining, clicks, sign-ups ----------------------------------------------------- */

type Member = { sub: string; email: string; name?: string; role?: string };
export type JoinError = "closed" | "admin" | "banned";

export async function joinAffiliate(db: Data, user: Member, ip: string, nowMs = Date.now(), programs?: Programs): Promise<AffiliateDoc | { error: JoinError }> {
  const existing = await db.affiliates.get(user.sub);
  if (existing) return existing.status === "banned" ? { error: "banned" } : existing;
  const p = programs ?? (await getPrograms(db));
  if (!isOpen(p, "affiliate")) return { error: "closed" };
  if (user.role === "admin") return { error: "admin" };
  const at = iso(nowMs);
  const join_ip = await netHash(ip);
  for (let i = 0; i < 6; i++) {
    const doc: AffiliateDoc = {
      id: user.sub, user_id: user.sub, email: user.email, name: user.name || "", code: newCode(user.name || user.email.split("@")[0] || ""),
      status: "active", terms_version: AFF_TERMS_VERSION, accepted_at: at, join_ip, payout_method: "", payout_enc: "", payout_label: "",
      note: "", created_at: at, updated_at: at,
    };
    try {
      if (await db.affiliates.createIfAbsent(doc)) return doc;
      const won = await db.affiliates.get(user.sub);      // a second tab joined at the same moment
      if (won) return won;
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;     // the code was taken: draw another
    }
  }
  throw new Error("Could not allocate a referral code — please try again.");
}

export async function setPayout(db: Data, userId: string, input: PayoutInput, encrypt: (name: string, v: unknown) => Promise<string>, nowMs = Date.now()): Promise<AffiliateDoc | { error: string }> {
  const d = payoutDetails(input);
  if ("error" in d) return d;
  const aff = await db.affiliates.get(userId);
  if (!aff) return { error: "Join the affiliate programme first." };
  const enc = await encrypt(`aff-payout:${userId}`, d);
  return db.affiliates.update(userId, (a) => ({ ...a, payout_method: d.method, payout_enc: enc, payout_label: payoutLabel(d), updated_at: iso(nowMs) }));
}

const dayKey = (ms: number) => iso(ms).slice(0, 10).replace(/-/g, "");

/** A click on a referral link: one append-only record (no counter to fight over). True when the code is live. */
export async function recordClick(db: Data, code: unknown, ip: string, nowMs = Date.now()): Promise<AffiliateDoc | null> {
  if (!isCode(code)) return null;
  const aff = await db.affiliates.find("code", code);
  if (!aff || aff.status !== "active") return null;
  const rand = crypto.getRandomValues(new Uint8Array(4)).reduce((x, b) => x + b.toString(16).padStart(2, "0"), "");
  await db.store.createDoc(`aff_clicks/${aff.id}/${dayKey(nowMs)}/${String(nowMs).padStart(15, "0")}-${rand}`, { ip: await netHash(ip) });
  return aff;
}

/** At sign-up: tie the new account to the affiliate whose link brought it — once, never to oneself. */
export async function attributeSignup(db: Data, newUser: { id: string; email: string }, code: unknown, ip: string, nowMs = Date.now(), programs?: Programs): Promise<ReferralDoc | null> {
  if (!isCode(code)) return null;
  const aff = await db.affiliates.find("code", code);
  if (!aff || aff.status !== "active" || aff.user_id === newUser.id || mailbox(aff.email) === mailbox(newUser.email)) return null;
  const p = programs ?? (await getPrograms(db));
  const net = await netHash(ip);
  const until = new Date(nowMs);
  until.setUTCMonth(until.getUTCMonth() + p.affiliate.months);
  const doc: ReferralDoc = {
    id: newUser.id, affiliate_id: aff.id, code, email: newUser.email, attributed_at: iso(nowMs), until: until.toISOString(), ip: net,
    flagged: net && net === aff.join_ip ? "same_network" : "", created_at: iso(nowMs),
  };
  return (await db.referrals.createIfAbsent(doc)) ? doc : null;
}

/* ---- commissions ---------------------------------------------------------------- */

/** A paid order of a referred member → its commission, created once. Called for every paid order (idempotent). */
export async function commissionForOrder(db: Data, o: OrderDoc, nowMs = Date.now(), programs?: Programs): Promise<CommissionDoc | null> {
  if (o.status !== "paid" || EXCLUDED_PLANS.has(o.plan)) return null;
  const m = readMeta(o.meta);
  if (m.env === "sandbox" || m.saleRound) return null;                 // test money and the site auction never pay
  const ref = await db.referrals.get(o.user_id);
  if (!ref) return null;
  const paidAt = Date.parse(o.paid_at || "") || nowMs;
  if (paidAt > Date.parse(ref.until)) return null;                    // the referral window is over
  const aff = await db.affiliates.get(ref.affiliate_id);
  if (!aff || aff.status !== "active") return null;
  const p = programs ?? (await getPrograms(db));
  const kind = PARTNER_FEE_PLANS.has(o.plan) ? "partner_fee" : "customer";
  const pct = kind === "partner_fee" ? p.affiliate.partnerFeePct : p.affiliate.commissionPct;
  const amount = round2((o.amount_usd * pct) / 100);
  if (amount <= 0) return null;
  const at = iso(nowMs);
  const doc: CommissionDoc = {
    id: `cm_${o.id}`, affiliate_id: aff.id, order_id: o.id, user_id: o.user_id, kind, base_usd: o.amount_usd, pct, amount_usd: amount,
    status: ref.flagged || amount >= p.affiliate.reviewAboveUsd ? "review" : "held", hold_until: iso(paidAt + p.affiliate.holdDays * DAY),
    payout_id: "", reason: ref.flagged ? `referral flagged: ${ref.flagged}` : amount >= p.affiliate.reviewAboveUsd ? "large commission" : "",
    created_at: at, updated_at: at,
  };
  return (await db.commissions.createIfAbsent(doc)) ? doc : db.commissions.get(doc.id);
}

/** A refunded order: its commission is reversed; one already paid is clawed back from the next payout. */
export async function commissionRefunded(db: Data, orderId: string, nowMs = Date.now()): Promise<"none" | "reversed" | "clawback"> {
  const c = await db.commissions.get(`cm_${orderId}`);
  if (!c || c.status === "reversed") return "none";
  const at = iso(nowMs);
  if (c.status === "paid" || (c.payout_id && (await db.affPayouts.get(c.payout_id))?.status !== "approval")) {
    // Paid, or on its way: claw it back once.
    const cb: CommissionDoc = { ...c, id: `${c.id}_cb`, kind: "clawback", amount_usd: -c.amount_usd, status: "payable", hold_until: at, payout_id: "", reason: "order refunded", created_at: at, updated_at: at };
    await db.commissions.createIfAbsent(cb);
    return "clawback";
  }
  const payoutId = c.payout_id;
  await db.commissions.update(c.id, (x) => (x.status === "reversed" ? null : { ...x, status: "reversed", payout_id: "", reason: "order refunded", updated_at: at }));
  if (payoutId) {
    // It sat in a payout still waiting for approval: that payout shrinks by it.
    await db.affPayouts.update(payoutId, (p) => (p.status !== "approval" || !p.commission_ids.includes(c.id) ? null
      : { ...p, commission_ids: p.commission_ids.filter((i) => i !== c.id), amount_usd: round2(p.amount_usd - c.amount_usd), updated_at: at }));
  }
  return "reversed";
}

/* ---- the clock ------------------------------------------------------------------ */

export interface AffiliateTickDeps {
  /** Sends a PayPal payout; absent when PayPal is not set up. */
  paypal?: (p: { id: string; email: string; amountUsd: number; note: string }) => Promise<{ batchId: string }>;
  decrypt: <T>(name: string, blob: string) => Promise<T>;
  /** Admin → Affiliates "Run payouts now": make this month's payouts before the 5th. */
  force?: boolean;
}

/** Held → payable after the refund window (the order is looked at again), then the month's payouts. */
export async function affiliateTick(db: Data, deps: AffiliateTickDeps, nowMs = Date.now()): Promise<{ matured: number; reversed: number; payouts: number; paid: number; failed: number }> {
  const out = { matured: 0, reversed: 0, payouts: 0, paid: 0, failed: 0 };
  const p = await getPrograms(db);
  const held = (await db.commissions.list("status", "held", { limit: 200 })).entries;
  for (const e of held) {
    if (String((e.meta as any).hold_until) > iso(nowMs)) break;          // sorted by hold_until: the rest are not due yet
    const c = await db.commissions.get(e.id);
    if (!c || c.status !== "held") continue;
    const order = await db.orders.get(c.order_id);
    const refunded = !order || order.status === "refunded";
    await db.commissions.update(c.id, (x) => (x.status !== "held" ? null : { ...x, status: refunded ? "reversed" : "payable", reason: refunded ? "order refunded" : x.reason, updated_at: iso(nowMs) }));
    if (refunded) out.reversed += 1; else out.matured += 1;
  }
  if (p.affiliate.frozen || (!deps.force && new Date(nowMs).getUTCDate() < 5)) return out;
  const period = iso(nowMs).slice(0, 7).replace("-", "");
  const payable = await db.commissions.listAllDocs("status", "payable", 5000);
  const byAff = new Map<string, CommissionDoc[]>();
  for (const c of payable) if (!c.payout_id) byAff.set(c.affiliate_id, [...(byAff.get(c.affiliate_id) || []), c]);
  for (const [affId, list] of byAff) {
    const aff = await db.affiliates.get(affId);
    if (!aff || aff.status !== "active" || !aff.payout_method) continue;
    const total = round2(list.reduce((n, c) => n + c.amount_usd, 0));
    if (total < p.affiliate.minPayoutUsd) continue;
    const id = `po_${affId}_${period}`;
    const at = iso(nowMs);
    const auto = aff.payout_method === "paypal" && p.affiliate.paypalPayouts && !!deps.paypal;
    const doc: AffPayoutDoc = {
      id, affiliate_id: affId, period, amount_usd: total, method: aff.payout_method, label: aff.payout_label, status: auto ? "processing" : "approval",
      commission_ids: list.map((c) => c.id), reference: "", failure: "", created_at: at, paid_at: "", updated_at: at,
    };
    if (!(await db.affPayouts.createIfAbsent(doc))) continue;            // this month's payout exists already
    out.payouts += 1;
    // Lock each commission to this payout; one that changed meanwhile (reversed, locked elsewhere) leaves it.
    const locked: string[] = [];
    for (const c of list) {
      let ok = false;
      await db.commissions.update(c.id, (x) => (x.status !== "payable" || x.payout_id ? null : (ok = true, { ...x, payout_id: id, updated_at: at })));
      if (ok) locked.push(c.id);
    }
    const sum = round2(list.filter((c) => locked.includes(c.id)).reduce((n, c) => n + c.amount_usd, 0));
    if (locked.length !== list.length) await db.affPayouts.update(id, (x) => ({ ...x, commission_ids: locked, amount_usd: sum, updated_at: at }));
    if (!auto) continue;
    try {
      const d = await deps.decrypt<PayoutDetails>(`aff-payout:${affId}`, aff.payout_enc);
      if (d.method !== "paypal") throw new Error("payout destination changed");
      const r = await deps.paypal!({ id, email: d.email, amountUsd: sum, note: `AXTO affiliate commissions ${period}` });
      await markPayoutPaid(db, id, r.batchId || "paypal", "system", nowMs);
      out.paid += 1;
    } catch (err: any) {
      await failPayout(db, id, String(err?.message || err).slice(0, 300), "system", nowMs);
      out.failed += 1;
    }
  }
  return out;
}

/* ---- the owner's few touches ------------------------------------------------------ */

export async function markPayoutPaid(db: Data, payoutId: string, reference: string, by: string, nowMs = Date.now()): Promise<AffPayoutDoc | { error: string }> {
  const cur = await db.affPayouts.get(payoutId);
  if (!cur) return { error: "Payout not found." };
  if (cur.status === "paid") return cur;
  if (cur.status === "failed") return { error: "This payout failed; its commissions return to the next payout." };
  const at = iso(nowMs);
  const after = await db.affPayouts.update(payoutId, (p) => (p.status === "paid" ? null : { ...p, status: "paid", reference: reference.slice(0, 120) || by, paid_at: at, updated_at: at }));
  for (const id of after.commission_ids) await db.commissions.update(id, (c) => (c.payout_id !== payoutId || c.status === "paid" ? null : { ...c, status: "paid", updated_at: at }));
  return after;
}

/** A payout that could not be made: its commissions are released and join the next payout. */
export async function failPayout(db: Data, payoutId: string, reason: string, by: string, nowMs = Date.now()): Promise<AffPayoutDoc | { error: string }> {
  const cur = await db.affPayouts.get(payoutId);
  if (!cur) return { error: "Payout not found." };
  if (cur.status === "paid") return { error: "This payout is already paid." };
  const at = iso(nowMs);
  const after = await db.affPayouts.update(payoutId, (p) => (p.status === "paid" || p.status === "failed" ? null : { ...p, status: "failed", failure: `${reason} (${by})`.slice(0, 300), updated_at: at }));
  for (const id of cur.commission_ids) await db.commissions.update(id, (c) => (c.payout_id !== payoutId || c.status !== "payable" ? null : { ...c, payout_id: "", updated_at: at }));
  return after;
}

/** A commission that waited for a look: approved → it continues its hold; rejected → reversed. */
export async function reviewCommission(db: Data, id: string, approve: boolean, by: string, nowMs = Date.now()): Promise<CommissionDoc | { error: string }> {
  const c = await db.commissions.get(id);
  if (!c) return { error: "Commission not found." };
  if (c.status !== "review") return { error: "This commission is not waiting for review." };
  return db.commissions.update(id, (x) => (x.status !== "review" ? null : {
    ...x, status: approve ? (Date.parse(x.hold_until) <= nowMs ? "payable" : "held") : "reversed",
    reason: approve ? `approved by ${by}` : `rejected by ${by}`, updated_at: iso(nowMs),
  }));
}

export async function setAffiliateStatus(db: Data, id: string, status: AffiliateDoc["status"], note: string, nowMs = Date.now()): Promise<AffiliateDoc | { error: string }> {
  if (!(await db.affiliates.get(id))) return { error: "Affiliate not found." };
  return db.affiliates.update(id, (a) => ({ ...a, status, note: note.slice(0, 500), updated_at: iso(nowMs) }));
}

/* ---- what the affiliate sees ------------------------------------------------------ */

export async function affiliateStats(db: Data, affId: string, nowMs = Date.now()) {
  // Single documents live under "k/" (lib/r2/store.ts); one day's clicks are listed from 30 days back.
  const since = `k/aff_clicks/${affId}/${dayKey(nowMs - 30 * DAY)}`;
  const [clicks, refs, comms] = await Promise.all([
    db.store.listAllKeys(`k/aff_clicks/${affId}/`, { startAfter: since, max: 20_000 }).then((k) => k.length).catch(() => 0),
    db.referrals.list("affiliate", affId, { limit: 1000 }).then((p) => p.entries),
    db.commissions.list("affiliate", affId, { limit: 1000 }).then((p) => p.entries.map((e) => e.meta as any)),
  ]);
  const sum = (st: string) => round2(comms.filter((c) => c.status === st).reduce((n, c) => n + Number(c.amount_usd || 0), 0));
  return {
    clicks30: clicks, referrals: refs.length,
    customers: new Set(comms.filter((c) => c.kind !== "clawback" && c.status !== "reversed").map((c) => String(c.user_id))).size,
    held: round2(sum("held") + sum("review")), payable: sum("payable"), paid: sum("paid"),
  };
}
