/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER v4 — the member's compliance PROGRAMME: organisation
 * profile, frameworks in scope, per-control status (owner, due date, notes,
 * evidence, not-applicable justification), risk register, policies with
 * versions and approvals, vendors with questionnaire scores, and the AI
 * conversation. Scores, mappings, the SoA and every export are computed here
 * on the device. Pure: no React, no server imports.
 * ============================================================================ */
import { FRAMEWORKS, type FrameworkId } from "./frameworks";
import { LIBRARY, controlKey, findControl, mappedControls, type FrameworkControls } from "./controls";
import { POLICY_TEMPLATES, VENDOR_QUESTIONS, type Answer, type Criticality, type DataAccess, type RiskCategory } from "./library";
import { SAMPLE_EN, type SampleText } from "./sample-text";

export type ControlStatus = "not_started" | "in_progress" | "implemented" | "not_applicable";
export const CONTROL_STATUSES: ControlStatus[] = ["not_started", "in_progress", "implemented", "not_applicable"];
export interface EvidenceRef { id: string; name: string; size: number; type: string; addedAt: string }
export interface ControlState { status: ControlStatus; owner?: string; due?: string; notes?: string; justification?: string; evidence?: EvidenceRef[]; updatedAt?: string }

export type Treatment = "mitigate" | "accept" | "transfer" | "avoid";
export type RiskStatus = "open" | "treating" | "accepted" | "closed";
export interface Risk { id: string; title: string; description: string; category: RiskCategory; owner: string; likelihood: number; impact: number; treatment: Treatment; rLikelihood: number; rImpact: number; controls: string[]; status: RiskStatus; due?: string }

export type PolicyStatus = "draft" | "review" | "approved" | "retired";
export interface PolicyVersion { version: number; at: string; content: string; note?: string }
export interface Policy { id: string; template: string; title: string; status: PolicyStatus; owner: string; approver?: string; approvedAt?: string; reviewDue?: string; version: number; content: string; history: PolicyVersion[] }

export interface Vendor { id: string; name: string; service: string; criticality: Criticality; data: DataAccess; answers: Record<string, Answer>; lastReview?: string; nextReview?: string; notes?: string; contact?: string }

export interface OrgProfile { name: string; industry: string; size: string; country: string; description: string; systems: string; dataTypes: string }
export interface Msg { role: "user" | "assistant"; content: string }
export interface Workspace {
  v: 4; name: string; org: OrgProfile; frameworks: FrameworkId[];
  controls: Record<string, ControlState>; risks: Risk[]; policies: Policy[]; vendors: Vendor[];
  mode: string; messages: Msg[]; createdAt: string;
}

export const newId = (p = "x") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const clamp15 = (n: unknown, d = 3) => { const x = Math.round(Number(n)); return x >= 1 && x <= 5 ? x : d; };
const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const isFw = (x: unknown): x is FrameworkId => FRAMEWORKS.some((f) => f.id === x);

export function newWorkspace(name = ""): Workspace {
  return { v: 4, name, org: { name: "", industry: "", size: "", country: "", description: "", systems: "", dataTypes: "" }, frameworks: ["iso27001"], controls: {}, risks: [], policies: [], vendors: [], mode: "gap", messages: [], createdAt: new Date().toISOString() };
}

/** Accept a stored item (v4, or a v3 report {framework, mode, org, region, messages}) and return a valid Workspace. */
export function upgradeWorkspace(b: any, title = ""): Workspace {
  const w = newWorkspace(str(b?.name) || title);
  if (!b || typeof b !== "object") return w;
  const msgs: Msg[] = Array.isArray(b.messages) ? b.messages.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string") : [];
  if (b.v !== 4) {
    return { ...w, frameworks: isFw(b.framework) ? [b.framework] : w.frameworks, mode: str(b.mode, 30) || "gap", messages: msgs,
      org: { ...w.org, description: str(b.org), country: str(b.region, 200) } };
  }
  const controls: Record<string, ControlState> = {};
  for (const [k, s] of Object.entries(b.controls && typeof b.controls === "object" ? b.controls : {}) as [string, any][]) {
    const [fw, id] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
    if (!isFw(fw) || !findControl(fw, id) || !s || !CONTROL_STATUSES.includes(s.status)) continue;
    controls[k] = { status: s.status, owner: str(s.owner, 120), due: str(s.due, 10), notes: str(s.notes, 8000), justification: str(s.justification, 2000), updatedAt: str(s.updatedAt, 30),
      evidence: Array.isArray(s.evidence) ? s.evidence.filter((e: any) => e && typeof e.id === "string" && typeof e.name === "string").slice(0, 50) : [] };
  }
  return {
    ...w, name: str(b.name, 200) || title, messages: msgs, mode: str(b.mode, 30) || "gap", createdAt: str(b.createdAt, 30) || w.createdAt,
    org: { ...w.org, ...Object.fromEntries(Object.keys(w.org).map((k) => [k, str(b.org?.[k])])) } as OrgProfile,
    frameworks: Array.isArray(b.frameworks) ? (b.frameworks.filter(isFw) as FrameworkId[]) : w.frameworks,
    controls,
    risks: Array.isArray(b.risks) ? b.risks.filter((r: any) => r && typeof r.title === "string").map((r: any): Risk => ({
      id: str(r.id, 40) || newId("r"), title: str(r.title, 200), description: str(r.description), category: r.category || "security", owner: str(r.owner, 120),
      likelihood: clamp15(r.likelihood), impact: clamp15(r.impact), treatment: ["mitigate", "accept", "transfer", "avoid"].includes(r.treatment) ? r.treatment : "mitigate",
      rLikelihood: clamp15(r.rLikelihood, clamp15(r.likelihood)), rImpact: clamp15(r.rImpact, clamp15(r.impact)),
      controls: Array.isArray(r.controls) ? r.controls.filter((x: any) => typeof x === "string").slice(0, 50) : [], status: ["open", "treating", "accepted", "closed"].includes(r.status) ? r.status : "open", due: str(r.due, 10) })) : [],
    policies: Array.isArray(b.policies) ? b.policies.filter((p: any) => p && typeof p.content === "string").map((p: any): Policy => ({
      id: str(p.id, 40) || newId("p"), template: str(p.template, 40), title: str(p.title, 200), status: ["draft", "review", "approved", "retired"].includes(p.status) ? p.status : "draft",
      owner: str(p.owner, 120), approver: str(p.approver, 120), approvedAt: str(p.approvedAt, 30), reviewDue: str(p.reviewDue, 10), version: Math.max(1, Number(p.version) || 1), content: str(p.content, 200_000),
      history: Array.isArray(p.history) ? p.history.filter((h: any) => h && typeof h.content === "string").slice(-20) : [] })) : [],
    vendors: Array.isArray(b.vendors) ? b.vendors.filter((v: any) => v && typeof v.name === "string").map((v: any): Vendor => ({
      id: str(v.id, 40) || newId("v"), name: str(v.name, 200), service: str(v.service, 300), criticality: ["low", "medium", "high", "critical"].includes(v.criticality) ? v.criticality : "medium",
      data: ["none", "internal", "confidential", "personal", "sensitive"].includes(v.data) ? v.data : "internal", answers: v.answers && typeof v.answers === "object" ? v.answers : {},
      lastReview: str(v.lastReview, 10), nextReview: str(v.nextReview, 10), notes: str(v.notes), contact: str(v.contact, 200) })) : [],
  };
}

// ── Scores ───────────────────────────────────────────────────────────────────
const W: Record<ControlStatus, number> = { not_started: 0, in_progress: 0.5, implemented: 1, not_applicable: 0 };
export interface Score { total: number; applicable: number; implemented: number; inProgress: number; notStarted: number; na: number; pct: number; evidence: number; overdue: number }
export function score(w: Workspace, fw: FrameworkId, domain?: string, today = new Date().toISOString().slice(0, 10)): Score {
  const list = LIBRARY[fw].controls.filter((c) => !domain || c.domain === domain);
  const s: Score = { total: list.length, applicable: 0, implemented: 0, inProgress: 0, notStarted: 0, na: 0, pct: 0, evidence: 0, overdue: 0 };
  let pts = 0;
  for (const c of list) {
    const st = w.controls[controlKey(fw, c.id)];
    const status = st?.status || "not_started";
    if (status === "not_applicable") { s.na++; continue; }
    s.applicable++; pts += W[status];
    if (status === "implemented") s.implemented++; else if (status === "in_progress") s.inProgress++; else s.notStarted++;
    if (st?.evidence?.length) s.evidence++;
    if (st?.due && st.due < today && status !== "implemented") s.overdue++;
  }
  s.pct = s.applicable ? Math.round((pts / s.applicable) * 100) : 0;
  return s;
}
export const riskLevel = (l: number, i: number) => { const n = l * i; return n >= 15 ? "critical" : n >= 10 ? "high" : n >= 5 ? "medium" : "low"; };

/** Vendor score 0–100 from the questionnaire (N/A excluded), plus inherent and residual tiers. */
export function vendorScore(v: Vendor): { pct: number; answered: number; inherent: Criticality; residual: Criticality } {
  let got = 0, max = 0, answered = 0;
  for (const q of VENDOR_QUESTIONS) {
    const a = v.answers[q.id];
    if (!a || a === "na") continue;
    answered++; max += q.weight; got += q.weight * (a === "yes" ? 1 : a === "partial" ? 0.5 : 0);
  }
  const pct = max ? Math.round((got / max) * 100) : 0;
  const dataW = { none: 0, internal: 1, confidential: 2, personal: 2, sensitive: 3 }[v.data];
  const crit = { low: 0, medium: 1, high: 2, critical: 3 }[v.criticality];
  const inh = Math.max(dataW, crit);
  const tiers: Criticality[] = ["low", "medium", "high", "critical"];
  const residual = answered === 0 ? tiers[inh] : tiers[Math.max(0, Math.min(3, inh - (pct >= 85 ? 2 : pct >= 60 ? 1 : 0) + (pct < 40 ? 1 : 0)))];
  return { pct, answered, inherent: tiers[inh], residual };
}

/** Copy an implemented / in-progress control's status (and evidence) to mapped controls that are not started. */
export function applyToMapped(w: Workspace, fw: FrameworkId, id: string): { workspace: Workspace; changed: string[] } {
  const src = w.controls[controlKey(fw, id)];
  if (!src || (src.status !== "implemented" && src.status !== "in_progress")) return { workspace: w, changed: [] };
  const controls = { ...w.controls }; const changed: string[] = [];
  for (const m of mappedControls(fw, id)) {
    if (!w.frameworks.includes(m.fw)) continue;
    const k = controlKey(m.fw, m.control.id);
    const cur = controls[k];
    if (cur && cur.status !== "not_started") continue;
    controls[k] = { ...(cur || {}), status: "in_progress", evidence: [...(cur?.evidence || []), ...(src.evidence || [])].slice(0, 50),
      notes: [cur?.notes, `Mapped from ${FRAMEWORKS.find((f) => f.id === fw)?.name} ${id} — review before marking implemented.`].filter(Boolean).join("\n"), updatedAt: new Date().toISOString() };
    changed.push(k);
  }
  return { workspace: { ...w, controls }, changed };
}

/** Controls the policy template evidences, restricted to frameworks in scope. */
export const policyControls = (w: Workspace, templateId: string) => {
  const t = POLICY_TEMPLATES.find((x) => x.id === templateId);
  return t ? (Object.entries(t.controls) as [FrameworkId, string[]][]).filter(([fw]) => w.frameworks.includes(fw)).flatMap(([fw, ids]) => ids.map((id) => ({ fw, id }))) : [];
};

// ── Exports ──────────────────────────────────────────────────────────────────
const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";

/** The words of the reports and CSV exports, in the member's language (English by default). */
export interface ReportWords {
  title: string; organisation: string; generated: string; orgLabel: string; summary: string;
  framework: string; readiness: string; implemented: string; inProgress: string; notStarted: string; na: string; withEvidence: string; overdue: string;
  domain: string; openControls: string; topRisks: string; risk: string; inherent: string; residual: string; treatment: string; owner: string;
  policies: string; policy: string; version: string; status: string; approved: string; by: string; reviewDue: string;
  vendors: string; vendor: string; criticality: string; data: string; score: string; residualTier: string; nextReview: string;
  soaTitle: string; soaSub: string; control: string; ctrlTitle: string; applicable: string; justification: string; yes: string; no: string;
  due: string; evidence: string; notes: string; id: string; category: string; likelihood: string; impact: string; rLikelihood: string; rImpact: string;
  controls: string; service: string; lastReview: string;
  statuses: Record<ControlStatus, string>; levels: Record<Criticality, string>; treatments: Record<Risk["treatment"], string>;
  riskStatuses: Record<Risk["status"], string>; policyStatuses: Record<Policy["status"], string>; dataAccess: Record<DataAccess, string>; categories: Record<RiskCategory, string>;
}
export const REPORT_WORDS_EN: ReportWords = {
  title: "Compliance readiness — {org}", organisation: "Organisation",
  generated: "Generated {date}. Readiness = implemented + half of in-progress, over applicable controls. This is a self-assessment, not an audit opinion.",
  orgLabel: "Organisation", summary: "Summary", framework: "Framework", readiness: "Readiness", implemented: "Implemented", inProgress: "In progress", notStarted: "Not started",
  na: "N/A", withEvidence: "With evidence", overdue: "Overdue", domain: "Domain", openControls: "Open controls", topRisks: "Top risks", risk: "Risk", inherent: "Inherent",
  residual: "Residual", treatment: "Treatment", owner: "Owner", policies: "Policies", policy: "Policy", version: "Version", status: "Status", approved: "Approved", by: "by",
  reviewDue: "Review due", vendors: "Vendors", vendor: "Vendor", criticality: "Criticality", data: "Data", score: "Score", residualTier: "Residual tier", nextReview: "Next review",
  soaTitle: "Statement of Applicability — {org}", soaSub: "ISO/IEC 27001:2022 Annex A · generated {date}", control: "Control", ctrlTitle: "Title", applicable: "Applicable",
  justification: "Justification / implementation", yes: "Yes", no: "No", due: "Due", evidence: "Evidence", notes: "Notes", id: "ID", category: "Category",
  likelihood: "Likelihood", impact: "Impact", rLikelihood: "Residual likelihood", rImpact: "Residual impact", controls: "Controls", service: "Service", lastReview: "Last review",
  statuses: { not_started: "not started", in_progress: "in progress", implemented: "implemented", not_applicable: "not applicable" },
  levels: { low: "low", medium: "medium", high: "high", critical: "critical" },
  treatments: { mitigate: "mitigate", accept: "accept", transfer: "transfer", avoid: "avoid" },
  riskStatuses: { open: "open", treating: "treating", accepted: "accepted", closed: "closed" },
  policyStatuses: { draft: "draft", review: "review", approved: "approved", retired: "retired" },
  dataAccess: { none: "none", internal: "internal", confidential: "confidential", personal: "personal", sensitive: "sensitive" },
  categories: { security: "security", privacy: "privacy", operational: "operational", vendor: "vendor", legal: "legal", financial: "financial", strategic: "strategic" },
};
/** `lib` = the control library in the member's language (lib/compliance/catalog.ts), `W` = the report words. */
export interface ReportOpts { lib?: Record<FrameworkId, FrameworkControls>; words?: ReportWords }

export function controlsCsv(w: Workspace, o: ReportOpts = {}): string {
  const L = o.lib || LIBRARY, W = o.words || REPORT_WORDS_EN;
  const rows: unknown[][] = [[W.framework, W.control, W.ctrlTitle, W.domain, W.status, W.owner, W.due, W.evidence, W.notes, W.justification]];
  for (const fw of w.frameworks) for (const c of L[fw].controls) {
    const s = w.controls[controlKey(fw, c.id)];
    rows.push([L[fw].version, c.id, c.title, L[fw].domains.find((d) => d.id === c.domain)?.name || c.domain, W.statuses[s?.status || "not_started"], s?.owner || "", s?.due || "", (s?.evidence || []).map((e) => e.name).join("; "), s?.notes || "", s?.justification || ""]);
  }
  return toCsv(rows);
}
export const risksCsv = (w: Workspace, o: ReportOpts = {}) => { const W = o.words || REPORT_WORDS_EN; return toCsv([[W.id, W.risk, W.category, W.owner, W.likelihood, W.impact, W.inherent, W.treatment, W.rLikelihood, W.rImpact, W.residual, W.status, W.due, W.controls],
  ...w.risks.map((r) => [r.id, r.title, W.categories[r.category] || r.category, r.owner, r.likelihood, r.impact, W.levels[riskLevel(r.likelihood, r.impact)], W.treatments[r.treatment] || r.treatment, r.rLikelihood, r.rImpact, W.levels[riskLevel(r.rLikelihood, r.rImpact)], W.riskStatuses[r.status] || r.status, r.due || "", r.controls.join("; ")])]); };
export const vendorsCsv = (w: Workspace, o: ReportOpts = {}) => { const W = o.words || REPORT_WORDS_EN; return toCsv([[W.vendor, W.service, W.criticality, W.data, W.score, W.inherent, W.residual, W.lastReview, W.nextReview],
  ...w.vendors.map((v) => { const s = vendorScore(v); return [v.name, v.service, W.levels[v.criticality], W.dataAccess[v.data], s.pct, W.levels[s.inherent], W.levels[s.residual], v.lastReview || "", v.nextReview || ""]; })]); };

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
/** ISO/IEC 27001 Statement of Applicability (Markdown). */
export function soaMarkdown(w: Workspace, o: ReportOpts = {}): string {
  const L0 = o.lib || LIBRARY, W = o.words || REPORT_WORDS_EN;
  const org = w.org.name || w.name || W.organisation;
  const L = [`# ${W.soaTitle.replace("{org}", org)}`, "", W.soaSub.replace("{date}", new Date().toISOString().slice(0, 10)), "",
    `| ${W.control} | ${W.ctrlTitle} | ${W.applicable} | ${W.status} | ${W.justification} |`, "|---|---|---|---|---|"];
  for (const c of L0.iso27001.controls) {
    const s = w.controls[controlKey("iso27001", c.id)];
    const na = s?.status === "not_applicable";
    L.push(`| ${c.id} | ${esc(c.title)} | ${na ? W.no : W.yes} | ${W.statuses[s?.status || "not_started"]} | ${esc(na ? s?.justification || "—" : s?.notes || "—").slice(0, 300)} |`);
  }
  return L.join("\n") + "\n";
}

/** Readiness report (Markdown). */
export function reportMarkdown(w: Workspace, today = new Date().toISOString().slice(0, 10), o: ReportOpts = {}): string {
  const LB = o.lib || LIBRARY, W = o.words || REPORT_WORDS_EN;
  const L: string[] = [`# ${W.title.replace("{org}", w.org.name || w.name || W.organisation)}`, "", W.generated.replace("{date}", today), ""];
  if (w.org.description) L.push(`**${W.orgLabel}:** ${w.org.description}`, "");
  L.push(`## ${W.summary}`, "", `| ${W.framework} | ${W.readiness} | ${W.implemented} | ${W.inProgress} | ${W.notStarted} | ${W.na} | ${W.withEvidence} | ${W.overdue} |`, "|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const fw of w.frameworks) { const s = score(w, fw, undefined, today); L.push(`| ${LB[fw].version} | **${s.pct}%** | ${s.implemented} | ${s.inProgress} | ${s.notStarted} | ${s.na} | ${s.evidence} | ${s.overdue} |`); }
  L.push("");
  for (const fw of w.frameworks) {
    L.push(`## ${LB[fw].version}`, "", `| ${W.domain} | ${W.readiness} | ${W.openControls} |`, "|---|---:|---|");
    for (const d of LB[fw].domains) {
      const s = score(w, fw, d.id, today);
      const open = LB[fw].controls.filter((c) => c.domain === d.id && !["implemented", "not_applicable"].includes(w.controls[controlKey(fw, c.id)]?.status || "")).map((c) => c.id);
      L.push(`| ${d.name} | ${s.pct}% | ${open.slice(0, 12).join(", ")}${open.length > 12 ? ` +${open.length - 12}` : ""} |`);
    }
    L.push("");
  }
  const openRisks = w.risks.filter((r) => r.status !== "closed").sort((a, b) => b.rLikelihood * b.rImpact - a.rLikelihood * a.rImpact);
  if (openRisks.length) L.push(`## ${W.topRisks}`, "", `| ${W.risk} | ${W.inherent} | ${W.residual} | ${W.treatment} | ${W.owner} |`, "|---|---|---|---|---|",
    ...openRisks.slice(0, 15).map((r) => `| ${esc(r.title)} | ${W.levels[riskLevel(r.likelihood, r.impact)]} (${r.likelihood}×${r.impact}) | ${W.levels[riskLevel(r.rLikelihood, r.rImpact)]} (${r.rLikelihood}×${r.rImpact}) | ${W.treatments[r.treatment] || r.treatment} | ${esc(r.owner || "—")} |`), "");
  if (w.policies.length) L.push(`## ${W.policies}`, "", `| ${W.policy} | ${W.version} | ${W.status} | ${W.owner} | ${W.approved} | ${W.reviewDue} |`, "|---|---:|---|---|---|---|",
    ...w.policies.map((p) => `| ${esc(p.title)} | v${p.version} | ${W.policyStatuses[p.status] || p.status} | ${esc(p.owner || "—")} | ${p.approvedAt ? `${p.approvedAt.slice(0, 10)} ${W.by} ${esc(p.approver || "—")}` : "—"} | ${p.reviewDue || "—"} |`), "");
  if (w.vendors.length) L.push(`## ${W.vendors}`, "", `| ${W.vendor} | ${W.criticality} | ${W.data} | ${W.score} | ${W.residualTier} | ${W.nextReview} |`, "|---|---|---|---:|---|---|",
    ...w.vendors.map((v) => { const s = vendorScore(v); return `| ${esc(v.name)} | ${W.levels[v.criticality]} | ${W.dataAccess[v.data]} | ${s.answered ? `${s.pct}%` : "—"} | ${W.levels[s.residual]} | ${v.nextReview || "—"} |`; }), "");
  return L.join("\n");
}

/** A compact briefing of the programme for the AI (never the evidence files). */
export function aiContext(w: Workspace, focus?: { fw: FrameworkId; id: string }, maxChars = 14_000): string {
  const L: string[] = [`PROGRAMME: ${w.org.name || w.name || "(unnamed)"}${w.org.industry ? ` · ${w.org.industry}` : ""}${w.org.size ? ` · ${w.org.size}` : ""}${w.org.country ? ` · ${w.org.country}` : ""}`];
  if (w.org.description) L.push(`About: ${w.org.description.slice(0, 1500)}`);
  if (w.org.systems) L.push(`Systems: ${w.org.systems.slice(0, 800)}`);
  if (w.org.dataTypes) L.push(`Data processed: ${w.org.dataTypes.slice(0, 500)}`);
  for (const fw of w.frameworks) {
    const s = score(w, fw);
    L.push(`${LIBRARY[fw].version}: readiness ${s.pct}% · implemented ${s.implemented} · in progress ${s.inProgress} · not started ${s.notStarted} · N/A ${s.na} · overdue ${s.overdue}`);
    const open = LIBRARY[fw].controls.filter((c) => (w.controls[controlKey(fw, c.id)]?.status || "not_started") !== "implemented" && w.controls[controlKey(fw, c.id)]?.status !== "not_applicable");
    if (open.length) L.push(`  Open: ${open.slice(0, 40).map((c) => `${c.id} ${c.title}`).join("; ")}${open.length > 40 ? ` … +${open.length - 40}` : ""}`);
  }
  if (focus) {
    const c = findControl(focus.fw, focus.id), s = w.controls[controlKey(focus.fw, focus.id)];
    if (c) L.push(`FOCUS CONTROL: ${LIBRARY[focus.fw].version} ${c.id} — ${c.title}. Status ${s?.status || "not_started"}${s?.owner ? `, owner ${s.owner}` : ""}${s?.notes ? `. Notes: ${s.notes.slice(0, 1500)}` : ""}${s?.evidence?.length ? `. Evidence files: ${s.evidence.map((e) => e.name).join(", ")}` : ""}`,
      `  Mapped: ${mappedControls(focus.fw, focus.id).slice(0, 12).map((m) => `${m.fw}:${m.control.id}`).join(", ") || "—"}`);
  }
  const risks = w.risks.filter((r) => r.status !== "closed").sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact).slice(0, 12);
  if (risks.length) L.push("Top risks:", ...risks.map((r) => `- ${r.title} (${r.category}) inherent ${r.likelihood}×${r.impact}, residual ${r.rLikelihood}×${r.rImpact}, ${r.treatment}, ${r.status}`));
  if (w.policies.length) L.push(`Policies: ${w.policies.map((p) => `${p.title} v${p.version} ${p.status}`).join("; ")}`);
  if (w.vendors.length) L.push(`Vendors: ${w.vendors.slice(0, 20).map((v) => { const s = vendorScore(v); return `${v.name} (${v.criticality}, ${v.data}, ${s.answered ? `${s.pct}%` : "unassessed"})`; }).join("; ")}`);
  const out = L.join("\n");
  return out.length > maxChars ? `${out.slice(0, maxChars)}\n[…truncated]` : out;
}

/** A realistic starting programme for "Load a sample". */
/** The sample programme, worded in the member's language (`text`, see lib/compliance/catalog.ts). */
export function sampleWorkspace(text: SampleText = SAMPLE_EN): Workspace {
  const T = text, O = T.owners;
  const w = newWorkspace(T.name);
  const now = new Date(); const d = (days: number) => new Date(now.getTime() + days * 864e5).toISOString().slice(0, 10);
  w.org = { name: T.orgName, industry: T.industry, size: T.size, country: T.country, description: T.description, systems: T.systems, dataTypes: T.dataTypes };
  w.frameworks = ["iso27001", "soc2", "gdpr", "uupdp"];
  const set = (fw: FrameworkId, id: string, s: ControlStatus, extra: Partial<ControlState> = {}) => { w.controls[controlKey(fw, id)] = { status: s, updatedAt: now.toISOString(), ...extra }; };
  for (const id of ["A.5.1", "A.5.2", "A.5.15", "A.5.17", "A.8.5", "A.8.13", "A.8.24", "A.8.15", "A.6.3", "A.8.9"]) set("iso27001", id, "implemented", { owner: O.ciso });
  for (const id of ["A.5.9", "A.5.19", "A.5.24", "A.8.8", "A.8.25", "A.8.32", "A.5.30"]) set("iso27001", id, "in_progress", { owner: O.eng, due: d(30) });
  set("iso27001", "A.8.16", "in_progress", { owner: O.sre, due: d(-7), notes: T.siemNote });
  for (const id of ["A.7.1", "A.7.2", "A.7.3", "A.7.4", "A.7.5", "A.7.6", "A.7.8", "A.7.11", "A.7.12", "A.7.13"]) set("iso27001", id, "not_applicable", { justification: T.physicalNa });
  for (const id of ["CC6.1", "CC6.2", "CC6.3", "CC8.1", "CC1.1"]) set("soc2", id, "implemented", { owner: O.ciso });
  for (const id of ["CC7.2", "CC9.2", "CC3.2"]) set("soc2", id, "in_progress", { due: d(45) });
  for (const id of ["Art. 30", "Art. 32", "Art. 28"]) set("gdpr", id, "in_progress", { owner: O.dpo, due: d(20) });
  set("gdpr", "Art. 13–14", "implemented", { owner: O.dpo });
  set("uupdp", "Pasal 46", "not_started", { owner: O.dpo, due: d(14) });
  const R = T.risks;
  w.risks = [
    { id: newId("r"), title: R[0].title, description: R[0].description, category: "security", owner: O.ciso, likelihood: 3, impact: 5, treatment: "mitigate", rLikelihood: 2, rImpact: 4, controls: ["iso27001:A.8.13", "iso27001:A.5.30"], status: "treating", due: d(60) },
    { id: newId("r"), title: R[1].title, description: R[1].description, category: "privacy", owner: O.sre, likelihood: 2, impact: 5, treatment: "mitigate", rLikelihood: 1, rImpact: 5, controls: ["iso27001:A.8.9", "soc2:CC6.1"], status: "treating" },
    { id: newId("r"), title: R[2].title, description: R[2].description, category: "legal", owner: O.dpo, likelihood: 3, impact: 4, treatment: "mitigate", rLikelihood: 2, rImpact: 3, controls: ["uupdp:Pasal 46", "gdpr:Art. 33"], status: "open", due: d(14) },
    { id: newId("r"), title: R[3].title, description: R[3].description, category: "operational", owner: O.cto, likelihood: 3, impact: 3, treatment: "accept", rLikelihood: 3, rImpact: 3, controls: [], status: "accepted" },
  ];
  const V = T.vendors;
  w.vendors = [
    { id: newId("v"), name: V[0].name, service: V[0].service, criticality: "critical", data: "sensitive", answers: Object.fromEntries(VENDOR_QUESTIONS.map((q) => [q.id, q.id === "insurance" ? "na" : "yes"])), lastReview: d(-90), nextReview: d(275) },
    { id: newId("v"), name: V[1].name, service: V[1].service, criticality: "high", data: "personal", answers: { cert: "no", pentest: "partial", dpa: "yes", mfa: "partial", rest: "yes", transit: "yes", ir: "no", backup: "partial" }, nextReview: d(10) },
  ];
  return w;
}
