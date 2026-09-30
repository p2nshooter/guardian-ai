/* AXTO Connect — the member's own management API (portal session only)
 *   GET    /api/connect                      overview: keys, webhooks, limits, usage
 *   POST   /api/connect/keys                 {name, scopes, origins}  → {key (shown once), apiKey}
 *   PATCH  /api/connect/keys/:id             {name?, scopes?, origins?}
 *   DELETE /api/connect/keys/:id             revoke
 *   POST   /api/connect/webhooks             {url, channels, types}   → {webhook, secret (shown once)}
 *   PATCH  /api/connect/webhooks/:id         {url?, channels?, types?, active?}
 *   DELETE /api/connect/webhooks/:id
 *   POST   /api/connect/webhooks/:id/test    signed test delivery
 *   POST   /api/connect/webhooks/:id/rotate  new signing secret (shown once)
 *   GET    /api/connect/webhooks/:id/deliveries */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, newId, now } from "@/lib/db";
import { loadSession, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { ConnectError, cleanOrigins, cleanScopes, newApiKey, sha256Hex, KEY_PREFIX } from "@/lib/connect/auth";
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, rotateSecret, listDeliveries } from "@/lib/connect/webhooks";
import { getConnectSettings } from "@/lib/connect/settings";

type Params = { params: Promise<{ slug?: string[] }> };

async function guard(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return { res: unauthorized() } as const;
  const tier = effectiveTier(ctx.session);
  return { ctx, tier, db: getDB(req) } as const;
}
const handle = (e: unknown) => { if (e instanceof ConnectError) return fail(e.message, e.status); throw e; };
const keyRow = (r: any) => ({ id: r.id, name: r.name, prefix: r.prefix, scopes: r.scopes.split(" "), origins: r.origins ? r.origins.split(" ") : [], createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at });

export async function GET(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const [kind, id, sub] = (await params).slug || [];
  const uid = g.ctx.session.sub;
  try {
    if (kind === "webhooks" && id && sub === "deliveries") return respond({ deliveries: await listDeliveries(g.db, uid, id) }, g.ctx);
    if (kind) return fail("Not found.", 404);
    const l = limitsFor(g.tier);
    const keys = (await dbQuery<any>(g.db, `SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`, [uid])).map(keyRow);
    const usage = await dbFirst<{ n: number; last: string | null }>(g.db, `SELECT COUNT(*) AS n, MAX(created_at) AS last FROM connect_events WHERE user_id = ? AND created_at > ?`, [uid, new Date(Date.now() - 86_400_000).toISOString()]);
    const settings = await getConnectSettings(g.db);
    return respond({
      enabled: settings.enabled, retentionDays: settings.retentionDays,
      limits: { apiKeys: l.apiKeys, apiRpm: l.apiRpm, webhooks: l.webhooks },
      keys, webhooks: await listWebhooks(g.db, uid),
      usage: { events24h: Number(usage?.n || 0), lastEventAt: usage?.last || null },
    }, g.ctx);
  } catch (e) { return handle(e); }
}

export async function POST(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const rl = await rateLimit(req, "connect-admin", g.ctx.session.sub, { max: 60, windowSeconds: 600 });
  if (rl.limited) return fail("Too many changes at once. Please wait a moment.", 429);
  const [kind, id, verb] = (await params).slug || [];
  const uid = g.ctx.session.sub;
  const b = await readJson(req);
  const l = limitsFor(g.tier);
  try {
    if (kind === "keys" && !id) {
      if (l.apiKeys <= 0) return fail("The developer API needs a paid plan.", 402, { upgrade: true });
      const active = await dbFirst<{ n: number }>(g.db, `SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL`, [uid]);
      if (Number(active?.n || 0) >= l.apiKeys) return fail(`Your plan includes ${l.apiKeys} active key${l.apiKeys === 1 ? "" : "s"}. Revoke one or upgrade.`, 402, { upgrade: true });
      const name = String(b?.name || "").trim().slice(0, 80) || "API key";
      const key = newApiKey();
      const kid = newId("ak").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
      const scopes = cleanScopes(b?.scopes), origins = cleanOrigins(b?.origins);
      await dbRun(g.db, `INSERT INTO api_keys (id, user_id, name, prefix, hash, scopes, origins, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [kid, uid, name, key.slice(0, KEY_PREFIX.length + 6), await sha256Hex(key), scopes.join(" "), origins.join(" "), now()]);
      await audit(g.db, g.ctx.session, "connect.key.create", "api_key", kid, { name, scopes }, req);
      const row = await dbFirst<any>(g.db, `SELECT * FROM api_keys WHERE id = ?`, [kid]);
      return respond({ ok: true, key: keyRow(row), apiKey: key }, g.ctx);
    }
    if (kind === "webhooks" && !id) {
      const r = await createWebhook(g.db, uid, g.tier, b);
      await audit(g.db, g.ctx.session, "connect.webhook.create", "webhook", r.webhook.id, { url: r.webhook.url }, req);
      return respond({ ok: true, ...r }, g.ctx);
    }
    if (kind === "webhooks" && id && verb === "test") return respond({ ok: true, result: await testWebhook(g.db, uid, id) }, g.ctx);
    if (kind === "webhooks" && id && verb === "rotate") {
      const secret = await rotateSecret(g.db, uid, id);
      await audit(g.db, g.ctx.session, "connect.webhook.rotate", "webhook", id, {}, req);
      return respond({ ok: true, secret }, g.ctx);
    }
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const [kind, id] = (await params).slug || [];
  const uid = g.ctx.session.sub;
  const b = await readJson(req);
  try {
    if (kind === "keys" && id) {
      const row = await dbFirst<any>(g.db, `SELECT * FROM api_keys WHERE id = ? AND user_id = ?`, [id, uid]);
      if (!row || row.revoked_at) return fail("Key not found.", 404);
      const name = b?.name !== undefined ? String(b.name).trim().slice(0, 80) || row.name : row.name;
      const scopes = b?.scopes !== undefined ? cleanScopes(b.scopes).join(" ") : row.scopes;
      const origins = b?.origins !== undefined ? cleanOrigins(b.origins).join(" ") : row.origins;
      await dbRun(g.db, `UPDATE api_keys SET name = ?, scopes = ?, origins = ? WHERE id = ?`, [name, scopes, origins, id]);
      await audit(g.db, g.ctx.session, "connect.key.update", "api_key", id, { scopes }, req);
      return respond({ ok: true, key: keyRow(await dbFirst<any>(g.db, `SELECT * FROM api_keys WHERE id = ?`, [id])) }, g.ctx);
    }
    if (kind === "webhooks" && id) return respond({ ok: true, webhook: await updateWebhook(g.db, uid, id, b) }, g.ctx);
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const [kind, id] = (await params).slug || [];
  const uid = g.ctx.session.sub;
  try {
    if (kind === "keys" && id) {
      const r = await dbRun(g.db, `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`, [now(), id, uid]);
      if (!r?.meta?.changes) return fail("Key not found.", 404);
      await audit(g.db, g.ctx.session, "connect.key.revoke", "api_key", id, {}, req);
      return respond({ ok: true }, g.ctx);
    }
    if (kind === "webhooks" && id) {
      await deleteWebhook(g.db, uid, id);
      await audit(g.db, g.ctx.session, "connect.webhook.delete", "webhook", id, {}, req);
      return respond({ ok: true }, g.ctx);
    }
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}
