/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * POST /api/cron/migrate — one step of the one-time move of axto.io's records
 * from D1 to R2 (lib/data/migrate.ts), for the deploy job, which calls it until
 * it answers done:true (x-cron-secret or Bearer CRON_SECRET). Visitors and the
 * automation tick drive the same steps; a lease lets only one run at a time.
 * The answer is progress counts only — never records.
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getEnv, getRawData, migrationEnv } from "@/lib/db";
import { cronAuthorized } from "@/lib/cron";
import { migrationProgress, runMigration, TABLES } from "@/lib/data/migrate";

async function step(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = getRawData(req);
  const state = await runMigration(raw, migrationEnv(getEnv(req)), 1);
  const p = await migrationProgress(raw);
  const s = state ?? p.state;
  return NextResponse.json({
    done: Boolean(s),
    ...(s
      ? { source: s.source, at: s.at, tables: s.tables, settings: s.settings, conflicts: s.conflicts.length, incomplete: s.incomplete ?? [] }
      : { table: p.progress ? TABLES[p.progress.table]?.table ?? "finishing" : "starting", copied: p.progress?.copied ?? {} }),
  }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = step;
export const GET = step;
