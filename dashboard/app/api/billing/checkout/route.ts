/* AXTO — POST /api/billing/checkout
 *   {plan, cycle, gateway, apps?}                        subscription period
 *   {kind:"lifetime", scope, product?, devices, gateway} lifetime licence (one-time)
 *   {kind:"edition", edition, cycle, gateway}            one self-hosted app in an edition (monthly / yearly)
 * Creates an order at OUR price (never the browser's) and returns the hosted
 * payment page URL. Manual bank transfer and crypto return instructions instead.
 * "card" runs through Xendit or Midtrans (Admin → Payment & email → Credit /
 * debit card), which pay card revenue out to our BNI account. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, getEnv, dbRun, newId, now } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { getPlanPrices, priceFor, isPlanId, isCycle, PLANS } from "@/lib/plans";
import { gatewayCreds, gatewayCredsFor, gatewayInfo, cardRoute, usdIdrRate, usdEurRate, toIdr, toEur, bankAccounts, CRYPTO_ASSETS, ENV_KEY, type GatewayId } from "@/lib/billing/gateways";
import { stripeCreate, paypalCreate, xenditCreate, midtransCreate, nowpaymentsCreate, type OrderForPayment } from "@/lib/billing/providers";
import { readJson, fail, audit } from "@/lib/http";
import { SITE } from "@/lib/site";
import { getSelfHosted } from "@/lib/selfhosted";
import { quoteCrypto } from "@/lib/billing/crypto-watch";
import { uniqueIdrAmount } from "@/lib/billing/unique-amount";
import { getLifetimePrices, gatewayAllowed, CARD_MAX_USD, PAYPAL_MAX_USD, type LifetimeScope } from "@/lib/lifetime";
import { lifetimeChoiceProblem, productName } from "@/lib/lifetime-service";
import { getEdition, getEditionPrices, editionPrice, type EditionCycle } from "@/lib/editions";
import { editionChoiceProblem, editionGatewayAllowed, EDITION_ANY_GATEWAY_MAX } from "@/lib/edition-service";

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  if (ctx.session.role === "admin") return fail("Admin accounts already have full access.");
  const b = await readJson(req);
  const lifetime = b?.kind === "lifetime";
  const edition = b?.kind === "edition";
  const plan = b?.plan, cycle = b?.cycle, gateway = String(b?.gateway || "") as GatewayId;
  if (!lifetime && !edition && (!isPlanId(plan) || !isCycle(cycle))) return fail("Choose a plan and billing period.");
  if (edition) {
    const problem = editionChoiceProblem(b?.edition, b?.cycle);
    if (problem) return fail(problem);
  }
  if (lifetime) {
    const problem = lifetimeChoiceProblem(b?.scope, b?.product);
    if (problem) return fail(problem);
  }
  const info = gatewayInfo(gateway);
  if (!info) return fail("Choose a payment method.");

  const db = getDB(req);
  // Editions: the price comes from the (admin-editable) edition table — never from the browser —
  // and decides which payment methods may carry it, before any gateway is contacted.
  let editionAmount = 0;
  let editionMeta: { code: string; app: string; cycle: EditionCycle } | undefined;
  if (edition) {
    const e = getEdition(String(b.edition))!;
    const price = editionPrice(e.code, b.cycle as EditionCycle, await getEditionPrices(db));
    if (price === null) return fail("That edition is not on sale right now.");
    const planLic = await db.prepare(`SELECT 1 AS x FROM sh_licenses WHERE user_id = ? AND product = ? AND source = 'plan' AND status = 'active'`).bind(ctx.session.sub, e.app).first();
    if (planLic) return fail("This app is already included in your plan at the top edition.");
    if (!editionGatewayAllowed(gateway, price, CARD_MAX_USD)) return fail(`For more than $${EDITION_ANY_GATEWAY_MAX.toLocaleString("en-US")} please pay by bank/wire transfer, crypto or card.`);
    editionAmount = price;
    editionMeta = { code: e.code, app: e.app, cycle: b.cycle as EditionCycle };
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
    const tier = (await getLifetimePrices(db)).find((x) => x.devices === Number(b?.devices));
    if (!tier) return fail("Choose the number of devices.");
    const scope = b.scope as LifetimeScope;
    amountUsd = tier[scope];
    if (!gatewayAllowed(gateway, amountUsd)) {
      return fail(`For a lifetime licence of this size please pay by bank/wire transfer or crypto${amountUsd <= CARD_MAX_USD ? " or card" : ""}${amountUsd <= PAYPAL_MAX_USD ? " or PayPal" : ""}.`);
    }
    lifetimeMeta = { scope, product: scope === "suite" ? "suite" : String(b.product), devices: tier.devices };
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
  const description = editionMeta
    ? `${productName(editionMeta.app)} ${getEdition(editionMeta.code)!.name} edition — ${editionMeta.cycle === "yearly" ? "1 year" : "1 month"}`
    : lifetimeMeta
      ? `${SITE.name} Lifetime licence — ${productName(lifetimeMeta.product)}, up to ${lifetimeMeta.devices} device${lifetimeMeta.devices === 1 ? "" : "s"}`
      : `${SITE.name} ${PLANS[plan as keyof typeof PLANS].name} — ${cycle === "yearly" ? "1 year" : "1 month"}`;

  await dbRun(db,
    `INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, amount_local, gateway, status, meta, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?)`,
    [id, ctx.session.sub, ctx.session.email, edition ? "edition" : lifetime ? "lifetime" : plan, edition ? editionMeta!.cycle : lifetime ? "once" : cycle, amountUsd, orderCurrency, amountIdr, orderGateway,
     JSON.stringify({ env, rate: rate || undefined, uniqueCode: unique?.code, apps: lim && lim.selfHostedApps > 0 ? apps : undefined, crypto: crypto || undefined, lifetime: lifetimeMeta, edition: editionMeta, method: card ? "card" : undefined }), now()]);
  await audit(db, ctx.session, "order.created", "order", id, { plan: edition ? "edition" : lifetime ? "lifetime" : plan, cycle: edition ? editionMeta!.cycle : lifetime ? "once" : cycle, gateway, processor: card?.processor, env, amountUsd, lifetime: lifetimeMeta, edition: editionMeta }, req);

  const o: OrderForPayment = { id, email: ctx.session.email, description, amountUsd, amountIdr, returnPath: edition ? "/app/self-hosted" : lifetime ? "/app/lifetime" : undefined };
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
          await dbRun(db, `UPDATE orders SET meta = json_set(COALESCE(NULLIF(meta,''),'{}'), '$.bank_quotes', json(?)) WHERE id = ?`,
            [JSON.stringify(banks.map(({ account_number: _n, ...q }) => q)), id]);
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
    if (ref) await dbRun(db, `UPDATE orders SET gateway_ref = ? WHERE id = ?`, [ref, id]);
    return respond({ ok: true, orderId: id, url, test: env === "sandbox" }, ctx);
  } catch (e: any) {
    await dbRun(db, `UPDATE orders SET status = 'failed', meta = json_set(meta, '$.error', ?) WHERE id = ?`, [String(e?.message || e).slice(0, 300), id]);
    return fail(`Could not start the payment: ${String(e?.message || "unknown error").slice(0, 200)}. Please try another method.`, 502);
  }
}
