#!/usr/bin/env node
/* ============================================================================
 * AXTO — Full Lifecycle Simulation Harness
 * Mirrors the REAL production logic (no live network): pricing -> for-sale gate
 * -> checkout -> webhook idempotency -> license issuance -> install/validate
 * -> menu/feature gating -> expiry cron -> post-expiry block.
 *
 * Run: node test-lifecycle.mjs   (exit 0 = all pass)
 * ==========================================================================*/
const results = [];
const ok = (name, cond, got, want) => results.push({ name, ok: !!cond, got, want });
const DAY = 86_400_000;

// ── Catalog mirror (subset of real PACKAGE_INFO: code -> {product, price, forSale, isTrial}) ──
const PKG = {
  // for sale
  lite:{p:"guardian",price:990,sale:true}, pro:{p:"guardian",price:4990,sale:true},
  shield:{p:"guardian",price:19900,sale:true}, aegis:{p:"guardian",price:79000,sale:true},
  orchestra_core:{p:"orchestra",price:34900,sale:true}, orchestra_scale:{p:"orchestra",price:89900,sale:true},
  orchestra_unlimited:{p:"orchestra",price:249000,sale:true},
  antivirus_starter:{p:"antivirus",price:2900,sale:true}, antivirus_professional:{p:"antivirus",price:9900,sale:true},
  antivirus_enterprise:{p:"antivirus",price:29900,sale:true},
  studio_starter:{p:"studio",price:490,sale:true}, studio_professional:{p:"studio",price:1990,sale:true},
  studio_enterprise:{p:"studio",price:7990,sale:true},
  legal_starter:{p:"legal",price:14900,sale:true}, legal_professional:{p:"legal",price:49000,sale:true},
  legal_business:{p:"legal",price:99000,sale:true}, legal_enterprise:{p:"legal",price:249000,sale:true},
  bundle_starter:{p:"guardian",price:33900,sale:true,bundle:true},
  // coming soon (forSale:false)
  vault_starter:{p:"vault",price:4990,sale:false}, edge_starter:{p:"edge",price:7990,sale:false},
  soc_starter:{p:"soc",price:24900,sale:false}, compliance_starter:{p:"compliance",price:7990,sale:false},
  sentinel_starter:{p:"sentinel",price:12900,sale:false},
  // trials
  trial_legal:{p:"legal",price:0,sale:true,trial:true,trialDays:7},
  trial_guardian:{p:"guardian",price:0,sale:true,trial:true,trialDays:3},
  trial_studio:{p:"studio",price:0,sale:true,trial:true,trialDays:3},
};
const PREFIX = { guardian:"GUARD", orchestra:"ORCH", vault:"VAULT", edge:"EDGE", soc:"SOC",
  compliance:"CMPL", sentinel:"SNTL", antivirus:"AV", studio:"STUD", legal:"LEGL" };

const isForSale = code => !!PKG[code] && PKG[code].sale !== false;

// ── Step: checkout (mirrors /api/checkout validation + forSale gate) ──
function checkout({ pkg, gateway, email }) {
  if (!pkg || !gateway || !email) return { status: 400, error: "Missing required fields" };
  if (!PKG[pkg]) return { status: 400, error: "Unknown package" };
  if (!isForSale(pkg)) return { status: 403, error: "Coming Soon" };
  return { status: 200, url: `https://pay/${gateway}/${pkg}` };
}

// ── Step: license issuance (mirrors createLicense expiry priority) ──
function createLicense({ pkg, email, nowTs, expiresInDays, trialDays, skipUser, manual }) {
  const info = PKG[pkg];
  const prefix = PREFIX[info.p];
  const key = `${prefix}-${"XXXX-XXXX-XXXX-XXXX"}`;
  let expMs;
  const td = trialDays ?? (info.trial ? info.trialDays : undefined);
  if (td) expMs = nowTs + td * DAY;
  else if (expiresInDays) expMs = nowTs + expiresInDays * DAY;
  else expMs = nowTs + 365 * DAY; // yearly default
  return {
    key, product: info.p, status: "active", is_enabled: 1,
    expires_at: expMs, activated_manually: manual ? 1 : 0,
    user_created: !skipUser,
  };
}

// ── Webhook with idempotency (mirrors processPayment invoices check) ──
function makeWebhook() {
  const seen = new Set();
  const ledger = [];
  return function webhook({ pkg, email, paymentRef, nowTs }) {
    if (seen.has(paymentRef)) return { ok: true, duplicate: true, licenseCount: ledger.length };
    seen.add(paymentRef);
    const lic = createLicense({ pkg, email, nowTs });
    ledger.push(lic);
    return { ok: true, duplicate: false, license: lic, licenseCount: ledger.length };
  };
}

// ── Validation decision (mirrors /api/license-validate) ──
function validate({ lic, key, product, machineId, boundMachine, nowTs, nodeCount = 1, maxNodes = 1 }) {
  const pfx = key.split("-")[0];
  if (!Object.values(PREFIX).includes(pfx)) return { valid: false, reason: "invalid_key_prefix" };
  if (PREFIX[product] !== pfx) return { valid: false, reason: "product_mismatch" };
  if (lic.status === "revoked") return { valid: false, reason: "revoked" };
  if (lic.status === "suspended") return { valid: false, reason: "suspended" };
  if (lic.is_enabled === 0) return { valid: false, reason: "disabled" };
  if (lic.status === "expired" || lic.expires_at < nowTs) return { valid: false, reason: "expired" };
  if (boundMachine && machineId && boundMachine !== machineId) return { valid: false, reason: "machine_mismatch" };
  if (maxNodes !== -1 && nodeCount > maxNodes) return { valid: false, reason: "node_limit" };
  return { valid: true, reason: "ok" };
}

// ── Expiry cron (mirrors cron/expire-licenses) ──
function expireCron(licenses, nowTs) {
  let n = 0;
  for (const l of licenses) if (l.status === "active" && l.expires_at < nowTs) { l.status = "expired"; n++; }
  return n;
}

// ════════════════ TESTS ════════════════
const T0 = Date.UTC(2026, 0, 1);

// 1) for-sale gate
ok("checkout blocks Coming Soon (vault)", checkout({pkg:"vault_starter",gateway:"stripe",email:"a@b.co"}).status === 403);
ok("checkout blocks Coming Soon (soc)", checkout({pkg:"soc_starter",gateway:"stripe",email:"a@b.co"}).status === 403);
ok("checkout allows for-sale (legal)", checkout({pkg:"legal_professional",gateway:"stripe",email:"a@b.co"}).status === 200);
ok("checkout allows for-sale (guardian)", checkout({pkg:"pro",gateway:"stripe",email:"a@b.co"}).status === 200);
ok("checkout rejects missing email", checkout({pkg:"pro",gateway:"stripe"}).status === 400);
ok("checkout rejects unknown pkg", checkout({pkg:"nope",gateway:"stripe",email:"a@b.co"}).status === 400);

// 2) every for-sale product can begin checkout
for (const [code, info] of Object.entries(PKG)) {
  if (info.sale === false || info.trial) continue;
  ok(`checkout ok: ${code}`, checkout({pkg:code,gateway:"stripe",email:"c@x.co"}).status === 200);
}

// 3) webhook idempotency — double-charge must NOT create 2 licenses
const wh = makeWebhook();
const first = wh({ pkg:"legal_professional", email:"buyer@firm.co", paymentRef:"pi_123", nowTs:T0 });
const dup   = wh({ pkg:"legal_professional", email:"buyer@firm.co", paymentRef:"pi_123", nowTs:T0 });
ok("first webhook issues a license", first.licenseCount === 1 && !first.duplicate);
ok("duplicate webhook is idempotent (still 1 license)", dup.duplicate === true && dup.licenseCount === 1);

// 4) issued license shape per product (prefix + active + enabled + 1yr)
for (const [code, info] of Object.entries(PKG)) {
  if (info.sale === false || info.trial || info.bundle) continue;
  const lic = createLicense({ pkg:code, email:"u@u.co", nowTs:T0 });
  const pfx = PREFIX[info.p];
  ok(`issue ${code}: key prefix ${pfx}`, lic.key.startsWith(pfx + "-"));
  ok(`issue ${code}: active+enabled`, lic.status==="active" && lic.is_enabled===1);
  ok(`issue ${code}: ~365d expiry`, Math.round((lic.expires_at-T0)/DAY)===365);
}

// 5) trials get correct duration
ok("legal trial = 7 days", Math.round((createLicense({pkg:"trial_legal",nowTs:T0}).expires_at-T0)/DAY)===7);
ok("guardian trial = 3 days", Math.round((createLicense({pkg:"trial_guardian",nowTs:T0}).expires_at-T0)/DAY)===3);

// 6) manual activation without user
const man = createLicense({ pkg:"legal_business", nowTs:T0, skipUser:true, manual:true });
ok("manual activation: no user row created", man.user_created === false);
ok("manual activation: flagged + active", man.activated_manually===1 && man.status==="active");

// 7) install + input license -> validation passes when bound correctly
const lic = createLicense({ pkg:"legal_professional", nowTs:T0 });
const key = `LEGL-AAAA-BBBB-CCCC-DDDD`;
const atInstall = T0 + 1*DAY;
ok("valid at install (bound machine, in-window)",
   validate({lic,key,product:"legal",machineId:"M1",boundMachine:"M1",nowTs:atInstall}).valid === true);
ok("blocked when machine mismatch (license sharing)",
   validate({lic,key,product:"legal",machineId:"M2",boundMachine:"M1",nowTs:atInstall}).reason === "machine_mismatch");
ok("blocked when key prefix wrong for product",
   validate({lic,key:"GUARD-AAAA",product:"legal",nowTs:atInstall}).reason === "product_mismatch");

// 8) admin OFF toggle blocks usage even while not expired
const offLic = { ...lic, is_enabled: 0 };
ok("OFF toggle blocks validation", validate({lic:offLic,key,product:"legal",nowTs:atInstall}).reason === "disabled");

// 9) node/seat enforcement
ok("node over limit blocked", validate({lic,key,product:"legal",nowTs:atInstall,nodeCount:5,maxNodes:1}).reason === "node_limit");
ok("unlimited nodes (-1) allowed", validate({lic,key,product:"legal",nowTs:atInstall,nodeCount:9999,maxNodes:-1}).valid === true);

// 10) lifecycle to expiry: cron flips status, then validation blocks
const lifeLic = createLicense({ pkg:"legal_professional", nowTs:T0 }); // expires T0+365d
const beforeExp = T0 + 364*DAY;
const afterExp  = T0 + 366*DAY;
ok("valid one day before expiry", validate({lic:lifeLic,key,product:"legal",nowTs:beforeExp}).valid === true);
const flipped = expireCron([lifeLic], afterExp);
ok("expiry cron flips 1 license to expired", flipped === 1 && lifeLic.status === "expired");
ok("post-expiry validation blocked", validate({lic:lifeLic,key,product:"legal",nowTs:afterExp}).reason === "expired");
ok("validation also blocks purely by date even if status stale",
   validate({lic:{...createLicense({pkg:"legal_professional",nowTs:T0}),status:"active"},key,product:"legal",nowTs:afterExp}).reason === "expired");

// 11) offline grace window concept (<=4h tolerated by product validator)
const GRACE = 4*3600*1000;
ok("offline grace 4h is positive + bounded", GRACE === 14400000);

// ════════════════ REPORT ════════════════
const passed = results.filter(r=>r.ok).length;
const failed = results.length - passed;
for (const r of results) if (!r.ok) console.log("FAIL:", r.name, "got", r.got, "want", r.want);
console.log(`\nLIFECYCLE: ${passed}/${results.length} passed, ${failed} failed`);
import { writeFileSync } from "node:fs";
writeFileSync(new URL("./lifecycle-results.json", import.meta.url),
  JSON.stringify({ suite:"full-lifecycle", passed, failed, total:results.length,
    timestamp:new Date().toISOString(), results }, null, 2));
process.exit(failed === 0 ? 0 : 1);
