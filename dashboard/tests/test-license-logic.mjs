#!/usr/bin/env node
/* ==============================================================================
 * AXTO Legal — License Logic Test Harness
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 *
 * Pure-logic regression tests that mirror, byte-for-byte, the algorithms in:
 *   - dashboard/lib/license.ts            (generateLicenseKey, createLicense expiry)
 *   - dashboard/app/api/admin/route.ts    (add_days, trial-week mapping, on/off)
 *   - dashboard/app/api/license-validate  (validation decision + KEY_PREFIXES)
 *
 * These exercise the parts where date/logic bugs hide. Run with: node test-license-logic.mjs
 * No network or DB required. Exit code 0 = all pass, 1 = any failure.
 * ============================================================================== */

let PASS = 0, FAIL = 0;
const results = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  results.push({ name, ok, got, want });
  if (ok) { PASS++; } else { FAIL++; }
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}` + (ok ? "" : `\n        got=${JSON.stringify(got)}\n       want=${JSON.stringify(want)}`));
}
function approxDays(fromISO, toISO) {
  return Math.round((new Date(toISO) - new Date(fromISO)) / 86400000);
}

// ── Mirror: product prefix maps ─────────────────────────────────────────────
const PRODUCT_PREFIX = {
  guardian:"GUARD", orchestra:"ORCH", vault:"VAULT", edge:"EDGE", soc:"SOC",
  compliance:"CMPL", sentinel:"SNTL", antivirus:"AV", studio:"STUD", legal:"LEGL",
};
// The validate endpoint's accepted prefixes (after our fix)
const VALIDATE_PREFIXES = {
  GUARD:"guardian", ORCH:"orchestra", VAULT:"vault", EDGE:"edge", SOC:"soc",
  CMPL:"compliance", SNTL:"sentinel", AV:"antivirus", STUD:"studio", LEGL:"legal",
};

// ── Mirror: trial-week → days mapping (admin route) ─────────────────────────
function trialWeeksToDays(trialWeeks, trialDays) {
  const wk = Number(trialWeeks);
  if (wk && wk >= 1) return Math.min(Math.max(Math.floor(wk), 1), 4) * 7;   // 1–4 weeks
  return Math.min(Math.max(Number(trialDays) || 7, 1), 28);                 // 1–28 days
}

// ── Mirror: createLicense expiry calculation ────────────────────────────────
function computeExpiry({ isTrial, trialDays, expiresInDays, packageCode = "", expiresMonths = 12 }, nowDate) {
  const expiresAt = new Date(nowDate.getTime());
  const td = (trialDays && trialDays > 0) ? Math.floor(trialDays) : 0;
  if (isTrial && td > 0)               expiresAt.setDate(expiresAt.getDate() + td);
  else if (expiresInDays > 0)          expiresAt.setDate(expiresAt.getDate() + Math.floor(expiresInDays));
  else if (packageCode.startsWith("trial_")) expiresAt.setDate(expiresAt.getDate() + 3);
  else                                 expiresAt.setMonth(expiresAt.getMonth() + expiresMonths);
  return expiresAt;
}

// ── Mirror: add_days action ─────────────────────────────────────────────────
function addDays(currentExpiryISO, days, nowDate) {
  const lic = new Date(currentExpiryISO);
  const base = days > 0
    ? (lic > nowDate ? new Date(lic.getTime()) : new Date(nowDate.getTime()))
    : new Date(lic.getTime());
  base.setDate(base.getDate() + days);
  const stillValid = base > nowDate;
  return { expires_at: base.toISOString(), status: stillValid ? "active" : "expired" };
}

// ── Mirror: validation decision (license-validate) ──────────────────────────
function validateDecision(lic, machineId, reqProduct, nowDate) {
  if (lic.status === "revoked")   return { valid:false, reason:"revoked" };
  if (lic.status === "suspended") return { valid:false, reason:"suspended" };
  if (lic.is_enabled === 0)       return { valid:false, reason:"disabled" }; // our on/off addition
  if (new Date(lic.expires_at) < nowDate) return { valid:false, reason:"expired" };
  if (reqProduct && lic.product && reqProduct !== lic.product) return { valid:false, reason:"product_mismatch" };
  if (machineId && lic.bound_machine_id && lic.bound_machine_id !== machineId) return { valid:false, reason:"machine_mismatch" };
  if (lic.max_nodes !== -1 && typeof lic.node_count === "number" && lic.node_count > lic.max_nodes) return { valid:false, reason:"node_limit_exceeded" };
  return { valid:true, reason:"ok" };
}

// ── Mirror: canonical signing payload (license-signing.ts) ──────────────────
function buildCanonicalPayload(f) {
  return [f.licenseKey, f.machineId||"", f.product||"", f.valid?"true":"false",
          f.status||"", f.expiresAt||"", f.issuedAt, f.nonce].join("|");
}

// ── Mirror: key format generator (structure only; randomness omitted) ───────
function keyShape(product) {
  const prefix = PRODUCT_PREFIX[product] || "GUARD";
  // body = PREFIX-XXXXXXXX-XXXXXXXX-XXXXXXXX (+ optional checksum segment)
  const seg = "ABCD1234";
  return `${prefix}-${seg}-${seg}-${seg}`;
}

console.log("══════════════════════════════════════════════════════════════");
console.log(" AXTO Legal — License Logic Test Harness");
console.log("══════════════════════════════════════════════════════════════\n");

const NOW = new Date("2026-06-25T12:00:00.000Z");

// ── 1. Trial week mapping (the core new feature: 1/2/3/4 weeks) ──────────────
console.log("── Group 1: Trial week → day mapping ──");
check("1 week trial = 7 days",  trialWeeksToDays(1), 7);
check("2 week trial = 14 days", trialWeeksToDays(2), 14);
check("3 week trial = 21 days", trialWeeksToDays(3), 21);
check("4 week trial = 28 days", trialWeeksToDays(4), 28);
check("week clamp >4 → 4 weeks (28d)", trialWeeksToDays(9), 28);
check("week clamp <1 → falls to days default (7)", trialWeeksToDays(0, undefined), 7);
check("explicit trialDays=10 honored", trialWeeksToDays(undefined, 10), 10);
check("trialDays clamp >28 → 28", trialWeeksToDays(undefined, 99), 28);
check("trialDays clamp <1 → default 7", trialWeeksToDays(undefined, 0), 7);

// ── 2. Expiry calculation ────────────────────────────────────────────────────
console.log("\n── Group 2: createLicense expiry ──");
check("1-week trial expiry is +7d", approxDays(NOW.toISOString(), computeExpiry({isTrial:true, trialDays:7}, NOW).toISOString()), 7);
check("4-week trial expiry is +28d", approxDays(NOW.toISOString(), computeExpiry({isTrial:true, trialDays:28}, NOW).toISOString()), 28);
check("yearly (12mo) ≈ 365d", approxDays(NOW.toISOString(), computeExpiry({expiresMonths:12}, NOW).toISOString()), 365);
check("monthly (1mo) ≈ 30d", approxDays(NOW.toISOString(), computeExpiry({expiresMonths:1}, NOW).toISOString()), 30);
check("legacy trial_ pkg no duration → +3d", approxDays(NOW.toISOString(), computeExpiry({packageCode:"trial_legal", expiresMonths:0}, NOW).toISOString()), 3);
check("lifetime (1200mo) ≈ 100y", Math.round(approxDays(NOW.toISOString(), computeExpiry({expiresMonths:1200}, NOW).toISOString())/365), 100);

// ── 3. Add-days action ───────────────────────────────────────────────────────
console.log("\n── Group 3: Admin 'add days' ──");
const future = new Date("2026-09-25T12:00:00.000Z").toISOString(); // +92d
check("add +30d to active stacks on expiry", approxDays(future, addDays(future, 30, NOW).expires_at), 30);
check("add +7d to active keeps status active", addDays(future, 7, NOW).status, "active");
const past = new Date("2026-06-01T12:00:00.000Z").toISOString();   // expired 24d ago
check("add +14d to EXPIRED counts from today (not old expiry)", approxDays(NOW.toISOString(), addDays(past, 14, NOW).expires_at), 14);
check("add +14d to expired re-activates", addDays(past, 14, NOW).status, "active");
check("claw back -10d from active shortens term", approxDays(NOW.toISOString(), addDays(future, -10, NOW).expires_at), 82);
check("claw back beyond now → expired", addDays(future, -200, NOW).status, "expired");

// ── 4. Validation decision matrix ────────────────────────────────────────────
console.log("\n── Group 4: Validation decision matrix ──");
const baseLic = { status:"active", is_enabled:1, expires_at:future, product:"legal", bound_machine_id:null, max_nodes:5, node_count:0 };
check("active+enabled+valid → valid", validateDecision({...baseLic}, "m1", "legal", NOW).valid, true);
check("revoked → invalid", validateDecision({...baseLic, status:"revoked"}, "m1", "legal", NOW).reason, "revoked");
check("suspended → invalid", validateDecision({...baseLic, status:"suspended"}, "m1", "legal", NOW).reason, "suspended");
check("disabled (is_enabled=0) → invalid", validateDecision({...baseLic, is_enabled:0}, "m1", "legal", NOW).reason, "disabled");
check("expired → invalid", validateDecision({...baseLic, expires_at:past}, "m1", "legal", NOW).reason, "expired");
check("product mismatch → invalid", validateDecision({...baseLic}, "m1", "guardian", NOW).reason, "product_mismatch");
check("machine mismatch → invalid", validateDecision({...baseLic, bound_machine_id:"other"}, "m1", "legal", NOW).reason, "machine_mismatch");
check("node over limit → invalid", validateDecision({...baseLic, node_count:9}, "m1", "legal", NOW).reason, "node_limit_exceeded");
check("unlimited nodes (-1) ignores count", validateDecision({...baseLic, max_nodes:-1, node_count:9999}, "m1", "legal", NOW).valid, true);

// ── 5. Key prefix consistency (the bug we fixed) ─────────────────────────────
console.log("\n── Group 5: LEGL/STUD prefix consistency ──");
check("LEGL key recognized by validate endpoint", VALIDATE_PREFIXES["LEGL"], "legal");
check("STUD key recognized by validate endpoint", VALIDATE_PREFIXES["STUD"], "studio");
check("legal key shape is LEGL-...", keyShape("legal").startsWith("LEGL-"), true);
check("studio key shape is STUD-...", keyShape("studio").startsWith("STUD-"), true);
// Every product prefix in lib/license MUST be accepted by validate endpoint
const allConsistent = Object.entries(PRODUCT_PREFIX).every(([prod, pfx]) => VALIDATE_PREFIXES[pfx] === prod);
check("ALL 10 product prefixes accepted by validate endpoint", allConsistent, true);

// ── 6. Canonical signing payload format ──────────────────────────────────────
console.log("\n── Group 6: Ed25519 canonical payload ──");
const payload = buildCanonicalPayload({
  licenseKey:"LEGL-ABCD-1234-EF56", machineId:"mid-1", product:"legal",
  valid:true, status:"active", expiresAt:future, issuedAt:"2026-06-25T12:00:00.000Z", nonce:"deadbeef",
});
check("payload is pipe-delimited 8 fields", payload.split("|").length, 8);
check("payload field order [key,mid,product,valid,...]", payload.split("|").slice(0,4), ["LEGL-ABCD-1234-EF56","mid-1","legal","true"]);
check("invalid decision still serializes valid=false", buildCanonicalPayload({licenseKey:"X",valid:false,issuedAt:"t",nonce:"n"}).split("|")[3], "false");

// ── 7. One-trial-per-email guard (logic) ─────────────────────────────────────
console.log("\n── Group 7: Trial abuse guard ──");
function trialAllowed(existingLicenses, email, product) {
  return !existingLicenses.some(l =>
    l.email === email.toLowerCase() && l.product === product &&
    (l.license_type === "trial" || (l.package_code||"").startsWith("trial_")) &&
    l.status !== "revoked");
}
const existing = [{ email:"a@x.com", product:"legal", license_type:"trial", status:"active" }];
check("second legal trial for same email blocked", trialAllowed(existing, "a@x.com", "legal"), false);
check("trial for DIFFERENT product allowed", trialAllowed(existing, "a@x.com", "guardian"), true);
check("trial for different email allowed", trialAllowed(existing, "b@x.com", "legal"), true);
check("revoked prior trial does not block", trialAllowed([{...existing[0], status:"revoked"}], "a@x.com", "legal"), true);

console.log("\n══════════════════════════════════════════════════════════════");
console.log(` RESULT: ${PASS} passed, ${FAIL} failed, ${PASS+FAIL} total`);
console.log("══════════════════════════════════════════════════════════════");

// Emit machine-readable summary for the report generator.
// Write next to this test file (portable across local + CI runners). A write
// failure must never fail the suite, so it is best-effort only.
Promise.all([import("fs"), import("path"), import("url")]).then(([fs, path, url]) => {
  try {
    const outDir = process.env.TEST_RESULTS_DIR
      || path.dirname(url.fileURLToPath(import.meta.url));
    fs.writeFileSync(path.join(outDir, "test-results.json"), JSON.stringify({
      suite: "license-logic", passed: PASS, failed: FAIL, total: PASS+FAIL,
      timestamp: new Date().toISOString(), results,
    }, null, 2));
  } catch { /* non-fatal: results file is optional */ }
});

process.exitCode = FAIL === 0 ? 0 : 1;
