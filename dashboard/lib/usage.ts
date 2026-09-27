/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * BYOX usage & plan quotas (Clipper videos, storage). AI itself is unmetered
 * on the BYOX path — the member pays their own provider. Managed-AI credits
 * are tracked separately in lib/ai/managed.ts (table managed_usage).
 * ============================================================================ */
import { dbFirst, dbRun } from "./db";
import { limitsFor, monthKey, type Tier } from "./plans";

export interface UsageSnapshot {
  month: string;
  requests: number;
  clipperVideos: number;
  clipperLimit: number;       // -1 = unlimited
  storageBytes: number;
  storageLimit: number;
}

export async function getUsage(db: any, userId: string, tier: Tier): Promise<UsageSnapshot> {
  const m = monthKey();
  const row = await dbFirst<{ requests: number; clipper_videos: number; storage_bytes: number }>(db,
    `SELECT COALESCE(b.requests, 0) AS requests, COALESCE(b.clipper_videos, 0) AS clipper_videos, us.storage_bytes
       FROM users us LEFT JOIN byox_usage b ON b.user_id = us.id AND b.month = ?
      WHERE us.id = ?`, [m, userId]);
  const lim = limitsFor(tier);
  return {
    month: m, requests: row?.requests ?? 0, clipperVideos: row?.clipper_videos ?? 0, clipperLimit: lim.clipperVideosPerMonth,
    storageBytes: row?.storage_bytes ?? 0, storageLimit: lim.storageGB * 1024 ** 3,
  };
}

export async function recordByoxRequest(db: any, userId: string): Promise<void> {
  await dbRun(db,
    `INSERT INTO byox_usage (user_id, month, requests, clipper_videos) VALUES (?, ?, 1, 0)
     ON CONFLICT(user_id, month) DO UPDATE SET requests = requests + 1`, [userId, monthKey()]);
}

/** Reserve one Clipper video for this month; returns an error message if the quota is used up. */
export async function reserveClipperVideo(db: any, userId: string, tier: Tier): Promise<string | null> {
  const lim = limitsFor(tier).clipperVideosPerMonth;
  if (lim === 0) return "Your plan does not include Clipper. Choose a plan to continue.";
  if (lim > 0) {
    const row = await dbFirst<{ clipper_videos: number }>(db, `SELECT clipper_videos FROM byox_usage WHERE user_id = ? AND month = ?`, [userId, monthKey()]);
    if ((row?.clipper_videos ?? 0) >= lim) return `You have processed all ${lim} Clipper videos for this month. Upgrade your plan for more.`;
  }
  await dbRun(db,
    `INSERT INTO byox_usage (user_id, month, requests, clipper_videos) VALUES (?, ?, 0, 1)
     ON CONFLICT(user_id, month) DO UPDATE SET clipper_videos = clipper_videos + 1`, [userId, monthKey()]);
  return null;
}

export function storageProblem(u: UsageSnapshot, addBytes: number): string | null {
  if (u.storageLimit <= 0) return "Your plan does not include file storage. Choose a plan to continue.";
  if (u.storageBytes + addBytes > u.storageLimit) return "Your storage is full. Delete some files or upgrade your plan.";
  return null;
}

export async function addStorage(db: any, userId: string, delta: number): Promise<void> {
  await dbRun(db, `UPDATE users SET storage_bytes = MAX(0, storage_bytes + ?) WHERE id = ?`, [Math.round(delta), userId]);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
