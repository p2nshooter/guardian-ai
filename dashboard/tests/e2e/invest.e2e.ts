/* ==============================================================================
 * AXTO — the AXTO-only investor round end to end on the LOCAL runtime:
 *   public terms + page + footer + sitemap → application errors (min, ack,
 *   e-mail) → an application (WhatsApp only after applying) → admin verifies
 *   the capital → paid AXTO orders after that day count, sandbox / acquisition
 *   / earlier ones never do → the investor's own statement → a payout nets the
 *   month → capital returned ends the share → paused / closed rounds refuse
 *   applications. No bank details anywhere on the public side.
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
  cookie = ""; ip = `10.62.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
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
    return { status: res.status, json, text };
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
const order = (id: string, amount: number, paidAt: string, plan = "pro", env = "live") =>
  `('${id}', 'u-${RUN}', 'customer-${RUN}@example.com', '${plan}', 'monthly', ${amount}, 'USD', 'paypal', 'paid', '{"env":"${env}"}', '${paidAt}', '${paidAt}')`;

const admin = new Client(), investor = new Client(), anon = new Client();
const EMAIL = `investor-${RUN}@example.com`;
let saved: any = null, id = "";

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/investors");
  assert.equal(g.status, 200, g.text);
  saved = g.json.settings;
  const r = await admin.put("/api/admin/investors", { settings: { ...g.json.defaults, status: "open" } });
  assert.equal(r.status, 200, r.text);
  const s = await investor.post("/api/auth/register", { email: EMAIL, name: "Investor " + RUN, password: "Investor-Pass-2026", acceptTerms: true });
  assert.equal(s.status, 200, s.text);
});
after(async () => {
  if (saved) await admin.put("/api/admin/investors", { settings: saved });
});

test("invest: public terms, the page, the footer link and the sitemap", async () => {
  const r = await anon.get("/api/invest");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.status, r.json.targetUsd, r.json.minUsd, r.json.poolPct], ["open", 2_000_000, 50_000, 30]);
  assert.ok(!("whatsapp" in r.json), "the WhatsApp number is given only after applying");
  const page = await anon.get("/invest");
  assert.equal(page.status, 200);
  assert.match(page.text, /Invest in AXTO/);
  assert.match(page.text, /AXTO, and only AXTO/);
  assert.match(page.text, /"@type":"FAQPage"/);
  for (const secret of ["2090571495", "2090571484", "BNINIDJA"]) assert.ok(!page.text.includes(secret), `no ${secret} on /invest`);
  const home = await anon.get("/");
  assert.match(home.text, /href="\/invest"/, "the footer links to the round");
  const map = await anon.get("/sitemap.xml");
  assert.match(map.text, /\/invest<\/loc>/);
});

test("invest: applications are validated and only an application is taken", async () => {
  const base = { name: "Ada Investor", email: EMAIL, company: "Ada Capital", country: "Singapore", amount: "75,000", method: "wire", message: "Please send the memorandum.", ack: true, lang: "en" };
  const low = await anon.post("/api/invest/apply", { ...base, amount: "10000" });
  assert.equal(low.status, 400);
  assert.equal(low.json.code, "min");
  const high = await anon.post("/api/invest/apply", { ...base, amount: "2500000" });
  assert.equal(high.json.code, "max");
  const noAck = await anon.post("/api/invest/apply", { ...base, ack: false });
  assert.equal(noAck.json.code, "ack");
  const badMail = await anon.post("/api/invest/apply", { ...base, email: "not-an-email" });
  assert.equal(badMail.json.code, "email");
  const bot = await anon.post("/api/invest/apply", { ...base, website: "http://spam" });
  assert.equal(bot.status, 200);
  assert.equal(bot.json.id, undefined, "the honeypot stores nothing");

  const ok = await investor.post("/api/invest/apply", base);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.amountUsd, 75_000);
  assert.equal(ok.json.whatsapp, "+6285691234561");
  id = ok.json.id;
  assert.match(id, /^inv_/);

  assert.equal((await investor.get("/api/admin/investors")).status, 403, "members cannot open the desk");
  const desk = await admin.get("/api/admin/investors");
  const row = desk.json.investors.find((i: any) => i.id === id);
  assert.equal(row.status, "applied");
  assert.equal(row.pledge_usd, 75_000);
  assert.equal(row.email, EMAIL);
  assert.equal(row.statement, null, "no share before the capital is verified");
  const mine = await investor.get("/api/account/investor");
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.json.stakes, [], "an application is not a stake");
});

test("invest: verified capital earns its share of paid AXTO orders only", async () => {
  const before = new Date(Date.now() - 86_400_000).toISOString();
  d1(`INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, gateway, status, meta, created_at, paid_at) VALUES ${order(`ord_inv_old_${RUN}`, 9999, before)}`);
  const v = await admin.post("/api/admin/investors", { action: "verify", id, capital: "100000", method: "wire" });
  assert.equal(v.status, 200, v.text);
  assert.equal((await admin.post("/api/admin/investors", { action: "verify", id, capital: "1" })).status, 400, "verified once");
  // Paid after the verification but never in the future: a stamp ahead of the
  // clock could still lie beyond the moment the next test returns the capital.
  await new Promise((r) => setTimeout(r, 20));
  const after = new Date().toISOString();
  d1(`INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, gateway, status, meta, created_at, paid_at) VALUES
      ${order(`ord_inv_a_${RUN}`, 1000, after)}, ${order(`ord_inv_b_${RUN}`, 3000, after)},
      ${order(`ord_inv_test_${RUN}`, 5000, after, "pro", "sandbox")}, ${order(`ord_inv_acq_${RUN}`, 10_000_000, after, "acquisition")}`);

  const mine = await investor.get("/api/account/investor");
  assert.equal(mine.status, 200, mine.text);
  assert.equal(mine.json.stakes.length, 1);
  const st = mine.json.stakes[0].statement;
  assert.equal(st.share, 0.015, "US$100k of a US$2M round × 30 % = 1.5 %");
  assert.equal(st.totalRevenueUsd, 4000, "earlier, sandbox and acquisition orders never count");
  assert.equal(st.totalDueUsd, 60);
  assert.equal(st.balanceUsd, 60);
  assert.ok(!JSON.stringify(mine.json).includes("customer-"), "no customer data in the statement");

  const period = st.months[0].period;
  const p = await admin.post("/api/admin/investors", { action: "payout", id, period, amount: "60", reference: `WIRE-${RUN}` });
  assert.equal(p.status, 200, p.text);
  assert.equal((await admin.post("/api/admin/investors", { action: "payout", id, period: "2026-13", amount: "1" })).status, 400);
  const paid = (await investor.get("/api/account/investor")).json.stakes[0].statement;
  assert.deepEqual([paid.totalPaidUsd, paid.balanceUsd], [60, 0]);
  const desk = await admin.get("/api/admin/investors");
  assert.ok(desk.json.raisedUsd >= 100_000);
  const audit = d1(`SELECT action FROM audit_log WHERE entity_id = '${id}' ORDER BY created_at`).map((r) => r.action);
  for (const a of ["invest.apply", "admin.investor.verify", "admin.investor.payout"]) assert.ok(audit.includes(a), `audit has ${a}`);
});

test("invest: returned capital ends the share; paused and closed rounds refuse applications", async () => {
  const r = await admin.post("/api/admin/investors", { action: "returned", id, note: `Returned at acquisition ${RUN}` });
  assert.equal(r.status, 200, r.text);
  d1(`INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, gateway, status, meta, created_at, paid_at) VALUES ${order(`ord_inv_late_${RUN}`, 7000, new Date(Date.now() + 5_000).toISOString())}`);
  const stake = (await investor.get("/api/account/investor")).json.stakes[0];
  assert.equal(stake.status, "returned");
  assert.equal(stake.statement.totalRevenueUsd, 4000, "nothing after the capital was returned");

  const g = await admin.get("/api/admin/investors");
  for (const status of ["paused", "closed"]) {
    assert.equal((await admin.put("/api/admin/investors", { settings: { ...g.json.settings, status } })).status, 200);
    assert.equal((await anon.get("/api/invest")).json.status, status);
    const a = await new Client().post("/api/invest/apply", { name: "Late", email: `late-${RUN}@example.com`, amount: "50000", ack: true });
    assert.equal(a.status, 409);
    assert.equal(a.json.code, status);
  }
});
