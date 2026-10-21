/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * The daily backup of the records (docs/R2-DATA-BLUEPRINT.md §3.7), taken in
 * parts so it fits any size: every minute the automation tick copies the next
 * slice of the data bucket into a part file of the private BACKUPS bucket
 * (`axto-backups`), and when the last slice is written a manifest names the
 * parts. lib/r2/backup.ts reads it back as one backup (download, restore).
 *
 *   backups/<yyyy-mm-dd>/<hhmmss>-<reason>.part-00001.json.gz …
 *   backups/<yyyy-mm-dd>/<hhmmss>-<reason>.json.gz        (the manifest)
 *
 * The job's position lives in one document (k/meta/backup-job) changed only
 * with compare-and-swap, so overlapping ticks never start two backups or skip
 * a slice. A new backup starts once a day after 02:00 UTC (or when an admin
 * asks); backups older than 35 days are removed when one finishes.
 * ============================================================================ */
import type { R2Like } from "../r2/bucket";
import type { Store } from "../r2/store";
import { gzip, sha256, partKey, PREFIXES, SKIP, type BackupInfo, type BackupManifest, type BackupObject, type BlobBucket } from "../r2/backup";

export interface BackupJob {
  /** "<yyyy-mm-dd>/<hhmmss>-<reason>": the manifest is backups/<id>.json.gz. */
  id: string;
  reason: string;
  started_at: string;
  /** Position: the prefix being copied and the last key copied in it. */
  prefix: number;
  after: string;
  parts: number;
  objects: number;
  /** Compressed size of the parts written so far. */
  bytes?: number;
  done_at?: string;
}

const JOB = "meta/backup-job";
export const RETENTION_DAYS = 35;
/** Object bodies read per slice (index entries need none — their summary is in the listing). */
const SLICE = 300;
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const backupJob = (store: Store) => store.getDoc<BackupJob | null>(JOB, null);

function newJob(now: Date, reason: string): BackupJob {
  const tag = reason.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 40) || "manual";
  return {
    id: `${dayOf(now)}/${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}-${tag}`,
    reason, started_at: now.toISOString(), prefix: 0, after: "", parts: 0, objects: 0, bytes: 0,
  };
}

/** Ask for a backup now (Admin → Data). False when one is already running. */
export async function requestBackup(store: Store, reason: string, now = new Date()): Promise<boolean> {
  let started = false;
  await store.updateDoc<BackupJob | null>(JOB, null, (cur) => {
    started = !cur || Boolean(cur.done_at);
    return started ? newJob(now, reason) : null;
  });
  return started;
}

async function prune(backups: BlobBucket, now: Date): Promise<number> {
  if (!backups.delete) return 0;
  const cutoff = dayOf(new Date(now.getTime() - RETENTION_DAYS * 86_400_000));
  const old: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await backups.list({ prefix: "backups/", cursor, limit: 1000 });
    for (const o of page.objects) if (o.key.slice("backups/".length, "backups/".length + 10) < cutoff) old.push(o.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < old.length; i += 1000) await backups.delete(old.slice(i, i + 1000));
  return old.length;
}

export type BackupStep =
  | { state: "idle" }
  | { state: "copying"; id: string; part: number; objects: number }
  | { state: "finished"; backup: BackupInfo; pruned: number };

/**
 * One slice of the daily backup (called by every automation tick). Starts the
 * day's backup when it is due, copies the next slice, or finishes the backup.
 */
export async function backupStep(data: R2Like, store: Store, backups: BlobBucket, now = new Date()): Promise<BackupStep> {
  let job = await backupJob(store);
  if (!job || job.done_at) {
    const due = now.getUTCHours() >= 2 && (!job || job.id.slice(0, 10) < dayOf(now));
    if (!due) return { state: "idle" };
    const fresh = newJob(now, "daily");
    let won = false;
    const was = job;
    await store.updateDoc<BackupJob | null>(JOB, null, (cur) => {
      won = (cur?.id ?? null) === (was?.id ?? null) && (!cur || Boolean(cur.done_at));
      return won ? fresh : null;
    });
    if (!won) return { state: "idle" };
    job = fresh;
  }

  if (job.prefix < PREFIXES.length) {
    const prefix = PREFIXES[job.prefix]!;
    const index = prefix === "i/";
    const page = await data.list({ prefix, startAfter: job.after || undefined, limit: index ? 1000 : SLICE, include: ["customMetadata"] });
    const heads = page.objects.filter((h) => !SKIP.has(h.key));
    const objects: BackupObject[] = [];
    for (let i = 0; i < heads.length; i += 6) {
      const part = await Promise.all(heads.slice(i, i + 6).map(async (h) => {
        let body = "";
        if (!index) {
          const obj = await data.get(h.key);
          if (!obj) return null; // deleted since the listing
          body = await obj.text();
        }
        const meta = h.customMetadata && Object.keys(h.customMetadata).length ? h.customMetadata : undefined;
        return meta ? { key: h.key, body, meta } : { key: h.key, body };
      }));
      objects.push(...part.filter((o): o is BackupObject => o !== null));
    }
    const last = page.objects.length ? page.objects[page.objects.length - 1]!.key : job.after;
    const nextPart = job.parts + (objects.length ? 1 : 0);
    let written = 0;
    if (objects.length) {
      const gz = await gzip(JSON.stringify({ part: nextPart, objects }));
      await backups.put(partKey(`backups/${job.id}`, nextPart), gz, { httpMetadata: { contentType: "application/gzip" }, customMetadata: { sha256: await sha256(gz) } });
      written = gz.byteLength;
    }
    const from = job;
    const moved: BackupJob = page.truncated
      ? { ...job, after: last, parts: nextPart, objects: job.objects + objects.length, bytes: (job.bytes ?? 0) + written }
      : { ...job, prefix: job.prefix + 1, after: "", parts: nextPart, objects: job.objects + objects.length, bytes: (job.bytes ?? 0) + written };
    let advanced = false;
    await store.updateDoc<BackupJob | null>(JOB, null, (cur) => {
      // Only from the position this slice started at: an overlapping tick that already moved on wins.
      advanced = Boolean(cur && cur.id === from.id && cur.prefix === from.prefix && cur.after === from.after && cur.parts === from.parts);
      return advanced ? moved : null;
    });
    return { state: "copying", id: job.id, part: nextPart, objects: moved.objects };
  }

  // Every prefix copied: the manifest makes it a backup.
  const manifest: BackupManifest = { version: 2, taken_at: job.started_at, reason: job.reason, parts: job.parts, objects: job.objects };
  const gz = await gzip(JSON.stringify(manifest));
  const key = `backups/${job.id}.json.gz`;
  await backups.put(key, gz, {
    httpMetadata: { contentType: "application/gzip" },
    customMetadata: {
      taken_at: job.started_at, reason: job.reason.slice(0, 200), objects: String(job.objects), parts: String(job.parts),
      bytes: String((job.bytes ?? 0) + gz.byteLength), sha256: await sha256(gz),
    },
  });
  const done = job;
  await store.updateDoc<BackupJob | null>(JOB, null, (cur) => (cur && cur.id === done.id && !cur.done_at ? { ...cur, done_at: now.toISOString() } : null));
  const pruned = await prune(backups, now).catch(() => 0);
  return { state: "finished", backup: { key, takenAt: job.started_at, reason: job.reason, objects: job.objects, bytes: (job.bytes ?? 0) + gz.byteLength }, pruned };
}
