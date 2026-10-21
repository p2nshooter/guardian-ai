/* ==============================================================================
 * AXTO — the daily backup of the records, taken in parts (lib/data/backup-job.ts):
 * it starts once a day after 02:00 UTC, copies a slice per tick, finishes with
 * a manifest that lib/r2/backup.ts reads back as one complete backup, and
 * removes backups older than 35 days.
 * ============================================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { testData } from "./helpers/data";
import { backupStep, backupJob, requestBackup } from "../lib/data/backup-job";
import { listBackups, readBackup, snapshot, type BlobBucket } from "../lib/r2/backup";

function blobBucket(): BlobBucket & { keys(): string[] } {
  const m = new Map<string, { buf: ArrayBuffer; meta: Record<string, string>; uploaded: Date }>();
  return {
    keys: () => [...m.keys()].sort(),
    async put(key, value, opts) {
      const buf = typeof value === "string" ? new TextEncoder().encode(value).buffer as ArrayBuffer : value;
      m.set(key, { buf, meta: { ...(opts?.customMetadata ?? {}) }, uploaded: new Date() });
    },
    async get(key) {
      const o = m.get(key);
      return o ? { arrayBuffer: async () => o.buf, customMetadata: o.meta } : null;
    },
    async delete(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) m.delete(k); },
    async list(opts = {}) {
      const all = [...m.keys()].filter((k) => k.startsWith(opts.prefix ?? "")).sort();
      const start = opts.cursor ? Number(opts.cursor) : 0;
      const page = all.slice(start, start + (opts.limit ?? 1000));
      const truncated = start + page.length < all.length;
      return { objects: page.map((k) => ({ key: k, size: m.get(k)!.buf.byteLength, uploaded: m.get(k)!.uploaded, customMetadata: m.get(k)!.meta })), truncated, cursor: truncated ? String(start + page.length) : undefined };
    },
  };
}

const at = (iso: string) => new Date(iso);

async function seedRecords(db: ReturnType<typeof testData>["db"], n: number) {
  const now = "2026-10-20T00:00:00.000Z";
  for (let i = 0; i < n; i += 25) {
    await Promise.all(Array.from({ length: Math.min(25, n - i) }, (_, k) => db.users.create({
      id: `u${i + k}`, email: `u${i + k}@example.com`, role: "client", password_hash: "", name: `User ${i + k}`, organization: "", country: "",
      status: "active", last_login_at: "", storage_bytes: 0, ai_provider: "", sessions_valid_after: "", created_at: now, updated_at: now,
    })));
  }
  await db.config.set("usd_idr_rate", "16400");
}

test("backup: due once a day, taken in parts, read back complete; old ones removed", async () => {
  const { db, bucket } = testData();
  await seedRecords(db, 400);
  const backups = blobBucket();
  // An old backup (40 days) and a recent one (10 days): only the old one goes.
  await backups.put("backups/2026-09-10/030000-daily.json.gz", "x", { customMetadata: { taken_at: "2026-09-10T03:00:00.000Z" } });
  await backups.put("backups/2026-10-11/030000-daily.json.gz", "y", { customMetadata: { taken_at: "2026-10-11T03:00:00.000Z" } });

  assert.deepEqual(await backupStep(bucket, db.store, backups, at("2026-10-20T01:30:00Z")), { state: "idle" }, "not before 02:00 UTC");
  let last = await backupStep(bucket, db.store, backups, at("2026-10-20T03:00:00Z"));
  assert.equal(last.state, "copying");
  let ticks = 1;
  while (last.state !== "finished" && ticks < 200) { last = await backupStep(bucket, db.store, backups, at("2026-10-20T03:05:00Z")); ticks += 1; }
  assert.equal(last.state, "finished");
  assert.ok(ticks > 3, `took ${ticks} ticks — a slice per tick, never everything at once`);
  if (last.state !== "finished") return;
  assert.equal(last.pruned, 1);
  assert.ok(!backups.keys().includes("backups/2026-09-10/030000-daily.json.gz"));
  assert.ok(backups.keys().includes("backups/2026-10-11/030000-daily.json.gz"));

  // The manifest reads back as one backup holding every object of the data bucket.
  const file = await readBackup(backups, last.backup.key);
  const expected = (await snapshot(bucket)).map((o) => o.key).filter((k) => k !== "k/meta/backup-job").sort();
  const got = file.objects.map((o) => o.key).filter((k) => k !== "k/meta/backup-job").sort();
  assert.deepEqual(got, expected);
  assert.ok(file.objects.some((o) => o.key === "c/users/u399.json" && o.body.includes("User 399")));
  assert.ok(file.objects.some((o) => o.key.startsWith("i/users/all/") && o.meta?.m), "index summaries are kept");
  const listed = await listBackups(backups);
  assert.ok(listed.some((b) => b.key === last.backup.key), "parts are not listed as backups");
  assert.ok(!listed.some((b) => b.key.includes(".part-")));
  const partBytes = backups.keys().filter((k) => k.startsWith(last.backup.key.replace(/\.json\.gz$/, ".part-"))).length;
  assert.ok(partBytes > 1);
  assert.ok(listed.find((b) => b.key === last.backup.key)!.bytes > 1000, "the size is the whole backup, not the manifest");

  // Done for today; tomorrow's starts by itself.
  assert.deepEqual(await backupStep(bucket, db.store, backups, at("2026-10-20T23:00:00Z")), { state: "idle" });
  assert.equal((await backupStep(bucket, db.store, backups, at("2026-10-21T02:10:00Z"))).state, "copying");
  assert.equal((await backupJob(db.store))?.id.slice(0, 10), "2026-10-21");
});

test("backup: an admin can ask for one now, but never start a second while one runs", async () => {
  const { db, bucket } = testData();
  await seedRecords(db, 50);
  const backups = blobBucket();
  assert.equal(await requestBackup(db.store, "manual by admin@axto.io", at("2026-10-20T10:00:00Z")), true);
  assert.equal(await requestBackup(db.store, "again", at("2026-10-20T10:00:01Z")), false, "one at a time");
  // Overlapping ticks copy each slice once.
  let finished = 0;
  for (let i = 0; i < 50 && !finished; i++) {
    const r = await Promise.all([backupStep(bucket, db.store, backups, at("2026-10-20T10:01:00Z")), backupStep(bucket, db.store, backups, at("2026-10-20T10:01:00Z"))]);
    finished = r.filter((x) => x.state === "finished").length;
  }
  assert.ok(finished >= 1);
  const [b] = await listBackups(backups);
  assert.match(b!.key, /manual-by-admin-axto-io/);
  const file = await readBackup(backups, b!.key);
  assert.equal(new Set(file.objects.map((o) => o.key)).size, file.objects.length, "no object twice");
});
