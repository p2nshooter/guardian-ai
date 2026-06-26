/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const expired = await dbQuery<any>(db, `SELECT id FROM licenses WHERE status='active' AND expires_at < datetime('now')`);
  let count = 0;
  for (const lic of expired) { await dbRun(db, `UPDATE licenses SET status='expired', updated_at=? WHERE id=?`, [now(), lic.id]); count++; }
  return NextResponse.json({ ok: true, expired: count });
}
