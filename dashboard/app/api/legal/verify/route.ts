/* AXTO — Legal AI: check every citation in a text against the primary-law corpus
 * (BLUEPRINT-V4 §32). The answer says, per citation, how far it could be checked —
 * verified with the official text, not found in a complete instrument, or not yet
 * covered — and never calls a citation verified without the text that verifies it.
 *   POST /api/legal/verify {text} → { results, summary } */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSessionFor, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { readJson, fail } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { LegalCorpus } from "@/lib/legal/corpus";
import { verifyText, verifySummary } from "@/lib/legal/verify";

const MAX_TEXT = 200_000;

export async function POST(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes("legal"));
  if (!ctx) return unauthorized();
  if (!limitsFor(effectiveTier(ctx.session)).apps.includes("legal")) return fail("Legal AI needs a plan. Choose one to start.", 402, { upgrade: true });
  const rl = await rateLimit(req, "legal-verify", ctx.session.sub, { max: 60, windowSeconds: 600 });
  if (rl.limited) return fail("Too many checks at once. Please wait a moment.", 429);
  const b = (await readJson(req)) as { text?: unknown } | null;
  const text = typeof b?.text === "string" ? b.text : "";
  if (!text.trim()) return fail("Paste the text whose citations should be checked.", 400);
  if (text.length > MAX_TEXT) return fail(`The text is too long to check at once (${MAX_TEXT.toLocaleString("en-US")} characters at most).`, 413);
  const results = await verifyText(new LegalCorpus(getData(req).store), text);
  return respond({ results, summary: verifySummary(results) }, ctx);
}
