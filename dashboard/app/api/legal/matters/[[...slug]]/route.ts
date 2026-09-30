/* AXTO — Legal AI matters (encrypted per member in R2)
 *   GET    /api/legal/matters                          → list
 *   POST   /api/legal/matters                          {title, client, opponent, reference, jurisdiction, area, notes} → create
 *   GET    /api/legal/matters/:id                      → matter (document + result lists)
 *   PATCH  /api/legal/matters/:id                      {…fields, status, deadlines, citeChecks}
 *   DELETE /api/legal/matters/:id                      → matter, documents and results
 *   POST   /api/legal/matters/:id/documents            {name, text, pages}
 *   GET    /api/legal/matters/:id/documents/:doc       → text
 *   DELETE /api/legal/matters/:id/documents/:doc
 *   POST   /api/legal/matters/:id/runs                 {workspace, title, messages, options, provider, model, research}
 *   GET    /api/legal/matters/:id/runs/:run
 *   DELETE /api/legal/matters/:id/runs/:run */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, getUserFiles } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { getUsage, storageProblem } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import {
  MatterError, listMatters, getMatter, createMatter, updateMatter, deleteMatter,
  addDocument, getDocument, deleteDocument, addRun, getRun, deleteRun,
} from "@/lib/legal/matters";

type Params = { params: Promise<{ slug?: string[] }> };

async function guard(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes("legal"));
  if (!ctx) return { res: unauthorized() } as const;
  const tier = effectiveTier(ctx.session);
  if (!limitsFor(tier).apps.includes("legal")) return { res: fail("Legal AI needs a plan. Choose one to start.", 402, { upgrade: true }) } as const;
  return { ctx, tier } as const;
}

function handle(e: any) {
  if (e instanceof MatterError) return fail(e.message, e.status);
  throw e;
}

export async function GET(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const { ctx } = g;
  const [mid, kind, sub] = (await params).slug || [];
  const bucket = getUserFiles(req);
  try {
    if (!mid) return respond({ matters: await listMatters(bucket, ctx.session.sub) }, ctx);
    if (!kind) return respond({ matter: (await getMatter(bucket, ctx.session.sub, mid)).matter }, ctx);
    if (kind === "documents" && sub) return respond({ document: await getDocument(bucket, ctx.session.sub, mid, sub) }, ctx);
    if (kind === "runs" && sub) return respond({ run: await getRun(bucket, ctx.session.sub, mid, sub) }, ctx);
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}

export async function POST(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const { ctx, tier } = g;
  const rl = await rateLimit(req, "legal-write", ctx.session.sub, { max: 240, windowSeconds: 600 });
  if (rl.limited) return fail("Too many changes at once. Please wait a moment.", 429);
  const [mid, kind] = (await params).slug || [];
  const b = await readJson(req);
  const db = getDB(req);
  const bucket = getUserFiles(req);
  const need = Math.ceil((JSON.stringify(b || {}).length) * 1.1);
  const room = storageProblem(await getUsage(db, ctx.session.sub, tier), need);
  if (room) return fail(room, 413, { upgrade: true });
  try {
    if (!mid) return respond({ ok: true, matter: await createMatter(bucket, db, ctx.session.sub, b) }, ctx);
    if (kind === "documents") return respond({ ok: true, document: await addDocument(bucket, db, ctx.session.sub, mid, b) }, ctx);
    if (kind === "runs") return respond({ ok: true, run: await addRun(bucket, db, ctx.session.sub, mid, b) }, ctx);
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const { ctx, tier } = g;
  const [mid, kind] = (await params).slug || [];
  if (!mid || kind) return fail("Not found.", 404);
  const b = await readJson(req);
  const db = getDB(req);
  // Deadlines and citation checks make a matter grow: they count against the plan's storage.
  if (b?.deadlines !== undefined || b?.citeChecks !== undefined) {
    const room = storageProblem(await getUsage(db, ctx.session.sub, tier), Math.ceil(JSON.stringify(b || {}).length * 1.1));
    if (room) return fail(room, 413, { upgrade: true });
  }
  try {
    return respond({ ok: true, matter: await updateMatter(getUserFiles(req), db, ctx.session.sub, mid, b) }, ctx);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const { ctx } = g;
  const [mid, kind, sub] = (await params).slug || [];
  const db = getDB(req);
  const bucket = getUserFiles(req);
  try {
    if (mid && !kind) { await deleteMatter(bucket, db, ctx.session.sub, mid); return respond({ ok: true }, ctx); }
    if (mid && kind === "documents" && sub) { await deleteDocument(bucket, db, ctx.session.sub, mid, sub); return respond({ ok: true }, ctx); }
    if (mid && kind === "runs" && sub) { await deleteRun(bucket, db, ctx.session.sub, mid, sub); return respond({ ok: true }, ctx); }
    return fail("Not found.", 404);
  } catch (e) { return handle(e); }
}
