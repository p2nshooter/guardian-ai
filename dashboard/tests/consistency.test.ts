/* AXTO — cross-cutting consistency checks (node:test via tsx). Run: npm test
 * Catches the class of bug found in the v3.2 audit: a menu pointing at a page
 * that does not exist, downloads drifting from their source, two different
 * version numbers, and translations that drop a placeholder. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SELF_HOSTED } from "../lib/selfhosted";
import { VERSION } from "../lib/site";
import { V32_EN, V32 } from "../lib/i18n-v32";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const REWRITES: [RegExp, string][] = [[/^\/self-hosted\/[^/]+\/guide$/, "/self-hosted-guide/[slug]"]];
const pageExists = (route: string) => {
  for (const [re, target] of REWRITES) if (re.test(route)) route = target;
  const dir = path.join(ROOT, "app", ...route.split("/").filter(Boolean));
  return fs.existsSync(path.join(dir, "page.tsx"));
};

test("version: package.json and the platform VERSION constant agree", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.version, VERSION);
});

test("self-hosted downloads: every compose/config file exists and matches the repo-root source", () => {
  for (const p of SELF_HOSTED) {
    for (const f of [p.compose, p.config]) {
      const pub = path.join(ROOT, "public/configs", f);
      assert.ok(fs.existsSync(pub), `public/configs/${f} missing (${p.slug})`);
      const src = path.join(REPO, f);
      if (fs.existsSync(src)) assert.equal(fs.readFileSync(pub, "utf8"), fs.readFileSync(src, "utf8"), `public/configs/${f} is stale — run npm run build`);
    }
  }
});

test("portal menus: every member and admin menu entry has a page", () => {
  const shell = fs.readFileSync(path.join(ROOT, "components/app/Shell.tsx"), "utf8");
  const hrefs = [...shell.matchAll(/href: "(\/(?:app|admin)[^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 12, `found ${hrefs.length} menu entries`);
  for (const h of hrefs) assert.ok(pageExists(h), `menu links to ${h} but app${h}/page.tsx does not exist`);
});

test("i18n v3.2: every language keeps every placeholder", () => {
  const tokens = (s: string) => (s.match(/\{(\w+)\}/g) || []).sort().join(",");
  for (const [lang, dict] of Object.entries(V32)) {
    for (const [k, en] of Object.entries(V32_EN)) {
      const v = (dict as Record<string, string>)[k];
      assert.ok(v && v.trim(), `${lang}.${k} is empty`);
      assert.equal(tokens(v), tokens(en), `${lang}.${k} placeholders`);
    }
  }
});

test("installer and portal agree on every self-hosted product (key prefix, port, files, service, state dir)", () => {
  const go = fs.readFileSync(path.join(REPO, "installer/products.go"), "utf8");
  const field = (block: string, name: string) => block.match(new RegExp(`${name}: "?([^",}]+)"?`))?.[1];
  const list = go.slice(go.indexOf("var Products = []Product{"), go.indexOf("func ProductBySlug"));
  const blocks = list.split("{Slug: ").slice(1);
  assert.equal(blocks.length, SELF_HOSTED.length);
  for (const b of blocks) {
    const slug = b.match(/^"([a-z-]+)"/)![1];
    const p = SELF_HOSTED.find((x) => x.slug === slug);
    assert.ok(p, `installer product ${slug} is not in lib/selfhosted.ts`);
    assert.equal(field(b, "KeyPrefix"), p!.keyPrefix, `${slug} key prefix`);
    assert.equal(Number(field(b, "Port")), p!.port, `${slug} port`);
    assert.equal(field(b, "Service"), p!.service, `${slug} service`);
    assert.equal(field(b, "StateDir"), p!.stateDir, `${slug} state dir`);
    assert.equal(field(b, "Compose"), p!.compose, `${slug} compose`);
    assert.equal(field(b, "Config"), p!.config, `${slug} config`);
    assert.equal(field(b, "ConfigAs"), p!.configTarget, `${slug} config target`);
  }
});

test("links: every internal href in the code points at a page, a route, a redirect or a public file", () => {
  // Route patterns from app/**/page.tsx and route.ts; (group) folders are not part of the URL.
  const routes: RegExp[] = [];
  const walk = (dir: string, segs: string[]) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), /^\(.*\)$/.test(e.name) ? segs : [...segs, e.name]);
      else if (/^(page|route)\.tsx?$/.test(e.name)) {
        const re = segs.map((s) => (/^\[\.\.\..+\]$/.test(s) ? ".+" : /^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/");
        routes.push(new RegExp(`^/${re}/?$`));
      }
    }
  };
  walk(path.join(ROOT, "app"), []);
  const cfg = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
  // Only redirects() count: the headers() sources match every path.
  const redirects = [...cfg.slice(cfg.indexOf("async redirects()")).matchAll(/source: "([^"]+)"/g)].map((m) => new RegExp(`^${m[1].replace(/:[a-z]+\*?/g, ".+")}/?$`));
  const special = new Set(["/", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"]);
  const isPublic = (p: string) => fs.existsSync(path.join(ROOT, "public", p)) && fs.statSync(path.join(ROOT, "public", p)).isFile();
  const files: string[] = [];
  const collect = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) collect(f);
      else if (/\.(tsx?|mdx?)$/.test(e.name)) files.push(f);
    }
  };
  for (const d of ["app", "components", "lib"]) collect(path.join(ROOT, d));
  const broken: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/href(?:=|:\s*)["'](\/[^"'#?${}\s]*)/g)) {
      const href = m[1].replace(/\/$/, "") || "/";
      if (href.startsWith("//") || special.has(href) || isPublic(href)) continue;
      if (routes.some((r) => r.test(href)) || redirects.some((r) => r.test(href)) || REWRITES.some(([r]) => r.test(href))) continue;
      broken.push(`${path.relative(ROOT, f)} → ${href}`);
    }
  }
  assert.deepEqual(broken, [], `links to pages that do not exist:\n${broken.join("\n")}`);
});
