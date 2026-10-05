/* AXTO — GET /api/legal/catalog?lang=xx · public Legal AI catalogue for the app UI,
 * in the member's language: workspaces (without their server-only prompts),
 * practice areas, jurisdictions, citation styles, picker regions, and which
 * workspaces the member's plan unlocks. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { limitsFor } from "@/lib/plans";
import { publicWorkspaces, CORE_WORKSPACES } from "@/lib/legal/workspaces";
import { SUBDIVISIONS } from "@/lib/legal/jurisdictions";
import { localizedCatalog } from "@/lib/legal/catalog-i18n";
import { isLang } from "@/lib/i18n-shared";

export async function GET(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).legalWorkspaces === "all");
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const all = limitsFor(tier).legalWorkspaces === "all";
  const q = new URL(req.url).searchParams.get("lang");
  const lang = isLang(q) ? q : "en";
  return respond({
    access: limitsFor(tier).apps.includes("legal"),
    unlocked: all ? publicWorkspaces().map((w) => w.id) : CORE_WORKSPACES,
    lang,
    ...localizedCatalog(lang),
    subdivisions: SUBDIVISIONS,
  }, ctx);
}
