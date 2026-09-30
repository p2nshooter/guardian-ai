/* ==============================================================================
 * AXTO CONNECT — the member's event log: every realtime transport (SSE,
 * WebSocket, long polling, Connect streaming, webhooks, MCP) reads the same
 * ordered log, so a client can switch transports and resume from its cursor
 * (the event id). Payloads are encrypted per member before they reach D1 and
 * are deleted after the retention period (Admin → Connect, default 7 days).
 * ============================================================================ */
import { dbQuery, dbRun, dbFirst, now } from "../db";
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

export async function publishEvent(db: any, userId: string, input: { channel?: unknown; type?: unknown; data?: unknown }, source: string): Promise<ConnectEvent> {
  const cp = channelProblem(input.channel);
  if (cp) throw new ConnectError(cp, 400, "invalid_argument");
  const type = input.type === undefined || input.type === "" ? "message" : input.type;
  if (typeof type !== "string" || !NAME_RE.test(type)) throw new ConnectError("Event types are 1–64 characters: letters, digits and . _ : -", 400, "invalid_argument");
  const json = JSON.stringify(input.data ?? null);
  if (new TextEncoder().encode(json).length > MAX_EVENT_BYTES) throw new ConnectError("Event data is limited to 64 KB.", 413, "invalid_argument");
  const sealed = b64(await sealForUser(userId, aad(userId), json));
  const createdAt = now();
  const row = await dbFirst<{ id: number }>(db, `INSERT INTO connect_events (user_id, channel, type, data, size, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, input.channel as string, type, sealed, json.length, source.slice(0, 40), createdAt]);
  return { id: Number(row?.id || 0), channel: input.channel as string, type, data: input.data ?? null, createdAt, source };
}

/** Events after `after` (exclusive) on the given channel patterns, oldest first. */
export async function eventsAfter(db: any, userId: string, after: number, patterns: string[], limit = 100): Promise<ConnectEvent[]> {
  const out: ConnectEvent[] = [];
  let cursor = Math.max(0, Math.floor(after) || 0);
  // Scan in pages so a busy channel cannot hide a quiet one behind the limit.
  for (let page = 0; page < 5 && out.length < limit; page++) {
    const rows = await dbQuery<{ id: number; channel: string; type: string; data: string; source: string; created_at: string }>(db,
      `SELECT id, channel, type, data, source, created_at FROM connect_events WHERE user_id = ? AND id > ? ORDER BY id ASC LIMIT 200`, [userId, cursor]);
    if (!rows.length) break;
    for (const r of rows) {
      cursor = r.id;
      if (!matches(patterns, r.channel)) continue;
      let data: unknown = null;
      try { data = JSON.parse(new TextDecoder().decode(await openForUser(userId, aad(userId), unb64(r.data)))); } catch { data = null; }
      out.push({ id: r.id, channel: r.channel, type: r.type, data, createdAt: r.created_at, source: r.source });
      if (out.length >= limit) break;
    }
    if (rows.length < 200) break;
  }
  return out;
}

/** Newest event id for the member (for "only new events from now on"). */
export async function latestEventId(db: any, userId: string): Promise<number> {
  const r = await dbFirst<{ id: number }>(db, `SELECT MAX(id) AS id FROM connect_events WHERE user_id = ?`, [userId]);
  return Number(r?.id || 0);
}

/** Hourly housekeeping: drop events (and finished deliveries) past the retention period. */
export async function pruneEvents(db: any, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - Math.max(1, retentionDays) * 86_400_000).toISOString();
  const r = await dbRun(db, `DELETE FROM connect_events WHERE created_at < ?`, [cutoff]);
  await dbRun(db, `DELETE FROM webhook_deliveries WHERE created_at < ? AND done = 1`, [cutoff]).catch(() => {});
  return Number(r?.meta?.changes || 0);
}

/** Resume point from Last-Event-ID / ?after= / ?since=now. */
export async function startCursor(db: any, userId: string, lastEventId: string | null, after: string | null): Promise<number> {
  if (lastEventId && /^\d+$/.test(lastEventId)) return Number(lastEventId);
  if (after === "now") return latestEventId(db, userId);
  if (after && /^\d+$/.test(after)) return Number(after);
  return latestEventId(db, userId);
}
