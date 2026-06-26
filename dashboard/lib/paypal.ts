/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export async function createPayPalOrderWithCreds(
  creds: { client_id: string; client_secret: string; mode: string },
  pkg: string, amountUsd: number, email: string, pkgName: string,
  billing: string, meta: Record<string, string>
) {
  const base = creds.mode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  // Get access token
  const authRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.client_id}:${creds.client_secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const authData = await authRes.json();
  if (!authRes.ok) throw new Error(authData.error_description || "PayPal auth failed");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  // Create order
  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
        description: `AXTO ${pkgName} — ${billing === "yearly" ? "Annual" : "Monthly"} License`,
        custom_id: JSON.stringify(meta),
      }],
      application_context: {
        brand_name: "AXTO",
        return_url: `${appUrl}/api/webhooks/paypal?action=capture`,
        cancel_url: `${appUrl}/#pricing`,
        user_action: "PAY_NOW",
      },
    }),
  });

  const order = await orderRes.json();
  if (!orderRes.ok) throw new Error(order.message || "PayPal order creation failed");
  return order;
}
