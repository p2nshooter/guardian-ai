/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — PRIMARY-LAW CORPUS (BLUEPRINT-V4 §32, phase L1).
 *
 * The law itself, from a district regulation to an international treaty, kept in
 * R2 (never D1) so that every citation in an answer can be checked against the
 * official text. Two collections:
 *
 *   legal_instruments  one document per instrument (a treaty, constitution, code,
 *                      statute, regulation, ordinance, court decision …): where it
 *                      applies, its official source, its status, its versions
 *   legal_provisions   one document per provision (article, section, rule) of one
 *                      version of an instrument, with its text
 *
 * Ids are deterministic, so re-importing a source never duplicates anything.
 * Jurisdictions use ISO 3166: "ID", "US", "GB"; subdivisions ISO 3166-2: "ID-JB",
 * "US-CA"; districts add their official code after a dot: "ID-JB.3273" (Kota
 * Bandung, BPS code); regional and world bodies use "EU", "ASEAN", "AU", "OAS",
 * "COE" and "INT".
 * ============================================================================ */
import type { Store, Collection } from "../r2/store";

export type LegalLevel = "international" | "regional" | "national" | "subnational" | "local";
export type InstrumentKind = "treaty" | "constitution" | "code" | "statute" | "regulation" | "decree" | "ordinance" | "case" | "guidance";
export type InstrumentStatus = "in_force" | "amended" | "repealed" | "not_in_force";

export const LEVELS: LegalLevel[] = ["local", "subnational", "national", "regional", "international"];
export const KINDS: InstrumentKind[] = ["treaty", "constitution", "code", "statute", "regulation", "decree", "ordinance", "case", "guidance"];

export interface InstrumentVersion {
  id: string;              // the date the text applies from, YYYY-MM-DD
  retrieved_at: string;    // when it was taken from the official source
  sha256: string;          // of the provisions as imported
  provisions: number;
}

export interface LegalInstrumentDoc {
  id: string;
  key: string;             // canonical key "JUR|kind|ref"
  jurisdiction: string;
  level: LegalLevel;
  kind: InstrumentKind;
  ref: string;             // canonical reference within the jurisdiction ("uu-27-2022", "usc-42", "reg-2016-679")
  title: string;
  aliases: string[];       // short names, lower case ("kuhperdata", "gdpr", "data protection act 2018")
  language: string;
  source_url: string;      // official publisher of the text
  source_name: string;
  status: InstrumentStatus;
  complete: boolean;       // every provision of the current version is in the corpus
  current_version: string;
  versions: InstrumentVersion[];
  created_at: string;
  updated_at: string;
}

export interface LegalProvisionDoc {
  id: string;
  instrument_id: string;
  version: string;
  pinpoint: string;        // normalised: "art:1320", "art:6(1)(a)", "sec:1983", "sec:230(c)(1)"
  heading: string;
  text: string;
  order: number;
  created_at: string;
}

// ── canonical keys ───────────────────────────────────────────────────────────

const JUR_RE = /^(?:[A-Z]{2}(?:-[A-Z0-9]{1,3}(?:\.[A-Z0-9-]{1,12})?)?|EU|ASEAN|AU|OAS|COE|INT)$/;

export function normJurisdiction(j: string): string {
  const v = String(j || "").trim().toUpperCase();
  if (!JUR_RE.test(v)) throw new Error(`unknown jurisdiction code "${j}"`);
  return v;
}

/** The level a jurisdiction code sits at (a subdivision can be overridden, e.g. a state constitution). */
export function levelOf(jurisdiction: string): LegalLevel {
  const j = normJurisdiction(jurisdiction);
  if (j === "INT") return "international";
  if (["EU", "ASEAN", "AU", "OAS", "COE"].includes(j)) return "regional";
  if (j.includes(".")) return "local";
  if (j.includes("-")) return "subnational";
  return "national";
}

export function normRef(ref: string): string {
  const v = String(ref || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.\-()]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!v) throw new Error("empty reference");
  return v;
}

export function instrumentKey(jurisdiction: string, kind: InstrumentKind, ref: string): string {
  if (!KINDS.includes(kind)) throw new Error(`unknown instrument kind "${kind}"`);
  return `${normJurisdiction(jurisdiction)}|${kind}|${normRef(ref)}`;
}

/** R2 document ids may not contain "/" or "~"; the canonical key is percent-encoded. */
export const instrumentId = (key: string) => encodeURIComponent(key).replace(/~/g, "%7E");
export const provisionId = (instrument: string, version: string, pinpoint: string) =>
  encodeURIComponent(`${decodeURIComponent(instrument)}|${version}|${pinpoint}`).replace(/~/g, "%7E");

export const normAlias = (a: string) => String(a || "").trim().toLowerCase().replace(/\s+/g, " ");

// ── pinpoints ────────────────────────────────────────────────────────────────

export type PinUnit = "art" | "sec" | "rule" | "para" | "reg";

/** "art", "1320", ["2","a"] → "art:1320(2)(a)". */
export function pinpoint(unit: PinUnit, main: string | number, subs: (string | number)[] = []): string {
  const m = String(main).trim().toLowerCase().replace(/\s+/g, "");
  if (!m) throw new Error("empty pinpoint");
  return `${unit}:${m}${subs.map((s) => `(${String(s).trim().toLowerCase()})`).join("")}`;
}

/** Parse a normalised pinpoint back into its parts. */
export function parsePinpoint(p: string): { unit: PinUnit; main: string; subs: string[] } | null {
  const m = /^(art|sec|rule|para|reg):([0-9a-z.\-]+)((?:\([0-9a-z]+\))*)$/.exec(String(p || ""));
  if (!m) return null;
  return { unit: m[1] as PinUnit, main: m[2], subs: [...m[3].matchAll(/\(([0-9a-z]+)\)/g)].map((x) => x[1]) };
}

/** The pinpoint and its parents, most specific first: art:6(1)(a) → art:6(1)(a), art:6(1), art:6. */
export function pinpointChain(p: string): string[] {
  const parts = parsePinpoint(p);
  if (!parts) return [];
  const out: string[] = [];
  for (let n = parts.subs.length; n >= 0; n--) out.push(pinpoint(parts.unit, parts.main, parts.subs.slice(0, n)));
  return out;
}

// ── collections ──────────────────────────────────────────────────────────────

const padOrder = (n: number) => String(Math.max(0, Math.floor(n))).padStart(8, "0");

export function legalCollections(store: Store) {
  return {
    instruments: store.collection<LegalInstrumentDoc>({
      name: "legal_instruments",
      unique: [{ name: "key", value: (d) => d.key }],
      indexes: [
        { name: "all", key: () => "all", sort: (d) => d.key,
          meta: (d) => ({ jurisdiction: d.jurisdiction, level: d.level, kind: d.kind, title: d.title.slice(0, 160), status: d.status, complete: d.complete,
            provisions: d.versions.find((v) => v.id === d.current_version)?.provisions ?? 0, updated_at: d.updated_at }) },
        { name: "jurisdiction", key: (d) => d.jurisdiction, sort: (d) => `${d.kind}|${d.ref}`,
          meta: (d) => ({ kind: d.kind, ref: d.ref, title: d.title.slice(0, 160), status: d.status }) },
        { name: "alias", key: (d) => d.aliases.map((a) => `${d.jurisdiction}|${normAlias(a)}`), sort: (d) => d.key },
      ],
    }),
    provisions: store.collection<LegalProvisionDoc>({
      name: "legal_provisions",
      indexes: [
        { name: "version", key: (d) => `${d.instrument_id}|${d.version}`, sort: (d) => padOrder(d.order),
          meta: (d) => ({ pinpoint: d.pinpoint, heading: d.heading.slice(0, 120) }) },
      ],
    }),
  };
}

export type LegalCollections = ReturnType<typeof legalCollections>;

// ── the corpus ───────────────────────────────────────────────────────────────

export interface InstrumentInput {
  jurisdiction: string;
  level?: LegalLevel;
  kind: InstrumentKind;
  ref: string;
  title: string;
  aliases?: string[];
  language: string;
  source_url: string;
  source_name: string;
  status?: InstrumentStatus;
}

export interface ProvisionInput { pinpoint: string; heading?: string; text: string }

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class LegalCorpus {
  readonly c: LegalCollections;
  readonly now: () => string;

  constructor(store: Store, now: () => string = () => new Date(store.now()).toISOString()) {
    this.c = legalCollections(store);
    this.now = now;
  }

  get instruments(): Collection<LegalInstrumentDoc> { return this.c.instruments; }
  get provisions(): Collection<LegalProvisionDoc> { return this.c.provisions; }

  /** Create or refresh an instrument's description (not its text). */
  async upsertInstrument(input: InstrumentInput): Promise<LegalInstrumentDoc> {
    const key = instrumentKey(input.jurisdiction, input.kind, input.ref);
    const id = instrumentId(key);
    const jurisdiction = normJurisdiction(input.jurisdiction);
    if (!/^https:\/\//.test(input.source_url)) throw new Error("source_url must be the official https address of the text");
    const now = this.now();
    const out = await this.instruments.upsert(id, (cur) => ({
      id, key, jurisdiction,
      level: input.level ?? cur?.level ?? levelOf(jurisdiction),
      kind: input.kind, ref: normRef(input.ref),
      title: input.title.trim(),
      aliases: [...new Set((input.aliases ?? cur?.aliases ?? []).map(normAlias).filter(Boolean))],
      language: input.language,
      source_url: input.source_url, source_name: input.source_name,
      status: input.status ?? cur?.status ?? "in_force",
      complete: cur?.complete ?? false,
      current_version: cur?.current_version ?? "",
      versions: cur?.versions ?? [],
      created_at: cur?.created_at ?? now,
      updated_at: now,
    }));
    return out!;
  }

  /** Store the text of one version. `complete` = these are all of its provisions. */
  async putVersion(instrument: string, version: string, provisions: ProvisionInput[], opts: { complete: boolean; current?: boolean }): Promise<LegalInstrumentDoc> {
    if (!DATE_RE.test(version)) throw new Error("version must be the date the text applies from (YYYY-MM-DD)");
    const doc = await this.instruments.get(instrument);
    if (!doc) throw new Error("unknown instrument");
    const seen = new Set<string>();
    const rows = provisions.map((p, i) => {
      if (!parsePinpoint(p.pinpoint)) throw new Error(`invalid pinpoint "${p.pinpoint}"`);
      if (seen.has(p.pinpoint)) throw new Error(`duplicate pinpoint "${p.pinpoint}"`);
      seen.add(p.pinpoint);
      if (!String(p.text || "").trim()) throw new Error(`empty text at "${p.pinpoint}"`);
      return { ...p, order: i };
    });
    const now = this.now();
    for (const p of rows) {
      const id = provisionId(instrument, version, p.pinpoint);
      await this.provisions.upsert(id, (cur) => ({
        id, instrument_id: instrument, version, pinpoint: p.pinpoint, heading: (p.heading ?? "").trim(), text: p.text.trim(), order: p.order,
        created_at: cur?.created_at ?? now,
      }));
    }
    const hash = await sha256(rows.map((p) => `${p.pinpoint}\n${p.text.trim()}`).join("\n\n"));
    return (await this.instruments.update(instrument, (cur) => {
      const versions = [...cur.versions.filter((v) => v.id !== version), { id: version, retrieved_at: now, sha256: hash, provisions: rows.length }]
        .sort((a, b) => a.id.localeCompare(b.id));
      const isCurrent = opts.current ?? (!cur.current_version || version >= cur.current_version);
      return { ...cur, versions, current_version: isCurrent ? version : cur.current_version, complete: isCurrent ? opts.complete : cur.complete, updated_at: now };
    }));
  }

  async byKey(jurisdiction: string, kind: InstrumentKind, ref: string): Promise<LegalInstrumentDoc | null> {
    try {
      return await this.instruments.find("key", instrumentKey(jurisdiction, kind, ref));
    } catch {
      return null;
    }
  }

  /** Instruments known by this short name in a jurisdiction ("kuhperdata", "gdpr"). */
  async byAlias(jurisdiction: string, alias: string): Promise<LegalInstrumentDoc[]> {
    const { docs } = await this.instruments.listDocs("alias", `${normJurisdiction(jurisdiction)}|${normAlias(alias)}`, { limit: 10 });
    return docs;
  }

  /** The provision at this pinpoint, or at its nearest parent ("art:6(1)(a)" → "art:6"). */
  async provision(instrument: LegalInstrumentDoc, pin: string, version = instrument.current_version): Promise<{ doc: LegalProvisionDoc; exact: boolean } | null> {
    if (!version) return null;
    const chain = pinpointChain(pin);
    for (let i = 0; i < chain.length; i++) {
      const doc = await this.provisions.get(provisionId(instrument.id, version, chain[i]));
      if (doc) return { doc, exact: i === 0 };
    }
    return null;
  }

  async provisionsOf(instrument: LegalInstrumentDoc, version = instrument.current_version, limit = 500): Promise<LegalProvisionDoc[]> {
    const { docs } = await this.provisions.listDocs("version", `${instrument.id}|${version}`, { limit });
    return docs;
  }

  /** Does the corpus hold anything for this jurisdiction? */
  async covers(jurisdiction: string): Promise<boolean> {
    return (await this.instruments.list("jurisdiction", normJurisdiction(jurisdiction), { limit: 1 })).entries.length > 0;
  }

  /** What the corpus holds, by jurisdiction and level — shown as it is, never rounded up. */
  async coverage(): Promise<{ jurisdiction: string; level: LegalLevel; instruments: number; complete: number; provisions: number; updated_at: string }[]> {
    const rows = new Map<string, { jurisdiction: string; level: LegalLevel; instruments: number; complete: number; provisions: number; updated_at: string }>();
    for (const e of await this.instruments.listAll("all", "all")) {
      const m = e.meta as { jurisdiction: string; level: LegalLevel; complete: boolean; provisions: number; updated_at: string };
      const r = rows.get(m.jurisdiction) ?? { jurisdiction: m.jurisdiction, level: m.level, instruments: 0, complete: 0, provisions: 0, updated_at: "" };
      r.instruments++;
      if (m.complete) r.complete++;
      r.provisions += m.provisions || 0;
      if (m.updated_at > r.updated_at) r.updated_at = m.updated_at;
      rows.set(m.jurisdiction, r);
    }
    return [...rows.values()].sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || a.jurisdiction.localeCompare(b.jurisdiction));
  }
}
