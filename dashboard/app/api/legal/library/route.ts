/* AXTO — Legal AI v4: the member's own playbooks and clauses (encrypted per member in R2)
 *   GET /api/legal/library                    → { library }
 *   PUT /api/legal/library  {playbooks, clauses} → { ok, library } */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData, getUserFiles } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { getUsage, storageProblem } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { MatterError, getLibrary, saveLibrary } from "@/lib/legal/matters";

async function guard(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes("legal"));
  if (!ctx) return { res: unauthorized() } as const;
  const tier = effectiveTier(ctx.session);
  if (!limitsFor(tier).apps.includes("legal")) return { res: fail("Legal AI needs a plan. Choose one to start.", 402, { upgrade: true }) } as const;
  return { ctx, tier } as const;
}

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  return respond({ library: await getLibrary(getUserFiles(req), g.ctx.session.sub) }, g.ctx);
}

export async function PUT(req: NextRequest) {
  const g = await guard(req);
  if ("res" in g) return g.res;
  const rl = await rateLimit(req, "legal-write", g.ctx.session.sub, { max: 240, windowSeconds: 600 });
  if (rl.limited) return fail("Too many changes at once. Please wait a moment.", 429);
  const b = await readJson(req);
  const db = getData(req);
  const room = storageProblem(await getUsage(db, g.ctx.session.sub, g.tier), Math.ceil(JSON.stringify(b || {}).length * 1.1));
  if (room) return fail(room, 413, { upgrade: true });
  try {
    return respond({ ok: true, library: await saveLibrary(getUserFiles(req), db, g.ctx.session.sub, b) }, g.ctx);
  } catch (e) {
    if (e instanceof MatterError) return fail(e.message, e.status);
    throw e;
  }
}
