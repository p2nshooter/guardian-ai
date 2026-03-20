import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const client = await dbFirst<any>(db,
    `SELECT id, email, name, organization, country, phone, created_at FROM clients WHERE email = ?`,
    [user.email]);

  const licenses = await dbQuery<any>(db, `
    SELECT l.id, l.license_key, l.product, l.package_code, l.status,
      l.expires_at, l.max_nodes, l.bound_machine_id, l.created_at, l.notes,
      lp.name AS package_name,
      (SELECT COUNT(*) FROM license_nodes ln WHERE ln.license_id = l.id AND ln.status = 'active') AS node_count,
      (SELECT MAX(lh.created_at) FROM license_heartbeats lh WHERE lh.license_id = l.id) AS last_heartbeat
    FROM licenses l
    LEFT JOIN license_packages lp ON lp.code = l.package_code
    WHERE l.client_id = (SELECT id FROM clients WHERE email = ?)
    ORDER BY l.created_at DESC`, [user.email]);

  const invoices = await dbQuery<any>(db, `
    SELECT i.id, i.amount_usd, i.currency, i.amount_local, i.gateway,
      i.status, i.payment_ref, i.created_at, l.package_code, l.product
    FROM invoices i LEFT JOIN licenses l ON l.id = i.license_id
    WHERE i.client_email = ? ORDER BY i.created_at DESC LIMIT 50`, [user.email]);

  const playbook_purchases = await dbQuery<any>(db, `
    SELECT pp.*, p.name as playbook_name, p.slug as playbook_slug, pb.name as bundle_name
    FROM playbook_purchases pp
    LEFT JOIN playbooks p ON p.id = pp.playbook_id
    LEFT JOIN playbook_bundles pb ON pb.id = pp.bundle_id
    WHERE pp.client_email = ? AND pp.status = 'completed'
    ORDER BY pp.created_at DESC`, [user.email]);

  return NextResponse.json({
    client: client || { email: user.email, name: "", organization: "" },
    licenses: licenses || [], invoices: invoices || [], playbook_purchases: playbook_purchases || [],
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  if (body.action === "reset_binding") {
    const { license_id } = body;
    if (!license_id) return NextResponse.json({ error: "license_id required" }, { status: 400 });

    const lic = await dbFirst<any>(db,
      `SELECT l.id, l.reset_count, l.max_resets FROM licenses l JOIN clients c ON c.id = l.client_id WHERE l.id = ? AND c.email = ?`,
      [license_id, user.email]);
    if (!lic) return NextResponse.json({ error: "License not found" }, { status: 404 });

    if (lic.max_resets > 0 && lic.reset_count >= lic.max_resets) {
      return NextResponse.json({ error: "Reset limit reached. Contact hallo@axto.io" }, { status: 403 });
    }

    await dbRun(db, `UPDATE licenses SET bound_machine_id = NULL, reset_count = COALESCE(reset_count, 0) + 1, updated_at = ? WHERE id = ?`, [now(), license_id]);
    return NextResponse.json({ ok: true, message: "Machine binding reset successfully." });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
