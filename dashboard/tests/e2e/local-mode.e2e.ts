/* AXTO — Local Mode E2E on the local runtime (the browser half is covered by
 * the Playwright run; this is the server half): who may use it (plan + the
 * operator's switch, reported by /api/auth/me), and /api/byox/prepare, which
 * assembles Legal AI's expert instructions around placeholders — no key is
 * read, no AI is called, and the placeholders come back unchanged. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { auditByAction, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.78.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}

const admin = new Client(), pro = new Client(), starter = new Client(), free = new Client();
const M = (n: number) => `@@AXTO_LOCAL_${String(n).padStart(4, "0")}@@`;
const LEGAL = (task: string) => ({
  app: "legal", task,
  messages: [{ role: "user", content: M(0) }],
  options: { ws: task, jurisdiction: JSON.stringify({ country: "ID", sub: "", city: M(1) }), area: "employment", audience: "lawyer", depth: "standard", citation: "auto", lang: "auto", asOf: "2026-09-30", factsDate: M(2), f_role: "claimant", f_goal: M(3) },
  documents: [{ name: M(4), text: M(5), pages: 2 }],
});

before(async () => {
  admin.cookie = await adminCookie();
  for (const [c, e] of [[pro, `lm-pro-${RUN}@example.com`], [starter, `lm-st-${RUN}@example.com`], [free, `lm-free-${RUN}@example.com`]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: e, name: "Local", password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
  for (const [e, plan] of [[`lm-pro-${RUN}@example.com`, "pro"], [`lm-st-${RUN}@example.com`, "starter"]] as const) {
    const uid = (await userByEmail(e)).id;
    assert.equal((await admin.post(`/api/admin/members/${uid}`, { action: "grant", plan, cycle: "monthly" })).status, 200);
  }
  await pro.get("/api/auth/me"); await starter.get("/api/auth/me");
});

test("local mode: availability follows the plan and is reported by /api/auth/me", async () => {
  const f = await free.get("/api/auth/me");
  assert.equal(f.json.localMode, false);
  assert.equal(f.json.limits.localMode, false);
  const p = await pro.get("/api/auth/me");
  assert.equal(p.json.localMode, true);
  assert.equal(p.json.limits.localMode, true);
  assert.equal((await free.post("/api/byox/prepare", { app: "prompts", messages: [{ role: "user", content: M(0) }] })).status, 403);
  assert.equal((await new Client().post("/api/byox/prepare", LEGAL("ask"))).status, 401);
});

test("local mode: /api/byox/prepare builds Legal instructions around placeholders only", async () => {
  const r = await pro.post("/api/byox/prepare", LEGAL("case-builder"));
  assert.equal(r.status, 200, r.text);
  const { system, messages, title } = r.json.task;
  assert.ok(system.length > 1500, "the full expert system prompt");
  assert.ok(system.includes(M(3)), "free-text field kept as a placeholder in the instructions");
  assert.ok(system.includes("claimant") || system.toLowerCase().includes("claimant"), "select field used in clear");
  const first = messages.find((m: any) => m.role === "user").content;
  assert.ok(first.includes(M(5)) && first.includes(M(4)) && first.includes(M(0)), "document and question placeholders placed in the first turn");
  assert.ok(title.includes(M(0)) || title.length > 0);
  assert.equal(r.json.research, false);
  // No key was needed: this member has no AI key at all, and nothing was counted.
  assert.equal((await pro.get("/api/byox/keys")).json.keys.length, 0);
  assert.equal((await pro.get("/api/auth/me")).json.usage.requests, 0, "Local Mode requests are not counted");
});

test("local mode: the plan's gates still apply on the server", async () => {
  const locked = await starter.post("/api/byox/prepare", LEGAL("constitutional"));
  assert.equal(locked.status, 402, locked.text);
  const core = await starter.post("/api/byox/prepare", LEGAL("case-builder"));
  assert.equal(core.status, 200, core.text);
  assert.equal((await pro.post("/api/byox/prepare", { app: "nope", messages: [{ role: "user", content: "x" }] })).status, 400);
  const noTurn = await pro.post("/api/byox/prepare", { ...LEGAL("ask"), messages: [] });
  assert.equal(noTurn.status, 400);
});

test("local mode: the operator can switch it off and on (audited)", async () => {
  const g = await admin.get("/api/admin/settings");
  assert.equal(g.status, 200);
  assert.equal(g.json.localMode, true);
  assert.equal((await admin.put("/api/admin/settings", { local_mode: "no" })).status, 400);
  assert.equal((await admin.put("/api/admin/settings", { local_mode: false })).status, 200);
  assert.equal((await pro.get("/api/auth/me")).json.localMode, false);
  assert.equal((await pro.post("/api/byox/prepare", LEGAL("ask"))).status, 403);
  assert.equal((await admin.put("/api/admin/settings", { local_mode: true })).status, 200);
  assert.equal((await pro.get("/api/auth/me")).json.localMode, true);
  assert.equal((await pro.post("/api/byox/prepare", LEGAL("ask"))).status, 200);
  assert.ok((await auditByAction("admin.settings.update")).length >= 1);
  assert.equal((await pro.put("/api/admin/settings", { local_mode: false })).status, 403, "members cannot switch it");
});
