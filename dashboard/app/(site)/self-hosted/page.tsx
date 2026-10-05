/* /self-hosted — the 10 self-hosted AXTO apps (Docker for Windows & Linux) in the
 * "Crystal Palace" design (docs/BLUEPRINT-V4.md §18), names as in the owner's
 * picture (docs/AXTO-APPS-BLUEPRINT.md §2). Static + indexable, 10 languages. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { EcoTile } from "@/components/site/Ecosystem";
import Reveal from "@/components/site/Reveal";
import T from "@/components/site/T";
import { ECOSYSTEM_SELF } from "@/lib/ecosystem";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

const NAMES = PRODUCT_CATALOG.map((p) => p.name).join(", ");

export const metadata: Metadata = pageMeta({
  title: "Self-hosted AI apps — Docker for Windows & Linux",
  description: `${PRODUCT_CATALOG.length} self-hosted AI apps for Docker on Windows and Linux (x86-64 and ARM64): ${NAMES}. Your keys, your data, your servers.`,
  path: "/self-hosted",
  keywords: ["self-hosted AI", "on-premise AI security", "docker AI", "air-gapped AI", "sovereign AI", "lifetime licence", ...PRODUCT_CATALOG.map((p) => p.name.toLowerCase())],
});

const FACTS = ["sh.idx.f1", "sh.idx.f2", "sh.idx.f3", "sh.idx.f4"];

export default function SelfHostedIndex() {
  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Self-hosted", path: "/self-hosted" }]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: "AXTO self-hosted apps", url: absoluteUrl("/self-hosted"),
          hasPart: { "@type": "ItemList", numberOfItems: PRODUCT_CATALOG.length, itemListElement: PRODUCT_CATALOG.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/self-hosted/${p.slug}`) })) } },
      ]} />
      <section className="palace py-16 sm:py-24" data-testid="sh-hero">
        <div className="palace-sky" /><div className="palace-stars" /><div className="palace-floor" />
        <div className="container-page relative">
          <span className="eyebrow-palace palace-rise">✦ <T k="sh.idx.eyebrow" /></span>
          <h1 className="palace-rise mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl" style={{ ["--i" as string]: 1 }}><T k="sh.idx.h" /></h1>
          <p className="palace-rise mt-5 max-w-3xl text-lg leading-relaxed text-slate-300" style={{ ["--i" as string]: 2 }}><T k="sh.idx.lead" /></p>
          <div className="palace-rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href="/pricing#lifetime" className="btn-royal btn-lg"><T k="sh.idx.cta" /></Link>
            <Link href="/register" className="btn-crystal btn-lg"><T k="site.getstarted" /></Link>
          </div>
          <ul className="palace-rise mt-10 grid max-w-4xl gap-3 text-sm text-slate-300 sm:grid-cols-2" style={{ ["--i" as string]: 4 }}>
            {FACTS.map((k) => <li key={k} className="flex gap-2.5"><span className="text-gold-300" aria-hidden="true">✦</span><T k={k} /></li>)}
          </ul>
        </div>
      </section>
      <section className="palace py-16" data-testid="sh-grid">
        <div className="palace-sky opacity-60" />
        <div className="container-page relative">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-white"><T k="lp.eco.self" /> <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-bold text-slate-300">{ECOSYSTEM_SELF.length}</span></h2>
            <Link href="/self-hosted-guide" className="text-sm font-semibold text-brand-300 hover:text-gold-200"><T k="sh.idx.guide" /> →</Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ECOSYSTEM_SELF.map((a, i) => <EcoTile key={a.slug} app={a} i={i} />)}
          </div>
        </div>
      </section>
    </>
  );
}
