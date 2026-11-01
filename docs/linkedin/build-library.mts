// ==============================================================================
// Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
// ==============================================================================
// The images of the LinkedIn auto-post library (REQUESTS 123, BLUEPRINT-V4 §35):
// one 1200×627 card per post in dashboard/lib/linkedin/library.ts, written to
// dashboard/public/social/linkedin/<brand>/<id>.jpg, where the daily poster reads
// them. Same design as the page kit (templates.mjs).
//   cd dashboard && npx tsx ../docs/linkedin/build-library.mts
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// @ts-ignore — plain ES module shared with build-kit.mjs
import { card } from "./templates.mjs";
import { LIBRARY, BRAND_SITES } from "../../dashboard/lib/linkedin/library.ts";

const require = createRequire(import.meta.url);
let chromium: any;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../dashboard/public/social/linkedin");

const browser = await chromium.launch();
const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
await page.setViewportSize({ width: 1200, height: 627 });
const keep = new Set<string>();
let bytes = 0;
for (const p of LIBRARY) {
  const dir = join(OUT, p.brand);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${p.id}.jpg`);
  const cta = `${BRAND_SITES[p.brand].replace(/^https:\/\//, "")}${p.path === "/" ? "" : p.path}`;
  await page.setContent(card(p.brand, { ...p.image, cta, large: true, mark: !p.image.big, titleSize: p.image.title.replace(/<[^>]+>/g, "").length > 40 ? 50 : 58 }), { waitUntil: "load" });
  await page.waitForTimeout(80);
  await page.screenshot({ path: file, type: "jpeg", quality: 86, clip: { x: 0, y: 0, width: 1200, height: 627 } });
  keep.add(file);
  bytes += statSync(file).size;
}
await browser.close();
// Images of posts that left the library go too.
for (const b of readdirSync(OUT)) for (const f of readdirSync(join(OUT, b))) if (!keep.has(join(OUT, b, f))) rmSync(join(OUT, b, f));
console.log(`${keep.size} images, ${(bytes / 1048576).toFixed(1)} MB → ${OUT}`);
