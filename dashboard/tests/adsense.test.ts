/* AdSense (owner, 7 Nov 2026, REQUESTS 147): sixteen accounts stacked on axto.io, one loader.
 * public/ads.txt must list exactly the accounts in lib/adsense.ts, the primary first, and the page must carry one loader
 * only — the primary account — with a meta tag for every account. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AD_ACCOUNTS, ADSENSE_STACK, adsTxt } from "../lib/adsense";
import { SITE } from "../lib/site";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("sixteen distinct stacked accounts, the primary first", () => {
  assert.equal(ADSENSE_STACK.length, 16);
  assert.equal(new Set(ADSENSE_STACK).size, 16);
  for (const a of AD_ACCOUNTS) assert.match(a, /^ca-pub-\d{16}$/);
  assert.equal(AD_ACCOUNTS[0], SITE.adsenseClient);
  assert.equal(new Set(AD_ACCOUNTS).size, AD_ACCOUNTS.length);
});

test("public/ads.txt is exactly one line per account", () => {
  assert.equal(read("public/ads.txt"), adsTxt());
});

test("one meta tag per account, one loader (the primary)", () => {
  const root = read("app/layout.tsx");
  assert.match(root, /"google-adsense-account": \[\.\.\.AD_ACCOUNTS\]/);
  const site = read("app/(site)/layout.tsx");
  assert.equal((site.match(/adsbygoogle\.js\?client=/g) || []).length, 1);
  assert.ok(site.includes("adsbygoogle.js?client=${SITE.adsenseClient}"));
  assert.ok(!/ca-pub-\d/.test(root) && !/ca-pub-\d/.test(site), "layouts hard-code no publisher id");
});
