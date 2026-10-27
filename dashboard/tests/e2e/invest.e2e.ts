/* ==============================================================================
 * AXTO — the AXTO-only investor round end to end on the LOCAL runtime:
 *   shown by default; hidden by the admin (§26.4: no page, no footer link, no
 *   sitemap entry, no public API, no applications, no member menu item) → shown again
 *   (audited) → public terms + page + sitemap → application errors (min, ack,
 *   e-mail) → an application (WhatsApp only after applying) → admin verifies
 *   the capital → paid AXTO orders after that day count, sandbox / acquisition
 *   / earlier ones never do → the investor's own statement → a payout nets the
 *   month → capital returned ends the share → paused / closed rounds refuse
 *   applications → hidden again, an investor keeps the menu item and the
 *   statement. No bank details anywhere on the public side.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { auditFor, createOrder } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
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
const order = (id: string, amount: number, paidAt: string, plan = "pro", env = "live") => createOrder({
  id, user_id: `u-${RUN}`, email: `customer-${RUN}@example.com`, plan, cycle: "monthly", amount_usd: amount, gateway: "paypal", status: "paid",
  meta: JSON.stringify({ env }), created_at: paidAt, paid_at: paidAt,
});

const admin = new Client(), investor = new Client(), anon = new Client();
const EMAIL = `investor-${RUN}@example.com`;
let saved: any = null, id = "";

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/investors");
  assert.equal(g.status, 200, g.text);
  saved = g.json.settings;
  assert.equal(g.json.defaults.visible, true, "the round is shown by default (owner, 27 Oct 2026)");
  const r = await admin.put("/api/admin/investors", { settings: { ...g.json.defaults, status: "open" } });
  assert.equal(r.status, 200, r.text);
  const h = await admin.put("/api/admin/investors", { visible: false });
  assert.equal(h.status, 200, h.text);
  const s = await investor.post("/api/auth/register", { email: EMAIL, name: "Investor " + RUN, password: "Investor-Pass-2026", acceptTerms: true });
  assert.equal(s.status, 200, s.text);
});
after(async () => {
  if (saved) {
    await admin.put("/api/admin/investors", { settings: saved });
    await admin.put("/api/admin/investors", { visible: saved.visible === true });
  }
});

test("invest: hidden — no page, no footer link, no sitemap entry, no API, no applications, no menu item", async () => {
  const r = await anon.get("/api/invest");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { visible: false }, "nothing about the round while it is hidden");
  const page = await anon.get("/invest");
  assert.equal(page.status, 404, "/invest is a 404 while hidden");
  assert.match(page.text, /<meta name="robots" content="noindex/);
  assert.ok(!page.text.includes("AXTO, and only AXTO"), "none of the offer is rendered");
  const home = await anon.get("/");
  assert.equal(home.status, 200);
  assert.ok(!/href="\/invest"/.test(home.text), "no footer link");
  const map = await anon.get("/sitemap.xml");
  assert.equal(map.status, 200);
  assert.match(map.text, /<loc>[^<]*\/pricing<\/loc>/, "the sitemap still lists the site");
  assert.ok(!/\/invest<\/loc>/.test(map.text), "no sitemap entry");
  const a = await new Client().post("/api/invest/apply", { name: "Early", email: `early-${RUN}@example.com`, amount: "50000", ack: true });
  assert.equal(a.status, 404);
  assert.equal(a.json.code, "hidden");
  const me = await investor.get("/api/auth/me");
  assert.equal(me.status, 200, me.text);
  assert.equal(me.json.investor, false, "no Investment menu item for a member without a record");
  const mine = await investor.get("/api/account/investor");
  assert.equal(mine.json.offer.visible, false);

  assert.equal((await investor.put("/api/admin/investors", { visible: true })).status, 403, "members cannot switch it on");
  const show = await admin.put("/api/admin/investors", { visible: true });
  assert.equal(show.status, 200, show.text);
  assert.equal(show.json.settings.visible, true);
  const audit = (await auditFor("platform_config", "invest_offer")).map((x: any) => [x.action, JSON.stringify(x.metadata ?? "")]);
  assert.ok(audit.some(([action, meta]: any) => action === "admin.invest_visibility" && /visible\\?":true/.test(meta)), "showing the round is audited");
  // Saving the terms never flips the switch.
  const g = await admin.get("/api/admin/investors");
  const terms = await admin.put("/api/admin/investors", { settings: { ...g.json.settings, visible: false } });
  assert.equal(terms.json.settings.visible, true);
  assert.equal((await investor.get("/api/auth/me")).json.investor, true, "the menu item appears while shown");
});

test("invest: public terms, the page and the sitemap while shown", async () => {
  const r = await anon.get("/api/invest");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.visible, true);
  assert.deepEqual([r.json.status, r.json.targetUsd, r.json.minUsd, r.json.poolPct], ["open", 2_000_000, 50_000, 30]);
  assert.ok(!("whatsapp" in r.json), "the WhatsApp number is given only after applying");
  const page = await anon.get("/invest");
  assert.equal(page.status, 200);
  assert.match(page.text, /Invest in AXTO/);
  assert.match(page.text, /AXTO, and only AXTO/);
  assert.match(page.text, /"@type":"FAQPage"/);
  for (const secret of ["2090571495", "2090571484", "BNINIDJA"]) assert.ok(!page.text.includes(secret), `no ${secret} on /invest`);
  assert.match(page.text, /<link rel="canonical" href="[^"]*\/invest"/);
  assert.ok(!/<meta name="robots" content="noindex/.test(page.text), "indexable while shown");
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
  await order(`ord_inv_old_${RUN}`, 9999, before);
  const v = await admin.post("/api/admin/investors", { action: "verify", id, capital: "100000", method: "wire" });
  assert.equal(v.status, 200, v.text);
  assert.equal((await admin.post("/api/admin/investors", { action: "verify", id, capital: "1" })).status, 400, "verified once");
  // Paid after the verification but never in the future: a stamp ahead of the
  // clock could still lie beyond the moment the next test returns the capital.
  await new Promise((r) => setTimeout(r, 20));
  const after = new Date().toISOString();
  await Promise.all([
    order(`ord_inv_a_${RUN}`, 1000, after), order(`ord_inv_b_${RUN}`, 3000, after),
    order(`ord_inv_test_${RUN}`, 5000, after, "pro", "sandbox"), order(`ord_inv_acq_${RUN}`, 10_000_000, after, "acquisition"),
  ]);

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
  const audit = (await auditFor("investor", id)).map((r: any) => r.action);
  for (const a of ["invest.apply", "admin.investor.verify", "admin.investor.payout"]) assert.ok(audit.includes(a), `audit has ${a}`);
});

test("invest: returned capital ends the share; paused and closed rounds refuse applications", async () => {
  const r = await admin.post("/api/admin/investors", { action: "returned", id, note: `Returned at acquisition ${RUN}` });
  assert.equal(r.status, 200, r.text);
  await order(`ord_inv_late_${RUN}`, 7000, new Date(Date.now() + 5_000).toISOString());
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

test("invest: hidden again — investors keep their menu item and statement, nobody else sees the round", async () => {
  const hide = await admin.put("/api/admin/investors", { visible: false });
  assert.equal(hide.status, 200, hide.text);
  assert.equal((await anon.get("/invest")).status, 404);
  assert.ok(!/\/invest<\/loc>/.test((await anon.get("/sitemap.xml")).text));
  assert.equal((await investor.get("/api/auth/me")).json.investor, true, "an investor still finds their statement");
  assert.equal((await investor.get("/api/account/investor")).json.stakes.length, 1);
  const other = new Client();
  const s = await other.post("/api/auth/register", { email: `other-${RUN}@example.com`, name: "Other " + RUN, password: "Other-Pass-2026", acceptTerms: true });
  assert.equal(s.status, 200, s.text);
  assert.equal((await other.get("/api/auth/me")).json.investor, false);
  const audit = (await auditFor("platform_config", "invest_offer")).map((x: any) => [x.action, JSON.stringify(x.metadata ?? "")]);
  assert.ok(audit.some(([action, meta]) => action === "admin.invest_visibility" && /visible\\?":false/.test(meta)), "hiding the round is audited");
});
