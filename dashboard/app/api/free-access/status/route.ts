/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * PUBLIC program status — /api/free-access/status
 * The single source every public page reads to decide whether to show the
 * "free for a year" copy (program active) or auto-swap to the "licence required
 * — contact admin" copy (program ended). No admin auth: it exposes only the
 * program window + countdown, nothing sensitive. When the global end date
 * passes, `active` flips to false everywhere at once — no code edit needed.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getFreeAccessStatus, FREE_ACCESS_PROGRAM_NAME } from "@/lib/free-access";

const CORS: Record<string, string> = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  // getFreeAccessStatus never throws — it falls back to env/compiled defaults,
  // so the program is reported "active" during the window even if D1 is briefly
  // unavailable, and never falsely "ended".
  const s = await getFreeAccessStatus(req);
  return NextResponse.json(
    {
      program: FREE_ACCESS_PROGRAM_NAME,
      active: s.active,
      ended: s.ended,
      started: s.started,
      endISO: s.endISO,
      daysLeft: s.daysLeft,
      contact: { whatsapp: "+6285691234561", email: ["hello@axto.io", "salam@ulyah.com"] },
    },
    { headers: { ...CORS, "cache-control": "public, max-age=60" } }
  );
}
