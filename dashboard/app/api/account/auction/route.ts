/* AXTO — /api/account/auction · the member's side of the licence auction (§26.5)
 *   GET → the running auction with the member's own bids, leads and wins, and
 *         whether they can bid
 *   POST {action:"name", displayName} → the company or personal name shown when they win;
 *         a signed-in member who has chosen it bids — no e-mailed code (owner, 27 Oct 2026)
 *   POST {action:"bid", lot, amount}  → one bid, whole dollars
 * Errors carry a `code` the page translates. Paying a win is the normal
 * checkout: POST /api/billing/checkout {kind:"auction", lot, gateway}. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, respond, unauthorized } from "@/lib/auth";
import { readJson, fail, str } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { memberBoard, placeBid, setDisplayName } from "@/lib/auction";

const err = (code: string, message: string, status = 400) => fail(message, status, { code });

const BID_MESSAGES: Record<string, string> = {
  closed: "Bidding on this lot has closed.", not_started: "Bidding on this lot has not started yet.", ended: "This lot has ended.",
  too_low: "Every bid is exactly the next price shown.", too_high: "A bid cannot be higher than the normal price.",
  already_highest: "You already have the highest bid on this lot.", bad_amount: "Enter a bid in whole US dollars.",
  not_next: "Someone bid just before you — the next bid has been updated.",
  not_found: "Auction lot not found.", not_verified: "Choose the name shown when you win before you bid.",
};
const NAME_MESSAGES: Record<string, string> = {
  length: "Use 2 to 48 characters.", chars: "Use letters, numbers, spaces and . , & ' ( ) - only.", contact: "No e-mail addresses, web addresses or phone numbers.",
  abuse: "Please choose another name.", brand: "That name belongs to another company's brand.",
};

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  return respond(await memberBoard(getData(req), ctx.session), ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const s = ctx.session;
  if (s.role === "admin") return err("admin", "Admin accounts run the auction and cannot bid.", 403);
  const db = getData(req);
  const b = await readJson(req);
  switch (b?.action) {
    case "name": {
      const rl = await rateLimit(req, "auction-name", s.sub, { max: 20, windowSeconds: 3600 });
      if (rl.limited) return err("wait", "Too many changes — please try again later.", 429);
      const r = await setDisplayName(db, s, b?.displayName);
      if ("error" in r) return err(r.error, NAME_MESSAGES[r.error] || "Please choose another name.");
      return respond({ ok: true, displayName: r.name }, ctx);
    }
    case "bid": {
      const rl = await rateLimit(req, "auction-bid", s.sub, { max: 30, windowSeconds: 60 });
      if (rl.limited) return err("wait", "Too many bids in a minute — please slow down.", 429);
      const r = await placeBid(db, s, str(b?.lot, 120), b?.amount);
      if ("error" in r) return err(r.error, BID_MESSAGES[r.error] || "The bid was not accepted.", r.error === "not_found" ? 404 : 409);
      return respond({ ok: true, seq: r.seq, extended: r.extended, highUsd: r.lot.high_usd, endsAt: r.lot.ends_at }, ctx);
    }
    default:
      return fail("Unknown action.");
  }
}
