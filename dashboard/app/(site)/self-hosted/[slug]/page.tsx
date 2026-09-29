/* /self-hosted/<slug> — one self-hosted edition. Hero, sovereignty (BYOX)
 * principles, benefits, capabilities and related editions, with a lifetime CTA. */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { pageMeta, breadcrumbJsonLd, softwareJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return PRODUCT_CATALOG.map((p) => ({ slug: p.slug }));
}
const get = (slug: string) => PRODUCT_CATALOG.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = get((await params).slug);
  if (!p) return {};
  return pageMeta({ title: `${p.name} — ${p.tagline}`, description: p.hero, path: `/self-hosted/${p.slug}`, keywords: [p.name.toLowerCase(), "self-hosted", p.badge.toLowerCase(), "docker", "on-premise AI"] });
}

export default async function SelfHostedProduct({ params }: { params: Promise<{ slug: string }> }) {
  const p = get((await params).slug);
  if (!p) notFound();
  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: `AXTO ${p.name}`, description: p.hero, path: `/self-hosted/${p.slug}`, category: "SecurityApplication" }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Self-hosted", path: "/self-hosted" }, { name: p.name, path: `/self-hosted/${p.slug}` }]),
      ]} />
      <section className="border-b border-white/10 py-16 text-white" style={{ background: p.gradient }}>
        <div className="container-page">
          <nav className="text-sm text-white/60" aria-label="Breadcrumb"><Link href="/self-hosted" className="hover:text-white">Self-hosted</Link> / <span>{p.name}</span></nav>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">{p.emoji}</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">{p.badge}</span>
          </div>
          <h1 className="h-display mt-4 max-w-3xl text-white">{p.name}</h1>
          <p className="mt-2 text-lg font-medium text-white/70">{p.tagline}</p>
          <p className="lead mt-4 max-w-3xl text-white/85">{p.hero}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing#lifetime" className="btn-primary btn-lg">Lifetime pricing</Link>
            <Link href={`/self-hosted/${p.slug}/guide`} className="btn-lg rounded-xl border border-white/25 px-6 font-semibold text-white hover:bg-white/10">Installation guide</Link>
            <Link href="/register" className="btn-lg rounded-xl border border-white/25 px-6 font-semibold text-white hover:bg-white/10">Get started</Link>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Why {p.name}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {p.benefits.map((b, i) => (
              <Reveal key={i} delay={(i % 3) * 60} className="card-pad">
                <div className="text-2xl" aria-hidden="true">{b.icon}</div>
                <h3 className="mt-2 font-bold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{b.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">You own the whole stack</h2>
            <ul className="mt-6 space-y-4">
              {p.byox.map((b) => (
                <li key={b.key} className="flex gap-3">
                  <span className="rounded-md bg-brand-600 px-2 py-1 text-xs font-bold text-white">{b.key}</span>
                  <div><div className="font-semibold text-slate-900">{b.label}</div><p className="text-sm text-slate-600">{b.note}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Capabilities</h2>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {p.capabilities.map((c, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5 text-brand-600">✓</span>{c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {p.integrations.length ? (
        <section className="py-14">
          <div className="container-page">
            <h2 className="text-2xl font-bold">Works with</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.integrations.map((it) => (
                <Link key={it.slug} href={`/self-hosted/${it.slug}`} className="card-pad no-underline transition hover:shadow-lift">
                  <div className="flex items-center gap-2"><span className="text-xl" aria-hidden="true">{it.emoji}</span><span className="font-semibold text-slate-900">{it.name}</span></div>
                  <p className="mt-1 text-sm text-slate-600">{it.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-200 bg-brand-600 py-14 text-white">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Own {p.name} for life</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">One lifetime licence. Runs on your own servers — cloud, on-prem or air-gapped. Your keys, your data.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="btn-lg rounded-xl bg-white px-6 font-semibold text-brand-700 hover:bg-brand-50">See pricing</Link>
            <Link href="/contact" className="btn-lg rounded-xl border border-white/40 px-6 font-semibold text-white hover:bg-white/10">Talk to sales</Link>
          </div>
        </div>
      </section>
    </>
  );
}
