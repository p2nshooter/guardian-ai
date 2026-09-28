/* /self-hosted — showcase of the 10 self-hosted (Docker) editions. Each runs on
 * the customer's own infrastructure with a lifetime licence. Static + indexable. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Self-hosted editions — run AXTO on your own infrastructure",
  description: `${PRODUCT_CATALOG.length} self-hosted Docker editions — Guardian, Orchestra, Vault, Edge, SOC, Compliance, Sentinel, Antivirus, Studio and Legal. Your keys, your data, your servers. Lifetime licence.`,
  path: "/self-hosted",
  keywords: ["self-hosted AI", "on-premise AI security", "docker AI", "air-gapped AI", "sovereign AI", "lifetime licence"],
});

export default function SelfHostedIndex() {
  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Self-hosted", path: "/self-hosted" }]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: "AXTO self-hosted editions", url: absoluteUrl("/self-hosted"),
          hasPart: { "@type": "ItemList", numberOfItems: PRODUCT_CATALOG.length, itemListElement: PRODUCT_CATALOG.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/self-hosted/${p.slug}`) })) } },
      ]} />
      <section className="border-b border-white/10 bg-ink-950 py-16 text-white">
        <div className="container-page">
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-brand-300">SELF-HOSTED · LIFETIME LICENCE</span>
          <h1 className="h-display mt-4 max-w-3xl text-white">Run it all on your own infrastructure</h1>
          <p className="lead mt-4 max-w-3xl text-white/80">Ten AI editions packaged as Docker containers — cloud, on-prem or air-gapped. Your keys, your models, your data. No telemetry, no call-home.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-primary btn-lg">See lifetime pricing</Link>
            <Link href="/register" className="btn-lg rounded-xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10">Get started</Link>
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="container-page grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_CATALOG.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 60}>
              <Link href={`/self-hosted/${p.slug}`} className="card-pad flex h-full flex-col no-underline transition hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="text-3xl" aria-hidden="true">{p.emoji}</span>
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide" style={{ background: `${p.color}1c`, color: p.color }}>{p.badge}</span>
                </div>
                <h2 className="mt-3 font-bold text-slate-900">{p.name}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{p.tagline}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{p.hero}</p>
                <span className="mt-3 text-xs font-semibold text-brand-700">Learn more →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
