/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Admin control for the Free Full-Access Program — /api/admin/free-access
 * GET  → current program status (start/end/enabled, days left, install source).
 * POST → set the global end date, add days to it, toggle enabled, or set start.
 * This is the single global countdown every install reads; all engines lock
 * simultaneously when it passes.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getFreeAccessStatus, setFreeAccessConfig, normalizeDate } from "@/lib/free-access";

async function ensureTable(req: NextRequest) {
  try {
    const db = getDB(req);
    await dbRun(db, `CREATE TABLE IF NOT EXISTS platform_config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')))`, []);
  } catch { /* best-effort */ }
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getFreeAccessStatus(req);
  return NextResponse.json({ status });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { action } = body;
  await ensureTable(req);

  const patch: { endISO?: string; startISO?: string; enabled?: boolean } = {};
  if (action === "set_end") {
    const e = normalizeDate(body.endISO);
    if (!e) return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    patch.endISO = e;
  } else if (action === "add_days") {
    const days = Number(body.days);
    if (!days) return NextResponse.json({ error: "Provide a non-zero 'days'" }, { status: 400 });
    const cur = await getFreeAccessStatus(req);
    patch.endISO = new Date(new Date(cur.endISO).getTime() + days * 86_400_000).toISOString();
  } else if (action === "set_enabled") {
    patch.enabled = !!body.enabled;
  } else if (action === "set_start") {
    const s = normalizeDate(body.startISO);
    if (!s) return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    patch.startISO = s;
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    await setFreeAccessConfig(patch, req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not save" }, { status: 500 });
  }
  const status = await getFreeAccessStatus(req);
  return NextResponse.json({ ok: true, status });
}
