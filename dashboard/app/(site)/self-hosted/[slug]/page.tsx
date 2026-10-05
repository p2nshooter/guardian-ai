/* /self-hosted/<slug> — one self-hosted edition. Hero, sovereignty (BYOX)
 * principles, benefits, capabilities and related editions, with a lifetime CTA.
 * "Crystal Palace" hero in the app's own colour (docs/BLUEPRINT-V4.md §18). */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import AppIcon from "@/components/site/AppIcon";
import ShTagline from "@/components/site/ShTagline";
import EditionsPublic from "@/components/site/EditionsPublic";
import T from "@/components/site/T";
import { APP_COLORS } from "@/lib/ecosystem";
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
  const color = APP_COLORS[p.slug] || p.color;
  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: p.name.startsWith("AXTO") ? p.name : `AXTO ${p.name}`, description: p.hero, path: `/self-hosted/${p.slug}`, category: "SecurityApplication" }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Self-hosted", path: "/self-hosted" }, { name: p.name, path: `/self-hosted/${p.slug}` }]),
      ]} />
      <section className="palace py-16 sm:py-20" data-testid="sh-detail-hero">
        <div className="palace-sky" /><div className="palace-stars" /><div className="palace-floor" />
        <div className="pointer-events-none absolute -right-24 top-0 -z-10 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl" style={{ background: color }} />
        <div className="container-page relative">
          <nav className="text-sm text-slate-400" aria-label="Breadcrumb"><Link href="/self-hosted" className="text-slate-400 no-underline hover:text-white"><T k="site.selfhosted" /></Link> / <span className="text-slate-200">{p.name}</span></nav>
          <div className="palace-rise mt-6 flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15" style={{ background: `${color}22`, color, boxShadow: `0 0 40px -8px ${color}` }}><AppIcon slug={p.slug} kind="self" size={32} /></span>
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-bold tracking-[0.14em] text-slate-200">{p.badge}</span>
          </div>
          <h1 className="palace-rise mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-6xl" style={{ ["--i" as string]: 1 }}>{p.name}</h1>
          <p className="palace-rise mt-3 text-lg font-medium text-gold-100" style={{ ["--i" as string]: 2 }}><ShTagline slug={p.slug} fallback={p.tagline} /></p>
          <p className="palace-rise mt-4 max-w-3xl text-lg leading-relaxed text-slate-300" style={{ ["--i" as string]: 3 }}>{p.hero}</p>
          <ul className="palace-rise mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300" style={{ ["--i" as string]: 3 }}>
            {["Docker", "Windows", "Linux", "x86-64", "ARM64"].map((x) => <li key={x} className="rounded-md border border-white/15 bg-white/5 px-2 py-1">{x}</li>)}
          </ul>
          <div className="palace-rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 4 }}>
            <Link href="/pricing#lifetime" className="btn-royal btn-lg"><T k="sh.idx.cta" /></Link>
            <Link href={`/self-hosted/${p.slug}/guide`} className="btn-crystal btn-lg"><T k="sh.idx.guide" /></Link>
            <Link href="/register" className="btn-crystal btn-lg"><T k="site.getstarted" /></Link>
          </div>
        </div>
      </section>

      <EditionsPublic slug={p.slug} name={p.name} color={color} />

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold"><T k="sh.d.why" vars={{ name: p.name }} /></h2>
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
            <h2 className="text-2xl font-bold"><T k="sh.d.own" /></h2>
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
            <h2 className="text-2xl font-bold"><T k="sh.d.cap" /></h2>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {p.capabilities.map((c, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5 text-brand-600">✓</span>{c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {p.integrations.length ? (
        <section className="py-14">
          <div className="container-page">
            <h2 className="text-2xl font-bold"><T k="sh.d.works" /></h2>
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

      <section className="palace py-16">
        <div className="palace-sky" />
        <div className="container-page relative text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl"><T k="sh.d.lifeH" vars={{ name: p.name }} /></h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300"><T k="sh.d.lifeSub" /></p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="btn-royal btn-lg"><T k="sh.d.pricing" /></Link>
            <Link href="/contact" className="btn-crystal btn-lg"><T k="sh.d.sales" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
