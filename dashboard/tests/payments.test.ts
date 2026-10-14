/* AXTO — payment settings: Live and Sandbox are separate credential sets.
 * Settings saved before v3.2.1 (one set + a test flag) must land in the right
 * environment, and a key pasted into the wrong environment is caught. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gatewayInfo, gatewaySetting, prefixProblem, GATEWAYS, type PaymentSettings } from "../lib/billing/gateways";
import { orderEnv } from "../lib/billing/activate";

const legacy = (gateways: Record<string, unknown>) => ({ gateways } as unknown as PaymentSettings);

test("legacy settings are filed under the right environment", () => {
  const stripeTest = gatewaySetting(legacy({ stripe: { active: true, creds: { secret_key: "sk_test_1", webhook_secret: "whsec_1" } } }), "stripe");
  assert.equal(stripeTest.mode, "sandbox");
  assert.equal(stripeTest.sandbox.secret_key, "sk_test_1");
  assert.deepEqual(stripeTest.live, {});
  assert.equal(stripeTest.active, true);

  const stripeLive = gatewaySetting(legacy({ stripe: { active: true, creds: { secret_key: "sk_live_1", webhook_secret: "whsec_1" } } }), "stripe");
  assert.equal(stripeLive.mode, "live");
  assert.equal(stripeLive.live.secret_key, "sk_live_1");

  const paypal = gatewaySetting(legacy({ paypal: { active: false, creds: { client_id: "a", client_secret: "b", mode: "sandbox" } } }), "paypal");
  assert.equal(paypal.mode, "sandbox");
  assert.equal(paypal.sandbox.mode, undefined, "the old mode field is gone — the environment says it");

  const midLive = gatewaySetting(legacy({ midtrans: { active: true, creds: { server_key: "Mid-server-x", is_production: "true" } } }), "midtrans");
  assert.equal(midLive.mode, "live");
  assert.equal(midLive.live.is_production, undefined);
  const midOld = gatewaySetting(legacy({ midtrans: { active: true, creds: { server_key: "SB-Mid-server-x" } } }), "midtrans");
  assert.equal(midOld.mode, "sandbox", "old default was the sandbox API");

  const flagged = gatewaySetting(legacy({ nowpayments: { active: true, testMode: true, creds: { api_key: "k", ipn_secret: "s" } } }), "nowpayments");
  assert.equal(flagged.mode, "sandbox");

  const bank = gatewaySetting(legacy({ manual: { active: true, testMode: true, creds: { account_number: "1", account_name: "PT" } } }), "manual");
  assert.equal(bank.mode, "live", "a bank account is always real");
  assert.equal(bank.live.account_number, "1");

  const empty = gatewaySetting(legacy({}), "xendit");
  assert.deepEqual([empty.active, empty.mode, empty.live, empty.sandbox], [false, "live", {}, {}]);
});

test("new settings round-trip unchanged", () => {
  const s = legacy({ stripe: { active: true, mode: "sandbox", live: { secret_key: "sk_live_a" }, sandbox: { secret_key: "sk_test_b" } } });
  const st = gatewaySetting(s, "stripe");
  assert.deepEqual([st.mode, st.live.secret_key, st.sandbox.secret_key], ["sandbox", "sk_live_a", "sk_test_b"]);
  // An environment the method doesn't have is ignored.
  assert.equal(gatewaySetting(legacy({ crypto: { active: true, mode: "sandbox", live: { btc: "x" }, sandbox: { btc: "y" } } }), "crypto").mode, "live");
});

test("a key pasted into the wrong environment is caught", () => {
  const stripe = gatewayInfo("stripe")!;
  assert.match(prefixProblem(stripe, "sandbox", { secret_key: "sk_live_x" }), /live key — paste it under Live/);
  assert.match(prefixProblem(stripe, "live", { secret_key: "sk_test_x" }), /sandbox key — paste it under Sandbox/);
  assert.match(prefixProblem(stripe, "live", { secret_key: "pk_live_x" }), /starts with sk_live_ or rk_live_/);
  assert.equal(prefixProblem(stripe, "live", { secret_key: "sk_live_x", webhook_secret: "whsec_1" }), "");
  const mid = gatewayInfo("midtrans")!;
  assert.match(prefixProblem(mid, "live", { server_key: "SB-Mid-server-1" }), /sandbox key/);
  assert.equal(prefixProblem(mid, "sandbox", { server_key: "SB-Mid-server-1" }), "");
  assert.match(prefixProblem(gatewayInfo("xendit")!, "live", { secret_key: "xnd_development_1" }), /sandbox key/);
});

test("every automatic gateway has both environments; bank and wallets are live only", () => {
  for (const g of GATEWAYS) {
    if (g.id === "manual" || g.id === "crypto") assert.deepEqual(g.envs, ["live"], g.id);
    else assert.deepEqual(g.envs, ["live", "sandbox"], g.id);
    for (const f of g.fields) assert.ok(!["mode", "is_production"].includes(f.key), `${g.id}: no ambiguous mode field`);
  }
});

test("orders remember their environment (old orders are live)", () => {
  assert.equal(orderEnv({ meta: JSON.stringify({ env: "sandbox" }) }), "sandbox");
  assert.equal(orderEnv({ meta: JSON.stringify({ env: "live" }) }), "live");
  assert.equal(orderEnv({ meta: "{}" }), "live");
  assert.equal(orderEnv({ meta: "not json" }), "live");
});

/* BNI multi-currency (owner, 14 Oct 2026): one bank method, up to three accounts. */
import { bankAccounts, isConfigured, toEur } from "../lib/billing/gateways";

test("the bank method offers every configured BNI account, rupiah first", () => {
  const g = gatewayInfo("manual")!;
  const all = { account_name: "PT X", account_number: "111", usd_account_number: "222", eur_account_number: "333", swift_code: "BNINIDJA" };
  assert.deepEqual(bankAccounts(all), [
    { currency: "IDR", number: "111" }, { currency: "USD", number: "222" }, { currency: "EUR", number: "333" },
  ]);
  // USD and EUR alone are enough to offer the method — no rupiah account needed.
  const intl = { account_name: "PT X", usd_account_number: "222", eur_account_number: "333" };
  assert.ok(isConfigured(g, intl));
  assert.deepEqual(bankAccounts(intl).map((a) => a.currency), ["USD", "EUR"]);
  // Without the holder's name a wire cannot be matched: nothing is offered.
  assert.deepEqual(bankAccounts({ usd_account_number: "222" }), []);
  assert.ok(!isConfigured(g, { usd_account_number: "222" }));
  assert.deepEqual(bankAccounts({ account_name: "PT X", usd_account_number: "  " }), []);
  // The admin form shows all three account fields, encrypted like the rest.
  for (const k of ["account_number", "usd_account_number", "eur_account_number", "account_name"]) {
    assert.equal(g.fields.find((f) => f.key === k)?.secret, true, k);
  }
});

test("euro amounts are rounded up to the cent, never down", () => {
  assert.equal(toEur(100, 0.9), 90);            // exact stays exact (no float drift)
  assert.equal(toEur(9, 0.92), 8.28);
  assert.equal(toEur(19.99, 0.95), 19);         // 18.9905 → 19.00
  assert.equal(toEur(49, 0.9234), 45.25);       // 45.2466 → 45.25
  assert.ok(toEur(10000000, 0.91) >= 10000000 * 0.91);
});
