/* ==============================================================================
 * AXTO — site sale end to end on the LOCAL runtime:
 *   public offer → admin sets price / methods → buyer checks out by BNI wire
 *   (owner's accounts + WhatsApp) → sends the proof → admin marks the wire
 *   received → the buyer's own session becomes ADMIN (no sign-out) → the site
 *   is sold and closed to others → refund removes the role and reopens it.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.61.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}
function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}
async function signUp(c: Client, email: string) {
  const r = await c.post("/api/auth/register", { email, name: "Buyer " + RUN, password: "Buyer-Pass-2026", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
}

const admin = new Client(), buyer = new Client(), rival = new Client(), anon = new Client();
let saved: any = null, orderId = "";

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/acquisition");
  assert.equal(g.status, 200, g.text);
  saved = g.json.settings;
  // A known state: open, $10,000,000, wire offered.
  const r = await admin.put("/api/admin/acquisition", { settings: { ...g.json.defaults, status: "open" } });
  assert.equal(r.status, 200, r.text);
  await signUp(buyer, `buyer-${RUN}@example.com`);
  await signUp(rival, `rival-${RUN}@example.com`);
});
after(async () => {
  if (saved) await admin.put("/api/admin/acquisition", { settings: { ...saved, status: saved.status === "sold" ? "open" : saved.status } });
});

test("acquire: the public offer shows the price, the page and the menu", async () => {
  const r = await anon.get("/api/acquire");
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "open");
  assert.equal(r.json.priceUsd, 10_000_000);
  assert.ok(r.json.gateways.some((g: any) => g.id === "manual"), "BNI wire is offered");
  assert.ok(!JSON.stringify(r.json).includes("2090571495"), "bank accounts are not public before a checkout");
  const page = await anon.get("/acquire");
  assert.equal(page.status, 200);
  assert.match(page.text, /Acquire AXTO/);
  const home = await anon.get("/");
  assert.match(home.text, /href="\/acquire"/, "the homepage links to the offer");
});

test("acquire: checkout needs a buyer account (not an admin), and only offered methods", async () => {
  assert.equal((await anon.post("/api/acquire/checkout", { gateway: "manual" })).status, 401);
  const a = await admin.post("/api/acquire/checkout", { gateway: "manual" });
  assert.equal(a.status, 400);
  assert.match(a.json.error, /Administrator accounts cannot buy/);
  assert.equal((await buyer.post("/api/acquire/checkout", { gateway: "bogus" })).status, 400);
});

test("acquire: BNI wire checkout → owner's accounts, WhatsApp, proof → admin marks paid → buyer is admin", async () => {
  const r = await buyer.post("/api/acquire/checkout", { gateway: "manual", company: "Acme Holdings", name: "Budi", phone: "+62 811 0000", message: "Ready to wire" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.method, "wire");
  assert.equal(r.json.amountUsd, 10_000_000);
  assert.equal(r.json.bank.swift, "BNINIDJA");
  assert.equal(r.json.bank.holder, "YUSRON EFENDI");
  assert.equal(r.json.bank.primary.number, "2090571495");
  assert.ok(r.json.bank.accounts.some((x: any) => x.currency === "IDR" && x.number === "2090571484"));
  assert.equal(r.json.whatsapp, "+6285691234561");
  orderId = r.json.orderId;
  const again = await buyer.post("/api/acquire/checkout", { gateway: "manual" });
  assert.equal(again.json.orderId, orderId, "an open wire order is reused, not duplicated");

  const proof = await buyer.post(`/api/billing/orders/${orderId}`, { action: "bank_proof", reference: `WIRE-${RUN}` });
  assert.equal(proof.status, 200, proof.text);
  assert.match(proof.json.message, /WhatsApp \+6285691234561/);

  const st0 = await buyer.get(`/api/acquire/status?order=${orderId}`);
  assert.equal(st0.json.order.status, "pending");
  assert.equal(st0.json.admin, false);
  assert.equal((await buyer.get("/api/admin/stats")).status, 403, "not an admin before the payment is verified");

  const list = await admin.get("/api/admin/acquisition");
  const row = list.json.orders.find((o: any) => o.id === orderId);
  assert.equal(row.buyer.company, "Acme Holdings");
  assert.equal(row.proof.reference, `WIRE-${RUN}`);

  const paid = await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId, note: `BNI ${RUN}` });
  assert.equal(paid.status, 200, paid.text);

  const st = await buyer.get(`/api/acquire/status?order=${orderId}`);
  assert.equal(st.json.order.status, "paid");
  assert.equal(st.json.admin, true, "the buyer's own session now carries the admin role");
  assert.equal(st.json.buyer, true);
  assert.ok(st.json.order.invoiceNo.startsWith("AXTO-"));
  assert.equal((await buyer.get("/api/admin/stats")).status, 200, "admin APIs open for the new owner");
  const adminPage = await buyer.get("/admin");
  assert.notEqual(adminPage.status, 307, "the middleware lets the refreshed cookie into /admin");
  assert.equal(d1(`SELECT role FROM users WHERE email = 'buyer-${RUN}@example.com'`)[0].role, "admin");
  assert.ok(d1(`SELECT action FROM audit_log WHERE action = 'site.sale.paid' AND entity_id = '${orderId}'`).length === 1);
});

test("acquire: once sold, the offer closes for everyone else", async () => {
  const pub = await anon.get("/api/acquire");
  assert.equal(pub.json.status, "sold");
  const r = await rival.post("/api/acquire/checkout", { gateway: "manual" });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /sold/);
  const s = await admin.get("/api/admin/acquisition");
  assert.equal(s.json.settings.soldTo.orderId, orderId);
});

test("acquire: a refund removes the buyer's admin role and reopens the offer", async () => {
  const r = await admin.post("/api/admin/orders", { action: "refund", id: orderId, note: "test refund", endAccess: true });
  assert.equal(r.status, 200, r.text);
  assert.equal(d1(`SELECT role FROM users WHERE email = 'buyer-${RUN}@example.com'`)[0].role, "client", "back to a regular member");
  assert.equal((await buyer.get("/api/admin/stats")).status, 403, "admin access ends at once");
  assert.equal((await anon.get("/api/acquire")).json.status, "open");
});

test("acquire: admin settings are validated", async () => {
  const bad = await admin.put("/api/admin/acquisition", { settings: { gateways: [] } });
  assert.equal(bad.status, 400);
  const ok = await admin.put("/api/admin/acquisition", { settings: { ...saved, priceUsd: 1_500_000, status: "paused" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.settings.priceUsd, 1_500_000);
  const pub = await anon.get("/api/acquire");
  assert.equal(pub.json.status, "paused");
  assert.equal(pub.json.priceUsd, 1_500_000);
  assert.equal((await rival.post("/api/acquire/checkout", { gateway: "manual" })).status, 409);
  assert.equal((await buyer.put("/api/admin/acquisition", { settings: { status: "open" } })).status, 403, "members cannot change the sale");
});
