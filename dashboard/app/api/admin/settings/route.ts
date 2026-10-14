/* AXTO — /api/admin/settings (admin only)
 *   GET → platform settings (USD→IDR and USD→EUR rate overrides, Local Mode switch) and admin accounts
 *   PUT {usd_idr_rate?, usd_eur_rate?, local_mode?: boolean} · POST {action:"password", current, next} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond, hashPassword, verifyPassword, passwordProblem } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getLocalModeSettings, saveLocalModeSettings } from "@/lib/ai/local-settings";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const [rate, eur, admins, local] = await Promise.all([
    dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'usd_idr_rate'`),
    dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'usd_eur_rate'`),
    dbQuery(db, `SELECT id, email, name, last_login_at FROM users WHERE role = 'admin' ORDER BY created_at`),
    getLocalModeSettings(db),
  ]);
  return respond({ usdIdrRate: rate?.value || "", usdEurRate: eur?.value || "", localMode: local.enabled, admins }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getDB(req);
  if (b && "usd_idr_rate" in b) {
    const v = String(b.usd_idr_rate || "").trim();
    if (v && !(Number(v) > 1000 && Number(v) < 100000)) return fail("Enter a realistic USD→IDR rate (e.g. 16400), or leave it empty for automatic.");
    if (v) await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('usd_idr_rate', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [v, now()]);
    else await dbRun(db, `DELETE FROM platform_config WHERE key = 'usd_idr_rate'`);
  }
  if (b && "usd_eur_rate" in b) {
    const v = String(b.usd_eur_rate || "").trim();
    if (v && !(Number(v) > 0.5 && Number(v) < 1.5)) return fail("Enter a realistic USD→EUR rate (e.g. 0.92), or leave it empty for automatic.");
    if (v) await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('usd_eur_rate', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [v, now()]);
    else await dbRun(db, `DELETE FROM platform_config WHERE key = 'usd_eur_rate'`);
  }
  if (b && "local_mode" in b) {
    if (typeof b.local_mode !== "boolean") return fail("local_mode must be true or false.");
    await saveLocalModeSettings(db, { enabled: b.local_mode });
  }
  await audit(db, ctx.session, "admin.settings.update", "platform_config", "settings", b || {}, req);
  return respond({ ok: true }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (b?.action !== "password") return fail("Unknown action.");
  const db = getDB(req);
  const u = await dbFirst<{ password_hash: string }>(db, `SELECT password_hash FROM users WHERE id = ?`, [ctx.session.sub]);
  if (u?.password_hash && !(await verifyPassword(String(b.current || ""), u.password_hash))) return fail("Your current password is incorrect.");
  const p = passwordProblem(String(b.next || ""));
  if (p) return fail(p);
  await dbRun(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [await hashPassword(String(b.next)), now(), ctx.session.sub]);
  await audit(db, ctx.session, "admin.password_changed", "user", ctx.session.sub, {}, req);
  return respond({ ok: true }, ctx);
}
