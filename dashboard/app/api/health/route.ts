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

  // Check which payment gateways are configured and active
  const gateways: string[] = [];
  if (db) {
    try {
      const { dbQuery } = await import("@/lib/db");
      const rows = await dbQuery<any>(db, `SELECT gateway FROM payment_gateways WHERE is_active=1 AND credentials!='' AND credentials!='{}'`);
      for (const r of rows) { if (r.gateway) gateways.push(r.gateway); }
    } catch {
      // Fallback: check env vars
      if (process.env.STRIPE_SECRET_KEY) gateways.push("stripe");
      if (process.env.PAYPAL_CLIENT_ID) gateways.push("paypal");
      if (process.env.XENDIT_SECRET_KEY) gateways.push("xendit");
      if (process.env.MIDTRANS_SERVER_KEY) gateways.push("midtrans");
    }
  }

  const allOk = checks.db?.status === "ok";
  return NextResponse.json({ status: allOk ? "ok" : "degraded", gateways, ...checks }, { status: allOk ? 200 : 503 });
}
