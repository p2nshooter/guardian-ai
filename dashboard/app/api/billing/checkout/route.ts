/* AXTO — POST /api/billing/checkout {plan, cycle, gateway}
 * Creates an order at OUR price (never the browser's) and returns the hosted
 * payment page URL. Manual bank transfer returns instructions instead. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, getEnv, dbRun, newId, now } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { getPlanPrices, priceFor, isPlanId, isCycle, PLANS } from "@/lib/plans";
import { gatewayCreds, gatewayInfo, usdIdrRate, toIdr, type GatewayId } from "@/lib/billing/gateways";
import { stripeCreate, paypalCreate, xenditCreate, midtransCreate, nowpaymentsCreate, type OrderForPayment } from "@/lib/billing/providers";
import { readJson, fail, audit } from "@/lib/http";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Admin accounts already have full access.");
  const b = await readJson(req);
  const plan = b?.plan, cycle = b?.cycle, gateway = String(b?.gateway || "") as GatewayId;
  if (!isPlanId(plan) || !isCycle(cycle)) return fail("Choose a plan and billing period.");
  const info = gatewayInfo(gateway);
  if (!info) return fail("Choose a payment method.");

  const db = getDB(req);
  const creds = await gatewayCreds(db, gateway);
  if (!creds) return fail("That payment method is not available right now. Please choose another.", 503);

  const prices = await getPlanPrices(db);
  const amountUsd = priceFor(prices, plan, cycle);
  const rate = info.currency === "IDR" ? await usdIdrRate(db, getEnv(req).KV) : 0;
  const amountIdr = info.currency === "IDR" ? toIdr(amountUsd, rate) : 0;
  const id = newId("ord");
  const description = `${SITE.name} ${PLANS[plan].name} — ${cycle === "yearly" ? "1 year" : "1 month"}`;

  await dbRun(db,
    `INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, amount_local, gateway, status, meta, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?)`,
    [id, ctx.session.sub, ctx.session.email, plan, cycle, amountUsd, info.currency, amountIdr, gateway,
     JSON.stringify({ rate: rate || undefined }), now()]);
  await audit(db, ctx.session, "order.created", "order", id, { plan, cycle, gateway, amountUsd }, req);

  const o: OrderForPayment = { id, email: ctx.session.email, description, amountUsd, amountIdr };
  try {
    let url = "", ref = "";
    switch (gateway) {
      case "stripe": url = await stripeCreate(creds, o); break;
      case "paypal": ({ url, ref } = await paypalCreate(creds, o)); break;
      case "xendit": ({ url, ref } = await xenditCreate(creds, o)); break;
      case "midtrans": url = await midtransCreate(creds, o); break;
      case "nowpayments": ({ url, ref } = await nowpaymentsCreate(creds, o)); break;
      case "manual":
        return respond({ ok: true, orderId: id, manual: true, amountUsd, instructions: creds.instructions || `Email ${SITE.supportEmail} with your order number.` }, ctx);
    }
    if (ref) await dbRun(db, `UPDATE orders SET gateway_ref = ? WHERE id = ?`, [ref, id]);
    return respond({ ok: true, orderId: id, url }, ctx);
  } catch (e: any) {
    await dbRun(db, `UPDATE orders SET status = 'failed', meta = json_set(meta, '$.error', ?) WHERE id = ?`, [String(e?.message || e).slice(0, 300), id]);
    return fail(`Could not start the payment: ${String(e?.message || "unknown error").slice(0, 200)}. Please try another method.`, 502);
  }
}
