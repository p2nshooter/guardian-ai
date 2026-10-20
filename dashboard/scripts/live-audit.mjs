/* ==============================================================================
 * AXTO — live audit of the production site, in a real browser.
 *
 *   node live-audit.mjs [https://axto.io]
 *
 * Read-only: it only fetches public pages and public JSON. It checks what a
 * visitor and Google actually get:
 *   1. /api/health — the build, the bindings and that the secrets are present
 *   2. /api/billing/options — which payment methods are on and whether any of
 *      them still runs on its sandbox (shown to buyers as TEST MODE)
 *   3. robots.txt, ads.txt, sitemap.xml
 *   4. every sitemap URL: HTTP status, title, description, canonical, JSON-LD,
 *      one h1, the AdSense meta tag, no accidental noindex, unique titles
 *   5. every internal link found on those pages answers (no broken links)
 *   6. the key pages in Chromium on desktop and on a phone: no console error,
 *      no page error, no failed request to the site, no sideways scrolling
 * Prints a report and writes live-audit.json. Exits 1 when anything failed.
 * ============================================================================ */
import { writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";

const BASE = (process.argv[2] || "https://axto.io").replace(/\/$/, "");
// The site's canonical origin. Differs from BASE only when auditing a local or
// preview build of it: URLs on SITE are then fetched from BASE.
const SITE = (process.env.SITE || BASE).replace(/\/$/, "");
const HOST = new URL(BASE).host;
const SITE_HOST = new URL(SITE).host;
const local = (u) => (u.startsWith(SITE) ? BASE + u.slice(SITE.length) : u);
const ADSENSE = "ca-pub-6908951782430508";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 axto-live-audit";
const problems = [];
const report = { base: BASE, at: new Date().toISOString() };
const fail = (where, what) => problems.push({ where, what });

async function get(path, opts = {}) {
  const url = path.startsWith("http") ? path : BASE + path;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, ...(opts.headers || {}) }, redirect: opts.redirect || "follow", signal: AbortSignal.timeout(30000) });
      const body = opts.head ? "" : await res.text();
      return { status: res.status, url: res.url, headers: res.headers, body };
    } catch (e) {
      if (attempt === 2) return { status: 0, url, headers: new Headers(), body: "", error: String(e) };
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const attr = (html, re) => (html.match(re) || [])[1]?.trim() ?? null;
const decode = (s) => s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? null;

/* 1. health ------------------------------------------------------------------ */
{
  const r = await get("/api/health");
  let h = null;
  try { h = JSON.parse(r.body); } catch {}
  report.health = h ?? { status: r.status };
  if (!h?.ok) fail("/api/health", `not ok (HTTP ${r.status})`);
  for (const [k, v] of Object.entries(h?.secrets ?? {})) if (!v) fail("/api/health", `secret ${k} is missing`);
  for (const [k, v] of Object.entries(h?.bindings ?? {})) if (!v) fail("/api/health", `binding ${k} is missing`);
}

/* 2. payments ---------------------------------------------------------------- */
{
  const r = await get("/api/billing/options");
  let o = null;
  try { o = JSON.parse(r.body); } catch {}
  report.payments = o ? { gateways: o.gateways, plans: o.plans, lifetimeGateways: o.lifetime?.gateways } : { status: r.status };
  if (!o) fail("/api/billing/options", `no JSON (HTTP ${r.status})`);
  else {
    if (!o.gateways?.length) fail("payments", "no payment method is switched on");
    for (const g of o.gateways ?? []) if (g.test) fail("payments", `${g.label} (${g.id}) runs on its SANDBOX — buyers see TEST MODE`);
  }
}

/* 3. robots, ads.txt, sitemap ------------------------------------------------ */
const robots = await get("/robots.txt");
report.robots = robots.status;
if (robots.status !== 200) fail("/robots.txt", `HTTP ${robots.status}`);
if (!/sitemap:\s*https?:\/\//i.test(robots.body)) fail("/robots.txt", "no Sitemap line");
if (/^disallow:\s*\/\s*$/im.test(robots.body)) fail("/robots.txt", "Disallow: / blocks the whole site");
const ads = await get("/ads.txt");
report.adsTxt = ads.body.trim();
if (!ads.body.includes(`google.com, ${ADSENSE.replace("ca-", "")}, DIRECT, f08c47fec0942fa0`)) fail("/ads.txt", `does not declare ${ADSENSE}`);
const sm = await get("/sitemap.xml");
const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
report.sitemapUrls = urls.length;
if (sm.status !== 200 || !urls.length) fail("/sitemap.xml", `HTTP ${sm.status}, ${urls.length} URLs`);
for (const u of urls) if (new URL(u).host !== SITE_HOST) fail("/sitemap.xml", `URL on another host: ${u}`);

/* 4. every sitemap URL ------------------------------------------------------- */
const links = new Map();   // internal path → first page that links to it
const titles = new Map();
const pages = await pool(urls, 8, async (u) => {
  const r = await get(local(u));
  const html = r.body;
  const p = {
    url: u, status: r.status,
    title: decode(attr(html, /<title[^>]*>([^<]*)<\/title>/i)),
    description: decode(attr(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i)),
    canonical: decode(attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)),
    jsonld: (html.match(/<script[^>]+type="application\/ld\+json"/gi) || []).length,
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    adsense: attr(html, /<meta[^>]+name="google-adsense-account"[^>]+content="([^"]*)"/i),
    noindex: /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html),
  };
  const where = new URL(u).pathname;
  if (r.status !== 200) fail(where, `HTTP ${r.status}${r.error ? " " + r.error : ""}`);
  else {
    if (!p.title) fail(where, "no <title>");
    if (!p.description) fail(where, "no meta description");
    else if (p.description.length < 50) fail(where, `meta description only ${p.description.length} characters`);
    if (!p.canonical) fail(where, "no canonical");
    else if (p.canonical.replace(/\/$/, "") !== u.replace(/\/$/, "")) fail(where, `canonical points elsewhere: ${p.canonical}`);
    if (!p.jsonld) fail(where, "no JSON-LD");
    if (p.h1 !== 1) fail(where, `${p.h1} <h1> elements (expected 1)`);
    if (p.adsense !== ADSENSE) fail(where, `AdSense meta ${p.adsense ?? "missing"}`);
    if (p.noindex) fail(where, "noindex on a page listed in the sitemap");
    if (p.title) titles.set(p.title, [...(titles.get(p.title) || []), where]);
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const path = decode(m[1]);
    if (/^\/(_next|cdn-cgi|api)\//.test(path) || /\.(png|jpe?g|webp|svg|ico|css|js|xml|txt|webmanifest|json|pdf|zip|gz|exe|msi)$/i.test(path)) continue;
    if (!links.has(path)) links.set(path, where);
  }
  return p;
});
report.pages = pages;
for (const [t, where] of titles) if (where.length > 1) fail(where.join(", "), `same <title> on ${where.length} pages: "${t}"`);

/* 5. internal links ---------------------------------------------------------- */
const inSitemap = new Set(urls.map((u) => new URL(u).pathname.replace(/\/$/, "") || "/"));
const toCheck = [...links.keys()].filter((p) => !inSitemap.has(p.replace(/\/$/, "") || "/"));
report.linksChecked = toCheck.length;
await pool(toCheck, 8, async (path) => {
  const r = await get(path);
  // Sign-in pages may redirect; anything that ends in 4xx/5xx is broken.
  if (r.status >= 400 || r.status === 0) fail(path, `broken link (HTTP ${r.status}), linked from ${links.get(path)}`);
});

/* 6. real browser, desktop + phone ------------------------------------------ */
const KEY = ["/", "/pricing", "/apps", "/apps/clipper", "/apps/legal", "/self-hosted", "/self-hosted/guardian", "/self-hosted/guardian/guide",
  "/acquire", "/invest", "/prompts", "/legal-ai", "/blog", "/help", "/developers", "/about", "/contact", "/status", "/login", "/signup"];
const browser = await chromium.launch();
report.browser = [];
for (const [label, ctxOpts] of [["desktop", { viewport: { width: 1366, height: 900 } }], ["phone", { ...devices["iPhone 13"] }]]) {
  const ctx = await browser.newContext({ ...ctxOpts, userAgent: (ctxOpts.userAgent || UA) + " axto-live-audit" });
  for (const path of KEY) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => errors.push(`page error: ${String(e).slice(0, 200)}`));
    page.on("requestfailed", (r) => { if (new URL(r.url()).host === HOST && !/aborted/i.test(r.failure()?.errorText || "")) errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`); });
    page.on("response", (r) => { if (new URL(r.url()).host === HOST && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
    let status = 0, overflow = 0, testMode = false;
    try {
      const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(800);
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      testMode = await page.evaluate(() => /TEST MODE|MODE UJI|SANDBOX/i.test(document.body.innerText));
    } catch (e) {
      errors.push(`navigation: ${String(e).slice(0, 200)}`);
    }
    const row = { device: label, path, status, overflow, testMode, errors };
    report.browser.push(row);
    if (status !== 200) fail(`${label} ${path}`, `HTTP ${status}`);
    if (overflow > 1) fail(`${label} ${path}`, `page scrolls sideways by ${overflow}px`);
    if (testMode) fail(`${label} ${path}`, "the page shows TEST MODE / sandbox");
    for (const e of errors) fail(`${label} ${path}`, e);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

/* report --------------------------------------------------------------------- */
report.problems = problems;
writeFileSync("live-audit.json", JSON.stringify(report, null, 2));
const h = report.health || {};
console.log(`\n=== ${BASE} — ${report.at}`);
console.log(`build ${h.build} · version ${h.version} · bindings ${JSON.stringify(h.bindings)} · secrets ${JSON.stringify(h.secrets)}`);
console.log(`payment methods on: ${(report.payments?.gateways || []).map((g) => `${g.label}${g.test ? " [SANDBOX]" : " [LIVE]"}`).join(", ") || "none"}`);
console.log(`sitemap ${report.sitemapUrls} URLs · ${report.linksChecked} other internal links checked · ${report.browser.length} browser page loads`);
const okPages = pages.filter((p) => p.status === 200).length;
console.log(`pages answering 200: ${okPages}/${pages.length}`);
console.log(`\nPROBLEMS: ${problems.length}`);
const grouped = new Map();
for (const p of problems) grouped.set(p.what.replace(/\d+/g, "#").slice(0, 60), [...(grouped.get(p.what.replace(/\d+/g, "#").slice(0, 60)) || []), p]);
for (const [, list] of [...grouped].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n- ${list[0].what}  (×${list.length})`);
  for (const p of list.slice(0, 12)) console.log(`    ${p.where}: ${p.what}`);
  if (list.length > 12) console.log(`    … ${list.length - 12} more`);
}
process.exit(problems.length ? 1 : 0);
