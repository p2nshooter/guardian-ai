/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — the built-in catalogue (playbooks, clause library, deadline rules)
 * in the member's language (docs/BLUEPRINT-V4.md §17A). English lives with the
 * data itself (playbook.ts, clauses.ts, deadlines.ts); every other language is a
 * separate module under lib/i18n-data/legal/ that is loaded only when that
 * language is in use, so the portal bundle does not carry ten copies.
 *
 * What is translated: names, sides, standard / fallback positions, notes,
 * clause wording, rule names, triggers and notes. What is not: statute
 * references (they are citations), red-flag phrases and automatic checks (they
 * read the contract as written) and the member's own playbooks and clauses.
 * Pure (the React hook is in use-catalog.ts).
 * ============================================================================ */
import type { Lang } from "@/lib/i18n-shared";
import { CLAUSE_TYPES, PLAYBOOKS, type ClauseType, type Playbook } from "./playbook";
import { CLAUSES, type LibraryClause } from "./clauses";
import { RULES, type Rule } from "./deadlines";

export interface LegalCatalog {
  clauseTypes: Record<ClauseType, string>;
  /** Per built-in playbook: name, our side and [standard, fallback] for each position, in order. */
  playbooks: Record<string, { name: string; side: string; positions: [string, string][] }>;
  /** Per built-in clause: name, drafting note and the wording of each variant (by variant id). */
  clauses: Record<string, { name: string; notes: string; variants: Record<string, string> }>;
  /** Per deadline rule: name, what starts the period, and the note (empty when the rule has none). */
  rules: Record<string, { name: string; trigger: string; note: string }>;
}

/** The English catalogue, read from the data itself. */
export const CATALOG_EN: LegalCatalog = {
  clauseTypes: Object.fromEntries(CLAUSE_TYPES.map((c) => [c.id, c.name])) as Record<ClauseType, string>,
  playbooks: Object.fromEntries(PLAYBOOKS.map((p) => [p.id, { name: p.name, side: p.side, positions: p.positions.map((x) => [x.standard, x.fallback] as [string, string]) }])),
  clauses: Object.fromEntries(CLAUSES.map((c) => [c.id, { name: c.name, notes: c.notes, variants: Object.fromEntries(c.variants.map((v) => [v.id, v.text])) }])),
  rules: Object.fromEntries(RULES.map((r) => [r.id, { name: r.name, trigger: r.trigger, note: r.note || "" }])),
};

type Other = Exclude<Lang, "en">;
const LOADERS: Record<Other, () => Promise<{ default: LegalCatalog }>> = {
  id: () => import("../i18n-data/legal/id"),
  ms: () => import("../i18n-data/legal/ms"),
  de: () => import("../i18n-data/legal/de"),
  fr: () => import("../i18n-data/legal/fr"),
  it: () => import("../i18n-data/legal/it"),
  zh: () => import("../i18n-data/legal/zh"),
  ja: () => import("../i18n-data/legal/ja"),
  hi: () => import("../i18n-data/legal/hi"),
  ar: () => import("../i18n-data/legal/ar"),
};
const cache: Partial<Record<Lang, LegalCatalog>> = { en: CATALOG_EN };
/** Already loaded (or English), without waiting. */
export const cachedLegalCatalog = (lang: Lang): LegalCatalog | undefined => cache[lang];

export async function loadLegalCatalog(lang: Lang): Promise<LegalCatalog> {
  if (cache[lang]) return cache[lang]!;
  try { cache[lang] = (await LOADERS[lang as Other]()).default; } catch { return CATALOG_EN; }
  return cache[lang]!;
}

/** A built-in playbook worded in the catalogue's language (the member's own playbooks are returned as they are). */
export function localPlaybook(pb: Playbook, cat: LegalCatalog): Playbook {
  const tr = cat.playbooks[pb.id];
  if (!tr) return pb;
  return { ...pb, name: tr.name, side: tr.side, positions: pb.positions.map((p, i) => ({ ...p, standard: tr.positions[i]?.[0] || p.standard, fallback: tr.positions[i]?.[1] || p.fallback })) };
}

/** A built-in clause worded in the catalogue's language (the member's own clauses are returned as they are). */
export function localClause<C extends LibraryClause>(c: C, cat: LegalCatalog): C {
  const tr = cat.clauses[c.id];
  if (!tr) return c;
  return { ...c, name: tr.name, notes: tr.notes, variants: c.variants.map((v) => ({ ...v, text: tr.variants[v.id] || v.text })) };
}

/** A deadline rule worded in the catalogue's language. */
export function localRule(r: Rule, cat: LegalCatalog): Rule {
  const tr = cat.rules[r.id];
  return tr ? { ...r, name: tr.name, trigger: tr.trigger, note: tr.note || undefined } : r;
}
