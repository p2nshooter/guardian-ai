/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER v4 — the member's compliance PROGRAMME: organisation
 * profile, frameworks in scope, per-control status (owner, due date, notes,
 * evidence, not-applicable justification), risk register, policies with
 * versions and approvals, vendors with questionnaire scores, and the AI
 * conversation. Scores, mappings, the SoA and every export are computed here
 * on the device. Pure: no React, no server imports.
 * ============================================================================ */
import { FRAMEWORKS, type FrameworkId } from "./frameworks";
import { LIBRARY, controlKey, findControl, mappedControls } from "./controls";
import { POLICY_TEMPLATES, VENDOR_QUESTIONS, type Answer, type Criticality, type DataAccess, type RiskCategory } from "./library";

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

export function controlsCsv(w: Workspace): string {
  const rows: unknown[][] = [["framework", "control", "title", "domain", "status", "owner", "due", "evidence", "notes", "justification"]];
  for (const fw of w.frameworks) for (const c of LIBRARY[fw].controls) {
    const s = w.controls[controlKey(fw, c.id)];
    rows.push([LIBRARY[fw].version, c.id, c.title, LIBRARY[fw].domains.find((d) => d.id === c.domain)?.name || c.domain, s?.status || "not_started", s?.owner || "", s?.due || "", (s?.evidence || []).map((e) => e.name).join("; "), s?.notes || "", s?.justification || ""]);
  }
  return toCsv(rows);
}
export const risksCsv = (w: Workspace) => toCsv([["id", "title", "category", "owner", "likelihood", "impact", "inherent", "treatment", "residual likelihood", "residual impact", "residual", "status", "due", "controls"],
  ...w.risks.map((r) => [r.id, r.title, r.category, r.owner, r.likelihood, r.impact, riskLevel(r.likelihood, r.impact), r.treatment, r.rLikelihood, r.rImpact, riskLevel(r.rLikelihood, r.rImpact), r.status, r.due || "", r.controls.join("; ")])]);
export const vendorsCsv = (w: Workspace) => toCsv([["name", "service", "criticality", "data", "score", "inherent", "residual", "last review", "next review"],
  ...w.vendors.map((v) => { const s = vendorScore(v); return [v.name, v.service, v.criticality, v.data, s.pct, s.inherent, s.residual, v.lastReview || "", v.nextReview || ""]; })]);

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
/** ISO/IEC 27001 Statement of Applicability (Markdown). */
export function soaMarkdown(w: Workspace): string {
  const L = [`# Statement of Applicability — ${w.org.name || w.name || "Organisation"}`, "", `ISO/IEC 27001:2022 Annex A · generated ${new Date().toISOString().slice(0, 10)}`, "",
    "| Control | Title | Applicable | Status | Justification / implementation |", "|---|---|---|---|---|"];
  for (const c of LIBRARY.iso27001.controls) {
    const s = w.controls[controlKey("iso27001", c.id)];
    const na = s?.status === "not_applicable";
    L.push(`| ${c.id} | ${esc(c.title)} | ${na ? "No" : "Yes"} | ${(s?.status || "not_started").replace("_", " ")} | ${esc(na ? s?.justification || "—" : s?.notes || "—").slice(0, 300)} |`);
  }
  return L.join("\n") + "\n";
}

/** Readiness report (Markdown). */
export function reportMarkdown(w: Workspace, today = new Date().toISOString().slice(0, 10)): string {
  const L: string[] = [`# Compliance readiness — ${w.org.name || w.name || "Organisation"}`, "", `Generated ${today}. Readiness = implemented + half of in-progress, over applicable controls. This is a self-assessment, not an audit opinion.`, ""];
  if (w.org.description) L.push(`**Organisation:** ${w.org.description}`, "");
  L.push("## Summary", "", "| Framework | Readiness | Implemented | In progress | Not started | N/A | With evidence | Overdue |", "|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const fw of w.frameworks) { const s = score(w, fw, undefined, today); L.push(`| ${LIBRARY[fw].version} | **${s.pct}%** | ${s.implemented} | ${s.inProgress} | ${s.notStarted} | ${s.na} | ${s.evidence} | ${s.overdue} |`); }
  L.push("");
  for (const fw of w.frameworks) {
    L.push(`## ${LIBRARY[fw].version}`, "", "| Domain | Readiness | Open controls |", "|---|---:|---|");
    for (const d of LIBRARY[fw].domains) {
      const s = score(w, fw, d.id, today);
      const open = LIBRARY[fw].controls.filter((c) => c.domain === d.id && !["implemented", "not_applicable"].includes(w.controls[controlKey(fw, c.id)]?.status || "")).map((c) => c.id);
      L.push(`| ${d.name} | ${s.pct}% | ${open.slice(0, 12).join(", ")}${open.length > 12 ? ` +${open.length - 12}` : ""} |`);
    }
    L.push("");
  }
  const openRisks = w.risks.filter((r) => r.status !== "closed").sort((a, b) => b.rLikelihood * b.rImpact - a.rLikelihood * a.rImpact);
  if (openRisks.length) L.push("## Top risks", "", "| Risk | Inherent | Residual | Treatment | Owner |", "|---|---|---|---|---|",
    ...openRisks.slice(0, 15).map((r) => `| ${esc(r.title)} | ${riskLevel(r.likelihood, r.impact)} (${r.likelihood}×${r.impact}) | ${riskLevel(r.rLikelihood, r.rImpact)} (${r.rLikelihood}×${r.rImpact}) | ${r.treatment} | ${esc(r.owner || "—")} |`), "");
  if (w.policies.length) L.push("## Policies", "", "| Policy | Version | Status | Owner | Approved | Review due |", "|---|---:|---|---|---|---|",
    ...w.policies.map((p) => `| ${esc(p.title)} | v${p.version} | ${p.status} | ${esc(p.owner || "—")} | ${p.approvedAt ? `${p.approvedAt.slice(0, 10)} by ${esc(p.approver || "—")}` : "—"} | ${p.reviewDue || "—"} |`), "");
  if (w.vendors.length) L.push("## Vendors", "", "| Vendor | Criticality | Data | Score | Residual tier | Next review |", "|---|---|---|---:|---|---|",
    ...w.vendors.map((v) => { const s = vendorScore(v); return `| ${esc(v.name)} | ${v.criticality} | ${v.data} | ${s.answered ? `${s.pct}%` : "—"} | ${s.residual} | ${v.nextReview || "—"} |`; }), "");
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
export function sampleWorkspace(): Workspace {
  const w = newWorkspace("Sample: 60-person B2B SaaS");
  const now = new Date(); const d = (days: number) => new Date(now.getTime() + days * 864e5).toISOString().slice(0, 10);
  w.org = { name: "Nusantara Cloud (sample)", industry: "B2B SaaS — HR software", size: "60 employees", country: "Indonesia, customers in the EU", description: "Multi-tenant HR platform hosted on AWS (ap-southeast-3). Customers are mid-size companies in Indonesia and the EU.", systems: "AWS (EKS, RDS PostgreSQL, S3), Google Workspace, GitHub, Okta, Slack, Jira", dataTypes: "Employee personal data incl. payroll, national ID numbers, bank accounts; some health data (sick leave)" };
  w.frameworks = ["iso27001", "soc2", "gdpr", "uupdp"];
  const set = (fw: FrameworkId, id: string, s: ControlStatus, extra: Partial<ControlState> = {}) => { w.controls[controlKey(fw, id)] = { status: s, updatedAt: now.toISOString(), ...extra }; };
  for (const id of ["A.5.1", "A.5.2", "A.5.15", "A.5.17", "A.8.5", "A.8.13", "A.8.24", "A.8.15", "A.6.3", "A.8.9"]) set("iso27001", id, "implemented", { owner: "CISO" });
  for (const id of ["A.5.9", "A.5.19", "A.5.24", "A.8.8", "A.8.25", "A.8.32", "A.5.30"]) set("iso27001", id, "in_progress", { owner: "Head of Engineering", due: d(30) });
  set("iso27001", "A.8.16", "in_progress", { owner: "SRE lead", due: d(-7), notes: "SIEM rollout slipped." });
  for (const id of ["A.7.1", "A.7.2", "A.7.3", "A.7.4", "A.7.5", "A.7.6", "A.7.8", "A.7.11", "A.7.12", "A.7.13"]) set("iso27001", id, "not_applicable", { justification: "No own premises or data centre: fully remote company on AWS; physical controls inherited from AWS (see AWS SOC 2 report)." });
  for (const id of ["CC6.1", "CC6.2", "CC6.3", "CC8.1", "CC1.1"]) set("soc2", id, "implemented", { owner: "CISO" });
  for (const id of ["CC7.2", "CC9.2", "CC3.2"]) set("soc2", id, "in_progress", { due: d(45) });
  for (const id of ["Art. 30", "Art. 32", "Art. 28"]) set("gdpr", id, "in_progress", { owner: "DPO", due: d(20) });
  set("gdpr", "Art. 13–14", "implemented", { owner: "DPO" });
  set("uupdp", "Pasal 46", "not_started", { owner: "DPO", due: d(14) });
  w.risks = [
    { id: newId("r"), title: "Ransomware encrypts production database", description: "Compromised admin credentials used to encrypt RDS snapshots.", category: "security", owner: "CISO", likelihood: 3, impact: 5, treatment: "mitigate", rLikelihood: 2, rImpact: 4, controls: ["iso27001:A.8.13", "iso27001:A.5.30"], status: "treating", due: d(60) },
    { id: newId("r"), title: "Payroll data exposed through misconfigured S3 bucket", description: "Public bucket or over-broad IAM policy.", category: "privacy", owner: "SRE lead", likelihood: 2, impact: 5, treatment: "mitigate", rLikelihood: 1, rImpact: 5, controls: ["iso27001:A.8.9", "soc2:CC6.1"], status: "treating" },
    { id: newId("r"), title: "Breach not reported within 3 × 24 hours (UU PDP)", description: "No tested breach-notification procedure.", category: "legal", owner: "DPO", likelihood: 3, impact: 4, treatment: "mitigate", rLikelihood: 2, rImpact: 3, controls: ["uupdp:Pasal 46", "gdpr:Art. 33"], status: "open", due: d(14) },
    { id: newId("r"), title: "Key engineer leaves; single point of knowledge", description: "", category: "operational", owner: "CTO", likelihood: 3, impact: 3, treatment: "accept", rLikelihood: 3, rImpact: 3, controls: [], status: "accepted" },
  ];
  w.vendors = [
    { id: newId("v"), name: "Amazon Web Services", service: "Hosting (EKS, RDS, S3)", criticality: "critical", data: "sensitive", answers: Object.fromEntries(VENDOR_QUESTIONS.map((q) => [q.id, q.id === "insurance" ? "na" : "yes"])), lastReview: d(-90), nextReview: d(275) },
    { id: newId("v"), name: "PayrollConnect (sample)", service: "Payroll file transfer", criticality: "high", data: "personal", answers: { cert: "no", pentest: "partial", dpa: "yes", mfa: "partial", rest: "yes", transit: "yes", ir: "no", backup: "partial" }, nextReview: d(10) },
  ];
  return w;
}
