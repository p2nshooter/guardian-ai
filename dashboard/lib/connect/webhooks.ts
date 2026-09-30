/* ==============================================================================
 * AXTO CONNECT — outbound webhooks.
 *   POST <url>  body {id, channel, type, data, createdAt, webhook}
 *   X-AXTO-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<body>")>
 *   X-AXTO-Event: <type>   X-AXTO-Delivery: <delivery id>
 * HTTPS only, public hosts only, no redirects followed (no SSRF). Failed
 * deliveries retry after 1 min, 5 min, 30 min, 2 h, 6 h and 24 h; an endpoint
 * that fails 20 times in a row is switched off. Signing secrets are encrypted
 * per member and shown once.
 * ============================================================================ */
import { dbQuery, dbRun, dbFirst, newId, now } from "../db";
import { sealForUser, openForUser } from "../user-crypto";
import { endpointProblem } from "../ai/providers";
import { limitsFor, type Tier } from "../plans";
import { ConnectError } from "./auth";
import { matches, parsePatterns, type ConnectEvent } from "./events";

export interface Webhook { id: string; url: string; channels: string[]; types: string[]; active: boolean; failures: number; lastStatus: number | null; lastError: string | null; lastDeliveryAt: string | null; createdAt: string }
export interface Delivery { id: string; eventId: number; attempt: number; status: number | null; durationMs: number | null; error: string | null; done: boolean; nextAt: string | null; createdAt: string }

const BACKOFF_MIN = [1, 5, 30, 120, 360, 1440];
const MAX_ATTEMPTS = BACKOFF_MIN.length + 1;
const DISABLE_AFTER = 20;
const aad = (userId: string, id: string) => `connect-webhook:${userId}:${id}`;
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64u = (b: Uint8Array) => b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

type Row = { id: string; user_id: string; url: string; secret_enc: string; channels: string; types: string; active: number; failures: number; last_status: number | null; last_error: string | null; last_delivery_at: string | null; created_at: string };
const toHook = (r: Row): Webhook => ({
  id: r.id, url: r.url, channels: r.channels.split(" "), types: r.types.split(" "), active: !!r.active, failures: r.failures,
  lastStatus: r.last_status, lastError: r.last_error, lastDeliveryAt: r.last_delivery_at, createdAt: r.created_at,
});

export function webhookUrlProblem(url: unknown): string | null {
  if (typeof url !== "string" || url.length > 500) return "Enter the full https:// URL of your endpoint.";
  const p = endpointProblem(url);
  if (p) return p;
  const u = new URL(url);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.startsWith("[")) return "Use a hostname, not an IP address.";
  if (u.username || u.password) return "Do not put credentials in the URL — verify the X-AXTO-Signature header instead.";
  return null;
}
const typePatterns = (v: unknown) => parsePatterns(v ?? "*");

export async function listWebhooks(db: any, userId: string): Promise<Webhook[]> {
  return (await dbQuery<Row>(db, `SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC`, [userId])).map(toHook);
}

export async function createWebhook(db: any, userId: string, tier: Tier, b: any): Promise<{ webhook: Webhook; secret: string }> {
  const problem = webhookUrlProblem(b?.url);
  if (problem) throw new ConnectError(problem, 400, "invalid_argument");
  const max = limitsFor(tier).webhooks;
  const count = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM webhooks WHERE user_id = ?`, [userId]);
  if (Number(count?.n || 0) >= max) throw new ConnectError(max ? `Your plan includes ${max} webhook${max === 1 ? "" : "s"}. Delete one or upgrade.` : "Webhooks need a paid plan.", 402, "resource_exhausted");
  const id = newId("wh").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const secret = "whsec_" + b64u(crypto.getRandomValues(new Uint8Array(32)));
  const channels = parsePatterns(b?.channels ?? "*").join(" ");
  const types = typePatterns(b?.types).join(" ");
  await dbRun(db, `INSERT INTO webhooks (id, user_id, url, secret_enc, channels, types, active, failures, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)`,
    [id, userId, b.url, b64(await sealForUser(userId, aad(userId, id), secret)), channels, types, now()]);
  const row = await dbFirst<Row>(db, `SELECT * FROM webhooks WHERE id = ?`, [id]);
  return { webhook: toHook(row!), secret };
}

async function own(db: any, userId: string, id: string): Promise<Row> {
  const r = await dbFirst<Row>(db, `SELECT * FROM webhooks WHERE id = ? AND user_id = ?`, [String(id || ""), userId]);
  if (!r) throw new ConnectError("Webhook not found.", 404, "not_found");
  return r;
}

export async function updateWebhook(db: any, userId: string, id: string, b: any): Promise<Webhook> {
  const r = await own(db, userId, id);
  const url = b?.url !== undefined ? b.url : r.url;
  const problem = webhookUrlProblem(url);
  if (problem) throw new ConnectError(problem, 400, "invalid_argument");
  const channels = b?.channels !== undefined ? parsePatterns(b.channels).join(" ") : r.channels;
  const types = b?.types !== undefined ? typePatterns(b.types).join(" ") : r.types;
  const active = b?.active !== undefined ? (b.active ? 1 : 0) : r.active;
  // Switching back on clears the failure streak.
  await dbRun(db, `UPDATE webhooks SET url = ?, channels = ?, types = ?, active = ?, failures = CASE WHEN ? = 1 AND active = 0 THEN 0 ELSE failures END WHERE id = ?`,
    [url, channels, types, active, active, id]);
  return toHook((await dbFirst<Row>(db, `SELECT * FROM webhooks WHERE id = ?`, [id]))!);
}

export async function rotateSecret(db: any, userId: string, id: string): Promise<string> {
  await own(db, userId, id);
  const secret = "whsec_" + b64u(crypto.getRandomValues(new Uint8Array(32)));
  await dbRun(db, `UPDATE webhooks SET secret_enc = ? WHERE id = ?`, [b64(await sealForUser(userId, aad(userId, id), secret)), id]);
  return secret;
}

export async function deleteWebhook(db: any, userId: string, id: string): Promise<void> {
  await own(db, userId, id);
  await dbRun(db, `DELETE FROM webhook_deliveries WHERE webhook_id = ?`, [id]);
  await dbRun(db, `DELETE FROM webhooks WHERE id = ?`, [id]);
}

export async function listDeliveries(db: any, userId: string, id: string): Promise<Delivery[]> {
  await own(db, userId, id);
  const rows = await dbQuery<any>(db, `SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50`, [id]);
  return rows.map((r) => ({ id: r.id, eventId: r.event_id, attempt: r.attempt, status: r.status, durationMs: r.duration_ms, error: r.error, done: !!r.done, nextAt: r.next_at, createdAt: r.created_at }));
}

/** HMAC-SHA256 signature header for a body (exported for tests and receivers' reference). */
export async function signatureHeader(secret: string, body: string, t = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `t=${t},v1=${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)))}`;
}

/** One HTTP attempt. Returns the status (0 = network error) and a short error. */
async function post(hook: Row, deliveryId: string, event: Pick<ConnectEvent, "id" | "channel" | "type" | "data" | "createdAt">): Promise<{ status: number; error: string | null; ms: number }> {
  const secret = new TextDecoder().decode(await openForUser(hook.user_id, aad(hook.user_id, hook.id), unb64(hook.secret_enc)));
  const body = JSON.stringify({ id: event.id, channel: event.channel, type: event.type, data: event.data, createdAt: event.createdAt, webhook: hook.id });
  const t0 = Date.now();
  try {
    const res = await fetch(hook.url, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json", "User-Agent": "AXTO-Webhooks/1.0 (+https://axto.io/developers)", "X-AXTO-Event": event.type, "X-AXTO-Delivery": deliveryId, "X-AXTO-Signature": await signatureHeader(secret, body) },
      body,
    });
    await res.body?.cancel().catch(() => {});
    return { status: res.status, error: res.ok ? null : `HTTP ${res.status}`, ms: Date.now() - t0 };
  } catch (e: any) {
    return { status: 0, error: String(e?.message || e).slice(0, 200), ms: Date.now() - t0 };
  }
}

async function record(db: any, hook: Row, deliveryId: string, attempt: number, r: { status: number; error: string | null; ms: number }) {
  const ok = r.status >= 200 && r.status < 300;
  const last = attempt >= MAX_ATTEMPTS;
  const nextAt = ok || last ? null : new Date(Date.now() + BACKOFF_MIN[Math.min(attempt - 1, BACKOFF_MIN.length - 1)] * 60_000).toISOString();
  await dbRun(db, `UPDATE webhook_deliveries SET attempt = ?, status = ?, duration_ms = ?, error = ?, done = ?, next_at = ?, updated_at = ? WHERE id = ?`,
    [attempt, r.status, r.ms, r.error, ok || last ? 1 : 0, nextAt, now(), deliveryId]);
  const failures = ok ? 0 : hook.failures + 1;
  await dbRun(db, `UPDATE webhooks SET last_status = ?, last_error = ?, last_delivery_at = ?, failures = ?, active = CASE WHEN ? >= ? THEN 0 ELSE active END WHERE id = ?`,
    [r.status, r.error, now(), failures, failures, DISABLE_AFTER, hook.id]);
  hook.failures = failures;
}

/** New event → one delivery per matching active webhook, attempted at once. */
export async function fanOut(db: any, userId: string, event: ConnectEvent): Promise<number> {
  const hooks = (await dbQuery<Row>(db, `SELECT * FROM webhooks WHERE user_id = ? AND active = 1`, [userId]))
    .filter((h) => matches(h.channels.split(" "), event.channel) && matches(h.types.split(" "), event.type));
  await Promise.all(hooks.map(async (h) => {
    const id = newId("dl").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    await dbRun(db, `INSERT INTO webhook_deliveries (id, webhook_id, user_id, event_id, attempt, done, next_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [id, h.id, userId, event.id, now(), now(), now()]);
    await record(db, h, id, 1, await post(h, id, event));
  }));
  return hooks.length;
}

/** Cron: retry deliveries whose time has come (bounded per tick). */
export async function retryDue(db: any, max = 25): Promise<{ retried: number }> {
  const due = await dbQuery<any>(db, `SELECT * FROM webhook_deliveries WHERE done = 0 AND next_at <= ? ORDER BY next_at LIMIT ?`, [now(), max]);
  for (const d of due) {
    const hook = await dbFirst<Row>(db, `SELECT * FROM webhooks WHERE id = ?`, [d.webhook_id]);
    if (!hook || !hook.active) { await dbRun(db, `UPDATE webhook_deliveries SET done = 1, next_at = NULL, error = 'endpoint switched off' WHERE id = ?`, [d.id]); continue; }
    const ev = await dbFirst<any>(db, `SELECT id, channel, type, data, created_at FROM connect_events WHERE id = ? AND user_id = ?`, [d.event_id, d.user_id]);
    if (!ev) { await dbRun(db, `UPDATE webhook_deliveries SET done = 1, next_at = NULL, error = 'event expired' WHERE id = ?`, [d.id]); continue; }
    let data: unknown = null;
    try { data = JSON.parse(new TextDecoder().decode(await openForUser(d.user_id, `connect-event:${d.user_id}`, unb64(ev.data)))); } catch {}
    await record(db, hook, d.id, Number(d.attempt) + 1, await post(hook, d.id, { id: ev.id, channel: ev.channel, type: ev.type, data, createdAt: ev.created_at }));
  }
  return { retried: due.length };
}

/** "Send test event": a signed delivery that is not stored as an event. */
export async function testWebhook(db: any, userId: string, id: string): Promise<{ status: number; error: string | null; ms: number }> {
  const hook = await own(db, userId, id);
  return post(hook, "test", { id: 0, channel: "axto.test", type: "webhook.test", data: { hello: "from AXTO Connect", at: now() }, createdAt: now() });
}
