/* ==============================================================================
 * AXTO v3 — API integration tests against the LOCAL Cloudflare runtime.
 *   1. npx @cloudflare/next-on-pages
 *   2. bash tests/e2e/serve-local.sh          (port 8788, local D1/KV/R2)
 *   3. npx tsx --test tests/e2e/api.e2e.ts
 * Every connection is exercised for real: auth → billing → activation →
 * licences → engine validation → BYOX (mock provider) → Managed lock → cron.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

// The d1() helper blocks for seconds; don't reuse sockets the dev server has since closed.
setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const MOCK_PORT = 8799;
const ADMIN_EMAIL = "e2e-admin@axto.io";
const ADMIN_PASSWORD = "e2e-admin-Pass-2026";
const CRON_SECRET = "e2e-cron-secret";
const RUN = Date.now().toString(36);
// Public half of the TEST-ONLY signing key configured in serve-local.sh.
const TEST_SIGNING_PUBLIC_KEY_B64 = "tljcAsNNvb0cxHPRnNTkm5o15YfzMWJGOyeew1UwvpY=";

/** Verify a licence answer exactly like the engines do (Ed25519 over signed_payload). */
async function engineVerify(j: any): Promise<Record<string, string> | null> {
  if (!j?.signed_payload || !j?.signature) return null;
  const key = await crypto.subtle.importKey("raw", Buffer.from(TEST_SIGNING_PUBLIC_KEY_B64, "base64"), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, Buffer.from(j.signature, "base64"), new TextEncoder().encode(j.signed_payload));
  if (!ok) return null;
  const f = ["license_key", "machine_id", "product", "valid", "status", "expires_at", "issued_at", "nonce"];
  const parts = j.signed_payload.split("|");
  const out: Record<string, string> = Object.fromEntries(f.map((k, i) => [k, parts[i]]));
  if (parts.length > f.length) out.entitlements = parts.slice(f.length).join("|");
  return out;
}

// ── helpers ────────────────────────────────────────────────────────────────
class Client {
  cookie = "";
  ip = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;   // one simulated visitor per client (cf-connecting-ip)
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "cf-connecting-ip": this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).catch((e) => { throw new Error(`${method} ${p} → ${e?.cause?.code || e?.cause?.message || e?.message}`); });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = set.match(/axto_session=([^;]*)/);
      if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    }
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown, h?: Record<string, string>) => this.call("POST", p, b ?? {}, h);
  put = (p: string, b?: unknown) => this.call("PUT", p, b ?? {});
  patch = (p: string, b?: unknown) => this.call("PATCH", p, b ?? {});
  del = (p: string) => this.call("DELETE", p);
}

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const j = JSON.parse(out.slice(out.indexOf("[")));
  return j[0]?.results || [];
}

let mock: http.Server;
const mockCalls: any[] = [];

before(async () => {
  // Mock OpenAI-compatible provider for BYOX ("custom" endpoint).
  mock = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      mockCalls.push({ url: req.url, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
      if (req.url === "/v1/chat/completions") {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const t of ["O", "K"]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
        res.end("data: [DONE]\n\n");
      } else { res.writeHead(404); res.end(); }
    });
  }).listen(MOCK_PORT);
  // Seed an admin account (password comes from the ADMIN_PASSWORD break-glass secret).
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', '${ADMIN_EMAIL}', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
});
after(() => mock?.close());

const member = new Client();
const other = new Client();
const admin = new Client();
const memberEmail = `member-${RUN}@example.com`;
let firstOrderId = "";
let guardKey = "";

// ── tests ──────────────────────────────────────────────────────────────────
test("health: D1, KV and R2 bindings are live", async () => {
  const r = await member.get("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.bindings, { d1: true, kv: true, r2: true, userFiles: true, builds: true });
});

test("register: validation, success, duplicate", async () => {
  assert.equal((await member.post("/api/auth/register", { email: "bad", name: "x", password: "abc12345", acceptTerms: true })).status, 400);
  assert.equal((await member.post("/api/auth/register", { email: memberEmail, name: "M", password: "short", acceptTerms: true })).status, 400);
  assert.equal((await member.post("/api/auth/register", { email: memberEmail, name: "M", password: "abcdefgh1" })).status, 400, "terms required");
  const ok = await member.post("/api/auth/register", { email: memberEmail, name: "Member One", organization: "Acme", password: "abcdefgh1", acceptTerms: true });
  assert.equal(ok.status, 200, ok.text);
  assert.ok(member.cookie, "session cookie set");
  const dup = await other.post("/api/auth/register", { email: memberEmail.toUpperCase(), name: "Dup", password: "abcdefgh1", acceptTerms: true });
  assert.equal(dup.status, 409);
  const me = await member.get("/api/auth/me");
  assert.equal(me.json.tier, "none");
  assert.equal(me.json.user.name, "Member One");
  assert.equal(me.json.limits.apps.join(), "prompts");
});

test("login / logout / wrong password / page guard", async () => {
  await member.post("/api/auth/logout");
  assert.equal(member.cookie, "");
  assert.equal((await member.get("/api/auth/me")).status, 401);
  assert.equal((await member.post("/api/auth/login", { email: memberEmail, password: "wrong-pass1" })).status, 401);
  const ok = await member.post("/api/auth/login", { email: memberEmail, password: "abcdefgh1", redirect: "//evil.com" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.redirect, "/app", "open redirect blocked");
  const guard = await new Client().get("/app/billing");
  assert.equal(guard.status, 307);
  assert.match(guard.headers.get("location") || "", /\/login\?redirect=%2Fapp%2Fbilling/);
  const adminPage = await member.get("/admin");
  assert.equal(adminPage.status, 307, "member redirected away from /admin");
});

test("admin: sign in, members cannot reach admin APIs", async () => {
  assert.equal((await member.get("/api/admin/stats")).status, 403);
  const r = await admin.post("/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.redirect, "/admin");
  const s = await admin.get("/api/admin/stats");
  assert.equal(s.status, 200);
  assert.ok(s.json.members >= 1);
});

test("payments: configure manual gateway; options + checkout validation", async () => {
  const bad = await admin.put("/api/admin/gateways", { gateway: "manual", credentials: {}, is_active: true });
  assert.equal(bad.status, 400, "cannot activate without credentials");
  const put = await admin.put("/api/admin/gateways", { gateway: "manual", credentials: { instructions: "Bank Test 123" }, is_active: true });
  assert.equal(put.status, 200, put.text);
  const g = await admin.get("/api/admin/gateways");
  const manual = g.json.gateways.find((x: any) => x.id === "manual");
  assert.equal(manual.active, true);
  assert.equal(manual.values.instructions, "Bank Test 123");

  const opts = await member.get("/api/billing/options");
  assert.deepEqual(opts.json.gateways.map((x: any) => x.id), ["manual"]);
  assert.equal(opts.json.plans.find((p: any) => p.id === "pro").monthly, 49);

  assert.equal((await member.post("/api/billing/checkout", { plan: "gold", cycle: "monthly", gateway: "manual" })).status, 400);
  assert.equal((await member.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "stripe" })).status, 503);
  assert.equal((await admin.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual" })).status, 400, "admins don't buy");
  assert.equal((await new Client().post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual" })).status, 401);
});

test("checkout → admin marks paid → plan active, invoice, idempotent", async () => {
  const c = await member.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual", amount: 0.01 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.manual, true);
  assert.equal(c.json.amountUsd, 49, "price comes from the server, never the browser");
  assert.equal(c.json.instructions, "Bank Test 123");
  firstOrderId = c.json.orderId;

  const list = await admin.get("/api/admin/orders?status=pending");
  assert.ok(list.json.orders.some((o: any) => o.id === firstOrderId));
  const paid = await admin.post("/api/admin/orders", { action: "mark_paid", id: firstOrderId, note: "BCA ref 42" });
  assert.equal(paid.status, 200, paid.text);
  const again = await admin.post("/api/admin/orders", { action: "mark_paid", id: firstOrderId });
  assert.equal(again.status, 400, "second activation refused");

  const me = await member.get("/api/auth/me");
  assert.equal(me.json.tier, "pro");
  const days = (Date.parse(me.json.subscription.current_period_end) - Date.now()) / 86_400_000;
  assert.ok(days > 27 && days < 32, `~1 month, got ${days}`);
  assert.ok(me.json.limits.apps.includes("compliance"));

  const ov = await member.get("/api/billing/overview");
  const o = ov.json.orders.find((x: any) => x.id === firstOrderId);
  assert.equal(o.status, "paid");
  assert.match(o.invoice_no, /^AXTO-\d{4}-\d{6}$/);
  const inv = await member.get(`/api/billing/invoice/${firstOrderId}`);
  assert.equal(inv.status, 200);
  assert.ok(inv.text.includes(o.invoice_no) && inv.text.includes("$49"));

  // Another member cannot read it.
  const reg = await other.post("/api/auth/register", { email: `other-${RUN}@example.com`, name: "Other", password: "abcdefgh1", acceptTerms: true });
  assert.equal(reg.status, 200, reg.text);
  assert.equal((await other.get(`/api/billing/invoice/${firstOrderId}`)).status, 404);
});

test("self-hosted: Pro has no licences; Business upgrade prorates and allows 3", async () => {
  const sh = await member.get("/api/selfhosted");
  assert.equal(sh.json.allowance, 0);
  assert.equal(sh.json.products.length, 10);
  assert.equal((await member.post("/api/selfhosted", { action: "issue", product: "guardian" })).status, 402);

  const c = await member.post("/api/billing/checkout", { plan: "business", cycle: "yearly", gateway: "manual" });
  assert.equal(c.json.amountUsd, 1990);
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200);
  const me = await member.get("/api/auth/me");
  assert.equal(me.json.tier, "business");
  // ~30 unused Pro days ($49/mo) convert to ~8.9 Business-yearly days ($1,990/yr).
  const days = (Date.parse(me.json.subscription.current_period_end) - Date.now()) / 86_400_000;
  const credit = 30 * ((49 / 30.4375) / (1990 / 365.25));
  assert.ok(Math.abs(days - (365 + credit)) < 1.5, `1 year + prorated credit (${(365 + credit).toFixed(1)}), got ${days.toFixed(2)}`);

  for (const p of ["guardian", "vault", "legal"]) {
    const r = await member.post("/api/selfhosted", { action: "issue", product: p });
    assert.equal(r.status, 200, `${p}: ${r.text}`);
  }
  const fourth = await member.post("/api/selfhosted", { action: "issue", product: "soc" });
  assert.equal(fourth.status, 409);
  const list = await member.get("/api/selfhosted");
  assert.equal(list.json.used, 3);
  const g = list.json.products.find((p: any) => p.slug === "guardian");
  guardKey = g.license.license_key;
  assert.match(guardKey, /^GUARD-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
  assert.equal(g.license.max_nodes, 5);
  assert.equal(g.license.expires_at, me.json.subscription.current_period_end);
});

test("license-validate: engine protocol end to end", async () => {
  const v = (body: any) => fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));
  const ok = await v({ license_key: guardKey.toLowerCase(), machine_id: "machine-A", product: "guardian", version: "3.0.0", node_count: 2 });
  assert.equal(ok.json.valid, true, JSON.stringify(ok.json));
  assert.equal(ok.json.package_code, "aegis");
  assert.equal(ok.json.features.ebpf, true);
  const f = await engineVerify(ok.json);
  assert.ok(f, "Ed25519 signature verifies like the engines do");
  assert.equal(f!.license_key, guardKey);
  assert.equal(f!.machine_id, "machine-A");
  assert.equal(f!.valid, "true");
  assert.equal(f!.status, "active");
  assert.match(f!.entitlements, /^package=aegis;.*ebpf=true/);
  // Separately-signed entitlements block (Legal + Studio modules read this one).
  const ep = await engineVerify({ signed_payload: ok.json.entitlements_payload, signature: ok.json.entitlements_signature });
  assert.ok(ep, "entitlements block is signed with the same key");
  const [eKey, eMid, eProduct, eEnt] = String(ok.json.entitlements_payload).split("|");
  assert.deepEqual([eKey, eMid, eProduct], [guardKey, "machine-A", "guardian"]);
  assert.match(eEnt, /^package=aegis;/);
  const tampered = { ...ok.json, signed_payload: ok.json.signed_payload.replace("|true|", "|false|") };
  assert.equal(await engineVerify(tampered), null, "tampering breaks the signature");

  const other = await v({ license_key: guardKey, machine_id: "machine-B", product: "guardian" });
  assert.equal(other.json.valid, false);
  assert.equal(other.json.reason, "machine_mismatch");
  assert.equal((await engineVerify(other.json))?.status, "machine_mismatch", "negative answers are signed too");

  assert.equal((await member.post("/api/selfhosted", { action: "reset", product: "guardian" })).status, 200);
  assert.equal((await v({ license_key: guardKey, machine_id: "machine-B", product: "guardian" })).json.valid, true);

  assert.equal((await v({ license_key: guardKey, machine_id: "machine-B", product: "vault" })).json.reason, "product_mismatch");
  assert.equal((await v({ license_key: guardKey, machine_id: "machine-B", node_count: 9 })).json.reason, "node_limit_exceeded");
  const free = await v({ license_key: "GUARD-FREE-ACCESS-2026", machine_id: "m" });
  assert.equal(free.json.reason, "program_ended");
  assert.equal((await engineVerify(free.json))?.status, "program_ended", "lock is signed");
  const pipe = await v({ license_key: guardKey, machine_id: "evil|true|active" });
  const pf = await engineVerify(pipe.json);
  assert.ok(!pf || pf.machine_id === "eviltrueactive", "delimiters cannot be injected into the signed payload");
  assert.match((await v({ license_key: "NOPE-1234" })).json.error, /Unrecognized/);
  assert.match((await v({ license_key: "GUARD-00000000-00000000-00000000-00000000" })).json.error, /not found/);
  assert.equal((await v({})).status, 400);
});

test("BYOX: keys, custom endpoint, live test against a provider", async () => {
  const k = await member.get("/api/byox/keys");
  assert.equal(k.json.keys.length, 0);
  assert.ok(k.json.providers.some((p: any) => p.id === "anthropic"));
  assert.equal((await member.post("/api/byox/keys", { provider: "nope", value: "x" })).status, 400);
  assert.equal((await member.post("/api/byox/keys", { provider: "openai", value: "short" })).status, 400);
  assert.equal((await member.post("/api/byox/keys", { provider: "custom", baseUrl: "ftp://x", model: "m" })).status, 400);
  const save = await member.post("/api/byox/keys", { provider: "custom", baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1`, model: "mock-llm", value: "sk-local-test-key" });
  assert.equal(save.status, 200, save.text);
  assert.equal(save.json.preferred, "custom", "first chat key becomes default");
  assert.equal(save.json.keys[0].hint, "…-key");
  assert.ok(!JSON.stringify(save.json).includes("sk-local-test-key"), "secret never returned");

  const t = await member.post("/api/byox/test", { provider: "custom" });
  assert.equal(t.json.ok, true, t.text);
  assert.equal(t.json.reply, "OK");
  const call = mockCalls.at(-1);
  assert.equal(call.auth, "Bearer sk-local-test-key");
  assert.equal(call.body.model, "mock-llm");
  assert.equal(call.body.messages[0].role, "system");

  const rows = d1(`SELECT key_enc FROM user_ai_keys WHERE provider = 'custom'`);
  assert.ok(rows.length && !String(rows[0].key_enc).includes("sk-local-test-key"), "stored encrypted");

  // AI Studio is live and included in the member's plan → it runs on their own key.
  const run = await member.post("/api/byox/run", { app: "studio", messages: [{ role: "user", content: "hi" }] });
  assert.equal(run.status, 200, run.text);
  // A still-unreleased app is closed (release gate).
  const soon = await member.post("/api/byox/run", { app: "clipper", messages: [{ role: "user", content: "hi" }] });
  assert.ok(soon.status === 503 || soon.status === 400, `coming-soon gate: ${soon.status}`);

  assert.equal((await member.del("/api/byox/keys?provider=custom")).status, 200);
  assert.equal((await member.get("/api/byox/keys")).json.keys.length, 0);
});

test("Managed AI is locked and fully separate", async () => {
  const s = await member.get("/api/managed/status");
  assert.equal(s.json.enabled, false);
  const r = await member.post("/api/managed/run", { messages: [{ role: "user", content: "hi" }] });
  assert.equal(r.status, 423);
  const a = await admin.get("/api/admin/managed");
  assert.equal(a.json.enabled, false);
  assert.ok(!JSON.stringify(a.json).includes("user_ai_keys"));
});

test("admin price override flows into checkout", async () => {
  const put = await admin.put("/api/admin/plans", { prices: { starter: { monthly: 21, yearly: 210 }, pro: { monthly: 49, yearly: 490 }, business: { monthly: 199, yearly: 1990 }, enterprise: { monthly: 999, yearly: 9990 } } });
  assert.equal(put.status, 200, put.text);
  const c = await other.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal(c.json.amountUsd, 21);
  await admin.put("/api/admin/plans", { prices: { starter: { monthly: 19, yearly: 190 }, pro: { monthly: 49, yearly: 490 }, business: { monthly: 199, yearly: 1990 }, enterprise: { monthly: 999, yearly: 9990 } } });
});

test("password reset end to end", async () => {
  const f = await new Client().post("/api/auth/forgot", { email: memberEmail });
  assert.equal(f.status, 200);
  const [row] = d1(`SELECT token FROM password_resets WHERE email = '${memberEmail}' AND used = 0 ORDER BY created_at DESC LIMIT 1`);
  assert.ok(row?.token);
  const c = new Client();
  assert.equal((await c.post("/api/auth/reset", { token: row.token, password: "weak" })).status, 400);
  assert.equal((await c.post("/api/auth/reset", { token: row.token, password: "newpass123" })).status, 200);
  assert.equal((await c.post("/api/auth/reset", { token: row.token, password: "newpass456" })).status, 400, "token single-use");
  assert.equal((await new Client().post("/api/auth/login", { email: memberEmail, password: "newpass123" })).status, 200);
});

test("suspension blocks sign-in and licences; reactivation restores", async () => {
  const [u] = d1(`SELECT id FROM users WHERE email = '${memberEmail}'`);
  assert.equal((await admin.post(`/api/admin/members/${u.id}`, { action: "suspend" })).status, 200);
  assert.equal((await new Client().post("/api/auth/login", { email: memberEmail, password: "newpass123" })).status, 403);
  const v = await fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ license_key: guardKey, machine_id: "machine-B" }) }).then((r) => r.json());
  assert.equal(v.reason, "suspended");
  assert.equal((await admin.post(`/api/admin/members/${u.id}`, { action: "activate" })).status, 200);
});

test("cron: auth, expiry suspends licences", async () => {
  assert.equal((await new Client().get("/api/cron/expire-licenses")).status, 401);
  const [u] = d1(`SELECT id FROM users WHERE email = '${memberEmail}'`);
  d1(`UPDATE subscriptions SET current_period_end = '2020-01-01T00:00:00.000Z' WHERE user_id = '${u.id}'`);
  const r = await new Client().call("GET", "/api/cron/expire-licenses", undefined, { "x-cron-secret": CRON_SECRET });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.expired >= 1);
  const [lic] = d1(`SELECT status FROM sh_licenses WHERE license_key = '${guardKey}'`);
  assert.equal(lic.status, "suspended");
  // Admin grant restores access and licences through the same activation path.
  assert.equal((await admin.post(`/api/admin/members/${u.id}`, { action: "grant", plan: "enterprise", cycle: "monthly" })).status, 200);
  const [lic2] = d1(`SELECT status, max_nodes FROM sh_licenses WHERE license_key = '${guardKey}'`);
  assert.equal(lic2.status, "active");
  assert.equal(lic2.max_nodes, -1);
});

test("webhooks reject unsigned calls", async () => {
  for (const g of ["stripe", "paypal", "xendit", "midtrans", "nowpayments"]) {
    const r = await new Client().post(`/api/webhooks/${g}`, { order_id: firstOrderId, status: "PAID" });
    assert.ok(r.status === 400 || r.status === 401, `${g} → ${r.status}`);
  }
});

test("audit log records the money trail", async () => {
  const a = await admin.get("/api/admin/audit?q=order");
  const actions = a.json.entries.map((e: any) => e.action);
  assert.ok(actions.includes("order.created") && actions.includes("order.paid") && actions.includes("admin.order.mark_paid"));
});
