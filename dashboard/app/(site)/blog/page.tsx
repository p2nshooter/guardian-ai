/* /blog — editorial index. Original articles on AI security, self-hosting,
 * BYOX, compliance and infrastructure. Static, indexable, internally linked. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Blog — AI security, self-hosting & BYOX",
  description: `${BLOG_POSTS.length} original articles on self-hosted AI security, bring-your-own-keys, compliance, incident response and AI infrastructure.`,
  path: "/blog",
  keywords: ["AI security blog", "self-hosted AI", "BYOK", "cybersecurity articles", "AI infrastructure"],
});
metadata.alternates = { ...(metadata.alternates || {}), types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "AXTO Blog" }] } };

const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default function BlogIndex() {
  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]),
        { "@context": "https://schema.org", "@type": "Blog", name: "AXTO Blog", url: absoluteUrl("/blog"),
          blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, datePublished: p.date, url: absoluteUrl(`/blog/${p.slug}`) })) },
      ]} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-14">
        <div className="container-page">
          <span className="badge-brand">Blog</span>
          <h1 className="h-display mt-4 max-w-3xl">Ideas on AI security & self-hosting</h1>
          <p className="lead mt-4 max-w-3xl">Original, practical writing on running AI on your own infrastructure — security, privacy, compliance and cost.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="container-page grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 60}>
              <Link href={`/blog/${p.slug}`} className="card-pad flex h-full flex-col no-underline transition hover:shadow-lift">
                <div className="flex items-center gap-2 text-xs text-slate-500"><span className="badge-gray">{p.tag}</span><span>{p.minutes} min</span></div>
                <h2 className="mt-2 font-semibold text-slate-900">{p.title}</h2>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{p.description}</p>
                <span className="mt-3 text-xs text-slate-400">{fmt(p.date)}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
