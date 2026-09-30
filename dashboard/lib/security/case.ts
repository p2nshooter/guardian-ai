/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — the investigation CASE: status, severity, tags, notes,
 * evidence artifacts (logs, e-mails, text), the analyst's IOC verdicts and
 * ATT&CK additions, and the AI conversation. Everything else (events, stats,
 * detections, IOCs, techniques, timeline) is recomputed from the evidence on
 * the device. Also: the incident report (Markdown) and a compact AI context.
 * ============================================================================ */
import { detect, technique, techniquesIn, primaryTactic, TACTICS, sevRank, type Detection, type Severity } from "./attack";
import { parseLogs, stats, eventText, type LogEvent, type LogFormat, type Stats } from "./parse";
import { extract, mergeIocs, defang, type Ioc, type Verdict } from "./ioc";
import type { EmailReport } from "./eml";

export type CaseStatus = "open" | "investigating" | "contained" | "closed";
export const CASE_STATUSES: CaseStatus[] = ["open", "investigating", "contained", "closed"];
export type ArtifactKind = "log" | "email" | "text";
export interface Artifact { id: string; name: string; kind: ArtifactKind; size: number; addedAt: string; text: string; format?: LogFormat; email?: Omit<EmailReport, "html" | "text" | "headers"> & { textSample: string } }
export interface Note { id: string; at: string; text: string }
export interface Msg { role: "user" | "assistant"; content: string }
export interface Case {
  v: 4; title: string; status: CaseStatus; severity: Severity; tags: string[]; summary: string;
  notes: Note[]; artifacts: Artifact[]; iocState: Record<string, { verdict: Verdict; note?: string }>; attackManual: string[];
  mode: string; messages: Msg[]; createdAt: string;
}
export const MAX_ARTIFACT_CHARS = 3_000_000;
// A saved case is one encrypted history item (≤ 5 MB), so evidence text is capped below that.
export const MAX_CASE_CHARS = 4_000_000;

export const newId = (p = "a") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export function newCase(title = ""): Case {
  return { v: 4, title, status: "open", severity: "medium", tags: [], summary: "", notes: [], artifacts: [], iocState: {}, attackManual: [], mode: "triage", messages: [], createdAt: new Date().toISOString() };
}
/** Accept a stored case (v4, or a v3 conversation) and return a valid Case. */
export function upgradeCase(b: any): Case {
  const c = newCase(String(b?.title || ""));
  if (!b || typeof b !== "object") return c;
  const msgs: Msg[] = Array.isArray(b.messages) ? b.messages.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string") : [];
  if (b.v !== 4) {
    // v3: {mode, context, messages} — keep the conversation, turn the context into a note.
    return { ...c, mode: String(b.mode || "triage"), messages: msgs, notes: b.context ? [{ id: newId("n"), at: c.createdAt, text: String(b.context).slice(0, 4000) }] : [] };
  }
  return {
    ...c, ...b, v: 4, messages: msgs,
    status: CASE_STATUSES.includes(b.status) ? b.status : "open",
    severity: ["info", "low", "medium", "high", "critical"].includes(b.severity) ? b.severity : "medium",
    tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 30) : [],
    notes: Array.isArray(b.notes) ? b.notes.filter((n: any) => n && typeof n.text === "string") : [],
    artifacts: Array.isArray(b.artifacts) ? b.artifacts.filter((a: any) => a && typeof a.text === "string" && typeof a.name === "string") : [],
    iocState: b.iocState && typeof b.iocState === "object" ? b.iocState : {},
    attackManual: Array.isArray(b.attackManual) ? b.attackManual.filter((x: any) => typeof x === "string" && technique(x)) : [],
  };
}
export const caseChars = (c: Case) => c.artifacts.reduce((n, a) => n + a.text.length, 0);

export interface Computed {
  events: LogEvent[]; stats: Stats; detections: Detection[]; iocs: Ioc[];
  techniques: { id: string; sources: ("rule" | "analyst" | "ai")[]; count: number }[];
  emails: Artifact[]; worst: Severity;
}
const iocKey = (x: Pick<Ioc, "type" | "value">) => `${x.type}:${x.value}`;

export function compute(c: Case): Computed {
  const events: LogEvent[] = [];
  const textDocs: { i: number; text: string }[] = [];
  const iocLists: Ioc[][] = [];
  for (const a of c.artifacts) {
    if (a.kind === "log") {
      const { events: ev } = parseLogs(a.text, { start: events.length, artifact: a.name });
      events.push(...ev);
    } else if (a.kind === "text") textDocs.push({ i: -1, text: a.text });
    iocLists.push(extract(a.kind === "email" ? [a.email?.from, a.email?.replyTo, a.email?.returnPath, ...(a.email?.links || []).map((l) => l.href), ...(a.email?.attachments || []).map((x) => `${x.name} ${x.sha256}`), ...(a.email?.hops || []).map((h) => h.ip), a.email?.textSample].join("\n") : a.text, a.name));
  }
  const detections = detect([...events.map((e) => ({ i: e.i, text: eventText(e) })), ...textDocs]);
  // An event is at least as severe as the worst detection that matched it.
  const byI = new Map(events.map((e) => [e.i, e]));
  for (const d of detections) for (const i of d.events) { const e = byI.get(i); if (e && sevRank(d.severity) > sevRank(e.severity)) e.severity = d.severity; }
  // Brute force from the stats counts as a detection too.
  const st = stats(events);
  if (st.bruteForce.length) detections.push({ rule: "brute-force", title: `Brute force from ${st.bruteForce.length} source${st.bruteForce.length === 1 ? "" : "s"}${st.bruteForce.some((b) => b.success) ? " — followed by a successful logon" : ""}`,
    techniques: ["T1110"], severity: st.bruteForce.some((b) => b.success) ? "critical" : "high", events: [] });
  for (const e of c.artifacts.filter((a) => a.kind === "email")) {
    if (e.email && e.email.verdict !== "clean") detections.push({ rule: "phishing", title: `Phishing e-mail: ${e.email.subject || e.name}`.slice(0, 120), techniques: [e.email.attachments.length ? "T1566.001" : "T1566.002"], severity: e.email.verdict === "phishing" ? "high" : "medium", events: [] });
  }
  detections.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));

  let iocs = mergeIocs(...iocLists);
  iocs = iocs.map((x) => { const s = c.iocState[iocKey(x)]; return s ? { ...x, verdict: s.verdict, note: s.note } : x; });

  const tech = new Map<string, { id: string; sources: ("rule" | "analyst" | "ai")[]; count: number }>();
  const addT = (id: string, src: "rule" | "analyst" | "ai", n = 1) => {
    if (!technique(id)) return;
    const t = tech.get(id) || { id, sources: [], count: 0 };
    if (!t.sources.includes(src)) t.sources.push(src);
    t.count += n; tech.set(id, t);
  };
  for (const d of detections) for (const t of d.techniques) addT(t, "rule", Math.max(1, d.events.length));
  for (const t of c.attackManual) addT(t, "analyst");
  for (const m of c.messages) if (m.role === "assistant") for (const t of techniquesIn(m.content)) addT(t, "ai");
  const worst = detections.reduce<Severity>((w, d) => (sevRank(d.severity) > sevRank(w) ? d.severity : w), "info");
  return { events, stats: st, detections, iocs, techniques: Array.from(tech.values()), emails: c.artifacts.filter((a) => a.kind === "email"), worst };
}

/** A compact, model-friendly briefing of the case (the AI never gets whole logs). */
export function aiContext(c: Case, k: Computed, maxChars = 14_000): string {
  const lines: string[] = [`CASE: ${c.title || "(untitled)"} · status ${c.status} · severity ${c.severity}${c.tags.length ? ` · tags ${c.tags.join(", ")}` : ""}`];
  if (c.summary) lines.push(`Analyst summary: ${c.summary}`);
  lines.push(`Evidence: ${c.artifacts.map((a) => `${a.name} (${a.kind}${a.format ? `/${a.format}` : ""})`).join("; ") || "none"}`);
  if (k.events.length) {
    lines.push(`Events: ${k.stats.total} from ${k.stats.first || "?"} to ${k.stats.last || "?"} · by severity ${Object.entries(k.stats.bySeverity).filter(([, n]) => n).map(([s, n]) => `${s} ${n}`).join(", ")}`);
    const top = (name: string, v: [string, number][]) => v.length ? lines.push(`Top ${name}: ${v.slice(0, 6).map(([x, n]) => `${x} (${n})`).join(", ")}`) : 0;
    top("hosts", k.stats.top.hosts); top("users", k.stats.top.users); top("source IPs", k.stats.top.src); top("events", k.stats.top.events);
  }
  if (k.stats.bruteForce.length) lines.push(`Brute force: ${k.stats.bruteForce.slice(0, 5).map((b) => `${b.src} → ${b.user || "?"} ×${b.failures}${b.success ? " then SUCCESS" : ""}`).join("; ")}`);
  if (k.detections.length) lines.push("Local detections (rule engine):", ...k.detections.slice(0, 25).map((d) => `- [${d.severity}] ${d.title} — ${d.techniques.join(", ")}${d.events.length ? ` · ${d.events.length} events` : ""}`));
  const iocs = k.iocs.filter((x) => !x.private).slice(0, 120);
  if (iocs.length) lines.push("Indicators (extracted locally, verified syntax):", ...iocs.map((x) => `- ${x.type} ${x.value}${x.count > 1 ? ` ×${x.count}` : ""}${x.verdict !== "unknown" ? ` [analyst: ${x.verdict}]` : ""}`));
  for (const e of k.emails) if (e.email) lines.push(`E-mail "${e.email.subject}" from ${e.email.fromAddr}: SPF ${e.email.auth.spf}, DKIM ${e.email.auth.dkim}, DMARC ${e.email.auth.dmarc}; verdict ${e.email.verdict} (${e.email.score}); findings: ${e.email.findings.map((f) => f.title).join("; ")}`);
  const hot = k.events.filter((e) => sevRank(e.severity) >= 3 || k.detections.some((d) => d.events.includes(e.i))).slice(0, 40);
  if (hot.length) lines.push("Key events:", ...hot.map((e) => `- ${e.ts || "?"} ${e.host} ${e.user ? `user=${e.user} ` : ""}${e.src ? `src=${e.src} ` : ""}${e.event} :: ${e.message}`.slice(0, 300)));
  for (const n of c.notes.slice(-10)) lines.push(`Analyst note (${n.at.slice(0, 16)}): ${n.text}`);
  const out = lines.join("\n");
  return out.length > maxChars ? `${out.slice(0, maxChars)}\n[…truncated]` : out;
}

const ACTIONS: Record<string, string> = {
  "brute-force": "Block the brute-forcing sources, enforce MFA and lockout policy, and reset any account that logged on after the failures.",
  phishing: "Purge the message from all mailboxes, block the sender domain / URLs, and reset credentials of anyone who clicked.",
  lsass: "Isolate the host, rotate all credentials used on it (including service and admin accounts), and enable LSA protection / Credential Guard.",
  "shadow-delete": "Treat as pre-ransomware: isolate affected hosts now, verify offline backups, and hunt for the encryption binary.",
  ransom: "Invoke the ransomware playbook: isolate, preserve evidence, engage IR, and restore from known-good offline backups.",
  "clear-logs": "Preserve remaining logs centrally, investigate the account that cleared them, and alert on event 1102 / 104.",
  "defender-off": "Re-enable protection, enable tamper protection, and investigate the process and account that disabled it.",
  "cloudtrail-off": "Re-enable logging, lock the principal, and review everything it did while logging was off.",
  "cloud-keys": "Revoke the new access keys / profiles, review the principal's recent API calls, and require MFA for IAM changes.",
  "ps-encoded": "Decode the command (Decoder tab), block the downloaded payload, and enable PowerShell script-block logging.",
  "ps-download": "Block the download URL / domain, remove the payload, and restrict PowerShell with Constrained Language Mode or AppLocker.",
  "run-key": "Remove the Run-key entry and its binary, then look for the same key on other hosts.",
  schtasks: "Review and remove the task, and alert on new scheduled tasks by non-admin accounts.",
  "user-add": "Disable the new account, find who created it, and review group memberships.",
  "admin-add": "Remove the account from privileged groups and audit how the change was made.",
  "web-attack": "Patch or virtual-patch the application (WAF rule), and check for successful exploitation in the responses.",
  webshell: "Take the web server out of rotation, remove the shell, and rebuild from a trusted image.",
  psexec: "Restrict admin shares and remote service creation; review lateral movement from the source host.",
  "exfil-cloud": "Block the transfer tool / domain, estimate the data volume, and assess notification duties.",
};

/** Incident report as Markdown (defanged indicators). */
export function reportMarkdown(c: Case, k: Computed): string {
  const L: string[] = [];
  const title = c.title || "Security incident";
  L.push(`# ${title}`, "", `**Status:** ${c.status} · **Severity:** ${c.severity} · **Opened:** ${c.createdAt.slice(0, 10)}${c.tags.length ? ` · **Tags:** ${c.tags.join(", ")}` : ""}`, "");
  L.push("## Executive summary", "", c.summary || (k.detections.length
    ? `${k.detections.length} detection${k.detections.length === 1 ? "" : "s"} across ${k.stats.total} events; the most severe: **${k.detections[0].title}** (${k.detections[0].severity}).`
    : "No automated detections. See the analyst notes and evidence below."), "");
  if (c.artifacts.length) L.push("## Evidence", "", "| Artifact | Type | Size |", "|---|---|---:|", ...c.artifacts.map((a) => `| ${a.name.replace(/\|/g, "\\|")} | ${a.kind}${a.format ? ` (${a.format})` : ""} | ${a.size.toLocaleString("en-US")} B |`), "");
  if (k.stats.total) L.push("## Timeline", "", `- First event: ${k.stats.first || "unknown"}`, `- Last event: ${k.stats.last || "unknown"}`,
    ...k.detections.filter((d) => d.events.length).slice(0, 15).map((d) => { const e = k.events[d.events[0]]; return `- ${e?.ts || "?"} — ${d.title}${e?.host ? ` on ${e.host}` : ""}${e?.user ? ` (user ${e.user})` : ""}`; }),
    ...c.notes.map((n) => `- ${n.at.slice(0, 16).replace("T", " ")} — note: ${n.text}`), "");
  if (k.detections.length) L.push("## Detections", "", "| Severity | Detection | ATT&CK | Events |", "|---|---|---|---:|", ...k.detections.map((d) => `| ${d.severity} | ${d.title.replace(/\|/g, "\\|")} | ${d.techniques.join(", ")} | ${d.events.length || "—"} |`), "");
  if (k.techniques.length) {
    L.push("## MITRE ATT&CK", "", "| Tactic | Technique | Source |", "|---|---|---|");
    for (const t of [...k.techniques].sort((a, b) => TACTICS.findIndex((x) => x.id === primaryTactic(a.id)) - TACTICS.findIndex((x) => x.id === primaryTactic(b.id)))) {
      L.push(`| ${TACTICS.find((x) => x.id === primaryTactic(t.id))?.name || ""} | ${t.id} ${technique(t.id)?.name || ""} | ${t.sources.join(", ")} |`);
    }
    L.push("");
  }
  const pub = k.iocs.filter((x) => !x.private && x.verdict !== "benign");
  if (pub.length) L.push("## Indicators of compromise", "", "| Type | Indicator (defanged) | Seen | Verdict |", "|---|---|---:|---|", ...pub.slice(0, 300).map((x) => `| ${x.type} | \`${defang(x.value).replace(/\|/g, "\\|")}\` | ${x.count} | ${x.verdict} |`), "");
  if (k.stats.bruteForce.length) L.push("## Brute force", "", ...k.stats.bruteForce.slice(0, 20).map((b) => `- ${b.src} → ${b.user || "(any)"}: ${b.failures} failures${b.success ? " **followed by a successful logon**" : ""}`), "");
  for (const e of k.emails) if (e.email) L.push(`## Phishing analysis — ${e.email.subject || e.name}`, "", `From **${e.email.fromAddr}** · SPF ${e.email.auth.spf} · DKIM ${e.email.auth.dkim} · DMARC ${e.email.auth.dmarc} · verdict **${e.email.verdict}** (${e.email.score}/100)`, "", ...e.email.findings.map((f) => `- [${f.severity}] ${f.title} — ${f.detail}`), "");
  const actions = Array.from(new Set(k.detections.map((d) => ACTIONS[d.rule]).filter(Boolean)));
  L.push("## Recommended actions", "", ...(actions.length ? actions.map((a, i) => `${i + 1}. ${a}`) : ["1. Review the evidence and confirm or close the case."]), "");
  const ai = [...c.messages].reverse().find((m) => m.role === "assistant");
  if (ai) L.push("## AI-assisted analysis", "", ai.content.trim(), "");
  L.push("---", `_Prepared with AXTO Security Analyst on ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. Parsing, detection and indicator extraction ran on the analyst's device._`, "");
  return L.join("\n");
}
