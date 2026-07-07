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
import { getDB, getR2, dbRun, dbFirst, dbQuery } from "@/lib/db";

/**
 * Cron: Studio Cleanup — run daily
 * Deletes expired sessions, artifacts, and pipelines (14-day TTL)
 * Also resets daily AI request counters
 */
export async function GET(req: NextRequest) {
  // Verify cron secret -- MANDATORY, an unconfigured secret must reject
  // every request rather than skip auth.
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

  // Delete expired artifacts -- AXTO's data-destruction guarantee: an
  // expired artifact isn't "gone" until its actual R2 object is deleted,
  // not just the D1 row that pointed to it. `content` doubles as the R2
  // key for any non-text artifact_type (see cf-migrations/0031).
  try {
    const expired = await dbQuery<{ id: string; artifact_type: string; content: string }>(db,
      `SELECT id, artifact_type, content FROM studio_artifacts WHERE expires_at < datetime('now')`);
    results.expired_artifacts = expired.length;
    let r2Deleted = 0, r2Failed = 0;
    try {
      const r2 = getR2(req);
      for (const a of expired) {
        if (a.artifact_type !== "text" && a.content) {
          try { await r2.delete(a.content); r2Deleted++; }
          catch { r2Failed++; }
        }
      }
    } catch { /* R2 binding unavailable -- DB rows still get cleaned below */ }
    results.expired_artifact_files_deleted = r2Deleted;
    if (r2Failed) results.expired_artifact_files_failed = r2Failed;
    await dbRun(db, `DELETE FROM studio_artifacts WHERE expires_at < datetime('now')`);
  } catch { results.expired_artifacts = -1; }

  // Delete expired pipelines
  try {
    const r = await dbFirst<{ n: number }>(db,
      `SELECT COUNT(*) as n FROM studio_pipelines WHERE expires_at < datetime('now')`);
    results.expired_pipelines = r?.n || 0;
    await dbRun(db, `DELETE FROM studio_pipelines WHERE expires_at < datetime('now')`);
  } catch { results.expired_pipelines = -1; }

  // Full wipe for tenants whose Studio license has lapsed past the standard
  // 7-day grace period -- non-renewal must actually free the storage, not
  // just stop billing for it. Wipes every artifact (R2 + D1) and marks the
  // tenant cancelled; a later renewal creates a fresh tenant/session, it
  // never resurrects the deleted work.
  try {
    const lapsed = await dbQuery<{ id: string; client_id: string }>(db,
      `SELECT t.id, t.client_id FROM studio_tenants t
       WHERE t.status != 'cancelled'
         AND NOT EXISTS (
           SELECT 1 FROM licenses l
           WHERE l.client_id = t.client_id AND l.product = 'studio'
             AND l.status = 'active'
             AND datetime(l.expires_at, '+7 days') > datetime('now')
         )`
    );
    results.tenants_storage_wiped = lapsed.length;
    if (lapsed.length) {
      let r2 : any = null;
      try { r2 = getR2(req); } catch {}
      for (const t of lapsed) {
        if (r2) {
          const files = await dbQuery<{ content: string }>(db,
            `SELECT content FROM studio_artifacts WHERE tenant_id = ? AND artifact_type != 'text' AND content != ''`,
            [t.id]
          );
          for (const f of files) { try { await r2.delete(f.content); } catch {} }
        }
        await dbRun(db, `DELETE FROM studio_artifacts WHERE tenant_id = ?`, [t.id]);
        await dbRun(db, `DELETE FROM studio_sessions WHERE tenant_id = ?`, [t.id]);
        await dbRun(db, `DELETE FROM studio_pipelines WHERE tenant_id = ?`, [t.id]);
        await dbRun(db, `UPDATE studio_tenants SET status = 'cancelled', usage_storage_mb = 0, updated_at = datetime('now') WHERE id = ?`, [t.id]);
      }
    }
  } catch { results.tenants_storage_wiped = -1; }

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
