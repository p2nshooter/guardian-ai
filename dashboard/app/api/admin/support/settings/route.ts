/* AXTO — /api/admin/support/settings (admin only) · the support assistant's AI
 *   GET → {enabled, use_workers_ai, providers:[{label, provider, base_url, model, keys: masked, keyCount}]}
 *   PUT {enabled, use_workers_ai, providers:[{label, provider, base_url, model, keys: string (one per line)}]}
 *       Keys stay in the encrypted R2 document "support-ai". Submitting a provider
 *       with an empty/masked key list keeps that provider's saved keys.
 *   POST {test: true} → asks the assistant a sample question with the saved settings. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { writeSecure, maskValue, MASK, SettingsKeyMissing } from "@/lib/secure-store";
import { endpointProblem, isProviderId, providerInfo } from "@/lib/ai/providers";
import { supportAiSettings, supportAnswer, type SupportAiProvider } from "@/lib/support/ai";
import { allowInsecureEndpoints } from "@/lib/ai/byox";

const MAX_PROVIDERS = 10;
const MAX_KEYS = 500;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const s = await supportAiSettings();
  return respond({
    enabled: s.enabled, use_workers_ai: s.use_workers_ai,
    providers: s.providers.map((p) => ({ ...p, keys: p.keys.slice(0, 5).map(maskValue), keyCount: p.keys.length })),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const cur = await supportAiSettings();
  const list = Array.isArray(b?.providers) ? b.providers.slice(0, MAX_PROVIDERS) : [];
  const providers: SupportAiProvider[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!isProviderId(p?.provider) || !providerInfo(p.provider)?.chat) return fail(`Provider #${i + 1}: choose a chat provider.`);
    const base_url = String(p.base_url || "").trim();
    if (p.provider === "custom") {
      const problem = endpointProblem(base_url, allowInsecureEndpoints());
      if (problem) return fail(`Provider #${i + 1}: ${problem}`);
    }
    const raw = typeof p.keys === "string" ? p.keys : Array.isArray(p.keys) ? p.keys.join("\n") : "";
    let keys = raw.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k && !k.startsWith(MASK));
    if (!keys.length) keys = cur.providers[i]?.provider === p.provider ? cur.providers[i].keys : [];
    keys = Array.from(new Set(keys)).slice(0, MAX_KEYS).map((k) => String(k).slice(0, 400));
    providers.push({ label: String(p.label || providerInfo(p.provider)!.name).slice(0, 60), provider: p.provider, base_url, model: String(p.model || "").trim().slice(0, 120), keys });
  }
  try {
    await writeSecure(undefined, "support-ai", { enabled: !!b?.enabled, use_workers_ai: !!b?.use_workers_ai, providers });
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret first.", 503);
    throw e;
  }
  await audit(getData(req), ctx.session, "admin.support_ai.update", "settings", "support-ai", { providers: providers.length, keys: providers.reduce((n, p) => n + p.keys.length, 0) }, req);
  return respond({ ok: true }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const answer = await supportAnswer(getData(req), "other", [
    { id: "t", from: "visitor", name: "Admin test", text: "Hi! What plans do you offer and which one includes the self-hosted apps?", at: new Date().toISOString() },
  ]);
  if (!answer) return fail("No provider answered. Check the keys, model names and endpoint.", 502);
  return respond({ ok: true, answer }, ctx);
}
