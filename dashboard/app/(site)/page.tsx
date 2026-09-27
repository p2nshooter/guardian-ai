/* ==============================================================================
 * AXTO v3 — homepage (static). Clear promise, the 7 apps, how it works,
 * BYOX, self-hosted, pricing and FAQ.
 * ============================================================================ */
import Link from "next/link";
import type { Metadata } from "next";
import AppGrid from "@/components/site/AppGrid";
import PricingTable from "@/components/site/PricingTable";
import Faq from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, softwareJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMeta({
    title: `${SITE.name} — AI workspace for legal, security & business teams`,
    description: "Legal AI with 18 expert workspaces, a premium prompt library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst — in your browser, on your own AI keys. Self-hosted Docker & Windows editions for Business and Enterprise.",
    path: "/",
    keywords: ["AI workspace", "legal AI", "BYOK AI", "AI prompt library", "AI video clipper", "PII redaction", "compliance gap analysis", "AI security analyst", "self-hosted AI"],
  }),
  title: { absolute: `${SITE.name} — AI workspace for legal, security & business teams` },
};

export default function HomePage() {
  const offers = PLAN_ORDER.map((id) => ({ name: `${PLANS[id].name} (monthly)`, price: PLANS[id].monthly, period: "month" as const }));
  return (
    <>
      <JsonLd data={[faqJsonLd(FAQ), softwareJsonLd({ name: SITE.name, description: SITE.description, path: "/", offers })]} />

      {/* Hero */}
      <section className="surface-ink relative overflow-hidden">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
        <div className="container-page relative grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Your keys · your data · no installation
            </span>
            <h1 className="h-display mt-6 text-white">The AI workspace for <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">legal, security & business</span> work.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Seven professional AI apps in one place — Legal AI, a premium Prompt Library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst. Everything runs in your browser on your own AI keys.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary btn-lg">Get started</Link>
              <Link href="/pricing" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white">See pricing</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <li>✓ Runs in the browser</li><li>✓ Unlimited AI on your own keys</li><li>✓ Docker & Windows editions</li>
            </ul>
          </div>
          {/* Product preview (pure HTML — no image weight) */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-brand-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-500">Legal AI · Contract Intelligence</span>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <div className="rounded-lg bg-white/5 p-3 text-slate-300">Review this SaaS agreement for our company in Indonesia. Flag anything risky.</div>
                <div className="space-y-3 rounded-lg border border-white/10 p-4">
                  <div className="font-semibold text-white">Summary</div>
                  <p className="text-slate-400">12 clauses reviewed. 2 need changes before signing.</p>
                  <div className="flex items-start gap-2"><span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-bold text-rose-300">HIGH</span><span className="text-slate-300">Unlimited liability for data breaches (§9.2). Propose a cap of 12 months' fees.</span></div>
                  <div className="flex items-start gap-2"><span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">MEDIUM</span><span className="text-slate-300">Data stored outside Indonesia without transfer safeguards (UU PDP Art. 56).</span></div>
                  <div className="flex items-start gap-2"><span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">LOW</span><span className="text-slate-300">Auto-renewal notice period is standard (30 days).</span></div>
                  <p className="text-xs text-slate-500">Confidence 86% · Verify citations with counsel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apps */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Seven apps, one subscription</p>
            <h2 className="h-section mt-3">Everything you need to work with AI — professionally.</h2>
            <p className="lead mt-4">Each app is built for a real job, with clear steps and results you can save, export and share.</p>
          </div>
          <div className="mt-12"><AppGrid /></div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="h-section mt-3">Up and running in three minutes.</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { t: "Choose a plan", d: "Pay monthly or yearly by card, PayPal, QRIS / virtual account, crypto or bank transfer." },
              { t: "Add your AI key", d: "Paste a key from Anthropic, OpenAI, Gemini, Groq, OpenRouter — or your own endpoint. Free tiers work too." },
              { t: "Open an app and work", d: "Every app explains itself step by step. Save results to your private storage and export them." },
            ].map((s, i) => (
              <li key={s.t} className="card-pad">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* BYOX */}
      <section className="py-20 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">BYOX — bring your own everything</p>
            <h2 className="h-section mt-3">Your keys. Your models. Your data.</h2>
            <p className="lead mt-4">AXTO never resells AI tokens. Your apps talk to the provider you choose, with your own key, at the provider's price — so usage is unlimited on our side and your data relationship stays yours.</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                ["🔑", "Keys encrypted at rest (AES-256-GCM) and never shown again after saving"],
                ["🧠", "Anthropic Claude, OpenAI, Google Gemini, Groq, OpenRouter and Deepgram built in"],
                ["🏠", "Your own model server via URL — Ollama, vLLM, LM Studio (OpenAI-compatible)"],
                ["🛡️", "Privacy Vault redacts personal data in your browser before anything is sent"],
              ].map(([i, t]) => <li key={t} className="flex gap-3"><span aria-hidden="true">{i}</span><span className="text-slate-700">{t}</span></li>)}
            </ul>
          </div>
          <div className="card-pad bg-gradient-to-br from-white to-brand-50/50">
            <div className="text-sm font-semibold text-slate-900">Two ways to power the apps</div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-brand-200 bg-white p-4">
                <div className="flex items-center justify-between"><span className="font-semibold">BYOX</span><span className="badge-green">Available</span></div>
                <p className="mt-1 text-sm text-slate-600">Use your own keys or endpoints. Unlimited on our side, provider billing direct to you.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 opacity-80">
                <div className="flex items-center justify-between"><span className="font-semibold">Managed AI</span><span className="badge-gray">Coming soon</span></div>
                <p className="mt-1 text-sm text-slate-600">AXTO provides the models — no keys needed. A separate plan with monthly AI credits.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Self-hosted */}
      <section className="surface-ink relative overflow-hidden py-20 sm:py-24">
        <div className="glow pointer-events-none absolute inset-0 opacity-70" />
        <div className="container-page relative">
          <div className="max-w-2xl">
            <p className="eyebrow text-brand-300">Self-hosted editions</p>
            <h2 className="h-section mt-3">Prefer your own servers? Run AXTO on-premise.</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">Ten Docker and Windows editions, always licensed at the highest tier — included with Business and Enterprise. Perpetual offline licences are available for regulated and air-gapped environments.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SELF_HOSTED.map((p) => {
              const c = catalogEntry(p.slug);
              return (
                <Link key={p.slug} href={`/self-hosted/${p.slug}`} className="rounded-xl border border-white/10 bg-white/[.03] p-4 no-underline hover:border-brand-400/40">
                  <div className="text-xl" aria-hidden="true">{c?.emoji}</div>
                  <div className="mt-2 font-semibold text-white">{c?.name}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">{c?.tagline}</div>
                </Link>
              );
            })}
          </div>
          <div className="mt-8"><Link href="/self-hosted" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white">Explore self-hosted →</Link></div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-24" id="pricing">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Pricing</p>
            <h2 className="h-section mt-3">Simple plans. Unlimited AI on your own keys.</h2>
            <p className="lead mt-4">Pay monthly or save two months with yearly billing.</p>
          </div>
          <div className="mt-10"><PricingTable compact /></div>
          <p className="mt-6 text-center text-sm text-slate-500"><Link href="/pricing">Compare everything in each plan →</Link></p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="h-section mt-3">Questions, answered.</h2>
            <p className="mt-4 text-slate-600">Can't find what you need? <Link href="/contact">Contact us</Link>.</p>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container-page">
          <div className="surface-ink relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16">
            <div className="glow pointer-events-none absolute inset-0" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">Start working with AI the professional way.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">Create your account in under a minute. Choose a plan when you're ready.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary btn-lg">Create account</Link>
              <Link href="/contact" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
