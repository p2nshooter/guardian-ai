/* AXTO — every page dictionary (lib/i18n-pages/*) is complete in all 10
 * portal languages: same keys as English, same array shapes, same {placeholders}.
 * A missing translation would otherwise fall back to English and leave a
 * mixed-language screen. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LANG_CODES } from "../lib/i18n-shared";

const DIR = path.resolve(import.meta.dirname, "../lib/i18n-pages");
const tokens = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(",");

function sameShape(en: unknown, other: unknown, where: string) {
  if (typeof en === "string") {
    assert.equal(typeof other, "string", `${where} must be a string`);
    assert.ok((other as string).trim() || !en.trim(), `${where} is empty`);
    assert.equal(tokens(other as string), tokens(en), `${where} placeholders`);
    return;
  }
  if (Array.isArray(en)) {
    assert.ok(Array.isArray(other), `${where} must be an array`);
    assert.equal((other as unknown[]).length, en.length, `${where} length`);
    en.forEach((v, i) => sameShape(v, (other as unknown[])[i], `${where}[${i}]`));
    return;
  }
  if (en && typeof en === "object") {
    assert.ok(other && typeof other === "object", `${where} must be an object`);
    assert.deepEqual(Object.keys(other as object).sort(), Object.keys(en).sort(), `${where} keys`);
    for (const k of Object.keys(en)) sameShape((en as any)[k], (other as any)[k], `${where}.${k}`);
  }
}

test("page dictionaries: every module is complete in all 10 languages", async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 17, `found ${files.length} dictionaries`);
  for (const f of files) {
    const mod = await import(path.join(DIR, f));
    for (const [name, dict] of Object.entries(mod) as [string, Record<string, unknown>][]) {
      assert.deepEqual(Object.keys(dict).sort(), [...LANG_CODES].sort(), `${f}:${name} languages`);
      for (const lang of LANG_CODES) if (lang !== "en") sameShape(dict.en, dict[lang], `${f}:${name}.${lang}`);
    }
  }
});
