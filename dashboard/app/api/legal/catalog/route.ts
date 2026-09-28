/* AXTO — GET /api/legal/catalog · public Legal AI catalogue for the app UI:
 * workspaces (without their server-only prompts), practice areas, jurisdictions,
 * citation styles, and which workspaces the member's plan unlocks. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { limitsFor } from "@/lib/plans";
import { publicWorkspaces, GROUPS, CORE_WORKSPACES } from "@/lib/legal/workspaces";
import { AREAS } from "@/lib/legal/areas";
import { COUNTRIES, SUBDIVISIONS, CITATION_STYLES } from "@/lib/legal/jurisdictions";

export async function GET(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).legalWorkspaces === "all");
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const all = limitsFor(tier).legalWorkspaces === "all";
  return respond({
    access: limitsFor(tier).apps.includes("legal"),
    unlocked: all ? publicWorkspaces().map((w) => w.id) : CORE_WORKSPACES,
    groups: GROUPS,
    workspaces: publicWorkspaces(),
    areas: AREAS.map(({ id, name, nameId, group }) => ({ id, name, nameId, group })),
    countries: COUNTRIES,
    subdivisions: SUBDIVISIONS,
    citationStyles: CITATION_STYLES,
  }, ctx);
}
