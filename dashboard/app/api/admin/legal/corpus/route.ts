/* AXTO admin — Legal AI primary-law corpus (BLUEPRINT-V4 §32).
 *   GET  /api/admin/legal/corpus                     → { coverage } per jurisdiction, as it is
 *   POST /api/admin/legal/corpus {instrument, version?, complete?, provisions?}
 *        → stores an instrument and, with a version, its text (audited)
 * Importers (CI jobs that read official sources) call POST with the bearer token
 * in LEGAL_IMPORT_TOKEN; people use their admin session. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { LegalCorpus, KINDS, type InstrumentInput, type ProvisionInput } from "@/lib/legal/corpus";

const MAX_PROVISIONS = 2_000;

function tokenOk(req: NextRequest): boolean {
  const want = (process.env.LEGAL_IMPORT_TOKEN || "").trim();
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (want.length < 32 || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  return respond({ coverage: await new LegalCorpus(getData(req).store).coverage() }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  const viaToken = !ctx && tokenOk(req);
  if (!ctx && !viaToken) return forbidden();
  const b = (await readJson(req)) as { instrument?: InstrumentInput; version?: string; complete?: boolean; provisions?: ProvisionInput[] } | null;
  const i = b?.instrument;
  if (!i || typeof i !== "object") return fail("instrument is required", 400);
  if (!KINDS.includes(i.kind)) return fail(`kind must be one of ${KINDS.join(", ")}`, 400);
  if (b?.provisions && (!Array.isArray(b.provisions) || b.provisions.length > MAX_PROVISIONS)) return fail(`provisions: a list of at most ${MAX_PROVISIONS}`, 400);
  if (b?.provisions?.length && !b.version) return fail("version (YYYY-MM-DD) is required with provisions", 400);
  const db = getData(req);
  const corpus = new LegalCorpus(db.store);
  try {
    let doc = await corpus.upsertInstrument(i);
    if (b?.version && b.provisions?.length) doc = await corpus.putVersion(doc.id, b.version, b.provisions, { complete: b.complete === true });
    await audit(db, ctx ? ctx.session : { email: "legal-importer" }, "legal.corpus.import", "legal_instrument", doc.id,
      { key: doc.key, version: b?.version ?? "", provisions: b?.provisions?.length ?? 0, complete: doc.complete }, req);
    return ctx ? respond({ ok: true, instrument: doc }, ctx) : Response.json({ ok: true, instrument: doc });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "import failed", 400);
  }
}
