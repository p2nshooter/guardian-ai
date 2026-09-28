/* Shared layout for policy/legal pages — consistent, readable prose with a
 * breadcrumb, "last updated" line and section headings. Server component. */
import Link from "next/link";

export interface DocSection { h: string; p: string[] }

export function LegalDoc({ title, updated, intro, sections, contactEmail }: { title: string; updated: string; intro: string; sections: DocSection[]; contactEmail: string }) {
  return (
    <article className="py-14">
      <div className="container-page max-w-3xl">
        <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/" className="hover:text-brand-700">Home</Link> / <span>{title}</span></nav>
        <h1 className="h-display mt-4">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
        <p className="lead mt-5">{intro}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-slate-900">{s.h}</h2>
              <div className="mt-3 space-y-3">
                {s.p.map((para, j) => <p key={j} className="text-[15px] leading-relaxed text-slate-700">{para}</p>)}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Questions about this policy? Contact us at <a href={`mailto:${contactEmail}`} className="font-semibold text-brand-700">{contactEmail}</a>.
        </div>
      </div>
    </article>
  );
}
