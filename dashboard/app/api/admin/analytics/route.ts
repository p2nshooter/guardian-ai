/* ==============================================================================
 * GET /api/admin/analytics?days=30  — web visitor analytics for the admin panel.
 * Returns daily visitor/view totals and a per-country breakdown.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("days") || "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - (days - 1) * 86400_000);
  const sinceStr = dayStr(since);
  const today = dayStr(new Date());

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ days, today: { visitors: 0, views: 0 }, daily: [], countries: [], totals: { visitors: 0, views: 0 }, source: "unavailable" });
  }

  try {
    const daily = await dbQuery<{ day: string; visitors: number; views: number }>(
      db,
      `SELECT day, SUM(visitors) AS visitors, SUM(views) AS views
         FROM visit_stats WHERE day >= ? GROUP BY day ORDER BY day ASC`,
      [sinceStr],
    );
    const countries = await dbQuery<{ country: string; visitors: number; views: number }>(
      db,
      `SELECT country, SUM(visitors) AS visitors, SUM(views) AS views
         FROM visit_stats WHERE day >= ? GROUP BY country ORDER BY visitors DESC LIMIT 30`,
      [sinceStr],
    );

    const totals = daily.reduce(
      (a, r) => ({ visitors: a.visitors + (r.visitors || 0), views: a.views + (r.views || 0) }),
      { visitors: 0, views: 0 },
    );
    const todayRow = daily.find(d => d.day === today);

    return NextResponse.json({
      days,
      today: { visitors: todayRow?.visitors || 0, views: todayRow?.views || 0 },
      totals,
      daily,
      countries,
    });
  } catch {
    // Table may not exist yet (pre-migration) — return empty, never error the UI.
    return NextResponse.json({ days, today: { visitors: 0, views: 0 }, totals: { visitors: 0, views: 0 }, daily: [], countries: [], source: "no-table" });
  }
}
