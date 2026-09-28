/* AXTO — Security Analyst + Compliance Center + Privacy Vault E2E against the
 * local runtime. Security & Compliance run on the member's own endpoint (BYOX)
 * and are Pro-gated; Vault stores redacted (PII-free) output in encrypted history
 * on Starter. Uses a mock OpenAI-style streaming endpoint as the model. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);
const MOCK_PORT = 8797;

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}
class Client {
  cookie = ""; ip = `10.32.${Math.floor(Math.random()*250)}.${1+Math.floor(Math.random()*250)}`;
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
  del = (p: string) => this.call("DELETE", p);
}
const admin = new Client();
const pro = new Client();
const starter = new Client();
let mock: http.Server;

before(async () => {
  mock = http.createServer((req, res) => {
    if (req.url === "/v1/chat/completions") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      for (const t of ["## Verdict\n", "Suspicious. ", "MITRE T1110."]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
      res.end("data: [DONE]\n\n");
    } else { res.writeHead(404); res.end(); }
  }).listen(MOCK_PORT);
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  assert.equal((await admin.post("/api/auth/login", { email: "e2e-admin@axto.io", password: "e2e-admin-Pass-2026" })).status, 200);
  assert.equal((await admin.call("PUT", "/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1", account_name: "AXTO" } })).status, 200);
  async function member(c: Client, plan: string, tag: string) {
    assert.equal((await c.post("/api/auth/register", { email: `${tag}-${RUN}@example.com`, name: tag, password: "abcdefgh1", acceptTerms: true })).status, 200);
    const o = await c.post("/api/billing/checkout", { plan, cycle: "monthly", gateway: "manual" });
    assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: o.json.orderId })).status, 200, o.text);
    assert.equal((await c.post("/api/byox/keys", { provider: "custom", value: "", model: "local", baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1` })).status, 200);
  }
  await member(pro, "pro", "aproo");
  await member(starter, "starter", "astart");
});
after(() => mock?.close());

test("security: Pro member runs triage on their own key (BYOX) and it streams", async () => {
  const r = await pro.post("/api/byox/run", { app: "security", task: "triage", messages: [{ role: "user", content: "100 failed logins from 8.8.8.8" }], provider: "custom", options: { mode: "triage", iocs: "IOCS: 8.8.8.8\n\n" } });
  assert.equal(r.status, 200, r.text);
  assert.match(r.text, /Verdict/);
  assert.equal(r.headers.get("x-ai-mode"), "byox");
});

test("security: Starter is blocked (Pro plan required)", async () => {
  const r = await starter.post("/api/byox/run", { app: "security", task: "triage", messages: [{ role: "user", content: "x" }], provider: "custom", options: { mode: "triage" } });
  assert.equal(r.status, 402, r.text);
  assert.equal(r.json.upgrade, true);
});

test("compliance: framework required; valid framework runs", async () => {
  const bad = await pro.post("/api/byox/run", { app: "compliance", task: "gap", messages: [{ role: "user", content: "assess us" }], provider: "custom", options: { mode: "gap" } });
  assert.equal(bad.status, 400, bad.text);
  const ok = await pro.post("/api/byox/run", { app: "compliance", task: "gap", messages: [{ role: "user", content: "assess us" }], provider: "custom", options: { framework: "soc2", mode: "gap", org: "25-person SaaS" } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.headers.get("x-ai-mode"), "byox");
});

test("history: security & compliance persist for Pro (encrypted, CRUD)", async () => {
  const s = await pro.post("/api/history/security", { title: "Case 1", body: { mode: "triage", context: "", messages: [{ role: "user", content: "q" }, { role: "assistant", content: "a" }] } });
  assert.equal(s.status, 200, s.text);
  assert.equal((await pro.get("/api/history/security")).json.items.length, 1);
  const c = await pro.post("/api/history/compliance", { title: "SOC2 gap", body: { framework: "soc2", mode: "gap", org: "x", region: "", messages: [] } });
  assert.equal(c.status, 200, c.text);
  const cid = c.json.item.id;
  await pro.post(`/api/history/compliance/${cid}/rename`, { title: "SOC2 renamed" });
  assert.equal((await pro.get("/api/history/compliance")).json.items[0].title, "SOC2 renamed");
  await pro.del(`/api/history/compliance/${cid}`);
  assert.equal((await pro.get("/api/history/compliance")).json.items.length, 0);
});

test("vault: Starter can store redacted output (PII-free) in history", async () => {
  const r = await starter.post("/api/history/vault", { title: "Redacted 1", body: { redacted: "Email [EMAIL_1] card [CARD_1]", style: "token", types: [] } });
  assert.equal(r.status, 200, r.text);
  const list = await starter.get("/api/history/vault");
  assert.equal(list.json.items.length, 1);
  assert.equal(list.json.items[0].title, "Redacted 1");
});
