/**
 * Backups of the R2 data bucket (docs/R2-DATA-BLUEPRINT.md §3.7).
 *
 * A backup is ONE gzip'd JSON file in the private backup bucket holding every
 * object of the data bucket — documents, guards, index entries (with their
 * summaries), settings, logs — so a restore puts the store back exactly as it
 * was, with no rebuild step:
 *
 *   backups/<yyyy-mm-dd>/<hhmmss>-<reason>.json.gz
 *
 * The bucket's lifecycle rule deletes backups after 35 days. A daily Cron
 * Trigger (worker.ts) takes one; an admin can take one any time, download one,
 * or restore one (a safety backup is always taken first). Uses only the R2
 * interface, so it runs in the Worker, in the cron handler and in the tests.
 */
import type { R2Like } from './bucket';
import { withRetry, realSleep, type Sleep } from './bucket';

/** The backup bucket: binary objects (the gzip). */
export interface BlobBucket {
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; customMetadata?: Record<string, string> } | null>;
  list(options?: { prefix?: string; cursor?: string; limit?: number; include?: ('customMetadata' | 'httpMetadata')[] }): Promise<{
    objects: { key: string; size?: number; uploaded: Date; customMetadata?: Record<string, string> }[];
    truncated: boolean;
    cursor?: string;
  }>;
}

export interface BackupObject {
  key: string;
  body: string;
  meta?: Record<string, string>;
}

export interface BackupFile {
  version: 1;
  taken_at: string;
  reason: string;
  objects: BackupObject[];
}

export interface BackupInfo {
  key: string;
  takenAt: string;
  reason: string;
  objects: number;
  bytes: number;
}

/** Everything the store writes. The migration lease is a lock, not data, and is left out. */
const PREFIXES = ['c/', 'k/', 'l/', 'u/', 'i/', 'n/'];
const SKIP = new Set(['k/meta/migration-lock']);

async function gzip(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

async function gunzip(buf: ArrayBuffer): Promise<string> {
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function listAll(b: R2Like, prefix: string, sleep: Sleep): Promise<{ key: string; customMetadata?: Record<string, string> }[]> {
  const out: { key: string; customMetadata?: Record<string, string> }[] = [];
  let cursor: string | undefined;
  do {
    const page = await withRetry(() => b.list({ prefix, cursor, limit: 1000, include: ['customMetadata'] }), sleep);
    out.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** Every object of the data bucket, bodies included. */
export async function snapshot(data: R2Like, sleep: Sleep = realSleep): Promise<BackupObject[]> {
  const objects: BackupObject[] = [];
  for (const prefix of PREFIXES) {
    const heads = (await listAll(data, prefix, sleep)).filter((h) => !SKIP.has(h.key));
    for (let i = 0; i < heads.length; i += 16) {
      const part = await Promise.all(
        heads.slice(i, i + 16).map(async (h) => {
          // Index entries have an empty body: their summary lives in the metadata.
          let body = '';
          if (prefix !== 'i/') {
            const obj = await withRetry(() => data.get(h.key), sleep);
            if (!obj) return null; // deleted while we were listing
            body = await obj.text();
          }
          const meta = h.customMetadata && Object.keys(h.customMetadata).length ? h.customMetadata : undefined;
          return meta ? { key: h.key, body, meta } : { key: h.key, body };
        }),
      );
      objects.push(...part.filter((o): o is BackupObject => o !== null));
    }
  }
  return objects;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Take a backup now; returns where it was written. */
export async function takeBackup(data: R2Like, backups: BlobBucket, reason: string, now = new Date(), sleep: Sleep = realSleep): Promise<BackupInfo> {
  const objects = await snapshot(data, sleep);
  const file: BackupFile = { version: 1, taken_at: now.toISOString(), reason, objects };
  const gz = await gzip(JSON.stringify(file));
  const tag = reason.replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 40) || 'manual';
  const key = `backups/${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}/${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}-${tag}.json.gz`;
  const meta = { taken_at: file.taken_at, reason: reason.slice(0, 200), objects: String(objects.length), sha256: await sha256(gz) };
  await withRetry(() => backups.put(key, gz, { httpMetadata: { contentType: 'application/gzip' }, customMetadata: meta }), sleep);
  return { key, takenAt: file.taken_at, reason, objects: objects.length, bytes: gz.byteLength };
}

/** The most recent backups, newest first. */
export async function listBackups(backups: BlobBucket, limit = 20): Promise<BackupInfo[]> {
  const out: BackupInfo[] = [];
  let cursor: string | undefined;
  do {
    const page = await backups.list({ prefix: 'backups/', cursor, limit: 1000, include: ['customMetadata'] });
    for (const o of page.objects) {
      out.push({
        key: o.key,
        takenAt: o.customMetadata?.taken_at ?? o.uploaded.toISOString(),
        reason: o.customMetadata?.reason ?? '',
        objects: Number(o.customMetadata?.objects ?? 0),
        bytes: o.size ?? 0,
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, limit);
}

export async function readBackup(backups: BlobBucket, key: string): Promise<BackupFile> {
  if (!/^backups\/\d{4}-\d\d-\d\d\/[\w-]+\.json\.gz$/.test(key)) throw new Error('Not a backup file.');
  const obj = await backups.get(key);
  if (!obj) throw new Error('That backup no longer exists.');
  const buf = await obj.arrayBuffer();
  const expected = obj.customMetadata?.sha256;
  if (expected && (await sha256(buf)) !== expected) throw new Error('That backup file is damaged (checksum mismatch).');
  const file = JSON.parse(await gunzip(buf)) as BackupFile;
  if (file.version !== 1 || !Array.isArray(file.objects)) throw new Error('Unknown backup format.');
  return file;
}

/**
 * Put the data bucket back exactly as a backup holds it: every object in the
 * backup is written, every object not in it is removed. The migration record
 * is kept as it is. A safety backup of the current state is taken first, so
 * a restore can itself be undone.
 */
export async function restoreBackup(
  data: R2Like,
  backups: BlobBucket,
  key: string,
  actor: string,
  sleep: Sleep = realSleep,
): Promise<{ written: number; removed: number; safety: BackupInfo }> {
  const file = await readBackup(backups, key);
  const safety = await takeBackup(data, backups, `before-restore by ${actor}`, new Date(), sleep);
  const keep = new Set(file.objects.map((o) => o.key));
  const protectedKey = (k: string) => k.startsWith('k/meta/');

  let written = 0;
  for (let i = 0; i < file.objects.length; i += 8) {
    await Promise.all(
      file.objects.slice(i, i + 8).map(async (o) => {
        if (protectedKey(o.key)) return;
        await withRetry(() => data.put(o.key, o.body, o.meta ? { customMetadata: o.meta } : {}), sleep);
        written += 1;
      }),
    );
  }
  const stale: string[] = [];
  for (const prefix of PREFIXES) {
    for (const h of await listAll(data, prefix, sleep)) if (!keep.has(h.key) && !protectedKey(h.key) && !SKIP.has(h.key)) stale.push(h.key);
  }
  for (let i = 0; i < stale.length; i += 1000) {
    const part = stale.slice(i, i + 1000);
    await withRetry(() => data.delete(part), sleep);
  }
  return { written, removed: stale.length, safety };
}
