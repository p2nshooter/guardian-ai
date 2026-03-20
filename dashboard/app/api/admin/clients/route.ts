import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const clients = await dbQuery<any>(db, `
    SELECT c.*,
      (SELECT COUNT(*) FROM licenses l WHERE l.client_id = c.id) as license_count,
      (SELECT COUNT(*) FROM licenses l WHERE l.client_id = c.id AND l.status = 'active') as active_count
    FROM clients c
    ORDER BY c.created_at DESC
    LIMIT 500
  `);

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, name, organization, country, phone } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  await dbRun(
    db,
    `UPDATE clients SET name=?, organization=?, country=?, phone=?, updated_at=? WHERE id=?`,
    [name || "", organization || "", country || "", phone || "", now(), id]
  );

  return NextResponse.json({ success: true });
}
