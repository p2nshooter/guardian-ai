/* ==============================================================================
 * POST /api/track  — privacy-light visitor analytics beacon.
 * Records a daily × country aggregate (no IPs, no per-request rows). Counts a
 * unique daily visitor via a short-lived cookie; always counts a page view.
 * Never throws — analytics must never break a page render.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

async function record(req: NextRequest): Promise<NextResponse> {
  const day = new Date().toISOString().slice(0, 10);
  const country = (req.headers.get("cf-ipcountry") || "XX").toUpperCase().slice(0, 2);
  const seen = req.cookies.get("axv")?.value;
  const isNewVisitor = seen !== day; // first hit today from this browser

  const res = new NextResponse(null, { status: 204 });
  res.cookies.set("axv", day, { path: "/", maxAge: 86400, httpOnly: true, sameSite: "lax" });

  try {
    const db = getDB(req);
    await db
      .prepare(
        `INSERT INTO visit_stats (day, country, visitors, views)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(day, country) DO UPDATE SET
           visitors = visitors + ?,
           views    = views + 1`,
      )
      .bind(day, country, isNewVisitor ? 1 : 0, isNewVisitor ? 1 : 0)
      .run();
  } catch {
    /* DB unavailable / table missing → silently ignore, page is unaffected */
  }
  return res;
}

export async function POST(req: NextRequest) { return record(req); }
export async function GET(req: NextRequest) { return record(req); }
