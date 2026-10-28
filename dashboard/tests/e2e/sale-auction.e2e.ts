/* ==============================================================================
 * AXTO — the site-sale AUCTION end to end on the LOCAL runtime (BLUEPRINT-V4 §34):
 *   admin opens a round (opening bid in US$10M–100M) → a member registers as a
 *   bidder and waits for approval → the owner approves → bids: too low refused,
 *   the opening bid, a rival outbids, admins cannot bid, the checkout is closed
 *   while the round runs → the round ends (cron tick) → only the winner can pay,
 *   at the winning bid → the owner marks the wire received → the round is sold,
 *   the winner is administrator and the site is sold.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { doc, meta, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.62.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string, h?: Record<string, string>) => this.call("GET", p, undefined, h);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}
async function signUp(c: Client, email: string, name: string) {
  const r = await c.post("/api/auth/register", { email, name, password: "Bidder-Pass-2026", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
}
const tick = () => new Client().get("/api/cron/tick", { "x-cron-secret": "e2e-cron-secret" });

const admin = new Client(), ava = new Client(), ben = new Client(), anon = new Client();
const AVA = `ava-${RUN}@example.com`, BEN = `ben-${RUN}@example.com`;
const OPEN = 25_000_000;
let saved: any = null, roundId = "";

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/acquisition");
  assert.equal(g.status, 200, g.text);
  saved = g.json.settings;
  // Any round left by an earlier file is cancelled, so this run starts its own.
  const cur = g.json.auction.round;
  if (cur && (cur.status === "open" || cur.status === "awaiting_payment")) await admin.post("/api/admin/acquisition", { action: "cancel_round", id: cur.id, note: "e2e reset" });
  const r = await admin.put("/api/admin/acquisition", { settings: { ...g.json.defaults, status: "open", mode: "auction", auction: { ...g.json.defaults.auction, approval: true, stepUsd: 250_000, snipeMinutes: 10, payDays: 7 } } });
  assert.equal(r.status, 200, r.text);
  await signUp(ava, AVA, "Ava " + RUN);
  await signUp(ben, BEN, "Ben " + RUN);
});
after(async () => {
  if (saved) await admin.put("/api/admin/acquisition", { settings: { ...saved, status: saved.status === "sold" ? "open" : saved.status } });
});

test("admin settings: the opening bid must stay in the owner's US$10M–100M range", async () => {
  const low = await admin.put("/api/admin/acquisition", { settings: { ...saved, mode: "auction", status: "open", auction: { ...saved.auction, randomOpen: false, openUsd: 9_000_000 } } });
  assert.equal(low.status, 400);
  assert.match(low.json.error, /between US\$10,000,000 and US\$100,000,000/);
  const bad = await admin.post("/api/admin/acquisition", { action: "start_round", openUsd: 150_000_000 });
  assert.equal(bad.status, 400);
});

test("a round opens with the opening bid; the public board shows it the same for everyone", async () => {
  const s = await admin.post("/api/admin/acquisition", { action: "start_round", openUsd: OPEN });
  assert.equal(s.status, 200, s.text);
  roundId = s.json.auction.round.id;
  assert.equal(s.json.auction.round.open_usd, OPEN);
  assert.equal((await admin.post("/api/admin/acquisition", { action: "start_round" })).status, 400, "one round at a time");
  const a = await anon.get("/api/acquire");
  const b = await new Client().get("/api/acquire");
  assert.equal(a.json.mode, "auction");
  assert.equal(a.json.auction.round.status, "open");
  assert.equal(a.json.auction.round.openUsd, OPEN);
  assert.equal(b.json.auction.round.openUsd, OPEN);
  assert.equal(a.json.auction.round.nextMinUsd, OPEN);
  assert.equal(a.json.auction.me, null);
});

test("bidders register and are approved by the owner before they can bid", async () => {
  assert.equal((await anon.post("/api/acquire/bid", { amount: OPEN })).status, 401);
  const unreg = await ava.post("/api/acquire/bid", { amount: OPEN });
  assert.equal(unreg.status, 400);
  assert.match(unreg.json.error, /Register as a bidder/);
  const brand = await ava.post("/api/acquire/bidder", { displayName: "Microsoft Ventures", country: "Singapore", phone: "+65 6123 4567" });
  assert.equal(brand.status, 400);
  const reg = await ava.post("/api/acquire/bidder", { displayName: "Ava Capital", company: "Ava Capital Pte Ltd", country: "Singapore", phone: "+65 6123 4567", message: "Ready to move fast." });
  assert.equal(reg.status, 200, reg.text);
  assert.equal(reg.json.status, "pending");
  const waiting = await ava.post("/api/acquire/bid", { amount: OPEN });
  assert.equal(waiting.status, 409);
  assert.match(waiting.json.error, /waiting for the owner's approval/);
  assert.equal((await ava.get("/api/acquire")).json.auction.me.bidder.status, "pending");

  const g = await admin.get("/api/admin/acquisition");
  const row = g.json.auction.bidders.find((x: any) => x.email === AVA);
  assert.ok(row && row.status === "pending" && row.phone === "+65 6123 4567");
  assert.equal((await admin.post("/api/admin/acquisition", { action: "approve_bidder", id: row.id })).status, 200);
  await ben.post("/api/acquire/bidder", { displayName: "Ben Holdings", country: "United Arab Emirates", phone: "+971 4 123 4567" });
  const benRow = (await admin.get("/api/admin/acquisition")).json.auction.bidders.find((x: any) => x.email === BEN);
  await admin.post("/api/admin/acquisition", { action: "approve_bidder", id: benRow.id });
});

test("bids: too low refused, the opening bid, a rival outbids; admins cannot bid; names masked, no e-mails", async () => {
  const low = await ava.post("/api/acquire/bid", { amount: OPEN - 1 });
  assert.equal(low.status, 409);
  assert.match(low.json.error, /lowest bid accepted now is \$25,000,000/);
  const first = await ava.post("/api/acquire/bid", { amount: "25,000,000" });
  assert.equal(first.status, 200, first.text);
  assert.equal(first.json.round.highUsd, OPEN);
  assert.equal((await ava.post("/api/acquire/bid", { amount: OPEN + 1_000_000 })).status, 409, "never against yourself");
  const rival = await ben.post("/api/acquire/bid", { amount: OPEN + 250_000 });
  assert.equal(rival.status, 200, rival.text);
  const adminBid = await admin.post("/api/acquire/bid", { amount: OPEN + 5_000_000 });
  assert.equal(adminBid.status, 409);
  assert.match(adminBid.json.error, /Administrator accounts/);

  const pub = await anon.get("/api/acquire");
  assert.equal(pub.json.auction.round.bidsCount, 2);
  assert.equal(pub.json.auction.round.highUsd, OPEN + 250_000);
  assert.equal(pub.json.auction.round.nextMinUsd, OPEN + 500_000);
  assert.match(pub.json.auction.round.leader, /^B•+$/);
  assert.ok(!pub.text.includes("@example.com") && !pub.text.includes("+971"), "no contact details on the public board");
  const mine = (await ava.get("/api/acquire")).json.auction.me;
  assert.equal(mine.leading, false);
  assert.equal(mine.myBestUsd, OPEN);
  assert.equal((await ben.get("/api/acquire")).json.auction.me.leading, true);

  const early = await ben.post("/api/acquire/checkout", { gateway: "manual" });
  assert.equal(early.status, 409);
  assert.match(early.json.error, /auction is running/);
});

test("the round ends: only the winner pays, at the winning bid; the paid round is sold and the winner is administrator", async () => {
  await update("saleRounds", roundId, { ends_at: new Date(Date.now() - 60_000).toISOString() });
  const t = await tick();
  assert.equal(t.status, 200, t.text);
  assert.equal(t.json.siteAuction.closed, "awaiting_payment");
  const pub = await anon.get("/api/acquire");
  assert.equal(pub.json.auction.round.status, "awaiting_payment");
  assert.equal(pub.json.auction.round.winnerUsd, OPEN + 250_000);
  assert.equal((await ava.post("/api/acquire/bid", { amount: OPEN + 9_000_000 })).status, 409, "closed");

  const loser = await ava.post("/api/acquire/checkout", { gateway: "manual" });
  assert.equal(loser.status, 409);
  assert.match(loser.json.error, /only to the winning bidder/);
  const me = (await ben.get("/api/acquire")).json.auction.me;
  assert.equal(me.winner, true);
  assert.equal(me.amountUsd, OPEN + 250_000);
  const pay = await ben.post("/api/acquire/checkout", { gateway: "manual", company: "Ben Holdings" });
  assert.equal(pay.status, 200, pay.text);
  assert.equal(pay.json.method, "wire");
  assert.equal(pay.json.amountUsd, OPEN + 250_000, "the winning bid, not a fixed price");
  const order = await doc("orders", pay.json.orderId);
  assert.equal(meta(order).saleRound, roundId);
  assert.equal((await doc("saleRounds", roundId)).order_id, pay.json.orderId);

  const paid = await admin.post("/api/admin/orders", { action: "mark_paid", id: pay.json.orderId, note: "e2e wire" });
  assert.equal(paid.status, 200, paid.text);
  const round = await doc("saleRounds", roundId);
  assert.equal(round.status, "sold");
  assert.equal(round.order_id, pay.json.orderId);
  assert.equal((await userByEmail(BEN)).role, "admin");
  const after = await anon.get("/api/acquire");
  assert.equal(after.json.status, "sold");
  // The sold round opens nothing new.
  assert.equal((await tick()).json.siteAuction.skipped, "sold");

  // Undo for the rest of the suite: the refund takes the role back and reopens the offer.
  const refund = await admin.post("/api/admin/orders", { action: "refund", id: pay.json.orderId, note: "e2e", endAccess: true });
  assert.equal(refund.status, 200, refund.text);
  assert.equal((await doc("saleRounds", roundId)).status, "cancelled");
  assert.equal((await userByEmail(BEN)).role, "client");
});
