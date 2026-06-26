/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getXenditCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";
import { localToUsd } from "@/lib/fx";

/**
 * Xendit webhook handler — standalone lib version (unused, kept for reference).
 * The actual route handler is in app/api/webhooks/xendit/route.ts
 */
export async function handleXenditWebhook(req: NextRequest) {
  let creds;
  try { creds = await getXenditCredentials(req); } catch {
    return NextResponse.json({ error: "Xendit not configured" }, { status: 503 });
  }

  const token = req.headers.get("x-callback-token");
  if (token !== creds.webhook_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as any;
  if (body.status !== "PAID") return NextResponse.json({ ok: true });

  const meta = body.metadata || {};

  // Amount resolution: prefer originalPriceUsd stored in metadata (always USD).
  // If missing (e.g. IDR invoice), use live rate to convert.
  let amountUsd: number;
  if (meta.originalPriceUsd) {
    amountUsd = Number(meta.originalPriceUsd);
  } else {
    const rawAmount = Number(body.amount || 0);
    const currency  = (body.currency || "USD").toUpperCase();
    amountUsd = currency === "USD"
      ? rawAmount
      : await localToUsd(rawAmount, currency, req);
  }

  return processPayment(req, {
    pkg:              meta.pkg || body.external_id,
    email:            meta.email || body.payer_email,
    name:             meta.name || meta.email || "",
    organization:     meta.organization || "",
    billing:          meta.billing || "yearly",
    isBundle:         meta.isBundle === "true",
    guardianPackage:  meta.guardianPackage || "",
    orchestraPackage: meta.orchestraPackage || "",
    amountUsd,
    paymentRef:       body.external_id,
    gateway:          "xendit",
  });
}
