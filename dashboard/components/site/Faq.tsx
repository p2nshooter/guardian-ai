/* FAQ list (server) — pair with faqJsonLd() for rich results. */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((it) => (
        <details key={it.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-start justify-between gap-4 font-semibold text-slate-900">
            {it.q}<span className="mt-0.5 text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
