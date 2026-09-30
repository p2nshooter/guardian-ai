/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PROMPT LIBRARY v4 — the member's own library, kept in ONE encrypted history
 * item: custom prompts ({{variables}}), collections, favourites, workflows
 * (chains of steps where {{previous}} is the last step's output) and variable
 * profiles that fill matching {{variables}} automatically. Runs are saved as
 * separate history items. Pure: no React, no server imports.
 * ============================================================================ */

export const STATE_ID = "prompts-state-v4";
/** A reference to a prompt: "c:<catalogue id>" or "u:<custom id>". */
export type Ref = `c:${string}` | `u:${string}`;
export interface CustomPrompt { id: string; title: string; field: string; body: string; notes: string; createdAt: string; updatedAt: string }
export interface Collection { id: string; name: string; items: Ref[] }
export interface ChainStep { id: string; title: string; ref?: Ref; text?: string; values?: Record<string, string> }
export interface Chain { id: string; name: string; steps: ChainStep[] }
export interface Profile { id: string; name: string; values: Record<string, string> }
export interface LibraryState { v: 4; custom: CustomPrompt[]; collections: Collection[]; favorites: Ref[]; chains: Chain[]; profiles: Profile[]; activeProfile: string }

export const newId = (p = "x") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const emptyState = (): LibraryState => ({ v: 4, custom: [], collections: [], favorites: [], chains: [], profiles: [{ id: "default", name: "Default", values: {} }], activeProfile: "default" });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const isRef = (x: unknown): x is Ref => typeof x === "string" && /^[cu]:[A-Za-z0-9_-]{1,60}$/.test(x);
const vals = (o: unknown) => Object.fromEntries(Object.entries(o && typeof o === "object" ? (o as Record<string, unknown>) : {}).filter(([k]) => /^\w{1,40}$/.test(k)).slice(0, 80).map(([k, v]) => [k, str(v, 4000)]));

/** Accept anything (stored state, an imported file) and return a valid state. */
export function sanitizeState(b: any): LibraryState {
  const s = emptyState();
  if (!b || typeof b !== "object") return s;
  const custom = Array.isArray(b.custom) ? b.custom.filter((p: any) => p && typeof p.body === "string").slice(0, 500).map((p: any): CustomPrompt => ({
    id: str(p.id, 40) || newId("u"), title: str(p.title, 120) || "Untitled prompt", field: str(p.field, 40), body: str(p.body, 20000), notes: str(p.notes, 2000),
    createdAt: str(p.createdAt, 30) || new Date().toISOString(), updatedAt: str(p.updatedAt, 30) || new Date().toISOString() })) : [];
  const profiles = Array.isArray(b.profiles) ? b.profiles.filter((p: any) => p && typeof p.name === "string").slice(0, 20).map((p: any): Profile => ({ id: str(p.id, 40) || newId("pf"), name: str(p.name, 60), values: vals(p.values) })) : [];
  return {
    v: 4, custom,
    collections: Array.isArray(b.collections) ? b.collections.filter((c: any) => c && typeof c.name === "string").slice(0, 100).map((c: any): Collection => ({ id: str(c.id, 40) || newId("col"), name: str(c.name, 80), items: Array.isArray(c.items) ? Array.from(new Set(c.items.filter(isRef))).slice(0, 500) as Ref[] : [] })) : [],
    favorites: Array.isArray(b.favorites) ? (Array.from(new Set(b.favorites.filter(isRef))).slice(0, 1000) as Ref[]) : [],
    chains: Array.isArray(b.chains) ? b.chains.filter((c: any) => c && typeof c.name === "string").slice(0, 100).map((c: any): Chain => ({ id: str(c.id, 40) || newId("ch"), name: str(c.name, 80),
      steps: Array.isArray(c.steps) ? c.steps.slice(0, 12).map((x: any): ChainStep => ({ id: str(x?.id, 40) || newId("st"), title: str(x?.title, 120), ref: isRef(x?.ref) ? x.ref : undefined, text: x?.ref ? undefined : str(x?.text, 20000), values: vals(x?.values) })) : [] })) : [],
    profiles: profiles.length ? profiles : s.profiles,
    activeProfile: profiles.some((p: Profile) => p.id === b.activeProfile) ? String(b.activeProfile) : (profiles[0]?.id || "default"),
  };
}

/** {{variables}} in order of first appearance (previous is the workflow's reserved input). */
export function extractVars(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
export const fill = (template: string, values: Record<string, string>) => template.replace(/\{\{(\w+)\}\}/g, (_m, k) => values[k]?.trim() || `{{${k}}}`);
/** Values for a prompt's variables: what the member typed, else the active profile. */
export function withProfile(keys: string[], typed: Record<string, string>, profile?: Profile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = typed[k] ?? profile?.values[k] ?? "";
  return out;
}
export const labelOf = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Export file (never contains run outputs). */
export const exportJson = (s: LibraryState) => JSON.stringify({ app: "axto-prompts", ...s, exportedAt: new Date().toISOString() }, null, 1);
/** Merge an imported library into the current one (new ids for clashes, no duplicates). */
export function mergeImport(cur: LibraryState, incoming: LibraryState): LibraryState {
  const ids = new Set(cur.custom.map((p) => p.id));
  const remap = new Map<string, string>();
  const custom = [...cur.custom];
  for (const p of incoming.custom) {
    if (cur.custom.some((x) => x.title === p.title && x.body === p.body)) continue;
    const id = ids.has(p.id) ? newId("u") : p.id;
    remap.set(p.id, id); ids.add(id); custom.push({ ...p, id });
  }
  const fix = (r: Ref): Ref => (r.startsWith("u:") && remap.has(r.slice(2)) ? (`u:${remap.get(r.slice(2))}` as Ref) : r);
  return {
    ...cur, custom,
    favorites: Array.from(new Set([...cur.favorites, ...incoming.favorites.map(fix)])),
    collections: [...cur.collections, ...incoming.collections.filter((c) => !cur.collections.some((x) => x.name === c.name)).map((c) => ({ ...c, id: newId("col"), items: c.items.map(fix) }))],
    chains: [...cur.chains, ...incoming.chains.filter((c) => !cur.chains.some((x) => x.name === c.name)).map((c) => ({ ...c, id: newId("ch"), steps: c.steps.map((st) => ({ ...st, ref: st.ref ? fix(st.ref) : undefined })) }))],
    profiles: [...cur.profiles, ...incoming.profiles.filter((p) => !cur.profiles.some((x) => x.name === p.name)).map((p) => ({ ...p, id: newId("pf") }))],
  };
}

/** Starter workflow shown to new members (only references Basic prompts). */
export const SAMPLE_CHAIN = (): Chain => ({
  id: newId("ch"), name: "Blog post from a keyword",
  steps: [
    { id: newId("st"), title: "Outline", ref: "c:content-outline" },
    { id: newId("st"), title: "Draft", text: "Write the full article from this outline: {{previous}}\nKeep headings, add examples, 1,200–1,500 words." },
    { id: newId("st"), title: "Titles & meta", text: "From this article, write 5 SEO titles (≤ 60 chars) and 5 meta descriptions (≤ 155 chars):\n{{previous}}" },
  ],
});
