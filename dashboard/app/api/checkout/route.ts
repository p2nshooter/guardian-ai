/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PACKAGE_INFO, isForSale } from "@/lib/stripe";
import { getLivePrice, lifetimePrice } from "@/lib/pricing";
import { getStripeCredentials, getPayPalCredentials, getXenditCredentials, getMidtransCredentials } from "@/lib/gateways";
import { createPayPalOrderWithCreds } from "@/lib/paypal";
import { createXenditInvoiceWithKey } from "@/lib/xendit";
import { usdToLocal } from "@/lib/fx";
import { getDB } from "@/lib/db";
import { getEnabledMethod, getPublicMethods } from "@/lib/payments/methods";
import { createCryptoIntent, rateUsdPerCoin } from "@/lib/payments/crypto";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Anonymous, checkout-scoped crypto helpers. Deliberately minimal — never leak
// anything beyond what an unauthenticated payer/watcher needs.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  if (url.searchParams.get("crypto_methods") === "1") {
    const methods = await getPublicMethods(db);
    return NextResponse.json({ methods });
  }

  const orderId = url.searchParams.get("order_id");
  if (orderId) {
    const row: any = await db.prepare(
      `SELECT status, license_id FROM crypto_payments WHERE order_id = ?`,
    ).bind(orderId).first();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Only ever expose status — never the license key over an unauthenticated endpoint.
    return NextResponse.json({ status: row.status, hasLicense: !!row.license_id });
  }

  return NextResponse.json({ error: "Specify crypto_methods=1 or order_id" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { pkg, gateway, email, name, organization, billing, source, playbook_meta } = body;
  if (!pkg || !gateway || !email) {
    return NextResponse.json({ error: "Missing required fields: pkg, gateway, email" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  // ── Playbook purchases (one-time payment, not subscription) ────────────
  if (source === "playbook" && playbook_meta) {
    const itemName = playbook_meta.item_name || "AXTO Playbook";
    const amountUsd = Number(playbook_meta.amount_usd) || 0;
    if (amountUsd <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const meta: Record<string, string> = {
      ...playbook_meta, pkg, email, name: name || email, source: "playbook",
    };

    if (gateway === "stripe") {
      let creds;
      try { creds = await getStripeCredentials(req); } catch {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
      }
      const stripe = new Stripe(creds.secret_key, { apiVersion: "2025-02-24.acacia" as any, httpClient: Stripe.createFetchHttpClient() });
      const session = await stripe.checkout.sessions.create({
        mode: "payment", customer_email: email,
        success_url: `${appUrl}/playbooks?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/playbooks`,
        metadata: meta,
        payment_intent_data: { metadata: meta },
        line_items: [{
          price_data: {
            currency: "usd", unit_amount: Math.round(amountUsd * 100),
            product_data: { name: `AXTO Playbook: ${itemName}`, description: "Digital download — AI prompt playbook" },
          }, quantity: 1,
        }],
      });
      return NextResponse.json({ url: session.url });
    }

    if (gateway === "paypal") {
      let creds;
      try { creds = await getPayPalCredentials(req); } catch {
        return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });
      }
      const order = await createPayPalOrderWithCreds(creds, pkg, amountUsd, email, itemName, "once", meta);
      const approveLink = order.links?.find((l: any) => l.rel === "approve");
      return NextResponse.json({ url: approveLink?.href || order.links?.[1]?.href });
    }

    if (gateway === "xendit") {
      let creds;
      try { creds = await getXenditCredentials(req); } catch {
        return NextResponse.json({ error: "Xendit not configured" }, { status: 503 });
      }
      const externalId = `axto-playbook-${Date.now()}`;
      const invoice = await createXenditInvoiceWithKey({
        apiKey: creds.secret_key, externalId, amount: amountUsd, payerEmail: email,
        description: `AXTO Playbook: ${itemName}`, metadata: meta, appUrl,
      });
      return NextResponse.json({ url: invoice.invoice_url });
    }

    if (gateway === "midtrans") {
      let creds;
      try { creds = await getMidtransCredentials(req); } catch {
        return NextResponse.json({ error: "Midtrans not configured" }, { status: 503 });
      }
      const orderId = `axto-playbook-${Date.now()}`;
      const base = creds.is_production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
      const auth = btoa(creds.server_key + ":");
      // usdToLocal already imported at the top of this file — no dynamic import needed
      const resp = await fetch(`${base}/snap/v1/transactions`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: await usdToLocal(amountUsd, "IDR", req) },
          customer_details: { email },
          custom_field1: meta.playbook_id || meta.bundle_id || "",
          custom_field2: email,
          custom_field3: JSON.stringify(meta),
          callbacks: { finish: `${appUrl}/playbooks?purchased=true`, unfinish: `${appUrl}/playbooks`, error: `${appUrl}/playbooks` },
        }),
      });
      const snap = await resp.json();
      if (!resp.ok) return NextResponse.json({ error: snap.error_messages?.[0] || "Midtrans error" }, { status: 502 });
      return NextResponse.json({ url: snap.redirect_url });
    }

    return NextResponse.json({ error: "Unknown gateway" }, { status: 400 });
  }

  const pkgInfo = PACKAGE_INFO[pkg];
  if (!pkgInfo) return NextResponse.json({ error: "Unknown package" }, { status: 400 });

  // ── Block checkout for not-for-sale packages ──────────────────────────────
  if (!isForSale(pkg)) {
    return NextResponse.json({ error: "This product is not yet available for purchase (Coming Soon)" }, { status: 403 });
  }

  const isLifetime = billing === "lifetime";
  const isYearly   = !isLifetime && billing !== "monthly";

  // ── LIVE PRICING: query DB first, fall back to PACKAGE_INFO if unavailable ─
  // This is what makes prices editable from the admin panel without a deploy.
  const livePrice = await getLivePrice(req, pkg);
  const amountUsd = isLifetime ? lifetimePrice(livePrice.price)
                  : isYearly   ? livePrice.price
                  :              livePrice.priceMonthly;

  const pkgName   = pkgInfo.name;
  const isBundle  = !!pkgInfo.isBundle;

  const meta: Record<string, string> = {
    pkg, email, name: name || email, organization: organization || "",
    billing: billing || "yearly", isBundle: String(isBundle),
    guardianPackage: pkgInfo.guardianPackage || "", orchestraPackage: pkgInfo.orchestraPackage || "",
    originalPriceUsd: String(amountUsd), source: source || "checkout",
  };

  if (gateway === "stripe") {
    let creds;
    try { creds = await getStripeCredentials(req); } catch {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }
    const stripe = new Stripe(creds.secret_key, { apiVersion: "2025-02-24.acacia" as any, httpClient: Stripe.createFetchHttpClient() });
    const priceMap: Record<string, string> = {
      lite: creds.price_lite, pro: creds.price_pro, shield: creds.price_shield, aegis: creds.price_aegis,
      orchestra_core: creds.price_orchestra_core, orchestra_scale: creds.price_orchestra_scale,
      orchestra_unlimited: creds.price_orchestra_unlimited,
    };
    const sessionParams: any = {
      mode: "payment", customer_email: email,
      success_url: `${appUrl}/portal/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/#pricing`, metadata: meta, payment_intent_data: { metadata: meta },
    };
    const priceId = !isBundle && priceMap[pkg];
    if (priceId) {
      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    } else {
      sessionParams.line_items = [{
        price_data: {
          currency: "usd", unit_amount: Math.round(amountUsd * 100),
          product_data: { name: `AXTO ${pkgName}`, description: `${isLifetime ? "Lifetime (perpetual)" : isYearly ? "Annual" : "Monthly"} license` },
        }, quantity: 1,
      }];
    }
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  }

  if (gateway === "paypal") {
    let creds;
    try { creds = await getPayPalCredentials(req); } catch {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });
    }
    const order = await createPayPalOrderWithCreds(creds, pkg, amountUsd, email, pkgName, billing || "yearly", meta);
    const approveLink = order.links?.find((l: any) => l.rel === "approve");
    return NextResponse.json({ url: approveLink?.href || order.links?.[1]?.href });
  }

  if (gateway === "xendit") {
    let creds;
    try { creds = await getXenditCredentials(req); } catch {
      return NextResponse.json({ error: "Xendit not configured" }, { status: 503 });
    }
    const externalId = `axto-${pkg}-${Date.now()}`;
    const invoice = await createXenditInvoiceWithKey({
      apiKey: creds.secret_key, externalId, amount: amountUsd, payerEmail: email,
      description: `AXTO ${pkgName}`, metadata: meta, appUrl,
    });
    return NextResponse.json({ url: invoice.invoice_url });
  }

  if (gateway === "midtrans") {
    let creds;
    try { creds = await getMidtransCredentials(req); } catch {
      return NextResponse.json({ error: "Midtrans not configured" }, { status: 503 });
    }
    const orderId = `axto-${pkg}-${Date.now()}`;
    const base = creds.is_production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const auth = btoa(creds.server_key + ":");
    const resp = await fetch(`${base}/snap/v1/transactions`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_details: {
              order_id: orderId,
              // Live IDR rate from open.er-api.com (cached 1h in KV)
              gross_amount: await usdToLocal(amountUsd, "IDR", req),
            },
        customer_details: { email }, custom_field1: pkg, custom_field2: email, custom_field3: JSON.stringify(meta),
        callbacks: { finish: `${appUrl}/portal/success?session_id=${orderId}`, unfinish: `${appUrl}/#pricing`, error: `${appUrl}/#pricing` },
      }),
    });
    const snap = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: snap.error_messages?.[0] || "Midtrans error" }, { status: 502 });
    return NextResponse.json({ url: snap.redirect_url });
  }

  // ── Cryptocurrency — same anonymous contract as the gateways above, but there
  // is no hosted redirect page: the response carries a payment intent that the
  // frontend renders inline (deposit address, exact amount, expiry). The
  // on-chain watcher cron (api/cron/crypto-watch) settles it and issues the
  // license automatically once a matching transfer is confirmed. ──────────────
  if (gateway === "crypto") {
    const methodId = String(body.methodId || "");
    if (!methodId) return NextResponse.json({ error: "Select a cryptocurrency" }, { status: 400 });

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }
    const method = await getEnabledMethod(db, methodId);
    if (!method) return NextResponse.json({ error: "Payment method unavailable" }, { status: 400 });
    if (!method.address) return NextResponse.json({ error: "Payment method not configured" }, { status: 503 });

    const rate = await rateUsdPerCoin(method.symbol);
    if (rate <= 0) return NextResponse.json({ error: "Exchange rate unavailable — try again shortly" }, { status: 503 });

    const orderId = uid("cpay");
    const intent = createCryptoIntent({
      method, orderId, userEmail: email, product: pkgInfo.product,
      packageCode: pkg, amountUsd, rateUsdPerCoin: rate,
    });

    await db.prepare(
      `INSERT INTO crypto_payments (id, order_id, method_id, user_email, product, package_code, amount_usd, amount_crypto, symbol, network, deposit_address, status, created_at, expires_at, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    ).bind(
      uid("cp"), orderId, method.id, email, pkgInfo.product, pkg,
      amountUsd, intent.amountCrypto, method.symbol, method.network, method.address,
      new Date(intent.createdAt).toISOString(), new Date(intent.expiresAt).toISOString(),
      JSON.stringify({ billing: billing || "yearly", name: name || email, organization: organization || "", source: source || "checkout" }),
    ).run();

    return NextResponse.json({
      intent: {
        orderId, symbol: method.symbol, network: method.network,
        depositAddress: method.address, amountCrypto: intent.amountCrypto,
        amountUsd, expiresAt: intent.expiresAt, minConfirmations: method.confirmations,
      },
    });
  }

  return NextResponse.json({ error: "Unknown gateway" }, { status: 400 });
}
