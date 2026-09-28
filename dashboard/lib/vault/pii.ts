/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — a pure, client-side PII detection & redaction engine. It runs
 * entirely in the browser: the original text is never uploaded anywhere. Detects
 * 20+ sensitive data types, redacts with reversible tokens or masking, and can
 * restore originals from an AI's tokenised response. No "use client", no imports.
 * ============================================================================ */

export type MaskStyle = "token" | "full" | "partial";

export interface PiiType { id: string; label: string; priority: number; re: RegExp; validate?: (v: string) => boolean }
export interface Finding { type: string; label: string; value: string; start: number; end: number }
export interface RedactResult { redacted: string; findings: Finding[]; map: Record<string, string> }

/** Luhn checksum — used to keep card matches precise (rejects random 16-digit runs). */
export function luhn(num: string): boolean {
  const d = num.replace(/\D/g, "");
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

// Higher priority wins when matches overlap (more specific / structured first).
export const PII_TYPES: PiiType[] = [
  { id: "JWT", label: "JWT / token", priority: 95, re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { id: "AWS_KEY", label: "AWS access key", priority: 94, re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[A-Z0-9]{16}\b/g },
  { id: "PRIVATE_KEY", label: "Private key block", priority: 96, re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: "API_KEY", label: "API key / secret", priority: 80, re: /\b(?:sk|pk|rk|api|key|secret|token|ghp|gho|xox[baprs])[-_][A-Za-z0-9_-]{16,}\b/gi },
  { id: "EMAIL", label: "Email", priority: 90, re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: "URL", label: "URL", priority: 60, re: /\bhttps?:\/\/[^\s"'<>)\]]+/gi },
  { id: "CARD", label: "Payment card", priority: 88, re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhn },
  { id: "IBAN", label: "IBAN", priority: 86, re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { id: "BTC", label: "Bitcoin address", priority: 84, re: /\b(?:bc1[a-z0-9]{20,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g },
  { id: "ETH", label: "Ethereum address", priority: 84, re: /\b0x[a-fA-F0-9]{40}\b/g },
  { id: "NIK", label: "Indonesian NIK", priority: 83, re: /\b\d{16}\b/g },
  { id: "NPWP", label: "Indonesian NPWP", priority: 83, re: /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b/g },
  { id: "SSN", label: "US SSN", priority: 82, re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { id: "PASSPORT", label: "Passport no.", priority: 70, re: /\b[A-Z]{1,2}\d{6,9}\b/g },
  { id: "IPV6", label: "IPv6 address", priority: 76, re: /\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{1,4}\b/gi },
  { id: "IPV4", label: "IPv4 address", priority: 74, re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { id: "MAC", label: "MAC address", priority: 72, re: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g },
  { id: "PHONE", label: "Phone number", priority: 68, re: /(?<![\w.])(?:\+?\d{1,3}[ .-]?)?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}[ .-]?\d{3,4}[ .-]?\d{3,4}(?![\w.])/g, validate: (v) => v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15 },
  { id: "DOB", label: "Date", priority: 64, re: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\b/g },
];

const clip = (v: string, max = 300) => (v.length > max ? v.slice(0, max) : v);

/** Detect all PII, resolve overlaps (highest priority, then longest match wins). */
export function detect(text: string, enabled?: Set<string>): Finding[] {
  const raw: Finding[] = [];
  for (const t of PII_TYPES) {
    if (enabled && !enabled.has(t.id)) continue;
    t.re.lastIndex = 0;
    for (const m of text.matchAll(t.re)) {
      const value = m[0];
      if (t.validate && !t.validate(value)) continue;
      raw.push({ type: t.id, label: t.label, value, start: m.index ?? 0, end: (m.index ?? 0) + value.length });
    }
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end || prio(b.type) - prio(a.type));
  const out: Finding[] = [];
  let lastEnd = -1;
  for (const f of raw) {
    if (f.start >= lastEnd) { out.push(f); lastEnd = f.end; continue; }
    // Overlap: replace the previous one only if this is strictly better (priority, then length).
    const prev = out[out.length - 1];
    if (prio(f.type) > prio(prev.type) || (prio(f.type) === prio(prev.type) && f.end - f.start > prev.end - prev.start)) {
      out[out.length - 1] = f; lastEnd = f.end;
    }
  }
  return out;
}
const prio = (id: string) => PII_TYPES.find((t) => t.id === id)?.priority ?? 0;

function maskValue(f: Finding, style: MaskStyle, counter: Record<string, number>): string {
  if (style === "full") return "•".repeat(Math.min(Math.max(f.value.length, 4), 12));
  if (style === "partial") {
    const v = f.value;
    if (f.type === "EMAIL") { const [u, d] = v.split("@"); return `${u[0]}${"•".repeat(Math.max(u.length - 1, 1))}@${d}`; }
    const tail = v.replace(/\s/g, "").slice(-4);
    return `${"•".repeat(4)}${tail}`;
  }
  const n = (counter[f.type] = (counter[f.type] || 0) + 1);
  return `[${f.type}_${n}]`;
}

/** Redact text. For style "token" the returned map lets you restore originals. */
export function redact(text: string, style: MaskStyle = "token", enabled?: Set<string>): RedactResult {
  const findings = detect(text, enabled);
  const counter: Record<string, number> = {};
  const map: Record<string, string> = {};
  let out = "", cursor = 0;
  // Reuse one token per identical value so [EMAIL_1] restores everywhere.
  const seen: Record<string, string> = {};
  for (const f of findings) {
    out += text.slice(cursor, f.start);
    const key = `${f.type}:${f.value}`;
    let token = seen[key];
    if (!token) { token = maskValue(f, style, counter); seen[key] = token; if (style === "token") map[token] = f.value; }
    out += token;
    cursor = f.end;
  }
  out += text.slice(cursor);
  return { redacted: out, findings, map: clipMap(map) };
}
function clipMap(m: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) o[k] = clip(v);
  return o;
}

/** Restore originals from a tokenised text (e.g. an AI reply that kept the tokens). */
export function restore(text: string, map: Record<string, string>): string {
  let out = text;
  for (const [token, original] of Object.entries(map)) out = out.split(token).join(original);
  return out;
}

export function summarize(findings: Finding[]): { type: string; label: string; count: number }[] {
  const by: Record<string, { label: string; count: number }> = {};
  for (const f of findings) { by[f.type] = by[f.type] || { label: f.label, count: 0 }; by[f.type].count++; }
  return Object.entries(by).map(([type, v]) => ({ type, label: v.label, count: v.count })).sort((a, b) => b.count - a.count);
}
