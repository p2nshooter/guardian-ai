/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — detection content from a case, generated locally:
 * Sigma (YAML), Microsoft KQL (Sentinel / Defender), Splunk SPL, YARA and
 * Suricata. Indicator rules come from the case IOCs (private / benign left
 * out); behaviour rules come from the ATT&CK detections that fired.
 * ============================================================================ */
import type { Ioc } from "./ioc";
import type { Detection } from "./attack";

export type RuleLang = "sigma" | "kql" | "spl" | "yara" | "suricata";
export const RULE_LANGS: RuleLang[] = ["sigma", "kql", "spl", "yara", "suricata"];

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const yq = (s: string) => `'${s.replace(/'/g, "''")}'`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "case";
const usable = (list: Ioc[]) => list.filter((x) => !x.private && x.verdict !== "benign");
const of = (list: Ioc[], ...t: Ioc["type"][]) => usable(list).filter((x) => t.includes(x.type)).map((x) => x.value).slice(0, 200);
const host = (u: string) => { try { return new URL(u).hostname; } catch { return ""; } };

/** Command-line fragments per behaviour rule, for Sigma / KQL / SPL. */
const BEHAVIOUR: Record<string, string[]> = {
  "ps-encoded": ["powershell", " -enc"], "ps-download": ["DownloadString"], "certutil": ["certutil", "-urlcache"], "bitsadmin": ["bitsadmin", "/transfer"],
  "shadow-delete": ["vssadmin", "delete shadows"], "lsass": ["lsass"], "sam-dump": ["reg", "save hklm\\sam"], "schtasks": ["schtasks", "/create"],
  "run-key": ["reg", "\\CurrentVersion\\Run"], "user-add": ["net", "user", "/add"], "admin-add": ["localgroup administrators", "/add"], "wmi-exec": ["wmic", "process call create"],
  "mshta": ["mshta"], "regsvr32": ["regsvr32", "scrobj.dll"], "psexec": ["psexec"], "clear-logs": ["wevtutil", " cl "], "defender-off": ["Set-MpPreference", "-Disable"],
  "curl-sh": ["curl", "| sh"], "archive": ["7z", " a "], "exfil-cloud": ["rclone", "copy"], "rat": ["ngrok"], "uac-bypass": ["fodhelper"], "domain-trust": ["nltest", "/domain_trusts"],
};

export function generate(lang: RuleLang, c: { title: string; iocs: Ioc[]; detections: Detection[]; author?: string }): string {
  const ips = of(c.iocs, "ipv4", "ipv6"), domains = Array.from(new Set([...of(c.iocs, "domain"), ...of(c.iocs, "url").map(host).filter(Boolean)]));
  const urls = of(c.iocs, "url"), sha256 = of(c.iocs, "sha256"), sha1 = of(c.iocs, "sha1"), md5s = of(c.iocs, "md5"), files = of(c.iocs, "filename");
  const behaviours = c.detections.filter((d) => BEHAVIOUR[d.rule]);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const tags = Array.from(new Set(c.detections.flatMap((d) => d.techniques))).map((t) => `attack.${t.toLowerCase()}`);
  const empty = "# Nothing to build yet — add evidence with public indicators or behaviour detections.\n";

  switch (lang) {
    case "sigma": {
      const docs: string[] = [];
      if (ips.length || domains.length) docs.push([
        `title: ${c.title} — network indicators`, `id: ${cryptoId(c.title + "net")}`, "status: experimental", `description: Connections to indicators from the AXTO case "${c.title}".`,
        `author: ${c.author || "AXTO Security Analyst"}`, `date: ${date}`, ...(tags.length ? ["tags:", ...tags.map((t) => `  - ${t}`)] : []),
        "logsource:", "  category: network_connection", "detection:",
        ...(ips.length ? ["  sel_ip:", "    DestinationIp:", ...ips.map((v) => `      - ${yq(v)}`)] : []),
        ...(domains.length ? ["  sel_host:", "    DestinationHostname|endswith:", ...domains.map((v) => `      - ${yq(v)}`)] : []),
        `  condition: ${[ips.length ? "sel_ip" : "", domains.length ? "sel_host" : ""].filter(Boolean).join(" or ")}`, "level: high",
      ].join("\n"));
      if (sha256.length || sha1.length || md5s.length) docs.push([
        `title: ${c.title} — file hashes`, `id: ${cryptoId(c.title + "hash")}`, "status: experimental", "logsource:", "  category: process_creation", "detection:", "  selection:", "    Hashes|contains:",
        ...[...sha256.map((h) => `SHA256=${h}`), ...sha1.map((h) => `SHA1=${h}`), ...md5s.map((h) => `MD5=${h}`)].map((v) => `      - ${yq(v)}`), "  condition: selection", "level: critical",
      ].join("\n"));
      for (const d of behaviours) docs.push([
        `title: ${d.title}`, `id: ${cryptoId(c.title + d.rule)}`, "status: experimental", `description: Behaviour seen in the AXTO case "${c.title}".`,
        "tags:", ...d.techniques.map((t) => `  - attack.${t.toLowerCase()}`), "logsource:", "  category: process_creation", "  product: windows", "detection:", "  selection:",
        "    CommandLine|contains|all:", ...BEHAVIOUR[d.rule].map((v) => `      - ${yq(v.trim())}`), "  condition: selection", `level: ${d.severity === "critical" ? "critical" : d.severity === "high" ? "high" : "medium"}`,
      ].join("\n"));
      return docs.length ? docs.join("\n---\n") + "\n" : empty;
    }
    case "kql": {
      const parts: string[] = [];
      if (ips.length) parts.push(`// Network connections to case IPs\nDeviceNetworkEvents\n| where RemoteIP in (${ips.map((v) => `"${q(v)}"`).join(", ")})\n| project Timestamp, DeviceName, InitiatingProcessFileName, RemoteIP, RemotePort, RemoteUrl`);
      if (domains.length) parts.push(`// DNS / URL activity for case domains\nlet domains = dynamic([${domains.map((v) => `"${q(v)}"`).join(", ")}]);\nDeviceNetworkEvents\n| where RemoteUrl has_any (domains)\n| project Timestamp, DeviceName, InitiatingProcessFileName, RemoteUrl, RemoteIP`);
      if (sha256.length || sha1.length || md5s.length) parts.push(`// Files and processes with case hashes\nDeviceFileEvents\n| where SHA256 in (${sha256.map((v) => `"${v}"`).join(", ") || '""'}) or SHA1 in (${sha1.map((v) => `"${v}"`).join(", ") || '""'}) or MD5 in (${md5s.map((v) => `"${v}"`).join(", ") || '""'})\n| project Timestamp, DeviceName, FileName, FolderPath, SHA256, InitiatingProcessFileName`);
      for (const d of behaviours) parts.push(`// ${d.title} (${d.techniques.join(", ")})\nDeviceProcessEvents\n| where ${BEHAVIOUR[d.rule].map((v) => `ProcessCommandLine has "${q(v.trim())}"`).join(" and ")}\n| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine, InitiatingProcessFileName`);
      return parts.length ? parts.join("\n\n") + "\n" : empty.replace("#", "//");
    }
    case "spl": {
      const parts: string[] = [];
      if (ips.length) parts.push(`| tstats count from datamodel=Network_Traffic where All_Traffic.dest_ip IN (${ips.map((v) => `"${v}"`).join(", ")}) by All_Traffic.src_ip All_Traffic.dest_ip All_Traffic.dest_port`);
      if (domains.length) parts.push(`index=* (${domains.map((v) => `query="*${v}" OR url="*${v}*"`).join(" OR ")})\n| stats count min(_time) as first max(_time) as last by src, query, url`);
      if (sha256.length || md5s.length) parts.push(`index=* (${[...sha256, ...md5s].map((v) => `"${v}"`).join(" OR ")})\n| stats count by host, file_name, file_hash`);
      for (const d of behaviours) parts.push(`\`comment("${d.title} — ${d.techniques.join(", ")}")\`\nindex=* (sourcetype=XmlWinEventLog:Microsoft-Windows-Sysmon/Operational EventCode=1) OR (sourcetype=WinEventLog:Security EventCode=4688)\n${BEHAVIOUR[d.rule].map((v) => `CommandLine="*${v.trim()}*"`).join(" ")}\n| table _time host user ParentImage Image CommandLine`);
      return parts.length ? parts.join("\n\n") + "\n" : "``` Nothing to build yet ```\n";
    }
    case "yara": {
      const strs = [...files.slice(0, 20).map((f) => ({ k: "f", v: f })), ...urls.slice(0, 20).map((u) => ({ k: "u", v: u })), ...domains.slice(0, 20).map((d) => ({ k: "d", v: d }))];
      if (!strs.length && !sha256.length) return "// Nothing to build yet — YARA needs file names, URLs, domains or hashes from the case.\n";
      const rule = [`import "hash"`, "", `rule axto_${slug(c.title)}`, "{", "  meta:", `    description = "Indicators from AXTO case: ${q(c.title)}"`, `    author = "${q(c.author || "AXTO Security Analyst")}"`, `    date = "${date.replace(/\//g, "-")}"`];
      if (strs.length) rule.push("  strings:", ...strs.map((s, i) => `    $${s.k}${i} = "${q(s.v)}" ascii wide nocase`));
      rule.push("  condition:");
      const cond = [strs.length ? "any of them" : "", ...sha256.slice(0, 50).map((h) => `hash.sha256(0, filesize) == "${h}"`)].filter(Boolean);
      rule.push(`    ${cond.join(" or\n    ")}`, "}");
      return rule.join("\n") + "\n";
    }
    case "suricata": {
      let sid = 9_100_000 + (parseInt(cryptoId(c.title).slice(0, 5), 16) % 90_000) * 10;
      const lines: string[] = [];
      if (ips.length) lines.push(`alert ip $HOME_NET any -> [${ips.slice(0, 100).join(",")}] any (msg:"AXTO case ${q(c.title)} — traffic to case IP"; classtype:trojan-activity; sid:${sid++}; rev:1;)`);
      for (const d of domains.slice(0, 60)) {
        lines.push(`alert dns $HOME_NET any -> any any (msg:"AXTO case ${q(c.title)} — DNS ${d}"; dns.query; dotprefix; content:".${d}"; nocase; endswith; classtype:trojan-activity; sid:${sid++}; rev:1;)`);
        lines.push(`alert tls $HOME_NET any -> any any (msg:"AXTO case ${q(c.title)} — TLS SNI ${d}"; tls.sni; dotprefix; content:".${d}"; nocase; endswith; classtype:trojan-activity; sid:${sid++}; rev:1;)`);
      }
      for (const u of urls.slice(0, 40)) {
        let path = "";
        try { path = new URL(u).pathname + new URL(u).search; } catch {}
        if (path && path !== "/") lines.push(`alert http $HOME_NET any -> any any (msg:"AXTO case ${q(c.title)} — URL ${q(u).slice(0, 80)}"; http.uri; content:"${q(path).replace(/;/g, "\\;")}"; classtype:trojan-activity; sid:${sid++}; rev:1;)`);
      }
      return lines.length ? lines.join("\n") + "\n" : "# Nothing to build yet — Suricata needs public IPs, domains or URLs.\n";
    }
  }
}

/** Deterministic UUID-like id (so a regenerated rule keeps its id). */
function cryptoId(seed: string): string {
  let a = 0x811c9dc5, b = 0x1b873593, c2 = 0xcc9e2d51, d = 0x85ebca6b;
  for (let i = 0; i < seed.length; i++) { const x = seed.charCodeAt(i); a = Math.imul(a ^ x, 16777619); b = Math.imul(b ^ x, 2654435761); c2 = Math.imul(c2 ^ x, 1597334677); d = Math.imul(d ^ x, 3812015801); }
  const h = [a, b, c2, d].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
