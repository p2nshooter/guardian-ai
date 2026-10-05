/* AXTO — /api/admin/lifetime/offers (admin only) · customer offers on lifetime licences.
 *   GET ?status=pending|accepted|… → offers (pending first) with today's deal price for comparison
 *   POST {action:"accept"|"counter"|"decline", id, agreedUsd?, note?}
 *        accept / counter reserve the price for the configured number of days and e-mail the
 *        customer, who pays it in the portal; the paid order issues the licence (zero-touch). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { dealPayload } from "@/lib/lifetime-pricing";
import { decideOffer, listOffers, type OfferStatus } from "@/lib/lifetime-offers";
import { productName } from "@/lib/lifetime-service";
import { discounted } from "@/lib/lifetime-deals";

const STATUSES: OfferStatus[] = ["pending", "accepted", "countered", "declined", "withdrawn", "expired", "paid"];

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const s = req.nextUrl.searchParams.get("status") || "";
  const status = (STATUSES as string[]).includes(s) ? s : "";
  const [{ cfg, deal }, offers] = await Promise.all([dealPayload(db), listOffers(db, status)]);
  const pct = deal.active?.pct || 0;
  return respond({
    offers: offers.map((o) => ({ ...o, productName: productName(o.product), dealUsd: pct ? discounted(o.list_usd, pct) : 0 })),
    deal, cfg, statuses: STATUSES,
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const b = await readJson(req);
  const id = String(b?.id || "");
  const { cfg } = await dealPayload(db);
  const r = await decideOffer(db, id, b?.action, { agreedUsd: b?.agreedUsd, note: b?.note }, ctx.session.email, cfg);
  if (!r.ok) return fail(r.error, r.status || 400, { code: r.code });
  await audit(db, ctx.session, `lifetime.offer.${r.offer.status}`, "lifetime_offer", id, { email: r.offer.email, offer: r.offer.offer_usd, agreed: r.offer.agreed_usd, list: r.offer.list_usd, note: r.offer.admin_note }, req);
  return respond({ ok: true, offer: r.offer }, ctx);
}
