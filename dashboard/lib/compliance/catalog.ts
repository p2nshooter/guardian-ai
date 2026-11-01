/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER — the built-in catalogue in the member's language
 * (docs/BLUEPRINT-V4.md §17A): framework descriptions, AI modes, domain names,
 * control titles, policy templates (name, purpose, sections) and the sample
 * programme (the vendor questionnaire is in lib/i18n-pages/compliance.ts). English lives with the data itself;
 * every other language is a module under lib/i18n-data/compliance/ loaded only
 * when that language is in use.
 *
 * Control identifiers, framework names (ISO 27001, SOC 2 …) and version labels
 * stay as published. The member's own programme content is never changed.
 * Pure (the React side is components/compliance/catalog-context.tsx).
 * ============================================================================ */
import type { Lang } from "@/lib/i18n-shared";
import { FRAMEWORKS, COMP_MODES, type FrameworkId, type CompMode } from "./frameworks";
import { LIBRARY, type FrameworkControls } from "./controls";
import { POLICY_TEMPLATES, type PolicyTemplate } from "./library";
import { SAMPLE_EN, type SampleText } from "./sample-text";
export type { SampleText };

export interface CompCatalog {
  /** Framework long name and one-line description (the short name, e.g. "ISO 27001", stays as published). */
  frameworks: Record<FrameworkId, { full: string; blurb: string }>;
  /** One-line description of each AI mode (the mode names are in the page dictionary). */
  modeBlurbs: Record<CompMode, string>;
  /** "framework:domainId" → name */
  domains: Record<string, string>;
  notes: Record<FrameworkId, string>;
  /** "framework:controlId" → title */
  controls: Record<string, string>;
  policies: Record<string, { name: string; purpose: string }>;
  /** English section heading → translated heading */
  sections: Record<string, string>;
  sample: SampleText;
}

const sectionsEn = () => { const o: Record<string, string> = {}; for (const p of POLICY_TEMPLATES) for (const s of p.sections) o[s] = s; return o; };

/** The English catalogue, read from the data itself. */
export const COMP_CATALOG_EN: CompCatalog = {
  frameworks: Object.fromEntries(FRAMEWORKS.map((f) => [f.id, { full: f.full, blurb: f.blurb }])) as CompCatalog["frameworks"],
  modeBlurbs: Object.fromEntries(COMP_MODES.map((m) => [m.id, m.blurb])) as CompCatalog["modeBlurbs"],
  domains: Object.fromEntries(Object.entries(LIBRARY).flatMap(([fw, L]) => L.domains.map((d) => [`${fw}:${d.id}`, d.name]))),
  notes: Object.fromEntries(Object.entries(LIBRARY).map(([fw, L]) => [fw, L.note])) as CompCatalog["notes"],
  controls: Object.fromEntries(Object.entries(LIBRARY).flatMap(([fw, L]) => L.controls.map((c) => [`${fw}:${c.id}`, c.title]))),
  policies: Object.fromEntries(POLICY_TEMPLATES.map((p) => [p.id, { name: p.name, purpose: p.purpose }])),
  sections: sectionsEn(),
  sample: SAMPLE_EN,
};

type Other = Exclude<Lang, "en">;
const LOADERS: Record<Other, () => Promise<{ default: CompCatalog }>> = {
  id: () => import("../i18n-data/compliance/id"),
  ms: () => import("../i18n-data/compliance/ms"),
  de: () => import("../i18n-data/compliance/de"),
  fr: () => import("../i18n-data/compliance/fr"),
  it: () => import("../i18n-data/compliance/it"),
  zh: () => import("../i18n-data/compliance/zh"),
  ja: () => import("../i18n-data/compliance/ja"),
  hi: () => import("../i18n-data/compliance/hi"),
  ar: () => import("../i18n-data/compliance/ar"),
};
const cache: Partial<Record<Lang, CompCatalog>> = { en: COMP_CATALOG_EN };
export const cachedCompCatalog = (lang: Lang): CompCatalog | undefined => cache[lang];
export async function loadCompCatalog(lang: Lang): Promise<CompCatalog> {
  if (cache[lang]) return cache[lang]!;
  try { cache[lang] = (await LOADERS[lang as Other]()).default; } catch { return COMP_CATALOG_EN; }
  return cache[lang]!;
}

/** Everything the screens show, worded in the catalogue's language. */
export interface CompLocal {
  library: Record<FrameworkId, FrameworkControls>;
  frameworks: typeof FRAMEWORKS;
  modes: typeof COMP_MODES;
  policies: PolicyTemplate[];
  sample: SampleText;
}
export function localize(cat: CompCatalog): CompLocal {
  if (cat === COMP_CATALOG_EN) return { library: LIBRARY, frameworks: FRAMEWORKS, modes: COMP_MODES, policies: POLICY_TEMPLATES, sample: SAMPLE_EN };
  const library = Object.fromEntries(Object.entries(LIBRARY).map(([fw, L]) => [fw, {
    ...L, note: cat.notes[fw as FrameworkId] || L.note,
    domains: L.domains.map((d) => ({ ...d, name: cat.domains[`${fw}:${d.id}`] || d.name })),
    controls: L.controls.map((c) => ({ ...c, title: cat.controls[`${fw}:${c.id}`] || c.title })),
  }])) as Record<FrameworkId, FrameworkControls>;
  return {
    library,
    frameworks: FRAMEWORKS.map((f) => ({ ...f, ...cat.frameworks[f.id] })),
    modes: COMP_MODES.map((m) => ({ ...m, blurb: cat.modeBlurbs[m.id] || m.blurb })),
    policies: POLICY_TEMPLATES.map((p) => ({ ...p, name: cat.policies[p.id]?.name || p.name, purpose: cat.policies[p.id]?.purpose || p.purpose, sections: p.sections.map((x) => cat.sections[x] || x) })),
    sample: cat.sample,
  };
}
