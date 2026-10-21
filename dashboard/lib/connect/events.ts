/* ==============================================================================
 * AXTO CONNECT — the member's event log: every realtime transport (SSE,
 * WebSocket, long polling, Connect streaming, webhooks, MCP) reads the same
 * ordered log, so a client can switch transports and resume from its cursor
 * (the event id). Payloads are encrypted per member before they are stored
 * and are deleted after the retention period (Admin → Connect, default 7 days).
 *
 * Event ids are numbers that grow with time (milliseconds × 1000 + a counter),
 * so publishing never waits on a shared counter (R2 takes about one write per
 * second per key). Two publishes in flight at the same moment can finish in
 * either order; the realtime transports therefore read up to SETTLE_MS behind
 * "now", so an event can never land behind a cursor a client already holds.
 * ============================================================================ */
import { now } from "../db";
import type { Data } from "../data";
import { ConflictError } from "../r2/store";
import { sealForUser, openForUser } from "../user-crypto";
import { ConnectError } from "./auth";

export const MAX_EVENT_BYTES = 64 * 1024;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.:\-]{0,63}$/;
const PATTERN_RE = /^(\*|[A-Za-z0-9][A-Za-z0-9_.:\-]{0,62}\*?)$/;

export interface ConnectEvent { id: number; channel: string; type: string; data: unknown; createdAt: string; source: string }

const aad = (userId: string) => `connect-event:${userId}`;
const b64 = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function channelProblem(ch: unknown): string | null {
  return typeof ch === "string" && NAME_RE.test(ch) ? null : "Channel names are 1–64 characters: letters, digits and . _ : - (start with a letter or digit).";
}
/** "orders.*", "chat:room-1", "*" … (max 20). */
export function parsePatterns(v: unknown): string[] {
  const list = (Array.isArray(v) ? v : String(v ?? "*").split(/[\s,]+/)).map((x) => String(x).trim()).filter(Boolean);
  const out = Array.from(new Set(list.length ? list : ["*"]));
  if (out.length > 20) throw new ConnectError("Subscribe to at most 20 channels or patterns at once.", 400, "invalid_argument");
  for (const p of out) if (!PATTERN_RE.test(p)) throw new ConnectError(`"${p.slice(0, 70)}" is not a valid channel or pattern.`, 400, "invalid_argument");
  return out;
}
export const matches = (patterns: string[], channel: string) =>
  patterns.some((p) => p === "*" || p === channel || (p.endsWith("*") && channel.startsWith(p.slice(0, -1))));

/** How far behind "now" the realtime transports read (see the header). */
export const SETTLE_MS = 1000;

let lastMs = 0;
let counter = 0;
/** The next event id: time-ordered, unique within this isolate; a clash across isolates is retried. */
function nextSeq(): number {
  const ms = Date.now();
  if (ms === lastMs) counter = (counter + 1) % 1000;
  else { lastMs = ms; counter = Math.floor(Math.random() * 100); }
  return ms * 1000 + counter;
}
const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(16, "0");

export async function publishEvent(db: Data, userId: string, input: { channel?: unknown; type?: unknown; data?: unknown }, source: string): Promise<ConnectEvent> {
  const cp = channelProblem(input.channel);
  if (cp) throw new ConnectError(cp, 400, "invalid_argument");
  const type = input.type === undefined || input.type === "" ? "message" : input.type;
  if (typeof type !== "string" || !NAME_RE.test(type)) throw new ConnectError("Event types are 1–64 characters: letters, digits and . _ : -", 400, "invalid_argument");
  const json = JSON.stringify(input.data ?? null);
  if (new TextEncoder().encode(json).length > MAX_EVENT_BYTES) throw new ConnectError("Event data is limited to 64 KB.", 413, "invalid_argument");
  const sealed = b64(await sealForUser(userId, aad(userId), json));
  const createdAt = now();
  for (let attempt = 0; ; attempt++) {
    const seq = nextSeq() + attempt;
    try {
      await db.connectEvents.create({ id: String(seq), seq, user_id: userId, channel: input.channel as string, type, data: sealed, size: json.length, source: source.slice(0, 40), created_at: createdAt });
      return { id: seq, channel: input.channel as string, type, data: input.data ?? null, createdAt, source };
    } catch (err) {
      if (!(err instanceof ConflictError) || attempt >= 5) throw err;
    }
  }
}

/**
 * Events after `after` (exclusive) on the given channel patterns, oldest first.
 * `settleMs`: leave out events younger than this (the realtime loops pass SETTLE_MS).
 */
export async function eventsAfter(db: Data, userId: string, after: number, patterns: string[], limit = 100, settleMs = 0): Promise<ConnectEvent[]> {
  const out: ConnectEvent[] = [];
  const until = (Date.now() - settleMs) * 1000 + 999;
  let cursor = Math.max(0, Math.floor(after) || 0);
  // Scan in pages so a busy channel cannot hide a quiet one behind the limit.
  for (let page = 0; page < 5 && out.length < limit; page++) {
    const { entries } = await db.connectEvents.list("user", userId, { afterSort: pad(cursor), limit: 200 });
    if (!entries.length) break;
    // The index summary holds the channel: only matching events are read.
    let stop = false;
    const wanted: string[] = [];
    for (const e of entries) {
      if (Number(e.meta.seq) > until) { stop = true; break; }
      if (matches(patterns, String(e.meta.channel || ""))) wanted.push(e.id);
    }
    const docs = new Map((await db.connectEvents.getMany(wanted)).filter((d) => d).map((d) => [d!.id, d!]));
    for (const e of entries) {
      const seq = Number(e.meta.seq);
      if (seq > until) break;
      cursor = seq;
      const r = docs.get(e.id);
      if (!r) continue;
      let data: unknown = null;
      try { data = JSON.parse(new TextDecoder().decode(await openForUser(userId, aad(userId), unb64(r.data)))); } catch { data = null; }
      out.push({ id: r.seq, channel: r.channel, type: r.type, data, createdAt: r.created_at, source: r.source });
      if (out.length >= limit) break;
    }
    if (stop || entries.length < 200) break;
  }
  return out;
}

/** Events of the last 24 hours and the newest one's time (portal usage panel). */
export async function eventUsage(db: Data, userId: string): Promise<{ events24h: number; lastEventAt: string | null }> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  let n = 0;
  let last: string | null = null;
  let cursor: string | undefined;
  do {
    const page = await db.connectEvents.list("user", userId, { cursor, limit: 1000 });
    for (const e of page.entries) {
      const at = String(e.meta.created_at || "");
      if (at > since) n++;
      if (!last || at > last) last = at;
    }
    cursor = page.cursor;
  } while (cursor);
  return { events24h: n, lastEventAt: last };
}

/** The id a client starting "now" resumes from: every event published from this moment on has a larger id. */
export async function latestEventId(_db: Data, _userId: string): Promise<number> {
  return (Date.now() - SETTLE_MS) * 1000;
}

/** Most events one housekeeping run deletes (each is a few R2 calls). */
const PRUNE_MAX = 150;

/** Housekeeping: drop events (and finished deliveries) past the retention period, oldest first. */
export async function pruneEvents(db: Data, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - Math.max(1, retentionDays) * 86_400_000).toISOString();
  let removed = 0;
  const events = await db.connectEvents.list("all", "all", { limit: PRUNE_MAX });
  for (const e of events.entries) {
    if (String(e.meta.created_at || "") >= cutoff) break;
    if (await db.connectEvents.delete(e.id)) removed++;
  }
  const deliveries = await db.webhookDeliveries.list("all", "all", { limit: PRUNE_MAX });
  for (const d of deliveries.entries) {
    if (String(d.meta.created_at || "") >= cutoff) break;
    if (Number(d.meta.done) === 1) await db.webhookDeliveries.delete(d.id).catch(() => false);
  }
  return removed;
}

/** Resume point from Last-Event-ID / ?after= / ?since=now. */
export async function startCursor(db: Data, userId: string, lastEventId: string | null, after: string | null): Promise<number> {
  if (lastEventId && /^\d+$/.test(lastEventId)) return Number(lastEventId);
  if (after === "now") return latestEventId(db, userId);
  if (after && /^\d+$/.test(after)) return Number(after);
  return latestEventId(db, userId);
}
