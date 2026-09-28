/* AXTO — Prompt Library.
 *   GET /api/prompts        → catalogue (fields, levels, PUBLIC prompts — no body)
 *   GET /api/prompts/:id    → full template, gated by the member's plan level
 * Free accounts unlock Basic; higher levels need Starter/Pro/Business+.
 * The gated path self-heals the plan from D1 (like byox/legal), so a payment
 * that was just confirmed unlocks at once without a re-login. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { loadSession, loadSessionFor, respond, effectiveTier } from "@/lib/auth";
import { fail } from "@/lib/http";
import { limitsFor, planForPromptLevel, PLANS, isPlanId } from "@/lib/plans";
import { FIELDS, LEVELS, PROMPTS, getPrompt, publicPrompt } from "@/lib/prompts/catalog";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id?: string[] }> }) {
  const id = (await params).id?.[0];

  // Public catalogue — cacheable for anon, no secret bodies.
  if (!id) {
    const ctx = await loadSession(req);
    const unlocked = limitsFor(ctx ? effectiveTier(ctx.session) : "none").promptLevels;
    const body = {
      fields: FIELDS, levels: LEVELS,
      prompts: PROMPTS.map((p) => ({ ...publicPrompt(p), locked: !unlocked.includes(p.level) })),
      unlocked,
    };
    return ctx ? respond(body, ctx) : NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  const p = getPrompt(id);
  if (!p) return fail("Prompt not found.", 404);
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).promptLevels.includes(p.level));
  const unlocked = limitsFor(ctx ? effectiveTier(ctx.session) : "none").promptLevels;
  if (!unlocked.includes(p.level)) {
    const need = planForPromptLevel(p.level);
    return fail(`This ${p.level} prompt needs the ${isPlanId(need) ? PLANS[need].name : "a paid"} plan.`, 402, { upgrade: true, need });
  }
  const data = { prompt: { ...publicPrompt(p), template: p.template, example: p.example } };
  return ctx ? respond(data, ctx) : NextResponse.json(data);
}
