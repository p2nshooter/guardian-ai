/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * GET /api/cron/tick — the platform's heartbeat (Worker "axto-automation",
 * every minute; header x-cron-secret or Bearer). Everything that must happen
 * without a person:
 *   every tick   confirm direct crypto payments on-chain → plan + licences
 *   hourly       renewal reminders, expiries, stale orders (lib/billing/lifecycle)
 * D1-lean: one indexed query when nothing is pending; the hourly marker is a
 * single platform_config row.
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { cronAuthorized } from "@/lib/cron";
import { watchCryptoOrders } from "@/lib/billing/crypto-watch";
import { runHousekeeping } from "@/lib/billing/lifecycle";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const out: Record<string, unknown> = { ok: true, at: now() };
  try { out.crypto = await watchCryptoOrders(db); } catch (e: any) { out.crypto = { error: String(e?.message || e) }; }

  const force = new URL(req.url).searchParams.get("hourly") === "1";
  const last = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'cron_hourly_at'`);
  if (force || !last?.value || Date.now() - Date.parse(last.value) > 55 * 60_000) {
    await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('cron_hourly_at', ?, ?)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [now(), now()]);
    try { out.housekeeping = await runHousekeeping(db); } catch (e: any) { out.housekeeping = { error: String(e?.message || e) }; }
  }
  return NextResponse.json(out);
}
