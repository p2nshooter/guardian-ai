/* AXTO — generic per-app work history (encrypted per member in R2).
 *   GET    /api/history/:app                 → list (sidebar)
 *   GET    /api/history/:app/:id             → one item (full body, with its revision)
 *   GET    /api/history/:app/:id/versions    → earlier versions, newest first (apps with versions)
 *   POST   /api/history/:app        {id?, title?, body, meta, rev?, force?}  → create/update
 *          rev = the revision this edit started from: if another device saved since, 409 {conflict, current}
 *          force = save anyway (the other device's copy is kept as a version first)
 *   POST   /api/history/:app/:id/rename    {title}                → rename (keeps the revision)
 *   POST   /api/history/:app/:id/duplicate                        → duplicate
 *   POST   /api/history/:app/:id/restore   {rev}                  → make an earlier version current again
 *   DELETE /api/history/:app/:id             → delete (and its versions)
 * Clipper projects are checked with the shared project format (lib/clipper/project.ts) before they are stored,
 * and the usage log records what changes a member's storage (lib/clipper/usage-log.ts).
 * Legal AI uses its own richer /api/legal/matters store. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData, getUserFiles } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { getUsage, storageProblem } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { History, HistoryError, VERSIONED, isHistoryApp } from "@/lib/history";
import { STATE_ID as PROMPTS_STATE_ID } from "@/lib/prompts/library";
import { ProjectError, projectMeta, readProject } from "@/lib/clipper/project";
import { logClipper } from "@/lib/clipper/usage-log";

type Params = { params: Promise<{ app: string; slug?: string[] }> };

/** Clipper's own settings items (not projects) — saved as they are. */
const CLIPPER_SETTINGS = new Set(["brand-kit"]);

async function guard(req: NextRequest, app: string) {
  if (!isHistoryApp(app)) return { res: fail("Unknown app.", 404) } as const;
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes(app));
  if (!ctx) return { res: unauthorized() } as const;
  if (!limitsFor(effectiveTier(ctx.session)).apps.includes(app)) return { res: fail("This app needs a plan.", 402, { upgrade: true }) } as const;
  return { ctx, hist: new History(getUserFiles(req), getData(req), ctx.session.sub, app, { versions: VERSIONED[app] }) } as const;
}
const handle = (e: any) => { if (e instanceof HistoryError) return fail(e.message, e.status, e.extra); throw e; };

export async function GET(req: NextRequest, { params }: Params) {
  const { app, slug } = await params;
  const g = await guard(req, app);
  if ("res" in g) return g.res;
  try {
    const [id, verb] = slug || [];
    if (id && verb === "versions") return respond({ versions: await g.hist.versions(id), keep: VERSIONED[app]?.keep ?? 0 }, g.ctx);
    if (id && verb) return fail("Not found.", 404);
    return id
      ? respond({ item: await g.hist.get(id) }, g.ctx)
      : respond({ items: await g.hist.list() }, g.ctx);
  } catch (e) { return handle(e); }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { app, slug } = await params;
  const g = await guard(req, app);
  if ("res" in g) return g.res;
  const rl = await rateLimit(req, "history", g.ctx.session.sub, { max: 300, windowSeconds: 600 });
  if (rl.limited) return fail("Too many changes at once. Please wait a moment.", 429);
  const b = await readJson(req);
  const db = getData(req);
  const uid = g.ctx.session.sub;
  const usage = await getUsage(db, uid, effectiveTier(g.ctx.session));
  // The storage check gets the bytes a write really adds (an update only adds what grew).
  const room = (n: number) => storageProblem(usage, n);
  try {
    const [id, verb] = slug || [];
    if (id && verb === "rename") return respond({ ok: true, item: await g.hist.rename(id, String(b?.title || "")) }, g.ctx);
    if (id && verb === "duplicate") return respond({ ok: true, item: await g.hist.duplicate(id, room) }, g.ctx);
    if (id && verb === "restore") {
      const item = await g.hist.restore(id, Number(b?.rev), room);
      if (app === "clipper") await logClipper(db, uid, "project_restored", { project_id: id, bytes: item.bytes, detail: `revision ${Number(b?.rev)}` });
      return respond({ ok: true, item }, g.ctx);
    }
    if (id && verb) return fail("Not found.", 404);
    // create / update
    const target = id || (typeof b?.id === "string" ? b.id : undefined);
    // The Prompt Library's own settings item (favourites, own prompts, profiles) is small and
    // allowed on every account; everything else counts against the plan's storage.
    const libraryState = app === "prompts" && target === PROMPTS_STATE_ID && JSON.stringify(b?.body || {}).length <= 200_000;
    let body = b?.body, meta = b?.meta;
    const isProject = app === "clipper" && !CLIPPER_SETTINGS.has(String(target || ""));
    if (isProject) {
      // One format on every surface: older Clippers' projects are upgraded, a newer Clipper's refused, every field bounded.
      try { body = readProject(body); } catch (e) { if (e instanceof ProjectError) return fail(e.message, 400, { project: e.code }); throw e; }
      meta = projectMeta(body);
    }
    const rev = b?.rev === undefined || b?.rev === null ? undefined : Number(b.rev);
    if (rev !== undefined && (!Number.isInteger(rev) || rev < 0)) return fail("Bad revision.");
    const item = await g.hist.save({
      id: target, title: typeof b?.title === "string" ? b.title : undefined, body, meta, rev, force: b?.force === true,
      room: libraryState ? undefined : room,
    }).catch(async (e) => {
      if (isProject && e instanceof HistoryError && e.status === 413) await logClipper(db, uid, "storage_full", { project_id: target, detail: e.message });
      throw e;
    });
    if (isProject && item.created) await logClipper(db, uid, "project_created", { project_id: item.id, bytes: item.bytes });
    if (isProject && item.overwrote) await logClipper(db, uid, "conflict_overwrite", { project_id: item.id, bytes: item.bytes, detail: `edited revision ${rev}` });
    return respond({ ok: true, item }, g.ctx);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { app, slug } = await params;
  const g = await guard(req, app);
  if ("res" in g) return g.res;
  if (!slug?.[0] || slug.length > 1) return fail("Not found.", 404);
  try {
    await g.hist.remove(slug[0]);
    if (app === "clipper" && !CLIPPER_SETTINGS.has(slug[0])) await logClipper(getData(req), g.ctx.session.sub, "project_deleted", { project_id: slug[0] });
    return respond({ ok: true }, g.ctx);
  } catch (e) { return handle(e); }
}
