/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * INVESTOR ROUND — AXTO only: storage (platform_config "invest_offer", the
 * investors and investor_payouts tables, paid AXTO revenue). The terms, the
 * share formula and the statement are pure and live in lib/invest-terms.ts.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, newId, now } from "./db";
import { INVEST_DEFAULTS, INVEST_KEY, buildStatement, sanitizeInvest, type InvestOffer, type Investor, type Payout, type Statement } from "./invest-terms";

export * from "./invest-terms";

const cents = (n: number) => Math.round(n * 100) / 100;


export async function getInvest(db: any): Promise<InvestOffer> {
  try {
    const row = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = ?`, [INVEST_KEY]);
    return row?.value ? sanitizeInvest(JSON.parse(row.value)) : { ...INVEST_DEFAULTS };
  } catch {
    return { ...INVEST_DEFAULTS };
  }
}

export async function saveInvest(db: any, s: InvestOffer): Promise<void> {
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [INVEST_KEY, JSON.stringify({ ...s, updatedAt: now() }), now()]);
}

/** Paid AXTO revenue since a moment (ISO), oldest first — amounts and times only. */
export async function revenueSince(db: any, sinceIso: string): Promise<{ at: string; amountUsd: number }[]> {
  const rows = await dbQuery<{ at: string; amount: number }>(db,
    `SELECT paid_at AS at, amount_usd AS amount FROM orders
      WHERE status = 'paid' AND paid_at != '' AND paid_at >= ?
        AND plan NOT IN ('investment', 'acquisition')
        AND COALESCE(json_extract(meta, '$.env'), 'live') != 'sandbox'
      ORDER BY paid_at`, [sinceIso]);
  return rows.filter((r) => Number(r.amount) > 0).map((r) => ({ at: r.at, amountUsd: Number(r.amount) }));
}

export async function applyInvestor(db: any, a: { userId?: string; name: string; email: string; company?: string; country?: string; pledgeUsd: number; method: string; lang: string; message?: string }): Promise<string> {
  const id = newId("inv");
  await dbRun(db, `INSERT INTO investors (id, user_id, name, email, company, country, pledge_usd, method, status, lang, message, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?)`,
    [id, a.userId || "", a.name.slice(0, 120), a.email, (a.company || "").slice(0, 160), (a.country || "").slice(0, 80), Math.round(a.pledgeUsd), a.method, a.lang, (a.message || "").slice(0, 5000), now()]);
  return id;
}

export const listInvestors = (db: any) => dbQuery<Investor>(db, `SELECT * FROM investors ORDER BY created_at DESC LIMIT 500`);
export const getInvestor = (db: any, id: string) => dbFirst<Investor>(db, `SELECT * FROM investors WHERE id = ?`, [id]);
export const investorsByEmail = (db: any, email: string) =>
  dbQuery<Investor>(db, `SELECT * FROM investors WHERE email = ? AND status IN ('verified', 'returned') ORDER BY verified_at DESC`, [email]);

export async function raisedUsd(db: any): Promise<number> {
  const r = await dbFirst<{ total: number }>(db, `SELECT COALESCE(SUM(capital_usd), 0) AS total FROM investors WHERE status = 'verified'`);
  return Number(r?.total || 0);
}

export async function verifyInvestor(db: any, id: string, capitalUsd: number, method: string, by: string): Promise<void> {
  await dbRun(db, `UPDATE investors SET status = 'verified', capital_usd = ?, method = ?, verified_at = ?, verified_by = ? WHERE id = ? AND status = 'applied'`,
    [Math.round(capitalUsd), method, now(), by, id]);
}

export async function closeInvestor(db: any, id: string, status: "declined" | "returned", note: string, by: string): Promise<void> {
  await dbRun(db, `UPDATE investors SET status = ?, note = ?, returned_at = CASE WHEN ? = 'returned' THEN ? ELSE returned_at END,
                     verified_by = CASE WHEN verified_by = '' THEN ? ELSE verified_by END WHERE id = ?`,
    [status, note.slice(0, 2000), status, now(), by, id]);
}

export async function recordPayout(db: any, investorId: string, period: string, amountUsd: number, reference: string, by: string): Promise<void> {
  await dbRun(db, `INSERT INTO investor_payouts (id, investor_id, period, amount_usd, reference, paid_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId("ipo"), investorId, period, cents(amountUsd), reference.slice(0, 200), now(), by]);
}

export const listPayouts = (db: any, investorId: string) =>
  dbQuery<Payout>(db, `SELECT * FROM investor_payouts WHERE investor_id = ? ORDER BY period, paid_at`, [investorId]);

export async function statementFor(db: any, inv: Investor, offer: InvestOffer): Promise<Statement> {
  const revenue = inv.verified_at ? await revenueSince(db, inv.verified_at) : [];
  return buildStatement(inv, offer, revenue, await listPayouts(db, inv.id));
}
