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
import { getDB, dbQuery, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const url = new URL(req.url);
  const section = url.searchParams.get("section");

  if (section) {
    const items = await dbQuery<any>(
      db,
      `SELECT * FROM site_content WHERE section = ? ORDER BY sort_order`,
      [section]
    );
    return NextResponse.json({ items });
  }

  const settings = await dbQuery<any>(db, `SELECT * FROM site_settings ORDER BY key`);
  const content = await dbQuery<any>(db, `SELECT * FROM site_content ORDER BY section, sort_order`);

  return NextResponse.json({ settings, content });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }

  if (body.type === "setting") {
    await dbRun(
      db,
      `UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?`,
      [body.value || "", now(), body.key]
    );
    return NextResponse.json({ success: true });
  }

  if (body.type === "content_upsert") {
    const { id, section, title, body: bodyText, meta, sort_order, is_active } = body;

    if (id) {
      await dbRun(
        db,
        `UPDATE site_content
         SET title = ?, body = ?, meta = ?, sort_order = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        [title || "", bodyText || "", JSON.stringify(meta || {}), sort_order || 0, is_active ? 1 : 0, now(), id]
      );
    } else {
      await dbRun(
        db,
        `INSERT INTO site_content (id, section, title, body, meta, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), section, title || "", bodyText || "", JSON.stringify(meta || {}), sort_order || 0, is_active ? 1 : 0, now(), now()]
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
