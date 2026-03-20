import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let creds;
  try { creds = await getStripeCredentials(req); } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(creds.secret_key, { apiVersion: "2025-02-24.acacia" as any, httpClient: Stripe.createFetchHttpClient() });
  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, creds.webhook_secret);
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata || {};
    const paymentRef = (session.payment_intent as string) || session.id;

    return processPayment(req, {
      pkg: m.pkg || "", email: m.email || session.customer_email || "",
      name: m.name || "", organization: m.organization || "",
      billing: m.billing || "yearly", isBundle: m.isBundle === "true",
      guardianPackage: m.guardianPackage || "", orchestraPackage: m.orchestraPackage || "",
      amountUsd: Number(m.originalPriceUsd || m.amount_usd) || (session.amount_total || 0) / 100,
      paymentRef, gateway: "stripe",
      source: m.source || "", playbookId: m.playbook_id || "", bundleId: m.bundle_id || "",
    });
  }
  return NextResponse.json({ received: true });
}
