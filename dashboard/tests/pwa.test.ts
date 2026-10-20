/* AXTO — the phone app (owner, 20 Oct 2026): installable from the very top of
 * the site, opening without the browser, and the install bar gone once AXTO is
 * on the phone. The browser-side behaviour is covered by a Playwright run; this
 * keeps the pieces it depends on from regressing. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import manifest from "../app/manifest";
import { PWA_EARLY, PWA_KEY } from "../components/pwa/early";
import { T } from "../lib/i18n-pages/pwa";
import { LANG_CODES } from "../lib/i18n-shared";

test("manifest: standalone app, icons, and related_applications so Chrome can tell it is installed", () => {
  const m = manifest();
  assert.equal(m.display, "standalone");
  assert.ok(m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  assert.deepEqual(m.related_applications?.map((a) => a.platform), ["webapp"]);
  assert.match(String(m.related_applications?.[0]?.url), /\/manifest\.webmanifest$/);
  assert.equal(m.prefer_related_applications, false);
});

test("early script: catches the install offer before React and records installs", () => {
  assert.match(PWA_EARLY, /beforeinstallprompt/);
  assert.match(PWA_EARLY, /preventDefault\(\)/);
  assert.match(PWA_EARLY, /appinstalled/);
  assert.ok(PWA_EARLY.includes(`"${PWA_KEY}"`));
  assert.doesNotThrow(() => new Function(PWA_EARLY), "the inline script must be valid JavaScript");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<head>[\s\S]*PWA_EARLY[\s\S]*<\/head>/, "inlined in <head>");
});

test("install bar: first in the public, member and sign-in layouts; no second button in the header", () => {
  for (const f of ["../app/(site)/layout.tsx", "../app/app/layout.tsx", "../app/(auth)/layout.tsx"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.match(src, /<InstallBar \/>/, f);
  }
  const site = readFileSync(new URL("../app/(site)/layout.tsx", import.meta.url), "utf8");
  assert.ok(site.indexOf("<InstallBar />") < site.indexOf("<SiteHeader />"), "above the header");
  assert.doesNotMatch(readFileSync(new URL("../components/site/SiteHeader.tsx", import.meta.url), "utf8"), /InstallButton/);
});

test("install bar copy: every language has the bar, Android and iPhone steps", () => {
  for (const l of LANG_CODES) {
    const t = T[l];
    for (const k of ["barTitle", "barSub", "install", "later", "android1", "android2", "android3", "ios1", "ios2", "ios3"] as const) {
      assert.ok(t[k]?.trim(), `${l}.${k}`);
    }
  }
});
