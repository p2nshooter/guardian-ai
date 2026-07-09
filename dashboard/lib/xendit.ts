/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export async function createXenditInvoiceWithKey(params: {
  apiKey: string; externalId: string; amount: number; payerEmail: string;
  description: string; metadata: Record<string, string>; appUrl: string;
}) {
  const { apiKey, externalId, amount, payerEmail, description, metadata, appUrl } = params;

  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      payer_email: payerEmail,
      description,
      currency: "USD",
      success_redirect_url: `${appUrl}/portal/success?session_id=${externalId}`,
      failure_redirect_url: `${appUrl}/#pricing`,
      metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Xendit invoice creation failed");
  return data;
}
