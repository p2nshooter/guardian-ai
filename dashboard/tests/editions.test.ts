/* AXTO — editions per self-hosted app and the 100-trial programme
 * (docs/AXTO-APPS-BLUEPRINT.md §3–§4): catalogue consistency, prices, signed
 * entitlements, trial codes, translations. */
import { test } from "node:test";
import { testData } from "./helpers/data";
import assert from "node:assert/strict";
import { EDITIONS, editionsFor, getEdition, topEdition, isTopEdition, editionMaxNodes, editionEntitlements, mergeEditionPrices, editionPrice, editionGatewayAllowed, EDITION_ANY_GATEWAY_MAX, hasOwnName } from "../lib/editions";
import { SELF_HOSTED } from "../lib/selfhosted";
import { buildFeatures, serializeEntitlements } from "../lib/entitlements";
import { newTrialCode, isTrialCode, mergeTrialConfig, trialOpen, trialEdition, TRIAL_DEFAULTS } from "../lib/trials";
import { editionPeriod, editionChoiceProblem } from "../lib/edition-service";
import { ED } from "../lib/i18n-pages/editions";
import { featureText } from "../lib/editions-text";

test("editions: every app of the owner's picture, with the existing package codes", () => {
  const tiers: Record<string, string[]> = {
    guardian: ["starter", "professional", "business", "enterprise"], orchestra: ["starter", "professional", "enterprise"],
    vault: ["starter", "professional", "business", "enterprise"], edge: ["starter", "professional", "business", "enterprise"],
    soc: ["starter", "professional", "business", "enterprise"], compliance: ["starter", "professional", "business", "enterprise"],
    sentinel: ["starter", "professional", "business", "enterprise"], antivirus: ["starter", "professional", "enterprise"],
    studio: ["starter", "professional", "enterprise"], legal: ["starter", "professional", "business", "enterprise"],
  };
  for (const p of SELF_HOSTED) {
    assert.deepEqual(editionsFor(p.slug).map((e) => e.tier), tiers[p.slug], p.slug);
    // The top edition is exactly the code every plan licence already carries.
    assert.equal(topEdition(p.slug)!.code, p.packageCode, `${p.slug} top edition = selfhosted packageCode`);
  }
  assert.equal(new Set(EDITIONS.map((e) => e.code)).size, EDITIONS.length, "codes are unique");
  assert.equal(getEdition("lite")!.name, "Sentinel Lite");
  assert.ok(hasOwnName(getEdition("lite")!) && !hasOwnName(getEdition("pro")!));
  for (const e of EDITIONS) {
    assert.ok(e.yearly > e.monthly && e.monthly > 0, `${e.code} prices`);
    assert.ok(e.features.length >= 1, `${e.code} features`);
  }
  // Prices rise with the tier inside an app.
  for (const p of SELF_HOSTED) { const l = editionsFor(p.slug); for (let i = 1; i < l.length; i++) assert.ok(l[i].yearly > l[i - 1].yearly, `${l[i].code} > ${l[i - 1].code}`); }
});

test("editions: signed entitlements — the top edition is unchanged, lower editions are narrowed", () => {
  for (const p of SELF_HOSTED) {
    const top = topEdition(p.slug)!;
    assert.ok(isTopEdition(top.code));
    assert.deepEqual(buildFeatures(p.slug, top.code, 7), buildFeatures(p.slug, "unknown_code", 7), `${p.slug}: top = legacy top set`);
  }
  const lite = buildFeatures("guardian", "lite", editionMaxNodes(getEdition("lite")!));
  assert.equal(lite.max_nodes, 1); assert.equal(lite.ebpf, false); assert.equal(lite.white_label, false); assert.equal(lite.edition, "starter");
  const shield = buildFeatures("guardian", "shield", 100);
  assert.equal(shield.ebpf, true); assert.equal(shield.multi_tenant, false);
  const cs = buildFeatures("compliance", "compliance_starter", -1);
  assert.equal(cs.frameworks, "soc2,gdpr"); assert.equal(cs.iso27001, false); assert.equal(cs.max_frameworks, 2);
  const vs = buildFeatures("vault", "vault_starter", -1);
  assert.equal(vs.max_requests_daily, 50_000); assert.equal(vs.hipaa_report, false);
  const ls = buildFeatures("legal", "legal_starter", 1);
  assert.equal(ls.workspaces, 3); assert.equal(ls.max_countries, 30); assert.equal(ls.air_gapped, false);
  // An edition of another app never narrows this one.
  assert.deepEqual(buildFeatures("vault", "lite", 3), buildFeatures("vault", "vault_enterprise", 3));
  // Deterministic serialisation includes the edition marker.
  assert.match(serializeEntitlements(lite, "lite"), /^package=lite;.*edition=starter/);
  assert.equal(editionEntitlements(getEdition("soc_starter")!).max_eps, 200);
});

test("editions: admin prices merge safely and switch editions off", () => {
  const merged = mergeEditionPrices(JSON.stringify([{ code: "vault_starter", yearly: 5_500, monthly: 550 }, { code: "edge_starter", enabled: false }, { code: "nope", yearly: 1 }, { code: "soc_starter", yearly: -5 }]));
  assert.equal(merged.length, EDITIONS.length);
  assert.equal(editionPrice("vault_starter", "yearly", merged), 5_500);
  assert.equal(editionPrice("vault_starter", "monthly", merged), 550);
  assert.equal(editionPrice("edge_starter", "yearly", merged), null, "switched off");
  assert.equal(editionPrice("soc_starter", "yearly", merged), getEdition("soc_starter")!.yearly, "junk ignored");
  assert.deepEqual(mergeEditionPrices("not json"), mergeEditionPrices(null));
  assert.equal(editionChoiceProblem("vault_pro", "yearly"), "Choose an edition.");
  assert.equal(editionChoiceProblem("vault_starter", "weekly"), "Choose monthly or yearly billing.");
  assert.equal(editionChoiceProblem("vault_starter", "monthly"), null);
});

test("editions: payment methods by amount", () => {
  assert.ok(editionGatewayAllowed("paypal", 499));
  assert.ok(editionGatewayAllowed("midtrans", EDITION_ANY_GATEWAY_MAX));
  assert.ok(!editionGatewayAllowed("paypal", 14_900));
  assert.ok(!editionGatewayAllowed("xendit", 14_900));
  assert.ok(editionGatewayAllowed("manual", 249_000) && editionGatewayAllowed("crypto", 249_000) && editionGatewayAllowed("nowpayments", 249_000));
  assert.ok(editionGatewayAllowed("stripe", 249_000) && !editionGatewayAllowed("stripe", 2_000_000, 999_999));
});

test("editions: renewal stacks, a change of edition credits unused time", () => {
  const at = new Date("2026-10-05T00:00:00Z");
  const e = getEdition("vault_professional")!;
  const fresh = editionPeriod(null, e, "yearly", at);
  assert.equal(Math.round((fresh.end.getTime() - at.getTime()) / 86_400_000), 365);
  const renew = editionPeriod({ package_code: e.code, expires_at: "2027-01-01T00:00:00Z", status: "active", cycle: "yearly" }, e, "yearly", at);
  assert.equal(renew.end.toISOString().slice(0, 10), "2028-01-01");
  const up = editionPeriod({ package_code: "vault_starter", expires_at: "2027-04-05T00:00:00Z", status: "active", cycle: "yearly" }, e, "yearly", at);
  assert.ok(up.creditDays > 0 && up.creditDays < 182, `credit ${up.creditDays}`);
});

test("trials: codes, settings, window, edition", () => {
  const codes = new Set(Array.from({ length: 500 }, newTrialCode));
  assert.equal(codes.size, 500);
  for (const c of codes) assert.ok(isTrialCode(c), c);
  assert.ok(!isTrialCode("TRIAL-0000-OOOO-1111"), "no ambiguous characters");
  assert.deepEqual(mergeTrialConfig(null), TRIAL_DEFAULTS);
  const c = mergeTrialConfig(JSON.stringify({ enabled: false, days: 500, maxProducts: 3, perApp: 100, startsAt: "nonsense" }));
  assert.equal(c.enabled, false); assert.equal(c.days, 14, "out-of-range days ignored"); assert.equal(c.maxProducts, 3); assert.equal(c.startsAt, "");
  assert.ok(!trialOpen(c));
  const w = mergeTrialConfig(JSON.stringify({ startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" }));
  assert.ok(!trialOpen(w, new Date("2026-10-05T00:00:00Z")) && trialOpen(w, new Date("2026-11-15T00:00:00Z")) && !trialOpen(w, new Date("2026-12-02T00:00:00Z")));
  for (const p of SELF_HOSTED) assert.equal(trialEdition(p.slug)!.tier, "professional", p.slug);
});

test("editions: translations — every feature line in all 10 languages", () => {
  const lines = Array.from(new Set(EDITIONS.flatMap((e) => e.features)));
  assert.deepEqual(ED.en.feat, lines, "the English list mirrors lib/editions.ts in order");
  for (const [lang, d] of Object.entries(ED)) {
    assert.equal(d.feat.length, lines.length, lang);
    if (lang !== "en") assert.ok(d.feat.filter((x, i) => x === lines[i] && !/^[\d\s.,+]+\w*$/.test(x)).length < 6, `${lang}: translated, not copied`);
  }
  assert.equal(featureText("id", "Up to 25 servers"), "Hingga 25 server");
  assert.equal(featureText("de", "unknown line"), "unknown line");
});

test("trials: the pool fills itself in small chunks (zero-touch), exactly once, even with callers racing", async () => {
  const { ensureTrialPool, trialStats, TRIAL_BATCH_MAX } = await import("../lib/trials");
  const { db } = testData();
  // Page views and ticks arrive at once: chunks are reserved with compare-and-swap, so the pool never overfills.
  let calls = 0;
  for (let round = 0; round < 80; round++) {
    const worked = await Promise.all([ensureTrialPool(db), ensureTrialPool(db), ensureTrialPool(db, undefined, TRIAL_BATCH_MAX)]);
    calls += 3;
    if (!worked.some(Boolean) && (await db.config.get("trials_seeded"))) break;
  }
  assert.ok(await db.config.get("trials_seeded"), "the pool is complete");
  assert.ok(calls > 3, "filled over several requests, never in one");
  const stats = await trialStats(db);
  assert.equal(Object.keys(stats).length, 10);
  for (const [slug, st] of Object.entries(stats)) assert.deepEqual(st, { total: 100, available: 100, claimed: 0 }, `100 codes for ${slug}`);
  assert.equal(await ensureTrialPool(db), false, "a later call does nothing");
  assert.equal(Object.values(await trialStats(db)).reduce((a, s) => a + s.total, 0), 1000);
});

test("trials: claims are atomic — 12 members racing for 10 codes get 10 licences, never a code twice", async () => {
  const { createTrialBatch, claimTrial, TRIAL_DEFAULTS, trialStats } = await import("../lib/trials");
  const { db } = testData();
  await db.config.set("trials_seeded", "1");
  await createTrialBatch(db, "vault", 10);
  const at = "2026-10-20T00:00:00.000Z";
  const users = Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, email: `m${i}@example.com` }));
  for (const u of users) await db.users.create({ id: u.id, email: u.email, role: "client", password_hash: "", name: u.id, organization: "", country: "", status: "active", last_login_at: "", storage_bytes: 0, ai_provider: "", sessions_valid_after: "", created_at: at, updated_at: at });
  const results = await Promise.all(users.map((u, i) => claimTrial(db, u, "vault", `10.0.0.${i}`, { ...TRIAL_DEFAULTS })));
  const won = results.filter((r) => r.ok);
  assert.equal(won.length, 10);
  assert.equal(new Set(won.map((r) => (r as any).code)).size, 10, "every code went to one member");
  assert.ok(results.filter((r) => !r.ok).every((r) => (r as any).reason === "sold_out"));
  assert.deepEqual((await trialStats(db)).vault, { total: 10, available: 0, claimed: 10 });
  // The same member cannot take a second trial of the app.
  await createTrialBatch(db, "vault", 5);
  const again = await claimTrial(db, users[0]!, "vault", "10.9.9.9", { ...TRIAL_DEFAULTS });
  assert.equal(again.ok, false);
  assert.equal((again as any).reason, "used");
});
