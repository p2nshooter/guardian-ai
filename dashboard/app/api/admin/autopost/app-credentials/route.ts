/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


// GET — return all saved app credentials (app_secret redacted)
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error: "DB unavailable" }, { status: 503 }); }

  const rows = await dbQuery<any>(db,
    `SELECT platform, app_id, CASE WHEN app_secret != '' THEN '••••••••' ELSE '' END as app_secret_hint,
            extra, updated_at FROM platform_app_credentials ORDER BY platform`
  ).catch(() => []);

  return NextResponse.json({ ok: true, credentials: rows || [] });
}

// POST — save or update app credentials for a platform
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { platform, app_id, app_secret, extra = {} } = body;
  if (!platform || !app_id) return NextResponse.json({ error: "platform and app_id required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error: "DB unavailable" }, { status: 503 }); }

  const existing = await dbFirst<any>(db, `SELECT id FROM platform_app_credentials WHERE platform=?`, [platform]).catch(() => null);

  if (existing) {
    await dbRun(db,
      `UPDATE platform_app_credentials SET app_id=?, app_secret=CASE WHEN ?='' THEN app_secret ELSE ? END, extra=?, updated_at=? WHERE platform=?`,
      [app_id, app_secret, app_secret, JSON.stringify(extra), now(), platform]
    );
  } else {
    await dbRun(db,
      `INSERT INTO platform_app_credentials (id, platform, app_id, app_secret, extra, updated_at, created_at) VALUES (?,?,?,?,?,?,?)`,
      [newId(), platform, app_id, app_secret || "", JSON.stringify(extra), now(), now()]
    );
  }

  return NextResponse.json({ ok: true, platform });
}

// DELETE — remove app credentials for a platform
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error: "DB unavailable" }, { status: 503 }); }

  await dbRun(db, `DELETE FROM platform_app_credentials WHERE platform=?`, [platform]);
  return NextResponse.json({ ok: true });
}
