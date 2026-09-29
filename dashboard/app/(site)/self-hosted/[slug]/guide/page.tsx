/* /self-hosted/<slug>/guide — installation guide for one self-hosted edition:
 * AXTO Setup, Docker by hand (air-gapped), online and offline (Lifetime)
 * activation, updates, data and troubleshooting. Static, indexable, and the
 * same content as the PDF guide (lib/product-guides.ts). */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { GUIDE_PRODUCTS, guideFor } from "@/lib/product-guides";
import { pageMeta, breadcrumbJsonLd, howToJsonLd } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDE_PRODUCTS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guideFor((await params).slug);
  if (!g) return {};
  return pageMeta({ title: g.title, description: g.summary, path: `/self-hosted/${g.slug}/guide`, keywords: [`${g.name} install`, `${g.name} docker`, "self-hosted AI install", "offline licence activation", "air-gapped AI"] });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideFor((await params).slug);
  if (!g) notFound();
  const path = `/self-hosted/${g.slug}/guide`;
  return (
    <>
      <JsonLd data={[
        howToJsonLd({ name: g.title, description: g.summary, path, steps: g.sections.map((s) => ({ name: s.title, text: s.steps.map((x) => x.text).join(" ") })) }),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Self-hosted", path: "/self-hosted" }, { name: g.name, path: `/self-hosted/${g.slug}` }, { name: "Installation guide", path }]),
      ]} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-14">
        <div className="container-page max-w-4xl">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/self-hosted">Self-hosted</Link> / <Link href={`/self-hosted/${g.slug}`}>{g.name}</Link> / <span>Installation guide</span>
          </nav>
          <h1 className="h-display mt-3">{g.title}</h1>
          <p className="lead mt-4">{g.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`/api/download/guide?product=${g.slug}&lang=en`} className="btn-secondary">⬇ PDF (English)</a>
            <a href={`/api/download/guide?product=${g.slug}&lang=id`} className="btn-secondary">⬇ PDF (Bahasa Indonesia)</a>
            <Link href="/pricing#lifetime" className="btn-ghost">Licences & pricing →</Link>
          </div>
        </div>
      </section>
      <div className="container-page grid max-w-5xl gap-10 py-12 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block" aria-label="On this page">
          <ol className="sticky top-24 space-y-2 text-sm">
            {g.sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-slate-600 no-underline hover:text-slate-900">{i + 1}. {s.title}</a></li>)}
          </ol>
        </nav>
        <article className="space-y-10">
          {g.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold text-slate-900">{i + 1}. {s.title}</h2>
              {s.intro ? <p className="mt-2 text-slate-600">{s.intro}</p> : null}
              <ol className="mt-4 space-y-3">
                {s.steps.map((st, j) => (
                  <li key={j} className="text-slate-700">
                    <span>{st.text}</span>
                    {st.code ? <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-slate-100"><code>{st.code}</code></pre> : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Need help? <Link href="/contact">Chat with us</Link> or e-mail <a href="mailto:hello@axto.io">hello@axto.io</a>.</p>
        </article>
      </div>
    </>
  );
}
