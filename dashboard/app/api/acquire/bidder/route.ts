/* AXTO — POST /api/acquire/bidder {displayName, company?, country, phone, message?}
 * Register (or update) as a bidder in the site-sale auction. The owner approves
 * each bidder unless approval is switched off (Admin → Site sale); the name shown
 * is filtered for abuse and other people's brands, and is masked on the page. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getSale } from "@/lib/acquisition";
import { registerBidder } from "@/lib/sale-auction";

const WHY: Record<string, string> = {
  length: "Choose a name of at least 2 characters.",
  chars: "Use letters (and digits, spaces, . , & ' - ) only in the name.",
  contact: "The name cannot contain an e-mail address, a website or a phone number.",
  abuse: "Choose a different name.",
  brand: "The name cannot be another company's brand.",
  phone: "Enter a phone or WhatsApp number the owner can call.",
  country: "Enter your country.",
};

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Administrator accounts run the sale and cannot bid — sign in with the bidder's account.");
  const rl = await rateLimit(req, "site-bidder", ctx.session.sub, { max: 10, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts — please wait a few minutes.", 429);
  const db = getData(req);
  const sale = await getSale(db);
  if (sale.mode !== "auction" || sale.status !== "open") return fail("The auction is not open at the moment.", 409);
  const r = await registerBidder(db, ctx.session, (await readJson(req)) || {}, sale.auction.approval);
  if ("error" in r) return fail(WHY[r.error] || "Check the details and try again.");
  return respond({ ok: true, status: r.bidder.status }, ctx);
}
