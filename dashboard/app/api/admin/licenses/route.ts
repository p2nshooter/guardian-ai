/* AXTO — /api/admin/licenses (admin only)
 *   GET ?q=&status=  → self-hosted licences with owner
 *   POST {action:"suspend"|"activate"|"revoke"|"reset", id} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { ADMIN_HOLD } from "@/lib/licences";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toUpperCase().slice(0, 100);
  const status = url.searchParams.get("status") || "";
  const where: string[] = ["1 = 1"]; const args: unknown[] = [];
  if (q) { where.push("(UPPER(l.license_key) LIKE ? OR UPPER(u.email) LIKE ? OR UPPER(l.product) LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  // "expired" is a date, not a stored status: active licences past their end date.
  if (status === "expired") { where.push("l.status = 'active' AND l.expires_at <= ?"); args.push(new Date().toISOString()); }
  else if (status) { where.push("l.status = ?"); args.push(status); }
  const rows = await dbQuery(getDB(req),
    `SELECT l.id, l.product, l.license_key, l.package_code, l.status, l.expires_at, l.max_nodes, l.bound_machine_id,
            l.last_seen_at, l.last_version, l.last_ip, l.reset_count, l.notes, l.created_at, u.email, u.name
       FROM sh_licenses l LEFT JOIN users u ON u.id = l.user_id
      WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC LIMIT 200`, args);
  return respond({ licenses: rows }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getDB(req);
  const lic = await dbFirst<{ id: string; status: string }>(db, `SELECT id, status FROM sh_licenses WHERE id = ?`, [String(b?.id || "")]);
  if (!lic) return fail("Licence not found.", 404);
  const a = String(b?.action || "");
  // Suspend / revoke by an admin is a hold: neither the member nor a renewal can lift it.
  if (a === "suspend") await dbRun(db, `UPDATE sh_licenses SET status = 'suspended', notes = ?, updated_at = ? WHERE id = ?`, [ADMIN_HOLD, now(), lic.id]);
  else if (a === "activate") await dbRun(db, `UPDATE sh_licenses SET status = 'active', notes = '', updated_at = ? WHERE id = ?`, [now(), lic.id]);
  else if (a === "revoke") await dbRun(db, `UPDATE sh_licenses SET status = 'revoked', notes = ?, updated_at = ? WHERE id = ?`, [ADMIN_HOLD, now(), lic.id]);
  else if (a === "reset") await dbRun(db, `UPDATE sh_licenses SET bound_machine_id = '', reset_count = reset_count + 1, updated_at = ? WHERE id = ?`, [now(), lic.id]);
  else return fail("Unknown action.");
  await audit(db, ctx.session, `admin.license.${a}`, "sh_license", lic.id, {}, req);
  return respond({ ok: true }, ctx);
}
