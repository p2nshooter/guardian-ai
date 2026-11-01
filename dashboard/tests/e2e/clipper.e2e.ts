/* AXTO — Clipper C1 end to end (REQUESTS 137, docs/apps/CLIPPER-BLUEPRINT.md §11): a project made on
 * the web is saved in the shared format v5 and opens again; two devices editing one project get a
 * conflict instead of losing work; saves racing on one revision end with exactly one winner; versions
 * and restore; the storage quota refuses an oversized save; the usage log for the member and Admin. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { seedAdmin, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.41.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown) => this.call("POST", p, b ?? {});
  del = (p: string) => this.call("DELETE", p);
}
const admin = new Client();
const web = new Client();      // the member on the web
const laptop = new Client();   // the same member on a second device
const EMAIL = `clipper-${RUN}@example.com`;
let uid = "";

const words = Array.from({ length: 40 }, (_, i) => ({ word: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
const v5 = (title: string, extra: Record<string, unknown> = {}) => ({
  format: "axto.clipper", v: 5,
  media: { name: "keynote.mp4", size: 734003200, duration: 1800, width: 1920, height: 1080, fingerprint: "sha256:" + "ab".repeat(32) },
  settings: { platform: "tiktok", aspect: "9:16", count: 5, length: "auto", instruction: "", videoLang: "en" },
  transcript: words.map((w) => w.word).join(" "), words,
  clips: [{ id: "c1", title, start: 2, end: 14, score: 88 }], edits: {}, repurpose: {}, surface: "web", ...extra,
});

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();
  assert.equal((await admin.call("PUT", "/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1", account_name: "AXTO" } })).status, 200);
  assert.equal((await web.post("/api/auth/register", { email: EMAIL, name: "Clip", password: "abcdefgh1", acceptTerms: true })).status, 200);
  const o = await web.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: o.json.orderId })).status, 200);
  await web.get("/api/auth/me");           // refresh the session with the new plan
  laptop.cookie = web.cookie;
  uid = (await userByEmail(EMAIL)).id;
});

let pid = "";

test("a project made on the web is stored in format v5 and opens again with its revision", async () => {
  const s = await web.post("/api/history/clipper", { title: "Keynote", body: v5("Opening hook") });
  assert.equal(s.status, 200, s.text);
  pid = s.json.item.id;
  assert.equal(s.json.item.rev, 1);
  assert.deepEqual(s.json.item.meta, { v: "5", clips: "1", duration: "1800", media: "keynote.mp4", fp: "abababababab" });
  const open = await web.get(`/api/history/clipper/${pid}`);
  assert.equal(open.status, 200);
  assert.equal(open.json.item.rev, 1);
  assert.equal(open.json.item.body.format, "axto.clipper");
  assert.equal(open.json.item.body.clips[0].title, "Opening hook");
  assert.equal(open.json.item.body.media.fingerprint, "sha256:" + "ab".repeat(32));
  // An older Clipper's project (v4) is upgraded on the way in; a newer Clipper's is refused.
  const old = await web.post("/api/history/clipper", { title: "Old", body: { v: 4, file: { name: "old.mp4", size: 10, duration: 60, width: 1, height: 1 }, platform: "youtube", clips: [{ title: "c", start: 1, end: 5 }] } });
  assert.equal(old.status, 200, old.text);
  assert.equal((await web.get(`/api/history/clipper/${old.json.item.id}`)).json.item.body.settings.platform, "youtube");
  const newer = await web.post("/api/history/clipper", { title: "Future", body: { ...v5("x"), v: 9 } });
  assert.equal(newer.status, 400);
  assert.equal(newer.json.project, "newer");
});

test("two devices: the second save from an old revision is a conflict, keep-mine keeps theirs as a version", async () => {
  // Both devices opened revision 1. The web saves first.
  const a = await web.post("/api/history/clipper", { id: pid, body: v5("Web edit"), rev: 1 });
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.item.rev, 2);
  assert.equal(a.json.item.title, "Keynote", "an autosave keeps the title");
  const b = await laptop.post("/api/history/clipper", { id: pid, body: v5("Laptop edit"), rev: 1 });
  assert.equal(b.status, 409, b.text);
  assert.equal(b.json.conflict, true);
  assert.equal(b.json.current.rev, 2);
  assert.equal((await web.get(`/api/history/clipper/${pid}`)).json.item.body.clips[0].title, "Web edit", "nothing was overwritten");
  // The laptop keeps its version: the web's copy is kept first.
  const f = await laptop.post("/api/history/clipper", { id: pid, body: v5("Laptop edit"), rev: 1, force: true });
  assert.equal(f.status, 200, f.text);
  assert.equal(f.json.item.overwrote, true);
  const vs = await web.get(`/api/history/clipper/${pid}/versions`);
  assert.equal(vs.status, 200);
  assert.equal(vs.json.keep, 10);
  const kept = vs.json.versions.find((v: any) => v.rev === 2);
  assert.equal(kept?.reason, "overwrite");
  // Restore the web's copy: the laptop's is kept before it.
  const r = await web.post(`/api/history/clipper/${pid}/restore`, { rev: 2 });
  assert.equal(r.status, 200, r.text);
  assert.equal((await web.get(`/api/history/clipper/${pid}`)).json.item.body.clips[0].title, "Web edit");
  assert.ok((await web.get(`/api/history/clipper/${pid}/versions`)).json.versions.some((v: any) => v.reason === "restore"));
});

test("saves racing on one revision in R2: exactly one wins, every other device is told", async () => {
  const rev = (await web.get(`/api/history/clipper/${pid}`)).json.item.rev;
  const devices = Array.from({ length: 5 }, () => { const c = new Client(); c.cookie = web.cookie; return c; });
  const res = await Promise.all(devices.map((d, i) => d.post("/api/history/clipper", { id: pid, body: v5(`Racer ${i}`), rev })));
  const won = res.filter((r) => r.status === 200);
  assert.equal(won.length, 1, res.map((r) => r.status).join(","));
  assert.ok(res.filter((r) => r.status !== 200).every((r) => r.status === 409 && r.json.conflict), res.map((r) => r.text).join("\n"));
  const cur = (await web.get(`/api/history/clipper/${pid}`)).json.item;
  assert.equal(cur.rev, rev + 1);
  assert.equal(cur.body.clips[0].title, `Racer ${res.findIndex((r) => r.status === 200)}`);
  assert.equal((await web.get("/api/history/clipper")).json.items.filter((i: any) => i.id === pid).length, 1);
});

test("the storage quota refuses a save that does not fit, and the refusal is logged", async () => {
  const u = await userByEmail(EMAIL);
  const limit = 1 * 1024 ** 3;   // Starter: 1 GB
  await update("users", uid, { storage_bytes: limit - 2000 });
  const big = await web.post("/api/history/clipper", { title: "Too big", body: v5("Big", { transcript: "x".repeat(50_000) }) });
  assert.equal(big.status, 413, big.text);
  assert.equal(big.json.upgrade, true);
  await update("users", uid, { storage_bytes: u.storage_bytes });
  const usage = await web.get("/api/clipper/usage");
  assert.equal(usage.status, 200, usage.text);
  const events = usage.json.events.map((e: any) => e.event);
  for (const e of ["storage_full", "project_created", "conflict_overwrite", "project_restored"]) assert.ok(events.includes(e), `${e} in ${events}`);
  assert.equal(usage.json.usage.storageLimit, limit);
  assert.ok(usage.json.usage.storageBytes > 0, "projects and versions count in storage");
});

test("Admin → Clipper shows the month; members cannot read it", async () => {
  const r = await admin.get("/api/admin/clipper");
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.counts.storage_full >= 1 && r.json.counts.project_created >= 2);
  assert.ok(r.json.events.some((e: any) => e.email === EMAIL));
  assert.equal((await admin.get("/api/admin/clipper?month=2026-13")).status, 400);
  assert.equal((await web.get("/api/admin/clipper")).status, 403);
});

test("deleting a project removes its versions and gives the storage back", async () => {
  const before = (await userByEmail(EMAIL)).storage_bytes;
  assert.equal((await web.del(`/api/history/clipper/${pid}`)).status, 200);
  assert.equal((await web.get(`/api/history/clipper/${pid}/versions`)).json.versions.length, 0);
  assert.equal((await web.get(`/api/history/clipper/${pid}`)).status, 404);
  assert.ok((await userByEmail(EMAIL)).storage_bytes < before - 2000, "the project and its versions are freed");
  assert.ok((await web.get("/api/clipper/usage")).json.events.some((e: any) => e.event === "project_deleted"));
});
