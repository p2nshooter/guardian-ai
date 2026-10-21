/* AXTO — /api/admin/licenses (admin only)
 *   GET ?q=&status=  → self-hosted licences with owner
 *   POST {action:"suspend"|"activate"|"revoke"|"reset", id} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { ADMIN_HOLD } from "@/lib/licences";
import type { ShLicenseDoc } from "@/lib/data/schema";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toUpperCase().slice(0, 100);
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";
  const db = getData(req);
  const [licences, users] = await Promise.all([db.shLicenses.listAll("all", "all"), db.users.listAll("all", "all")]);
  const owner = new Map(users.map((e) => [e.id, e.meta as Record<string, any>]));
  const nowIso = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  for (const e of licences) {
    const l = e.meta as Record<string, any>;
    const u = owner.get(String(l.user_id || ""));
    if (q && ![l.license_key, u?.email, l.product].some((v) => String(v || "").toUpperCase().includes(q))) continue;
    // "expired" is a date, not a stored status: active licences past their end date.
    if (status === "expired" ? !(l.status === "active" && String(l.expires_at || "") <= nowIso) : status && l.status !== status) continue;
    if ((source === "plan" || source === "edition" || source === "trial") && l.source !== source) continue;
    const { user_id: _u, ...fields } = l;
    rows.push({ id: e.id, ...fields, email: u?.email ?? null, name: u?.name ?? null });
    if (rows.length >= 200) break;
  }
  return respond({ licenses: rows }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getData(req);
  const lic = await db.shLicenses.get(String(b?.id || ""));
  if (!lic) return fail("Licence not found.", 404);
  const a = String(b?.action || "");
  // Suspend / revoke by an admin is a hold: neither the member nor a renewal can lift it.
  const change: Record<string, (l: ShLicenseDoc) => ShLicenseDoc> = {
    suspend: (l) => ({ ...l, status: "suspended", notes: ADMIN_HOLD }),
    activate: (l) => ({ ...l, status: "active", notes: "" }),
    revoke: (l) => ({ ...l, status: "revoked", notes: ADMIN_HOLD }),
    reset: (l) => ({ ...l, bound_machine_id: "", reset_count: (l.reset_count || 0) + 1 }),
  };
  const fn = Object.prototype.hasOwnProperty.call(change, a) ? change[a] : undefined;
  if (!fn) return fail("Unknown action.");
  await db.shLicenses.update(lic.id, (l) => ({ ...fn(l), updated_at: now() }));
  await audit(db, ctx.session, `admin.license.${a}`, "sh_license", lic.id, {}, req);
  return respond({ ok: true }, ctx);
}
