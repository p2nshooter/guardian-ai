/* AXTO — /api/admin/programs · Admin → Programs (docs/BUSINESS-MASTER-BLUEPRINT.md §3–§4)
 *   GET  → the three programmes with every switch and number, the defaults, which
 *          portals are live, member counts and the reseller / white-label applications
 *   PUT  {programs} → save (sanitised; a missing or invalid number keeps its value)
 *   POST {action:"application", id, status, note?} → mark an application
 * Every change goes to the audit log with what changed. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { PORTAL_LIVE, PROGRAM_DEFAULTS, PROGRAM_IDS, getPrograms, sanitizePrograms, savePrograms, type Programs } from "@/lib/programs";
import { setApplicationStatus } from "@/lib/partners";

async function view(req: NextRequest) {
  const db = getData(req);
  const [programs, active, resellerApps, wlApps] = await Promise.all([
    getPrograms(db),
    db.affiliates.list("status", "active", { limit: 1000 }).then((p) => p.entries.length),
    db.partnerApps.list("program", "reseller", { limit: 500 }).then((p) => p.entries),
    db.partnerApps.list("program", "whitelabel", { limit: 500 }).then((p) => p.entries),
  ]);
  const apps = (list: typeof resellerApps) => list.map((e) => ({ id: e.id, ...(e.meta as any) }));
  return { programs, defaults: PROGRAM_DEFAULTS, portal: PORTAL_LIVE, counts: { affiliates: active, reseller: resellerApps.length, whitelabel: wlApps.length }, applications: { reseller: apps(resellerApps), whitelabel: apps(wlApps) } };
}

/** What changed, flattened (switches and numbers), for the audit log. */
function changes(a: Programs, b: Programs): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of PROGRAM_IDS) {
    const x = a[id] as any, y = b[id] as any;
    for (const k of Object.keys(y)) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) out[`${id}.${k}`] = y[k];
  }
  return out;
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  return respond(await view(req), ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  if (!b?.programs || typeof b.programs !== "object") return fail("Nothing to save.");
  const db = getData(req);
  const cur = await getPrograms(db);
  const next = await savePrograms(db, sanitizePrograms(b.programs, cur));
  await audit(db, ctx.session, "programs.update", "programs", "programs", changes(cur, next), req);
  return respond({ ok: true, ...(await view(req)) }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  if (b?.action !== "application") return fail("Unknown action.");
  const db = getData(req);
  const r = await setApplicationStatus(db, String(b.id || ""), b.status, b.note);
  if ("error" in r) return fail(r.error, r.error.includes("not found") ? 404 : 400);
  await audit(db, ctx.session, "partner.application", "partner_app", r.id, { status: r.status }, req);
  return respond({ ok: true, ...(await view(req)) }, ctx);
}
