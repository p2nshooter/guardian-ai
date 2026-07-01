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
import { getMidtransCredentials } from "@/lib/gateways";
import { processPayment } from "@/lib/webhooks/shared";
import { localToUsd } from "@/lib/fx";


export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    order_id, transaction_status, fraud_status,
    gross_amount, signature_key, status_code,
  } = body;

  // ── Load credentials ─────────────────────────────────────────────────
  let creds;
  try { creds = await getMidtransCredentials(req); } catch {
    return NextResponse.json({ error: "Midtrans not configured" }, { status: 503 });
  }

  // ── Verify HMAC-SHA512 signature ─────────────────────────────────────
  if (signature_key) {
    const encoder = new TextEncoder();
    const raw = `${order_id}${status_code}${gross_amount}${creds.server_key}`;
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(creds.server_key),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
    );
    const hash = await crypto.subtle.sign("HMAC", key, encoder.encode(raw));
    const expected = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    if (signature_key !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  // ── Only process successful transactions ─────────────────────────────
  const isSuccess =
    (transaction_status === "settlement" || transaction_status === "capture") &&
    (fraud_status === "accept" || !fraud_status);

  if (!isSuccess) {
    return NextResponse.json({ received: true });
  }

  // ── Extract metadata & process payment ───────────────────────────────
  let meta: Record<string, string> = {};
  try { meta = JSON.parse(body.custom_field3 || "{}"); } catch {}

  const pkg   = body.custom_field1 || meta.pkg || "";
  const email = body.custom_field2 || meta.email || "";

  if (!email) {
    return NextResponse.json({ received: true });
  }

  const amountIdr = Number(gross_amount || 0);
  const amountUsd = Number(meta.originalPriceUsd || meta.amount_usd) ||
    (amountIdr > 0 ? await localToUsd(amountIdr, "IDR", req) : 0);

  return processPayment(req, {
    pkg,
    email,
    name: meta.name || "",
    organization: meta.organization || "",
    billing: meta.billing || "yearly",
    isBundle: meta.isBundle === "true",
    guardianPackage: meta.guardianPackage || "",
    orchestraPackage: meta.orchestraPackage || "",
    amountUsd,
    paymentRef: order_id || body.transaction_id || "",
    gateway: "midtrans",
    source: meta.source || "",
    playbookId: meta.playbook_id || "",
    bundleId: meta.bundle_id || "",
    referralCode: meta.referralCode || "",
  });
}
