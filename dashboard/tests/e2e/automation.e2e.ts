/* ==============================================================================
 * AXTO v3 — zero-touch automation, E2E against the LOCAL runtime:
 *   payment confirmed → plan active → licences issued with no admin step
 *   direct crypto orders get unique amounts; hashes are verified; bank
 *   transfers go to the Support inbox for approval; the cron tick runs it all.
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}

class Client {
  cookie = "";
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(90_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string, h?: Record<string, string>) => this.call("GET", p, undefined, h);
  post = (p: string, b?: unknown) => this.call("POST", p, b ?? {});
  put = (p: string, b?: unknown) => this.call("PUT", p, b ?? {});
}

const admin = new Client();
async function member(tag: string) {
  const c = new Client();
  const r = await c.post("/api/auth/register", { email: `${tag}-${RUN}@example.com`, name: `Auto ${tag}`, password: "abcdefgh1", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
  return c;
}
const licences = (email: string) => d1(`SELECT l.product, l.status FROM sh_licenses l JOIN users u ON u.id = l.user_id WHERE u.email = '${email}' ORDER BY l.product`);

before(async () => {
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  assert.equal((await admin.post("/api/auth/login", { email: "e2e-admin@axto.io", password: "e2e-admin-Pass-2026" })).status, 200);
  assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "1234567890", account_name: "PT AXTO E2E" } })).status, 200);
  assert.equal((await admin.put("/api/admin/gateways", { gateway: "crypto", is_active: true, credentials: { usdt_trc20: "TQautoE2EwalletAddress00000000001" } })).status, 200);
});

test("payment confirmed → Business licences for the apps chosen at checkout, no admin step", async () => {
  const m = await member("biz");
  assert.equal((await m.post("/api/billing/checkout", { plan: "business", cycle: "monthly", gateway: "manual", apps: ["vault", "legal", "soc", "edge"] })).status, 400, "max 3 apps");
  const c = await m.post("/api/billing/checkout", { plan: "business", cycle: "monthly", gateway: "manual", apps: ["vault", "legal", "nope"] });
  assert.equal(c.status, 200, c.text);
  assert.deepEqual(licences(`biz-${RUN}@example.com`), []);
  // The gateway (here: the admin approving the transfer) confirms the payment…
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200);
  // …and the licences exist immediately.
  assert.deepEqual(licences(`biz-${RUN}@example.com`), [{ product: "legal", status: "active" }, { product: "vault", status: "active" }]);
  const sh = await m.get("/api/selfhosted");
  assert.equal(sh.json.used, 2);
  assert.match(sh.json.products.find((p: any) => p.slug === "vault").license.license_key, /^VAULT-/);
});

test("Enterprise payment → every self-hosted app licensed automatically", async () => {
  const m = await member("ent");
  const c = await m.post("/api/billing/checkout", { plan: "enterprise", cycle: "monthly", gateway: "manual" });
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200);
  const l = licences(`ent-${RUN}@example.com`);
  assert.equal(l.length, 10);
  assert.ok(l.every((x: any) => x.status === "active"));
});

test("direct crypto: unique amounts per order, hash verification, order status", async () => {
  const m = await member("cry");
  const a = await m.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "crypto" });
  const b = await m.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "crypto" });
  assert.equal(a.status, 200, a.text);
  const amtA = a.json.wallets[0].amount, amtB = b.json.wallets[0].amount;
  assert.match(amtA, /^19\.\d{2}$/);
  assert.notEqual(amtA, amtB, "each open order has its own amount");
  assert.equal(a.json.wallets[0].auto, true);
  assert.equal(a.json.wallets[0].address, "TQautoE2EwalletAddress00000000001");

  const o = await m.get(`/api/billing/orders/${a.json.orderId}`);
  assert.equal(o.json.order.crypto.amount, amtA);
  assert.equal((await new Client().get(`/api/billing/orders/${a.json.orderId}`)).status, 401);
  assert.equal((await (await member("other")).get(`/api/billing/orders/${a.json.orderId}`)).status, 404, "only the owner");

  assert.equal((await m.post(`/api/billing/orders/${a.json.orderId}`, { action: "crypto_proof", network: "usdt_trc20", tx: "short" })).status, 400);
  const proof = await m.post(`/api/billing/orders/${a.json.orderId}`, { action: "crypto_proof", network: "usdt_trc20", tx: "f".repeat(64) });
  assert.equal(proof.status, 200, proof.text);
  assert.equal(proof.json.status, "pending", "not on-chain → keeps checking, never paid");
  assert.equal((await m.get(`/api/billing/orders/${a.json.orderId}`)).json.order.status, "pending");
});

test("bank transfer proof → Support inbox for approval", async () => {
  const m = await member("bank");
  const c = await m.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual" });
  const r = await m.post(`/api/billing/orders/${c.json.orderId}`, { action: "bank_proof", reference: "BNI 998877 a.n. Auto bank" });
  assert.equal(r.status, 200, r.text);
  const inbox = await admin.get(`/api/admin/support?status=all&q=${c.json.orderId}`);
  const t = inbox.json.threads[0];
  assert.equal(t.source, "payment");
  assert.equal(t.topic, "bank");
  assert.equal(t.needs_admin, 1);
});

test("cron tick: authenticated, runs the crypto watcher and hourly housekeeping", async () => {
  assert.equal((await new Client().get("/api/cron/tick")).status, 401);
  assert.equal((await new Client().get("/api/cron/tick", { "x-cron-secret": "wrong-secret" })).status, 401);
  const t = await new Client().get("/api/cron/tick?hourly=1", { authorization: "Bearer e2e-cron-secret" });
  assert.equal(t.status, 200, t.text);
  assert.ok(t.json.crypto.checked >= 2, JSON.stringify(t.json));
  assert.equal(typeof t.json.housekeeping.expired, "number");
  const again = await new Client().get("/api/cron/tick", { "x-cron-secret": "e2e-cron-secret" });
  assert.equal(again.json.housekeeping, undefined, "hourly work runs once per hour");
});
