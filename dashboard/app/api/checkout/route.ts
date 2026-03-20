import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PACKAGE_INFO } from "@/lib/stripe";
import { getStripeCredentials, getPayPalCredentials, getXenditCredentials, getMidtransCredentials } from "@/lib/gateways";
import { createPayPalOrderWithCreds } from "@/lib/paypal";
import { createXenditInvoiceWithKey } from "@/lib/xendit";
import { usdToLocal } from "@/lib/fx";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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
      const { usdToLocal } = await import("@/lib/fx");
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

  const isYearly = billing !== "monthly";
  const amountUsd = isYearly ? pkgInfo.price : pkgInfo.priceMonthly;
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
          product_data: { name: `AXTO ${pkgName}`, description: `${isYearly ? "Annual" : "Monthly"} license` },
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

  return NextResponse.json({ error: "Unknown gateway" }, { status: 400 });
}
