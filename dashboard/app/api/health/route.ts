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
import { getDB, dbFirst } from "@/lib/db";


export async function GET(req: NextRequest) {
  const checks: Record<string, any> = { timestamp: new Date().toISOString(), version: "2.2.0" };

  let db: any;
  try {
    db = getDB(req);
    const start = Date.now();
    await dbFirst(db, `SELECT 1 as ok`);
    checks.db = { status: "ok", latency_ms: Date.now() - start };
  } catch (e: any) {
    checks.db = { status: "error", message: e.message };
  }

  // Check which payment gateways are configured and active. The real column is
  // credentials_enc (see cf-migrations/0001_init.sql + admin/gateways/route.ts) —
  // querying a non-existent "credentials" column here used to throw on every
  // request and silently fall back to raw env vars, which is why gateways
  // configured through the admin UI (encrypted into the DB) never appeared.
  const gateways: string[] = [];
  let dbGatewayCheckOk = false;
  if (db) {
    try {
      const { dbQuery } = await import("@/lib/db");
      const rows = await dbQuery<any>(db,
        `SELECT gateway FROM payment_gateways WHERE is_active=1 AND credentials_enc!='' `);
      for (const r of rows) { if (r.gateway) gateways.push(r.gateway); }
      dbGatewayCheckOk = true;
    } catch { /* table/column missing — dbGatewayCheckOk stays false */ }
  }
  // Only fall back to env vars if the DB check itself could not run at all
  // (e.g. fresh deploy before migrations). Never silently mask configured-but-
  // empty DB state with unrelated env vars once the DB check succeeds.
  if (!dbGatewayCheckOk) {
    if (process.env.STRIPE_SECRET_KEY) gateways.push("stripe");
    if (process.env.PAYPAL_CLIENT_ID) gateways.push("paypal");
    if (process.env.XENDIT_SECRET_KEY) gateways.push("xendit");
    if (process.env.MIDTRANS_SERVER_KEY) gateways.push("midtrans");
  }
  // Cryptocurrency is a first-class checkout gateway backed by payment_methods
  // (admin-managed BTC/USDT/ETH/BNB addresses), independent of payment_gateways.
  if (db) {
    try {
      const { dbFirst } = await import("@/lib/db");
      const anyCrypto = await dbFirst<any>(db,
        `SELECT id FROM payment_methods WHERE category='crypto' AND enabled=1 AND address!='' LIMIT 1`);
      if (anyCrypto) gateways.push("crypto");
    } catch { /* payment_methods not migrated yet — crypto simply won't show */ }
  }

  const allOk = checks.db?.status === "ok";
  return NextResponse.json({ status: allOk ? "ok" : "degraded", gateways, ...checks }, { status: allOk ? 200 : 503 });
}
