/* Legal AI catalogue translations: the English dictionary mirrors the source data
 * (workspaces, fields, areas, citation styles), Indonesian matches the bilingual
 * fields kept in the source, every language is really translated, and the
 * localised catalogue sent to the browser never carries server-only prompts.
 * Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGALWS } from "../lib/i18n-pages/legalws";
import { localizedCatalog } from "../lib/legal/catalog-i18n";
import { WORKSPACES, GROUPS } from "../lib/legal/workspaces";
import { AREAS } from "../lib/legal/areas";
import { CITATION_STYLES } from "../lib/legal/jurisdictions";
import { LANG_CODES, type Lang } from "../lib/i18n-shared";

const EN = LEGALWS.en;
const fieldKey = (ws: string, f: string) => (`${ws}:${f}` in EN.fields ? `${ws}:${f}` : f);

test("legal i18n: English mirrors the source data exactly", () => {
  for (const g of GROUPS) assert.equal((EN.groups as any)[g.id], g.name, `group ${g.id}`);
  for (const w of WORKSPACES) {
    const t = (EN.ws as any)[w.id];
    assert.ok(t, `workspace ${w.id} in the dictionary`);
    assert.equal(t.name, w.name, `${w.id}.name`);
    assert.equal(t.desc, w.desc, `${w.id}.desc`);
    assert.deepEqual(t.starters, w.starters.map((s) => s[0]), `${w.id}.starters`);
    for (const f of w.fields) {
      const lf = (EN.fields as any)[fieldKey(w.id, f.id)];
      assert.ok(lf, `${w.id}.${f.id} in the dictionary`);
      assert.equal(lf.label, f.label, `${w.id}.${f.id}.label`);
      assert.equal(lf.placeholder || "", f.placeholder || "", `${w.id}.${f.id}.placeholder`);
      for (const [v, label] of f.options || []) assert.equal(lf.options[v], label, `${w.id}.${f.id}.${v}`);
    }
  }
  assert.equal(Object.keys(EN.ws).length, WORKSPACES.length);
  for (const a of AREAS) { assert.equal((EN.areas as any)[a.id], a.name); assert.ok(a.group in EN.areaGroups, a.group); }
  for (const c of CITATION_STYLES) assert.equal((EN.citations as any)[c.id], c.name);
});

test("legal i18n: Indonesian agrees with the bilingual source fields", () => {
  const ID = LEGALWS.id;
  for (const w of WORKSPACES) {
    assert.equal((ID.ws as any)[w.id].name, w.nameId, `${w.id}.name`);
    assert.equal((ID.ws as any)[w.id].desc, w.descId, `${w.id}.desc`);
    for (const f of w.fields) assert.equal((ID.fields as any)[fieldKey(w.id, f.id)].label, f.labelId, `${w.id}.${f.id}`);
  }
  for (const a of AREAS) assert.equal((ID.areas as any)[a.id], a.nameId);
});

test("legal i18n: every language is translated, not copied from English", () => {
  for (const lang of LANG_CODES.filter((l) => l !== "en") as Lang[]) {
    const c = localizedCatalog(lang);
    const en = localizedCatalog("en");
    const same = c.workspaces.filter((w, i) => w.desc === en.workspaces[i].desc).map((w) => w.id);
    assert.deepEqual(same, [], `${lang}: workspace descriptions translated`);
    const labels = c.workspaces.flatMap((w) => w.fields.map((f) => f.label));
    const enLabels = en.workspaces.flatMap((w) => w.fields.map((f) => f.label));
    const copied = labels.filter((l, i) => l === enLabels[i]);
    assert.ok(copied.length <= 2, `${lang}: field labels translated (${copied.join(" | ")})`);
    const areaSame = c.areas.filter((a, i) => a.name === en.areas[i].name).length;
    assert.ok(areaSame <= 4, `${lang}: practice areas translated (${areaSame} identical)`);
    assert.ok(c.areas.every((a) => a.groupName), `${lang}: area groups labelled`);
    assert.equal(Object.keys(c.regions).length, 7);
  }
});

test("legal i18n: the localised catalogue never carries server-only prompts", () => {
  for (const lang of ["en", "de", "ar"] as Lang[]) {
    const json = JSON.stringify(localizedCatalog(lang));
    for (const w of WORKSPACES) assert.ok(!json.includes(w.method.slice(0, 60)), `${lang}: ${w.id} method stays on the server`);
    assert.ok(!json.includes('"method"') && !json.includes('"output"'));
  }
});
