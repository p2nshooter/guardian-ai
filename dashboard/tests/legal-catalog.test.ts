/* Legal AI tools catalogue (playbooks, clause library, deadline rules) in all ten
 * languages: every language covers every entry, keeps the clause placeholders,
 * is really translated, and the playbook findings can be worded in each language.
 * Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_EN, localClause, localPlaybook, localRule, type LegalCatalog } from "../lib/legal/catalog";
import { CLAUSES } from "../lib/legal/clauses";
import { PLAYBOOKS, review, issuesText, ISSUE_EN, findingsMarkdown, REPORT_EN } from "../lib/legal/playbook";
import { RULES } from "../lib/legal/deadlines";
import { LT } from "../lib/i18n-pages/legaltools";
import { LANG_CODES, type Lang } from "../lib/i18n-shared";
import id from "../lib/i18n-data/legal/id";
import ms from "../lib/i18n-data/legal/ms";
import de from "../lib/i18n-data/legal/de";
import fr from "../lib/i18n-data/legal/fr";
import it from "../lib/i18n-data/legal/it";
import zh from "../lib/i18n-data/legal/zh";
import ja from "../lib/i18n-data/legal/ja";
import hi from "../lib/i18n-data/legal/hi";
import ar from "../lib/i18n-data/legal/ar";

const CATS: Record<Exclude<Lang, "en">, LegalCatalog> = { id, ms, de, fr, it, zh, ja, hi, ar };
const brackets = (s: string) => Array.from(s.matchAll(/\[([^\[\]]{1,120})\]/g)).length;
/** Every string of a catalogue, with its path, in a stable order. */
function strings(c: LegalCatalog): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(c.clauseTypes)) out.push([`type.${k}`, v]);
  for (const [k, p] of Object.entries(c.playbooks)) { out.push([`pb.${k}.name`, p.name], [`pb.${k}.side`, p.side]); p.positions.forEach(([a, b], i) => out.push([`pb.${k}.${i}.std`, a], [`pb.${k}.${i}.fb`, b])); }
  for (const [k, x] of Object.entries(c.clauses)) { out.push([`cl.${k}.name`, x.name], [`cl.${k}.notes`, x.notes]); for (const [v, t] of Object.entries(x.variants)) out.push([`cl.${k}.${v}`, t]); }
  for (const [k, r] of Object.entries(c.rules)) out.push([`rule.${k}.name`, r.name], [`rule.${k}.trigger`, r.trigger], [`rule.${k}.note`, r.note]);
  return out;
}

test("legal catalogue: English mirrors the source data", () => {
  assert.equal(Object.keys(CATALOG_EN.playbooks).length, PLAYBOOKS.length);
  assert.equal(Object.keys(CATALOG_EN.clauses).length, CLAUSES.length);
  assert.equal(Object.keys(CATALOG_EN.rules).length, RULES.length);
  assert.ok(RULES.every((r) => !/^(Banding|Kasasi|Peninjauan|Verzet|Gugatan|Pemberitahuan|Daluwarsa)\b/.test(r.name)), "English rule names are in English");
});

test("legal catalogue: every language covers every entry with the same shape", () => {
  const en = strings(CATALOG_EN);
  for (const [lang, c] of Object.entries(CATS)) {
    const tr = strings(c);
    assert.deepEqual(tr.map((x) => x[0]), en.map((x) => x[0]), `${lang}: same entries in the same order`);
    tr.forEach(([path, v], i) => {
      const src = en[i][1];
      if (src === "" || src === "—") assert.equal(v, src, `${lang} ${path} keeps "${src}"`);
      else assert.ok(v.trim().length > 0, `${lang} ${path} is filled`);
      if (path.startsWith("cl.") && !path.endsWith(".name") && !path.endsWith(".notes")) assert.equal(brackets(v), brackets(src), `${lang} ${path} keeps its [placeholders]`);
    });
  }
});

test("legal catalogue: every language is really translated", () => {
  const en = strings(CATALOG_EN);
  for (const [lang, c] of Object.entries(CATS)) {
    const tr = strings(c);
    const same = tr.filter(([p, v], i) => v === en[i][1] && v !== "" && v !== "—").map(([p]) => p);
    assert.ok(same.length <= 3, `${lang}: ${same.length} entries identical to English: ${same.join(", ")}`);
  }
});

test("legal catalogue: built-in playbooks, clauses and rules are worded in the member's language", () => {
  const nda = localPlaybook(PLAYBOOKS[0], id);
  assert.equal(nda.name, "NDA timbal balik");
  assert.equal(nda.positions.length, PLAYBOOKS[0].positions.length);
  assert.deepEqual(nda.positions.map((p) => p.redFlags), PLAYBOOKS[0].positions.map((p) => p.redFlags), "checks read the contract as written");
  const own = { ...PLAYBOOKS[0], id: "pb-mine", name: "Mine" };
  assert.equal(localPlaybook(own, id), own, "the member's own playbook is left as written");
  const conf = localClause(CLAUSES[0], de);
  assert.equal(conf.name, "Vertraulichkeit");
  assert.match(conf.variants[0].text, /\[3\] Jahre/);
  const banding = localRule(RULES.find((r) => r.id === "id-banding-perdata")!, id);
  assert.equal(banding.name, "Banding (perkara perdata)");
  assert.equal(banding.source, RULES.find((r) => r.id === "id-banding-perdata")!.source, "statute citation is unchanged");
});

test("legal catalogue: playbook findings are worded in every language", () => {
  const doc = "1. Term\nThis Agreement shall remain in force for a period of 10 years.\n\n2. Governing law\nThis Agreement is governed by the laws of New York.";
  const { findings } = review(doc, PLAYBOOKS[0], id.clauseTypes);
  const term = findings.find((f) => f.clause === "term")!;
  assert.equal(term.name, "Jangka waktu");
  assert.deepEqual(term.issues[0], { code: "maxYears", v: 10, limit: 5 });
  assert.equal(issuesText(term.issues, LT.id.playbook.msg), "Jangka waktu 10 tahun melebihi 5");
  assert.equal(term.detail, issuesText(term.issues, ISSUE_EN), "English detail kept for compatibility");
  for (const lang of LANG_CODES) {
    const m = LT[lang].playbook.msg;
    for (const [code, en] of Object.entries(ISSUE_EN)) {
      for (const ph of en.match(/\{\w+\}/g) || []) assert.ok((m as any)[code].includes(ph), `${lang} msg.${code} keeps ${ph}`);
    }
    const r = LT[lang].playbook.report;
    assert.deepEqual(Object.keys(r).sort(), Object.keys(REPORT_EN).filter((k) => !["notAdvice", "statuses", "severities"].includes(k)).sort(), `${lang} report labels`);
  }
  const md = findingsMarkdown(findings, "NDA", { ...LT.fr.playbook.report, notAdvice: LT.fr.notAdvice, statuses: LT.fr.playbook.status, severities: LT.fr.playbook.severity }, (f) => issuesText(f.issues, LT.fr.playbook.msg));
  assert.match(md, /Revue du playbook — NDA/);
  assert.match(md, /Durée de 10 ans supérieure à 5/);
});
