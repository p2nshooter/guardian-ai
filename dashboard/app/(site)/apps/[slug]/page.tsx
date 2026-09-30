/* /apps/<slug> — one page per cloud app, with its how-to guide (static). */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { CLOUD_APPS, getCloudApp } from "@/lib/apps";
import { PLANS, planForApp, isPlanId } from "@/lib/plans";
import { pageMeta, breadcrumbJsonLd, howToJsonLd, softwareJsonLd } from "@/lib/seo";
import { catalogEntry } from "@/lib/selfhosted";
import Reveal from "@/components/site/Reveal";

export const dynamicParams = false;
export function generateStaticParams() {
  return CLOUD_APPS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getCloudApp((await params).slug);
  if (!a) return {};
  return pageMeta({ title: `${a.name} — ${a.short.replace(/\.$/, "")}`, description: a.hero.slice(0, 300), path: `/apps/${a.slug}`, keywords: a.keywords });
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getCloudApp((await params).slug);
  if (!a) notFound();
  const min = planForApp(a.slug);
  const sh = a.selfHosted ? catalogEntry(a.selfHosted) : undefined;
  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: `AXTO ${a.name}`, description: a.hero, path: `/apps/${a.slug}`, category: a.slug === "security" ? "SecurityApplication" : undefined,
          features: a.features.map((f) => `${f.title}: ${f.desc}`), offers: isPlanId(min) ? [{ name: `${PLANS[min].name} plan`, price: PLANS[min].monthly, period: "month" }] : [] }),
        howToJsonLd({ name: `How to use AXTO ${a.name}`, description: a.short, path: `/apps/${a.slug}`, steps: a.steps.map((s, i) => ({ name: `Step ${i + 1}`, text: s })) }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Apps", path: "/apps" }, { name: a.name, path: `/apps/${a.slug}` }]),
      ]} />
      <section className="border-b border-slate-200 py-16" style={{ background: `linear-gradient(180deg, ${a.color}10, #fff)` }}>
        <div className="container-page">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/apps">Apps</Link> / <span>{a.name}</span></nav>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: `${a.color}1c` }} aria-hidden="true">{a.icon}</span>
            {a.live ? <span className="badge-green">Available now</span> : <span className="badge-gray">Coming soon</span>}
          </div>
          <h1 className="h-display mt-5 max-w-3xl">{a.name}</h1>
          <p className="lead mt-5 max-w-3xl">{a.hero}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/register?next=/app/${a.slug}`} className="btn-primary btn-lg">Start with {isPlanId(min) ? PLANS[min].name : "a plan"}</Link>
            <Link href="/pricing" className="btn-secondary btn-lg">See pricing</Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">Included from the {isPlanId(min) ? PLANS[min].name : ""} plan · runs on your own AI key</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-bold">How to use {a.name}</h2>
            <ol className="mt-6 space-y-5">
              {a.steps.map((s, i) => (
                <Reveal key={i} as="li" delay={i * 80} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white anim-pulse-ring">{i + 1}</span>
                  <p className="pt-1 text-[15px] leading-relaxed text-slate-700">{s}</p>
                </Reveal>
              ))}
            </ol>
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-semibold">Good for</div>
              <ul className="mt-3 flex flex-wrap gap-2">{a.useCases.map((u) => <li key={u} className="badge-gray">{u}</li>)}</ul>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {a.features.map((f, i) => (
              <Reveal key={f.title} as="div" delay={i * 60} className="card-pad transition-shadow hover:shadow-lift">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {sh ? (
        <section className="border-t border-slate-200 bg-slate-50 py-12">
          <div className="container-page flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">Need it on your own servers?</div>
              <p className="mt-1 text-sm text-slate-600">{sh.name} is the self-hosted counterpart — Docker and Windows, included with Business and Enterprise.</p>
            </div>
            <Link href={`/self-hosted/${sh.slug}`} className="btn-secondary">View {sh.name} →</Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
