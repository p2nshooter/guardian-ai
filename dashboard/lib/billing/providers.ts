/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Gateway adapters — plain fetch() against each provider's REST API (no SDKs,
 * so the edge bundle stays small). Every adapter:
 *   • createPayment(): returns the hosted-checkout URL for an order
 *   • verify…():       authenticates the provider's webhook/notification
 * The PRICE always comes from our own order row, never from the browser.
 * ============================================================================ */
import { absoluteUrl, SITE } from "../site";
import { secret } from "../db";
import { ENV_KEY, CRYPTO_ASSETS, bankAccounts, cardRoute, gatewayCredsFor, type GatewayId } from "./gateways";

/** The credential set's environment (Admin → Payments → Sandbox / Live): sandbox = the provider's test API. */
const isSandbox = (c: Record<string, string>) => c[ENV_KEY] === "sandbox";

export interface OrderForPayment {
  id: string;
  email: string;
  description: string;   // e.g. "AXTO Pro — yearly"
  amountUsd: number;
  amountIdr: number;
  returnPath?: string;   // portal page to come back to (default /app/billing)
}

const enc = (s: string) => new TextEncoder().encode(s);
const toHex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmacHex(alg: "SHA-256" | "SHA-512", key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: alg }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", k, enc(msg)));
}
async function shaHex(alg: "SHA-256" | "SHA-512", msg: string): Promise<string> {
  return toHex(await crypto.subtle.digest(alg, enc(msg)));
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const successUrl = (o: OrderForPayment) => absoluteUrl(`${o.returnPath || "/app/billing"}?paid=${encodeURIComponent(o.id)}`);
const cancelUrl = (o: OrderForPayment) => absoluteUrl(`${o.returnPath || "/app/billing"}?canceled=1`);

// ── Stripe ────────────────────────────────────────────────────────────────
export async function stripeCreate(c: Record<string, string>, o: OrderForPayment): Promise<string> {
  const body = new URLSearchParams({
    mode: "payment",
    customer_email: o.email,
    client_reference_id: o.id,
    success_url: successUrl(o),
    cancel_url: cancelUrl(o),
    "metadata[order_id]": o.id,
    "payment_intent_data[metadata][order_id]": o.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(o.amountUsd * 100)),
    "line_items[0][price_data][product_data][name]": o.description,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j: any = await r.json();
  if (!r.ok || !j.url) throw new Error(j?.error?.message || "Stripe checkout failed");
  return j.url;
}

/** Verify Stripe-Signature (t=…,v1=…) with 5-minute tolerance. */
export async function stripeVerify(payload: string, header: string | null, whsec: string): Promise<boolean> {
  if (!header || !whsec) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t, v1 = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = await hmacHex("SHA-256", whsec, `${t}.${payload}`);
  return v1.some((sig) => safeEqual(sig, expected));
}

// ── PayPal ────────────────────────────────────────────────────────────────
// Live is fixed. Sandbox can point at a local stand-in (PAYPAL_SANDBOX_API) — the
// end-to-end tests run the whole PayPal flow offline that way; Live never can.
const paypalBase = (c: Record<string, string>) =>
  isSandbox(c) ? (secret("PAYPAL_SANDBOX_API") || "https://api-m.sandbox.paypal.com").replace(/\/+$/, "") : "https://api-m.paypal.com";

async function paypalToken(c: Record<string, string>): Promise<string> {
  const r = await fetch(`${paypalBase(c)}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.client_id}:${c.client_secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await r.json();
  if (!r.ok || !j.access_token) throw new Error("PayPal authentication failed");
  return j.access_token;
}

export async function paypalCreate(c: Record<string, string>, o: OrderForPayment): Promise<{ url: string; ref: string }> {
  const token = await paypalToken(c);
  const r = await fetch(`${paypalBase(c)}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: o.id, custom_id: o.id, description: o.description,
        amount: { currency_code: "USD", value: o.amountUsd.toFixed(2) } }],
      application_context: {
        brand_name: SITE.name, user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING",
        return_url: absoluteUrl(`/api/billing/paypal-return?order=${encodeURIComponent(o.id)}`),
        cancel_url: cancelUrl(o),
      },
    }),
  });
  const j: any = await r.json();
  const url = j?.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!r.ok || !url) throw new Error(j?.message || "PayPal checkout failed");
  return { url, ref: j.id };
}

/** Capture an approved PayPal order. Returns captured USD amount and our order id. */
/**
 * One PayPal payout (affiliate commissions, docs/BUSINESS-MASTER-BLUEPRINT.md §7.4). The batch id is our payout
 * id, so PayPal itself refuses a second batch with the same id: a retry can never pay twice. Needs a PayPal app
 * with Payouts enabled; otherwise PayPal answers 403 and the payout waits for the owner's one approval instead.
 */
export async function paypalPayout(c: Record<string, string>, p: { id: string; email: string; amountUsd: number; note: string }): Promise<{ batchId: string; status: string }> {
  const r = await fetch(`${paypalBase(c)}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await paypalToken(c)}`, "Content-Type": "application/json", "PayPal-Request-Id": p.id },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: p.id, email_subject: "You have a payout", email_message: p.note },
      items: [{ recipient_type: "EMAIL", receiver: p.email, note: p.note, sender_item_id: p.id, amount: { value: p.amountUsd.toFixed(2), currency: "USD" } }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`PayPal payout refused (${r.status}${j?.name ? ` ${j.name}` : ""})`);
  return { batchId: String(j?.batch_header?.payout_batch_id || ""), status: String(j?.batch_header?.batch_status || "PENDING") };
}

export async function paypalCapture(c: Record<string, string>, paypalOrderId: string): Promise<{ ok: boolean; amount: number; orderId: string; captureId: string }> {
  const token = await paypalToken(c);
  const r = await fetch(`${paypalBase(c)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const j: any = await r.json();
  let unit = j?.purchase_units?.[0];
  // Already captured → read the order instead.
  if (!r.ok && j?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
    const g = await fetch(`${paypalBase(c)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const gj: any = await g.json();
    unit = gj?.purchase_units?.[0];
    j.status = gj?.status;
  }
  const cap = unit?.payments?.captures?.[0];
  return {
    ok: (j.status === "COMPLETED") && cap?.status === "COMPLETED",
    amount: Number(cap?.amount?.value || 0),
    orderId: unit?.custom_id || unit?.reference_id || "",
    captureId: cap?.id || paypalOrderId,
  };
}

/** Events app/api/webhooks/paypal acts on. */
export const PAYPAL_WEBHOOK_EVENTS = ["PAYMENT.CAPTURE.COMPLETED"];

/**
 * Make sure the PayPal app behind these credentials has this site's webhook,
 * so nobody creates one by hand in the PayPal dashboard (owner, 14 Oct 2026).
 * Reuses a webhook already pointing at the URL (PayPal refuses duplicates) and
 * adds a missing event to it; otherwise creates one. Returns its id.
 */
export async function paypalEnsureWebhook(c: Record<string, string>, url: string): Promise<{ id: string; created: boolean }> {
  const token = await paypalToken(c);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const target = url.replace(/\/+$/, "");
  const list = await fetch(`${paypalBase(c)}/v1/notifications/webhooks`, { headers, signal: AbortSignal.timeout(20_000) });
  const lj: any = await list.json().catch(() => ({}));
  if (!list.ok) throw new Error(`PayPal could not list webhooks (HTTP ${list.status})`);
  const mine = (lj?.webhooks || []).find((w: any) => String(w?.url || "").replace(/\/+$/, "") === target);
  if (mine?.id) {
    const have = new Set<string>((mine.event_types || []).map((e: any) => String(e?.name || "")));
    if (!have.has("*") && PAYPAL_WEBHOOK_EVENTS.some((e) => !have.has(e))) {
      const value = [...new Set([...have, ...PAYPAL_WEBHOOK_EVENTS])].filter(Boolean).map((name) => ({ name }));
      const r = await fetch(`${paypalBase(c)}/v1/notifications/webhooks/${encodeURIComponent(mine.id)}`, {
        method: "PATCH", headers, body: JSON.stringify([{ op: "replace", path: "/event_types", value }]), signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) throw new Error(`PayPal could not update the webhook (HTTP ${r.status})`);
    }
    return { id: String(mine.id), created: false };
  }
  const r = await fetch(`${paypalBase(c)}/v1/notifications/webhooks`, {
    method: "POST", headers, signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ url: target, event_types: PAYPAL_WEBHOOK_EVENTS.map((name) => ({ name })) }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j?.id) {
    const issue = j?.details?.[0]?.issue || j?.name || "";
    throw new Error(issue === "WEBHOOK_NUMBER_LIMIT_EXCEEDED"
      ? "this PayPal app already has 10 webhooks — delete an unused one in the PayPal dashboard, then save again"
      : `PayPal could not create the webhook (HTTP ${r.status}${issue ? `, ${issue}` : ""})`);
  }
  return { id: String(j.id), created: true };
}

/** Verify a PayPal webhook through PayPal's verification API. */
export async function paypalVerifyWebhook(c: Record<string, string>, headers: Headers, event: any): Promise<boolean> {
  if (!c.webhook_id) return false;
  const token = await paypalToken(c);
  const r = await fetch(`${paypalBase(c)}/v1/notifications/verify-webhook-signature`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"), webhook_id: c.webhook_id, webhook_event: event,
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  return j?.verification_status === "SUCCESS";
}

// ── Xendit (IDR) ──────────────────────────────────────────────────────────
export async function xenditCreate(c: Record<string, string>, o: OrderForPayment, opts: { paymentMethods?: string[]; currency?: "IDR" | "USD" } = {}): Promise<{ url: string; ref: string }> {
  const usd = opts.currency === "USD";
  const r = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.secret_key}:`)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: o.id, amount: usd ? Number(o.amountUsd.toFixed(2)) : o.amountIdr, currency: usd ? "USD" : "IDR", payer_email: o.email, description: o.description,
      invoice_duration: 86400, success_redirect_url: successUrl(o), failure_redirect_url: cancelUrl(o),
      ...(opts.paymentMethods?.length ? { payment_methods: opts.paymentMethods } : {}),
    }),
  });
  const j: any = await r.json();
  if (!r.ok || !j.invoice_url) throw new Error(j?.message || "Xendit checkout failed");
  return { url: j.invoice_url, ref: j.id };
}

export function xenditVerify(headerToken: string | null, c: Record<string, string>): boolean {
  return !!headerToken && !!c.webhook_token && safeEqual(headerToken, c.webhook_token);
}

// ── Midtrans Snap (IDR) ───────────────────────────────────────────────────
const midtransBase = (c: Record<string, string>) =>
  isSandbox(c) ? "https://app.sandbox.midtrans.com" : "https://app.midtrans.com";
const midtransApi = (c: Record<string, string>) => (isSandbox(c) ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com");

export async function midtransCreate(c: Record<string, string>, o: OrderForPayment, opts: { enabledPayments?: string[] } = {}): Promise<string> {
  const r = await fetch(`${midtransBase(c)}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.server_key}:`)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: o.id, gross_amount: o.amountIdr },
      item_details: [{ id: o.id, price: o.amountIdr, quantity: 1, name: o.description.slice(0, 50) }],
      customer_details: { email: o.email },
      callbacks: { finish: successUrl(o) },
      ...(opts.enabledPayments?.length ? { enabled_payments: opts.enabledPayments, credit_card: { secure: true } } : {}),
    }),
  });
  const j: any = await r.json();
  if (!r.ok || !j.redirect_url) throw new Error(j?.error_messages?.[0] || "Midtrans checkout failed");
  return j.redirect_url;
}

/** signature_key = SHA512(order_id + status_code + gross_amount + server_key) */
export async function midtransVerify(n: any, c: Record<string, string>): Promise<boolean> {
  if (!n?.signature_key || !c.server_key) return false;
  const expected = await shaHex("SHA-512", `${n.order_id}${n.status_code}${n.gross_amount}${c.server_key}`);
  return safeEqual(String(n.signature_key), expected);
}

// ── NOWPayments (crypto) ──────────────────────────────────────────────────
const nowBase = (c: Record<string, string>) => (isSandbox(c) ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io");
export async function nowpaymentsCreate(c: Record<string, string>, o: OrderForPayment): Promise<{ url: string; ref: string }> {
  const r = await fetch(`${nowBase(c)}/v1/invoice`, {
    method: "POST",
    headers: { "x-api-key": c.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: o.amountUsd, price_currency: "usd", order_id: o.id, order_description: o.description,
      ipn_callback_url: absoluteUrl("/api/webhooks/nowpayments"), success_url: successUrl(o), cancel_url: cancelUrl(o),
    }),
  });
  const j: any = await r.json();
  if (!r.ok || !j.invoice_url) throw new Error(j?.message || "Crypto checkout failed");
  return { url: j.invoice_url, ref: String(j.id || "") };
}

function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((a: any, k) => { a[k] = sortKeys(v[k]); return a; }, {});
  return v;
}

/** x-nowpayments-sig = HMAC-SHA512(JSON with keys sorted, ipn_secret) */
export async function nowpaymentsVerify(body: any, sig: string | null, c: Record<string, string>): Promise<boolean> {
  if (!sig || !c.ipn_secret) return false;
  const expected = await hmacHex("SHA-512", c.ipn_secret, JSON.stringify(sortKeys(body)));
  return safeEqual(sig.toLowerCase(), expected);
}

// ── Test connection (Admin → Payments) ────────────────────────────────────
// A harmless authenticated call per provider: nothing is charged or created.
export interface ConnectionTest { ok: boolean; message: string }

async function probe(url: string, init: RequestInit): Promise<{ status: number; json: any }> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const ADDRESS: Record<string, RegExp> = {
  usdt_trc20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, btc: /^(bc1[0-9a-z]{25,62}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
  usdt_erc20: /^0x[0-9a-fA-F]{40}$/, usdt_bep20: /^0x[0-9a-fA-F]{40}$/, usdc_erc20: /^0x[0-9a-fA-F]{40}$/, eth: /^0x[0-9a-fA-F]{40}$/,
  sol: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};

export async function testConnection(id: GatewayId, c: Record<string, string>): Promise<ConnectionTest> {
  const env = isSandbox(c) ? "Sandbox" : "Live";
  try {
    switch (id) {
      case "stripe": {
        const r = await probe("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${c.secret_key}` } });
        if (r.status === 200) return { ok: true, message: `${env} key accepted by Stripe${r.json?.livemode === !isSandbox(c) ? "" : " — but Stripe reports a different mode than this tab"}.` };
        return { ok: false, message: `Stripe refused the key (HTTP ${r.status}): ${r.json?.error?.message || "check the secret key"}.` };
      }
      case "paypal": {
        await paypalToken(c);
        return { ok: true, message: `${env} client ID and secret accepted by PayPal.${c.webhook_id ? "" : " Add the Webhook ID so PayPal notifications can be verified."}` };
      }
      case "xendit": {
        const r = await probe("https://api.xendit.co/balance", { headers: { Authorization: `Basic ${btoa(`${c.secret_key}:`)}` } });
        return r.status === 200 ? { ok: true, message: `${env} key accepted by Xendit.` } : { ok: false, message: `Xendit refused the key (HTTP ${r.status}): ${r.json?.message || "check the secret key"}.` };
      }
      case "midtrans": {
        // Status of an order that cannot exist: 404 = authenticated, 401 = wrong key.
        const r = await probe(`${midtransApi(c)}/v2/axto-connection-test-${Date.now()}/status`, { headers: { Authorization: `Basic ${btoa(`${c.server_key}:`)}`, Accept: "application/json" } });
        const code = String(r.json?.status_code || r.status);
        return code === "404" ? { ok: true, message: `${env} server key accepted by Midtrans.` } : { ok: false, message: `Midtrans refused the key (${code}): ${r.json?.status_message || "check the server key"}.` };
      }
      case "nowpayments": {
        const r = await probe(`${nowBase(c)}/v1/merchant/coins`, { headers: { "x-api-key": c.api_key } });
        return r.status === 200 ? { ok: true, message: `${env} API key accepted by NOWPayments.` } : { ok: false, message: `NOWPayments refused the key (HTTP ${r.status}): ${r.json?.message || "check the API key"}.` };
      }
      case "crypto": {
        const bad = CRYPTO_ASSETS.filter((a) => c[a.key] && !ADDRESS[a.key]?.test(String(c[a.key]).trim())).map((a) => `${a.asset} ${a.network}`);
        const set = CRYPTO_ASSETS.filter((a) => c[a.key]).length;
        return bad.length ? { ok: false, message: `These addresses don't look valid: ${bad.join(", ")}.` } : { ok: true, message: `${set} wallet address${set === 1 ? "" : "es"} look valid. Send a small test transfer before going live.` };
      }
      case "card": {
        const route = cardRoute(c);
        if (!route) return { ok: false, message: "Set the processor to xendit or midtrans." };
        const pc = await gatewayCredsFor(route.processor, isSandbox(c) ? "sandbox" : "live");
        if (!pc) return { ok: false, message: `Add the ${route.processor === "xendit" ? "Xendit" : "Midtrans"} ${env} credentials first (its own card on this page).` };
        const t = await testConnection(route.processor, pc);
        return { ok: t.ok, message: `Cards run through ${route.processor === "xendit" ? "Xendit" : "Midtrans"} in ${route.currency}. ${t.message}${t.ok ? " Make sure card payments are enabled and your BNI account is the settlement account in that dashboard." : ""}` };
      }
      case "manual": {
        const accounts = bankAccounts(c);
        if (!accounts.length) {
          return { ok: !!c.instructions, message: c.instructions ? "Custom instructions only — customers see your text at checkout." : "Add the holder name and at least one account number (IDR, USD or EUR)." };
        }
        const intl = accounts.some((a) => a.currency !== "IDR");
        return { ok: true, message: `Bank details are complete for ${accounts.map((a) => a.currency).join(", ")}. Customers choose the currency at checkout and see the exact amount for it; you confirm each transfer in Orders.${intl && !c.swift_code ? " Add the SWIFT code (BNINIDJA) — international payers need it." : ""}` };
      }
    }
  } catch (e: any) {
    return { ok: false, message: `Could not reach the provider: ${String(e?.message || e).slice(0, 160)}` };
  }
  return { ok: false, message: "Unknown payment method." };
}

