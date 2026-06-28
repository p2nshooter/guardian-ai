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
import { getDB, dbQuery, dbFirst } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const lic = await dbFirst<any>(db, `
      SELECT l.*, c.name as client_name, c.email as client_email, c.organization
      FROM licenses l
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE l.id = ?
    `, [id]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const heartbeats = await dbQuery<any>(
      db,
      `SELECT * FROM license_heartbeats WHERE license_id = ? ORDER BY created_at DESC LIMIT 50`,
      [id]
    );
    const nodes = await dbQuery<any>(
      db,
      `SELECT * FROM license_nodes WHERE license_id = ? ORDER BY last_seen DESC`,
      [id]
    );

    return NextResponse.json({ license: lic, heartbeats, nodes });
  }

  const licenses = await dbQuery<any>(db, `
    SELECT l.*, c.name as client_name, c.email as client_email, c.organization
    FROM licenses l
    LEFT JOIN clients c ON c.id = l.client_id
    ORDER BY l.created_at DESC
  `);

  return NextResponse.json({ licenses });
}
