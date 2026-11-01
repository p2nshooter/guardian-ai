/* AXTO — GET /api/clipper/usage · the member's own Clipper usage (Clipper C1):
 * videos this month against the plan's quota, storage used against the plan's
 * storage, and the latest usage events (videos, refusals, project changes). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { limitsFor } from "@/lib/plans";
import { fail } from "@/lib/http";
import { memberUsage } from "@/lib/clipper/usage-log";

export async function GET(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes("clipper"));
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  if (!limitsFor(tier).apps.includes("clipper")) return fail("This app needs a plan.", 402, { upgrade: true });
  return respond(await memberUsage(getData(req), ctx.session.sub, tier), ctx);
}
