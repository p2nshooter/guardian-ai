/* AXTO — Lifetime (offline) licences: prices, payment rules, and the activation
 * file format that the server signs and every engine verifies. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LIFETIME_TIERS, mergeLifetimePrices, lifetimePrice, tierFor, gatewayAllowed, productsOf, activationPayload,
  isMachineId, newLicenseId, ACTIVATION_FORMAT, CARD_MAX_USD, PAYPAL_MAX_USD, LIFETIME_MAJOR,
} from "../lib/lifetime";
import { buildFeatures, serializeEntitlements } from "../lib/entitlements";
import { SELF_HOSTED, SELF_HOSTED_SLUGS } from "../lib/selfhosted";

const REPO = path.resolve(import.meta.dirname, "../..");
const ENGINE_FILES = ["engine/src", "vault/src", "antivirus/src", "compliance/src", "edge/src", "sentinel/src", "soc/src",
  "orchestra/orchestra_core", "legal/src", "studio/src", "ai-studio/src", "gpu-studio/src", "hybrid-studio/src"].map((d) => `${d}/license.py`);

test("prices: tiers are ordered, suite costs more, admin override ignores junk", () => {
  for (let i = 1; i < LIFETIME_TIERS.length; i++) assert.ok(LIFETIME_TIERS[i].devices > LIFETIME_TIERS[i - 1].devices);
  for (const t of LIFETIME_TIERS) assert.ok(t.suite > t.app && t.app > 0);
  assert.deepEqual(mergeLifetimePrices(null), LIFETIME_TIERS);
  assert.deepEqual(mergeLifetimePrices("not json"), LIFETIME_TIERS);
  const m = mergeLifetimePrices(JSON.stringify([{ devices: 1, app: 30000, suite: -5 }, { devices: 7, app: 1 }]));
  assert.equal(m[0].app, 30000);
  assert.equal(m[0].suite, LIFETIME_TIERS[0].suite, "negative price ignored");
  assert.equal(m.length, LIFETIME_TIERS.length, "unknown tiers never added");
});

test("prices: device counts round UP to the next tier; >100 has no list price", () => {
  assert.equal(lifetimePrice(1, "app"), 24_900);
  assert.equal(lifetimePrice(3, "app"), 99_000);
  assert.equal(lifetimePrice(100, "suite"), 5_900_000);
  assert.equal(lifetimePrice(101, "suite"), null);
  assert.equal(lifetimePrice(0, "app"), null);
  assert.equal(lifetimePrice(2.5, "app"), null);
  assert.equal(tierFor(7)?.devices, 10);
});

test("payment rules: only wire/crypto/card; card only up to Stripe's ceiling", () => {
  assert.ok(gatewayAllowed("manual", 5_900_000));
  assert.ok(gatewayAllowed("crypto", 5_900_000));
  assert.ok(gatewayAllowed("stripe", CARD_MAX_USD));
  assert.ok(!gatewayAllowed("stripe", CARD_MAX_USD + 1));
  for (const g of ["paypal", "xendit", "midtrans", "bogus"]) assert.ok(!gatewayAllowed(g, 24_900), g);
  assert.ok(gatewayAllowed("paypal", PAYPAL_MAX_USD) && !gatewayAllowed("paypal", PAYPAL_MAX_USD + 1), "PayPal up to its single-payment ceiling");
});

test("coverage: a suite covers every self-hosted app; an app covers only itself", () => {
  assert.deepEqual(productsOf({ scope: "suite", product: "suite" }), SELF_HOSTED_SLUGS);
  assert.deepEqual(productsOf({ scope: "app", product: "vault" }), ["vault"]);
  assert.deepEqual(productsOf({ scope: "app", product: "nope" }), []);
});

test("ids: licence ids and machine ids have one strict shape", () => {
  assert.match(newLicenseId(), /^LT-[0-9A-F]{12}$/);
  assert.ok(isMachineId("0123456789abcdef0123456789abcdef"));
  for (const bad of ["0123456789ABCDEF0123456789ABCDEF", "123", "0123456789abcdef0123456789abcdeg", 42]) assert.ok(!isMachineId(bad), String(bad));
});

test("activation payload: fixed field order, delimiter-safe, carries signed top-tier entitlements", () => {
  const ent = serializeEntitlements(buildFeatures("vault", "vault_enterprise", 5), "vault_enterprise");
  const p = activationPayload({ licenseId: "LT-ABC|DEF", product: "vault", machineId: "0".repeat(32), scope: "app", devices: 5, major: LIFETIME_MAJOR, updatesUntil: "2027-09-29T10:00:00.000Z", issuedAt: "2026-09-29T10:00:00.000Z", entitlements: ent });
  const parts = p.split("|");
  assert.equal(parts.length, 10);
  assert.equal(parts[0], ACTIVATION_FORMAT);
  assert.equal(parts[1], "LT-ABCDEF", "a '|' can never forge an extra field");
  assert.equal(parts[7], "2027-09-29");
  assert.match(parts[9], /^package=vault_enterprise;/);
  assert.match(parts[9], /;max_nodes=5(;|$)/);
});

test("entitlements: every sold app gets a signed node/device cap and its top-tier package", () => {
  for (const p of SELF_HOSTED) {
    const e = serializeEntitlements(buildFeatures(p.slug, p.packageCode, 7), p.packageCode);
    assert.ok(e.startsWith(`package=${p.packageCode};`), p.slug);
    assert.match(e, /;max_nodes=7(;|$)/, p.slug);
    assert.ok(!e.includes("|"), p.slug);
  }
});

test("engines: all 13 licence modules verify the SAME activation format and field order", () => {
  const ts = ["format", "license_id", "product", "machine_id", "scope", "devices", "major", "updates_until", "issued_at", "entitlements"];
  for (const f of ENGINE_FILES) {
    const src = fs.readFileSync(path.join(REPO, f), "utf8");
    assert.ok(src.includes(`OFFLINE_FORMAT = "${ACTIVATION_FORMAT}"`), `${f}: format`);
    const m = src.match(/OFFLINE_FIELDS = \[([\s\S]*?)\]/);
    assert.ok(m, `${f}: OFFLINE_FIELDS`);
    assert.deepEqual([...m![1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]), ts, `${f}: field order`);
    assert.ok(/def offline_activation\(\)/.test(src) && /def offline_hint\(\)/.test(src), `${f}: helpers`);
    assert.ok(!src.includes("axto.io/buy"), `${f}: no dead purchase link`);
  }
});

test("installer keys: LIFE- shape, unique, never a subscription prefix", async () => {
  const { newInstallKey, isInstallKey } = await import("../lib/lifetime");
  const { productFromKey } = await import("../lib/selfhosted");
  const keys = new Set(Array.from({ length: 200 }, () => newInstallKey()));
  assert.equal(keys.size, 200);
  for (const k of keys) {
    assert.ok(isInstallKey(k), k);
    assert.equal(productFromKey(k), null, "a LIFE key must never look like a product key");
  }
  assert.equal(isInstallKey("LIFE-0123ABCD-89EF0123-DEADBEEF"), false);
  assert.equal(isInstallKey("life-0123abcd-89ef0123-deadbeef-00000000"), false, "the API upper-cases first");
});

test("builds: engine architecture → image file name", async () => {
  const { normArch, archImageName } = await import("../lib/builds");
  assert.equal(normArch(undefined), "amd64");
  assert.equal(normArch("x86_64"), "amd64");
  assert.equal(normArch("aarch64"), "arm64");
  assert.equal(normArch("ARM64"), "arm64");
  assert.equal(normArch("s390x"), "");
  assert.equal(archImageName("vault-core", "amd64"), "vault-core");
  assert.equal(archImageName("vault-core", "arm64"), "vault-core-arm64");
});
