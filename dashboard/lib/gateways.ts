/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { NextRequest } from "next/server";
import { dbFirst, getDB } from "@/lib/db";
import { decryptObj } from "@/lib/gateway-crypto";

async function fetchGateway(name: string, req?: NextRequest): Promise<Record<string, string>> {
  const db  = getDB(req);
  const row = await dbFirst<{ credentials_enc: string; is_active: number }>(
    db, `SELECT credentials_enc, is_active FROM payment_gateways WHERE gateway = ?`, [name]
  );
  if (!row)                 throw new Error(`Gateway "${name}" not configured yet.`);
  if (!row.is_active)       throw new Error(`Gateway "${name}" is not active.`);
  if (!row.credentials_enc) throw new Error(`Gateway "${name}" has no credentials.`);
  return await decryptObj<Record<string, string>>(row.credentials_enc);
}

export async function getStripeCredentials(req?: NextRequest) {
  const c = await fetchGateway("stripe", req);
  return {
    secret_key: c.secret_key || "", webhook_secret: c.webhook_secret || "",
    price_lite: c.price_lite || "", price_pro: c.price_pro || "",
    price_shield: c.price_shield || "", price_aegis: c.price_aegis || "",
    price_orchestra_core: c.price_orchestra_core || "",
    price_orchestra_scale: c.price_orchestra_scale || "",
    price_orchestra_unlimited: c.price_orchestra_unlimited || "",
  };
}

export async function getPayPalCredentials(req?: NextRequest) {
  const c = await fetchGateway("paypal", req);
  return { client_id: c.client_id || "", client_secret: c.client_secret || "", mode: c.mode || "sandbox", webhook_id: c.webhook_id || "" };
}

export async function getXenditCredentials(req?: NextRequest) {
  const c = await fetchGateway("xendit", req);
  return { secret_key: c.secret_key || "", webhook_token: c.webhook_token || "" };
}

export async function getMidtransCredentials(req?: NextRequest) {
  const c = await fetchGateway("midtrans", req);
  return { server_key: c.server_key || "", client_key: c.client_key || "", is_production: c.is_production === "true" };
}
