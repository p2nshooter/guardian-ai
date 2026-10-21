/* AXTO — Admin → Connect (developer API & realtime)
 *   GET  /api/admin/connect                      settings, TURN (masked), 24 h stats, keys, failing webhooks
 *   PUT  /api/admin/connect {settings?, turn?}   switch the API on/off, retention, Cloudflare Realtime TURN
 *   POST /api/admin/connect {action:"revoke", id} | {action:"revoke-member", userId} | {action:"disable-webhook", id} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { oldestFirst } from "@/lib/r2/ulid";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getConnectSettings, saveConnectSettings, getTurn, saveTurn } from "@/lib/connect/settings";
import { maskValue } from "@/lib/secure-store";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const d1 = new Date(Date.now() - 86_400_000).toISOString();
  const since = { afterSort: oldestFirst(d1) };
  const allSince = async <T,>(list: (o: { cursor?: string; afterSort?: string; limit: number }) => Promise<{ entries: T[]; cursor?: string }>) => {
    const out: T[] = [];
    let cursor: string | undefined;
    do {
      const page = await list(cursor ? { cursor, limit: 1000 } : { ...since, limit: 1000 });
      out.push(...page.entries);
      cursor = page.cursor;
    } while (cursor && out.length < 100_000);
    return out;
  };
  const [settings, turn, keyList, users, eventList, hookList, deliveryList] = await Promise.all([
    getConnectSettings(db), getTurn(req),
    db.apiKeys.listAll("all", "all"), db.users.listAll("all", "all"),
    allSince((o) => db.connectEvents.list("all", "all", o)),
    db.webhooks.listAll("all", "all"),
    allSince((o) => db.webhookDeliveries.list("all", "all", o)),
  ]);
  const emailOf = new Map(users.map((e) => [e.id, String(e.meta.email || "")]));
  const keys = keyList.map((e): Record<string, any> => ({ ...e.meta, id: e.id }))
    .sort((a, b) => String(b.last_used_at || b.created_at || "").localeCompare(String(a.last_used_at || a.created_at || "")))
    .slice(0, 200);
  const failingIds = hookList.filter((e) => Number(e.meta.failures) > 0).sort((a, b) => Number(b.meta.failures) - Number(a.meta.failures)).slice(0, 50).map((e) => e.id);
  const failing = (await db.webhooks.getMany(failingIds)).filter((w) => w !== null);
  const ok2xx = (s: unknown) => typeof s === "number" && s >= 200 && s <= 299;
  const deliveries = { ok: 0, bad: 0, pending: 0 };
  for (const { meta: m } of deliveryList) {
    if (ok2xx(m.status)) deliveries.ok += 1;
    if (Number(m.done) === 1 && !ok2xx(m.status)) deliveries.bad += 1;
    if (!Number(m.done)) deliveries.pending += 1;
  }
  const activeKeys = { n: keyList.filter((e) => !e.meta.revoked_at).length };
  const events = { n: eventList.length, b: eventList.reduce((a, e) => a + (Number(e.meta.size) || 0), 0) };
  const hooks = { n: hookList.filter((e) => Number(e.meta.active) === 1).length };
  return respond({
    settings, turn: { keyId: turn.keyId, apiToken: maskValue(turn.apiToken), configured: !!(turn.keyId && turn.apiToken) },
    stats: { activeKeys: Number(activeKeys?.n || 0), events24h: Number(events?.n || 0), bytes24h: Number(events?.b || 0), activeWebhooks: Number(hooks?.n || 0), deliveries24h: { ok: Number(deliveries?.ok || 0), failed: Number(deliveries?.bad || 0), pending: Number(deliveries?.pending || 0) } },
    keys: keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scopes: String(k.scopes || "").split(" "), origins: k.origins ? String(k.origins).split(" ") : [], email: emailOf.get(String(k.user_id)) || null, createdAt: k.created_at, lastUsedAt: k.last_used_at, revokedAt: k.revoked_at })),
    failing: failing.map((w) => ({ id: w.id, url: w.url, email: emailOf.get(w.user_id) || null, failures: w.failures, lastStatus: w.last_status, lastError: w.last_error, lastDeliveryAt: w.last_delivery_at, active: !!w.active })),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
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
  const db = getData(req);
  const b = await readJson(req);
  const id = String(b?.id || b?.userId || "");
  if (b?.action === "revoke") {
    const k = await db.apiKeys.get(id);
    if (!k || k.revoked_at) return fail("Key not found or already revoked.", 404);
    await db.apiKeys.update(id, (x) => (x.revoked_at ? null : { ...x, revoked_at: now() }));
  } else if (b?.action === "revoke-member") {
    for (const k of await db.apiKeys.listAllDocs("user", id)) {
      if (!k.revoked_at) await db.apiKeys.update(k.id, (x) => (x.revoked_at ? null : { ...x, revoked_at: now() }));
    }
  } else if (b?.action === "disable-webhook") {
    if (!(await db.webhooks.get(id))) return fail("Webhook not found.", 404);
    await db.webhooks.update(id, (w) => ({ ...w, active: 0 }));
  } else return fail("Unknown action.");
  await audit(db, ctx.session, `admin.connect.${b.action}`, "connect", id, {}, req);
  return respond({ ok: true }, ctx);
}
