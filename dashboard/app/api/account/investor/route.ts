/* AXTO — GET /api/account/investor · the signed-in member's investment in AXTO:
 * every verified stake under their e-mail, with its month-by-month statement
 * (paid AXTO revenue, their share, paid, still open). Amounts and months only —
 * never a customer, an order or another investor. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, respond, unauthorized } from "@/lib/auth";
import { getInvest, investorsByEmail, statementFor } from "@/lib/invest";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const db = getData(req);
  const [offer, stakes] = await Promise.all([getInvest(db), investorsByEmail(db, ctx.session.email)]);
  return respond({
    email: ctx.session.email,
    offer: { poolPct: offer.poolPct, targetUsd: offer.targetUsd, status: offer.status, visible: offer.visible },
    stakes: await Promise.all(stakes.map(async (i) => ({
      id: i.id, status: i.status, capitalUsd: i.capital_usd, verifiedAt: i.verified_at, returnedAt: i.returned_at,
      statement: await statementFor(db, i, offer),
    }))),
  }, ctx);
}
