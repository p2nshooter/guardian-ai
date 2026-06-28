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
import { getDB, dbRun, dbFirst } from "@/lib/db";

/**
 * Cron: Studio Cleanup — run daily
 * Deletes expired sessions, artifacts, and pipelines (14-day TTL)
 * Also resets daily AI request counters
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  const results: Record<string, number> = {};

  // Delete expired sessions
  try {
    const r = await dbFirst<{ n: number }>(db,
      `SELECT COUNT(*) as n FROM studio_sessions WHERE expires_at < datetime('now')`);
    results.expired_sessions = r?.n || 0;
    await dbRun(db, `DELETE FROM studio_sessions WHERE expires_at < datetime('now')`);
  } catch { results.expired_sessions = -1; }

  // Delete expired artifacts
  try {
    const r = await dbFirst<{ n: number }>(db,
      `SELECT COUNT(*) as n FROM studio_artifacts WHERE expires_at < datetime('now')`);
    results.expired_artifacts = r?.n || 0;
    await dbRun(db, `DELETE FROM studio_artifacts WHERE expires_at < datetime('now')`);
  } catch { results.expired_artifacts = -1; }

  // Delete expired pipelines
  try {
    const r = await dbFirst<{ n: number }>(db,
      `SELECT COUNT(*) as n FROM studio_pipelines WHERE expires_at < datetime('now')`);
    results.expired_pipelines = r?.n || 0;
    await dbRun(db, `DELETE FROM studio_pipelines WHERE expires_at < datetime('now')`);
  } catch { results.expired_pipelines = -1; }

  // Reset daily AI usage counters
  try {
    await dbRun(db, `UPDATE studio_tenants SET usage_ai_today = 0, updated_at = datetime('now')`);
    results.daily_reset = 1;
  } catch { results.daily_reset = -1; }

  // Clean old usage logs (keep 90 days)
  try {
    await dbRun(db, `DELETE FROM studio_usage_log WHERE created_at < datetime('now', '-90 days')`);
    results.old_logs_cleaned = 1;
  } catch { results.old_logs_cleaned = -1; }

  return NextResponse.json({ ok: true, cleaned: results, timestamp: new Date().toISOString() });
}
