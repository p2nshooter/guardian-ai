/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — the member's rules (style, sensitivity, enabled types, custom
 * patterns, always/never lists), saved to their encrypted history, plus the
 * helpers the screens share: exposure level, sample text, file kinds, a
 * Markdown audit report. Pure: no DOM, no network.
 * ============================================================================ */
import { PII_TYPES, PRESETS, compileRule, reversible, type Category, type CustomRule, type DetectOptions, type Finding, type MaskStyle } from "./pii";

export interface VaultSettings {
  style: MaskStyle;
  minScore: number;                  // 0.3 … 0.95
  preset: string;
  disabled: string[];                // type ids switched off
  rules: CustomRule[];
  deny: string[];
  allow: string[];
}

export const SETTINGS_ID = "vault-settings";
export const STYLES: MaskStyle[] = ["token", "synthetic", "hash", "partial", "full"];
export const DEFAULT_SETTINGS: VaultSettings = { style: "token", minScore: 0.5, preset: "all", disabled: [], rules: [], deny: [], allow: [] };

const ids = new Set(PII_TYPES.map((t) => t.id));
const strList = (v: unknown, max = 500) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.slice(0, 200)).filter((s) => s.trim()).slice(0, max) : []);

/** Accept whatever was stored and return valid settings (unknown fields dropped). */
export function sanitizeSettings(v: any): VaultSettings {
  if (!v || typeof v !== "object") return { ...DEFAULT_SETTINGS };
  const style: MaskStyle = STYLES.includes(v.style) ? v.style : DEFAULT_SETTINGS.style;
  const n = Number(v.minScore);
  const minScore = Number.isFinite(n) ? Math.min(0.95, Math.max(0.3, Math.round(n * 100) / 100)) : DEFAULT_SETTINGS.minScore;
  const preset = PRESETS.some((p) => p.id === v.preset) ? v.preset : "custom";
  const rules: CustomRule[] = (Array.isArray(v.rules) ? v.rules : []).slice(0, 50)
    .filter((r: any) => r && typeof r.pattern === "string" && typeof r.id === "string")
    .map((r: any) => ({ id: String(r.id).replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "R", label: String(r.label || "Custom").slice(0, 60), pattern: r.pattern.slice(0, 500), flags: r.flags === "i" ? "i" : "" }))
    .filter((r: CustomRule) => compileRule(r));
  return { style, minScore, preset, disabled: strList(v.disabled).filter((id) => ids.has(id)), rules, deny: strList(v.deny), allow: strList(v.allow) };
}

/** The enabled type set and detect options for these settings. */
export function engineOptions(s: VaultSettings): { enabled: Set<string>; options: DetectOptions } {
  const off = new Set(s.disabled);
  return {
    enabled: new Set(PII_TYPES.map((t) => t.id).filter((id) => !off.has(id))),
    options: { minScore: s.minScore, rules: s.rules, deny: s.deny, allow: s.allow },
  };
}

/** Switch to a compliance profile: its types on, everything else off. */
export function applyPreset(s: VaultSettings, id: string): VaultSettings {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return s;
  const on = new Set(p.types);
  return { ...s, preset: id, disabled: PII_TYPES.map((t) => t.id).filter((t) => !on.has(t)) };
}

/** Safe AI must be able to restore, so masking styles fall back to tokens. */
export const aiStyle = (s: MaskStyle): MaskStyle => (reversible(s) ? s : "token");

/** 0 none · 1 low · 2 medium · 3 high · 4 critical — from the worst category found. */
const WEIGHT: Record<Category, number> = { secret: 4, government: 3, financial: 3, personal: 2, contact: 2, network: 1, custom: 2 };
export function exposure(findings: Pick<Finding, "category">[]): number {
  let w = 0;
  for (const f of findings) w = Math.max(w, WEIGHT[f.category] ?? 1);
  if (w === 2 && findings.length >= 8) return 3;             // many identifiers together ≈ a profile
  return w;
}

export const SAMPLE = `From: Budi Santoso <budi.santoso@contoh.co.id>
Phone: +62 812-3456-7890 · NIK 3171011203900003
Address: Jl. Merdeka Raya No. 45, Jakarta 10110
Card 4111 1111 1111 1111 (exp 12/28, CVV 123) · IBAN GB82 WEST 1234 5698 7654 32

Hi team, please refund Mrs. Maria Rossi (maria.rossi@example.it, DOB: 14/03/1985).
Our server 203.0.113.42 still uses password: Tr0ub4dor&3 and the key sk-proj-4f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c.
Passport: X1234567 · SSN 123-45-6789`;

export type FileKind = "text" | "docx" | "xlsx" | "pdf" | "image";
const TEXT_EXT = ["txt", "md", "markdown", "csv", "tsv", "json", "xml", "html", "htm", "eml", "log", "yaml", "yml", "ini", "env", "sql"];
export const FILE_ACCEPT = [...TEXT_EXT, "docx", "xlsx", "pdf", "png", "jpg", "jpeg", "webp"].map((e) => `.${e}`).join(",");
export const MAX_FILE_MB = 60;
export function fileKind(name: string, mime = ""): FileKind | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "xlsx";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext) || /^image\/(png|jpe?g|webp)$/.test(mime)) return "image";
  if (TEXT_EXT.includes(ext) || mime.startsWith("text/")) return "text";
  return null;
}
/** "report.pdf" → "report-redacted.pdf" (images keep PNG, others become JPEG). */
export function redactedName(name: string, kind: FileKind, mime?: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = kind === "image" ? (mime === "image/png" ? "png" : "jpg") : dot > 0 ? name.slice(dot + 1) : "txt";
  return `${base}-redacted.${ext}`;
}

/** Audit report as Markdown — counts per file and type, never the values. */
export function auditMarkdown(r: { generatedAt: string; style: string; minScore: number; total: number; items: { source: string; total: number; byType: Record<string, number> }[] }, label: (type: string) => string = (t) => t): string {
  const lines = [
    "# AXTO Privacy Vault — redaction audit report", "",
    `- Generated: ${r.generatedAt}`, `- Style: ${r.style}`, `- Minimum confidence: ${Math.round(r.minScore * 100)}%`, `- Items redacted: ${r.total}`, "",
    "| File | Items | Types |", "|---|---:|---|",
    ...r.items.map((i) => `| ${i.source.replace(/\|/g, "\\|")} | ${i.total} | ${Object.entries(i.byType).map(([k, v]) => `${label(k)} × ${v}`).join(", ") || "—"} |`),
    "", "_Values are never included in this report. Processing ran on the member's device._", "",
  ];
  return lines.join("\n");
}
