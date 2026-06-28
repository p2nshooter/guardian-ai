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
import { getXenditCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";
import { localToUsd } from "@/lib/fx";


export async function POST(req: NextRequest) {
  let creds;
  try { creds = await getXenditCredentials(req); } catch {
    return NextResponse.json({ error: "Xendit not configured" }, { status: 503 });
  }

  const callbackToken = req.headers.get("x-callback-token") || "";
  if (creds.webhook_token && callbackToken !== creds.webhook_token) {
    return NextResponse.json({ error: "Invalid callback token" }, { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.status !== "PAID" && body.status !== "SETTLED") {
    return NextResponse.json({ received: true });
  }

  const meta = body.metadata || {};

  // Always prefer originalPriceUsd stored in metadata (set by /api/checkout, always USD).
  // Fallback: convert body.amount using live rate for the invoice currency.
  let amountUsd: number;
  if (meta.originalPriceUsd && Number(meta.originalPriceUsd) > 0) {
    amountUsd = Number(meta.originalPriceUsd);
  } else {
    const rawAmount = Number(body.amount || 0);
    const currency  = (body.currency || "USD").toUpperCase();
    amountUsd = currency === "USD"
      ? rawAmount
      : await localToUsd(rawAmount, currency, req);
  }

  if (!meta.email) {
    return NextResponse.json({ received: true });
  }

  return processPayment(req, {
    pkg:              meta.pkg || "",
    email:            meta.email,
    name:             meta.name || meta.email || "",
    organization:     meta.organization || "",
    billing:          meta.billing || "yearly",
    isBundle:         meta.isBundle === "true",
    guardianPackage:  meta.guardianPackage || "",
    orchestraPackage: meta.orchestraPackage || "",
    amountUsd,
    paymentRef:       body.external_id || body.id || "",
    gateway:          "xendit",
    source:           meta.source || "",
    playbookId:       meta.playbook_id || "",
    bundleId:         meta.bundle_id || "",
  });
}
