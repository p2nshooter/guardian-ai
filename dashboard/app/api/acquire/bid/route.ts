/* AXTO — POST /api/acquire/bid {amount} · a bid in the site-sale auction
 * (docs/BLUEPRINT-V4.md §34). Signed-in, approved bidders only (admins run the
 * sale and do not bid); one compare-and-swap on the round, so two bids at the
 * same moment never both win. Every bid is binding. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { formatUsd } from "@/lib/plans";
import { latestRound, nextMinBid, placeSaleBid, publicRound, roundBids } from "@/lib/sale-auction";

const WHY: Record<string, string> = {
  admin: "Administrator accounts run the sale and cannot bid — sign in with the bidder's account.",
  sale_closed: "The auction is not open at the moment.",
  not_registered: "Register as a bidder first.",
  pending: "Your bidder registration is waiting for the owner's approval.",
  rejected: "Your bidder registration was not approved — contact the owner.",
  not_found: "No auction round is open yet.",
  closed: "This round has closed.",
  not_started: "This round has not started yet.",
  ended: "This round has ended.",
  bad_amount: "Enter the bid in whole US dollars, digits only.",
  already_highest: "You already hold the highest bid.",
  too_high: "That bid is above the limit for one bid — check the number of zeros.",
};

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const rl = await rateLimit(req, "site-bid", ctx.session.sub, { max: 30, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many bids in a short time — please wait a few minutes.", 429);
  const db = getData(req);
  const b = await readJson(req);
  const r = await placeSaleBid(db, ctx.session, b?.amount);
  if ("error" in r) {
    if (r.error === "too_low") {
      const cur = await latestRound(db);
      return fail(`The lowest bid accepted now is ${formatUsd(cur ? nextMinBid(cur) : 0)}.`, 409);
    }
    return fail(WHY[r.error] || "The bid was not accepted.", r.error === "not_registered" || r.error === "bad_amount" ? 400 : 409);
  }
  return respond({ ok: true, extended: r.extended, round: publicRound(r.round, await roundBids(db, r.round.id, 10)) }, ctx);
}
