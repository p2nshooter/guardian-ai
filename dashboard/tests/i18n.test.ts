/* AXTO — i18n consistency (node:test via tsx). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTRA_DICTS } from "../lib/i18n-dicts";
import { LANGS, LANG_CODES, isLang, dirOf } from "../lib/i18n-shared";

const tokens = (s: string) => (s.match(/\{(\w+)\}/g) || []).sort();
// Keys that carry placeholders and MUST keep them in every translated language.
const PLACEHOLDERS: Record<string, string[]> = {
  "plan.until": ["{date}"], "home.hello": ["{name}"], "billing.manualNote": ["{order}"],
  "billing.idr": ["{amount}"], "sh.included": ["{total}", "{used}"], "apps.locked": ["{plan}"],
  "auth.terms": ["{privacy}", "{terms}"],
};

test("i18n: 10 languages, unique codes, one RTL", () => {
  assert.equal(LANGS.length, 10);
  assert.equal(new Set(LANG_CODES).size, 10);
  assert.deepEqual(LANGS.filter((l) => l.dir === "rtl").map((l) => l.code), ["ar"]);
  assert.ok(isLang("de") && isLang("ar") && !isLang("xx"));
  assert.equal(dirOf("ar"), "rtl");
  assert.equal(dirOf("en"), "ltr");
  for (const l of LANGS) assert.ok(l.native && l.en, `${l.code} has names`);
});

test("i18n: every translated string keeps its placeholders", () => {
  for (const [code, dict] of Object.entries(EXTRA_DICTS)) {
    for (const [key, want] of Object.entries(PLACEHOLDERS)) {
      const v = (dict as Record<string, string>)[key];
      if (v === undefined) continue; // falls back to English — fine
      assert.deepEqual(tokens(v), want.slice().sort(), `${code}.${key} placeholders`);
    }
    // No accidental stray tokens like {foo} that EN never had.
    for (const [key, v] of Object.entries(dict as Record<string, string>)) {
      for (const tok of tokens(v)) {
        assert.ok(["{date}", "{name}", "{order}", "{amount}", "{total}", "{used}", "{plan}", "{terms}", "{privacy}"].includes(tok),
          `${code}.${key} has unexpected ${tok}`);
      }
    }
  }
});

test("i18n: the eight extra languages are present and non-trivial", () => {
  for (const c of ["de", "fr", "it", "ms", "zh", "ja", "hi", "ar"]) {
    const d = (EXTRA_DICTS as Record<string, Record<string, string>>)[c];
    assert.ok(d && Object.keys(d).length >= 100, `${c} has a full dictionary (${d ? Object.keys(d).length : 0} keys)`);
    assert.ok(d["nav.home"] && d["auth.signin"], `${c} has core keys`);
  }
});
