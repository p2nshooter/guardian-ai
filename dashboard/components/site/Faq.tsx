/* FAQ list (server) — pair with faqJsonLd() for rich results. With i18nPrefix,
 * each item renders `${prefix}.q<n>` / `${prefix}.a<n>` in the visitor's language. */
import T from "@/components/site/T";
export default function Faq({ items, i18nPrefix }: { items: { q: string; a: string }[]; i18nPrefix?: string }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((it, i) => (
        <details key={it.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-start justify-between gap-4 font-semibold text-slate-900">
            {i18nPrefix ? <T k={`${i18nPrefix}.q${i + 1}`} /> : it.q}<span className="mt-0.5 text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{i18nPrefix ? <T k={`${i18nPrefix}.a${i + 1}`} /> : it.a}</p>
        </details>
      ))}
    </div>
  );
}
