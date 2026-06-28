/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * Midtrans webhook helpers — signature verification utility.
 * The actual route handler is in app/api/webhooks/midtrans/route.ts
 */

/**
 * Verify Midtrans notification signature (HMAC-SHA512).
 * @see https://docs.midtrans.com/reference/receiving-notifications
 */
export async function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): Promise<boolean> {
  const { orderId, statusCode, grossAmount, serverKey, signatureKey } = params;
  if (!signatureKey) return false;

  const encoder = new TextEncoder();
  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(serverKey),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const hash = await crypto.subtle.sign("HMAC", key, encoder.encode(raw));
  const expected = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  return signatureKey === expected;
}
