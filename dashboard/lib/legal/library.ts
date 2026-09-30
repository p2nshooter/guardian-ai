/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI v4 — the member's own playbooks and clauses, one encrypted object
 * per account (legal/<uid>/library.enc, lib/user-crypto). Validation is shared
 * by the browser (before saving) and the server (before storing).
 * ============================================================================ */
import { CLAUSE_TYPES, type Check, type ClauseType, type Playbook, type Position } from "./playbook";
import type { LibraryClause, ClauseVariant } from "./clauses";

export interface LegalLibrary { v: 1; playbooks: Playbook[]; clauses: LibraryClause[] }
export const EMPTY_LIBRARY: LegalLibrary = { v: 1, playbooks: [], clauses: [] };
export const LIBRARY_LIMITS = { playbooks: 30, positions: 40, clauses: 200, variants: 6, bytes: 400_000 };

const CLAUSE_IDS = new Set(CLAUSE_TYPES.map((c) => c.id));
const CHECK_KINDS = ["maxYears", "maxMonths", "minDays", "maxDays", "minCapMonths", "lawIn", "mustMention"] as const;
const LABELS: ClauseVariant["label"][] = ["Balanced", "Pro-supplier", "Pro-customer", "Pro-discloser", "Pro-recipient", "Pro-employer", "Short form"];
const CATEGORIES: LibraryClause["category"][] = ["General", "Commercial", "Risk", "Data & IP", "Disputes", "Employment"];

const txt = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const words = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => txt(x, max)).filter(Boolean).slice(0, n);
const idOf = (v: unknown, prefix: string) => (typeof v === "string" && /^[a-z0-9_-]{3,40}$/i.test(v) ? v : `${prefix}-${Math.random().toString(36).slice(2, 10)}`);

function check(c: any): Check | null {
  if (!c || !CHECK_KINDS.includes(c.kind)) return null;
  if (c.kind === "lawIn" || c.kind === "mustMention") { const v = words(c.value, 12, 60).map((x) => x.toLowerCase()); return v.length ? { kind: c.kind, value: v } : null; }
  const n = Number(c.value);
  return Number.isFinite(n) && n >= 0 && n <= 10_000 ? { kind: c.kind, value: n } as Check : null;
}

function position(p: any): Position | null {
  if (!p || !CLAUSE_IDS.has(p.clause)) return null;
  return {
    clause: p.clause as ClauseType, required: !!p.required,
    standard: txt(p.standard, 1500) || "—", fallback: txt(p.fallback, 1500) || "—",
    redFlags: words(p.redFlags, 20, 120), checks: (Array.isArray(p.checks) ? p.checks : []).map(check).filter(Boolean).slice(0, 8) as Check[],
  };
}

export function sanitizePlaybook(p: any): Playbook | null {
  if (!p || typeof p !== "object") return null;
  const positions = (Array.isArray(p.positions) ? p.positions : []).map(position).filter(Boolean).slice(0, LIBRARY_LIMITS.positions) as Position[];
  if (!positions.length) return null;
  return { id: idOf(p.id, "pb"), name: txt(p.name, 120) || "My playbook", side: txt(p.side, 80) || "—", positions };
}

export function sanitizeClause(c: any): LibraryClause | null {
  if (!c || typeof c !== "object") return null;
  const variants = (Array.isArray(c.variants) ? c.variants : []).map((v: any) => {
    const text = txt(v?.text, 8000);
    return text ? { id: idOf(v?.id, "cv"), label: LABELS.includes(v?.label) ? v.label : "Balanced", text } : null;
  }).filter(Boolean).slice(0, LIBRARY_LIMITS.variants) as ClauseVariant[];
  if (!variants.length) return null;
  return { id: idOf(c.id, "cl"), name: txt(c.name, 120) || "My clause", category: CATEGORIES.includes(c.category) ? c.category : "General", notes: txt(c.notes, 1500), variants };
}

/** Clean a library received from anywhere (the browser, an import, storage). */
export function sanitizeLibrary(v: any): LegalLibrary {
  const uniq = <T extends { id: string }>(xs: T[]) => { const seen = new Set<string>(); return xs.filter((x) => !seen.has(x.id) && seen.add(x.id)); };
  return {
    v: 1,
    playbooks: uniq((Array.isArray(v?.playbooks) ? v.playbooks : []).map(sanitizePlaybook).filter(Boolean).slice(0, LIBRARY_LIMITS.playbooks) as Playbook[]),
    clauses: uniq((Array.isArray(v?.clauses) ? v.clauses : []).map(sanitizeClause).filter(Boolean).slice(0, LIBRARY_LIMITS.clauses) as LibraryClause[]),
  };
}

/** Citation checks kept with a matter: citation key → status and note. */
export type CiteChecks = Record<string, { status: "unchecked" | "verified" | "wrong" | "notfound"; note?: string; text?: string }>;
export function sanitizeCiteChecks(v: any): CiteChecks {
  const out: CiteChecks = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, x] of Object.entries(v).slice(0, 1000)) {
    const s = (x as any)?.status;
    if (typeof k !== "string" || k.length > 300 || !["unchecked", "verified", "wrong", "notfound"].includes(s)) continue;
    out[k] = { status: s, note: txt((x as any).note, 500) || undefined, text: txt((x as any).text, 300) || undefined };
  }
  return out;
}
