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
import { getPayPalCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";


async function verifyPayPalWebhook(
  req: NextRequest, rawBody: string,
  creds: { client_id: string; client_secret: string; webhook_id?: string; mode?: string },
): Promise<boolean> {
  // MANDATORY: an unconfigured webhook_id must reject every request, not
  // silently skip verification -- this endpoint issues real licenses, so a
  // gateway left partially configured can't mean "trust anything that POSTs here".
  if (!creds.webhook_id) return false;
  const base = (creds.mode === "live" || creds.mode === "production")
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${creds.client_id}:${creds.client_secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const { access_token } = await tokenRes.json() as { access_token: string };
  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo:         req.headers.get("paypal-auth-algo") || "",
      cert_url:          req.headers.get("paypal-cert-url") || "",
      transmission_id:   req.headers.get("paypal-transmission-id") || "",
      transmission_sig:  req.headers.get("paypal-transmission-sig") || "",
      transmission_time: req.headers.get("paypal-transmission-time") || "",
      webhook_id: creds.webhook_id,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!verifyRes.ok) return false;
  const result = await verifyRes.json() as { verification_status?: string };
  return result.verification_status === "SUCCESS";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: any;
  try { body = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let creds;
  try { creds = await getPayPalCredentials(req); } catch {
    return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });
  }

  const verified = await verifyPayPalWebhook(req, rawBody, creds);
  if (!verified) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const eventType = body.event_type;
  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = body.resource || {};
    let meta: Record<string, string> = {};
    try {
      const customId = resource.purchase_units?.[0]?.custom_id || resource.custom_id || "";
      if (customId) meta = JSON.parse(customId);
    } catch {}

    const amount = Number(resource.purchase_units?.[0]?.amount?.value || resource.amount?.value || 0);
    const paymentRef = resource.id || body.id || "";

    if (meta.email) {
      return processPayment(req, {
        pkg: meta.pkg || "", email: meta.email, name: meta.name || "",
        organization: meta.organization || "", billing: meta.billing || "yearly",
        isBundle: meta.isBundle === "true",
        guardianPackage: meta.guardianPackage || "", orchestraPackage: meta.orchestraPackage || "",
        amountUsd: amount || Number(meta.originalPriceUsd || meta.amount_usd) || 0,
        paymentRef, gateway: "paypal",
        source: meta.source || "", playbookId: meta.playbook_id || "", bundleId: meta.bundle_id || "",
        referralCode: meta.referralCode || "",
      });
    }
  }
  return NextResponse.json({ received: true });
}
