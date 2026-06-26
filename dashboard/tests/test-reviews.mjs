// Review logic tests. Run: node --experimental-strip-types dashboard/tests/test-reviews.mjs
import {
  politeFilter, validateReview, checkLogo, publicDisplayName, isPubliclyVisible, MAX_LOGO_BYTES,
} from "../lib/reviews.ts";

const R = [];
const ok = (n, c) => R.push({ n, ok: !!c });

// ── polite filter ───────────────────────────────────────────────────────────
ok("clean review passes", politeFilter("Excellent product, saved us weeks of work.").clean);
ok("impolite EN flagged", !politeFilter("this is a scam").clean);
ok("impolite ID flagged", !politeFilter("aplikasi ini bangsat sekali").clean);
ok("normal word not false-flagged (class≠ass)", politeFilter("a first-class platform").clean);
ok("all-caps shouting flagged", !politeFilter("THIS IS COMPLETELY UNACCEPTABLE PRODUCT").clean);
ok("link flagged", !politeFilter("great see http://spam.example.com").clean);

// ── validation ──────────────────────────────────────────────────────────────
ok("rating 5 + good body ok", validateReview({ rating: 5, body: "Solid platform, highly recommend." }).ok);
ok("rating 0 rejected", !validateReview({ rating: 0, body: "good enough length here" }).ok);
ok("rating 6 rejected", !validateReview({ rating: 6, body: "good enough length here" }).ok);
ok("rating non-integer rejected", !validateReview({ rating: 4.5, body: "good enough length here" }).ok);
ok("too short rejected", !validateReview({ rating: 5, body: "nice" }).ok);
ok("impolite body flagged (but may still validate shape)", validateReview({ rating: 5, body: "this product is garbage and useless" }).flagged);

// ── logo size limit ─────────────────────────────────────────────────────────
const smallPng = "data:image/png;base64," + "A".repeat(1000);
const bigPng = "data:image/png;base64," + "A".repeat(Math.ceil(MAX_LOGO_BYTES * 4 / 3) + 100);
ok("small logo ok", checkLogo(smallPng).ok);
ok("oversized logo rejected", !checkLogo(bigPng).ok);
ok("non-image rejected", !checkLogo("data:text/plain;base64,AAAA").ok);
ok("garbage rejected", !checkLogo("not-a-data-url").ok);
ok("validateReview rejects oversized logo", !validateReview({ rating: 5, body: "good enough length here", logoDataUrl: bigPng }).ok);

// ── public display name (client pref + admin override) ──────────────────────
ok("shows company when both allow", publicDisplayName({ company_name: "Acme Corp", show_company: 1, admin_show_company: 1 }) === "Acme Corp");
ok("hides company when client opts out", publicDisplayName({ company_name: "Acme Corp", client_name: "Jane", show_company: 0, admin_show_company: 1 }) === "Jane");
ok("hides company when admin overrides", publicDisplayName({ company_name: "Acme Corp", client_name: "Jane", show_company: 1, admin_show_company: 0 }) === "Jane");
ok("fallback to Verified customer", publicDisplayName({ show_company: 0, admin_show_company: 1 }) === "Verified customer");

// ── visibility (approved + featured only) ───────────────────────────────────
ok("approved+featured visible", isPubliclyVisible({ status: "approved", featured: 1 }));
ok("approved but not featured hidden", !isPubliclyVisible({ status: "approved", featured: 0 }));
ok("pending hidden", !isPubliclyVisible({ status: "pending", featured: 1 }));
ok("rejected hidden", !isPubliclyVisible({ status: "rejected", featured: 1 }));

const passed = R.filter((r) => r.ok).length, failed = R.length - passed;
for (const r of R) if (!r.ok) console.log("FAIL:", r.n);
console.log(`\nREVIEWS: ${passed}/${R.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
