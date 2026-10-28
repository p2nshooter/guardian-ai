/* ==============================================================================
 * AXTO — homepage (static) in the "Crystal Palace" design (docs/BLUEPRINT-V4.md
 * §18): One Ecosystem hero, the site sale, all 17 apps, how it works, BYOX,
 * pricing and FAQ.
 * ============================================================================ */
import Link from "next/link";
import type { Metadata } from "next";
import PalaceHero from "@/components/site/PalaceHero";
import Ecosystem from "@/components/site/Ecosystem";
import PricingTable from "@/components/site/PricingTable";
import Faq from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, softwareJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { SITE } from "@/lib/site";
import Reveal from "@/components/site/Reveal";
import T from "@/components/site/T";
import AuctionWinners from "@/components/site/AuctionWinners";
import HomeSaleBand from "@/components/site/HomeSaleBand";

export const metadata: Metadata = {
  ...pageMeta({
    title: `${SITE.name} — AI workspace for legal, security & business teams`,
    description: "One AI ecosystem: Legal AI for 200+ jurisdictions, Prompt Library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst in your browser on your own AI keys — plus 10 self-hosted apps for Docker on Windows and Linux, from Guardian AI to AXTO Legal.",
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

      {/* The sale and the running auction come first, where the page opens (REQUESTS 112) */}
      <HomeSaleBand />

      <PalaceHero />

      {/* The licence auction: recent winners and their packages (§26.5) */}
      <AuctionWinners />

      <Ecosystem />

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
