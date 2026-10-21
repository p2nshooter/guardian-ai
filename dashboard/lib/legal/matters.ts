/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — MATTERS (cases) stored per member in R2, encrypted (lib/user-crypto).
 *
 *   legal/<uid>/index.enc                 list of matters (for the sidebar)
 *   legal/<uid>/m/<mid>/matter.enc        matter details + document/run lists
 *   legal/<uid>/m/<mid>/d/<did>.enc       extracted document text
 *   legal/<uid>/m/<mid>/r/<rid>.enc       one saved result (request + answer)
 *   legal/<uid>/library.enc               the member's own playbooks and clauses (v4)
 *
 * The member's record keeps nothing but their storage total (users.storage_bytes).
 * ============================================================================ */
import type { Data } from "../data";
import { newId, now } from "../db";
import { getSealedJson, putSealedJson, sealForUser } from "../user-crypto";
import { addStorage } from "../usage";
import { normaliseJurisdiction, type JurisdictionPick } from "./jurisdictions";
import { getArea } from "./areas";
import { getWorkspace } from "./workspaces";
import { sanitizeDeadlines, type Deadline } from "./deadlines";
import { sanitizeCiteChecks, sanitizeLibrary, EMPTY_LIBRARY, LIBRARY_LIMITS, type CiteChecks, type LegalLibrary } from "./library";

export interface DocMeta { id: string; name: string; pages?: number; chars: number; size: number; addedAt: string }
export interface RunMeta { id: string; workspace: string; title: string; provider: string; model: string; research: boolean; size: number; createdAt: string }
export interface Matter {
  id: string; title: string; client: string; opponent: string; reference: string;
  jurisdiction: JurisdictionPick; area: string; status: "open" | "closed"; notes: string;
  createdAt: string; updatedAt: string; docs: DocMeta[]; runs: RunMeta[];
  /** v4: deadlines computed in the deadline calculator, and the citation verification list. */
  deadlines?: Deadline[]; citeChecks?: CiteChecks;
}
export interface IndexEntry { id: string; title: string; client: string; country: string; status: string; updatedAt: string; docs: number; runs: number }

export const LIMITS = { matters: 500, docsPerMatter: 100, runsPerMatter: 500, docChars: 1_500_000, runChars: 1_000_000 };

const root = (uid: string) => `legal/${uid}`;
const kIndex = (uid: string) => `${root(uid)}/index.enc`;
const kMatter = (uid: string, mid: string) => `${root(uid)}/m/${mid}/matter.enc`;
const kDoc = (uid: string, mid: string, did: string) => `${root(uid)}/m/${mid}/d/${did}.enc`;
const kRun = (uid: string, mid: string, rid: string) => `${root(uid)}/m/${mid}/r/${rid}.enc`;
const kLibrary = (uid: string) => `${root(uid)}/library.enc`;
const validId = (x: string) => /^[a-zA-Z0-9_-]{6,40}$/.test(x);

const text = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export class MatterError extends Error { constructor(message: string, public status = 400) { super(message); } }

async function readIndex(bucket: any, uid: string): Promise<{ list: IndexEntry[]; etag?: string; size: number }> {
  const r = await getSealedJson<IndexEntry[]>(bucket, uid, kIndex(uid));
  return r ? { list: r.value, etag: r.etag, size: r.size } : { list: [], size: 0 };
}

/** Read-modify-write of the index with an etag guard (two tabs saving at once). */
async function updateIndex(bucket: any, db: Data, uid: string, fn: (list: IndexEntry[]) => IndexEntry[]): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { list, etag, size } = await readIndex(bucket, uid);
    const next = fn(list.slice());
    const key = kIndex(uid);
    const body = await sealForUser(uid, key, JSON.stringify(next));
    const res = await bucket.put(key, body, {
      httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { enc: "user-v1" },
      ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
    });
    if (res) { await addStorage(db, uid, body.length - size); return; }
  }
  throw new MatterError("The matter list changed at the same time. Please try again.", 409);
}

const entry = (m: Matter): IndexEntry => ({ id: m.id, title: m.title, client: m.client, country: m.jurisdiction.country, status: m.status, updatedAt: m.updatedAt, docs: m.docs.length, runs: m.runs.length });

export async function listMatters(bucket: any, uid: string): Promise<IndexEntry[]> {
  return (await readIndex(bucket, uid)).list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMatter(bucket: any, uid: string, mid: string): Promise<{ matter: Matter; size: number }> {
  if (!validId(mid)) throw new MatterError("Matter not found.", 404);
  const r = await getSealedJson<Matter>(bucket, uid, kMatter(uid, mid));
  if (!r) throw new MatterError("Matter not found.", 404);
  return { matter: r.value, size: r.size };
}

async function saveMatter(bucket: any, db: Data, uid: string, m: Matter, prevSize: number): Promise<void> {
  m.updatedAt = now();
  const size = await putSealedJson(bucket, uid, kMatter(uid, m.id), m);
  await addStorage(db, uid, size - prevSize);
  await updateIndex(bucket, db, uid, (list) => [entry(m), ...list.filter((x) => x.id !== m.id)]);
}

function applyFields(m: Matter, b: any) {
  if (b?.title !== undefined) m.title = text(b.title, 160) || "Untitled matter";
  if (b?.client !== undefined) m.client = text(b.client, 160);
  if (b?.opponent !== undefined) m.opponent = text(b.opponent, 160);
  if (b?.reference !== undefined) m.reference = text(b.reference, 80);
  if (b?.notes !== undefined) m.notes = text(b.notes, 20000);
  if (b?.area !== undefined && getArea(b.area)) m.area = b.area;
  if (b?.status === "open" || b?.status === "closed") m.status = b.status;
  if (b?.deadlines !== undefined) m.deadlines = sanitizeDeadlines(b.deadlines);
  if (b?.citeChecks !== undefined) m.citeChecks = sanitizeCiteChecks(b.citeChecks);
  if (b?.jurisdiction !== undefined) {
    const j = normaliseJurisdiction(b.jurisdiction);
    if ("error" in j) throw new MatterError(j.error);
    m.jurisdiction = j;
  }
}

export async function createMatter(bucket: any, db: Data, uid: string, b: any): Promise<Matter> {
  const { list } = await readIndex(bucket, uid);
  if (list.length >= LIMITS.matters) throw new MatterError(`You can keep up to ${LIMITS.matters} matters. Delete closed matters to add new ones.`);
  const m: Matter = {
    id: newId("m").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32), title: "Untitled matter", client: "", opponent: "", reference: "",
    jurisdiction: { country: "ID" }, area: "general", status: "open", notes: "", createdAt: now(), updatedAt: now(), docs: [], runs: [],
  };
  applyFields(m, b);
  await saveMatter(bucket, db, uid, m, 0);
  return m;
}

export async function updateMatter(bucket: any, db: Data, uid: string, mid: string, b: any): Promise<Matter> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  applyFields(matter, b);
  await saveMatter(bucket, db, uid, matter, size);
  return matter;
}

export async function deleteMatter(bucket: any, db: Data, uid: string, mid: string): Promise<void> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  const keys = [kMatter(uid, mid), ...matter.docs.map((d) => kDoc(uid, mid, d.id)), ...matter.runs.map((r) => kRun(uid, mid, r.id))];
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
  const freed = size + matter.docs.reduce((n, d) => n + d.size, 0) + matter.runs.reduce((n, r) => n + r.size, 0);
  await addStorage(db, uid, -freed);
  await updateIndex(bucket, db, uid, (list) => list.filter((x) => x.id !== mid));
}

export async function addDocument(bucket: any, db: Data, uid: string, mid: string, b: any): Promise<DocMeta> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  if (matter.docs.length >= LIMITS.docsPerMatter) throw new MatterError(`A matter can hold up to ${LIMITS.docsPerMatter} documents.`);
  const body = String(b?.text ?? "").replace(/\u0000/g, "");
  if (!body.trim()) throw new MatterError("The document has no text.");
  if (body.length > LIMITS.docChars) throw new MatterError("This document is too large to store (1.5 million characters max).");
  const did = newId("d").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const pages = Number(b?.pages) > 0 ? Math.min(100000, Math.floor(Number(b.pages))) : undefined;
  const bytes = await putSealedJson(bucket, uid, kDoc(uid, mid, did), { name: text(b?.name, 160), pages, text: body });
  await addStorage(db, uid, bytes);
  const meta: DocMeta = { id: did, name: text(b?.name, 160) || "document", pages, chars: body.length, size: bytes, addedAt: now() };
  matter.docs.push(meta);
  await saveMatter(bucket, db, uid, matter, size);
  return meta;
}

export async function getDocument(bucket: any, uid: string, mid: string, did: string): Promise<{ name: string; pages?: number; text: string }> {
  if (!validId(mid) || !validId(did)) throw new MatterError("Document not found.", 404);
  const r = await getSealedJson<{ name: string; pages?: number; text: string }>(bucket, uid, kDoc(uid, mid, did));
  if (!r) throw new MatterError("Document not found.", 404);
  return r.value;
}

export async function deleteDocument(bucket: any, db: Data, uid: string, mid: string, did: string): Promise<void> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  const d = matter.docs.find((x) => x.id === did);
  if (!d) throw new MatterError("Document not found.", 404);
  await bucket.delete(kDoc(uid, mid, did));
  await addStorage(db, uid, -d.size);
  matter.docs = matter.docs.filter((x) => x.id !== did);
  await saveMatter(bucket, db, uid, matter, size);
}

export async function addRun(bucket: any, db: Data, uid: string, mid: string, b: any): Promise<RunMeta> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  if (matter.runs.length >= LIMITS.runsPerMatter) throw new MatterError(`A matter can hold up to ${LIMITS.runsPerMatter} saved results.`);
  const ws = getWorkspace(b?.workspace);
  if (!ws) throw new MatterError("Unknown workspace.");
  const messages = Array.isArray(b?.messages) ? b.messages
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, LIMITS.runChars) })).slice(-60) : [];
  if (!messages.length) throw new MatterError("Nothing to save.");
  const rid = newId("r").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const payload = { workspace: ws.id, options: typeof b?.options === "object" ? b.options : {}, messages, savedAt: now() };
  const bytes = await putSealedJson(bucket, uid, kRun(uid, mid, rid), payload);
  await addStorage(db, uid, bytes);
  const meta: RunMeta = {
    id: rid, workspace: ws.id, title: text(b?.title, 200) || ws.name, provider: text(b?.provider, 40), model: text(b?.model, 120),
    research: !!b?.research, size: bytes, createdAt: now(),
  };
  matter.runs.unshift(meta);
  await saveMatter(bucket, db, uid, matter, size);
  return meta;
}

export async function getRun(bucket: any, uid: string, mid: string, rid: string): Promise<any> {
  if (!validId(mid) || !validId(rid)) throw new MatterError("Result not found.", 404);
  const r = await getSealedJson<any>(bucket, uid, kRun(uid, mid, rid));
  if (!r) throw new MatterError("Result not found.", 404);
  return r.value;
}

export async function deleteRun(bucket: any, db: Data, uid: string, mid: string, rid: string): Promise<void> {
  const { matter, size } = await getMatter(bucket, uid, mid);
  const r = matter.runs.find((x) => x.id === rid);
  if (!r) throw new MatterError("Result not found.", 404);
  await bucket.delete(kRun(uid, mid, rid));
  await addStorage(db, uid, -r.size);
  matter.runs = matter.runs.filter((x) => x.id !== rid);
  await saveMatter(bucket, db, uid, matter, size);
}

// ── v4: the member's own playbooks and clauses ──
export async function getLibrary(bucket: any, uid: string): Promise<LegalLibrary> {
  const r = await getSealedJson<LegalLibrary>(bucket, uid, kLibrary(uid));
  return r ? sanitizeLibrary(r.value) : { ...EMPTY_LIBRARY };
}

export async function saveLibrary(bucket: any, db: Data, uid: string, b: any): Promise<LegalLibrary> {
  const lib = sanitizeLibrary(b);
  if (JSON.stringify(lib).length > LIBRARY_LIMITS.bytes) throw new MatterError("Your playbooks and clauses are too large to save (400 KB max). Remove some first.", 413);
  const prev = await getSealedJson<LegalLibrary>(bucket, uid, kLibrary(uid));
  const size = await putSealedJson(bucket, uid, kLibrary(uid), lib);
  await addStorage(db, uid, size - (prev?.size || 0));
  return lib;
}
