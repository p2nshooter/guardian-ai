/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * BYOX usage & plan quotas (Clipper videos, storage). AI itself is unmetered
 * on the BYOX path — the member pays their own provider. Managed-AI credits
 * are tracked separately in lib/ai/managed.ts (collection managed_usage).
 * ============================================================================ */
import type { Data } from "./data";
import { ids, type ByoxUsageDoc } from "./data/schema";
import { limitsFor, monthKey, type Tier } from "./plans";

export interface UsageSnapshot {
  month: string;
  requests: number;
  clipperVideos: number;
  clipperLimit: number;       // -1 = unlimited
  storageBytes: number;
  storageLimit: number;
}

export async function getUsage(db: Data, userId: string, tier: Tier): Promise<UsageSnapshot> {
  const m = monthKey();
  const [u, b] = await Promise.all([db.users.get(userId), db.byoxUsage.get(ids.usage(userId, m))]);
  const lim = limitsFor(tier);
  return {
    month: m, requests: b?.requests ?? 0, clipperVideos: b?.clipper_videos ?? 0, clipperLimit: lim.clipperVideosPerMonth,
    storageBytes: u?.storage_bytes ?? 0, storageLimit: lim.storageGB * 1024 ** 3,
  };
}

const blankUsage = (userId: string, month: string): ByoxUsageDoc => ({ id: ids.usage(userId, month), user_id: userId, month, requests: 0, clipper_videos: 0 });

export async function recordByoxRequest(db: Data, userId: string): Promise<void> {
  const m = monthKey();
  await db.byoxUsage.upsert(ids.usage(userId, m), (cur) => {
    const u = cur ?? blankUsage(userId, m);
    return { ...u, requests: u.requests + 1 };
  });
}

/** Reserve one Clipper video for this month; returns an error message if the quota is used up. */
export async function reserveClipperVideo(db: Data, userId: string, tier: Tier): Promise<string | null> {
  const lim = limitsFor(tier).clipperVideosPerMonth;
  if (lim === 0) return "Your plan does not include Clipper. Choose a plan to continue.";
  const m = monthKey();
  let full = false;
  // The check and the increment are one compare-and-swap: two videos started at once cannot both take the last slot.
  await db.byoxUsage.upsert(ids.usage(userId, m), (cur) => {
    const u = cur ?? blankUsage(userId, m);
    full = lim > 0 && u.clipper_videos >= lim;
    return full ? null : { ...u, clipper_videos: u.clipper_videos + 1 };
  });
  return full ? `You have processed all ${lim} Clipper videos for this month. Upgrade your plan for more.` : null;
}

export function storageProblem(u: UsageSnapshot, addBytes: number): string | null {
  if (u.storageLimit <= 0) return "Your plan does not include file storage. Choose a plan to continue.";
  if (u.storageBytes + addBytes > u.storageLimit) return "Your storage is full. Delete some files or upgrade your plan.";
  return null;
}

export async function addStorage(db: Data, userId: string, delta: number): Promise<void> {
  const d = Math.round(delta);
  await db.users.update(userId, (u) => ({ ...u, storage_bytes: Math.max(0, (u.storage_bytes || 0) + d) }));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
