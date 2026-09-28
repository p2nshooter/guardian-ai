/* /prompts/<field> — one indexable page per professional field, listing every
 * prompt in it with links to each prompt's own page. Strong internal linking + CTA. */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { FIELDS, getField, promptsByField, LEVELS } from "@/lib/prompts/catalog";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return FIELDS.map((f) => ({ field: f.id }));
}

const LEVEL_BADGE: Record<string, string> = { basic: "badge-gray", pro: "badge-brand", premium: "badge-amber", elite: "badge-green" };

export async function generateMetadata({ params }: { params: Promise<{ field: string }> }): Promise<Metadata> {
  const f = getField((await params).field);
  if (!f) return {};
  const n = promptsByField(f.id).length;
  return pageMeta({
    title: `${f.name} AI prompts — ${n} ready-to-run templates`,
    description: `${n} expert, ready-to-run ${f.name.toLowerCase()} AI prompts you can fill in and run on any model. ${f.blurb}`,
    path: `/prompts/${f.id}`,
    keywords: [`${f.name.toLowerCase()} ai prompts`, `${f.name.toLowerCase()} chatgpt prompts`, "ai prompt templates", ...f.keywords],
  });
}

export default async function FieldPage({ params }: { params: Promise<{ field: string }> }) {
  const f = getField((await params).field);
  if (!f) notFound();
  const prompts = promptsByField(f.id);

  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Prompts", path: "/prompts" }, { name: f.name, path: `/prompts/${f.id}` }]),
        {
          "@context": "https://schema.org", "@type": "CollectionPage",
          name: `${f.name} AI prompts`, description: f.blurb, url: absoluteUrl(`/prompts/${f.id}`),
          hasPart: { "@type": "ItemList", numberOfItems: prompts.length, itemListElement: prompts.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.title, url: absoluteUrl(`/prompts/${p.field}/${p.id}`) })) },
        },
      ]} />

      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-14">
        <div className="container-page">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/prompts" className="hover:text-brand-700">Prompts</Link> / <span>{f.name}</span></nav>
          <div className="mt-4 text-3xl" aria-hidden="true">{f.icon}</div>
          <h1 className="h-display mt-3 max-w-3xl">{f.name} AI prompts</h1>
          <p className="lead mt-4 max-w-3xl">{f.blurb} {prompts.length} expert prompts you can fill in and run on your own AI in seconds.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register?next=/app/prompts" className="btn-primary btn-lg">Start free →</Link>
            <Link href="/prompts" className="btn-secondary btn-lg">All fields</Link>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map((p) => (
              <Link key={p.id} href={`/prompts/${p.field}/${p.id}`} className="card-pad flex flex-col transition hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className={LEVEL_BADGE[p.level]}>{p.level}</span>
                  <span className="text-xs text-slate-400">{p.variables.length} input{p.variables.length === 1 ? "" : "s"}</span>
                </div>
                <h2 className="mt-2 font-semibold text-slate-900">{p.title}</h2>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{p.summary}</p>
                <span className="mt-3 text-xs font-semibold text-brand-700">View prompt →</span>
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-slate-900">Browse other fields</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {FIELDS.filter((x) => x.id !== f.id).map((x) => (
                <Link key={x.id} href={`/prompts/${x.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-brand-300 hover:text-brand-700">{x.icon} {x.name}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-brand-600 py-14 text-white">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Every {f.name.toLowerCase()} prompt, on your own AI</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">Basic prompts are free. Unlock {LEVELS.slice(1).map((l) => l.name).join(", ")} levels and the whole library — no per-token fees, ever.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register?next=/app/prompts" className="btn-lg rounded-xl bg-white px-6 font-semibold text-brand-700 hover:bg-brand-50">Create free account</Link>
            <Link href="/pricing" className="btn-lg rounded-xl border border-white/40 px-6 font-semibold text-white hover:bg-white/10">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
