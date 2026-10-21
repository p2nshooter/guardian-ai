/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * /api/admin/data (admin only) · Admin → Data: where the records live.
 *   GET  → the one-time move from D1 (per-table report, conflicts kept, the
 *          seven-day read-only window of the old database), the backup job
 *          and the latest backups (counts and sizes only — never records)
 *   POST {action:"backup"} → start a backup now (audited); the automation tick
 *          takes it in parts, like the daily one
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getEnv, getRawData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { migrationProgress } from "@/lib/data/migrate";
import { backupJob, requestBackup, RETENTION_DAYS } from "@/lib/data/backup-job";
import { listBackups } from "@/lib/r2/backup";

const KEEP_D1_DAYS = 7;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const env = getEnv(req);
  const db = getData(req);
  const [move, job, backups] = await Promise.all([
    migrationProgress(getRawData(req)),
    backupJob(db.store),
    env.BACKUPS ? listBackups(env.BACKUPS, 20).catch(() => []) : Promise.resolve([]),
  ]);
  const s = move.state;
  return respond({
    move: s ? {
      done: true, source: s.source, at: s.at, settings: s.settings, tables: s.tables, legacy: s.legacy,
      conflicts: s.conflicts, incomplete: s.incomplete ?? [],
      d1: { bound: !!env.DB, readOnlyUntil: new Date(Date.parse(s.at) + KEEP_D1_DAYS * 86_400_000).toISOString() },
    } : { done: false, progress: move.progress },
    backup: { configured: !!env.BACKUPS, retentionDays: RETENTION_DAYS, job, latest: backups },
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (b?.action !== "backup") return fail("Unknown action.");
  if (!getEnv(req).BACKUPS) return fail("The backup bucket is not configured.", 503);
  const db = getData(req);
  if (!(await requestBackup(db.store, `manual by ${ctx.session.email}`))) return fail("A backup is already running — it finishes within minutes.", 409);
  await audit(db, ctx.session, "admin.data.backup", "data", "backup", {}, req);
  return respond({ ok: true }, ctx);
}
