/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * INVESTOR ROUND — AXTO only: storage (setting "invest_offer", the
 * investors and investor_payouts collections, paid AXTO revenue). The terms, the
 * share formula and the statement are pure and live in lib/invest-terms.ts.
 * ============================================================================ */
import { newId, now } from "./db";
import type { Data } from "./data";
import type { InvestorDoc } from "./data/schema";
import { INVEST_DEFAULTS, INVEST_KEY, buildStatement, sanitizeInvest, type InvestOffer, type Investor, type Payout, type Statement } from "./invest-terms";

export * from "./invest-terms";

const cents = (n: number) => Math.round(n * 100) / 100;


export async function getInvest(db: Data): Promise<InvestOffer> {
  try {
    const raw = await db.config.get(INVEST_KEY);
    return raw ? sanitizeInvest(JSON.parse(raw)) : { ...INVEST_DEFAULTS };
  } catch {
    return { ...INVEST_DEFAULTS };
  }
}

/** §26.4: is the round shown on the public site? (Shown by default; any read error counts as hidden.) */
export const investVisible = async (db: Data): Promise<boolean> => (await getInvest(db).catch(() => INVEST_DEFAULTS)).visible === true;

/** Does this e-mail have any investor record (applied, verified, …)? One index list, no document reads. */
export async function hasInvestorRecord(db: Data, email: string): Promise<boolean> {
  if (!email) return false;
  const page = await db.investors.list("email", email.trim().toLowerCase(), { limit: 1 }).catch(() => null);
  return !!page?.entries.length;
}

export async function saveInvest(db: Data, s: InvestOffer): Promise<void> {
  await db.config.set(INVEST_KEY, JSON.stringify({ ...s, updatedAt: now() }));
}

/** Paid orders in the order they were paid, read from the "paid" index summaries (no document reads). */
export async function paidOrders(db: Data): Promise<{ plan: string; amount_usd: number; paid_at: string; sandbox: number }[]> {
  const out: { plan: string; amount_usd: number; paid_at: string; sandbox: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await db.orders.list("paid", "all", { cursor, limit: 1000 });
    for (const e of page.entries) out.push({ plan: String(e.meta.plan || ""), amount_usd: Number(e.meta.amount_usd) || 0, paid_at: String(e.meta.paid_at || ""), sandbox: Number(e.meta.sandbox) || 0 });
    cursor = page.cursor;
  } while (cursor);
  return out;
}

/** Paid AXTO revenue since a moment (ISO), oldest first — amounts and times only. Test money, investment and acquisition never count. */
export async function revenueSince(db: Data, sinceIso: string): Promise<{ at: string; amountUsd: number }[]> {
  return (await paidOrders(db))
    .filter((o) => o.paid_at && o.paid_at >= sinceIso && o.plan !== "investment" && o.plan !== "acquisition" && !o.sandbox && o.amount_usd > 0)
    .map((o) => ({ at: o.paid_at, amountUsd: o.amount_usd }));
}

export async function applyInvestor(db: Data, a: { userId?: string; name: string; email: string; company?: string; country?: string; pledgeUsd: number; method: string; lang: string; message?: string }): Promise<string> {
  const id = newId("inv");
  await db.investors.create({
    id, user_id: a.userId || "", name: a.name.slice(0, 120), email: a.email, company: (a.company || "").slice(0, 160), country: (a.country || "").slice(0, 80),
    pledge_usd: Math.round(a.pledgeUsd), capital_usd: 0, method: a.method, status: "applied", lang: a.lang, message: (a.message || "").slice(0, 5000),
    note: "", created_at: now(), verified_at: "", verified_by: "", returned_at: "",
  });
  return id;
}

const asInvestor = (d: InvestorDoc) => d as unknown as Investor;
export const listInvestors = async (db: Data) => (await db.investors.listAllDocs("all", "all", 500)).map(asInvestor);
export const getInvestor = async (db: Data, id: string) => { const d = await db.investors.get(id); return d ? asInvestor(d) : null; };
export const investorsByEmail = async (db: Data, email: string) =>
  (await db.investors.listAllDocs("email", email.trim().toLowerCase())).filter((i) => i.status === "verified" || i.status === "returned").map(asInvestor);

export async function raisedUsd(db: Data): Promise<number> {
  const verified = await db.investors.listAllDocs("status", "verified");
  return verified.reduce((a, i) => a + (Number(i.capital_usd) || 0), 0);
}

export async function verifyInvestor(db: Data, id: string, capitalUsd: number, method: string, by: string): Promise<void> {
  await db.investors.update(id, (i) => (i.status === "applied" ? { ...i, status: "verified", capital_usd: Math.round(capitalUsd), method, verified_at: now(), verified_by: by } : null));
}

export async function closeInvestor(db: Data, id: string, status: "declined" | "returned", note: string, by: string): Promise<void> {
  await db.investors.update(id, (i) => ({
    ...i, status, note: note.slice(0, 2000), returned_at: status === "returned" ? now() : i.returned_at, verified_by: i.verified_by || by,
  }));
}

export async function recordPayout(db: Data, investorId: string, period: string, amountUsd: number, reference: string, by: string): Promise<void> {
  await db.investorPayouts.create({ id: newId("ipo"), investor_id: investorId, period, amount_usd: cents(amountUsd), reference: reference.slice(0, 200), paid_at: now(), created_by: by });
}

export const listPayouts = async (db: Data, investorId: string) => (await db.investorPayouts.listAllDocs("investor", investorId)) as unknown as Payout[];

export async function statementFor(db: Data, inv: Investor, offer: InvestOffer): Promise<Statement> {
  const revenue = inv.verified_at ? await revenueSince(db, inv.verified_at) : [];
  return buildStatement(inv, offer, revenue, await listPayouts(db, inv.id));
}
