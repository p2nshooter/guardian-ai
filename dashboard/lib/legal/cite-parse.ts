/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — CITATION → CANONICAL REFERENCE (BLUEPRINT-V4 §32, phase L1).
 *
 * Turns a citation found by extractCitations() into the key the corpus uses
 * (lib/legal/corpus.ts): jurisdiction, instrument kind, reference or short name,
 * and the pinpoint (article, section, rule). Importers use the same helpers, so a
 * citation and the stored law meet on one key. A citation this file cannot read
 * is returned as null and shown as "not read", never guessed.
 * ============================================================================ */
import type { Citation } from "./citations";
import { normAlias, normRef, pinpoint, type InstrumentKind, type PinUnit } from "./corpus";

export interface ParsedRef {
  jurisdiction: string;
  kind: InstrumentKind;
  ref?: string;          // canonical reference (corpus.instrumentKey)
  alias?: string;        // or a short name to look up
  pin?: string;          // normalised pinpoint, when the citation names one
  needsRegion?: boolean; // a local regulation cited without its region
}

const num = (s: string) => String(parseInt(s, 10));

/** "[2019] UKSC 12" → "2019-uksc-12"; the same for every reporter and neutral citation. */
export const caseRef = (text: string) => normRef(text.replace(/[[\]()]/g, " ").replace(/\./g, ""));

/** "2016/679" or "1215/2012" → "2016-679" / "2012-1215": the year first, as EUR-Lex names acts since 2015. */
export function euNumber(a: string, b: string): string {
  const isYear = (s: string) => s.length === 4 && +s >= 1950 && +s <= 2100;
  const [year, n] = isYear(a) && !isYear(b) ? [a, b] : isYear(b) && !isYear(a) ? [b, a] : [a, b];
  return `${year}-${num(n)}`;
}

/** Sub-divisions written as "(1)(a)", "ayat (2) huruf b", "(c)(1)". */
function subsOf(s: string): string[] {
  const out: string[] = [];
  const ayat = /ayat\s*\((\d+)\)/i.exec(s);
  if (ayat) out.push(ayat[1]);
  const huruf = /huruf\s+([a-z])\b/i.exec(s);
  if (huruf) out.push(huruf[1].toLowerCase());
  if (out.length) return out;
  return [...s.matchAll(/\(([0-9]{1,3}|[a-z]{1,4}|[ivx]{1,5})\)/gi)].map((m) => m[1].toLowerCase());
}

function pin(unit: PinUnit, main: string, rest: string): string {
  return pinpoint(unit, main.replace(/^0+(?=\d)/, ""), subsOf(rest));
}

/** "Article 6(1)(a) of" / "Pasal 4 ayat (2)" / "section 7(1)" / "§ 1983" just before a citation. */
export function pinBefore(context: string, text: string): string | undefined {
  const at = context.indexOf(text);
  const before = (at >= 0 ? context.slice(Math.max(0, at - 60), at) : "").trimEnd();
  let m = /(?:Article|Art\.)\s*(\d+[a-z]?)((?:\s*\(\w+\))*)\s*(?:of\s+)?(?:the\s+)?$/i.exec(before);
  if (m) return pin("art", m[1], m[2]);
  m = /Pasal\s+(\d+[A-Z]?)((?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?)\s*$/i.exec(before);
  if (m) return pin("art", m[1].toLowerCase(), m[2]);
  m = /(?:section|s\.)\s*(\d+[A-Z]?)((?:\(\w+\))*)\s*(?:of\s+)?(?:the\s+)?$/i.exec(before);
  if (m) return pin("sec", m[1].toLowerCase(), m[2]);
  return undefined;
}

const ID_CODES: [RegExp, string, InstrumentKind][] = [
  [/\bUUD\s+(?:NRI\s+)?1945\b/i, "uud 1945", "constitution"],
  [/\bKUH\s?Perdata\b|\bBW\b/i, "kuhperdata", "code"],
  [/\bKUHAP\b/, "kuhap", "code"],
  [/\bKUHD\b/, "kuhd", "code"],
  [/\bKUHP\b/, "kuhp", "code"],
  [/\bHIR\b/, "hir", "code"],
  [/\bRBg\b/, "rbg", "code"],
];

function parseID(c: Citation): ParsedRef | null {
  const t = c.text;
  const pasal = /Pasal\s+(\d+[A-Z]?)((?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z])?)/i.exec(t);
  const p = pasal ? pin("art", pasal[1].toLowerCase(), pasal[2]) : pinBefore(c.context, t);
  let m = /\b(Undang-Undang|UU|Perppu)\s+(?:Nomor|No\.?)\s*(\d+)\s+(?:Tahun|Th\.?)\s+(\d{4})/i.exec(t)
    || /\b(UU)\s+(?:No\.?\s*)?(\d+)\/(\d{4})\b/i.exec(t);
  if (m) return { jurisdiction: "ID", kind: "statute", ref: `${/perppu/i.test(m[1]) ? "perppu" : "uu"}-${num(m[2])}-${m[3]}`, pin: p };
  m = /\b(PP|Peraturan\s+Pemerintah|Perpres|Peraturan\s+Presiden|PERMA|Peraturan\s+Mahkamah\s+Agung|SEMA)\s+(?:Nomor|No\.?)?\s*(\d+)(?:\s+(?:Tahun|Th\.?)\s+|\/)(\d{4})/i.exec(t);
  if (m) {
    const type = /^(PP|Peraturan\s+Pemerintah)$/i.test(m[1]) ? "pp" : /^(Perpres|Peraturan\s+Presiden)$/i.test(m[1]) ? "perpres" : /SEMA/i.test(m[1]) ? "sema" : "perma";
    return { jurisdiction: "ID", kind: type === "sema" ? "guidance" : "regulation", ref: `${type}-${num(m[2])}-${m[3]}`, pin: p };
  }
  m = /\bPOJK\s+(?:Nomor|No\.?)?\s*(\d+)\/POJK\.(\d+)\/(\d{4})/i.exec(t);
  if (m) return { jurisdiction: "ID", kind: "regulation", ref: `pojk-${num(m[1])}-pojk.${m[2]}-${m[3]}`, pin: p };
  m = /\b(?:Perda|Peraturan\s+Daerah)\s+(?:[\w ]+?\s+)?(?:Nomor|No\.?)\s*(\d+)\s+(?:Tahun|Th\.?)\s+(\d{4})/i.exec(t) || /\bPerda\s+(?:No\.?\s*)?(\d+)\/(\d{4})/i.exec(t);
  if (m) return { jurisdiction: "ID", kind: "ordinance", ref: `perda-${num(m[1])}-${m[2]}`, pin: p, needsRegion: true };
  m = /\b(?:Putusan\s+(?:Mahkamah\s+Konstitusi|MK)\s+(?:Nomor|No\.?)\s*)?(\d+)\/PUU-([IVXLC]+)\/(\d{4})/i.exec(t);
  if (m) return { jurisdiction: "ID", kind: "case", ref: `mk-${num(m[1])}-puu-${m[2].toLowerCase()}-${m[3]}` };
  m = /\b(\d{1,5})\s?(K|PK)\/(Pdt(?:\.Sus-?\w*)?|Pid(?:\.Sus)?|TUN|Ag|Mil)\/(\d{4})/i.exec(t);
  if (m) return { jurisdiction: "ID", kind: "case", ref: `ma-${num(m[1])}-${m[2].toLowerCase()}-${normRef(m[3])}-${m[4]}` };
  for (const [re, alias, kind] of ID_CODES) if (re.test(t)) return { jurisdiction: "ID", kind, alias, pin: p };
  m = /\bUU\s+([A-Z][A-Za-z]{1,12})\b/.exec(t);
  if (m) return { jurisdiction: "ID", kind: "statute", alias: normAlias(`uu ${m[1]}`), pin: p };
  return null;
}

function parseUS(c: Citation): ParsedRef | null {
  const t = c.text;
  let m = /\b(\d{1,2})\s+U\.\s?S\.\s?C\.(?:\s?A\.)?\s+§§?\s*([\d][\w\-.]*)((?:\([\w]+\))*)/.exec(t);
  if (m) return { jurisdiction: "US", kind: "code", ref: `usc-${num(m[1])}`, pin: pin("sec", m[2].toLowerCase(), m[3]) };
  m = /\b(\d{1,2})\s+C\.\s?F\.\s?R\.\s+§§?\s*(\d+(?:\.\d+)?)((?:\([\w]+\))*)/.exec(t);
  if (m) return { jurisdiction: "US", kind: "regulation", ref: `cfr-${num(m[1])}`, pin: pin("sec", m[2], m[3]) };
  m = /\b(\d{1,2})\s+C\.\s?F\.\s?R\.\s+[Pp]art\s*(\d+)/.exec(t);
  if (m) return { jurisdiction: "US", kind: "regulation", ref: `cfr-${num(m[1])}` };
  m = /\bFed\.\s?R\.\s?(Civ|Crim|App|Evid|Bankr)\.\s?(?:P\.\s*)?(\d+)((?:\([\w]+\))*)/.exec(t) || /\bFed\.\s?R\.\s?(Evid)\.\s*(\d+)((?:\([\w]+\))*)/.exec(t);
  if (m) {
    const code: Record<string, string> = { Civ: "frcp", Crim: "frcrp", App: "frap", Evid: "fre", Bankr: "frbp" };
    return { jurisdiction: "US", kind: "regulation", ref: code[m[1]], pin: pin("rule", m[2], m[3]) };
  }
  if (c.kind === "case") return { jurisdiction: "US", kind: "case", ref: caseRef(t) };
  return null;
}

function parseGB(c: Citation): ParsedRef | null {
  const t = c.text;
  if (c.kind === "case") return { jurisdiction: "GB", kind: "case", ref: caseRef(t) };
  const act = /([A-Z][A-Za-z()' ]{2,70}?\sAct\s(?:1[6-9]|20)\d{2})/.exec(t);
  if (!act) return null;
  const title = act[1].replace(/^(?:(?:section|s\.?|ss\.?)\s*\d+[A-Z]?(?:\(\w+\))*\s+(?:of\s+)?(?:the\s+)?)/i, "").replace(/^the\s+/i, "");
  const s1 = /(?:section|s\.?|ss\.?)\s*(\d+[A-Z]?)((?:\(\w+\))*)\s+(?:of\s+)?(?:the\s+)?[A-Z]/i.exec(t);
  const s2 = /Act\s\d{4},\s*(?:s|ss|section)\.?\s*(\d+[A-Z]?)((?:\(\w+\))*)/i.exec(t);
  const s = s1 || s2;
  return { jurisdiction: "GB", kind: "statute", alias: normAlias(title), pin: s ? pin("sec", s[1].toLowerCase(), s[2]) : pinBefore(c.context, t) };
}

const EU_ALIASES: Record<string, string> = { "gdpr": "gdpr", "dsa": "dsa", "dma": "dma", "ai act": "ai act", "nis2": "nis2", "dora": "dora", "tfeu": "tfeu", "teu": "teu", "charter": "charter of fundamental rights", "echr": "echr" };

function parseEU(c: Citation): ParsedRef | null {
  const t = c.text;
  if (c.kind === "case") return { jurisdiction: "EU", kind: "case", ref: caseRef(t) };
  let m = /\b(Regulation|Directive|Decision)\s+\((?:EU|EC|EEC|Euratom)\)\s+(?:No\s+)?(\d{2,4})\/(\d{1,4})/.exec(t) || /\b(Regulation|Directive)\s+(\d{2,4})\/(\d{1,4})\/(?:EU|EC|EEC)\b/.exec(t);
  if (m) {
    const type = { Regulation: "reg", Directive: "dir", Decision: "dec" }[m[1] as "Regulation" | "Directive" | "Decision"];
    return { jurisdiction: "EU", kind: type === "dir" ? "statute" : "regulation", ref: `${type}-${euNumber(m[2], m[3])}`, pin: pinBefore(c.context, t) };
  }
  m = /\bArt(?:icle|\.)\s*(\d+)((?:\(\d+\))*(?:\([a-z]\))?)\s+(?:of\s+the\s+)?(GDPR|DSA|DMA|AI\s+Act|NIS2|DORA|TFEU|TEU|Charter|ECHR)\b/.exec(t);
  if (m) {
    const alias = EU_ALIASES[normAlias(m[3])] ?? normAlias(m[3]);
    return { jurisdiction: alias === "echr" ? "COE" : "EU", kind: ["tfeu", "teu", "echr"].includes(alias) ? "treaty" : "regulation", alias, pin: pin("art", m[1], m[2]) };
  }
  return null;
}

/** The canonical reference of a citation, or null when it cannot be read reliably. */
export function parseCitation(c: Citation): ParsedRef | null {
  switch (c.jurisdiction) {
    case "ID": return parseID(c);
    case "US": return parseUS(c);
    case "GB": return parseGB(c);
    case "EU": return parseEU(c);
    case "INT": return { jurisdiction: "INT", kind: "treaty", alias: normAlias(c.text), pin: pinBefore(c.context, c.text) };
    default: return c.kind === "case" ? { jurisdiction: c.jurisdiction, kind: "case", ref: caseRef(c.text) } : null;
  }
}
