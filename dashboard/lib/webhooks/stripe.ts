/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripeCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";
import Stripe from "stripe";

/**
 * Stripe webhook handler — standalone lib version (unused, kept for reference).
 * The actual route handler is in app/api/webhooks/stripe/route.ts
 */
export async function handleStripeWebhook(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;
  let creds; try { creds = await getStripeCredentials(req); } catch { return NextResponse.json({ error:"Stripe not configured" }, { status:503 }); }
  const stripe = new Stripe(creds.secret_key, { apiVersion:"2025-02-24.acacia", httpClient: Stripe.createFetchHttpClient() });
  let event; try { event = stripe.webhooks.constructEvent(body, sig, creds.webhook_secret); } catch { return NextResponse.json({ error:"Invalid signature" }, { status:400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received:true });
  const s = event.data.object as any;
  const m = s.metadata || {};
  return processPayment(req, { pkg:m.pkg, email:m.email, name:m.name||m.email, organization:m.organization||"", billing:m.billing||"yearly", isBundle:m.isBundle==="true", guardianPackage:m.guardianPackage||"", orchestraPackage:m.orchestraPackage||"", amountUsd:(s.amount_total||0)/100, paymentRef:s.id, gateway:"stripe" });
}

