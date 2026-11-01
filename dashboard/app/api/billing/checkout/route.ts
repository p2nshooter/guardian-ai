/* AXTO — POST /api/billing/checkout
 *   {plan, cycle, gateway, apps?}                        subscription period
 *   {kind:"lifetime", scope, product?, devices, gateway} lifetime licence (one-time)
 *   {kind:"edition", edition, cycle, gateway}            one self-hosted app in an edition (monthly / yearly)
 *   {kind:"auction", lot, gateway}                       a won auction lot (§26.5) at the winning bid; the
 *                                                        order is an edition or lifetime order like any other
 * Creates an order at OUR price (never the browser's) and returns the hosted
 * payment page URL. Manual bank transfer and crypto return instructions instead.
 * "card" runs through Xendit or Midtrans (Admin → Payment & email → Credit /
 * debit card), which pay card revenue out to our BNI account. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData, getEnv, newId } from "@/lib/db";
import { newOrder } from "@/lib/billing/order-doc";
import { patchMeta } from "@/lib/data/meta";
import { findLicence } from "@/lib/licences";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { getPlanPrices, priceFor, isPlanId, isCycle, PLANS } from "@/lib/plans";
import { gatewayCreds, gatewayCredsFor, gatewayInfo, cardRoute, usdIdrRate, usdEurRate, toIdr, toEur, bankAccounts, CRYPTO_ASSETS, ENV_KEY, type GatewayId } from "@/lib/billing/gateways";
import { stripeCreate, paypalCreate, xenditCreate, midtransCreate, nowpaymentsCreate, type OrderForPayment } from "@/lib/billing/providers";
import { readJson, fail, audit } from "@/lib/http";
import { SITE } from "@/lib/site";
import { getSelfHosted } from "@/lib/selfhosted";
import { quoteCrypto } from "@/lib/billing/crypto-watch";
import { uniqueIdrAmount } from "@/lib/billing/unique-amount";
import { getLifetimePrices, gatewayAllowed, CARD_MAX_USD, PAYPAL_MAX_USD, LIFETIME_BY_ADMIN, LIFETIME_DEAL, LIFETIME_DEAL_MESSAGE, type LifetimeScope } from "@/lib/lifetime";
import { lifetimeChoiceProblem, productName } from "@/lib/lifetime-service";
import { getEdition, getEditionPrices, editionPrice, type EditionCycle } from "@/lib/editions";
import { editionChoiceProblem, editionGatewayAllowed, EDITION_ANY_GATEWAY_MAX } from "@/lib/edition-service";
import { noteAuctionOrder, winCheckout, type WinCheckout } from "@/lib/auction";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Admin accounts already have full access.");
  const b = await readJson(req);
  const db = getData(req);
  // An auction win is charged at the winning bid for the lot's own package — never what the browser sends.
  let win: WinCheckout | null = null;
  if (b?.kind === "auction") {
    const w = await winCheckout(db, String(b?.lot || ""), ctx.session.sub);
    if ("error" in w) return fail(w.error, 409);
    win = w;
  }
  // Lifetime licences are agreed with the admin (REQUESTS 144); only a lifetime lot won at auction is paid here.
  if (b?.kind === "lifetime" && LIFETIME_BY_ADMIN) return fail(LIFETIME_DEAL_MESSAGE, 403, { contact: true, ...LIFETIME_DEAL });
  const lifetime = b?.kind === "lifetime" || !!win?.lifetime;
  const edition = b?.kind === "edition" || !!win?.edition;
  const plan = b?.plan, cycle = b?.cycle, gateway = String(b?.gateway || "") as GatewayId;
  if (!lifetime && !edition && (!isPlanId(plan) || !isCycle(cycle))) return fail("Choose a plan and billing period.");
  if (edition && !win) {
    const problem = editionChoiceProblem(b?.edition, b?.cycle);
    if (problem) return fail(problem);
  }
  if (lifetime && !win) {
    const problem = lifetimeChoiceProblem(b?.scope, b?.product);
    if (problem) return fail(problem);
  }
  const info = gatewayInfo(gateway);
  if (!info) return fail("Choose a payment method.");

  // Editions: the price comes from the (admin-editable) edition table — never from the browser —
  // and decides which payment methods may carry it, before any gateway is contacted.
  let editionAmount = 0;
  let editionMeta: { code: string; app: string; cycle: EditionCycle } | undefined;
  if (edition) {
    const e = getEdition(win?.edition ? win.edition.code : String(b.edition))!;
    const ecycle = (win?.edition ? win.edition.cycle : b.cycle) as EditionCycle;
    const price = win ? win.amountUsd : editionPrice(e.code, ecycle, await getEditionPrices(db));
    if (price === null) return fail("That edition is not on sale right now.");
    const planLic = (await findLicence(db, ctx.session.sub, e.app, "plan"))?.status === "active";
    if (planLic) return fail("This app is already included in your plan at the top edition.");
    if (!editionGatewayAllowed(gateway, price, CARD_MAX_USD)) return fail(`For more than $${EDITION_ANY_GATEWAY_MAX.toLocaleString("en-US")} please pay by bank/wire transfer, crypto or card.`);
    editionAmount = price;
    editionMeta = { code: e.code, app: e.app, cycle: ecycle };
  }
  const creds = await gatewayCreds(db, gateway);
  if (!creds) return fail("That payment method is not available right now. Please choose another.", 503);
  // Sandbox = the provider's test environment: the order is a TEST order (never revenue).
  const env = creds[ENV_KEY] === "sandbox" ? "sandbox" : "live";
  // Cards run through an Indonesian processor (Xendit / Midtrans) that settles to our BNI account;
  // the order is filed under that processor so its webhook confirms it.
  const card = gateway === "card" ? cardRoute(creds) : null;
  let payCreds = creds;
  if (gateway === "card") {
    const pc = card ? await gatewayCredsFor(card.processor, env) : null;
    if (!card || !pc) return fail("Card payments are not available right now. Please choose another method.", 503);
    payCreds = pc;
  }
  const orderGateway = card ? card.processor : gateway;
  const orderCurrency = card ? card.currency : info.currency;

  // Lifetime: the price comes from the (admin-editable) tier table — the browser only picks a tier.
  let amountUsd: number;
  let lifetimeMeta: { scope: LifetimeScope; product: string; devices: number } | undefined;
  if (edition) {
    amountUsd = editionAmount;
  } else if (lifetime) {
    const tier = (await getLifetimePrices(db)).find((x) => x.devices === Number(win?.lifetime ? win.lifetime.devices : b?.devices));
    if (!tier) return fail("Choose the number of devices.");
    const scope = (win?.lifetime ? win.lifetime.scope : b.scope) as LifetimeScope;
    const product = win?.lifetime ? win.lifetime.product : String(b.product);
    amountUsd = win ? win.amountUsd : tier[scope];
    if (!gatewayAllowed(gateway, amountUsd)) {
      return fail(`For a lifetime licence of this size please pay by bank/wire transfer or crypto${amountUsd <= CARD_MAX_USD ? " or card" : ""}${amountUsd <= PAYPAL_MAX_USD ? " or PayPal" : ""}.`);
    }
    lifetimeMeta = { scope, product: scope === "suite" ? "suite" : product, devices: tier.devices };
  } else {
    amountUsd = priceFor(await getPlanPrices(db), plan, cycle);
  }
  const rate = orderCurrency === "IDR" ? await usdIdrRate(db, getEnv(req).KV) : 0;
  const baseIdr = orderCurrency === "IDR" ? toIdr(amountUsd, rate) : 0;
  // Manual bank transfers get a unique 3-digit code so each transfer identifies its order.
  const unique = gateway === "manual" && baseIdr ? await uniqueIdrAmount(db, baseIdr) : null;
  const amountIdr = unique ? unique.amount : baseIdr;
  const id = newId("ord");
  // Business: the self-hosted apps chosen now are licensed the moment payment confirms.
  const lim = lifetime || edition ? null : PLANS[plan as keyof typeof PLANS].limits;
  const apps: string[] = Array.isArray(b?.apps) ? Array.from(new Set<string>(b.apps.map(String))).filter((x) => !!getSelfHosted(x)) : [];
  if (lim && lim.selfHostedApps > 0 && apps.length > lim.selfHostedApps) return fail(`${PLANS[plan as keyof typeof PLANS].name} includes ${lim.selfHostedApps} self-hosted apps — choose up to ${lim.selfHostedApps}.`);
  const crypto = gateway === "crypto" ? await quoteCrypto(db, amountUsd, creds) : null;
  const auction = win ? { lot: win.lot.id, seq: win.lot.winner_seq } : undefined;
  const description = (win ? "Auction win: " : "") + (editionMeta
    ? `${productName(editionMeta.app)} ${getEdition(editionMeta.code)!.name} edition — ${editionMeta.cycle === "yearly" ? "1 year" : "1 month"}`
    : lifetimeMeta
      ? `${SITE.name} Lifetime licence — ${productName(lifetimeMeta.product)}, up to ${lifetimeMeta.devices} device${lifetimeMeta.devices === 1 ? "" : "s"}`
      : `${SITE.name} ${PLANS[plan as keyof typeof PLANS].name} — ${cycle === "yearly" ? "1 year" : "1 month"}`);

  await db.orders.create(newOrder({
    id, user_id: ctx.session.sub, email: ctx.session.email, plan: edition ? "edition" : lifetime ? "lifetime" : plan, cycle: edition ? editionMeta!.cycle : lifetime ? "once" : cycle,
    amount_usd: amountUsd, currency: orderCurrency, amount_local: amountIdr, gateway: orderGateway,
    meta: JSON.stringify({ env, rate: rate || undefined, uniqueCode: unique?.code, apps: lim && lim.selfHostedApps > 0 ? apps : undefined, crypto: crypto || undefined, lifetime: lifetimeMeta, edition: editionMeta, auction, method: card ? "card" : undefined }),
  }));
  if (win) await noteAuctionOrder(db, win.lot.id, id, ctx.session.sub);
  await audit(db, ctx.session, "order.created", "order", id, { plan: edition ? "edition" : lifetime ? "lifetime" : plan, cycle: edition ? editionMeta!.cycle : lifetime ? "once" : cycle, gateway, processor: card?.processor, env, amountUsd, lifetime: lifetimeMeta, edition: editionMeta, auction }, req);

  const o: OrderForPayment = { id, email: ctx.session.email, description, amountUsd, amountIdr, returnPath: win ? "/app/auction" : edition ? "/app/self-hosted" : lifetime ? "/app/lifetime" : undefined };
  try {
    let url = "", ref = "";
    switch (gateway) {
      case "stripe": url = await stripeCreate(creds, o); break;
      case "paypal": ({ url, ref } = await paypalCreate(creds, o)); break;
      case "card":
        if (card!.processor === "xendit") ({ url, ref } = await xenditCreate(payCreds, o, { paymentMethods: ["CREDIT_CARD"], currency: card!.currency }));
        else url = await midtransCreate(payCreds, o, { enabledPayments: ["credit_card"] });
        break;
      case "xendit": ({ url, ref } = await xenditCreate(creds, o)); break;
      case "midtrans": url = await midtransCreate(creds, o); break;
      case "nowpayments": ({ url, ref } = await nowpaymentsCreate(creds, o)); break;
      case "manual": {
        // Every configured BNI account is offered with its own exact amount; the
        // buyer picks the currency in the payment panel. Rupiah carries the
        // unique 3-digit code; USD and EUR are SWIFT wires matched by reference.
        const accounts = bankAccounts(creds);
        const eurRate = accounts.some((a) => a.currency === "EUR") ? await usdEurRate(db, getEnv(req).KV) : 0;
        const banks = accounts.map((a) =>
          a.currency === "IDR" ? { currency: a.currency, account_number: a.number, amount: amountIdr, uniqueCode: unique?.code || 0 }
          : a.currency === "USD" ? { currency: a.currency, account_number: a.number, amount: amountUsd }
          : { currency: a.currency, account_number: a.number, amount: toEur(amountUsd, eurRate), rate: eurRate });
        if (banks.length) {
          const quotes = banks.map(({ account_number: _n, ...q }) => q);
          await db.orders.update(id, (o) => ({ ...o, meta: patchMeta(o.meta, (m) => { m.bank_quotes = quotes; }) }));
        }
        return respond({
          ok: true, orderId: id, manual: true, method: "bank", reference: id, amountUsd, amountIdr, uniqueCode: unique?.code || 0, currency: "IDR",
          bank: { bank_name: creds.bank_name || "BNI", account_number: creds.account_number || "", account_name: creds.account_name || "", branch: creds.branch || "", swift_code: creds.swift_code || "" },
          banks,
          // The unique-code line is always shown, even when the admin wrote their own instructions.
          instructions: [
            unique ? `Transfer EXACTLY Rp${amountIdr.toLocaleString("id-ID")} — the last 3 digits (${String(unique.code).padStart(3, "0")}) are your unique order code, so please do not round it.` : "",
            creds.instructions || `Write ${id} in the transfer note if you can. Then send the receipt in the Support chat (topic “Pay by bank transfer”) — we confirm within one business day.`,
          ].filter(Boolean).join(" "),
          note: creds.instructions || "",
        }, ctx);
      }
      case "crypto":
        return respond({
          ok: true, orderId: id, manual: true, method: "crypto", reference: id, amountUsd, currency: "USD",
          wallets: CRYPTO_ASSETS.filter((a) => creds[a.key]).map((a) => {
            const volatile = a.asset === "BTC" || a.asset === "ETH" || a.asset === "SOL";
            const q = volatile ? crypto!.quotes[a.asset] : null;
            return { key: a.key, asset: a.asset, network: a.network, address: creds[a.key],
                     amount: volatile ? (q ? String(q.amount) : "") : crypto!.amount, auto: !volatile };
          }).filter((w) => w.amount),
          instructions: creds.instructions || `Send EXACTLY the amount shown, on the network shown. Stablecoin payments (USDT/USDC) are detected and confirmed automatically within minutes; for BTC, ETH or SOL paste your transaction hash after sending. Your plan and licences activate automatically.`,
          note: creds.instructions || "",
        }, ctx);
    }
    if (ref) await db.orders.update(id, (o) => ({ ...o, gateway_ref: ref }));
    return respond({ ok: true, orderId: id, url, test: env === "sandbox" }, ctx);
  } catch (e: any) {
    const error = String(e?.message || e).slice(0, 300);
    await db.orders.update(id, (o) => ({ ...o, status: "failed", meta: patchMeta(o.meta, (m) => { m.error = error; }) }));
    return fail(`Could not start the payment: ${String(e?.message || "unknown error").slice(0, 200)}. Please try another method.`, 502);
  }
}
