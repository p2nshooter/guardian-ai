/* AXTO — Clipper C1 (REQUESTS 137, docs/apps/CLIPPER-BLUEPRINT.md §11): one project format on every
 * surface, projects saved safely across devices (revisions, conflicts, versions, restore) in the
 * encrypted R2 history, storage that always adds up, and the usage log.
 *
 * The bucket is the exact R2 fake (conditional writes, list, metadata limits); concurrent saves
 * interleave the way they would against R2. */
process.env.ENCRYPTION_KEY ||= "test-encryption-key-0123456789abcdef0123456789";
import { test } from "node:test";
import assert from "node:assert/strict";
import { testData } from "./helpers/data";
import { FakeR2 } from "../lib/r2/fake";
import { History, HistoryConflict, HistoryError } from "../lib/history";
import { CLIPPER_FORMAT, PROJECT_VERSION, ProjectError, fingerprint, projectFile, projectMeta, readProject, sameMedia } from "../lib/clipper/project";
import { logClipper, memberUsage, monthReport } from "../lib/clipper/usage-log";
import { reserveClipperVideo, storageProblem, getUsage } from "../lib/usage";
import { monthKey } from "../lib/plans";

const W = (n: number) => Array.from({ length: n }, (_, i) => ({ word: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
const v4 = () => ({
  v: 4, file: { name: "talk.mp4", size: 123456, duration: 600, width: 1920, height: 1080 },
  platform: "youtube", aspect: "9:16", count: 6, length: "short", instruction: "funny bits", videoLang: "en",
  transcript: "hello world", words: W(20),
  clips: [{ id: "a1", title: "First", start: 1, end: 9, score: 140, hashtags: ["#a", 5] }, { id: "a1", title: "Dup id", start: 10, end: 20 }, { title: "Backwards", start: 30, end: 20 }],
  edits: { a1: { captions: { template: "bold" } }, gone: { x: 1 } },
  repurpose: { blog: "A post", nonsense: "dropped" },
});

test("project format: older projects open, every field is checked, a newer Clipper's project is refused", () => {
  const p = readProject(v4());
  assert.equal(p.format, CLIPPER_FORMAT);
  assert.equal(p.v, PROJECT_VERSION);
  assert.deepEqual(p.media, { name: "talk.mp4", size: 123456, duration: 600, width: 1920, height: 1080 });
  assert.equal(p.settings.platform, "youtube");
  assert.equal(p.settings.length, "short");
  assert.equal(p.clips.length, 2, "a clip that ends before it starts is dropped");
  assert.notEqual(p.clips[0].id, p.clips[1].id, "duplicate clip ids are made unique");
  assert.equal(p.clips[0].score, 100, "scores are bounded");
  assert.deepEqual(p.clips[0].hashtags, ["#a", "5"]);
  assert.deepEqual(Object.keys(p.edits), ["a1"], "edits of clips that no longer exist are dropped");
  assert.deepEqual(p.repurpose, { blog: "A post" });
  // v5 round trip, and the file members can keep or open on another surface.
  assert.deepEqual(readProject(JSON.parse(projectFile(p))), p);
  assert.deepEqual(projectMeta(p), { v: "5", clips: "2", duration: "600", media: "talk.mp4" });
  assert.throws(() => readProject({ ...p, v: 6 }), (e: any) => e instanceof ProjectError && e.code === "newer");
  assert.throws(() => readProject({ format: "other.app", v: 1, clips: [] }), (e: any) => e instanceof ProjectError && e.code === "not_a_project");
  assert.throws(() => readProject("hello"), (e: any) => e instanceof ProjectError && e.code === "not_a_project");
  assert.throws(() => readProject({ hello: 1 }), (e: any) => e instanceof ProjectError && e.code === "not_a_project");
  assert.throws(() => readProject({ ...p, words: new Array(400_001).fill({ word: "a", start: 0, end: 1 }) }), (e: any) => e.code === "invalid");
  const odd = readProject({ media: { name: "x\u0000.mp4", size: -5, fingerprint: "md5:abc" }, settings: { platform: "nope", aspect: "2:1", count: 99 }, clips: [] });
  assert.equal(odd.media.name, "x.mp4");
  assert.equal(odd.media.size, 0);
  assert.equal(odd.media.fingerprint, undefined, "only sha256 fingerprints are kept");
  assert.equal(odd.settings.platform, "tiktok");
  assert.equal(odd.settings.count, 30);
});

test("the video is recognised by its fingerprint, then by name and size", async () => {
  const a = new Blob([new Uint8Array(5 * 1024 * 1024).fill(7)]);
  const b = new Blob([new Uint8Array(5 * 1024 * 1024).fill(7), new Uint8Array([1])]);
  const fa = await fingerprint(a);
  assert.match(fa, /^sha256:[0-9a-f]{64}$/);
  assert.equal(await fingerprint(a), fa, "the same file gives the same fingerprint");
  assert.notEqual(await fingerprint(b), fa);
  assert.equal(sameMedia({ name: "v.mp4", size: 1, duration: 0, width: 0, height: 0, fingerprint: fa }, { name: "renamed.mp4", size: 1, fingerprint: fa }), "same");
  assert.equal(sameMedia({ name: "v.mp4", size: 10, duration: 0, width: 0, height: 0 }, { name: "v.mp4", size: 10 }), "same");
  assert.equal(sameMedia({ name: "v.mp4", size: 10, duration: 0, width: 0, height: 0 }, { name: "v.mp4", size: 11 }), "different");
  assert.equal(sameMedia({ name: "v.mp4", size: 0, duration: 0, width: 0, height: 0 }, { name: "v.mp4", size: 11 }), "unknown");
});

async function setup(policy = { keep: 3, everyMs: 0 }) {
  const { db } = testData();
  const at = new Date().toISOString();
  await db.users.create({ id: "u1", email: "u1@example.com", role: "client", password_hash: "", name: "U", organization: "", country: "", status: "active", last_login_at: "", storage_bytes: 0, ai_provider: "", sessions_valid_after: "", created_at: at, updated_at: at });
  const files = new FakeR2({ rateLimit: false });
  const hist = (versions: typeof policy | undefined = policy) => new History(files, db, "u1", "clipper", { versions });
  /** The member's storage total must always be exactly what their objects take. */
  const storageAddsUp = async () => {
    const stored = [...files.objects.entries()].filter(([k]) => k.startsWith("app/")).reduce((n, [, o]) => n + (typeof o.body === "string" ? o.body.length : o.body.length), 0);
    assert.equal((await db.users.get("u1"))!.storage_bytes, stored, "storage_bytes = bytes stored");
  };
  return { db, files, hist, storageAddsUp };
}
const project = (title: string) => readProject({ ...v4(), clips: [{ id: "c1", title, start: 1, end: 5 }] });

test("saves carry a revision; a save from an older revision is a conflict, never a silent overwrite", async () => {
  const { hist, storageAddsUp } = await setup();
  const h = hist();
  const a = await h.save({ title: "Talk", body: project("one") });
  assert.equal(a.rev, 1);
  assert.equal(a.created, true);
  const b = await h.save({ id: a.id, body: project("two"), rev: 1 });
  assert.equal(b.rev, 2);
  assert.equal(b.title, "Talk", "an autosave without a title keeps the title");
  // A second device still on revision 1:
  await assert.rejects(h.save({ id: a.id, body: project("other device"), rev: 1 }), (e: any) => {
    assert.ok(e instanceof HistoryConflict);
    assert.equal(e.status, 409);
    assert.equal((e.extra.current as any).rev, 2);
    return true;
  });
  assert.equal(((await h.get<any>(a.id)).body).clips[0].title, "two", "the newer work is untouched");
  // Keep mine: the other copy is kept as a version first.
  const c = await h.save({ id: a.id, body: project("mine"), rev: 1, force: true });
  assert.equal(c.overwrote, true);
  assert.equal(c.versioned, "overwrite");
  const vs = await h.versions(a.id);
  assert.equal(vs[0].rev, 2);
  assert.equal(vs[0].reason, "overwrite");
  await storageAddsUp();
});

test("two devices saving the same revision at the same moment: exactly one wins, the other is told", async () => {
  const { hist, storageAddsUp } = await setup({ keep: 10, everyMs: 3_600_000 });
  const h = hist();
  const a = await h.save({ title: "Race", body: project("base") });
  const results = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => hist().save({ id: a.id, body: project(`device ${i}`), rev: 1 })));
  const won = results.filter((r) => r.status === "fulfilled");
  assert.equal(won.length, 1, "one save wins");
  assert.ok(results.filter((r) => r.status === "rejected").every((r: any) => r.reason instanceof HistoryConflict), "the rest get a conflict");
  const cur = await h.get<any>(a.id);
  assert.equal(cur.rev, 2);
  assert.equal(cur.body.clips[0].title, `device ${results.findIndex((r) => r.status === "fulfilled")}`, "the winner's work is what is stored");
  assert.equal((await h.list()).length, 1);
  await storageAddsUp();
});

test("versions: kept on the interval, before overwrites and restores, oldest pruned, all counted in storage", async () => {
  const { hist, storageAddsUp } = await setup({ keep: 3, everyMs: 0 });
  const h = hist();
  const a = await h.save({ title: "V", body: project("r1") });
  for (let i = 2; i <= 6; i++) await h.save({ id: a.id, body: project(`r${i}`), rev: i - 1 });
  const vs = await h.versions(a.id);
  assert.deepEqual(vs.map((v) => v.rev), [5, 4, 3], "the newest three are kept");
  assert.ok(vs.every((v) => v.reason === "auto" && v.bytes > 0 && v.at));
  await storageAddsUp();
  // Restore revision 3: the current one (6) is kept first, and the restored body is a new revision.
  const r = await h.restore(a.id, 3);
  assert.equal(r.rev, 7);
  assert.equal(r.versioned, "restore");
  assert.equal((await h.get<any>(a.id)).body.clips[0].title, "r3");
  assert.equal((await h.versions(a.id))[0].rev, 6);
  assert.equal((await h.versions(a.id))[0].reason, "restore");
  await assert.rejects(h.restore(a.id, 1), (e: any) => e instanceof HistoryError && e.status === 404, "a pruned version is gone");
  await storageAddsUp();
  // Deleting the project deletes its versions and gives all the storage back.
  await h.remove(a.id);
  assert.deepEqual(await h.versions(a.id), []);
  assert.deepEqual(await h.list(), []);
  await storageAddsUp();
});

test("an interval policy keeps one automatic version per interval, not one per autosave", async () => {
  const { hist } = await setup({ keep: 10, everyMs: 3_600_000 });
  const h = hist();
  const a = await h.save({ title: "A", body: project("r1") });
  for (let i = 2; i <= 8; i++) await h.save({ id: a.id, body: project(`r${i}`), rev: i - 1 });
  assert.deepEqual((await h.versions(a.id)).map((v) => v.rev), [1], "the first edit keeps the original once; later autosaves wait for the interval");
});

test("rename keeps the revision, so the open editor keeps saving, and the rename survives its autosave", async () => {
  const { hist } = await setup();
  const h = hist();
  const a = await h.save({ title: "Old", body: project("x") });
  const r = await h.rename(a.id, "New name");
  assert.equal(r.rev, 1);
  const s = await h.save({ id: a.id, body: project("y"), rev: 1 });
  assert.equal(s.title, "New name");
  assert.equal((await h.list())[0].title, "New name");
});

test("storage: a save is refused only for the bytes it adds; a version is skipped, never the save", async () => {
  const { hist, db, storageAddsUp } = await setup({ keep: 5, everyMs: 0 });
  const h = hist();
  const a = await h.save({ title: "Q", body: project("x") });
  const used = (await db.users.get("u1"))!.storage_bytes;
  const tight = (n: number) => (used + n > used + 400 ? "Your storage is full." : null);
  // Same size: fits even though there is no room for a version of it.
  const s = await h.save({ id: a.id, body: project("y"), rev: 1, room: tight });
  assert.equal(s.versioned, null, "no room: no version, but the work is saved");
  await assert.rejects(h.save({ id: a.id, body: readProject({ ...v4(), transcript: "z".repeat(5000) }), rev: 2, room: tight }), (e: any) => e instanceof HistoryError && e.status === 413);
  await storageAddsUp();
  const usage = await getUsage(db, "u1", "starter");
  assert.equal(storageProblem(usage, 1), null);
  assert.match(String(storageProblem({ ...usage, storageLimit: 0 }, 1)), /does not include/);
});

test("items saved before revisions open as revision 0 and accept a save from it", async () => {
  const { hist, files } = await setup();
  const h = hist(undefined);
  const a = await h.save({ title: "Legacy", body: { v: 4 } });
  // Make it look like a pre-C1 item: no rev field.
  const { getSealedJson, putSealedJson } = await import("../lib/user-crypto");
  const key = `app/clipper/u1/items/${a.id}.enc`;
  const old = (await getSealedJson<any>(files, "u1", key))!.value;
  delete old.rev;
  await putSealedJson(files, "u1", key, old);
  assert.equal((await h.get(a.id)).rev, 0);
  assert.equal((await h.save({ id: a.id, body: { v: 5 }, rev: 0 })).rev, 1);
});

test("usage log: videos, refusals and project events per member and per month", async () => {
  const { db } = await setup();
  assert.equal(await reserveClipperVideo(db, "u1", "starter"), null);
  await logClipper(db, "u1", "video", { bytes: 1000 });
  await logClipper(db, "u1", "project_created", { project_id: "h_abc", bytes: 500 });
  await logClipper(db, "u1", "storage_full", { project_id: "h_abc", detail: "Your storage is full." });
  const mine = await memberUsage(db, "u1", "starter");
  assert.equal(mine.usage.clipperVideos, 1);
  assert.deepEqual(mine.events.map((e) => e.event).sort(), ["project_created", "storage_full", "video"]);
  const rep = await monthReport(db, monthKey());
  assert.equal(rep.videos, 1);
  assert.equal(rep.members, 1);
  assert.deepEqual(rep.top, [{ user_id: "u1", videos: 1 }]);
  assert.equal(rep.counts.storage_full, 1);
  assert.equal(rep.events.length, 3);
  assert.ok(rep.events.every((e) => e.user_id === "u1"));
});

test("a save that loses the race after keeping a version still counts that version, conflict or not", async () => {
  const { hist, files, storageAddsUp } = await setup({ keep: 10, everyMs: 0 });
  const { getSealedJson, sealForUser } = await import("../lib/user-crypto");
  const h = hist();
  const a = await h.save({ title: "Lost race", body: project("one") });
  const key = `app/clipper/u1/items/${a.id}.enc`;
  // Another device writes the item between this save's read and its write, once per scenario.
  const realPut = files.put.bind(files);
  let sneak: null | (() => Promise<void>) = null;
  (files as any).put = async (k: string, v: any, o: any) => {
    if (k === key && o?.onlyIf?.etagMatches && sneak) { const s = sneak; sneak = null; await s(); }
    return realPut(k, v, o);
  };
  const rewrite = (bump: number) => async () => {
    const cur = (await getSealedJson<any>(files, "u1", key))!;
    await realPut(key, await sealForUser("u1", key, JSON.stringify({ ...cur.value, rev: cur.value.rev + bump })), { customMetadata: { enc: "user-v1" } });
  };
  // 1) Same revision rewritten (same size): the retry wins, and the version kept by the lost attempt counts.
  sneak = rewrite(0);
  const s = await h.save({ id: a.id, body: project("two"), rev: 1 });
  assert.equal(s.rev, 2);
  await storageAddsUp();
  // 2) A newer revision lands in between: the save ends as a conflict, and the version it kept still counts.
  sneak = rewrite(1);
  await assert.rejects(h.save({ id: a.id, body: project("three"), rev: 2 }), (e: any) => e instanceof HistoryConflict);
  assert.ok((await h.versions(a.id)).some((v) => v.rev === 2), "the replaced revision is kept");
  await storageAddsUp();
});
