/* /blog/<slug> — one article. Renders the post body (## → h2) with Article
 * JSON-LD, breadcrumbs and related posts for internal linking. */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

const get = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = get((await params).slug);
  if (!p) return {};
  return pageMeta({ title: p.title, description: p.description, path: `/blog/${p.slug}`, type: "article", keywords: [p.tag.toLowerCase(), "AI security", "self-hosted AI"] });
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const p = get((await params).slug);
  if (!p) notFound();
  const related = BLOG_POSTS.filter((x) => x.slug !== p.slug && x.tag === p.tag).slice(0, 3);
  const fallback = related.length ? related : BLOG_POSTS.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description,
          datePublished: p.date, dateModified: p.date, url: absoluteUrl(`/blog/${p.slug}`), inLanguage: "en",
          author: { "@type": "Organization", name: SITE.name }, publisher: { "@id": `${SITE.url}/#organization` },
          mainEntityOfPage: absoluteUrl(`/blog/${p.slug}`), articleSection: p.tag, wordCount: p.body.join(" ").split(/\s+/).length },
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: p.title, path: `/blog/${p.slug}` }]),
      ]} />
      <article className="py-14">
        <div className="container-page max-w-3xl">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/blog" className="hover:text-brand-700">Blog</Link> / <span>{p.tag}</span></nav>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><span className="badge-brand">{p.tag}</span><span>{fmt(p.date)}</span><span>· {p.minutes} min read</span></div>
          <h1 className="h-display mt-3">{p.title}</h1>
          <p className="lead mt-4">{p.description}</p>
          <div className="prose-axto mt-8 space-y-4">
            {p.body.map((para, i) => para.startsWith("## ")
              ? <h2 key={i} className="mt-8 text-2xl font-bold text-slate-900">{para.slice(3)}</h2>
              : <p key={i} className="text-[15px] leading-relaxed text-slate-700">{para}</p>)}
          </div>
          <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Run AI on your own terms</h2>
            <p className="mt-1 text-sm text-slate-600">AXTO gives you world-class AI apps and self-hosted editions — on your own keys, your own data.</p>
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/register" className="btn-primary">Start free →</Link><Link href="/self-hosted" className="btn-secondary">Self-hosted editions</Link></div>
          </div>
        </div>
      </article>
      <section className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="container-page">
          <h2 className="text-lg font-bold text-slate-900">More articles</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {fallback.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="card-pad no-underline transition hover:shadow-lift">
                <span className="badge-gray">{r.tag}</span>
                <div className="mt-2 font-semibold text-slate-900">{r.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
