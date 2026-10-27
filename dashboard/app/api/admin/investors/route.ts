/* AXTO — /api/admin/investors · Admin → Investors (the AXTO-only round)
 *   GET → the round's terms, every application, and for each verified stake its
 *         month-by-month statement (revenue, share due, paid, still open)
 *   PUT {settings} → status (open / paused / closed), round, minimum ticket,
 *         revenue pool and the WhatsApp number given to applicants
 *   PUT {visible}  → show or hide the whole round on axto.io (§26.4, hidden by
 *         default): footer link, sitemap entry, /invest, the public API,
 *         applications and the member menu item. Its own audit entry.
 *   POST {action, id, …}
 *         verify   {capital, method} → capital received; the revenue share starts now
 *         decline  {note}            → an application that does not go ahead
 *         returned {note}            → capital returned (the acquisition); the share ends
 *         payout   {period, amount, reference} → a monthly payment, recorded */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit, str } from "@/lib/http";
import {
  INVEST_DEFAULTS, buildStatement, closeInvestor, getInvest, getInvestor, listInvestors, recordPayout, revenueSince, saveInvest, sanitizeInvest, verifyInvestor,
  raisedUsd, type Investor, type Payout,
} from "@/lib/invest";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const [settings, investors, raised, payouts] = await Promise.all([
    getInvest(db), listInvestors(db), raisedUsd(db),
    db.investorPayouts.listAllDocs("all", "all", 20_000) as Promise<Payout[]>,
  ]);
  const stakes = investors.filter((i) => i.verified_at);
  const since = stakes.map((i) => i.verified_at).sort()[0];
  const revenue = since ? await revenueSince(db, since) : [];
  return respond({
    settings, defaults: INVEST_DEFAULTS, raisedUsd: raised,
    investors: investors.map((i: Investor) => {
      const own = payouts.filter((p) => p.investor_id === i.id);
      return { ...i, payouts: own, statement: i.verified_at ? buildStatement(i, settings, revenue, own) : null };
    }),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  const current = await getInvest(db);
  if (!b?.settings && typeof b?.visible === "boolean") {
    const next = { ...current, visible: b.visible };
    await saveInvest(db, next);
    await audit(db, ctx.session, "admin.invest_visibility", "platform_config", "invest_offer", { visible: next.visible, was: current.visible }, req);
    return respond({ ok: true, settings: next }, ctx);
  }
  if (!b?.settings) return fail("Nothing to save.");
  // Showing or hiding the round is its own action (above), never a side effect of saving the terms.
  const next = { ...sanitizeInvest(b.settings, current), visible: current.visible };
  await saveInvest(db, next);
  await audit(db, ctx.session, "admin.invest_offer", "platform_config", "invest_offer", { status: next.status, targetUsd: next.targetUsd, minUsd: next.minUsd, poolPct: next.poolPct }, req);
  return respond({ ok: true, settings: next }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  const inv = await getInvestor(db, str(b?.id, 64));
  if (!inv) return fail("Investor not found.", 404);
  const by = ctx.session.email;
  switch (b?.action) {
    case "verify": {
      if (inv.status !== "applied") return fail("Only an open application can be verified.");
      const capital = Math.round(Number(String(b?.capital ?? "").replace(/[^\d.]/g, "")) || 0);
      if (capital < 1) return fail("Enter the capital received, in US dollars.");
      const method = b?.method === "paypal" ? "paypal" : "wire";
      await verifyInvestor(db, inv.id, capital, method, by);
      await audit(db, ctx.session, "admin.investor.verify", "investor", inv.id, { capitalUsd: capital, method }, req);
      return respond({ ok: true }, ctx);
    }
    case "decline":
    case "returned": {
      if (b.action === "decline" && inv.status !== "applied") return fail("Only an open application can be declined.");
      if (b.action === "returned" && inv.status !== "verified") return fail("Only a verified stake can be marked as returned.");
      const status = b.action === "decline" ? "declined" : "returned";
      await closeInvestor(db, inv.id, status, str(b?.note, 2000), by);
      await audit(db, ctx.session, `admin.investor.${status}`, "investor", inv.id, { note: str(b?.note, 200) }, req);
      return respond({ ok: true }, ctx);
    }
    case "payout": {
      if (!inv.verified_at) return fail("Payouts are recorded for verified stakes only.");
      const period = str(b?.period, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return fail("Choose the month the payment is for (YYYY-MM).");
      const amount = Number(String(b?.amount ?? "").replace(/[^\d.]/g, ""));
      if (!(amount > 0)) return fail("Enter the amount paid, in US dollars.");
      await recordPayout(db, inv.id, period, amount, str(b?.reference, 200), by);
      await audit(db, ctx.session, "admin.investor.payout", "investor", inv.id, { period, amountUsd: amount }, req);
      return respond({ ok: true }, ctx);
    }
    default:
      return fail("Unknown action.");
  }
}
