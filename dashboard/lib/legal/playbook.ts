/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LEGAL AI v4 — PLAYBOOK REVIEW, on the device: the organisation's standard
 * positions per clause type, checked against a contract. Deterministic checks
 * (clause present, numbers such as caps / days / terms, red-flag phrases,
 * required wording) run here; the AI review gets the playbook and only the
 * relevant clauses. Pure. General information, not legal advice.
 * ============================================================================ */
import { splitClauses, type Clause } from "./redline";

export type ClauseType =
  | "confidentiality" | "liability" | "indemnity" | "termination" | "governing-law" | "disputes" | "ip" | "data-protection"
  | "payment" | "renewal" | "assignment" | "non-compete" | "non-solicit" | "warranty" | "force-majeure" | "audit" | "insurance" | "sla" | "term" | "notice";

export const CLAUSE_TYPES: { id: ClauseType; name: string; re: RegExp }[] = [
  { id: "confidentiality", name: "Confidentiality", re: /\b(confidential\w*|non-disclosure|kerahasiaan|rahasia)\b/i },
  { id: "liability", name: "Limitation of liability", re: /\b(limitation of liability|liabilit\w+ (?:is|shall be) (?:limited|capped)|aggregate liability|in no event .{0,40}liable|batas(?:an)? tanggung jawab)\b/i },
  { id: "indemnity", name: "Indemnity", re: /\b(indemnif\w*|indemnit\w*|hold harmless|ganti rugi)\b/i },
  { id: "termination", name: "Termination", re: /\b(terminat\w*|pemutusan|pengakhiran)\b/i },
  { id: "governing-law", name: "Governing law", re: /\b(governed by|governing law|laws of|hukum yang berlaku|tunduk pada hukum)\b/i },
  { id: "disputes", name: "Dispute resolution", re: /\b(arbitrat\w*|courts? of|jurisdiction of|dispute resolution|penyelesaian sengketa|pengadilan negeri|BANI|SIAC|ICC)\b/i },
  { id: "ip", name: "Intellectual property", re: /\b(intellectual property|copyright|patent\w*|trade ?marks?|hak kekayaan intelektual|HKI)\b/i },
  { id: "data-protection", name: "Data protection", re: /\b(personal data|data protection|GDPR|UU PDP|data pribadi|processor|sub-?processor)\b/i },
  { id: "payment", name: "Payment terms", re: /\b(invoice\w*|payment|fees?|pembayaran|tagihan)\b/i },
  { id: "renewal", name: "Renewal", re: /\b(automatic(?:ally)? renew\w*|auto-?renew\w*|renew\w* for successive|perpanjangan otomatis)\b/i },
  { id: "assignment", name: "Assignment", re: /\b(assign\w*|transfer (?:its|this) (?:rights|agreement)|mengalihkan)\b/i },
  { id: "non-compete", name: "Non-compete", re: /\b(non-?compet\w*|shall not (?:engage|compete)|larangan bersaing)\b/i },
  { id: "non-solicit", name: "Non-solicitation", re: /\b(non-?solicit\w*|solicit\w* (?:any )?(?:employee|customer)s?)\b/i },
  { id: "warranty", name: "Warranties", re: /\b(warrant\w*|represent\w* and warrant\w*|jaminan)\b/i },
  { id: "force-majeure", name: "Force majeure", re: /\b(force majeure|keadaan kahar|act of god)\b/i },
  { id: "audit", name: "Audit rights", re: /\b(audit\w*|inspect\w* (?:the )?(?:books|records))\b/i },
  { id: "insurance", name: "Insurance", re: /\b(insurance|insured|asuransi)\b/i },
  { id: "sla", name: "Service levels", re: /\b(service levels?|SLA|uptime|availability of \d|service credits?)\b/i },
  { id: "term", name: "Term / duration", re: /\b(term of (?:this )?agreement|shall remain in (?:force|effect)|period of \d+ (?:years?|months?)|jangka waktu)\b/i },
  { id: "notice", name: "Notices", re: /\b(notices?\b.{0,40}\b(?:in writing|address|e-?mail)|pemberitahuan)\b/i },
];

export type Check =
  | { kind: "maxYears"; value: number } | { kind: "maxMonths"; value: number } | { kind: "minDays"; value: number } | { kind: "maxDays"; value: number }
  | { kind: "minCapMonths"; value: number } | { kind: "lawIn"; value: string[] } | { kind: "mustMention"; value: string[] };
export interface Position { clause: ClauseType; required: boolean; standard: string; fallback: string; redFlags: string[]; checks: Check[] }
export interface Playbook { id: string; name: string; side: string; positions: Position[] }

const P = (clause: ClauseType, required: boolean, standard: string, fallback: string, redFlags: string[] = [], checks: Check[] = []): Position => ({ clause, required, standard, fallback, redFlags, checks });

export const PLAYBOOKS: Playbook[] = [
  { id: "nda-mutual", name: "Mutual NDA", side: "Either party", positions: [
    P("confidentiality", true, "Mutual obligations; standard exclusions (public, already known, independently developed, received from a third party); disclosure only on a need-to-know basis.", "One-way protection is acceptable only if we are the only discloser.", ["perpetual", "irrevocable", "any information whatsoever"], [{ kind: "mustMention", value: ["public", "independently"] }]),
    P("term", true, "Confidentiality lasts 2–5 years after disclosure (trade secrets: as long as they remain secret).", "Up to 7 years for highly sensitive information.", ["in perpetuity", "indefinitely"], [{ kind: "maxYears", value: 5 }]),
    P("non-solicit", false, "No non-solicitation in an NDA; if the counterparty insists, 12 months maximum and employees only.", "12 months, excluding general job advertisements.", ["customers"], [{ kind: "maxMonths", value: 12 }]),
    P("non-compete", false, "No non-compete in an NDA.", "Remove it.", ["shall not compete", "non-compete"]),
    P("ip", true, "No licence or transfer of intellectual property is implied by disclosure.", "—", ["hereby assigns", "grants a licen"]),
    P("governing-law", true, "Our home law and courts.", "A neutral law (e.g. England & Wales or Singapore) with arbitration.", [], [{ kind: "lawIn", value: ["indonesia", "singapore", "england"] }]),
  ] },
  { id: "saas-customer", name: "SaaS / services — we are the customer", side: "Customer", positions: [
    P("liability", true, "Supplier's cap ≥ 12 months of fees; uncapped (or super-capped) for data breach, confidentiality, IP indemnity, gross negligence and wilful misconduct.", "Cap ≥ 12 months of fees with a 2–3× super-cap for data breach.", ["in no event shall supplier be liable for any", "not be liable for any loss of data"], [{ kind: "minCapMonths", value: 12 }]),
    P("indemnity", true, "Supplier indemnifies for third-party IP infringement and breaches of data-protection law.", "IP indemnity at minimum.", ["customer shall indemnify supplier for any"]),
    P("payment", true, "Payment within 30–60 days of a correct invoice; disputed amounts can be withheld in good faith.", "30 days.", ["in advance for the entire term", "non-refundable"], [{ kind: "minDays", value: 30 }]),
    P("renewal", false, "No automatic renewal, or renewal with ≥ 30 days' notice and a price cap.", "Auto-renewal with 60 days' notice to cancel and a price increase capped at CPI or 5 %.", ["automatically renew"]),
    P("termination", true, "Termination for convenience on 30–90 days' notice; for cause with a 30-day cure period.", "For cause only, with pro-rata refund of prepaid fees.", ["no right to terminate"]),
    P("data-protection", true, "A DPA meeting GDPR Art. 28 / UU PDP; breach notice ≤ 48 hours; sub-processor list and notice of changes; data returned or deleted at the end.", "Breach notice ≤ 72 hours.", ["without notice"], [{ kind: "maxDays", value: 3 }]),
    P("sla", false, "Uptime ≥ 99.9 % with service credits and a termination right for chronic failure.", "99.5 % with credits.", ["best efforts"]),
    P("assignment", true, "Neither party may assign without consent, except to an affiliate or a successor.", "Supplier needs our consent; we may assign to affiliates.", ["may assign without consent"]),
    P("governing-law", true, "Our home law and courts, or arbitration in a neutral seat.", "Neutral law with arbitration (SIAC / ICC).", [], [{ kind: "lawIn", value: ["indonesia", "singapore"] }]),
  ] },
  { id: "saas-vendor", name: "SaaS / services — we are the supplier", side: "Supplier", positions: [
    P("liability", true, "Our cap = fees paid in the previous 12 months; no liability for indirect or consequential loss or lost profits.", "Cap up to 24 months of fees; data-breach super-cap ≤ 3×.", ["unlimited liability", "uncapped"], [{ kind: "minCapMonths", value: 12 }]),
    P("warranty", true, "Services performed with reasonable skill and care; all other warranties excluded to the extent permitted by law.", "Add a performance warranty with re-performance as the sole remedy.", ["fit for any purpose", "error-free", "uninterrupted"]),
    P("payment", true, "Payment within 30 days; late interest; right to suspend after notice for non-payment.", "45 days.", ["within 90 days", "within 120 days"], [{ kind: "maxDays", value: 45 }]),
    P("ip", true, "We keep all IP in the platform; customer owns its data; limited licence to use the service.", "Customer owns deliverables made specifically for it, we keep pre-existing IP.", ["assigns all intellectual property", "work made for hire"]),
    P("termination", true, "No termination for convenience during the committed term; for cause with a 30-day cure period.", "Convenience termination with payment of remaining fees.", ["terminate at any time without"]),
    P("audit", false, "Audits at most once a year, on 30 days' notice, via our certifications (SOC 2 / ISO 27001) first.", "On-site audit only after a documented incident.", ["unlimited audit", "at any time"]),
  ] },
  { id: "dpa-controller", name: "Data processing agreement — we are the controller", side: "Controller", positions: [
    P("data-protection", true, "Processing only on documented instructions; confidentiality of personnel; security measures; sub-processor consent; assistance with data-subject rights and DPIAs; deletion or return at the end; audit rights.", "General written authorisation for sub-processors with notice and objection right.", ["for its own purposes", "anonymised data for any purpose"], [{ kind: "mustMention", value: ["instruction", "sub-processor", "delet"] }]),
    P("notice", true, "Personal-data breach notified without undue delay and within 24–48 hours.", "Within 72 hours — tight against our own 72-hour GDPR / 3 × 24-hour UU PDP deadline, so push for faster.", [], [{ kind: "maxDays", value: 2 }]),
    P("audit", true, "Right to audit or receive third-party audit reports.", "Reports first, on-site audit after an incident.", ["no right to audit"]),
    P("liability", false, "Processor liability for its breaches not limited below the main agreement's data-breach cap.", "Same cap as the main agreement.", ["excluded"]),
  ] },
  { id: "employment", name: "Employment contract — we are the employer", side: "Employer", positions: [
    P("confidentiality", true, "Confidentiality during and after employment.", "—"),
    P("ip", true, "All work product created in the course of employment belongs to the employer (subject to local law).", "—", [], [{ kind: "mustMention", value: ["employ"] }]),
    P("non-compete", false, "Only where enforceable locally; ≤ 12 months, limited geography and role, with consideration if the law requires.", "Rely on confidentiality and non-solicitation instead.", [], [{ kind: "maxMonths", value: 12 }]),
    P("termination", true, "Notice periods and grounds that meet local statutory minimums.", "—"),
    P("governing-law", true, "Local law of the place of work.", "—"),
  ] },
];

/** One reason behind a finding, as a code + values so the portal can word it in the member's language. */
export type IssueCode = "notFound" | "optionalAbsent" | "consistent" | "redFlags" | "maxYears" | "maxMonths" | "minDays" | "maxDays" | "capMonths" | "capUnknown" | "law" | "wording";
export interface Issue { code: IssueCode; v?: number; limit?: number; text?: string }
export type IssueMessages = Record<IssueCode, string>;
/** English wording (also used for the AI hand-off fallback and the exports when no translation is given). */
export const ISSUE_EN: IssueMessages = {
  notFound: "Not found in the document.", optionalAbsent: "Not present (optional).", consistent: "Consistent with the standard position.",
  redFlags: "Red-flag wording: {text}", maxYears: "Duration {v} years exceeds {limit}", maxMonths: "Period {v} months exceeds {limit}",
  minDays: "{v} days is shorter than {limit}", maxDays: "{v} days is longer than {limit}", capMonths: "Cap covers {v} months of fees (standard: ≥ {limit})",
  capUnknown: "Cap amount not found — check it manually", law: "Governing law: {text}", wording: "Expected wording not found: {text}",
};
export const issueText = (i: Issue, m: IssueMessages = ISSUE_EN) =>
  m[i.code].replace("{v}", String(i.v ?? "")).replace("{limit}", String(i.limit ?? "")).replace("{text}", i.text ?? "");
export const issuesText = (list: Issue[], m: IssueMessages = ISSUE_EN) => list.map((i) => issueText(i, m)).join(" · ");

export interface Finding { clause: ClauseType; name: string; status: "ok" | "missing" | "deviation" | "review"; severity: "low" | "medium" | "high"; detail: string; issues: Issue[]; evidence?: string; standard: string; fallback: string }

const years = (s: string) => Array.from(s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:\(\w+\)\s*)?(?:years?|tahun)/gi), (m) => parseFloat(m[1].replace(",", ".")));
const months = (s: string) => Array.from(s.matchAll(/(\d+)\s*(?:\(\w+\)\s*)?(?:months?|bulan)/gi), (m) => Number(m[1]));
const days = (s: string) => [...Array.from(s.matchAll(/(\d+)\s*(?:\(\w+\)\s*)?(?:(?:business|working|calendar)\s+)?(?:days?|hari)/gi), (m) => Number(m[1])), ...Array.from(s.matchAll(/(\d+)\s*(?:hours?|jam)/gi), (m) => Number(m[1]) / 24), ...Array.from(s.matchAll(/(\d+)\s*[x×]\s*24\s*(?:hours?|jam)/gi), (m) => Number(m[1]))];
/** "fees paid in the 12 months", "12 months' fees", "two times the annual fees" → months of fees covered by a cap. */
function capMonths(s: string): number | null {
  const m = s.match(/(\d+)\s*months?['’]?\s*(?:of\s+)?(?:fees|charges)|fees\s+(?:paid|payable)[^.]{0,60}?(\d+)\s*months?/i);
  if (m) return Number(m[1] || m[2]);
  const t = s.match(/(\d+|one|two|three)\s*(?:x|times)\s*(?:the\s+)?(?:annual|yearly)\s+fees/i);
  if (t) return ({ one: 1, two: 2, three: 3 } as Record<string, number>)[t[1].toLowerCase()] * 12 || Number(t[1]) * 12;
  if (/annual fees|fees paid in the (?:previous|preceding) (?:year|twelve)/i.test(s)) return 12;
  return null;
}

/** Review a contract against a playbook — deterministic, explainable findings. `names` words the clause types
 *  (the member's language); the checks themselves always read the contract text as written. */
export function review(text: string, pb: Playbook, names?: Partial<Record<ClauseType, string>>): { findings: Finding[]; clauses: Record<string, Clause[]> } {
  const clauses = splitClauses(text);
  const by: Record<string, Clause[]> = {};
  for (const t of CLAUSE_TYPES) by[t.id] = clauses.filter((c) => t.re.test(`${c.heading} ${c.text}`));
  const findings: Finding[] = [];
  for (const p of pb.positions) {
    const name = names?.[p.clause] || CLAUSE_TYPES.find((x) => x.id === p.clause)!.name;
    const hits = by[p.clause] || [];
    const base = { clause: p.clause, name, standard: p.standard, fallback: p.fallback };
    if (!hits.length) { const issues: Issue[] = [{ code: p.required ? "notFound" : "optionalAbsent" }]; findings.push({ ...base, status: p.required ? "missing" : "ok", severity: p.required ? "high" : "low", detail: issuesText(issues), issues }); continue; }
    const body = hits.map((c) => c.text).join("\n");
    const issues: Issue[] = [];
    const flags = p.redFlags.filter((f) => body.toLowerCase().includes(f.toLowerCase()));
    if (flags.length) issues.push({ code: "redFlags", text: `“${flags.join("”, “")}”` });
    for (const ch of p.checks) {
      if (ch.kind === "maxYears") { const v = years(body); if (v.some((x) => x > ch.value)) issues.push({ code: "maxYears", v: Math.max(...v), limit: ch.value }); }
      if (ch.kind === "maxMonths") { const v = [...months(body), ...years(body).map((y) => y * 12)]; if (v.some((x) => x > ch.value)) issues.push({ code: "maxMonths", v: Math.max(...v), limit: ch.value }); }
      if (ch.kind === "minDays") { const v = days(body); if (v.length && Math.min(...v) < ch.value) issues.push({ code: "minDays", v: Math.min(...v), limit: ch.value }); }
      if (ch.kind === "maxDays") { const v = days(body); if (v.length && Math.max(...v) > ch.value) issues.push({ code: "maxDays", v: Math.round(Math.max(...v) * 10) / 10, limit: ch.value }); }
      if (ch.kind === "minCapMonths") { const v = capMonths(body); if (v !== null && v < ch.value) issues.push({ code: "capMonths", v, limit: ch.value }); if (v === null && p.clause === "liability") issues.push({ code: "capUnknown" }); }
      if (ch.kind === "lawIn") { const law = body.match(/laws? of (?:the )?([A-Z][\w ]{2,40}?)(?:[,.;]|\s+(?:and|without))|hukum (?:negara )?(?:Republik )?([A-Z]\w+)/); const name2 = (law?.[1] || law?.[2] || "").toLowerCase(); if (name2 && !ch.value.some((x) => name2.includes(x))) issues.push({ code: "law", text: law?.[1] || law?.[2] }); }
      if (ch.kind === "mustMention") { const miss = ch.value.filter((w) => !body.toLowerCase().includes(w.toLowerCase())); if (miss.length) issues.push({ code: "wording", text: miss.join(", ") }); }
    }
    const high = flags.length > 0 || issues.some((i) => ["maxYears", "maxMonths", "minDays", "maxDays", "capMonths", "law"].includes(i.code));
    const shown: Issue[] = issues.length ? issues : [{ code: "consistent" }];
    findings.push({ ...base, status: issues.length ? (high ? "deviation" : "review") : "ok", severity: issues.length ? (high && p.required ? "high" : "medium") : "low", detail: issuesText(shown), issues: shown, evidence: hits[0].text.slice(0, 400) });
  }
  const rank = { missing: 0, deviation: 1, review: 2, ok: 3 };
  findings.sort((a, b) => rank[a.status] - rank[b.status]);
  return { findings, clauses: by };
}

/** Words for the exports, in the member's language (English by default). */
export interface ReportLabels {
  playbook: string; required: string; standard: string; fallback: string; redFlags: string; review: string;
  clause: string; status: string; severity: string; detail: string; evidence: string; notAdvice: string;
  statuses: Record<Finding["status"], string>; severities: Record<Finding["severity"], string>;
}
export const REPORT_EN: ReportLabels = {
  playbook: "Playbook", required: "required", standard: "Standard", fallback: "Fallback", redFlags: "Red flags", review: "Playbook review",
  clause: "Clause", status: "Status", severity: "Severity", detail: "Detail", evidence: "Evidence", notAdvice: "General information, not legal advice.",
  statuses: { missing: "missing", deviation: "deviation", review: "review", ok: "ok" }, severities: { high: "high", medium: "medium", low: "low" },
};

export function playbookMarkdown(pb: Playbook, l: ReportLabels = REPORT_EN, names?: Partial<Record<ClauseType, string>>): string {
  const nm = (c: ClauseType) => names?.[c] || CLAUSE_TYPES.find((x) => x.id === c)!.name;
  return [`# ${l.playbook}: ${pb.name} (${pb.side})`, "", ...pb.positions.map((p) => `## ${nm(p.clause)}${p.required ? ` (${l.required})` : ""}\n- ${l.standard}: ${p.standard}\n- ${l.fallback}: ${p.fallback}${p.redFlags.length ? `\n- ${l.redFlags}: ${p.redFlags.join("; ")}` : ""}`)].join("\n");
}
export function findingsMarkdown(fs: Finding[], title: string, l: ReportLabels = REPORT_EN, detail: (f: Finding) => string = (f) => f.detail): string {
  return [`# ${l.review} — ${title}`, "", `| ${l.clause} | ${l.status} | ${l.severity} | ${l.detail} |`, "|---|---|---|---|", ...fs.map((f) => `| ${f.name} | ${l.statuses[f.status]} | ${l.severities[f.severity]} | ${detail(f).replace(/\|/g, "/")} |`), "", l.notAdvice].join("\n");
}
