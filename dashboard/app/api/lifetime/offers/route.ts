/* AXTO — /api/lifetime/offers · the member's price offers on lifetime licences.
 *   GET  → my offers, today's deal prices, whether offers are open
 *   POST {action:"make", scope, product?, devices, offerUsd, note?}  → pending (the admin decides by hand)
 *        {action:"withdraw", id}
 * An accepted / countered offer is paid through /api/billing/checkout
 * {kind:"lifetime", offerId, gateway}. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { dealPayload } from "@/lib/lifetime-pricing";
import { makeOffer, offersFor, withdrawOffer } from "@/lib/lifetime-offers";
import { productName } from "@/lib/lifetime-service";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const db = getDB(req);
  const [{ cfg: _cfg, ...p }, offers] = await Promise.all([dealPayload(db), offersFor(db, ctx.session.sub)]);
  return respond({ ...p, offers: offers.map((o) => ({ ...o, productName: productName(o.product) })) }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Admin accounts already have full access.");
  const db = getDB(req);
  const b = await readJson(req);

  if (b?.action === "make") {
    // Also caps probing for the (private) minimum: refused offers count here too.
    const rl = await rateLimit(req, "lifetime-offer", ctx.session.sub, { max: 20, windowSeconds: 86400 });
    if (rl.limited) return fail("Too many offers today. Please try again tomorrow.", 429, { code: "too_many" });
    const { cfg, tiers } = await dealPayload(db);
    const r = await makeOffer(db, { id: ctx.session.sub, email: ctx.session.email }, b, cfg, tiers);
    if (!r.ok) return fail(r.error, r.status || 400, { code: r.code });
    await audit(db, ctx.session, "lifetime.offer.made", "lifetime_offer", r.offer.id, { scope: r.offer.scope, product: r.offer.product, devices: r.offer.devices, list: r.offer.list_usd, offer: r.offer.offer_usd }, req);
    return respond({ ok: true, offer: { ...r.offer, productName: productName(r.offer.product) } }, ctx);
  }

  if (b?.action === "withdraw") {
    const id = String(b.id || "");
    if (!(await withdrawOffer(db, ctx.session.sub, id))) return fail("This offer can no longer be withdrawn.", 409, { code: "not_open" });
    await audit(db, ctx.session, "lifetime.offer.withdrawn", "lifetime_offer", id, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
