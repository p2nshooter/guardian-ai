/* AXTO — POST /api/billing/checkout {plan, cycle, gateway}
 * Creates an order at OUR price (never the browser's) and returns the hosted
 * payment page URL. Manual bank transfer returns instructions instead. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, getEnv, dbRun, newId, now } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { getPlanPrices, priceFor, isPlanId, isCycle, PLANS } from "@/lib/plans";
import { gatewayCreds, gatewayInfo, usdIdrRate, toIdr, CRYPTO_ASSETS, type GatewayId } from "@/lib/billing/gateways";
import { stripeCreate, paypalCreate, xenditCreate, midtransCreate, nowpaymentsCreate, type OrderForPayment } from "@/lib/billing/providers";
import { readJson, fail, audit } from "@/lib/http";
import { SITE } from "@/lib/site";
import { getSelfHosted } from "@/lib/selfhosted";
import { quoteCrypto } from "@/lib/billing/crypto-watch";
import { uniqueIdrAmount } from "@/lib/billing/unique-amount";

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
  const baseIdr = info.currency === "IDR" ? toIdr(amountUsd, rate) : 0;
  // Manual bank transfers get a unique 3-digit code so each transfer identifies its order.
  const unique = gateway === "manual" && baseIdr ? await uniqueIdrAmount(db, baseIdr) : null;
  const amountIdr = unique ? unique.amount : baseIdr;
  const id = newId("ord");
  // Business: the self-hosted apps chosen now are licensed the moment payment confirms.
  const lim = PLANS[plan].limits;
  const apps: string[] = Array.isArray(b?.apps) ? Array.from(new Set<string>(b.apps.map(String))).filter((x) => !!getSelfHosted(x)) : [];
  if (lim.selfHostedApps > 0 && apps.length > lim.selfHostedApps) return fail(`${PLANS[plan].name} includes ${lim.selfHostedApps} self-hosted apps — choose up to ${lim.selfHostedApps}.`);
  const crypto = gateway === "crypto" ? await quoteCrypto(db, amountUsd, creds) : null;
  const description = `${SITE.name} ${PLANS[plan].name} — ${cycle === "yearly" ? "1 year" : "1 month"}`;

  await dbRun(db,
    `INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, amount_local, gateway, status, meta, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?)`,
    [id, ctx.session.sub, ctx.session.email, plan, cycle, amountUsd, info.currency, amountIdr, gateway,
     JSON.stringify({ rate: rate || undefined, uniqueCode: unique?.code, apps: lim.selfHostedApps > 0 ? apps : undefined, crypto: crypto || undefined }), now()]);
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
        return respond({
          ok: true, orderId: id, manual: true, method: "bank", reference: id, amountUsd, amountIdr, uniqueCode: unique?.code || 0, currency: "IDR",
          bank: { bank_name: creds.bank_name || "BNI", account_number: creds.account_number || "", account_name: creds.account_name || "", branch: creds.branch || "", swift_code: creds.swift_code || "" },
          // The unique-code line is always shown, even when the admin wrote their own instructions.
          instructions: [
            unique ? `Transfer EXACTLY Rp${amountIdr.toLocaleString("id-ID")} — the last 3 digits (${String(unique.code).padStart(3, "0")}) are your unique order code, so please do not round it.` : "",
            creds.instructions || `Write ${id} in the transfer note if you can. Then send the receipt in the Support chat (topic “Pay by bank transfer”) — we confirm within one business day.`,
          ].filter(Boolean).join(" "),
          note: creds.instructions || "",
        }, ctx);
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
    return respond({ ok: true, orderId: id, url }, ctx);
  } catch (e: any) {
    await dbRun(db, `UPDATE orders SET status = 'failed', meta = json_set(meta, '$.error', ?) WHERE id = ?`, [String(e?.message || e).slice(0, 300), id]);
    return fail(`Could not start the payment: ${String(e?.message || "unknown error").slice(0, 200)}. Please try another method.`, 502);
  }
}
