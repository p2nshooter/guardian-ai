/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — log parsing ON THE DEVICE. Any mix of JSON / JSON lines,
 * AWS CloudTrail, Windows Event XML, syslog (RFC 3164 and 5424), CEF, LEEF,
 * Apache / Nginx access logs, CSV and plain lines becomes one normalised event
 * table: time, host, source, severity, event, user, source / destination IP,
 * action, message and the original fields. Pure (no DOM, no network).
 * ============================================================================ */
import type { Severity } from "./attack";

export type LogFormat = "json" | "cloudtrail" | "winxml" | "syslog5424" | "syslog3164" | "cef" | "leef" | "access" | "csv" | "text";
export interface LogEvent {
  i: number; ts: string; time: number; host: string; source: LogFormat; severity: Severity;
  event: string; user: string; src: string; dst: string; action: string; message: string;
  fields: Record<string, string>; artifact?: string;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MAX_EVENTS = 50_000;

/** Best-effort timestamp → epoch ms (NaN if none). */
export function parseTime(s: string, year = new Date().getUTCFullYear()): number {
  if (!s) return NaN;
  const t = s.trim();
  if (/^\d{10}(?:\.\d+)?$/.test(t)) return Number(t) * 1000;
  if (/^\d{13}$/.test(t)) return Number(t);
  let m = t.match(/^(\d{1,2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/);          // 10/Oct/2026:13:55:36 +0700
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    const z = m[7] ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : "Z";
    return Date.parse(`${m[3]}-${String(MONTHS[m[2].toLowerCase()] + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4]}:${m[5]}:${m[6]}${z}`);
  }
  m = t.match(/^(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);                                  // Oct 11 22:14:15 (syslog, no year)
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return Date.UTC(year, MONTHS[m[1].toLowerCase()], Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
  const d = Date.parse(t.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, "$1T$2"));
  return Number.isFinite(d) ? d : NaN;
}
const iso = (ms: number) => (Number.isFinite(ms) ? new Date(ms).toISOString() : "");

const IP = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
const ISO_ANY = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/;

function sevWord(v: string): Severity | "" {
  const s = v.toLowerCase();
  if (/^(?:crit|critical|emerg|emergency|alert|fatal|p1|sev1)/.test(s)) return "critical";
  if (/^(?:high|err|error|severe|p2|sev2)/.test(s)) return "high";
  if (/^(?:med|medium|warn|warning|moderate|p3|sev3)/.test(s)) return "medium";
  if (/^(?:low|notice|minor|p4|sev4)/.test(s)) return "low";
  if (/^(?:info|informational|debug|trace|verbose)/.test(s)) return "info";
  const n = Number(s);
  if (Number.isFinite(n) && s !== "") return n >= 9 ? "critical" : n >= 7 ? "high" : n >= 4 ? "medium" : n >= 1 ? "low" : "info";
  return "";
}
const sysSev = (pri: number): Severity => { const s = pri & 7; return s <= 2 ? "critical" : s === 3 ? "high" : s === 4 ? "medium" : s === 5 ? "low" : "info"; };

// ── Field picking for JSON-ish records ───────────────────────────────────────
function flatten(o: any, prefix = "", out: Record<string, string> = {}, depth = 0): Record<string, string> {
  if (o == null || depth > 6) return out;
  if (typeof o !== "object") { out[prefix || "value"] = String(o); return out; }
  if (Array.isArray(o)) { if (o.every((x) => typeof x !== "object")) out[prefix] = o.join(", "); else o.slice(0, 20).forEach((x, i) => flatten(x, `${prefix}[${i}]`, out, depth + 1)); return out; }
  for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
  return out;
}
const pickKey = (f: Record<string, string>, names: string[]) => {
  const keys = Object.keys(f);
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase() === n) || keys.find((x) => x.toLowerCase().endsWith(`.${n}`));
    if (k && f[k]) return f[k];
  }
  return "";
};

function fromRecord(f: Record<string, string>, source: LogFormat, i: number, year?: number): LogEvent {
  const ts = pickKey(f, ["@timestamp", "timestamp", "time", "eventtime", "event_time", "datetime", "date", "ts", "created", "generated_at", "systemtime"]);
  const time = parseTime(ts, year);
  const sev = sevWord(pickKey(f, ["severity", "level", "log.level", "priority", "sev", "risk", "severity_name"])) || "info";
  const message = pickKey(f, ["message", "msg", "description", "summary", "commandline", "command_line", "cmdline", "process.command_line", "query", "request", "errormessage"]) || "";
  const ev = {
    i, ts: iso(time) || ts, time, source, severity: sev as Severity,
    host: pickKey(f, ["host", "hostname", "host.name", "computer", "device", "dvchost", "agent.hostname", "recipientaccountid"]),
    event: pickKey(f, ["eventname", "event", "event_id", "eventid", "event.action", "action", "type", "rule.name", "signature", "alert"]),
    user: pickKey(f, ["user", "username", "user.name", "account", "targetusername", "subjectusername", "useridentity.arn", "useridentity.username", "principal", "suser", "duser"]),
    src: pickKey(f, ["src_ip", "srcip", "sourceipaddress", "source.ip", "client_ip", "clientip", "remote_addr", "ipaddress", "src", "ip"]),
    dst: pickKey(f, ["dst_ip", "dstip", "destination.ip", "dest_ip", "dst", "server_ip"]),
    action: pickKey(f, ["outcome", "event.outcome", "result", "status", "errorcode", "act", "disposition"]),
    message, fields: f,
  };
  if (!ev.message) ev.message = Object.entries(f).slice(0, 12).map(([k, v]) => `${k}=${v}`).join(" ").slice(0, 600);
  return ev;
}

// ── Line formats ──────────────────────────────────────────────────────────────
const RE_5424 = /^<(\d{1,3})>1 (\S+) (\S+) (\S+) (\S+) (\S+) (-|\[.*?\])\s?(.*)$/;
const RE_3164 = /^(?:<(\d{1,3})>)?(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:[\s]+)(?:\[(\d+)\])?:\s?(.*)$/;
const RE_ACCESS = /^(\S+) \S+ (\S+) \[([^\]]+)\] "(\S+) (\S+)(?: (\S+))?" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?/;

function kv(ext: string, sep: RegExp): Record<string, string> {
  const out: Record<string, string> = {};
  // CEF: key=value where value runs until the next " key=" (spaces allowed in values); LEEF uses tabs.
  const parts = ext.split(sep);
  let last = "";
  for (const p of parts) {
    const m = p.match(/^([A-Za-z0-9_.\-]+)=([\s\S]*)$/);
    if (m) { last = m[1]; out[last] = m[2].replace(/\\([=|\\])/g, "$1"); } else if (last) out[last] += (sep.source === "\\t" ? "\t" : " ") + p;
  }
  return out;
}

function parseCef(line: string, i: number, year?: number): LogEvent | null {
  const at = line.indexOf("CEF:");
  if (at < 0) return null;
  const head = line.slice(0, at).trim();
  const parts: string[] = [];
  let cur = "", k = at + 4, pipes = 0;
  for (; k < line.length && pipes < 7; k++) {
    const c = line[k];
    if (c === "\\" && k + 1 < line.length) { cur += line[++k]; continue; }
    if (c === "|") { parts.push(cur); cur = ""; pipes++; continue; }
    cur += c;
  }
  if (parts.length < 7) return null;
  const f: Record<string, string> = { cef_version: parts[0], vendor: parts[1], product: parts[2], version: parts[3], signature_id: parts[4], name: parts[5], cef_severity: parts[6], ...kv(line.slice(k), / (?=[A-Za-z0-9_.\-]+=)/) };
  const h = head.match(RE_3164);
  const time = parseTime(f.rt || f.end || f.start || (h ? h[2] : ""), year);
  return {
    i, ts: iso(time), time, source: "cef", severity: sevWord(parts[6]) || "info",
    host: f.dvchost || f.dhost || (h ? h[3] : ""), event: `${parts[4]} ${parts[5]}`.trim(), user: f.suser || f.duser || "",
    src: f.src || f.shost || "", dst: f.dst || "", action: f.act || f.outcome || "", message: [parts[5], f.msg, f.request, f.cs1].filter(Boolean).join(" · "), fields: f,
  };
}
function parseLeef(line: string, i: number, year?: number): LogEvent | null {
  const at = line.indexOf("LEEF:");
  if (at < 0) return null;
  const segs = line.slice(at + 5).split("|");
  if (segs.length < 5) return null;
  const v2 = segs[0].startsWith("2");
  const rest = segs.slice(v2 ? 6 : 5).join("|");
  const f: Record<string, string> = { leef_version: segs[0], vendor: segs[1], product: segs[2], version: segs[3], event_id: segs[4], ...kv(rest, /\t/) };
  const time = parseTime(f.devTime || f.devtime || "", year);
  return {
    i, ts: iso(time), time, source: "leef", severity: sevWord(f.sev || "") || "info", host: f.identHostName || f.dhost || "", event: segs[4],
    user: f.usrName || f.accountName || "", src: f.src || "", dst: f.dst || "", action: f.action || f.cat || "", message: Object.entries(f).slice(5, 15).map(([a, b]) => `${a}=${b}`).join(" "), fields: f,
  };
}
function parseLine(line: string, i: number, year?: number): LogEvent {
  let m = line.match(RE_5424);
  if (m) {
    const pri = Number(m[1]), time = parseTime(m[2], year);
    return { i, ts: iso(time), time, source: "syslog5424", severity: sysSev(pri), host: m[3] === "-" ? "" : m[3], event: [m[4], m[6]].filter((x) => x && x !== "-").join(" "),
      user: (m[8].match(/\buser[= ](\S+)/i) || [])[1] || "", src: (m[8].match(IP) || [])[0] || "", dst: "", action: "", message: m[8], fields: { pri: m[1], app: m[4], procid: m[5], msgid: m[6], sd: m[7] } };
  }
  if (line.includes("CEF:")) { const e = parseCef(line, i, year); if (e) return e; }
  if (line.includes("LEEF:")) { const e = parseLeef(line, i, year); if (e) return e; }
  m = line.match(RE_ACCESS);
  if (m) {
    const time = parseTime(m[3], year), status = Number(m[7]);
    return { i, ts: iso(time), time, source: "access", severity: status >= 500 ? "medium" : status >= 400 ? "low" : "info", host: "", event: `${m[4]} ${m[7]}`, user: m[2] === "-" ? "" : m[2],
      src: m[1], dst: "", action: String(status), message: `${m[4]} ${m[5]} → ${m[7]}${m[10] ? ` · ${m[10]}` : ""}`, fields: { method: m[4], path: m[5], protocol: m[6] || "", status: m[7], bytes: m[8], referrer: m[9] || "", user_agent: m[10] || "" } };
  }
  m = line.match(RE_3164);
  if (m) {
    const time = parseTime(m[2], year), msg = m[6];
    const sev = m[1] ? sysSev(Number(m[1])) : /\b(?:fail(?:ed|ure)?|invalid|denied|error|refused)\b/i.test(msg) ? "low" : "info";
    return { i, ts: iso(time), time, source: "syslog3164", severity: sev, host: m[3], event: m[4], user: (msg.match(/\b(?:for(?: invalid user)?|user)\s+([A-Za-z0-9._@-]+)/i) || [])[1] || "",
      src: (msg.match(IP) || [])[0] || "", dst: "", action: /\b(?:accepted|success)/i.test(msg) ? "success" : /\b(?:failed|invalid|denied)\b/i.test(msg) ? "failure" : "", message: msg, fields: { app: m[4], pid: m[5] || "" } };
  }
  const t = line.match(ISO_ANY);
  const time = t ? parseTime(t[0], year) : NaN;
  return { i, ts: iso(time), time, source: "text", severity: sevWord((line.match(/\b(critical|error|warn(?:ing)?|high|medium|low|info)\b/i) || [])[1] || "") || "info",
    host: "", event: "", user: "", src: (line.match(IP) || [])[0] || "", dst: "", action: "", message: line, fields: {} };
}

// ── Windows Event XML ─────────────────────────────────────────────────────────
const unx = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
function parseWinXml(xml: string, start: number): LogEvent[] {
  const out: LogEvent[] = [];
  for (const m of xml.matchAll(/<Event[\s>][\s\S]*?<\/Event>/g)) {
    const e = m[0];
    const tag = (n: string) => unx((e.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`)) || [])[1] || "");
    const f: Record<string, string> = {};
    for (const d of e.matchAll(/<Data Name=['"]([^'"]+)['"]\s*(?:\/>|>([\s\S]*?)<\/Data>)/g)) f[d[1]] = unx(d[2] || "");
    const id = tag("EventID"), level = tag("Level"), channel = tag("Channel"), provider = (e.match(/<Provider[^>]*Name=['"]([^'"]+)/) || [])[1] || "";
    const time = parseTime((e.match(/SystemTime=['"]([^'"]+)/) || [])[1] || "");
    const lv = Number(level);
    const sev: Severity = lv === 1 ? "critical" : lv === 2 ? "high" : lv === 3 ? "medium" : WIN_SEV[id] || "info";
    const cmd = f.CommandLine || f.ProcessCommandLine || f.ScriptBlockText || "";
    Object.assign(f, { EventID: id, Channel: channel, Provider: provider, Level: level });
    out.push({
      i: start + out.length, ts: iso(time), time, source: "winxml", severity: sev, host: tag("Computer"), event: `${id}${WIN_NAMES[id] ? ` ${WIN_NAMES[id]}` : ""}`,
      user: f.TargetUserName || f.SubjectUserName || f.User || "", src: f.IpAddress && f.IpAddress !== "-" ? f.IpAddress : f.SourceIp || "", dst: f.DestinationIp || "",
      action: id === "4625" ? "failure" : id === "4624" ? "success" : "", message: [WIN_NAMES[id] || provider, cmd || f.NewProcessName || f.Image || "", f.LogonType ? `LogonType ${f.LogonType}` : ""].filter(Boolean).join(" · "), fields: f,
    });
  }
  return out;
}
export const WIN_NAMES: Record<string, string> = {
  "4624": "Logon success", "4625": "Logon failure", "4634": "Logoff", "4648": "Logon with explicit credentials", "4672": "Special privileges assigned", "4688": "Process created",
  "4697": "Service installed", "4698": "Scheduled task created", "4720": "User account created", "4722": "User account enabled", "4724": "Password reset attempt",
  "4728": "Member added to global group", "4732": "Member added to local group", "4740": "Account locked out", "4756": "Member added to universal group", "4768": "Kerberos TGT requested",
  "4769": "Kerberos service ticket requested", "4776": "Credential validation", "1102": "Audit log cleared", "7045": "Service installed", "4104": "PowerShell script block", "1": "Sysmon process create", "3": "Sysmon network connection", "11": "Sysmon file created",
};
const WIN_SEV: Record<string, Severity> = { "4625": "low", "4720": "medium", "4732": "medium", "4728": "medium", "4740": "medium", "1102": "high", "7045": "medium", "4697": "medium", "4698": "medium" };

// ── CSV ───────────────────────────────────────────────────────────────────────
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (q) { if (c === '"' && text[k + 1] === '"') { cell += '"'; k++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[k + 1] === "\n") k++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
    if (rows.length > MAX_EVENTS) break;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** What a blob of evidence is. */
export function sniff(text: string): LogFormat {
  const t = text.trimStart();
  if (/^\{\s*"Records"\s*:/.test(t)) return "cloudtrail";
  if (/<Event[\s>]/.test(t.slice(0, 2000)) && /<\/Event>/.test(t)) return "winxml";
  if (/^[[{]/.test(t)) return "json";
  const first = t.split(/\r?\n/, 1)[0] || "";
  if (/CEF:\d/.test(first)) return "cef";
  if (/LEEF:\d/.test(first)) return "leef";
  if (RE_5424.test(first)) return "syslog5424";
  if (RE_ACCESS.test(first)) return "access";
  if (RE_3164.test(first)) return "syslog3164";
  if (first.includes(",") && first.split(",").length >= 3 && !/\s{2,}/.test(first) && /^[\w "./-]+(,[\w "./-]+)+$/.test(first)) return "csv";
  return "text";
}

/** Parse evidence text into normalised events (indices continue from `start`). */
export function parseLogs(text: string, opts: { start?: number; artifact?: string; year?: number } = {}): { format: LogFormat; events: LogEvent[] } {
  const start = opts.start || 0;
  const format = sniff(text);
  let events: LogEvent[] = [];
  if (format === "winxml") events = parseWinXml(text, start);
  else if (format === "cloudtrail" || format === "json") {
    let recs: any[] | null = null;
    try { const j = JSON.parse(text); recs = Array.isArray(j) ? j : Array.isArray(j?.Records) ? j.Records : [j]; } catch { recs = null; }
    if (recs) events = recs.slice(0, MAX_EVENTS).map((r, n) => fromRecord(flatten(r), format === "cloudtrail" || r?.eventSource ? "cloudtrail" : "json", start + n, opts.year));
    else {
      // JSON lines (mixed with other lines is fine).
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, MAX_EVENTS);
      events = lines.map((l, n) => { try { const r = JSON.parse(l); return fromRecord(flatten(r), r?.eventSource ? "cloudtrail" : "json", start + n, opts.year); } catch { return parseLine(l, start + n, opts.year); } });
    }
  } else if (format === "csv") {
    const rows = csvRows(text);
    const head = rows[0].map((h) => h.trim());
    events = rows.slice(1, MAX_EVENTS + 1).map((r, n) => fromRecord(Object.fromEntries(head.map((h, c) => [h || `col${c + 1}`, (r[c] || "").trim()])), "csv", start + n, opts.year)).map((e) => ({ ...e, source: "csv" as const }));
  } else {
    events = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, MAX_EVENTS).map((l, n) => parseLine(l, start + n, opts.year));
  }
  if (opts.artifact) for (const e of events) e.artifact = opts.artifact;
  return { format, events };
}

/** The text rules and IOC extraction look at for one event. */
export const eventText = (e: LogEvent) => [e.event, e.message, e.user, e.action, ...Object.entries(e.fields).slice(0, 60).map(([k, v]) => `${k}=${v}`)].join(" ");

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface Stats {
  total: number; first: string; last: string; bySeverity: Record<Severity, number>;
  top: { hosts: [string, number][]; users: [string, number][]; src: [string, number][]; events: [string, number][] };
  histogram: { t: number; n: number }[];
  bruteForce: { src: string; user: string; failures: number; success: boolean }[];
}
const topN = (vals: string[], n = 8): [string, number][] => {
  const m = new Map<string, number>();
  for (const v of vals) if (v) m.set(v, (m.get(v) || 0) + 1);
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
};
const isFailure = (e: LogEvent) => e.action === "failure" || /\b(?:failed password|authentication failure|invalid user|login failed|logon failure|ConsoleLogin[^\n]{0,80}Failure)\b/i.test(e.message) || e.event.startsWith("4625");
const isSuccess = (e: LogEvent) => e.action === "success" || /\baccepted (?:password|publickey)\b/i.test(e.message) || e.event.startsWith("4624");

export function stats(events: LogEvent[], buckets = 48): Stats {
  const bySeverity = { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<Severity, number>;
  for (const e of events) bySeverity[e.severity]++;
  const times = events.map((e) => e.time).filter(Number.isFinite).sort((a, b) => a - b);
  const histogram: { t: number; n: number }[] = [];
  if (times.length) {
    const lo = times[0], hi = times[times.length - 1], span = Math.max(1, hi - lo), step = span / buckets;
    for (let b = 0; b < buckets; b++) histogram.push({ t: lo + b * step, n: 0 });
    for (const t of times) histogram[Math.min(buckets - 1, Math.floor((t - lo) / step))].n++;
  }
  // Brute force: ≥ 5 failures from one source (per user), and whether a success followed.
  const fails = new Map<string, { src: string; user: string; failures: number; success: boolean; last: number }>();
  for (const e of [...events].sort((a, b) => (a.time || 0) - (b.time || 0))) {
    const key = `${e.src}|${e.user}`;
    if (isFailure(e) && e.src) { const f = fails.get(key) || { src: e.src, user: e.user, failures: 0, success: false, last: 0 }; f.failures++; f.last = e.time; fails.set(key, f); }
    else if (isSuccess(e) && fails.has(key)) fails.get(key)!.success = true;
  }
  return {
    total: events.length, first: times.length ? iso(times[0]) : "", last: times.length ? iso(times[times.length - 1]) : "", bySeverity,
    top: { hosts: topN(events.map((e) => e.host)), users: topN(events.map((e) => e.user)), src: topN(events.map((e) => e.src)), events: topN(events.map((e) => e.event)) },
    histogram, bruteForce: Array.from(fails.values()).filter((f) => f.failures >= 5).sort((a, b) => b.failures - a.failures).map(({ last: _l, ...f }) => f),
  };
}
