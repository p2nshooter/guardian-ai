/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LEGAL AI — CITATION VERIFIER (BLUEPRINT-V4 §32, phase L1).
 *
 * Checks every citation in a text (an AI answer, a draft) against the primary-law
 * corpus. Each result says exactly how far it could be checked:
 *
 *   verified            the provision's official text is in the corpus
 *   verified_parent     the article is there; the paragraph or point could not be
 *                       confirmed inside it
 *   not_found           the instrument is complete in the corpus and has no such
 *                       provision — the citation is very likely wrong or invented
 *   instrument_only     the instrument is there, its text is not complete enough
 *                       to confirm this provision
 *   unknown_instrument  the jurisdiction is covered, this instrument is not (yet)
 *   not_covered         the corpus holds nothing for this jurisdiction yet
 *   needs_region        a local regulation cited without its province or district
 *   unparsed            the citation could not be read reliably
 *
 * Nothing is ever reported as verified without the text that verifies it.
 * ============================================================================ */
import { extractCitations, type Citation } from "./citations";
import { parseCitation, type ParsedRef } from "./cite-parse";
import { parsePinpoint, type LegalCorpus, type LegalInstrumentDoc } from "./corpus";

export type VerifyStatus = "verified" | "verified_parent" | "not_found" | "instrument_only" | "unknown_instrument" | "not_covered" | "needs_region" | "unparsed";

export interface VerifyResult {
  citation: { text: string; jurisdiction: string; kind: string; count: number };
  ref: ParsedRef | null;
  status: VerifyStatus;
  instrument?: { id: string; title: string; source_url: string; source_name: string; version: string; status: string };
  provision?: { pinpoint: string; heading: string; excerpt: string };
  note: string;
}

const EXCERPT = 600;

/** Do the sub-divisions below `found` appear inside its text ("(1)", "a.", "(a)")? */
function subsInside(text: string, wanted: string, found: string): boolean {
  const w = parsePinpoint(wanted), f = parsePinpoint(found);
  if (!w || !f) return false;
  const missing = w.subs.slice(f.subs.length);
  let from = 0;
  for (const s of missing) {
    const re = new RegExp(`(?:^|[\\s(])\\(?${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[).](?=\\s)`, "im");
    const hit = re.exec(text.slice(from));
    if (!hit) return false;
    from += hit.index + hit[0].length;
  }
  return true;
}

async function resolve(corpus: LegalCorpus, ref: ParsedRef): Promise<LegalInstrumentDoc | null> {
  if (ref.ref) {
    const direct = await corpus.byKey(ref.jurisdiction, ref.kind, ref.ref);
    if (direct) return direct;
    // A statute may be filed as a code and the reverse ("UU" vs a codified act).
    if (ref.kind === "statute" || ref.kind === "code") {
      const other = await corpus.byKey(ref.jurisdiction, ref.kind === "statute" ? "code" : "statute", ref.ref);
      if (other) return other;
    }
  }
  if (ref.alias) {
    const hits = await corpus.byAlias(ref.jurisdiction, ref.alias);
    if (hits.length) return hits[0];
  }
  return null;
}

export async function verifyCitation(corpus: LegalCorpus, c: Citation): Promise<VerifyResult> {
  const citation = { text: c.text, jurisdiction: c.jurisdiction, kind: c.kind, count: c.count };
  const ref = parseCitation(c);
  if (!ref) return { citation, ref, status: "unparsed", note: "This citation could not be read reliably; check it at the source." };
  if (ref.needsRegion) return { citation, ref, status: "needs_region", note: "A local regulation needs its province, regency or city to be checked." };
  if (!(await corpus.covers(ref.jurisdiction))) {
    return { citation, ref, status: "not_covered", note: `The corpus holds no official texts for ${ref.jurisdiction} yet; check this citation at the official source.` };
  }
  const inst = await resolve(corpus, ref);
  if (!inst) return { citation, ref, status: "unknown_instrument", note: "This instrument is not in the corpus yet; check it at the official source." };
  const instrument = { id: inst.id, title: inst.title, source_url: inst.source_url, source_name: inst.source_name, version: inst.current_version, status: inst.status };
  const repealed = inst.status === "repealed" ? " Note: the corpus marks this instrument as repealed." : "";
  if (!ref.pin) {
    return { citation, ref, status: "verified", instrument, note: `The instrument exists: ${inst.title} (${inst.source_name}).${repealed}` };
  }
  const hit = await corpus.provision(inst, ref.pin);
  if (hit) {
    const excerpt = hit.doc.text.slice(0, EXCERPT);
    const provision = { pinpoint: hit.doc.pinpoint, heading: hit.doc.heading, excerpt };
    if (hit.exact || subsInside(hit.doc.text, ref.pin, hit.doc.pinpoint)) {
      return { citation, ref, status: "verified", instrument, provision, note: `Text found in ${inst.title}, version of ${inst.current_version}.${repealed}` };
    }
    return { citation, ref, status: "verified_parent", instrument, provision,
      note: `${hit.doc.pinpoint} exists; ${ref.pin} could not be confirmed inside it.${repealed}` };
  }
  if (inst.complete) {
    return { citation, ref, status: "not_found", instrument,
      note: `${inst.title} (version of ${inst.current_version}) has no ${ref.pin}. The citation is very likely wrong.` };
  }
  return { citation, ref, status: "instrument_only", instrument, note: "The instrument is in the corpus, but its text is not complete enough to confirm this provision." };
}

/** Every citation in a text, checked against the corpus. */
export async function verifyText(corpus: LegalCorpus, text: string, max = 200): Promise<VerifyResult[]> {
  const out: VerifyResult[] = [];
  for (const c of extractCitations(text, max)) out.push(await verifyCitation(corpus, c));
  return out;
}

/** Counts per status — the line shown above an answer. */
export function verifySummary(results: VerifyResult[]): Record<VerifyStatus, number> {
  const s: Record<VerifyStatus, number> = { verified: 0, verified_parent: 0, not_found: 0, instrument_only: 0, unknown_instrument: 0, not_covered: 0, needs_region: 0, unparsed: 0 };
  for (const r of results) s[r.status]++;
  return s;
}
