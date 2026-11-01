/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — indicators of compromise: extraction (defang-aware),
 * de-duplication with counts, private / reserved address flags, analyst
 * verdicts, defanged display, enrichment links, and export as CSV, a plain
 * blocklist or a STIX 2.1 bundle. Pure; runs on the member's device.
 * ============================================================================ */
import { refang } from "./modes";

export type IocType = "ipv4" | "ipv6" | "domain" | "url" | "email" | "md5" | "sha1" | "sha256" | "cve" | "btc" | "eth" | "filename" | "registry";
export const IOC_TYPES: IocType[] = ["ipv4", "ipv6", "domain", "url", "email", "md5", "sha1", "sha256", "cve", "btc", "eth", "filename", "registry"];
export type Verdict = "unknown" | "malicious" | "suspicious" | "benign";
export interface Ioc { type: IocType; value: string; count: number; private?: boolean; verdict: Verdict; note?: string; sources: string[] }

const PRIVATE_V4 = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|22[4-9]\.|23\d\.|24\d\.|25[0-5]\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/;
const PRIVATE_V6 = /^(?:::1$|fe80:|fc|fd|ff0|2001:db8:)/i;
const NOISE_DOMAINS = /^(?:schemas\.microsoft\.com|www\.w3\.org|w3\.org|schemas\.xmlsoap\.org|purl\.org|ns\.adobe\.com|example\.(?:com|org|net)|localhost|localdomain)$/i;
const FILE_TLD = /\.(?:png|jpe?g|gif|svg|css|js|json|txt|log|exe|dll|sys|bat|cmd|ps1|vbs|hta|pdf|docx?|xlsx?|pptx?|zip|rar|7z|tmp|dat|ini|xml|html?|php|aspx?|jsp)$/i;

/** Display form that cannot be clicked or auto-linked. */
export function defang(v: string): string {
  return v.replace(/^http/i, "hxxp").replace(/:\/\//, "[://]").replace(/\./g, "[.]").replace(/@/g, "[@]");
}
export { refang };

const grab = (t: string, re: RegExp) => Array.from(t.matchAll(re)).map((m) => m[1] ?? m[0]);

/** Extract indicators from text, counted and de-duplicated. `source` tags where they came from. */
export function extract(raw: string, source = "text"): Ioc[] {
  const t = refang(String(raw || "")).slice(0, 2_000_000);
  const found = new Map<string, Ioc>();
  const add = (type: IocType, value: string) => {
    const v = type === "cve" ? value.toUpperCase() : type === "domain" || type === "email" || /^(?:md5|sha1|sha256)$/.test(type) ? value.toLowerCase() : value;
    const key = `${type}:${v}`;
    const cur = found.get(key);
    if (cur) { cur.count++; return; }
    found.set(key, { type, value: v, count: 1, verdict: "unknown", sources: [source],
      private: type === "ipv4" ? PRIVATE_V4.test(v) : type === "ipv6" ? PRIVATE_V6.test(v) : undefined });
  };
  const urls = grab(t, /\b(?:https?|ftp):\/\/[^\s"'<>)\]}]+/gi).map((u) => u.replace(/[.,;:!?]+$/, ""));
  urls.forEach((u) => add("url", u));
  const emails = grab(t, /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi);
  emails.forEach((e) => add("email", e));
  grab(t, /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d.])/g).forEach((ip) => add("ipv4", ip));
  grab(t, /(?<![\w:])((?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}|(?:[a-f0-9]{1,4}:){1,7}:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,6})?)(?![\w:])/gi)
    .filter((x) => (x.match(/:/g) || []).length >= 3 && !/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(x)).forEach((x) => add("ipv6", x));
  grab(t, /(?<![a-f0-9])([a-f0-9]{64})(?![a-f0-9])/gi).forEach((h) => add("sha256", h));
  grab(t, /(?<![a-f0-9])([a-f0-9]{40})(?![a-f0-9])/gi).forEach((h) => add("sha1", h));
  grab(t, /(?<![a-f0-9])([a-f0-9]{32})(?![a-f0-9])/gi).forEach((h) => add("md5", h));
  grab(t, /\bCVE-\d{4}-\d{4,7}\b/gi).forEach((c) => add("cve", c));
  grab(t, /\b(bc1[ac-hj-np-z02-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g).forEach((a) => add("btc", a));
  grab(t, /\b(0x[a-fA-F0-9]{40})\b/g).forEach((a) => add("eth", a));
  grab(t, /\b((?:HKLM|HKCU|HKCR|HKU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER)\\[^\s"'<>|]{3,200})/g).forEach((r) => add("registry", r.replace(/[.,;]+$/, "")));
  grab(t, /(?:^|[\s"'\\=])([\w\-.]{1,60}\.(?:exe|dll|scr|ps1|vbs|js|hta|bat|cmd|lnk|iso|img|docm|xlsm|jar|msi))\b/gi).map((f) => f.trim()).filter(Boolean).forEach((f) => add("filename", f));
  // Bare domains — minus those inside URLs / e-mails (counted there) and file names.
  const inside = new Set([...urls, ...emails].join(" ").toLowerCase().match(/[a-z0-9.-]+\.[a-z]{2,}/g) || []);
  grab(t, /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:xn--[a-z0-9-]{2,}|[a-z]{2,24}))\b/gi)
    .filter((d) => !/^\d+(?:\.\d+)+$/.test(d) && !FILE_TLD.test(d) && !NOISE_DOMAINS.test(d) && !inside.has(d.toLowerCase()) && /\.[a-z]/i.test(d))
    .forEach((d) => add("domain", d));
  return Array.from(found.values()).slice(0, 5000);
}

/** Merge IOC lists (counts add up, the analyst's verdicts and notes are kept). */
export function mergeIocs(...lists: Ioc[][]): Ioc[] {
  const m = new Map<string, Ioc>();
  for (const list of lists) for (const x of list) {
    const k = `${x.type}:${x.value}`;
    const cur = m.get(k);
    if (!cur) { m.set(k, { ...x, sources: [...x.sources] }); continue; }
    cur.count += x.count;
    for (const s of x.sources) if (!cur.sources.includes(s)) cur.sources.push(s);
    if (x.verdict !== "unknown") cur.verdict = x.verdict;
    if (x.note) cur.note = x.note;
  }
  return Array.from(m.values());
}

/** Enrichment lookups the analyst can open (nothing is queried automatically). */
export function enrichLinks(x: Pick<Ioc, "type" | "value">): { name: string; url: string }[] {
  const v = encodeURIComponent(x.value);
  switch (x.type) {
    case "ipv4": case "ipv6": return [
      { name: "VirusTotal", url: `https://www.virustotal.com/gui/ip-address/${v}` }, { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${v}` },
      { name: "Shodan", url: `https://www.shodan.io/host/${v}` }, { name: "OTX", url: `https://otx.alienvault.com/indicator/ip/${v}` }, { name: "GreyNoise", url: `https://viz.greynoise.io/ip/${v}` }];
    case "domain": return [
      { name: "VirusTotal", url: `https://www.virustotal.com/gui/domain/${v}` }, { name: "urlscan", url: `https://urlscan.io/search/#domain:${v}` },
      { name: "OTX", url: `https://otx.alienvault.com/indicator/domain/${v}` }, { name: "URLhaus", url: `https://urlhaus.abuse.ch/browse.php?search=${v}` }];
    case "url": return [
      { name: "VirusTotal", url: `https://www.virustotal.com/gui/search/${encodeURIComponent(encodeURIComponent(x.value))}` }, { name: "urlscan", url: `https://urlscan.io/search/#page.url:${v}` },
      { name: "URLhaus", url: `https://urlhaus.abuse.ch/browse.php?search=${v}` }];
    case "md5": case "sha1": case "sha256": return [
      { name: "VirusTotal", url: `https://www.virustotal.com/gui/file/${v}` }, { name: "MalwareBazaar", url: `https://bazaar.abuse.ch/browse.php?search=${x.type === "sha256" ? "sha256" : x.type}:${v}` },
      { name: "OTX", url: `https://otx.alienvault.com/indicator/file/${v}` }];
    case "cve": return [{ name: "NVD", url: `https://nvd.nist.gov/vuln/detail/${v}` }, { name: "CISA KEV", url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${v}` }];
    case "email": return [{ name: "Have I Been Pwned", url: `https://haveibeenpwned.com/account/${v}` }];
    case "btc": return [{ name: "Blockchain explorer", url: `https://www.blockchain.com/explorer/addresses/btc/${v}` }];
    case "eth": return [{ name: "Etherscan", url: `https://etherscan.io/address/${v}` }];
    default: return [];
  }
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function toCsv(list: Ioc[]): string {
  return ["type,value,count,verdict,private,note,sources", ...list.map((x) => [x.type, x.value, String(x.count), x.verdict, x.private ? "yes" : "", x.note || "", x.sources.join(" ")].map(csvCell).join(","))].join("\n") + "\n";
}
/** One value per line, for firewalls / EDR block lists (private addresses and benign items left out). */
export function toBlocklist(list: Ioc[], types: IocType[] = ["ipv4", "ipv6", "domain", "url", "sha256", "sha1", "md5"]): string {
  return list.filter((x) => types.includes(x.type) && !x.private && x.verdict !== "benign").map((x) => x.value).join("\n") + "\n";
}

// ── STIX 2.1 ──────────────────────────────────────────────────────────────────
function uuid5ish(seed: string): string {
  // Deterministic UUID-shaped id from FNV hashes (stable ids for the same indicator).
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x2545f491, h4 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) { const c = seed.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822507); h3 = Math.imul(h3 ^ c, 3266489909); h4 = Math.imul(h4 ^ c, 668265263); }
  const hx = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const s = hx(h1) + hx(h2) + hx(h3) + hx(h4);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-5${s.slice(13, 16)}-${((parseInt(s[16], 16) & 3) | 8).toString(16)}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
export function stixPattern(x: Pick<Ioc, "type" | "value">): string | null {
  switch (x.type) {
    case "ipv4": return `[ipv4-addr:value = '${esc(x.value)}']`;
    case "ipv6": return `[ipv6-addr:value = '${esc(x.value)}']`;
    case "domain": return `[domain-name:value = '${esc(x.value)}']`;
    case "url": return `[url:value = '${esc(x.value)}']`;
    case "email": return `[email-addr:value = '${esc(x.value)}']`;
    case "md5": return `[file:hashes.MD5 = '${x.value}']`;
    case "sha1": return `[file:hashes.'SHA-1' = '${x.value}']`;
    case "sha256": return `[file:hashes.'SHA-256' = '${x.value}']`;
    case "filename": return `[file:name = '${esc(x.value)}']`;
    case "registry": return `[windows-registry-key:key = '${esc(x.value)}']`;
    default: return null;
  }
}
export function toStix(list: Ioc[], meta: { title: string; created?: string }): string {
  const created = meta.created || new Date().toISOString();
  const identity = { type: "identity", spec_version: "2.1", id: `identity--${uuid5ish("axto-security-analyst")}`, created, modified: created, name: "AXTO Security Analyst", identity_class: "system" };
  const indicators = list.filter((x) => !x.private && x.verdict !== "benign").flatMap((x) => {
    const pattern = stixPattern(x);
    if (!pattern) return [];
    return [{ type: "indicator", spec_version: "2.1", id: `indicator--${uuid5ish(`${x.type}:${x.value}`)}`, created, modified: created, created_by_ref: identity.id,
      name: `${x.type}: ${x.value}`.slice(0, 250), pattern, pattern_type: "stix", valid_from: created,
      indicator_types: [x.verdict === "malicious" ? "malicious-activity" : "anomalous-activity"], ...(x.note ? { description: x.note } : {}), labels: [x.verdict] }];
  });
  const vulns = list.filter((x) => x.type === "cve").map((x) => ({ type: "vulnerability", spec_version: "2.1", id: `vulnerability--${uuid5ish(x.value)}`, created, modified: created, name: x.value,
    external_references: [{ source_name: "cve", external_id: x.value }] }));
  const report = { type: "report", spec_version: "2.1", id: `report--${uuid5ish(meta.title + created)}`, created, modified: created, created_by_ref: identity.id, name: meta.title || "Investigation",
    published: created, report_types: ["threat-report"], object_refs: [...indicators.map((i) => i.id), ...vulns.map((v) => v.id)].length ? [...indicators.map((i) => i.id), ...vulns.map((v) => v.id)] : [identity.id] };
  return JSON.stringify({ type: "bundle", id: `bundle--${uuid5ish(`bundle:${meta.title}:${created}`)}`, objects: [identity, ...indicators, ...vulns, report] }, null, 2);
}
