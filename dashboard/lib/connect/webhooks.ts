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
import { newId, now } from "../db";
import type { Data } from "../data";
import type { WebhookDoc } from "../data/schema";
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

type Row = WebhookDoc;
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

export async function listWebhooks(db: Data, userId: string): Promise<Webhook[]> {
  return (await db.webhooks.listAllDocs("user", userId)).map(toHook);
}

export async function createWebhook(db: Data, userId: string, tier: Tier, b: any): Promise<{ webhook: Webhook; secret: string }> {
  const problem = webhookUrlProblem(b?.url);
  if (problem) throw new ConnectError(problem, 400, "invalid_argument");
  const max = limitsFor(tier).webhooks;
  const count = await db.webhooks.count("user", userId);
  if (count >= max) throw new ConnectError(max ? `Your plan includes ${max} webhook${max === 1 ? "" : "s"}. Delete one or upgrade.` : "Webhooks need a paid plan.", 402, "resource_exhausted");
  const id = newId("wh").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const secret = "whsec_" + b64u(crypto.getRandomValues(new Uint8Array(32)));
  const channels = parsePatterns(b?.channels ?? "*").join(" ");
  const types = typePatterns(b?.types).join(" ");
  const row = await db.webhooks.create({
    id, user_id: userId, url: b.url, secret_enc: b64(await sealForUser(userId, aad(userId, id), secret)), channels, types, active: 1, failures: 0,
    last_status: null, last_error: null, last_delivery_at: null, created_at: now(),
  });
  return { webhook: toHook(row), secret };
}

async function own(db: Data, userId: string, id: string): Promise<Row> {
  const r = id ? await db.webhooks.get(String(id)).catch(() => null) : null;
  if (!r || r.user_id !== userId) throw new ConnectError("Webhook not found.", 404, "not_found");
  return r;
}

export async function updateWebhook(db: Data, userId: string, id: string, b: any): Promise<Webhook> {
  const r = await own(db, userId, id);
  const url = b?.url !== undefined ? b.url : r.url;
  const problem = webhookUrlProblem(url);
  if (problem) throw new ConnectError(problem, 400, "invalid_argument");
  const channels = b?.channels !== undefined ? parsePatterns(b.channels).join(" ") : r.channels;
  const types = b?.types !== undefined ? typePatterns(b.types).join(" ") : r.types;
  const active = b?.active !== undefined ? (b.active ? 1 : 0) : r.active;
  // Switching back on clears the failure streak.
  return toHook(await db.webhooks.update(id, (w) => ({ ...w, url, channels, types, active, failures: active === 1 && !w.active ? 0 : w.failures })));
}

export async function rotateSecret(db: Data, userId: string, id: string): Promise<string> {
  await own(db, userId, id);
  const secret = "whsec_" + b64u(crypto.getRandomValues(new Uint8Array(32)));
  const enc = b64(await sealForUser(userId, aad(userId, id), secret));
  await db.webhooks.update(id, (w) => ({ ...w, secret_enc: enc }));
  return secret;
}

export async function deleteWebhook(db: Data, userId: string, id: string): Promise<void> {
  await own(db, userId, id);
  for (const d of await db.webhookDeliveries.listAllDocs("webhook", id)) await db.webhookDeliveries.delete(d.id);
  await db.webhooks.delete(id);
}

export async function listDeliveries(db: Data, userId: string, id: string): Promise<Delivery[]> {
  await own(db, userId, id);
  const { docs } = await db.webhookDeliveries.listDocs("webhook", id, { limit: 50 });
  return docs.map((r) => ({ id: r.id, eventId: r.event_id, attempt: r.attempt, status: r.status, durationMs: r.duration_ms, error: r.error, done: !!r.done, nextAt: r.next_at, createdAt: r.created_at }));
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

async function record(db: Data, hook: Row, deliveryId: string, attempt: number, r: { status: number; error: string | null; ms: number }) {
  const ok = r.status >= 200 && r.status < 300;
  const last = attempt >= MAX_ATTEMPTS;
  const nextAt = ok || last ? null : new Date(Date.now() + BACKOFF_MIN[Math.min(attempt - 1, BACKOFF_MIN.length - 1)] * 60_000).toISOString();
  await db.webhookDeliveries.update(deliveryId, (d) => ({ ...d, attempt, status: r.status, duration_ms: r.ms, error: r.error, done: ok || last ? 1 : 0, next_at: nextAt, updated_at: now() }));
  const after = await db.webhooks.update(hook.id, (w) => {
    const failures = ok ? 0 : w.failures + 1;
    return { ...w, last_status: r.status, last_error: r.error, last_delivery_at: now(), failures, active: failures >= DISABLE_AFTER ? 0 : w.active };
  });
  hook.failures = after.failures;
}

/** New event → one delivery per matching active webhook, attempted at once. */
export async function fanOut(db: Data, userId: string, event: ConnectEvent): Promise<number> {
  const hooks = (await db.webhooks.listAllDocs("user", userId))
    .filter((h) => h.active && matches(h.channels.split(" "), event.channel) && matches(h.types.split(" "), event.type));
  await Promise.all(hooks.map(async (h) => {
    const id = newId("dl").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    const at = now();
    await db.webhookDeliveries.create({ id, webhook_id: h.id, user_id: userId, event_id: event.id, attempt: 0, status: null, duration_ms: null, error: null, done: 0, next_at: at, created_at: at, updated_at: at });
    await record(db, h, id, 1, await post(h, id, event));
  }));
  return hooks.length;
}

/** Cron: retry deliveries whose time has come (bounded per tick). */
export async function retryDue(db: Data, max = 25): Promise<{ retried: number }> {
  const at = now();
  // The "due" index holds unfinished deliveries, the earliest next attempt first.
  const { docs } = await db.webhookDeliveries.listDocs("due", "all", { limit: max });
  const due = docs.filter((d) => !d.done && (d.next_at || "") <= at);
  for (const d of due) {
    const hook = await db.webhooks.get(d.webhook_id);
    if (!hook || !hook.active) { await db.webhookDeliveries.update(d.id, (x) => ({ ...x, done: 1, next_at: null, error: "endpoint switched off" })); continue; }
    const ev = await db.connectEvents.get(String(d.event_id));
    if (!ev || ev.user_id !== d.user_id) { await db.webhookDeliveries.update(d.id, (x) => ({ ...x, done: 1, next_at: null, error: "event expired" })); continue; }
    let data: unknown = null;
    try { data = JSON.parse(new TextDecoder().decode(await openForUser(d.user_id, `connect-event:${d.user_id}`, unb64(ev.data)))); } catch {}
    await record(db, hook, d.id, Number(d.attempt) + 1, await post(hook, d.id, { id: ev.seq, channel: ev.channel, type: ev.type, data, createdAt: ev.created_at }));
  }
  return { retried: due.length };
}

/** "Send test event": a signed delivery that is not stored as an event. */
export async function testWebhook(db: Data, userId: string, id: string): Promise<{ status: number; error: string | null; ms: number }> {
  const hook = await own(db, userId, id);
  return post(hook, "test", { id: 0, channel: "axto.test", type: "webhook.test", data: { hello: "from AXTO Connect", at: now() }, createdAt: now() });
}
