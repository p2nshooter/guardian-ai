/* AXTO — Admin → Connect (developer API & realtime)
 *   GET  /api/admin/connect                      settings, TURN (masked), 24 h stats, keys, failing webhooks
 *   PUT  /api/admin/connect {settings?, turn?}   switch the API on/off, retention, Cloudflare Realtime TURN
 *   POST /api/admin/connect {action:"revoke", id} | {action:"revoke-member", userId} | {action:"disable-webhook", id} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getConnectSettings, saveConnectSettings, getTurn, saveTurn } from "@/lib/connect/settings";
import { maskValue } from "@/lib/secure-store";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const d1 = new Date(Date.now() - 86_400_000).toISOString();
  const [settings, turn, keys, activeKeys, events, hooks, failing, deliveries] = await Promise.all([
    getConnectSettings(db), getTurn(req),
    dbQuery<any>(db, `SELECT k.id, k.name, k.prefix, k.scopes, k.origins, k.created_at, k.last_used_at, k.revoked_at, u.email
                        FROM api_keys k LEFT JOIN users u ON u.id = k.user_id ORDER BY COALESCE(k.last_used_at, k.created_at) DESC LIMIT 200`),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM api_keys WHERE revoked_at IS NULL`),
    dbFirst<{ n: number; b: number }>(db, `SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM connect_events WHERE created_at > ?`, [d1]),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM webhooks WHERE active = 1`),
    dbQuery<any>(db, `SELECT w.id, w.url, w.failures, w.last_status, w.last_error, w.last_delivery_at, w.active, u.email FROM webhooks w LEFT JOIN users u ON u.id = w.user_id WHERE w.failures > 0 ORDER BY w.failures DESC LIMIT 50`),
    dbFirst<{ ok: number; bad: number; pending: number }>(db, `SELECT SUM(CASE WHEN status BETWEEN 200 AND 299 THEN 1 ELSE 0 END) AS ok, SUM(CASE WHEN done = 1 AND (status IS NULL OR status < 200 OR status > 299) THEN 1 ELSE 0 END) AS bad, SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END) AS pending FROM webhook_deliveries WHERE created_at > ?`, [d1]),
  ]);
  return respond({
    settings, turn: { keyId: turn.keyId, apiToken: maskValue(turn.apiToken), configured: !!(turn.keyId && turn.apiToken) },
    stats: { activeKeys: Number(activeKeys?.n || 0), events24h: Number(events?.n || 0), bytes24h: Number(events?.b || 0), activeWebhooks: Number(hooks?.n || 0), deliveries24h: { ok: Number(deliveries?.ok || 0), failed: Number(deliveries?.bad || 0), pending: Number(deliveries?.pending || 0) } },
    keys: keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes.split(" "), origins: k.origins ? k.origins.split(" ") : [], email: k.email, createdAt: k.created_at, lastUsedAt: k.last_used_at, revokedAt: k.revoked_at })),
    failing: failing.map((w) => ({ id: w.id, url: w.url, email: w.email, failures: w.failures, lastStatus: w.last_status, lastError: w.last_error, lastDeliveryAt: w.last_delivery_at, active: !!w.active })),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const b = await readJson(req);
  let settings, turn;
  try {
    if (b?.settings) settings = await saveConnectSettings(db, b.settings);
    if (b?.turn) turn = await saveTurn(req, b.turn);
  } catch (e: any) { return fail(String(e?.message || e)); }
  await audit(db, ctx.session, "admin.connect.settings", "connect", "settings", { settings: settings || null, turnKey: turn?.keyId || undefined }, req);
  return respond({ ok: true, settings: settings || await getConnectSettings(db), turn }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const b = await readJson(req);
  const id = String(b?.id || b?.userId || "");
  if (b?.action === "revoke") {
    const r = await dbRun(db, `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`, [now(), id]);
    if (!r?.meta?.changes) return fail("Key not found or already revoked.", 404);
  } else if (b?.action === "revoke-member") {
    await dbRun(db, `UPDATE api_keys SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, [now(), id]);
  } else if (b?.action === "disable-webhook") {
    const r = await dbRun(db, `UPDATE webhooks SET active = 0 WHERE id = ?`, [id]);
    if (!r?.meta?.changes) return fail("Webhook not found.", 404);
  } else return fail("Unknown action.");
  await audit(db, ctx.session, `admin.connect.${b.action}`, "connect", id, {}, req);
  return respond({ ok: true }, ctx);
}
