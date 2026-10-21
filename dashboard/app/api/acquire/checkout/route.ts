/* AXTO — POST /api/acquire/checkout {gateway, company?, name?, phone?, message?}
 * Starts the purchase of the whole site at OUR price (Admin → Site sale).
 *   paypal · stripe · nowpayments → hosted payment page URL (back to /acquire)
 *   crypto                         → wallets + exact amounts (confirmed on-chain)
 *   manual                         → the owner's BNI accounts (wire), WhatsApp for the receipt
 * When the payment is verified, lib/billing/activate makes the buyer an admin. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData, getEnv, newId } from "@/lib/db";
import { patchMeta } from "@/lib/data/meta";
import { newOrder } from "@/lib/billing/order-doc";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { gatewayCreds, gatewayInfo, usdIdrRate, toIdr, CRYPTO_ASSETS, ENV_KEY, type GatewayId } from "@/lib/billing/gateways";
import { stripeCreate, paypalCreate, nowpaymentsCreate, type OrderForPayment } from "@/lib/billing/providers";
import { quoteCrypto } from "@/lib/billing/crypto-watch";
import { getSale, saleGatewayAllowed, accountFor } from "@/lib/acquisition";
import { cleanText } from "@/lib/support/store";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Administrator accounts cannot buy the site — sign in with the buyer's account.");
  const rl = await rateLimit(req, "acquire-checkout", ctx.session.sub, { max: 10, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts — please wait a few minutes.", 429);
  const db = getData(req);
  const sale = await getSale(db);
  if (sale.status !== "open") return fail(sale.status === "sold" ? `${SITE.name} has been sold.` : "The offer is paused at the moment.", 409);

  const b = await readJson(req);
  const gateway = String(b?.gateway || "") as GatewayId;
  const info = gatewayInfo(gateway);
  if (!info || !saleGatewayAllowed(sale, gateway, sale.priceUsd)) return fail("Choose a payment method.");
  const buyer = { company: cleanText(b?.company, 160), name: cleanText(b?.name, 120) || ctx.session.name || "", phone: cleanText(b?.phone, 40), message: cleanText(b?.message, 2000) };

  // A wire goes straight to the owner's BNI accounts; every other method needs its gateway to be live in Admin → Payments.
  const creds = gateway === "manual" ? null : await gatewayCreds(db, gateway);
  if (gateway !== "manual" && !creds) return fail("That payment method is not available right now. Please choose another.", 503);
  const env = creds?.[ENV_KEY] === "sandbox" ? "sandbox" : "live";
  const amountUsd = sale.priceUsd;
  const rate = gateway === "manual" ? await usdIdrRate(db, getEnv(req).KV) : 0;
  const amountIdr = rate ? toIdr(amountUsd, rate) : 0;
  const crypto = gateway === "crypto" && creds ? await quoteCrypto(db, amountUsd, creds) : null;

  // One open order per buyer and method: reuse it instead of piling up duplicates.
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const open = (await db.orders.listDocs("user", ctx.session.sub, { limit: 50 })).docs
    .find((x) => x.plan === "acquisition" && x.gateway === gateway && x.status === "pending" && x.created_at > since);
  const id = gateway === "manual" && open ? open.id : newId("ord");
  if (id !== open?.id) {
    await db.orders.create(newOrder({
      id, user_id: ctx.session.sub, email: ctx.session.email, plan: "acquisition", cycle: "once", amount_usd: amountUsd, amount_local: amountIdr, gateway,
      meta: JSON.stringify({ env, rate: rate || undefined, buyer, crypto: crypto || undefined }),
    }));
    await audit(db, ctx.session, "site.sale.checkout", "order", id, { gateway, env, amountUsd, company: buyer.company }, req);
  }

  const description = `Acquisition of ${SITE.name} — website, apps, code, accounts and brand`;
  const o: OrderForPayment = { id, email: ctx.session.email, description, amountUsd, amountIdr, returnPath: "/acquire" };
  try {
    let url = "", ref = "";
    switch (gateway) {
      case "stripe": url = await stripeCreate(creds!, o); break;
      case "paypal": ({ url, ref } = await paypalCreate(creds!, o)); break;
      case "nowpayments": ({ url, ref } = await nowpaymentsCreate(creds!, o)); break;
      case "manual": {
        const usd = accountFor(sale, "USD");
        return respond({
          ok: true, orderId: id, method: "wire", amountUsd, amountIdr, reference: id, whatsapp: sale.whatsapp,
          bank: { name: sale.bank.name, holder: sale.bank.holder, swift: sale.bank.swift, code: sale.bank.code, branch: sale.bank.branch, primary: usd, accounts: sale.bank.accounts },
        }, ctx);
      }
      case "crypto":
        return respond({
          ok: true, orderId: id, manual: true, method: "crypto", reference: id, amountUsd, currency: "USD", whatsapp: sale.whatsapp,
          wallets: CRYPTO_ASSETS.filter((a) => creds![a.key]).map((a) => {
            const volatile = a.asset === "BTC" || a.asset === "ETH" || a.asset === "SOL";
            const q = volatile ? crypto!.quotes[a.asset] : null;
            return { key: a.key, asset: a.asset, network: a.network, address: creds![a.key], amount: volatile ? (q ? String(q.amount) : "") : crypto!.amount, auto: !volatile };
          }).filter((w) => w.amount),
          note: creds!.instructions || "",
        }, ctx);
      default:
        return fail("Choose a payment method.");
    }
    if (ref) await db.orders.update(id, (x) => ({ ...x, gateway_ref: ref }));
    return respond({ ok: true, orderId: id, url, test: env === "sandbox" }, ctx);
  } catch (e: any) {
    const error = String(e?.message || e).slice(0, 300);
    await db.orders.update(id, (x) => ({ ...x, status: "failed", meta: patchMeta(x.meta, (m) => { m.error = error; }) })).catch(() => null);
    const paypalLimit = gateway === "paypal" ? " PayPal limits the size of a single payment — for the full price use crypto or a bank wire." : "";
    return fail(`Could not start the payment: ${String(e?.message || "unknown error").slice(0, 200)}.${paypalLimit}`, 502);
  }
}
