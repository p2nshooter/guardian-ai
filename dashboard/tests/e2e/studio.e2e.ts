/* AXTO — AI Studio + generic work-history (encrypted, CRUD) E2E against the
 * local runtime. Uses a member's own custom endpoint (BYOE) as the model. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);
const MOCK_PORT = 8796;
const SECRET = `STUDIO-SECRET-${RUN}`;

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}
class Client {
  cookie = ""; ip = `10.30.${Math.floor(Math.random()*250)}.${1+Math.floor(Math.random()*250)}`;
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
const member = new Client();
let mock: http.Server;

before(async () => {
  mock = http.createServer((req, res) => {
    if (req.url === "/v1/chat/completions") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      for (const t of ["Hello ", "from ", "Studio."]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
      res.end("data: [DONE]\n\n");
    } else { res.writeHead(404); res.end(); }
  }).listen(MOCK_PORT);
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  admin.cookie = await adminCookie();   // one shared admin session (sign-in is rate-limited)
  assert.equal((await admin.call("PUT", "/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1", account_name: "AXTO" } })).status, 200);
  assert.equal((await member.post("/api/auth/register", { email: `studio-${RUN}@example.com`, name: "Studio", password: "abcdefgh1", acceptTerms: true })).status, 200);
  const o = await member.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: o.json.orderId })).status, 200);
  assert.equal((await member.post("/api/byox/keys", { provider: "custom", value: "", model: "local", baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1` })).status, 200);
});
after(() => mock?.close());

test("studio: chat runs on the member's own key and streams", async () => {
  const r = await member.post("/api/byox/run", { app: "studio", messages: [{ role: "user", content: "hi" }], provider: "custom", options: { role: "Be terse." } });
  assert.equal(r.status, 200, r.text);
  assert.match(r.text, /Hello from Studio\./);
  assert.equal(r.headers.get("x-ai-mode"), "byox");
});

test("history: save, list, open, rename, duplicate, delete — encrypted & isolated", async () => {
  const s = await member.post("/api/history/studio", { title: "First chat", body: { role: "", messages: [{ role: "user", content: "q" }, { role: "assistant", content: SECRET }] } });
  assert.equal(s.status, 200, s.text);
  const cid = s.json.item.id;
  const list = await member.get("/api/history/studio");
  assert.equal(list.json.items.length, 1);
  assert.equal(list.json.items[0].title, "First chat");
  const open = await member.get(`/api/history/studio/${cid}`);
  assert.equal(open.json.item.body.messages[1].content, SECRET);
  // update in place (same id)
  await member.post("/api/history/studio", { id: cid, title: "First chat", body: { role: "", messages: [{ role: "user", content: "q2" }] } });
  assert.equal((await member.get("/api/history/studio")).json.items.length, 1, "update keeps one item");
  await member.post(`/api/history/studio/${cid}/rename`, { title: "Renamed" });
  assert.equal((await member.get("/api/history/studio")).json.items[0].title, "Renamed");
  const dup = await member.post(`/api/history/studio/${cid}/duplicate`, {});
  assert.equal(dup.status, 200);
  assert.equal((await member.get("/api/history/studio")).json.items.length, 2);
  // encrypted at rest: the secret is never in D1
  assert.equal(d1(`SELECT COUNT(*) AS n FROM users WHERE email='studio-${RUN}@example.com' AND email LIKE '%${SECRET}%'`)[0].n, 0);
  // isolation: another member sees nothing
  const other = new Client();
  await other.post("/api/auth/register", { email: `other-${RUN}@example.com`, name: "Other", password: "abcdefgh1", acceptTerms: true });
  const oo = await other.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  await admin.post("/api/admin/orders", { action: "mark_paid", id: oo.json.orderId });
  assert.equal((await other.get("/api/history/studio")).json.items.length, 0);
  assert.equal((await other.get(`/api/history/studio/${cid}`)).status, 404);
  // delete
  await member.del(`/api/history/studio/${cid}`);
  assert.equal((await member.get("/api/history/studio")).json.items.length, 1);
});

test("history: unknown app rejected; plan required", async () => {
  assert.equal((await member.get("/api/history/nope")).status, 404);
  assert.equal((await new Client().get("/api/history/studio")).status, 401);
});
