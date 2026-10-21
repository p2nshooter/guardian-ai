/* AXTO — Prompt Library E2E against the local runtime.
 * Covers: public catalogue (indexable, no bodies), plan-gated template access
 * (free unlocks Basic; Starter unlocks Pro; higher levels need higher plans),
 * and the 402 upgrade signal with the plan the caller needs. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { seedAdmin } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.31.${Math.floor(Math.random()*250)}.${1+Math.floor(Math.random()*250)}`;
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown) => this.call("POST", p, b ?? {});
}

// Curated ids that exist in lib/prompts/catalog.ts, one per level.
const BASIC = "biz-swot";     // basic
const PRO = "mkt-campaign";   // pro
const PREMIUM = "biz-gtm";    // premium
const ELITE = "biz-board";    // elite

const anon = new Client();
const admin = new Client();
const free = new Client();
const starter = new Client();

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();   // one shared admin session (sign-in is rate-limited)
  assert.equal((await admin.call("PUT", "/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1", account_name: "AXTO" } })).status, 200);
  // Free member: registered, no plan.
  assert.equal((await free.post("/api/auth/register", { email: `pfree-${RUN}@example.com`, name: "Free", password: "abcdefgh1", acceptTerms: true })).status, 200);
  // Starter member: registered + paid.
  assert.equal((await starter.post("/api/auth/register", { email: `pstarter-${RUN}@example.com`, name: "Starter", password: "abcdefgh1", acceptTerms: true })).status, 200);
  const o = await starter.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: o.json.orderId })).status, 200);
});

test("catalogue: public, indexable, carries no template bodies", async () => {
  const r = await anon.get("/api/prompts");
  assert.equal(r.status, 200, r.text);
  assert.ok(Array.isArray(r.json.fields) && r.json.fields.length >= 20, "fields present");
  assert.ok(Array.isArray(r.json.levels) && r.json.levels.length === 4, "four levels");
  assert.ok(Array.isArray(r.json.prompts) && r.json.prompts.length >= 10, "prompts present");
  assert.deepEqual(r.json.unlocked, ["basic"], "anonymous unlocks basic only");
  const p = r.json.prompts.find((x: any) => x.id === BASIC);
  assert.ok(p, "basic prompt listed");
  assert.equal(p.locked, false, "basic not locked for anon");
  assert.equal((p as any).template, undefined, "no template body in catalogue");
  const prem = r.json.prompts.find((x: any) => x.id === PREMIUM);
  assert.equal(prem.locked, true, "premium locked for anon");
});

test("basic template: served to anyone (drives SEO/conversion)", async () => {
  const r = await anon.get(`/api/prompts/${BASIC}`);
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.prompt.template && r.json.prompt.template.length > 40, "template returned");
  assert.match(r.json.prompt.template, /\{\{\w+\}\}/, "template keeps its variables");
});

test("gated template: higher levels need a higher plan (402 + need)", async () => {
  const pro = await anon.get(`/api/prompts/${PRO}`);
  assert.equal(pro.status, 402, pro.text);
  assert.equal(pro.json.need, "starter", "pro needs starter");
  const prem = await anon.get(`/api/prompts/${PREMIUM}`);
  assert.equal(prem.status, 402, prem.text);
  assert.equal(prem.json.need, "pro", "premium needs pro plan");
});

test("free member: basic ok, pro locked", async () => {
  assert.equal((await free.get(`/api/prompts/${BASIC}`)).status, 200);
  const pro = await free.get(`/api/prompts/${PRO}`);
  assert.equal(pro.status, 402, pro.text);
  assert.equal(pro.json.need, "starter");
  assert.deepEqual((await free.get("/api/prompts")).json.unlocked, ["basic"]);
});

test("starter member: pro unlocked, premium still locked", async () => {
  const pro = await starter.get(`/api/prompts/${PRO}`);
  assert.equal(pro.status, 200, pro.text);
  assert.ok(pro.json.prompt.template.length > 40);
  const prem = await starter.get(`/api/prompts/${PREMIUM}`);
  assert.equal(prem.status, 402, prem.text);
  assert.equal(prem.json.need, "pro");
  const cat = await starter.get("/api/prompts");
  assert.deepEqual(cat.json.unlocked, ["basic", "pro"], "starter unlocks basic+pro");
  assert.equal(cat.json.prompts.find((x: any) => x.id === PRO).locked, false);
  assert.equal(cat.json.prompts.find((x: any) => x.id === ELITE).locked, true);
});

test("unknown prompt id → 404", async () => {
  assert.equal((await anon.get("/api/prompts/does-not-exist")).status, 404);
});

test("catalogue v4: 240 prompts, 10 per field", async () => {
  const r = await anon.get("/api/prompts");
  assert.equal(r.json.prompts.length, 240);
  for (const f of r.json.fields) assert.equal(r.json.prompts.filter((p: any) => p.field === f.id).length, 10, f.id);
});

test("run v4: a catalogue prompt is filled and level-gated on the server", async () => {
  // Starter: Premium refused by id before any model is called; the body is never needed in the browser.
  const prem = await starter.post("/api/byox/run", { app: "prompts", task: "run", messages: [{ role: "user", content: "x" }], provider: "custom", options: { mode: "run", promptId: PREMIUM, values: "{}" } });
  assert.equal(prem.status, 402, prem.text);
  const bad = await starter.post("/api/byox/run", { app: "prompts", task: "run", messages: [{ role: "user", content: "x" }], provider: "custom", options: { mode: "run", promptId: "nope-nope", values: "{}" } });
  assert.equal(bad.status, 404, bad.text);
});

test("library v4: the member's library saves as one encrypted item and reads back", async () => {
  const state = { v: 4, custom: [{ id: "u1abc", title: "Cold email", field: "sales", body: "Email {{prospect}}", notes: "", createdAt: "", updatedAt: "" }], collections: [{ id: "c1", name: "Kit", items: ["c:biz-swot", "u:u1abc"] }],
    favorites: ["c:biz-swot"], chains: [{ id: "ch1", name: "Flow", steps: [{ id: "s1", title: "Outline", ref: "c:content-outline" }] }], profiles: [{ id: "default", name: "Default", values: { company: "Acme" } }], activeProfile: "default" };
  const s = await free.post("/api/history/prompts", { id: "prompts-state-v4", title: "Prompt Library — my library", body: state, meta: { kind: "library" } });
  assert.equal(s.status, 200, s.text);
  const g = await free.get("/api/history/prompts/prompts-state-v4");
  assert.equal(g.json.item.body.custom[0].body, "Email {{prospect}}");
  assert.deepEqual(g.json.item.body.collections[0].items, ["c:biz-swot", "u:u1abc"]);
  // …but saving a run result still needs a plan with storage.
  const run = await free.post("/api/history/prompts", { title: "SWOT", body: { kind: "run", output: "x" }, meta: { kind: "run" } });
  assert.equal(run.status, 413, run.text);
  const big = await free.post("/api/history/prompts", { id: "prompts-state-v4", title: "x", body: { ...state, custom: [{ ...state.custom[0], body: "A".repeat(210_000) }] } });
  assert.equal(big.status, 413, "the free allowance is capped at 200 KB");
});
