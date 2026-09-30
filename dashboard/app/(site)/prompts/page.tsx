/* /prompts — Prompt Library landing. Indexable hub: hero, all fields, featured
 * prompts, how-it-works, FAQ and a strong conversion CTA. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { FIELDS, PROMPTS, LEVELS, promptsByField } from "@/lib/prompts/catalog";
import { pageMeta, breadcrumbJsonLd, faqJsonLd, softwareJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "AI Prompt Library — 50+ premium, ready-to-run prompts for every profession",
  description: `AXTO's prompt library: expert, ready-to-run AI prompts for ${FIELDS.length} professional fields — business, marketing, sales, legal, finance, software, data and more. Fill in the blanks and run on your own AI. Basic prompts free.`,
  path: "/prompts",
  keywords: ["ai prompt library", "chatgpt prompts", "claude prompts", "best ai prompts", "premium prompt templates", "ai prompts for business", "prompt marketplace"],
});

const LEVEL_BADGE: Record<string, string> = { basic: "badge-gray", pro: "badge-brand", premium: "badge-amber", elite: "badge-green" };

export default function PromptsLanding() {
  const featured = ["biz-gtm", "mkt-elite-global", "sales-meddicc", "seo-article", "dev-arch", "inv-memo", "social-script", "legal-summary", "comp-risk"]
    .map((id) => PROMPTS.find((p) => p.id === id)).filter(Boolean) as typeof PROMPTS;

  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: "AXTO Prompt Library", description: metadata.description as string, path: "/prompts", category: "BusinessApplication" }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Prompts", path: "/prompts" }]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: "AXTO Prompt Library", url: absoluteUrl("/prompts"),
          hasPart: { "@type": "ItemList", numberOfItems: FIELDS.length, itemListElement: FIELDS.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: `${f.name} prompts`, url: absoluteUrl(`/prompts/${f.id}`) })) } },
        faqJsonLd([
          { q: "What is the AXTO prompt library?", a: `A curated library of ${PROMPTS.length} expert, ready-to-run AI prompts across ${FIELDS.length} professional fields. Each prompt sets the right role, works step by step and specifies a structured output, so you get a professional result on the first try.` },
          { q: "Which AI models does it work with?", a: "Any. AXTO runs on your own key (BYOK/BYOM/BYOE) — Claude, GPT, Gemini, Llama, DeepSeek, Mistral and more, or your own custom endpoint. No per-token fees from AXTO." },
          { q: "Are the prompts free?", a: "Basic prompts are free on every account. Pro, Premium and Elite levels unlock with a paid plan and cover deeper, multi-step and enterprise-grade workflows." },
          { q: "Can I save and reuse my prompts?", a: "Yes. Fill a prompt in, run it in AI Studio, and save the result to your encrypted workspace history — browse, rename, duplicate and export it anytime." },
        ]),
      ]} />

      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-white py-16">
        <div className="container-page">
          <span className="badge-brand">Prompt Library</span>
          <h1 className="h-display mt-4 max-w-4xl">Premium AI prompts for every profession</h1>
          <p className="lead mt-5 max-w-3xl">{PROMPTS.length} expert, ready-to-run prompts across {FIELDS.length} fields. Fill in the blanks, run on your own AI, and get a professional result on the first try — no prompt-engineering required.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register?next=/app/prompts" className="btn-primary btn-lg">Start free →</Link>
            <Link href="/pricing" className="btn-secondary btn-lg">See pricing</Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            {LEVELS.map((l) => <span key={l.id} className={LEVEL_BADGE[l.id]}>{l.name}</span>)}
            <span className="text-slate-500">· Basic is free on every account</span>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Browse by field</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f, i) => (
              <Reveal key={f.id} delay={(i % 3) * 60}>
                <Link href={`/prompts/${f.id}`} className="card-pad flex h-full flex-col transition hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                    <span className="text-xs text-slate-400">{promptsByField(f.id).length} prompts</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900">{f.name}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{f.blurb}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Featured prompts</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.id} href={`/prompts/${p.field}/${p.id}`} className="card-pad flex flex-col transition hover:shadow-lift">
                <span className={`${LEVEL_BADGE[p.level]} self-start`}>{p.level}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{p.summary}</p>
                <span className="mt-3 text-xs font-semibold text-brand-700">View prompt →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page grid gap-8 lg:grid-cols-3">
          {[
            { t: "Engineered, not generic", d: "Every prompt sets the right expert role, reasons step by step, and specifies a clear output format — the difference between a vague answer and a deliverable." },
            { t: "Runs on your own AI", d: "Connect your own key (BYOK/BYOM/BYOE). Use Claude, GPT, Gemini, Llama, DeepSeek and more. No per-token fees from AXTO, ever." },
            { t: "Save your work", d: "Fill a prompt, run it in AI Studio, and keep the result in your encrypted workspace — browse, rename, duplicate and export anytime." },
          ].map((c, i) => (
            <Reveal key={i} delay={i * 80} className="card-pad">
              <h3 className="font-bold text-slate-900">{c.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-brand-600 py-16 text-white">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Get the full prompt library</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">Start free with Basic prompts. Unlock Pro, Premium and Elite — plus AI Studio, Legal AI and the whole AXTO workspace.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/register?next=/app/prompts" className="btn-lg rounded-xl bg-white px-6 font-semibold text-brand-700 hover:bg-brand-50">Create free account</Link>
            <Link href="/pricing" className="btn-lg rounded-xl border border-white/40 px-6 font-semibold text-white hover:bg-white/10">Compare plans</Link>
          </div>
        </div>
      </section>
    </>
  );
}
