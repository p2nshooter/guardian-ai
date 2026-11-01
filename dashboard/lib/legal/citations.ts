/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LEGAL AI — CITATION EXTRACTOR & VERIFICATION LIST (runs in the browser).
 *
 * Finds statute, regulation and case citations in a draft or an AI answer,
 * groups repeats, and gives each one links to search an official or free
 * source. Nothing is "verified" automatically: the member opens the source
 * and marks each citation — AI answers can invent citations, so every one
 * must be checked before it is relied on.
 * ============================================================================ */

export type CiteKind = "statute" | "regulation" | "case" | "article" | "treaty";
export type CiteStatus = "unchecked" | "verified" | "wrong" | "notfound";
export const CITE_STATUSES: CiteStatus[] = ["unchecked", "verified", "wrong", "notfound"];

export interface Citation {
  key: string; text: string; kind: CiteKind; jurisdiction: string; count: number; context: string;
  links: { label: string; url: string }[];
}
export interface CheckState { status: CiteStatus; note?: string }

interface Pattern { kind: CiteKind; jurisdiction: string; re: RegExp }
const P = (kind: CiteKind, jurisdiction: string, re: RegExp): Pattern => ({ kind, jurisdiction, re });

// Order matters: longer / more specific forms first; overlapping later matches are dropped.
const PATTERNS: Pattern[] = [
  // ── Indonesia ──
  P("case", "ID", /\bPutusan\s+(?:Mahkamah\s+Konstitusi|MK)\s+(?:Nomor|No\.?)\s*\d+\/PUU-[IVXLC]+\/\d{4}/gi),
  P("case", "ID", /\bPutusan\s+(?:Mahkamah\s+Agung(?:\s+RI)?|MA(?:RI)?|Pengadilan\s+[A-Z][\w ]{2,40}?)\s+(?:Nomor|No\.?)\s*\d{1,6}(?:\s?[A-Z]{1,3})?\/[\w.\/\-]+/gi),
  P("case", "ID", /\b\d{1,5}\s?(?:K|PK)\/(?:Pdt(?:\.Sus-?\w*)?|Pid(?:\.Sus)?|TUN|Ag|Mil)\/\d{4}\b/g),
  P("case", "ID", /\b\d{1,4}\/PUU-[IVXLC]+\/\d{4}\b/g),
  P("regulation", "ID", /\b(?:Peraturan\s+(?:Pemerintah|Presiden|Menteri\s+[A-Z][\w ]{2,60}?|Mahkamah\s+Agung|Otoritas\s+Jasa\s+Keuangan|Bank\s+Indonesia|Daerah)|PP|Perpres|Permen\w*|PERMA|POJK|PBI|Perda|SEMA|SEOJK)\s+(?:Nomor|No\.?)\s*[\w.\/\-]+\s+(?:Tahun|Th\.?)\s+\d{4}\b/g),
  P("regulation", "ID", /\b(?:PP|Perpres|PERMA|POJK|SEMA|Perda)\s+(?:No\.?\s*)?\d+\/(?:POJK\.\d+\/)?\d{4}\b/g),
  P("statute", "ID", /\b(?:Pasal\s+\d+[A-Z]?(?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?\s+)?(?:Undang-Undang|UU|Perppu)\s+(?:Nomor|No\.?)\s*\d+\s+(?:Tahun|Th\.?)\s+\d{4}\b/g),
  P("statute", "ID", /\b(?:Pasal\s+\d+[A-Z]?(?:\s+ayat\s+\(\d+\))?\s+)?UU\s+(?:No\.?\s*)?\d+\/\d{4}\b/g),
  P("statute", "ID", /\bPasal\s+\d+[A-Z]?(?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?\s+(?:KUHPerdata|KUH\s?Perdata|BW|KUHP|KUHAP|KUHD|HIR|RBg|UU\s+[A-Z][A-Za-z]{1,12}|UUD\s+(?:NRI\s+)?1945)\b/g),
  // ── United States ──
  P("case", "US", /\b\d{1,4}\s+(?:U\.\s?S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?|F\.(?:\s?(?:2d|3d|4th))?|F\.\s?Supp\.(?:\s?(?:2d|3d))?|F\.\s?App'x|B\.R\.|A\.(?:2d|3d)?|N\.E\.(?:2d|3d)?|N\.W\.(?:2d)?|P\.(?:2d|3d)?|S\.E\.(?:2d)?|S\.W\.(?:2d|3d)?|So\.(?:\s?[23]d)?|Cal\.\s?(?:Rptr\.|App\.)(?:\s?\d(?:d|th))?|N\.Y\.S\.(?:\s?[23]d)?)\s+\d{1,5}(?:,\s*\d{1,5}(?:[-–]\d{1,5})?)?(?:\s+\([^)]{0,40}\d{4}\))?/g),
  P("statute", "US", /\b\d{1,2}\s+U\.\s?S\.\s?C\.(?:\s?A\.)?\s+§§?\s*\d+[\w\-.]*(?:\([\w]+\))*/g),
  P("regulation", "US", /\b\d{1,2}\s+C\.\s?F\.\s?R\.\s+(?:§§?|[Pp]art)\s*\d+(?:\.\d+)?(?:\([\w]+\))*/g),
  P("regulation", "US", /\bFed\.\s?R\.\s?(?:Civ|Crim|App|Evid|Bankr)\.\s?P\.\s*\d+(?:\([\w]+\))*|\bFed\.\s?R\.\s?Evid\.\s*\d+(?:\([\w]+\))*/g),
  P("statute", "US", /\b(?:Cal|N\.Y|Tex|Fla|Ill|Del)\.\s[A-Z][\w.&\s]{2,40}?(?:Code|Law|Stat\.?)(?:\sAnn\.)?\s§§?\s*[\d.\-]+(?:\([\w]+\))*/g),
  // ── United Kingdom ──
  P("case", "GB", /\[\d{4}\]\s+(?:UKSC|UKHL|UKPC|EWCA\s+(?:Civ|Crim)|EWHC|EWFC|EWCOP|UKUT|UKFTT|UKEAT|CSOH|CSIH|NICA)\s+\d{1,5}(?:\s+\([A-Za-z ]{2,20}\))?/g),
  P("case", "GB", /[\[(]\d{4}[\])]\s+(?:\d{1,2}\s+)?(?:AC|QB|KB|Ch|Fam|WLR|All\s?ER(?:\s?\(Comm\))?|Lloyd's\s+Rep|BCLC|ICR|IRLR|Cr\s?App\s?R|EMLR|FSR|RPC|P\s?&\s?CR)\s+\d{1,5}/g),
  P("statute", "GB", /\b(?:(?:section|s\.?|ss\.?)\s*\d+[A-Z]?(?:\(\d+\))*(?:\([a-z]\))?\s+(?:of\s+)?(?:the\s+)?)?[A-Z][A-Za-z()' ]{2,70}?\sAct\s(?:1[6-9]|20)\d{2}(?:,\s*(?:s|ss|section)\.?\s*\d+[A-Z]?(?:\(\d+\))*)?/g),
  // ── European Union ──
  P("case", "EU", /\bECLI:[A-Z]{2}:[A-Z0-9]{1,7}:\d{4}:[\w.]{1,25}/g),
  P("case", "EU", /\b(?:Case\s+)?[CT]-\d{1,4}\/\d{2}(?:\s?P)?\b/g),
  P("regulation", "EU", /\b(?:Regulation|Directive|Decision)\s+\((?:EU|EC|EEC|Euratom)\)\s+(?:No\s+)?\d{2,4}\/\d{1,4}(?:\/(?:EU|EC|EEC))?/g),
  P("regulation", "EU", /\b(?:Regulation|Directive)\s+\d{2,4}\/\d{1,4}\/(?:EU|EC|EEC)\b/g),
  P("article", "EU", /\bArt(?:icle|\.)\s*\d+(?:\(\d+\))*(?:\([a-z]\))?\s+(?:of\s+the\s+)?(?:GDPR|DSA|DMA|AI\s+Act|NIS2|DORA|TFEU|TEU|Charter|ECHR)\b/g),
  // ── Singapore / Malaysia / Australia / Canada / India / New Zealand / Hong Kong ──
  P("case", "SG", /\[\d{4}\]\s+(?:SGCA|SGHC(?:\(A\)|R|F)?|SGDC|SGMC|SGHCR|SGHCF|SGIPOS)\s+\d{1,5}/g),
  P("case", "SG", /\[\d{4}\]\s+\d\s+SLR(?:\(R\))?\s+\d{1,5}/g),
  P("case", "MY", /\[\d{4}\]\s+\d{1,2}\s+(?:MLJ|CLJ|AMR|MLRA|MLRH)\s+\d{1,5}/g),
  P("case", "AU", /\[\d{4}\]\s+(?:HCA|FCAFC|FCA|NSWCA|NSWSC|VSCA|VSC|QCA|QSC|WASCA|WASC|SASC|SASCFC|TASSC|ACTSC|NTSC|AATA|FedCFamC\w*)\s+\d{1,5}/g),
  P("case", "AU", /\(\d{4}\)\s+\d{1,4}\s+(?:CLR|ALR|ALJR|FCR|NSWLR|VR|Qd\s?R)\s+\d{1,5}/g),
  P("case", "CA", /\b\d{4}\s+(?:SCC|FCA|FC|ONCA|ONSC|BCCA|BCSC|ABCA|ABQB|ABKB|QCCA|QCCS|NSCA|MBCA|SKCA|NBCA)\s+\d{1,5}\b/g),
  P("case", "CA", /\[\d{4}\]\s+\d\s+S\.C\.R\.\s+\d{1,5}/g),
  P("case", "IN", /\bAIR\s+\d{4}\s+(?:SC|[A-Z][a-z]{1,10})\s+\d{1,5}\b|\(\d{4}\)\s+\d{1,3}\s+SCC\s+\d{1,5}/g),
  P("case", "NZ", /\[\d{4}\]\s+(?:NZSC|NZCA|NZHC)\s+\d{1,5}/g),
  P("case", "HK", /\[\d{4}\]\s+(?:HKCFA|HKCA|HKCFI|HKDC)\s+\d{1,5}/g),
  // ── treaties ──
  P("treaty", "INT", /\b(?:Vienna\s+Convention\s+on\s+the\s+Law\s+of\s+Treaties|New\s+York\s+Convention|CISG|United\s+Nations\s+Convention\s+on\s+Contracts\s+for\s+the\s+International\s+Sale\s+of\s+Goods|European\s+Convention\s+on\s+Human\s+Rights|Hague\s+(?:Service|Evidence|Choice\s+of\s+Court)\s+Convention)\b/g),
];

const enc = encodeURIComponent;
const google = (site: string, q: string) => `https://www.google.com/search?q=${enc(`site:${site} "${q}"`)}`;
/** Where to check a citation: official or free sources, searched with its exact text. */
export function sourceLinks(c: { text: string; kind: CiteKind; jurisdiction: string }): { label: string; url: string }[] {
  const q = c.text.replace(/\s+/g, " ").trim();
  const out: { label: string; url: string }[] = [];
  const scholar = { label: "Google Scholar", url: `https://scholar.google.com/scholar?hl=en&as_sdt=2006&q=${enc(`"${q}"`)}` };
  switch (c.jurisdiction) {
    case "ID":
      if (c.kind === "case") {
        out.push({ label: "Direktori Putusan MA", url: google("putusan3.mahkamahagung.go.id", q) });
        if (/PUU/i.test(q)) out.push({ label: "Mahkamah Konstitusi", url: google("mkri.id", q) });
      } else {
        out.push({ label: "JDIH BPK", url: google("peraturan.bpk.go.id", q) });
        out.push({ label: "peraturan.go.id", url: google("peraturan.go.id", q) });
      }
      break;
    case "US": {
      const usc = /(\d{1,2})\s+U\.\s?S\.\s?C\.(?:\s?A\.)?\s+§§?\s*([\w\-.]+)/.exec(q);
      const cfr = /(\d{1,2})\s+C\.\s?F\.\s?R\.\s+§§?\s*(\d+(?:\.\d+)?)/.exec(q);
      const frcp = /Fed\.\s?R\.\s?Civ\.\s?P\.\s*(\d+)/.exec(q);
      if (usc) out.push({ label: "Cornell LII (U.S. Code)", url: `https://www.law.cornell.edu/uscode/text/${usc[1]}/${enc(usc[2].replace(/\.$/, ""))}` });
      if (cfr) out.push({ label: "Cornell LII (CFR)", url: `https://www.law.cornell.edu/cfr/text/${cfr[1]}/${enc(cfr[2])}` });
      if (frcp) out.push({ label: "Cornell LII (FRCP)", url: `https://www.law.cornell.edu/rules/frcp/rule_${frcp[1]}` });
      if (c.kind === "case") { out.push({ label: "CourtListener", url: `https://www.courtlistener.com/?q=${enc(`"${q}"`)}` }); out.push(scholar); }
      if (!out.length) out.push({ label: "Cornell LII", url: google("law.cornell.edu", q) });
      break;
    }
    case "GB":
      if (c.kind === "case") { out.push({ label: "BAILII", url: google("bailii.org", q) }); out.push({ label: "National Archives (Find Case Law)", url: google("caselaw.nationalarchives.gov.uk", q) }); }
      else { const act = /([A-Z][A-Za-z()' ]{2,70}?\sAct\s\d{4})/.exec(q); out.push({ label: "legislation.gov.uk", url: `https://www.legislation.gov.uk/all?title=${enc((act?.[1] || q).replace(/^(?:the|of)\s+/i, ""))}` }); }
      break;
    case "EU": {
      const cj = /\b([CT]-\d{1,4}\/\d{2})/.exec(q);
      if (cj) out.push({ label: "CURIA", url: `https://curia.europa.eu/juris/liste.jsf?num=${enc(cj[1])}` });
      out.push({ label: "EUR-Lex", url: `https://eur-lex.europa.eu/search.html?scope=EURLEX&type=quick&lang=en&text=${enc(q)}` });
      break;
    }
    case "SG": out.push({ label: "eLitigation", url: google("elitigation.sg", q) }); out.push({ label: "Singapore Statutes Online", url: google("sso.agc.gov.sg", q) }); break;
    case "MY": out.push({ label: "CommonLII", url: google("commonlii.org", q) }); break;
    case "AU": out.push({ label: "AustLII", url: google("austlii.edu.au", q) }); break;
    case "CA": out.push({ label: "CanLII", url: google("canlii.org", q) }); break;
    case "IN": out.push({ label: "Indian Kanoon", url: google("indiankanoon.org", q) }); break;
    case "NZ": out.push({ label: "NZLII", url: google("nzlii.org", q) }); break;
    case "HK": out.push({ label: "HKLII", url: google("hklii.hk", q) }); break;
    default: out.push({ label: "UN Treaty Collection", url: google("treaties.un.org", q) });
  }
  if (c.kind === "case" && c.jurisdiction !== "US") out.push(scholar);
  return out;
}

const norm = (s: string) => s.replace(/\s+/g, " ").replace(/[.,;:]+$/, "").trim();
const keyOf = (s: string) => norm(s).toLowerCase().replace(/[^\p{L}\p{N}/§()\-]+/gu, "");

/** The sentence around a match, trimmed to ~220 characters. */
function contextAt(text: string, start: number, end: number): string {
  const left = Math.max(text.lastIndexOf("\n", start), text.lastIndexOf(". ", start), start - 160);
  const rightNl = text.indexOf("\n", end), rightDot = text.indexOf(". ", end);
  const right = Math.min(...[rightNl, rightDot, end + 160].filter((x) => x >= 0));
  return text.slice(Math.max(0, left + 1), right + 1).replace(/\s+/g, " ").trim().slice(0, 240);
}

/** Every distinct citation in `text`, in order of first appearance. */
export function extractCitations(text: string, max = 400): Citation[] {
  const src = String(text || "").slice(0, 2_000_000);
  const hits: { start: number; end: number; p: Pattern; s: string }[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of src.matchAll(p.re)) {
      let s = norm(m[0]);
      // "Under the Data Protection Act 2018" → "Data Protection Act 2018"
      if (p.jurisdiction === "GB" && p.kind === "statute") s = s.replace(/^(?:(?:[Uu]nder|[Ii]n|[Ss]ee|[Bb]y|[Pp]ursuant\s+to|[Aa]nd|[Aa]lso|[Pp]er|[Cc]f\.?|[Bb]oth|[Oo]ur|[Tt]heir|[Tt]his|[Tt]hat|[Tt]he|[Ii]ts)\s+)+(?=[A-Z])/, "");
      if (s.length < 5) continue;
      const start = m.index!, end = start + m[0].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue;   // overlaps a more specific match
      hits.push({ start, end, p, s });
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const byKey = new Map<string, Citation>();
  for (const h of hits) {
    const key = `${h.p.jurisdiction}:${keyOf(h.s)}`;
    const cur = byKey.get(key);
    if (cur) { cur.count++; continue; }
    if (byKey.size >= max) break;
    const c: Citation = { key, text: h.s, kind: h.p.kind, jurisdiction: h.p.jurisdiction, count: 1, context: contextAt(src, h.start, h.end), links: [] };
    c.links = sourceLinks(c);
    byKey.set(key, c);
  }
  return [...byKey.values()];
}

// ── export ──
const csvCell = (s: unknown) => { const v = String(s ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
export function citationsCsv(list: Citation[], checks: Record<string, CheckState>): string {
  const rows = [["Citation", "Type", "Jurisdiction", "Times cited", "Status", "Note", "Context", "Check at"]];
  for (const c of list) rows.push([c.text, c.kind, c.jurisdiction, String(c.count), checks[c.key]?.status || "unchecked", checks[c.key]?.note || "", c.context, c.links[0]?.url || ""]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
export function citationsMarkdown(list: Citation[], checks: Record<string, CheckState>, title: string): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [`# ${title}`, "", "| # | Citation | Type | Jurisdiction | Status | Note |", "|---|---|---|---|---|---|"];
  list.forEach((c, i) => lines.push(`| ${i + 1} | ${esc(c.text)} | ${c.kind} | ${c.jurisdiction} | ${checks[c.key]?.status || "unchecked"} | ${esc(checks[c.key]?.note || "")} |`));
  const s = summary(list, checks);
  lines.push("", `Verified ${s.verified} · wrong ${s.wrong} · not found ${s.notfound} · unchecked ${s.unchecked}`);
  return lines.join("\n") + "\n";
}
export function summary(list: Citation[], checks: Record<string, CheckState>): Record<CiteStatus, number> {
  const s: Record<CiteStatus, number> = { unchecked: 0, verified: 0, wrong: 0, notfound: 0 };
  for (const c of list) s[checks[c.key]?.status || "unchecked"]++;
  return s;
}
