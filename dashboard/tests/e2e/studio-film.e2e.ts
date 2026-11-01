/* AXTO — AI Studio S0 end to end (REQUESTS 141, docs/apps/AI-STUDIO-BLUEPRINT.md §11.1): a film in the shared format
 * axto.film v1 is saved encrypted in R2 and opens again; two devices get a conflict, not a silent overwrite; versions
 * and restore; a newer AI Studio's film is refused; the films show in My files; AI Studio needs a plan. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { seedAdmin } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.52.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
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
}
const admin = new Client(), web = new Client(), laptop = new Client(), noPlan = new Client();

const film = (logline: string) => ({
  format: "axto.film", v: 1, title: "Rooftop", logline, settings: { frameRate: "23.976", resolution: "4k-dci", colorSpace: "rec709" },
  timeline: { name: "Main", tracks: [{ id: "v1", kind: "video", name: "V1", items: [{ id: "i1", kind: "clip", name: "Opening", range: { start: { value: 0, rate: 23.976 }, duration: { value: 240, rate: 23.976 } } }] }] },
  cast: [{ id: "c1", name: "Rafi", role: "Lead", original: true }], shots: [{ id: "s1", prompt: "a chase across rooftops at dusk", cast: ["c1"], seconds: 8 }],
});

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();
  assert.equal((await admin.call("PUT", "/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1", account_name: "AXTO" } })).status, 200);
  for (const [c, e] of [[web, `film-${RUN}@example.com`], [noPlan, `film-noplan-${RUN}@example.com`]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: e, name: "Film", password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
  const o = await web.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: o.json.orderId })).status, 200);
  laptop.cookie = web.cookie;
});

let fid = "";

test("AI Studio: a film is saved in axto.film v1 and opens again with its revision; AI Studio needs a plan", async () => {
  assert.equal((await noPlan.post("/api/history/film", { title: "x", body: film("x") })).status, 402);
  const s = await web.post("/api/history/film", { title: "Rooftop", body: film("A courier races the night.") });
  assert.equal(s.status, 200, s.text);
  fid = s.json.item.id;
  assert.equal(s.json.item.rev, 1);
  assert.deepEqual(s.json.item.meta, { v: "1", fps: "23.976", res: "4k-dci", duration: "10", shots: "1", media: "0" });
  const open = await web.get(`/api/history/film/${fid}`);
  assert.equal(open.json.item.body.format, "axto.film");
  assert.equal(open.json.item.body.timeline.tracks[0].items[0].name, "Opening");
  assert.equal(open.json.item.body.cast[0].original, true);
  const newer = await web.post("/api/history/film", { title: "Future", body: { ...film("x"), v: 3 } });
  assert.equal(newer.status, 400);
  assert.equal(newer.json.project, "newer");
  assert.equal((await web.post("/api/history/film", { title: "Not a film", body: { format: "axto.clipper", v: 5 } })).json.project, "not_a_project");
});

test("AI Studio: two devices editing one film — a conflict, keep mine keeps theirs as a version, restore brings it back", async () => {
  assert.equal((await web.post("/api/history/film", { id: fid, body: film("Web logline"), rev: 1 })).status, 200);
  const late = await laptop.post("/api/history/film", { id: fid, body: film("Laptop logline"), rev: 1 });
  assert.equal(late.status, 409);
  assert.equal(late.json.current.rev, 2);
  assert.equal((await laptop.post("/api/history/film", { id: fid, body: film("Laptop logline"), rev: 1, force: true })).status, 200);
  const vs = (await web.get(`/api/history/film/${fid}/versions`)).json;
  assert.equal(vs.keep, 20);
  assert.ok(vs.versions.some((v: any) => v.rev === 2 && v.reason === "overwrite"));
  assert.equal((await web.post(`/api/history/film/${fid}/restore`, { rev: 2 })).status, 200);
  assert.equal((await web.get(`/api/history/film/${fid}`)).json.item.body.logline, "Web logline");
});

test("AI Studio: films are listed in My files and open in AI Studio", async () => {
  const f = await web.get("/api/files");
  assert.equal(f.status, 200, f.text);
  assert.ok(f.json.files.some((x: any) => x.app === "film" && x.id === fid), JSON.stringify(f.json.files.map((x: any) => x.app)));
  assert.equal((await web.get("/app/ai-studio")).status, 200);
});
