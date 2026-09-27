/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Gateway adapters — plain fetch() against each provider's REST API (no SDKs,
 * so the edge bundle stays small). Every adapter:
 *   • createPayment(): returns the hosted-checkout URL for an order
 *   • verify…():       authenticates the provider's webhook/notification
 * The PRICE always comes from our own order row, never from the browser.
 * ============================================================================ */
import { absoluteUrl, SITE } from "../site";

export interface OrderForPayment {
  id: string;
  email: string;
  description: string;   // e.g. "AXTO Pro — yearly"
  amountUsd: number;
  amountIdr: number;
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

const successUrl = (id: string) => absoluteUrl(`/app/billing?paid=${encodeURIComponent(id)}`);
const cancelUrl = () => absoluteUrl(`/app/billing?canceled=1`);

// ── Stripe ────────────────────────────────────────────────────────────────
export async function stripeCreate(c: Record<string, string>, o: OrderForPayment): Promise<string> {
  const body = new URLSearchParams({
    mode: "payment",
    customer_email: o.email,
    client_reference_id: o.id,
    success_url: successUrl(o.id),
    cancel_url: cancelUrl(),
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
const paypalBase = (c: Record<string, string>) =>
  (c.mode || "live").toLowerCase() === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function paypalToken(c: Record<string, string>): Promise<string> {
  const r = await fetch(`${paypalBase(c)}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.client_id}:${c.client_secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
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
        cancel_url: cancelUrl(),
      },
    }),
  });
  const j: any = await r.json();
  const url = j?.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!r.ok || !url) throw new Error(j?.message || "PayPal checkout failed");
  return { url, ref: j.id };
}

/** Capture an approved PayPal order. Returns captured USD amount and our order id. */
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
export async function xenditCreate(c: Record<string, string>, o: OrderForPayment): Promise<{ url: string; ref: string }> {
  const r = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.secret_key}:`)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: o.id, amount: o.amountIdr, currency: "IDR", payer_email: o.email, description: o.description,
      invoice_duration: 86400, success_redirect_url: successUrl(o.id), failure_redirect_url: cancelUrl(),
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
  String(c.is_production).toLowerCase() === "true" ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";

export async function midtransCreate(c: Record<string, string>, o: OrderForPayment): Promise<string> {
  const r = await fetch(`${midtransBase(c)}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${c.server_key}:`)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: o.id, gross_amount: o.amountIdr },
      item_details: [{ id: o.id, price: o.amountIdr, quantity: 1, name: o.description.slice(0, 50) }],
      customer_details: { email: o.email },
      callbacks: { finish: successUrl(o.id) },
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
export async function nowpaymentsCreate(c: Record<string, string>, o: OrderForPayment): Promise<{ url: string; ref: string }> {
  const r = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": c.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: o.amountUsd, price_currency: "usd", order_id: o.id, order_description: o.description,
      ipn_callback_url: absoluteUrl("/api/webhooks/nowpayments"), success_url: successUrl(o.id), cancel_url: cancelUrl(),
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
