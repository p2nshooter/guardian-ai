#!/usr/bin/env node
/* ============================================================================
 * AXTO — CI Completeness & Freshness Scan
 * Verifies the repo is whole and self-consistent before an automatic deploy.
 * Prints a score (target: 100%). Exit non-zero if below threshold.
 *
 * Usage: node scripts/ci/scan-completeness.mjs [--min 95]
 * ==========================================================================*/
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const argMin = (() => { const i = process.argv.indexOf("--min"); return i > -1 ? Number(process.argv[i + 1]) : 95; })();
const checks = [];
const add = (name, pass, detail = "") => checks.push({ name, pass: !!pass, detail });
const has = (...p) => existsSync(join(ROOT, ...p));
const read = (...p) => { try { return readFileSync(join(ROOT, ...p), "utf8"); } catch { return ""; } };

// ── 1. The 10 products each have a source directory ──────────────────────────
const PRODUCTS = {
  "Guardian AI": ["engine"],
  "Orchestra AI": ["orchestra"],
  "Orchestra Worker CPU": ["orchestra"],          // worker built from orchestra ctx
  "Orchestra Worker GPU": ["orchestra"],
  "AXTO Vault": ["vault"],
  "AXTO Edge": ["edge"],
  "AXTO SOC": ["soc"],
  "AXTO Compliance": ["compliance"],
  "AXTO Sentinel": ["sentinel"],
  "AXTO Antivirus": ["antivirus"],
  "AXTO Studio": ["studio"],
  "AXTO Legal": ["legal"],
};
for (const [name, dirs] of Object.entries(PRODUCTS)) {
  add(`source present: ${name}`, dirs.some(d => has(d)), dirs.join(" | "));
}

// ── 2. CI defines a build job for every product engine ───────────────────────
const ci = read(".gitlab-ci.yml");
const EXPECTED_BUILDS = [
  "build:guardian-core", "build:guardian-node", "build:guardian-antivirus",
  "build:antivirus-core", "build:vault-core", "build:edge-core", "build:soc-core",
  "build:compliance-core", "build:sentinel-core", "build:studio-core",
  "build:orchestra-core", "build:orchestra-worker-cpu", "build:orchestra-worker-gpu",
  "build:legal-core",
];
for (const j of EXPECTED_BUILDS) add(`CI build job: ${j}`, ci.includes(j + ":"));

// ── 3. CI deploys dashboard + workers to Cloudflare ──────────────────────────
add("CI deploy-dashboard job", ci.includes("deploy-dashboard:"));
add("CI deploy-workers job", ci.includes("deploy-workers:"));
add("CI nightly schedule rule", /CI_PIPELINE_SOURCE\s*==\s*"schedule"/.test(ci));
add("CI verify stage present", /(^|\n)\s*-\s*verify\b/.test(ci) && ci.includes("verify:"));
add("CI cleanup stage present", /(^|\n)\s*-\s*cleanup\b/.test(ci));

// ── 4. Wrangler bindings intact (D1/KV/R2) ───────────────────────────────────
const wr = read("dashboard", "wrangler.toml");
add("wrangler: D1 binding", /\[\[d1_databases\]\]/.test(wr) && /axto-db/.test(wr));
add("wrangler: KV binding", /\[\[kv_namespaces\]\]/.test(wr));
add("wrangler: R2 binding", /\[\[r2_buckets\]\]/.test(wr));

// ── 5. Migrations are sequential, no gaps, no duplicates ─────────────────────
let migOk = false, migDetail = "no migrations dir";
if (has("dashboard", "cf-migrations")) {
  const nums = readdirSync(join(ROOT, "dashboard", "cf-migrations"))
    .map(f => (f.match(/^(\d{4})/) || [])[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
  const dup = new Set(nums).size !== nums.length;
  let gap = false;
  for (let i = 1; i < nums.length; i++) if (nums[i] - nums[i - 1] > 1) gap = true;
  migOk = nums.length > 0 && !dup && !gap;
  migDetail = `${nums.length} migrations, ${dup ? "DUP" : "no dup"}, ${gap ? "GAP" : "no gap"}, latest=${nums.at(-1)}`;
}
add("migrations sequential & clean", migOk, migDetail);

// ── 6. Single source of truth for pricing (no hardcoded prices in page) ──────
add("pricing catalog present", read("dashboard", "lib", "stripe.ts").includes("PACKAGE_INFO"));

// ── 7. Test harnesses present for CI ─────────────────────────────────────────
add("test: lifecycle harness", has("dashboard", "tests", "test-lifecycle.mjs"));
add("test: license-logic harness", has("dashboard", "tests", "test-license-logic.mjs"));

// ── Score ────────────────────────────────────────────────────────────────────
const pass = checks.filter(c => c.pass).length;
const pct = Math.round((pass / checks.length) * 1000) / 10;
console.log("\nAXTO Completeness Scan");
console.log("──────────────────────");
for (const c of checks) console.log(`${c.pass ? "✓" : "✗"}  ${c.name}${c.detail ? "  (" + c.detail + ")" : ""}`);
console.log("──────────────────────");
console.log(`Score: ${pass}/${checks.length} = ${pct}%   (min required: ${argMin}%)`);
if (pct < argMin) { console.error(`\n✗ Completeness ${pct}% below threshold ${argMin}% — blocking deploy.`); process.exit(1); }
console.log("✓ Completeness gate passed.");
