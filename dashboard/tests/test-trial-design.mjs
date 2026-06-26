// Trial-design invariants: trials must be clearly weaker than paid plans.
// Run: node --experimental-strip-types dashboard/tests/test-trial-design.mjs
import { PACKAGE_INFO } from "../lib/stripe.ts";

const R = [];
const ok = (n, c) => R.push({ n, ok: !!c });

const trials = Object.entries(PACKAGE_INFO).filter(([k, p]) => p.isTrial);
const paidFor = (product) =>
  Object.entries(PACKAGE_INFO).filter(([k, p]) => p.product === product && !p.isTrial && !p.isBundle && p.price > 0)
    .sort((a, b) => a[1].price - b[1].price).map(([k, p]) => p);

ok("there are trial packages", trials.length >= 8);

for (const [key, t] of trials) {
  ok(`${key}: marked trialLimited`, t.trialLimited === true);
  ok(`${key}: API disabled in trial`, t.noApi === true);
  ok(`${key}: exports watermarked`, t.watermark === true);
  ok(`${key}: price is 0`, t.price === 0);
  ok(`${key}: has a (small) core feature list`, Array.isArray(t.features) && t.features.length > 0 && t.features.length <= 4);
  ok(`${key}: duration set (7 days)`, (t.trialDays || 0) === 7);

  const paid = paidFor(t.product);
  if (paid.length) {
    const cheapest = paid[0];
    // Paid plan must NOT be API-disabled (API is a paid capability).
    ok(`${key}: cheapest paid plan keeps API`, !cheapest.noApi);
    // Paid plan must NOT be watermarked.
    ok(`${key}: cheapest paid plan is not watermarked`, !cheapest.watermark);
    // Paid plan offers more features than the trial.
    if (cheapest.features) ok(`${key}: paid has >= as many features as trial`, cheapest.features.length >= (t.features?.length || 0));
    // Capacity caps: trial <= cheapest paid (where comparable).
    for (const cap of ["maxNodes", "maxWorkers", "maxRequests", "maxDevices", "maxDocuments", "maxEPS"]) {
      if (typeof t[cap] === "number" && typeof cheapest[cap] === "number" && cheapest[cap] !== -1) {
        ok(`${key}: trial ${cap} <= paid`, t[cap] <= cheapest[cap]);
      }
    }
  }
}

const passed = R.filter((r) => r.ok).length, failed = R.length - passed;
for (const r of R) if (!r.ok) console.log("FAIL:", r.n);
console.log(`\nTRIAL-DESIGN: ${passed}/${R.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
