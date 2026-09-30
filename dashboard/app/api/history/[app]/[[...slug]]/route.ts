/* AXTO — generic per-app work history (encrypted per member in R2).
 *   GET    /api/history/:app                 → list (sidebar)
 *   GET    /api/history/:app/:id             → one item (full body)
 *   POST   /api/history/:app        {id?, title, body, meta}      → create/update
 *   POST   /api/history/:app/:id/rename    {title}                → rename
 *   POST   /api/history/:app/:id/duplicate                        → duplicate
 *   DELETE /api/history/:app/:id             → delete
 * Legal AI uses its own richer /api/legal/matters store. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, getUserFiles } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { getUsage, storageProblem } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { History, HistoryError, isHistoryApp } from "@/lib/history";
import { STATE_ID as PROMPTS_STATE_ID } from "@/lib/prompts/library";

type Params = { params: Promise<{ app: string; slug?: string[] }> };

async function guard(req: NextRequest, app: string) {
  if (!isHistoryApp(app)) return { res: fail("Unknown app.", 404) } as const;
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes(app));
  if (!ctx) return { res: unauthorized() } as const;
  if (!limitsFor(effectiveTier(ctx.session)).apps.includes(app)) return { res: fail("This app needs a plan.", 402, { upgrade: true }) } as const;
  return { ctx, hist: new History(getUserFiles(req), getDB(req), ctx.session.sub, app) } as const;
}
const handle = (e: any) => { if (e instanceof HistoryError) return fail(e.message, e.status); throw e; };

export async function GET(req: NextRequest, { params }: Params) {
  const { app, slug } = await params;
  const g = await guard(req, app);
  if ("res" in g) return g.res;
  try {
    return slug?.[0]
      ? respond({ item: await g.hist.get(slug[0]) }, g.ctx)
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
  try {
    const [id, verb] = slug || [];
    if (id && verb === "rename") { await g.hist.rename(id, String(b?.title || "")); return respond({ ok: true }, g.ctx); }
    if (id && verb === "duplicate") return respond({ ok: true, item: await g.hist.duplicate(id) }, g.ctx);
    // create / update
    // The Prompt Library's own settings item (favourites, own prompts, profiles) is small and
    // allowed on every account; everything else counts against the plan's storage.
    const libraryState = app === "prompts" && (id || b?.id) === PROMPTS_STATE_ID && JSON.stringify(b?.body || {}).length <= 200_000;
    const room = libraryState ? null : storageProblem(await getUsage(getDB(req), g.ctx.session.sub, effectiveTier(g.ctx.session)), Math.ceil(JSON.stringify(b || {}).length * 1.1));
    if (room) return fail(room, 413, { upgrade: true });
    const item = await g.hist.save({ id: id || (typeof b?.id === "string" ? b.id : undefined), title: String(b?.title || ""), body: b?.body, meta: b?.meta });
    return respond({ ok: true, item }, g.ctx);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { app, slug } = await params;
  const g = await guard(req, app);
  if ("res" in g) return g.res;
  if (!slug?.[0]) return fail("Not found.", 404);
  try { await g.hist.remove(slug[0]); return respond({ ok: true }, g.ctx); } catch (e) { return handle(e); }
}
