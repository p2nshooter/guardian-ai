/* /apps — the seven cloud apps (static) in the "Crystal Palace" design
 * (docs/BLUEPRINT-V4.md §18), with the ten self-hosted apps one click away. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { EcoTile } from "@/components/site/Ecosystem";
import Reveal from "@/components/site/Reveal";
import T from "@/components/site/T";
import { ECOSYSTEM_CLOUD, ECOSYSTEM_SELF } from "@/lib/ecosystem";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Apps — Legal AI, Prompt Library, AI Studio, Clipper and more",
  description: "Seven professional AI apps in your browser: Legal AI, Prompt Library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst — on your own AI keys. Plus ten self-hosted apps for Docker on Windows and Linux.",
  path: "/apps",
});

export default function AppsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Apps", path: "/apps" }])} />
      <section className="palace py-16 sm:py-24" data-testid="apps-hero">
        <div className="palace-sky" /><div className="palace-stars" /><div className="palace-floor" />
        <div className="container-page relative">
          <span className="eyebrow-palace palace-rise">✦ <T k="lp.eco.cloud" /></span>
          <h1 className="palace-rise mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl" style={{ ["--i" as string]: 1 }}><T k="apps.idx.h" /></h1>
          <p className="palace-rise mt-5 max-w-2xl text-lg leading-relaxed text-slate-300" style={{ ["--i" as string]: 2 }}><T k="apps.idx.lead" /></p>
          <div className="palace-rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href="/register" className="btn-royal btn-lg"><T k="site.getstarted" /></Link>
            <Link href="/pricing" className="btn-crystal btn-lg"><T k="lp.seePricing" /></Link>
          </div>
        </div>
      </section>
      <section className="palace py-14">
        <div className="palace-sky opacity-60" />
        <div className="container-page relative">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ECOSYSTEM_CLOUD.map((a, i) => <EcoTile key={a.slug} app={a} i={i} wide={i === 0} />)}
          </div>
          <Reveal className="mt-14 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white"><T k="lp.eco.self" /> <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-bold text-slate-300">{ECOSYSTEM_SELF.length}</span></h2>
              <p className="mt-1 text-sm text-slate-400"><T k="lp.eco.selfSub" /></p>
            </div>
            <Link href="/self-hosted" className="text-sm font-semibold text-brand-300 hover:text-gold-200"><T k="lp.eco.allSelf" /> →</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
