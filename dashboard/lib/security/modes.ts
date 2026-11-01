/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST — client-safe constants: analysis modes and a defanging-aware
 * IOC extractor that runs in the browser BEFORE any AI call, so indicators are
 * pulled out locally and (optionally) handed to the model as verified context.
 * No "use client" here — this file is pure and imported by both the page and the
 * server task handler.
 * ============================================================================ */

export type SecMode = "triage" | "ioc" | "incident" | "hunt" | "harden" | "explain";

export const SEC_MODES: { id: SecMode; name: string; icon: string; blurb: string }[] = [
  { id: "triage", name: "Alert triage", icon: "🚨", blurb: "Verdict, severity and reasoning for an alert, log or suspicious command." },
  { id: "ioc", name: "IOC extraction", icon: "🔎", blurb: "Pull out and classify indicators, with enrichment guidance." },
  { id: "incident", name: "Incident report", icon: "📄", blurb: "A blameless report: summary, timeline, impact, root cause and actions." },
  { id: "hunt", name: "Threat hunting", icon: "🎯", blurb: "Hypotheses and detection queries to hunt for related activity." },
  { id: "harden", name: "Hardening review", icon: "🔧", blurb: "Prioritised hardening and detection gaps for a system or config." },
  { id: "explain", name: "Explain & advise", icon: "💡", blurb: "Explain a technique, CVE, log line or script in plain language." },
];
export const isSecMode = (x: string): x is SecMode => SEC_MODES.some((m) => m.id === x);

/** Refang common defanging so hxxp://, 1[.]2[.]3[.]4, user[at]host all parse. */
export function refang(s: string): string {
  return s
    .replace(/\[?\.\]?/g, (m) => (m === "[.]" ? "." : m))
    .replace(/\bh(?:xx|XX)?p(s?)(?::|\[:\])\/\//gi, "http$1://")
    .replace(/\[:\]/g, ":")
    .replace(/\((?:dot|DOT)\)|\[(?:dot|DOT)\]/g, ".")
    .replace(/\[(?:at|AT|@)\]|\((?:at|AT|@)\)|\s(?:at)\s/g, "@")
    .replace(/\[\/\]/g, "/");
}

export interface Iocs { ipv4: string[]; ipv6: string[]; domains: string[]; urls: string[]; emails: string[]; md5: string[]; sha1: string[]; sha256: string[]; cves: string[] }

const uniq = (a: string[]) => Array.from(new Set(a)).slice(0, 500);
const PRIVATE_IP = /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|255\.)/;

/** Extract indicators of compromise from raw text. Pure, safe to run client-side. */
export function extractIocs(raw: string): Iocs {
  const t = refang(String(raw || "")).slice(0, 200_000);
  const grab = (re: RegExp) => uniq(Array.from(t.matchAll(re)).map((m) => m[0]));
  const urls = grab(/\bhttps?:\/\/[^\s"'<>)\]]+/gi);
  const emails = grab(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi);
  const ipv4 = grab(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g).filter((ip) => !PRIVATE_IP.test(ip));
  const ipv6 = grab(/\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{0,4}\b/gi).filter((x) => x.includes("::") || x.split(":").length >= 6);
  const md5 = grab(/\b[a-f0-9]{32}\b/gi);
  const sha1 = grab(/\b[a-f0-9]{40}\b/gi);
  const sha256 = grab(/\b[a-f0-9]{64}\b/gi);
  const cves = uniq(grab(/\bCVE-\d{4}-\d{4,7}\b/gi).map((c) => c.toUpperCase()));
  // Bare domains, minus ones already captured inside urls/emails and common file-ish noise.
  const inUrlsOrMail = new Set([...urls, ...emails].join(" ").toLowerCase().match(/[a-z0-9.-]+\.[a-z]{2,}/g) || []);
  const domains = grab(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi)
    .filter((d) => !/^\d+$/.test(d.replace(/\./g, "")) && !inUrlsOrMail.has(d.toLowerCase()) && !/\.(png|jpe?g|gif|svg|css|js|json|txt|log|exe|dll|pdf|docx?|xlsx?)$/i.test(d));
  return { ipv4, ipv6, domains, urls, emails, md5, sha1, sha256, cves };
}

export function iocCount(i: Iocs): number {
  return i.ipv4.length + i.ipv6.length + i.domains.length + i.urls.length + i.emails.length + i.md5.length + i.sha1.length + i.sha256.length + i.cves.length;
}

/** A compact, model-friendly block of the indicators found locally. */
export function iocBlock(i: Iocs): string {
  const rows: string[] = [];
  const add = (label: string, vals: string[]) => { if (vals.length) rows.push(`${label}: ${vals.join(", ")}`); };
  add("IPv4", i.ipv4); add("IPv6", i.ipv6); add("Domains", i.domains); add("URLs", i.urls);
  add("Emails", i.emails); add("MD5", i.md5); add("SHA1", i.sha1); add("SHA256", i.sha256); add("CVEs", i.cves);
  return rows.length ? `Indicators extracted locally (already validated, treat as ground truth):\n${rows.join("\n")}\n\n` : "";
}
