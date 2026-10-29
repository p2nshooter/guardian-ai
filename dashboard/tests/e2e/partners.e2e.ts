/* ==============================================================================
 * AXTO — the partner programmes end to end on the LOCAL runtime
 * (docs/BUSINESS-MASTER-BLUEPRINT.md §3, §7.1, §7.4, §9, §11 P1–P2):
 *   all three shown by default → the hub, the three pages, the sitemap, llms.txt and
 *   the chat's knowledge carry them → hidden by the admin: a noindex 404, gone from
 *   the hub, the sitemap, llms.txt, the public API and the chat; the link stops
 *   tracking; all hidden → no hub → shown again (audited).
 *   Affiliate: join (terms recorded) → link → a visitor's click → sign-up tied once,
 *   never to oneself → a paid order → a held commission → the refund window ends →
 *   the month's payout waits for one approval → the destination revealed (audited)
 *   → paid → the affiliate sees it → a refund afterwards is clawed back.
 *   Applications: reseller and white label, once per member, refused when closed,
 *   marked by the admin.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { auditByAction, createOrder, doc, knowledge, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookies = new Map<string, string>(); ip = `10.71.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  get cookie() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "); }
  set cookie(v: string) { this.cookies.clear(); for (const part of v.split(/;\s*/)) { const i = part.indexOf("="); if (i > 0) this.cookies.set(part.slice(0, i), part.slice(i + 1)); } }
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookies.size ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const m = c.match(/^([^=]+)=([^;]*)/);
      if (m) { if (m[2]) this.cookies.set(m[1]!, m[2]); else this.cookies.delete(m[1]!); }
    }
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}

const admin = new Client(), anon = new Client(), aff = new Client(), visitor = new Client(), twin = new Client(), partner = new Client();
const AFF_EMAIL = `aff-${RUN}@example.com`;
const PAYPAL = `aff-pay-${RUN}@example.com`;
let saved: any = null;
let code = "";

const setPrograms = async (patch: Record<string, unknown>) => {
  const g = await admin.get("/api/admin/programs");
  assert.equal(g.status, 200, g.text);
  const cur = g.json.programs;
  const next: any = { ...cur };
  for (const [id, v] of Object.entries(patch)) next[id] = { ...cur[id], ...(v as object) };
  const r = await admin.put("/api/admin/programs", { programs: next });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const register = async (c: Client, email: string, name: string) => {
  const r = await c.post("/api/auth/register", { email, name, password: "Partner-Pass-2026", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
};

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/programs");
  assert.equal(g.status, 200, g.text);
  saved = g.json.programs;
  for (const id of ["affiliate", "reseller", "whitelabel"]) assert.equal(g.json.defaults[id].visible, true, `${id} is shown by default (owner, 29 Oct 2026)`);
  // A known starting point: everything shown and open, the blueprint's numbers, PayPal payouts by hand.
  const d = g.json.defaults;
  const r = await admin.put("/api/admin/programs", { programs: { ...d, affiliate: { ...d.affiliate, paypalPayouts: false } } });
  assert.equal(r.status, 200, r.text);
});
after(async () => {
  if (saved) await admin.put("/api/admin/programs", { programs: saved });
});

test("programmes: all shown — hub, pages, sitemap, llms.txt, public API and the chat's knowledge", async () => {
  const api = await anon.get("/api/programs");
  assert.equal(api.status, 200, api.text);
  assert.equal(api.json.any, true);
  assert.ok(api.json.programs.affiliate && api.json.programs.reseller && api.json.programs.whitelabel);
  assert.equal(api.json.programs.affiliate.commissionPct, 20);
  assert.equal(api.json.programs.whitelabel.entryUsd, 150_000);
  assert.ok(!("aiMarkup" in api.json.programs.whitelabel) && !("reviewAboveUsd" in api.json.programs.affiliate), "internal numbers never reach the public");
  const hub = await anon.get("/partners");
  assert.equal(hub.status, 200);
  for (const t of ["partners-card-affiliate", "partners-card-reseller", "partners-card-whitelabel"]) assert.ok(hub.text.includes(t), t);
  assert.match(hub.text, /application\/ld\+json/);
  for (const [path, marker] of [["/affiliate", "affiliate-terms"], ["/resellers", "reseller-terms"], ["/white-label", "whitelabel-terms"]]) {
    const p = await anon.get(path!);
    assert.equal(p.status, 200, path);
    assert.ok(p.text.includes(marker!), `${path} renders its terms`);
    assert.match(p.text, new RegExp(`<link rel="canonical" href="[^"]*${path}"`), `${path} canonical`);
  }
  const wl = await anon.get("/white-label");
  assert.ok(wl.text.includes("$150,000"), "the white-label entry fee from Admin");
  const gain = (350 * api.json.proMonthlyUsd * 12 * 50) / 100;
  assert.ok(wl.text.includes(`$${gain.toLocaleString("en-US")}`), "the worked example: 350 Pro clients × list price × 12 × 50%");
  const sm = await anon.get("/sitemap.xml");
  for (const p of ["/partners", "/affiliate", "/resellers", "/white-label"]) assert.ok(sm.text.includes(`${p}</loc>`), `sitemap lists ${p}`);
  const llms = await anon.get("/llms.txt");
  assert.match(llms.text, /## Partner programmes/);
  const k = await knowledge();
  assert.match(k, /Affiliate programme/);
  assert.match(k, /White-label programme/);
  assert.ok(!/margin|markup ×|aiMarkup|blueprint/i.test(k), "no company secrets in the chat's knowledge");
});

test("programmes: hidden → noindex 404, gone from hub, sitemap, llms.txt, API and chat; all hidden → no hub", async () => {
  await setPrograms({ whitelabel: { visible: false } });
  const page = await anon.get("/white-label");
  assert.equal(page.status, 404, "a hidden programme's page is a 404");
  assert.match(page.text, /<meta name="robots" content="noindex/);
  assert.ok(!page.text.includes("whitelabel-terms"));
  const hub = await anon.get("/partners");
  assert.equal(hub.status, 200, "the hub stays while another programme is shown");
  assert.ok(!hub.text.includes("partners-card-whitelabel") && hub.text.includes("partners-card-reseller"));
  const sm = await anon.get("/sitemap.xml");
  assert.ok(!sm.text.includes("/white-label</loc>") && sm.text.includes("/resellers</loc>"));
  assert.ok(!(await anon.get("/llms.txt")).text.includes("/white-label"));
  assert.equal((await anon.get("/api/programs")).json.programs.whitelabel, null);
  assert.ok(!/White-label programme/.test(await knowledge()), "the chat no longer knows the hidden programme");
  const audits = await auditByAction("programs.update");
  assert.ok(audits.some((a: any) => String(a.metadata).includes("whitelabel.visible")), "the switch is in the audit log");

  await setPrograms({ affiliate: { visible: false }, reseller: { visible: false } });
  assert.equal((await anon.get("/partners")).status, 404, "every programme hidden: no hub");
  assert.equal((await anon.get("/affiliate")).status, 404);
  assert.equal((await anon.get("/api/programs")).json.any, false);
  assert.ok(!(await anon.get("/sitemap.xml")).text.includes("/partners</loc>"));
  assert.ok(!/Partner programmes/.test(await knowledge()));

  await setPrograms({ affiliate: { visible: true }, reseller: { visible: true }, whitelabel: { visible: true } });
  assert.equal((await anon.get("/partners")).status, 200, "shown again");
  assert.equal((await anon.get("/white-label")).status, 200);
});

test("affiliate: join once, the link, a click, a sign-up tied once and never to oneself", async () => {
  await register(aff, AFF_EMAIL, `Aff ${RUN}`);
  const before = await aff.get("/api/affiliate");
  assert.equal(before.status, 200, before.text);
  assert.equal(before.json.affiliate, null);
  assert.equal(before.json.open, true);
  assert.equal((await aff.post("/api/affiliate", { action: "join", accept: false })).status, 400, "the terms must be accepted");
  const j = await aff.post("/api/affiliate", { action: "join", accept: true });
  assert.equal(j.status, 200, j.text);
  code = j.json.affiliate.code;
  assert.match(code, /^[a-z0-9]{4,16}$/);
  assert.ok(j.json.affiliate.link.endsWith(`/?ref=${code}`));
  const again = await aff.post("/api/affiliate", { action: "join", accept: true });
  assert.equal(again.json.affiliate.code, code, "joining twice keeps the same code");
  assert.equal((await admin.post("/api/affiliate", { action: "join", accept: true })).status, 403, "administrators cannot join");
  assert.equal((await aff.get("/api/auth/me")).json.affiliate, true, "Affiliate is in the member menu");

  // Payout destination: validated, stored encrypted, shown masked; the log never holds it.
  assert.equal((await aff.put("/api/affiliate", { payout: { method: "usdt", usdtAddress: "0xnope" } })).status, 400);
  const pp = await aff.put("/api/affiliate", { payout: { method: "paypal", paypalEmail: PAYPAL } });
  assert.equal(pp.status, 200, pp.text);
  assert.equal(pp.json.affiliate.payoutMethod, "paypal");
  assert.ok(!pp.json.affiliate.payoutLabel.includes(PAYPAL) && pp.json.affiliate.payoutLabel.includes("example.com"), "masked");
  const stored = await doc("affiliates", (await userByEmail(AFF_EMAIL)).id);
  assert.ok(stored.payout_enc && !stored.payout_enc.includes(PAYPAL), "encrypted at rest");
  const logs = await auditByAction("affiliate.payout_set");
  assert.ok(logs.length && !logs.some((a: any) => String(a.metadata).includes(PAYPAL)), "the destination is never logged");

  // A visitor clicks the link, then signs up: tied to the affiliate; the cookie is cleared.
  assert.equal((await visitor.post("/api/ref", { code: "nosuchcode1" })).json.tracked, false);
  const click = await visitor.post("/api/ref", { code });
  assert.equal(click.json.tracked, true, click.text);
  assert.equal(visitor.cookies.get("axto_ref"), code, "the code is remembered in a first-party cookie");
  assert.match(click.headers.get("set-cookie") || "", /HttpOnly/i);
  await register(visitor, `ref-${RUN}@example.com`, `Ref ${RUN}`);
  assert.ok(!visitor.cookies.has("axto_ref"), "the cookie is cleared at sign-up");
  const v = await userByEmail(`ref-${RUN}@example.com`);
  const ref = await doc("referrals", v.id);
  assert.ok(ref && ref.code === code, "the new account is tied to the affiliate");

  // The affiliate's own mailbox under another spelling never counts.
  await twin.post("/api/ref", { code });
  await register(twin, `aff-${RUN}+2@example.com`, `Twin ${RUN}`);
  const tw = await userByEmail(`aff-${RUN}+2@example.com`);
  assert.equal(await doc("referrals", tw.id), null, "a self-referral is never attributed");

  const me = await aff.get("/api/affiliate");
  assert.equal(me.json.stats.referrals, 1);
  assert.ok(me.json.stats.clicks30 >= 2);
  assert.ok(me.json.referrals[0].email.startsWith("r•••@"), "referred members appear only masked");
});

test("affiliate: paid order → held commission → refund window → one approval → paid → clawback on refund", async () => {
  const v = await userByEmail(`ref-${RUN}@example.com`);
  const a = await userByEmail(AFF_EMAIL);
  const orderId = `ord-aff-${RUN}`;
  assert.equal(await createOrder({ id: orderId, user_id: v.id, email: v.email, plan: "pro", cycle: "monthly", amount_usd: 49, gateway: "bank" }), true);
  const paid = await admin.post("/api/admin/orders", { id: orderId, action: "mark_paid", note: "e2e" });
  assert.equal(paid.status, 200, paid.text);
  const cm = await doc("commissions", `cm_${orderId}`);
  assert.ok(cm, "a commission is created when the order is paid");
  assert.equal(cm.affiliate_id, a.id);
  assert.equal(cm.amount_usd, 9.8, "20 % of US$49");
  assert.equal(cm.status, "held", "held for the refund window");
  assert.ok(Date.parse(cm.hold_until) - Date.now() > 29 * 86_400_000);

  // The refund window ends (moved into the past): payable, but under the US$50 minimum nothing is paid yet.
  const past = new Date(Date.now() - 86_400_000).toISOString();
  await update("commissions", `cm_${orderId}`, { hold_until: past });
  const early = await admin.post("/api/admin/affiliates", { action: "run_payouts" });
  assert.equal(early.status, 200, early.text);
  assert.ok(early.json.run.matured >= 1, JSON.stringify(early.json.run));
  assert.equal((await doc("commissions", `cm_${orderId}`)).status, "payable");
  const period = new Date().toISOString().slice(0, 7).replace("-", "");
  assert.equal(await doc("affPayouts", `po_${a.id}_${period}`), null, "below the minimum payout: it rolls over");

  // A second order brings the balance over the minimum; the month's payout is made.
  const order2 = `ord-aff2-${RUN}`;
  await createOrder({ id: order2, user_id: v.id, email: v.email, plan: "business", cycle: "monthly", amount_usd: 299, gateway: "bank" });
  assert.equal((await admin.post("/api/admin/orders", { id: order2, action: "mark_paid" })).status, 200);
  const cm2 = await doc("commissions", `cm_${order2}`);
  assert.equal(cm2.amount_usd, 59.8);
  await update("commissions", `cm_${order2}`, { hold_until: past });
  const run = await admin.post("/api/admin/affiliates", { action: "run_payouts" });
  assert.equal(run.status, 200, run.text);
  assert.ok(run.json.run.payouts >= 1, JSON.stringify(run.json.run));
  const po = await doc("affPayouts", `po_${a.id}_${period}`);
  assert.ok(po, "one payout for the month");
  assert.equal(po.status, "approval", "PayPal Payouts off: it waits for one approval");
  assert.equal(po.amount_usd, 69.6);
  assert.deepEqual([...po.commission_ids].sort(), [`cm_${orderId}`, `cm_${order2}`].sort());
  assert.equal((await admin.post("/api/admin/affiliates", { action: "run_payouts" })).json.run.payouts, 0, "running again makes no second payout");

  const view = await admin.get("/api/admin/affiliates");
  assert.ok(view.json.payouts.approval.some((p: any) => p.id === po.id));
  const rv = await admin.post("/api/admin/affiliates", { action: "reveal_payout", id: a.id });
  assert.equal(rv.status, 200, rv.text);
  assert.equal(rv.json.details.email, PAYPAL, "the destination is decrypted for the owner");
  assert.ok((await auditByAction("affiliate.payout_revealed")).some((x: any) => x.entity_id === a.id), "and the view is audited");
  assert.equal((await aff.post("/api/admin/affiliates", { action: "reveal_payout", id: a.id })).status, 403, "members never reach it");

  const done = await admin.post("/api/admin/affiliates", { action: "payout_paid", id: po.id, reference: `PP-${RUN}` });
  assert.equal(done.status, 200, done.text);
  assert.equal((await doc("affPayouts", po.id)).status, "paid");
  assert.equal((await doc("commissions", `cm_${orderId}`)).status, "paid");
  const me = await aff.get("/api/affiliate");
  assert.equal(me.json.stats.paid, 69.6);
  assert.equal(me.json.payouts[0].status, "paid");

  // A refund after the payout is clawed back from the next one.
  assert.equal((await admin.post("/api/admin/orders", { id: order2, action: "refund", note: "e2e" })).status, 200);
  const cb = await doc("commissions", `cm_${order2}_cb`);
  assert.ok(cb && cb.amount_usd === -59.8 && cb.kind === "clawback" && cb.status === "payable", "a negative clawback waits for the next payout");
});

test("affiliate: suspended links stop earning; the frozen switch pauses payouts", async () => {
  const a = await userByEmail(AFF_EMAIL);
  const s = await admin.post("/api/admin/affiliates", { action: "set_status", id: a.id, status: "suspended", note: "e2e" });
  assert.equal(s.status, 200, s.text);
  assert.equal((await anon.post("/api/ref", { code })).json.tracked, false, "a suspended affiliate's link does not track");
  assert.equal((await aff.get("/api/affiliate")).json.affiliate.status, "suspended");
  await admin.post("/api/admin/affiliates", { action: "set_status", id: a.id, status: "active", note: "" });
  await setPrograms({ affiliate: { frozen: true } });
  assert.equal((await aff.get("/api/affiliate")).json.frozen, true);
  assert.equal((await admin.post("/api/admin/affiliates", { action: "run_payouts" })).json.run.payouts, 0, "frozen: no payouts");
  const nb = new Client();
  await register(nb, `late-${RUN}@example.com`, `Late ${RUN}`);
  assert.equal((await nb.post("/api/affiliate", { action: "join", accept: true })).status, 409, "frozen: nobody joins");
  await setPrograms({ affiliate: { frozen: false } });
});

test("applications: white label and reseller, once per member, closed when not accepting, marked by the admin", async () => {
  assert.equal((await anon.post("/api/partners/apply", { program: "whitelabel" })).status, 401, "signed-in members only");
  await register(partner, `wl-${RUN}@example.com`, `WL ${RUN}`);
  const base = { name: `WL ${RUN}`, company: `Partner ${RUN} GmbH`, country: "Germany", ack: true };
  assert.equal((await partner.post("/api/partners/apply", { ...base, program: "whitelabel", ack: false })).json.code, "ack");
  const a = await partner.post("/api/partners/apply", { ...base, program: "whitelabel", languages: "German", website: "partner.example" });
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.created, true);
  assert.equal((await partner.post("/api/partners/apply", { ...base, program: "whitelabel", company: "Other" })).json.created, false, "one application per programme");
  const mine = await partner.get("/api/partners/apply");
  assert.equal(mine.json.applications.whitelabel.status, "new");
  assert.equal(mine.json.applications.reseller, null);
  await setPrograms({ reseller: { accepting: false } });
  const closed = await partner.post("/api/partners/apply", { ...base, program: "reseller" });
  assert.equal(closed.status, 409);
  assert.equal(closed.json.code, "closed");
  const page = await anon.get("/resellers");
  assert.ok(page.text.includes("not taking new members"), "the page says so");
  await setPrograms({ reseller: { accepting: true } });

  const view = await admin.get("/api/admin/programs");
  const row = view.json.applications.whitelabel.find((x: any) => x.email === `wl-${RUN}@example.com`);
  assert.ok(row && row.company === `Partner ${RUN} GmbH`);
  const m = await admin.post("/api/admin/programs", { action: "application", id: row.id, status: "invited", note: "first wave" });
  assert.equal(m.status, 200, m.text);
  assert.equal((await partner.get("/api/partners/apply")).json.applications.whitelabel.status, "invited");
  assert.ok((await auditByAction("partner.apply")).some((x: any) => x.entity_id === row.id));
  assert.ok((await auditByAction("partner.application")).some((x: any) => x.entity_id === row.id));
});
