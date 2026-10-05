/* Compliance Center catalogue (controls, domains, frameworks, policy templates,
 * sample programme) in all ten languages: every language covers every entry, is
 * really translated, and the reports and exports use the member's words.
 * Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMP_CATALOG_EN, localize, type CompCatalog } from "../lib/compliance/catalog";
import { LIBRARY, TOTAL_CONTROLS } from "../lib/compliance/controls";
import { POLICY_TEMPLATES } from "../lib/compliance/library";
import { controlsCsv, reportMarkdown, risksCsv, sampleWorkspace, soaMarkdown, REPORT_WORDS_EN } from "../lib/compliance/workspace";
import { L as COMPLIANCE } from "../lib/i18n-pages/compliance";
import { LANG_CODES } from "../lib/i18n-shared";
import id from "../lib/i18n-data/compliance/id";
import ms from "../lib/i18n-data/compliance/ms";
import de from "../lib/i18n-data/compliance/de";
import fr from "../lib/i18n-data/compliance/fr";
import it from "../lib/i18n-data/compliance/it";
import zh from "../lib/i18n-data/compliance/zh";
import ja from "../lib/i18n-data/compliance/ja";
import hi from "../lib/i18n-data/compliance/hi";
import ar from "../lib/i18n-data/compliance/ar";

const CATS: Record<string, CompCatalog> = { id, ms, de, fr, it, zh, ja, hi, ar };
const flat = (o: unknown, p = ""): [string, string][] =>
  Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v] as [string, string]] : flat(v, `${p}${k}.`)));

test("compliance catalogue: English mirrors the control library", () => {
  assert.equal(Object.keys(COMP_CATALOG_EN.controls).length, TOTAL_CONTROLS);
  assert.equal(Object.keys(COMP_CATALOG_EN.policies).length, POLICY_TEMPLATES.length);
  assert.ok(LIBRARY.uupdp.controls.every((c) => !/^(Hak|Pemberitahuan|Prinsip|Dasar|Perekaman)\b/.test(c.title)), "UU PDP titles are English in English");
});

test("compliance catalogue: every language covers every entry", () => {
  const en = flat(COMP_CATALOG_EN).map((x) => x[0]).sort();
  for (const [lang, c] of Object.entries(CATS)) {
    const tr = flat(c);
    assert.deepEqual(tr.map((x) => x[0]).sort(), en, `${lang}: same entries`);
    for (const [k, v] of tr) if (!k.endsWith(".description") || !k.startsWith("sample.risks.3")) assert.ok(v.trim().length > 0 || k === "sample.risks.3.description", `${lang} ${k} filled`);
  }
});

test("compliance catalogue: every language is really translated", () => {
  const en = new Map(flat(COMP_CATALOG_EN));
  for (const [lang, c] of Object.entries(CATS)) {
    const same = flat(c).filter(([k, v]) => v.length > 3 && en.get(k) === v).map(([k]) => k);
    assert.ok(same.length <= 15, `${lang}: ${same.length} entries identical to English: ${same.join(", ")}`);
    const controlsSame = same.filter((k) => k.startsWith("controls."));
    assert.ok(controlsSame.length <= 2, `${lang}: control titles left in English: ${controlsSame.join(", ")}`);
  }
});

test("compliance catalogue: localised library keeps identifiers and checks", () => {
  const L = localize(id);
  assert.equal(L.library.iso27001.controls.length, LIBRARY.iso27001.controls.length);
  assert.deepEqual(L.library.iso27001.controls.map((c) => c.id), LIBRARY.iso27001.controls.map((c) => c.id), "control IDs stay as published");
  assert.deepEqual(L.library.gdpr.controls.map((c) => c.themes), LIBRARY.gdpr.controls.map((c) => c.themes), "mapping themes unchanged");
  assert.equal(L.library.iso27001.controls[0].title, "Kebijakan keamanan informasi");
  assert.equal(L.library.uupdp.domains[0].name, "Hak subjek data (Bab IV)");
  assert.equal(L.policies.find((p) => p.id === "infosec")!.name, "Kebijakan Keamanan Informasi");
  assert.equal(L.policies[0].sections[0], "Tujuan");
  assert.equal(L.frameworks.find((f) => f.id === "iso27001")!.name, "ISO 27001", "framework short names stay as published");
  assert.equal(localize(COMP_CATALOG_EN).library, LIBRARY, "English is the source itself");
});

test("compliance catalogue: sample programme, reports and exports in the member's language", () => {
  const w = sampleWorkspace(localize(de).sample);
  assert.equal(w.org.name, "Nusantara Cloud (Beispiel)");
  assert.equal(w.risks[0].title, "Ransomware verschlüsselt die Produktionsdatenbank");
  assert.equal(w.controls["iso27001:A.7.1"].justification, de.sample.physicalNa);
  const T = COMPLIANCE.de;
  const o = { lib: localize(de).library, words: { ...T.rep, statuses: T.statuses, levels: T.levels, treatments: T.treatments, riskStatuses: T.riskStatuses, policyStatuses: T.policyStatuses, dataAccess: T.data, categories: T.categories } };
  const md = reportMarkdown(w, "2026-10-05", o);
  assert.match(md, /^# Compliance-Bereitschaft — Nusantara Cloud \(Beispiel\)/);
  assert.match(md, /\| Organisatorische Maßnahmen \|/);
  assert.match(soaMarkdown(w, o), /\| A\.5\.1 \| Informationssicherheitsrichtlinien \| Ja \|/);
  assert.match(controlsCsv(w, o).split("\n")[0], /^Rahmenwerk,Kontrolle,Titel/);
  assert.match(risksCsv(w, o), /Ransomware verschlüsselt/);
  // English stays the default
  assert.match(reportMarkdown(sampleWorkspace(), "2026-10-05"), /^# Compliance readiness — Nusantara Cloud \(sample\)/);
  for (const lang of LANG_CODES) assert.deepEqual(Object.keys(COMPLIANCE[lang].rep).sort(), Object.keys(REPORT_WORDS_EN).filter((k) => typeof (REPORT_WORDS_EN as any)[k] === "string").sort(), `${lang} report words`);
});
