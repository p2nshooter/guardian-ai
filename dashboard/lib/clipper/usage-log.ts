/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — usage log (REQUESTS 137, docs/apps/CLIPPER-BLUEPRINT.md §8 and §11 C1).
 *
 *   What a member and Admin need to see how Clipper is used and where the
 *   limits bite: each video counted against the month, every refusal at the
 *   video quota or the storage limit, and the project events that change
 *   storage (created, restored, deleted, another device's copy overwritten).
 *
 *   R2 only (collection clipper_usage): one document per event with a ULID id,
 *   two index entries (per member, per month), newest first. Never a hot key.
 *   Writing the log never fails the action it records.
 * ============================================================================ */
import type { Data } from "../data";
import type { ClipperUsageDoc } from "../data/schema";
import { getUsage, type UsageSnapshot } from "../usage";
import { monthKey, type Tier } from "../plans";
import { ulid } from "../r2/ulid";

export type ClipperEvent = ClipperUsageDoc["event"];
export const CLIPPER_EVENTS: ClipperEvent[] = ["video", "quota_full", "storage_full", "project_created", "project_restored", "project_deleted", "conflict_overwrite"];

export interface ClipperEventRow { id: string; event: ClipperEvent; project_id: string; bytes: number; detail: string; created_at: string; user_id?: string }

export async function logClipper(db: Data, userId: string, event: ClipperEvent, extra: { project_id?: string; bytes?: number; detail?: string } = {}): Promise<void> {
  const at = new Date();
  try {
    await db.clipperUsage.create({
      id: ulid(at.getTime()), user_id: userId, month: monthKey(at), event,
      project_id: String(extra.project_id || "").slice(0, 40), bytes: Math.round(extra.bytes || 0), detail: String(extra.detail || "").slice(0, 300),
      created_at: at.toISOString(),
    });
  } catch { /* the log is a record of the action, never a reason for it to fail */ }
}

const row = (e: { id: string; meta: Record<string, unknown> }): ClipperEventRow => ({
  id: e.id, event: String(e.meta.event) as ClipperEvent, project_id: String(e.meta.project_id || ""), bytes: Number(e.meta.bytes) || 0,
  detail: String(e.meta.detail || ""), created_at: String(e.meta.created_at || ""), ...(e.meta.user_id ? { user_id: String(e.meta.user_id) } : {}),
});

/** A member's own view: this month's quota and storage, and their latest events. */
export async function memberUsage(db: Data, userId: string, tier: Tier, limit = 50): Promise<{ usage: UsageSnapshot; events: ClipperEventRow[] }> {
  const [usage, page] = await Promise.all([getUsage(db, userId, tier), db.clipperUsage.list("user", userId, { limit })]);
  return { usage, events: page.entries.map(row) };
}

export interface ClipperMonthReport {
  month: string;
  videos: number;
  members: number;
  /** Members by videos this month, most first. */
  top: { user_id: string; videos: number }[];
  counts: Record<ClipperEvent, number>;
  events: ClipperEventRow[];
}

/** Admin's view of one month, from index summaries only (list calls, no document reads). */
export async function monthReport(db: Data, month = monthKey(), limit = 200): Promise<ClipperMonthReport> {
  const [usage, log] = await Promise.all([db.byoxUsage.listAll("month", month), db.clipperUsage.listAll("month", month, 20_000)]);
  const users = usage.map((e) => ({ user_id: e.id.slice(0, e.id.length - month.length - 1), videos: Number(e.meta.clipper_videos) || 0 })).filter((u) => u.videos > 0);
  const counts = Object.fromEntries(CLIPPER_EVENTS.map((k) => [k, 0])) as Record<ClipperEvent, number>;
  for (const e of log) { const k = String(e.meta.event) as ClipperEvent; if (k in counts) counts[k] += 1; }
  return {
    month, videos: users.reduce((n, u) => n + u.videos, 0), members: users.length,
    top: users.sort((a, b) => b.videos - a.videos).slice(0, 20), counts, events: log.slice(0, limit).map(row),
  };
}
