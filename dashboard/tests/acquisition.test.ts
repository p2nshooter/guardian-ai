/* AXTO — site sale: settings are sanitised, gateways are gated, the BNI
 * receiving accounts from the owner are the defaults, redirects stay on site. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALE_DEFAULTS, sanitizeSale, saleGatewayAllowed, accountFor, SALE_GATEWAYS, DEFAULT_PRICE_USD, waLink } from "../lib/acquisition";
import { safeRedirect } from "../lib/safe-redirect";
import { GATEWAYS } from "../lib/billing/gateways";
import { gatewayAllowed, PAYPAL_MAX_USD } from "../lib/lifetime";
import { ACQ_EN } from "../lib/acquire-copy";
import { ACQ } from "../lib/i18n-pages/acquire";

test("defaults: $10,000,000, PayPal first, owner's BNI accounts and WhatsApp", () => {
  assert.equal(SALE_DEFAULTS.priceUsd, DEFAULT_PRICE_USD);
  assert.equal(DEFAULT_PRICE_USD, 10_000_000);
  assert.equal(SALE_GATEWAYS[0], "paypal");
  assert.equal(SALE_DEFAULTS.bank.swift, "BNINIDJA");
  assert.equal(SALE_DEFAULTS.bank.holder, "YUSRON EFENDI");
  assert.equal(accountFor(SALE_DEFAULTS, "USD")?.number, "2090571495");
  assert.equal(accountFor(SALE_DEFAULTS, "IDR")?.number, "2090571484");
  assert.equal(accountFor(SALE_DEFAULTS, "XYZ")?.currency, "USD", "unknown currency falls back to USD");
  assert.equal(SALE_DEFAULTS.whatsapp, "+6285691234561");
  assert.equal(waLink(SALE_DEFAULTS.whatsapp, "hi there"), "https://wa.me/6285691234561?text=hi%20there");
  assert.equal(GATEWAYS[0].id, "paypal", "PayPal is the primary method at checkout");
});

test("sanitizeSale drops junk and keeps what is valid", () => {
  const s = sanitizeSale({ status: "evil", priceUsd: 12, autoGrantAdmin: "yes", gateways: ["paypal", "bogus", "paypal"], whatsapp: "<b>+62 811</b>",
    bank: { holder: "  A B  ", swift: "bninidjaxxxxx", accounts: [{ currency: "usd", number: "12-34 56" }, { currency: "EURO", number: "1" }, { currency: "SGD", number: "" }] } });
  assert.equal(s.status, "open");
  assert.equal(s.priceUsd, DEFAULT_PRICE_USD, "a price under $1,000 is rejected");
  assert.equal(s.autoGrantAdmin, true, "non-boolean keeps the default");
  assert.deepEqual(s.gateways, ["paypal"]);
  assert.equal(s.whatsapp, "+62 811");
  assert.equal(s.bank.holder, "A B");
  assert.equal(s.bank.swift, "BNINIDJAXXX");
  assert.deepEqual(s.bank.accounts, [{ currency: "USD", number: "12-3456" }]);
  assert.equal(sanitizeSale({ soldTo: { orderId: 5 } }).soldTo, undefined);
  assert.deepEqual(sanitizeSale(null), SALE_DEFAULTS);
});

test("gateway gating: offered methods only; Stripe under its ceiling; lifetime PayPal ceiling", () => {
  const s = { ...SALE_DEFAULTS, gateways: ["paypal", "crypto", "stripe"] as typeof SALE_DEFAULTS.gateways };
  assert.ok(saleGatewayAllowed(s, "paypal", 10_000_000));
  assert.ok(saleGatewayAllowed(s, "crypto", 10_000_000));
  assert.ok(!saleGatewayAllowed(s, "manual", 10_000_000), "not offered");
  assert.ok(!saleGatewayAllowed(s, "stripe", 10_000_000), "Stripe caps a single charge");
  assert.ok(saleGatewayAllowed(s, "stripe", 500_000));
  assert.ok(gatewayAllowed("paypal", PAYPAL_MAX_USD) && !gatewayAllowed("paypal", PAYPAL_MAX_USD + 1));
});

test("safeRedirect: same-site paths only", () => {
  assert.equal(safeRedirect("/acquire#checkout", "/app"), "/acquire#checkout");
  assert.equal(safeRedirect("/app/billing?plan=pro", "/app"), "/app/billing?plan=pro");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/ok\nSet-Cookie", "", 5, null, "/" + "a".repeat(600)]) {
    assert.equal(safeRedirect(bad, "/app"), "/app", String(bad));
  }
});

test("offer copy: every language has the English shape; the promise and the price story are truthful", () => {
  const shape = (x: unknown): unknown => Array.isArray(x) ? x.map(shape) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, shape(v)])) : typeof x;
  for (const [lang, copy] of Object.entries(ACQ)) assert.deepEqual(shape(copy), shape(ACQ_EN), `${lang} shape`);
  assert.equal(ACQ.en, ACQ_EN);
  const promise = ACQ_EN.promise.map(([h, d]) => `${h} ${d}`).join(" ");
  assert.match(promise, /only relays/i, "AI requests are relayed — not claimed to be fully client-side");
  assert.match(ACQ_EN.promise.at(-1)![0], /coming soon/i, "Managed AI is not sold as ready");
  assert.match(promise, /Local Mode/, "Local Mode is described");
  for (const [lang, copy] of Object.entries(ACQ)) assert.ok(!/100%/.test(JSON.stringify(copy)), `${lang}: no blanket 100% claim`);
  assert.ok(!/\b(revenue|MRR|ARR|profits?)\b/i.test(JSON.stringify(ACQ_EN)), "no financial claims");
  assert.match(ACQ_EN.escrowNote, /escrow/i);
});
