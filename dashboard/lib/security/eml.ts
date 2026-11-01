/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — phishing analysis of a raw e-mail (.eml) ON THE DEVICE:
 * MIME parsing (multipart, base64, quoted-printable, charsets, encoded-word
 * headers), the Received chain, SPF / DKIM / DMARC results, From / Reply-To /
 * Return-Path mismatches, deceptive links, risky attachments with SHA-256, and
 * a scored verdict. Nothing leaves the browser.
 * ============================================================================ */
import type { Severity } from "./attack";

export interface Header { name: string; value: string }
export interface Part { headers: Header[]; contentType: string; charset: string; filename: string; disposition: string; bytes: Uint8Array; text?: string }
export interface Hop { from: string; by: string; with: string; ip: string; date: string; time: number; delaySec?: number }
export interface Link { href: string; text: string; host: string; flags: string[] }
export interface Attachment { name: string; type: string; size: number; sha256: string; flags: string[] }
export interface Finding { severity: Severity; title: string; detail: string }
export interface EmailReport {
  subject: string; from: string; fromAddr: string; fromDomain: string; to: string; date: string; messageId: string;
  replyTo: string; returnPath: string; auth: { spf: string; dkim: string; dmarc: string; raw: string };
  hops: Hop[]; links: Link[]; attachments: Attachment[]; text: string; html: string; headers: Header[];
  findings: Finding[]; score: number; verdict: "clean" | "suspicious" | "phishing";
}

const dec = (charset: string, b: Uint8Array) => { try { return new TextDecoder(/^(?:utf-?8|us-ascii|ascii)$/i.test(charset) || !charset ? "utf-8" : charset.toLowerCase(), { fatal: false }).decode(b); } catch { return new TextDecoder("utf-8").decode(b); } };
const latin1 = (s: string) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
function b64(s: string): Uint8Array { try { const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, "")); return latin1(bin); } catch { return new Uint8Array(); } }
function qp(s: string): Uint8Array {
  const out: number[] = [];
  const t = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) { out.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; } else out.push(t.charCodeAt(i) & 255);
  }
  return Uint8Array.from(out);
}
/** =?utf-8?B?…?= and =?iso-8859-1?Q?…?= in headers. */
export function decodeWords(v: string): string {
  return v.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=(\s+(?==\?))?/g, (_m, cs: string, enc: string, data: string) =>
    dec(cs, enc.toUpperCase() === "B" ? b64(data) : qp(data.replace(/_/g, " "))));
}

function splitHead(raw: string): { headers: Header[]; body: string } {
  const at = raw.search(/\r?\n\r?\n/);
  const head = at < 0 ? raw : raw.slice(0, at);
  const body = at < 0 ? "" : raw.slice(at).replace(/^\r?\n\r?\n/, "");
  const headers: Header[] = [];
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && headers.length) headers[headers.length - 1].value += " " + line.trim();
    else { const c = line.indexOf(":"); if (c > 0) headers.push({ name: line.slice(0, c).trim(), value: line.slice(c + 1).trim() }); }
  }
  return { headers, body };
}
const hget = (h: Header[], n: string) => h.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value || "";
const hall = (h: Header[], n: string) => h.filter((x) => x.name.toLowerCase() === n.toLowerCase()).map((x) => x.value);
const param = (v: string, p: string) => { const m = v.match(new RegExp(`${p}\\*?=\\s*(?:"([^"]*)"|([^;\\s]+))`, "i")); return m ? decodeWords(decodeURIComponent((m[1] ?? m[2] ?? "").replace(/^utf-8''/i, ""))) : ""; };

function parsePart(raw: string, out: Part[], depth = 0) {
  const { headers, body } = splitHead(raw);
  const ct = hget(headers, "Content-Type") || "text/plain";
  const type = ct.split(";")[0].trim().toLowerCase();
  if (type.startsWith("multipart/") && depth < 8) {
    const boundary = param(ct, "boundary");
    if (boundary) {
      const segs = body.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?\\s*`));
      for (const s of segs) if (s.trim()) parsePart(s, out, depth + 1);
      return;
    }
  }
  const cte = hget(headers, "Content-Transfer-Encoding").toLowerCase();
  const bytes = cte === "base64" ? b64(body) : cte === "quoted-printable" ? qp(body) : latin1(body);
  const disposition = hget(headers, "Content-Disposition");
  const filename = param(disposition, "filename") || param(ct, "name");
  const charset = param(ct, "charset");
  const part: Part = { headers, contentType: type, charset, filename, disposition: disposition.split(";")[0].trim().toLowerCase(), bytes };
  if (!filename && type.startsWith("text/")) part.text = dec(charset, bytes);
  else if (type === "message/rfc822" && depth < 8) { parsePart(dec("utf-8", bytes), out, depth + 1); return; }
  out.push(part);
}

const addr = (v: string) => ((v.match(/<([^>]+)>/) || [])[1] || (v.match(/[\w.+%-]+@[\w.-]+\.\w+/) || [])[0] || "").trim().toLowerCase();
const domainOf = (a: string) => a.split("@")[1] || "";
/** "mail.evil.co.uk" → "evil.co.uk"; good enough for alignment checks. */
export function orgDomain(host: string): string {
  const p = host.toLowerCase().replace(/\.$/, "").split(".");
  if (p.length <= 2) return p.join(".");
  const two = p.slice(-2).join(".");
  return /^(?:co|com|net|org|gov|ac|edu|or|go|ne)\.[a-z]{2}$/.test(two) ? p.slice(-3).join(".") : two;
}
const SHORTENERS = /^(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rebrand\.ly|s\.id|shorturl\.at|rb\.gy|tiny\.cc)$/i;
const BRANDS: { name: string; re: RegExp; domains: string[] }[] = [
  { name: "PayPal", re: /\bpaypal\b/i, domains: ["paypal.com"] },
  { name: "Microsoft", re: /\b(?:microsoft|office ?365|outlook|onedrive|sharepoint)\b/i, domains: ["microsoft.com", "outlook.com", "office.com", "microsoftonline.com", "sharepoint.com", "live.com"] },
  { name: "Apple", re: /\b(?:apple|icloud|itunes)\b/i, domains: ["apple.com", "icloud.com"] },
  { name: "Google", re: /\b(?:google|gmail)\b/i, domains: ["google.com", "gmail.com"] },
  { name: "Amazon", re: /\bamazon\b/i, domains: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.co.jp", "amazonses.com"] },
  { name: "Netflix", re: /\bnetflix\b/i, domains: ["netflix.com"] },
  { name: "DHL", re: /\bdhl\b/i, domains: ["dhl.com", "dhl.de"] },
  { name: "FedEx", re: /\bfedex\b/i, domains: ["fedex.com"] },
  { name: "BCA", re: /\b(?:bank )?bca\b/i, domains: ["bca.co.id", "klikbca.com"] },
  { name: "BNI", re: /\b(?:bank )?bni\b/i, domains: ["bni.co.id"] },
  { name: "BRI", re: /\b(?:bank )?bri\b/i, domains: ["bri.co.id"] },
  { name: "Mandiri", re: /\bmandiri\b/i, domains: ["bankmandiri.co.id"] },
];
const RISKY_EXT = /\.(?:exe|scr|com|pif|bat|cmd|js|jse|vbs|vbe|wsf|hta|ps1|jar|msi|lnk|iso|img|vhd|cab|reg|dll|cpl|docm|xlsm|pptm|one|html?|svg)$/i;

function hops(h: Header[]): Hop[] {
  const list = hall(h, "Received").map((v) => {
    const semi = v.lastIndexOf(";");
    const date = semi >= 0 ? v.slice(semi + 1).trim() : "";
    const t = Date.parse(date);
    return {
      from: (v.match(/\bfrom\s+(\S+)/i) || [])[1] || "", by: (v.match(/\bby\s+(\S+)/i) || [])[1] || "", with: (v.match(/\bwith\s+(\S+)/i) || [])[1] || "",
      ip: (v.match(/\[((?:\d{1,3}\.){3}\d{1,3}|[a-f0-9:]{3,})\]/i) || [])[1] || (v.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || [])[0] || "", date, time: Number.isFinite(t) ? t : NaN,
    } as Hop;
  }).reverse(); // oldest first
  for (let i = 1; i < list.length; i++) if (Number.isFinite(list[i].time) && Number.isFinite(list[i - 1].time)) list[i].delaySec = Math.round((list[i].time - list[i - 1].time) / 1000);
  return list;
}

function authResult(h: Header[]) {
  const raw = [...hall(h, "Authentication-Results"), ...hall(h, "ARC-Authentication-Results")].join(" ; ");
  const pick = (k: string) => ((raw.match(new RegExp(`\\b${k}=(\\w+)`, "i")) || [])[1] || "").toLowerCase();
  let spf = pick("spf");
  if (!spf) spf = ((hget(h, "Received-SPF").match(/^(\w+)/) || [])[1] || "").toLowerCase();
  return { spf: spf || "none", dkim: pick("dkim") || (hget(h, "DKIM-Signature") ? "present" : "none"), dmarc: pick("dmarc") || "none", raw };
}

function linksOf(html: string, text: string, fromDomain: string): Link[] {
  const out: Link[] = [];
  const seen = new Set<string>();
  const push = (href: string, label: string) => {
    const h = href.trim().replace(/&amp;/g, "&");
    if (!/^(?:https?:)?\/\//i.test(h) || seen.has(h + label)) return;
    seen.add(h + label);
    let host = "";
    try { host = new URL(h.startsWith("//") ? `https:${h}` : h).hostname.toLowerCase(); } catch { return; }
    const flags: string[] = [];
    const shownHost = (label.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})/i) || [])[1]?.toLowerCase();
    if (shownHost && orgDomain(shownHost) !== orgDomain(host)) flags.push("text-mismatch");
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) flags.push("ip-literal");
    if (host.includes("xn--")) flags.push("punycode");
    if (SHORTENERS.test(host)) flags.push("shortener");
    if (/@/.test(h.split("?")[0].replace(/^https?:\/\//, ""))) flags.push("userinfo");
    if (fromDomain && orgDomain(host) !== orgDomain(fromDomain) && /(?:login|signin|verify|account|secure|update|password|wallet|invoice)/i.test(h)) flags.push("credential-lure");
    out.push({ href: h, text: label.replace(/\s+/g, " ").trim().slice(0, 160), host, flags });
  };
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/gi)) push(m[1], m[2].replace(/<[^>]+>/g, ""));
  for (const m of text.matchAll(/\bhttps?:\/\/[^\s"'<>)\]]+/gi)) push(m[0], "");
  return out.slice(0, 300);
}

async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", b as BufferSource);
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Analyse a raw RFC 822 message. */
export async function analyzeEmail(raw: string): Promise<EmailReport> {
  const { headers } = splitHead(raw);
  const parts: Part[] = [];
  parsePart(raw, parts);
  const text = parts.filter((p) => p.contentType === "text/plain" && p.text != null).map((p) => p.text).join("\n").slice(0, 200_000);
  const html = parts.filter((p) => p.contentType === "text/html" && p.text != null).map((p) => p.text).join("\n").slice(0, 400_000);
  const from = decodeWords(hget(headers, "From")), fromAddr = addr(from), fromDomain = domainOf(fromAddr);
  const replyTo = addr(decodeWords(hget(headers, "Reply-To"))), returnPath = addr(hget(headers, "Return-Path"));
  const auth = authResult(headers);
  const hs = hops(headers);
  const links = linksOf(html, text, fromDomain);
  const attachments: Attachment[] = [];
  for (const p of parts) {
    if (!p.filename && p.disposition !== "attachment" && (p.contentType.startsWith("text/") || p.contentType.startsWith("multipart/"))) continue;
    const name = p.filename || "(unnamed)";
    const flags: string[] = [];
    if (RISKY_EXT.test(name)) flags.push("risky-type");
    if (/\.[a-z0-9]{2,4}\.(?:exe|scr|js|vbs|hta|bat|cmd|lnk|iso)$/i.test(name)) flags.push("double-extension");
    if (/[‮​]/.test(name)) flags.push("unicode-trick");
    if (/\.(?:zip|rar|7z)$/i.test(name) && /password|pass|pwd|kata ?sandi/i.test(text + html)) flags.push("password-archive");
    attachments.push({ name, type: p.contentType, size: p.bytes.length, sha256: await sha256Hex(p.bytes), flags });
  }

  const findings: Finding[] = [];
  const f = (severity: Severity, title: string, detail: string) => findings.push({ severity, title, detail });
  if (auth.spf === "fail" || auth.spf === "softfail") f(auth.spf === "fail" ? "high" : "medium", `SPF ${auth.spf}`, "The sending server is not authorised to send for this domain.");
  if (auth.dkim === "fail") f("high", "DKIM failed", "The signature does not match — the message may have been altered or forged.");
  if (auth.dmarc === "fail") f("high", "DMARC failed", "The From domain's policy was not satisfied.");
  if (auth.spf === "none" && auth.dkim === "none") f("medium", "No sender authentication", "Neither SPF nor DKIM results are present.");
  if (replyTo && fromDomain && orgDomain(domainOf(replyTo)) !== orgDomain(fromDomain)) f("high", "Reply-To differs from From", `Replies go to ${replyTo}, not ${fromAddr}.`);
  if (returnPath && fromDomain && orgDomain(domainOf(returnPath)) !== orgDomain(fromDomain)) f("medium", "Return-Path differs from From", `Bounces go to ${returnPath}.`);
  const display = from.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
  const shownAddr = (display.match(/[\w.+%-]+@[\w.-]+\.\w+/) || [])[0];
  if (shownAddr && shownAddr.toLowerCase() !== fromAddr) f("high", "Display name shows another address", `“${display}” but the real sender is ${fromAddr}.`);
  const brand = BRANDS.find((b) => b.re.test(display) || b.re.test(hget(headers, "Subject")));
  if (brand && fromDomain && !brand.domains.includes(orgDomain(fromDomain))) f("high", `Possible ${brand.name} impersonation`, `The message presents itself as ${brand.name} but was sent from ${fromDomain}.`);
  const bad = links.filter((l) => l.flags.length);
  if (bad.some((l) => l.flags.includes("text-mismatch"))) f("high", "Link text points elsewhere", "The visible link text shows a different site than the real target.");
  if (bad.some((l) => l.flags.includes("credential-lure"))) f("high", "Credential lure", "A login / verify / payment link goes to a domain unrelated to the sender.");
  if (bad.some((l) => l.flags.includes("ip-literal") || l.flags.includes("punycode") || l.flags.includes("userinfo"))) f("medium", "Obfuscated link", "A link uses a raw IP address, punycode or user@host trickery.");
  if (bad.some((l) => l.flags.includes("shortener"))) f("low", "Shortened link", "A URL shortener hides the destination.");
  for (const a of attachments) if (a.flags.length) f(a.flags.includes("double-extension") || a.flags.includes("unicode-trick") ? "critical" : "high", `Risky attachment: ${a.name}`, a.flags.join(", "));
  if (/(?:urgent|immediately|suspend(?:ed)?|verify your account|password (?:expire|reset)|unusual (?:sign-in|activity)|invoice (?:overdue|attached)|segera|diblokir|verifikasi akun)/i.test(`${hget(headers, "Subject")} ${text} ${html.replace(/<[^>]+>/g, " ")}`)) {
    f("low", "Urgency / pressure language", "Typical social-engineering wording.");
  }
  const long = hs.find((x) => (x.delaySec || 0) > 3600);
  if (long) f("info", "Long delay between hops", `${Math.round((long.delaySec || 0) / 60)} minutes at ${long.by || "a relay"}.`);

  const W: Record<Severity, number> = { info: 0, low: 8, medium: 15, high: 25, critical: 40 };
  const score = Math.min(100, findings.reduce((n, x) => n + W[x.severity], 0));
  return {
    subject: decodeWords(hget(headers, "Subject")), from, fromAddr, fromDomain, to: decodeWords(hget(headers, "To")), date: hget(headers, "Date"), messageId: hget(headers, "Message-ID"),
    replyTo, returnPath, auth, hops: hs, links, attachments, text, html, headers, findings: findings.sort((a, b) => W[b.severity] - W[a.severity]), score,
    verdict: score >= 50 ? "phishing" : score >= 20 ? "suspicious" : "clean",
  };
}
