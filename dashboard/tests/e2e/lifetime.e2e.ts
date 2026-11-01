/* ==============================================================================
 * AXTO v3.2 — Lifetime (offline) licences end to end on the LOCAL runtime:
 *   checkout at OUR price → payment → licence issued with no admin step →
 *   device activation (signed .axto-license, verified here exactly like an
 *   engine does) → device limit → admin retire / revoke / negotiated deal →
 *   build downloads → admin price override.
 * The engines' own verification of these files runs in engines.e2e.ts.
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { auditFor, doc, find, meta, seedAdmin } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);
const TEST_SIGNING_PUBLIC_KEY_B64 = "tljcAsNNvb0cxHPRnNTkm5o15YfzMWJGOyeew1UwvpY=";   // serve-local.sh test key
const FIELDS = ["format", "license_id", "product", "machine_id", "scope", "devices", "major", "updates_until", "issued_at", "entitlements"];

class Client {
  cookie = ""; ip = `10.44.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
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


/** Verify a .axto-license file exactly like the engines do. */
async function verifyFile(text: string): Promise<Record<string, string> | null> {
  const doc = JSON.parse(text);
  const key = await crypto.subtle.importKey("raw", Buffer.from(TEST_SIGNING_PUBLIC_KEY_B64, "base64"), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, Buffer.from(doc.signature, "base64"), new TextEncoder().encode(doc.payload));
  if (!ok) return null;
  const parts = String(doc.payload).split("|");
  return parts.length === FIELDS.length ? Object.fromEntries(FIELDS.map((f, i) => [f, parts[i]])) : null;
}

const mid = (n: number) => (RUN + "0".repeat(32)).replace(/[^0-9a-f]/g, "a").slice(0, 30) + String(n).padStart(2, "0");
const admin = new Client(), member = new Client(), other = new Client();
const email = `lifetime-${RUN}@example.com`;
let orderId = "", licenseId = "";

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();   // one shared admin session (sign-in is rate-limited)
  const g = await admin.get("/api/admin/gateways");
  if (!g.json.gateways.find((x: any) => x.id === "manual")?.active) {
    assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "0123456789", account_name: "AXTO" } })).status, 200);
  }
  for (const [c, e] of [[member, email], [other, `lifetime-other-${RUN}@example.com`]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: e, name: "Lifetime Test", organization: "E2E Corp", password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
});

test("lifetime: live prices are public; checkout validates the choice and charges OUR price", async () => {
  const o = await new Client().get("/api/billing/options");
  assert.equal(o.status, 200);
  assert.equal(o.json.lifetime.tiers.length, 6);
  assert.deepEqual(o.json.lifetime.tiers[0], { devices: 1, label: "1 device", app: 24900, suite: 149000 });
  assert.ok(o.json.lifetime.gateways.includes("manual"));
  assert.equal(o.json.lifetime.gateways[0], "paypal", "PayPal first — offered only up to its single-payment ceiling");
  assert.equal(o.json.lifetime.paypalMaxUsd, 10_000);

  assert.equal((await new Client().post("/api/billing/checkout", { kind: "lifetime", scope: "app", product: "vault", devices: 5, gateway: "manual" })).status, 401);
  const adminTry = await admin.post("/api/billing/checkout", { kind: "lifetime", scope: "app", product: "vault", devices: 5, gateway: "manual" });
  assert.equal(adminTry.status, 400, `admins don't buy: ${adminTry.text}`);
  assert.equal((await member.post("/api/billing/checkout", { kind: "lifetime", scope: "app", devices: 5, gateway: "manual" })).status, 400, "app required");
  assert.equal((await member.post("/api/billing/checkout", { kind: "lifetime", scope: "galaxy", devices: 5, gateway: "manual" })).status, 400, "scope");
  assert.equal((await member.post("/api/billing/checkout", { kind: "lifetime", scope: "app", product: "vault", devices: 3, gateway: "manual" })).status, 400, "devices must be a tier");

  const c = await member.post("/api/billing/checkout", { kind: "lifetime", scope: "app", product: "vault", devices: 5, gateway: "manual", amount: 1, amountUsd: 1 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.manual, true);
  assert.equal(c.json.amountUsd, 99000, "the browser never sets the price");
  orderId = c.json.orderId;
  const ord = await doc("orders", orderId);
  const row = { plan: ord.plan, cycle: ord.cycle, amount_usd: ord.amount_usd, status: ord.status, product: meta(ord).lifetime?.product, devices: meta(ord).lifetime?.devices };
  assert.deepEqual(row, { plan: "lifetime", cycle: "once", amount_usd: 99000, status: "pending", product: "vault", devices: 5 });
});

test("lifetime: payment issues the licence with no admin step; idempotent; invoiced", async () => {
  assert.equal((await member.get("/api/lifetime")).json.licenses.length, 0);
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId })).status, 200);
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId })).status, 400, "already paid");
  const l = await member.get("/api/lifetime");
  assert.equal(l.status, 200);
  assert.equal(l.json.licenses.length, 1);
  const lic = l.json.licenses[0];
  licenseId = lic.id;
  assert.match(lic.id, /^LT-[0-9A-F]{12}$/);
  assert.equal(lic.scope, "app"); assert.equal(lic.product, "vault"); assert.equal(lic.devices, 5); assert.equal(lic.status, "active");
  assert.equal(lic.updatesActive, true);
  assert.deepEqual(lic.products.map((p: any) => p.slug), ["vault"]);
  assert.ok(await find("lifetimeLicenses", "order_id", orderId), "one licence for the order");
  const inv = await member.get(`/api/billing/invoice/${orderId}`);
  assert.equal(inv.status, 200);
  assert.match(inv.text, /Lifetime licence — .*up to 5 devices/);
  assert.match(inv.text, /Updates included until/);
});

test("lifetime: signed activation files, per-device limit, re-download, admin retire", async () => {
  assert.equal((await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: "not-a-machine" })).status, 400);
  assert.equal((await member.post("/api/lifetime", { action: "activate", licenseId, product: "guardian", machineId: mid(1) })).status, 400, "not covered");
  assert.equal((await other.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(1) })).status, 404, "someone else's licence");

  const acts: string[] = [];
  for (let n = 1; n <= 5; n++) {
    const r = await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(n), label: `server ${n}` });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.filename, "vault.axto-license");
    const f = await verifyFile(r.json.file);
    assert.ok(f, "file signature verifies with the licence public key");
    assert.equal(f!.format, "axto-lifetime-1"); assert.equal(f!.license_id, licenseId); assert.equal(f!.product, "vault");
    assert.equal(f!.machine_id, mid(n)); assert.equal(f!.devices, "5"); assert.equal(f!.major, "3");
    assert.match(f!.entitlements, /^package=vault_enterprise;/);
    assert.match(f!.entitlements, /;max_nodes=5(;|$)/);
    assert.match(JSON.parse(r.json.file).customer, /E2E Corp/);
    acts.push(r.json.activation.id);
  }
  const sixth = await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(6) });
  assert.equal(sixth.status, 409, "device limit");
  const again = await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(1) });
  assert.equal(again.status, 200);
  assert.equal(again.json.activation.id, acts[0], "same machine → same activation, no extra slot");

  const dl = await member.get(`/api/lifetime/file?id=${acts[2]}`);
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get("content-disposition") || "", /vault\.axto-license/);
  assert.ok(await verifyFile(dl.text));
  assert.equal((await other.get(`/api/lifetime/file?id=${acts[2]}`)).status, 404);

  assert.equal((await member.post("/api/admin/lifetime", { action: "retire", activationId: acts[1] })).status, 403);
  assert.equal((await admin.post("/api/admin/lifetime", { action: "retire", activationId: acts[1] })).status, 200);
  assert.equal((await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(6) })).status, 200, "retired slot is free again");
  assert.equal((await member.get(`/api/lifetime/file?id=${acts[1]}`)).status, 404, "a retired device's file is no longer served");
});

test("lifetime: builds download while updates are included; revoke stops activations and downloads", async () => {
  // Entitled: the build streams (200), or "being prepared" (404) when local R2 has none yet — never 402/403.
  const entitled = (st: number) => st === 200 || st === 404;
  const d = await member.get("/api/selfhosted/download?product=vault&file=vault-core");
  assert.ok(entitled(d.status), `lifetime holder may download (got ${d.status})`);
  assert.equal((await member.get("/api/selfhosted/download?product=guardian&file=guardian-core")).status, 402, "not covered, no plan");

  assert.equal((await admin.post("/api/admin/lifetime", { action: "revoke", licenseId })).status, 200);
  assert.equal((await member.post("/api/lifetime", { action: "activate", licenseId, product: "vault", machineId: mid(7) })).status, 403);
  assert.equal((await member.get("/api/selfhosted/download?product=vault&file=vault-core")).status, 402);
  assert.equal((await admin.post("/api/admin/lifetime", { action: "restore", licenseId })).status, 200);
  assert.ok(entitled((await member.get("/api/selfhosted/download?product=vault&file=vault-core")).status));
});

test("lifetime: admin prices flow into checkout; negotiated suite deal; admin-only", async () => {
  const cur = (await admin.get("/api/admin/lifetime")).json;
  assert.ok(cur.licenses.some((l: any) => l.id === licenseId && l.email === email));
  const tiers = cur.defaults.map((t: any) => (t.devices === 1 ? { ...t, app: 30000 } : t));
  assert.equal((await admin.put("/api/admin/lifetime", { tiers: tiers.slice(1) })).status, 400, "every tier required");
  assert.equal((await member.put("/api/admin/lifetime", { tiers })).status, 403);
  assert.equal((await admin.put("/api/admin/lifetime", { tiers })).status, 200);
  assert.equal((await new Client().get("/api/billing/options")).json.lifetime.tiers[0].app, 30000);
  const c = await member.post("/api/billing/checkout", { kind: "lifetime", scope: "app", product: "legal", devices: 1, gateway: "manual" });
  assert.equal(c.json.amountUsd, 30000);
  assert.equal((await admin.put("/api/admin/lifetime", { tiers: cur.defaults })).status, 200);

  assert.equal((await admin.post("/api/admin/lifetime", { action: "issue", email: "nobody@example.com", scope: "suite", devices: 3 })).status, 400);
  assert.equal((await admin.post("/api/admin/lifetime", { action: "issue", email, scope: "suite", devices: 0 })).status, 400);
  assert.equal((await member.post("/api/admin/lifetime", { action: "issue", email, scope: "suite", devices: 3 })).status, 403);
  const deal = await admin.post("/api/admin/lifetime", { action: "issue", email, scope: "suite", devices: 3, updateMonths: 24, note: "PO-7" });
  assert.equal(deal.status, 200, deal.text);
  const mine = (await member.get("/api/lifetime")).json.licenses.find((l: any) => l.id === deal.json.license.id);
  assert.equal(mine.scope, "suite");
  assert.equal(mine.products.length, 10, "a suite covers every self-hosted app");
  const a = await member.post("/api/lifetime", { action: "activate", licenseId: mine.id, product: "legal", machineId: mid(9) });
  assert.equal(a.status, 200);
  assert.match((await verifyFile(a.json.file))!.entitlements, /;workspaces=-1(;|$)/);
  const audit = [...(await auditFor("lifetime_license", licenseId)), ...(await auditFor("lifetime_license", deal.json.license.id))].map((r: any) => r.action);
  for (const want of ["lifetime.revoked", "lifetime.restored", "lifetime.issued"]) assert.ok(audit.includes(want), `audit has ${want}: ${audit}`);
});
