/* ==============================================================================
 * Legal AI catalogue in the member's language (served by /api/legal/catalog).
 * Labels come from lib/i18n-pages/legalws.ts (10 languages); the English data
 * in workspaces.ts / areas.ts / jurisdictions.ts stays the source of truth and
 * the fallback. Server-only: the browser receives just the one language.
 * ============================================================================ */
import type { Lang } from "../i18n-shared";
import { LEGALWS } from "../i18n-pages/legalws";
import { publicWorkspaces, GROUPS } from "./workspaces";
import { AREAS } from "./areas";
import { CITATION_STYLES, COUNTRIES } from "./jurisdictions";

export interface CatField { id: string; label: string; type: "text" | "textarea" | "select"; placeholder?: string; options?: [string, string][] }
export interface CatWorkspace { id: string; group: string; icon: string; core: boolean; name: string; nameEn: string; desc: string; docs: string; fields: CatField[]; starters: string[] }

export function localizedCatalog(lang: Lang) {
  const L = LEGALWS[lang] || LEGALWS.en;
  const fieldKey = (ws: string, f: string) => (`${ws}:${f}` in LEGALWS.en.fields ? `${ws}:${f}` : f);
  const workspaces: CatWorkspace[] = publicWorkspaces().map((w) => {
    const t = (L.ws as Record<string, { name: string; desc: string; starters: string[] }>)[w.id];
    return {
      id: w.id, group: w.group, icon: w.icon, core: w.core, docs: w.docs,
      name: t?.name || w.name, nameEn: w.name, desc: t?.desc || w.desc,
      starters: t?.starters?.length === w.starters.length ? t.starters : w.starters.map((s) => s[0]),
      fields: w.fields.map((f) => {
        const lf = (L.fields as Record<string, { label: string; placeholder?: string; options?: Record<string, string> }>)[fieldKey(w.id, f.id)];
        return {
          id: f.id, type: f.type, label: lf?.label || f.label,
          ...(f.placeholder ? { placeholder: lf?.placeholder || f.placeholder } : {}),
          ...(f.options ? { options: f.options.map(([v, en]) => [v, lf?.options?.[v] || en] as [string, string]) } : {}),
        };
      }),
    };
  });
  const areaGroups = L.areaGroups as Record<string, string>;
  return {
    groups: GROUPS.map((g) => ({ id: g.id, name: (L.groups as Record<string, string>)[g.id] || g.name })),
    workspaces,
    areas: AREAS.map((a) => ({ id: a.id, name: (L.areas as Record<string, string>)[a.id] || a.name, nameEn: a.name, group: a.group, groupName: areaGroups[a.group] || a.group })),
    countries: COUNTRIES.map((c) => ((L.special as Record<string, string>)[c.code] ? { ...c, name: (L.special as Record<string, string>)[c.code] } : c)),
    citationStyles: CITATION_STYLES.map((c) => ({ id: c.id, name: (L.citations as Record<string, string>)[c.id] || c.name })),
    regions: L.regions as Record<string, string>,
  };
}
