/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { processPayment } from "@/lib/webhooks/shared";

/**
 * PayPal webhook handler — standalone lib version (unused, kept for reference).
 * The actual route handler is in app/api/webhooks/paypal/route.ts
 */
export async function handlePaypalWebhook(req: NextRequest) {
  const event = await req.json() as any;
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED" && event.event_type !== "CHECKOUT.ORDER.APPROVED") return NextResponse.json({ ok:true });
  const resource = event.resource;
  const orderId  = resource.id || resource.supplementary_data?.related_ids?.order_id;
  let meta: any = {}; try { meta = JSON.parse(resource.purchase_units?.[0]?.custom_id || resource.custom_id || "{}"); } catch {}
  return processPayment(req, { pkg:meta.pkg, email:meta.email, name:meta.name||meta.email, organization:meta.organization||"", billing:meta.billing||"yearly", isBundle:meta.isBundle==="true", guardianPackage:meta.guardianPackage||"", orchestraPackage:meta.orchestraPackage||"", amountUsd:Number(meta.originalPriceUsd||0), paymentRef:orderId, gateway:"paypal" });
}
