/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * GET /api/cron/expire-licenses — daily housekeeping (axto-license-expiry-cron
 * Worker, header x-cron-secret). Same work as the hourly part of /api/cron/tick.
 * Response shape { ok, expired, warnings_sent } is what the Worker logs.
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { cronAuthorized } from "@/lib/cron";
import { runHousekeeping } from "@/lib/billing/lifecycle";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runHousekeeping(getDB(req))) });
}
