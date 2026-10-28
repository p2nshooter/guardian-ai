// The Orchestra AI copy (REQUESTS 115, BLUEPRINT-V4 §31): every language has every
// homepage line, the guide has the same steps in both languages, and the public
// catalogue makes no claim the code does not keep.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORCH_SPOT, orchGuide } from "../lib/orchestra-copy";
import { PRODUCT_CATALOG } from "../lib/product-catalog";
import { SH_TAGLINES } from "../lib/i18n-pages/shtaglines";

test("homepage spotlight: every language has every line, nothing empty", () => {
  const keys = Object.keys(ORCH_SPOT.en).sort();
  for (const lang of Object.keys(ORCH_SPOT)) {
    const got = Object.keys(ORCH_SPOT[lang as keyof typeof ORCH_SPOT]).sort();
    assert.deepEqual(got, keys, `keys of ${lang}`);
    for (const k of keys) assert.ok(String((ORCH_SPOT as unknown as Record<string, Record<string, string>>)[lang][k]).trim().length > 0, `${lang}.${k}`);
  }
});

test("usage guide: English and Indonesian have the same number of steps and screenshots", () => {
  const en = orchGuide("en");
  const id = orchGuide("id");
  assert.equal(id.steps.length, en.steps.length);
  assert.equal(id.what.length, en.what.length);
  assert.deepEqual(en.steps.map((s) => s.shot ?? ""), id.steps.map((s) => s.shot ?? ""));
  assert.equal(orchGuide("de").steps.length, en.steps.length, "other languages fall back to English");
});

test("the Orchestra tagline is translated in every language and no longer promises an endpoint", () => {
  for (const [lang, rows] of Object.entries(SH_TAGLINES)) {
    const line = rows.orchestra ?? "";
    assert.ok(line.length > 0, `${lang} tagline`);
    assert.doesNotMatch(line, /endpoint|Endpunkt|endpoint/i, `${lang} tagline`);
  }
});

test("public catalogue: no unsupported Orchestra claim (Grafana, global budget caps, drop-in)", () => {
  const o = PRODUCT_CATALOG.find((p) => p.slug === "orchestra");
  assert.ok(o, "orchestra entry");
  const text = JSON.stringify(o).toLowerCase();
  for (const bad of ["grafana", "budget cap", "drop-in", "single openai"]) {
    assert.ok(!text.includes(bad), `catalogue still says "${bad}"`);
  }
});

test("public catalogue and guide: the client API they describe is the one Orchestra serves", () => {
  const core = readFileSync(join(import.meta.dirname, "../../orchestra/orchestra_core/client_api.py"), "utf8");
  const text = JSON.stringify(PRODUCT_CATALOG.find((p) => p.slug === "orchestra")).toLowerCase()
    + JSON.stringify(orchGuide("en")).toLowerCase() + JSON.stringify(orchGuide("id")).toLowerCase();
  for (const path of ["/v1/chat/completions", "/v1/models"]) {
    if (text.includes(path)) assert.match(core, new RegExp(`@router\\.(get|post)\\("${path.replace(/\//g, "\\/")}"\\)`), `${path} is served`);
  }
  if (text.includes("monthly budget") || text.includes("anggaran bulanan")) assert.match(core, /budget_exceeded/);
  if (text.includes("rate limit") || text.includes("requests per minute")) assert.match(core, /rate_limit_exceeded/);
  // What the guide says is not supported really is refused.
  assert.match(core, /tools_not_supported/);
  assert.match(core, /only text content is supported/);
});
