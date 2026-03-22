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

  const invoices = await dbQuery<any>(db, `
    SELECT i.*, c.name as client_name, c.email as client_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    ORDER BY i.created_at DESC
    LIMIT 500
  `);

  const total = await dbFirst<{ t: number }>(
    db,
    `SELECT COALESCE(SUM(amount_usd), 0) as t FROM invoices WHERE status = 'paid'`
  );

  return NextResponse.json({ invoices, total: total?.t || 0 });
}
