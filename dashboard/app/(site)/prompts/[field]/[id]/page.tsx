/* /prompts/<field>/<id> — one indexable landing page per prompt (SEO money page).
 * Shows what the prompt does, the inputs it takes and who it's for, with a strong
 * CTA. The full template body is NOT shown here — it's the paid asset, served only
 * to signed-in members whose plan unlocks the level (see /api/prompts/:id). */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { PROMPTS, getPrompt, getField, promptsByField, LEVELS } from "@/lib/prompts/catalog";
import { PLANS, planForPromptLevel, isPlanId } from "@/lib/plans";
import { pageMeta, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return PROMPTS.map((p) => ({ field: p.field, id: p.id }));
}

const LEVEL_BADGE: Record<string, string> = { basic: "badge-gray", pro: "badge-brand", premium: "badge-amber", elite: "badge-green" };

export async function generateMetadata({ params }: { params: Promise<{ field: string; id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = getPrompt(id);
  const f = p && getField(p.field);
  if (!p || !f) return {};
  return pageMeta({
    title: `${p.title} — ${f.name} AI prompt`,
    description: `${p.summary} A ready-to-run ${p.level} AXTO prompt for ${f.name.toLowerCase()} — fill in ${p.variables.length} field${p.variables.length === 1 ? "" : "s"} and run it on your own AI.`,
    path: `/prompts/${p.field}/${p.id}`,
    keywords: [p.title.toLowerCase(), `${f.name.toLowerCase()} ai prompt`, "chatgpt prompt", "claude prompt", "ai prompt template", ...f.keywords],
    type: "article",
  });
}

export default async function PromptPage({ params }: { params: Promise<{ field: string; id: string }> }) {
  const { id } = await params;
  const p = getPrompt(id);
  const f = p && getField(p.field);
  if (!p || !f) notFound();
  const need = planForPromptLevel(p.level);
  const free = p.level === "basic";
  const planName = isPlanId(need) ? PLANS[need].name : "a paid";
  const level = LEVELS.find((l) => l.id === p.level);
  const related = promptsByField(p.field).filter((x) => x.id !== p.id).slice(0, 6);

  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "CreativeWork",
          name: p.title, headline: p.title, description: p.summary,
          url: absoluteUrl(`/prompts/${p.field}/${p.id}`),
          about: f.name, genre: "AI prompt", inLanguage: "en",
          isAccessibleForFree: free,
          publisher: { "@id": `${absoluteUrl("")}/#organization` },
          ...(isPlanId(need) ? { offers: { "@type": "Offer", price: PLANS[need].monthly.toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl("/pricing") } } : {}),
        },
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Prompts", path: "/prompts" }, { name: f.name, path: `/prompts/${f.id}` }, { name: p.title, path: `/prompts/${p.field}/${p.id}` }]),
        faqJsonLd([
          { q: `What does the "${p.title}" prompt do?`, a: p.summary },
          { q: "Which AI models can I use it with?", a: "Any — AXTO runs on your own key (BYOK) for Claude, GPT, Gemini, Llama, DeepSeek, Mistral and more, or your own custom endpoint. You are never locked to one provider." },
          { q: free ? "Is this prompt free?" : `What plan do I need for this prompt?`, a: free ? "Yes. Basic prompts are free on every AXTO account — just sign in and use it." : `This is a ${p.level} prompt, included from the ${planName} plan. Basic prompts are free on every account.` },
        ]),
      ]} />

      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-14">
        <div className="container-page">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/prompts" className="hover:text-brand-700">Prompts</Link> / <Link href={`/prompts/${f.id}`} className="hover:text-brand-700">{f.name}</Link>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{f.icon}</span>
            <span className={LEVEL_BADGE[p.level]}>{p.level}</span>
            {free ? <span className="badge-green">Free on every account</span> : <span className="badge-amber">Included from {planName}</span>}
          </div>
          <h1 className="h-display mt-4 max-w-3xl">{p.title}</h1>
          <p className="lead mt-4 max-w-3xl">{p.summary}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/register?next=/app/prompts`} className="btn-primary btn-lg">{free ? "Use it free →" : `Unlock with ${planName} →`}</Link>
            <Link href="/pricing" className="btn-secondary btn-lg">See pricing</Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">Runs on your own AI key · fill {p.variables.length} field{p.variables.length === 1 ? "" : "s"} · copy, run in AI Studio, or save to your workspace</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">What you'll get</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{p.summary} It's an expert-engineered {p.level} prompt for {f.name.toLowerCase()}: it sets the right role, works through the problem step by step, and specifies a clear, structured output — so you get a professional result on the first try instead of a vague answer.</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inputs you provide</h2>
              <p className="mt-2 text-sm text-slate-500">Fill these in and the prompt is ready to run.</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.variables.map((v) => (
                  <li key={v.key} className="card-pad">
                    <div className="font-semibold text-slate-900">{v.label}</div>
                    {v.placeholder ? <div className="mt-1 text-sm text-slate-500">e.g. {v.placeholder}</div> : null}
                  </li>
                ))}
                {!p.variables.length ? <li className="text-sm text-slate-600">No inputs needed — run it as-is.</li> : null}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold">How it works</h2>
              <ol className="mt-4 space-y-4">
                {["Open the prompt in AXTO and fill in the fields above.", "Run it on your own AI key — Claude, GPT, Gemini, Llama, DeepSeek and more, or your own endpoint.", "Copy the result, refine it in AI Studio, or save it to your encrypted workspace history."].map((s, i) => (
                  <Reveal key={i} as="li" delay={i * 80} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <p className="pt-1 text-[15px] leading-relaxed text-slate-700">{s}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card-pad">
              <h3 className="font-bold text-slate-900">{free ? "Free on every account" : `Unlock with the ${planName} plan`}</h3>
              <p className="mt-2 text-sm text-slate-600">{level?.blurb} {free ? "Basic prompts are free — sign in and start using them." : `Get this and every ${p.level} prompt, plus AI Studio, Legal AI and the full library.`}</p>
              <Link href={`/register?next=/app/prompts`} className="btn-primary mt-4 w-full justify-center">{free ? "Create free account" : `Start with ${planName}`}</Link>
              <Link href="/prompts" className="btn-ghost mt-2 w-full justify-center">Browse all prompts</Link>
            </div>
            <div className="card-pad">
              <h3 className="font-bold text-slate-900">Bring your own AI</h3>
              <p className="mt-2 text-sm text-slate-600">AXTO never charges per token. Connect your own key (BYOK/BYOM/BYOE) and your data stays yours — every result is encrypted per member.</p>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-slate-200 bg-slate-50 py-14">
          <div className="container-page">
            <h2 className="text-2xl font-bold">More {f.name} prompts</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} href={`/prompts/${r.field}/${r.id}`} className="card-pad transition hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className={LEVEL_BADGE[r.level]}>{r.level}</span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-900">{r.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
