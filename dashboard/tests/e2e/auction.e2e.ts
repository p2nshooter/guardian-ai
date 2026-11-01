/* ==============================================================================
 * AXTO — the licence auction end to end on the LOCAL runtime (§26.5):
 *   the tick opens this auction's lots (every package by default; Friday 07:00
 *   WIB = 00:00 UTC; 25 % opening, every bid +10 % of the opening bid) → a
 *   signed-in member bids once they chose a filtered display name (no code) → bids are
 *   validated, create-once, outbid e-mail, anti-snipe → the lot closes to the
 *   top bidder → the win stays unpaid and listed as such until the winner pays,
 *   at the winning bid, through the normal checkout; a bank transfer needs the
 *   screenshot and the admin's approval → only payment issues the licence and
 *   marks the lot sold → the winner's chosen name is public, nothing else → the
 *   admin hands an unpaid win on by hand, or automatically when switched on
 *   → admin settings, opening a package, cancelling, the audit log.
 * Times are moved with the test-only data endpoint, so the run works on any day.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { auditFor, doc, list, mails, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.71.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
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

const admin = new Client(), ada = new Client(), ben = new Client(), anon = new Client();
const ADA = `ada-${RUN}@example.com`, BEN = `ben-${RUN}@example.com`;
const LOT_A = "edition:lite:yearly", LOT_B = "edition:vault_starter:yearly";
let saved: any = null, lotA = "", lotB = "";
const me = (c: Client, b: Record<string, unknown>) => c.post("/api/account/auction", b);
const iso = (ms: number) => new Date(ms).toISOString();

/** A signed-in member becomes a bidder by choosing the name shown on a win — no e-mailed code (§27.7). */
async function join(c: Client, name: string) {
  const n = await me(c, { action: "name", displayName: name });
  assert.equal(n.status, 200, n.text);
}
/** Make a lot biddable now, whatever day the suite runs on. */
const live = (id: string, endsInMs = 3 * 86_400_000) => update("auctionLots", id, { starts_at: iso(Date.now() - 60_000), ends_at: iso(Date.now() + endsInMs) });

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/auctions");
  assert.equal(g.status, 200, g.text);
  saved = g.json.settings;
  assert.equal(g.json.defaults.openPct, 25);
  assert.equal(g.json.defaults.packages.length, 103);
  // The normal checkout's bank transfer, so a win can be paid in the test.
  assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", credentials: { instructions: "Bank Test 123" }, is_active: true })).status, 200);
  for (const [c, email] of [[ada, ADA], [ben, BEN]] as const) {
    const r = await c.post("/api/auth/register", { email, name: email.split("@")[0], password: "Auction-Pass-2026", acceptTerms: true });
    assert.equal(r.status, 200, r.text);
  }
});
after(async () => { if (saved) await admin.put("/api/admin/auctions", { settings: saved }); });

test("auction: every package by default; the tick opens one lot per package at 25 % of the normal price, ending Friday 07:00 WIB", async () => {
  const g = await admin.get("/api/admin/auctions");
  assert.equal(g.json.defaults.packages.length, 103, "every package (owner, 27 Oct 2026)");
  const put = await admin.put("/api/admin/auctions", { settings: { ...saved, enabled: true, packages: [LOT_A, LOT_B] } });
  assert.equal(put.status, 200, put.text);
  const tick = await admin.post("/api/admin/auctions", { action: "tick" });
  assert.equal(tick.status, 200, tick.text);
  const lots = await list("auctionLots", "all", "all");
  const a = lots.find((l) => l.pkg === LOT_A && l.status === "open");
  const b = lots.find((l) => l.pkg === LOT_B && l.status === "open");
  assert.ok(a && b, "both packages have a lot");
  lotA = a.id; lotB = b.id;
  assert.equal(a.normal_usd, 99);
  assert.equal(a.open_usd, 25, "25 % of $99, rounded up");
  assert.equal(a.step_usd, 3, "10 % of the $25 opening bid, rounded up");
  const end = new Date(a.ends_at);
  assert.deepEqual([end.getUTCDay(), end.getUTCHours(), end.getUTCMinutes()], [5, 0, 0], "Friday 00:00 UTC");
  assert.equal(end.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "long", hour: "2-digit", minute: "2-digit" }), "Friday 07:00", "= Friday 07:00 WIB");
  // A second tick never opens a lot twice.
  await admin.post("/api/admin/auctions", { action: "tick" });
  assert.equal((await list("auctionLots", "all", "all")).filter((l: any) => l.pkg === LOT_A && l.cycle === a.cycle).length, 1);
  const desk = await admin.get(`/api/admin/auctions?cycle=${a.cycle}`);
  assert.ok(desk.json.lots.some((l: any) => l.id === lotA && l.title && l.status === "open"), "the desk lists the auction from the index summaries");
  assert.ok((await auditFor("auction_cycle", a.cycle)).some((x: any) => x.action === "auction.lots_opened"), "one audit entry per batch of lots opened");
  await live(lotA); await live(lotB);

  const page = await anon.get("/auction");
  assert.equal(page.status, 200);
  assert.match(page.text, /Licence auction/);
  assert.match(page.text, /"@type":"FAQPage"/);
  assert.match(page.text, /<link rel="canonical" href="[^"]*\/auction"/);
  assert.match((await anon.get("/sitemap.xml")).text, /\/auction<\/loc>/);
  assert.match((await anon.get("/")).text, /href="\/auction"/, "linked from the footer");
});

test("auction: a signed-in member bids once they have chosen a clean display name — no e-mailed code", async () => {
  assert.equal((await new Client().post("/api/account/auction", { action: "bid", lot: lotA, amount: 300 })).status, 401, "signed out");
  const early = await me(ada, { action: "bid", lot: lotA, amount: 300 });
  assert.equal(early.status, 409);
  assert.equal(early.json.code, "not_verified", "a name first");
  assert.equal((await me(admin, { action: "bid", lot: lotA, amount: 300 })).json.code, "admin", "admins run the auction");
  assert.equal((await admin.get("/api/account/auction")).json.bidder.admin, true, "the page tells an admin they do not bid");
  assert.equal((await me(ada, { action: "send_code" })).status, 400, "there is no code step any more");
  for (const [bad, code] of [["Google Partner", "brand"], ["Fuck Corp", "abuse"], ["ada@example.com", "contact"], ["A", "length"]] as const) {
    assert.equal((await me(ada, { action: "name", displayName: bad })).json.code, code, bad);
  }
  const before = (await mails(ADA)).length;
  assert.equal((await me(ada, { action: "name", displayName: "Ada Labs" })).json.displayName, "Ada Labs");
  assert.equal((await mails(ADA)).length, before, "no e-mail is needed to start bidding");
  await join(ben, "Ben & Partners");
  const board = await ada.get("/api/account/auction");
  assert.equal(board.status, 200, board.text);
  assert.equal(board.json.bidder.verified, true);
  assert.equal(board.json.bidder.admin, false);
  assert.equal(board.json.bidder.displayName, "Ada Labs");
});

test("auction: every bid is exactly +10 % of the opening bid; outbid bidders are told; a late bid extends the lot", async () => {
  // $99 normal (Asia prices, REQUESTS 140) → opening $25 (25 %) → every bid +$3 (10 % of $25, rounded up).
  assert.equal((await me(ada, { action: "bid", lot: lotA, amount: 24 })).json.code, "too_low");
  assert.equal((await me(ada, { action: "bid", lot: lotA, amount: 27 })).json.code, "not_next", "the first bid is the opening bid");
  const first = await me(ada, { action: "bid", lot: lotA, amount: 25 });
  assert.equal(first.status, 200, first.text);
  assert.equal(first.json.seq, 1);
  assert.equal((await me(ada, { action: "bid", lot: lotA, amount: 28 })).json.code, "already_highest");
  assert.equal((await me(ben, { action: "bid", lot: lotA, amount: 26 })).json.code, "not_next", "not a step of 10 % of the opening bid");
  assert.equal((await me(ben, { action: "bid", lot: lotA, amount: 31 })).json.code, "not_next", "one step at a time");
  assert.equal((await me(ben, { action: "bid", lot: lotA, amount: 100 })).json.code, "too_high", "never above the normal price");
  assert.equal((await me(ben, { action: "bid", lot: lotA, amount: 28 })).status, 200);
  assert.ok((await mails(ADA)).some((m) => /outbid/i.test(m.subject)), "Ada is told she was outbid");

  // Two bids at the same moment: the compare-and-swap lets exactly one take each step.
  const [x, y] = await Promise.all([me(ada, { action: "bid", lot: lotA, amount: 31 }), me(ada, { action: "bid", lot: lotA, amount: 31 })]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409]);
  const bids = await list("auctionBids", "lot", lotA);
  assert.deepEqual(bids.map((b: any) => b.amount_usd), [31, 28, 25], "highest first, each bid stored once");
  assert.equal(bids[0].id, `${lotA}.000003`);

  // Anti-snipe: with two minutes left, a bid moves the end to five minutes after it.
  await live(lotA, 2 * 60_000);
  const late = await me(ben, { action: "bid", lot: lotA, amount: 34 });
  assert.equal(late.status, 200, late.text);
  assert.equal(late.json.extended, true);
  assert.ok(Date.parse(late.json.endsAt) - Date.now() > 4 * 60_000, "extended to ~5 minutes");
  assert.equal((await me(ada, { action: "bid", lot: lotA, amount: 37 })).status, 200);

  const pub = await anon.get("/api/auction");
  assert.equal(pub.status, 200);
  const l = pub.json.lots.find((z: any) => z.id === lotA);
  assert.deepEqual([l.highUsd, l.bidsCount, l.nextMinUsd, l.stepUsd], [37, 5, 40, 3]);
  assert.equal(l.leader, "A•••••", "the leader is masked");
  assert.ok(!pub.text.includes("@"), "no e-mail address in public");
  assert.ok(!pub.text.includes("Ada Labs"), "no bidder name before the win");
  assert.ok((await auditFor("auction_lot", lotA)).filter((a: any) => a.action === "auction.bid").length >= 5);
});

test("auction: an unpaid winner gets no licence and is listed as not paid yet; a bank transfer needs the screenshot and the admin's approval", async () => {
  await update("auctionLots", lotA, { ends_at: iso(Date.now() - 1000) });
  assert.equal((await admin.post("/api/admin/auctions", { action: "tick" })).status, 200);
  const closed = await doc("auctionLots", lotA);
  assert.equal(closed.status, "awaiting_payment");
  assert.deepEqual([closed.winner_name, closed.winner_usd, closed.winner_email], ["Ada Labs", 37, ADA]);
  assert.ok((await mails(ADA)).some((m) => /You won/.test(m.subject)));
  assert.equal((await me(ben, { action: "bid", lot: lotA, amount: 373 })).json.code, "closed");

  // Won, not paid: no licence, and the winner is public as "not paid yet".
  const user = await userByEmail(ADA);
  assert.equal(user.id, closed.winner_user);
  assert.ok(!(await list("shLicenses", "user", user.id)).some((x: any) => x.product === "guardian"), "no licence before payment");
  let pub = await anon.get("/api/auction");
  const unpaid = pub.json.winners.find((w: any) => w.name === "Ada Labs");
  assert.ok(unpaid, "an unpaid winner stays listed");
  assert.equal(unpaid.paid, false);
  assert.ok(!pub.text.includes(ADA));
  // Even past the time she was asked to pay in, the win stays hers (no automatic hand-over by default).
  await update("auctionLots", lotA, { pay_by: iso(Date.now() - 1000) });
  await admin.post("/api/admin/auctions", { action: "tick" });
  assert.deepEqual([(await doc("auctionLots", lotA)).status, (await doc("auctionLots", lotA)).winner_name], ["awaiting_payment", "Ada Labs"]);

  assert.equal((await ben.post("/api/billing/checkout", { kind: "auction", lot: lotA, gateway: "manual" })).status, 409, "not Ben's to pay");
  const c = await ada.post("/api/billing/checkout", { kind: "auction", lot: lotA, gateway: "manual", amount: 1 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.amountUsd, 37, "the winning bid, never the browser's amount");
  const order = await doc("orders", c.json.orderId);
  assert.deepEqual([order.plan, order.cycle, order.amount_usd], ["edition", "yearly", 37]);
  assert.equal(JSON.parse(order.meta).auction.lot, lotA);
  assert.equal(JSON.parse(order.meta).edition.code, "lite");
  assert.equal((await doc("auctionLots", lotA)).order_id, c.json.orderId);

  // Manual payment: the screenshot is required, and only then can the admin approve it.
  const refOnly = await ada.post(`/api/billing/orders/${c.json.orderId}`, { action: "bank_proof", reference: `BNI ${RUN}` });
  assert.equal(refOnly.status, 400);
  assert.equal(refOnly.json.code, "receipt_required");
  const early = await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId });
  assert.equal(early.status, 400, "no approval without the screenshot");
  assert.equal(early.json.code, "receipt_required");
  assert.equal((await doc("orders", c.json.orderId)).status, "pending");
  const fd = new FormData();
  fd.set("action", "bank_proof");
  fd.set("reference", `BNI ${RUN}`);
  fd.set("receipt", new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(0)])], { type: "image/png" }), "transfer.png");
  const up = await fetch(`${BASE}/api/billing/orders/${c.json.orderId}`, { method: "POST", headers: { Cookie: ada.cookie, "cf-connecting-ip": ada.ip }, body: fd });
  assert.equal(up.status, 200, await up.text());
  assert.ok(!(await list("shLicenses", "user", user.id)).some((x: any) => x.product === "guardian"), "still no licence while the admin has not approved");

  const paid = await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId, note: `auction ${RUN}` });
  assert.equal(paid.status, 200, paid.text);
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 400, "paid once");
  const sold = await doc("auctionLots", lotA);
  assert.equal(sold.status, "sold");
  assert.equal(sold.order_id, c.json.orderId);
  const lic = (await list("shLicenses", "user", user.id)).find((x: any) => x.product === "guardian");
  assert.ok(lic, "the Guardian licence was sent the moment the payment was approved");
  assert.equal(lic.package_code, "lite");
  assert.equal(lic.status, "active");
  const audit = (await auditFor("auction_lot", lotA)).map((a: any) => a.action);
  for (const a of ["auction.closed", "auction.sold"]) assert.ok(audit.includes(a), a);

  // Paid now — and the chosen name follows the winner.
  pub = await anon.get("/api/auction");
  assert.ok(pub.json.winners.some((w: any) => w.name === "Ada Labs" && w.paid === true && w.amountUsd === 37 && /Sentinel Lite/.test(w.title)));
  assert.equal((await me(ada, { action: "name", displayName: "Ada Labs Pte Ltd" })).status, 200);
  pub = await anon.get("/api/auction");
  assert.ok(pub.json.winners.some((w: any) => w.name === "Ada Labs Pte Ltd" && w.paid));
  const mine = await ada.get("/api/account/auction");
  assert.ok(mine.json.wins.some((w: any) => w.id === lotA && w.status === "sold"));
  const desk = await admin.get("/api/admin/auctions");
  assert.ok(desk.json.winners.some((w: any) => w.id === lotA && w.status === "sold" && w.winner_email === ADA), "the admin portal lists the winner");
});

test("auction: the admin can hand an unpaid win to the next bidder — by hand, or automatically when switched on", async () => {
  // $499 → opening $125, every bid +$13.
  assert.equal((await me(ada, { action: "bid", lot: lotB, amount: 125 })).status, 200);
  assert.equal((await me(ben, { action: "bid", lot: lotB, amount: 138 })).status, 200);
  await update("auctionLots", lotB, { ends_at: iso(Date.now() - 1000) });
  await admin.post("/api/admin/auctions", { action: "tick" });
  assert.equal((await doc("auctionLots", lotB)).winner_name, "Ben & Partners");
  const bo = await ben.post("/api/billing/checkout", { kind: "auction", lot: lotB, gateway: "manual" });
  assert.equal(bo.status, 200, bo.text);
  const desk = await admin.get("/api/admin/auctions");
  assert.ok(desk.json.awaiting.some((l: any) => l.id === lotB && l.winner_name === "Ben & Partners"), "listed as not paid yet on the desk");
  assert.ok((await anon.get("/api/auction")).json.winners.some((w: any) => w.name === "Ben & Partners" && w.paid === false));

  // Switched on: past the time to pay, the lot passes to the next bidder at her own bid; his order is cancelled.
  const cur = (await admin.get("/api/admin/auctions")).json.settings;
  assert.equal((await admin.put("/api/admin/auctions", { settings: { ...cur, autoPass: true } })).status, 200);
  await update("auctionLots", lotB, { pay_by: iso(Date.now() - 1000) });
  await admin.post("/api/admin/auctions", { action: "tick" });
  const passed = await doc("auctionLots", lotB);
  assert.equal(passed.status, "awaiting_payment");
  assert.deepEqual([passed.winner_name, passed.winner_usd], ["Ada Labs Pte Ltd", 125], "the next bidder, at her own bid");
  assert.equal(passed.passed.length, 1);
  assert.equal((await doc("orders", bo.json.orderId)).status, "canceled", "Ben's unpaid order is cancelled");
  assert.equal((await ben.post("/api/billing/checkout", { kind: "auction", lot: lotB, gateway: "manual" })).status, 409);
  assert.equal((await admin.put("/api/admin/auctions", { settings: { ...cur, autoPass: false } })).status, 200);

  // By hand: nobody left, the lot ends unsold.
  const pass = await admin.post("/api/admin/auctions", { action: "pass", lot: lotB });
  assert.equal(pass.status, 200, pass.text);
  assert.equal((await doc("auctionLots", lotB)).status, "unsold");
  assert.ok((await auditFor("auction_lot", lotB)).some((a: any) => a.action === "auction.passed"));
});

test("auction: admin opens a package now, cancels a lot; members cannot reach the desk", async () => {
  assert.equal((await ada.get("/api/admin/auctions")).status, 403);
  assert.equal((await ada.put("/api/admin/auctions", { settings: { enabled: false } })).status, 403);
  const o = await admin.post("/api/admin/auctions", { action: "open", pkg: "lifetime:app:studio:1" });
  assert.equal(o.status, 200, o.text);
  assert.equal(o.json.lot.normal_usd, 24_900);
  assert.equal(o.json.lot.open_usd, 6_225);
  assert.equal((await admin.post("/api/admin/auctions", { action: "open", pkg: "lifetime:app:studio:1" })).status, 400, "once per auction");
  const x = await admin.post("/api/admin/auctions", { action: "cancel", lot: o.json.lot.id, note: `test ${RUN}` });
  assert.equal(x.status, 200, x.text);
  assert.equal(x.json.lot.status, "cancelled");
  assert.equal((await admin.post("/api/admin/auctions", { action: "cancel", lot: lotA })).status, 400, "a sold lot is refunded, not cancelled");
  const bids = await admin.get(`/api/admin/auctions?lot=${lotA}`);
  assert.equal(bids.json.bids.length, 5);
  assert.ok(bids.json.bids.every((b: any) => b.email), "the desk sees who bid");
  const cfg = (await auditFor("platform_config", "auction_settings")).map((a: any) => a.action);
  assert.ok(cfg.includes("admin.auction_settings"));
  assert.ok((await auditFor("auction_lot", o.json.lot.id)).some((a: any) => a.action === "admin.auction.cancel"));
});
