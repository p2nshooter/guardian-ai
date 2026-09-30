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
import Reveal from "@/components/site/Reveal";
import T from "@/components/site/T";

export const metadata: Metadata = {
  ...pageMeta({
    title: `${SITE.name} — AI workspace for legal, security & business teams`,
    description: "Legal AI with 36 expert workspaces for 200+ jurisdictions, a premium prompt library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst — in your browser, on your own AI keys. Self-hosted Docker editions for Business and Enterprise.",
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
            <span className="anim-in inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 anim-pulse-ring" /> <T k="lp.badge" />
            </span>
            <h1 className="h-display anim-in anim-delay-1 mt-6 text-white"><T k="lp.h1a" /> <span className="anim-gradient bg-gradient-to-r from-brand-200 via-brand-400 to-brand-600 bg-clip-text text-transparent"><T k="lp.h1grad" /></span></h1>
            <p className="anim-in anim-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              <T k="lp.sub" />
            </p>
            <div className="anim-in anim-delay-3 mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary btn-lg"><T k="site.getstarted" /></Link>
              <Link href="/pricing" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white"><T k="lp.seePricing" /></Link>
            </div>
            <ul className="anim-in anim-delay-4 mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <li>✓ <T k="lp.f1" /></li><li>✓ <T k="lp.f2" /></li><li>✓ <T k="lp.f3" /></li>
            </ul>
          </div>
          {/* Product preview (pure HTML — no image weight) */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-brand-500/10 blur-2xl" />
            <div className="anim-float relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
              <div className="scanline pointer-events-none" />
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-500"><T k="lp.mock.title" /></span>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <div className="rounded-lg bg-white/5 p-3 text-slate-300"><T k="lp.mock.prompt" /></div>
                <div className="space-y-3 rounded-lg border border-white/10 p-4">
                  <div className="font-semibold text-white"><T k="lp.mock.summary" /></div>
                  <p className="text-slate-400"><T k="lp.mock.reviewed" /></p>
                  <div className="flex items-start gap-2"><span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-bold text-rose-300"><T k="lp.mock.high" /></span><span className="text-slate-300"><T k="lp.mock.r1" /></span></div>
                  <div className="flex items-start gap-2"><span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300"><T k="lp.mock.medium" /></span><span className="text-slate-300"><T k="lp.mock.r2" /></span></div>
                  <div className="flex items-start gap-2"><span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300"><T k="lp.mock.low" /></span><span className="text-slate-300"><T k="lp.mock.r3" /></span></div>
                  <p className="text-xs text-slate-500"><T k="lp.mock.conf" /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The site is for sale — the special offer menu */}
      <section className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50" data-testid="home-sale">
        <div className="container-page flex flex-wrap items-center gap-4 py-5">
          <span className="text-2xl">🏛️</span>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900"><T k="lp.sale" /></div>
            <div className="text-sm text-slate-600"><T k="lp.saleSub" /></div>
          </div>
          <Link href="/acquire" className="rounded-xl bg-ink-950 px-5 py-2.5 text-sm font-bold text-amber-300 no-underline hover:bg-ink-900"><T k="lp.saleCta" /> →</Link>
        </div>
      </section>

      {/* Apps */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><T k="lp.apps.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.apps.h" /></h2>
            <p className="lead mt-4"><T k="lp.apps.lead" /></p>
          </Reveal>
          <div className="mt-12"><AppGrid /></div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><T k="lp.how.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.how.h" /></h2>
          </Reveal>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { t: "lp.how.s1t", d: "lp.how.s1d" },
              { t: "lp.how.s2t", d: "lp.how.s2d" },
              { t: "lp.how.s3t", d: "lp.how.s3d" },
            ].map((s, i) => (
              <li key={s.t} className="card-pad">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold"><T k={s.t} /></h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><T k={s.d} /></p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* BYOX */}
      <section className="py-20 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow"><T k="lp.byox.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.byox.h" /></h2>
            <p className="lead mt-4"><T k="lp.byox.lead" /></p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                ["🔑", "lp.byox.b1"],
                ["🧠", "lp.byox.b2"],
                ["🏠", "lp.byox.b3"],
                ["🛡️", "lp.byox.b4"],
              ].map(([i, t]) => <li key={t} className="flex gap-3"><span aria-hidden="true">{i}</span><span className="text-slate-700"><T k={t} /></span></li>)}
            </ul>
          </div>
          <div className="card-pad bg-gradient-to-br from-white to-brand-50/50">
            <div className="text-sm font-semibold text-slate-900"><T k="lp.byox.two" /></div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-brand-200 bg-white p-4">
                <div className="flex items-center justify-between"><span className="font-semibold">BYOX</span><span className="badge-green"><T k="lp.byox.avail" /></span></div>
                <p className="mt-1 text-sm text-slate-600"><T k="lp.byox.byoxDesc" /></p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 opacity-80">
                <div className="flex items-center justify-between"><span className="font-semibold"><T k="lp.byox.managed" /></span><span className="badge-gray"><T k="app.soon" /></span></div>
                <p className="mt-1 text-sm text-slate-600"><T k="lp.byox.managedDesc" /></p>
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
            <p className="eyebrow text-brand-300"><T k="lp.sh.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.sh.h" /></h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300"><T k="lp.sh.lead" /></p>
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
          <div className="mt-8"><Link href="/self-hosted" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white"><T k="lp.sh.cta" /></Link></div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-24" id="pricing">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow"><T k="lp.price.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.price.h" /></h2>
            <p className="lead mt-4"><T k="lp.price.lead" /></p>
          </div>
          <div className="mt-10"><PricingTable compact /></div>
          <p className="mt-6 text-center text-sm text-slate-500"><Link href="/pricing"><T k="lp.price.compare" /></Link></p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow"><T k="lp.faq.eyebrow" /></p>
            <h2 className="h-section mt-3"><T k="lp.faq.h" /></h2>
            <p className="mt-4 text-slate-600"><T k="lp.faq.help" /> <Link href="/contact"><T k="lp.faq.contact" /></Link></p>
          </div>
          <Faq items={FAQ} i18nPrefix="faq" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container-page">
          <div className="surface-ink relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16">
            <div className="glow pointer-events-none absolute inset-0" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl"><T k="lp.cta.h" /></h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300"><T k="lp.cta.sub" /></p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary btn-lg"><T k="lp.cta.create" /></Link>
              <Link href="/contact" className="btn btn-lg border border-white/15 text-white hover:bg-white/10 hover:text-white"><T k="lp.cta.sales" /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
