/* /developers body — AXTO Connect for visitors, in English or Indonesian following
 * the site language (other languages read English). Rendered statically in English
 * first so crawlers and a cold load see the full content. */
"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { DEVCOPY, DEV_SNIPPET } from "@/lib/developers-copy";

export interface DevPlanRow { id: string; name: string; apiKeys: number; apiRpm: number; webhooks: number }

export default function DevelopersPublic({ base, plans }: { base: string; plans: DevPlanRow[] }) {
  const { lang } = useI18n();
  const c = DEVCOPY[lang === "id" ? "id" : "en"];
  return (
    <>
      <section className="surface-ink relative overflow-hidden">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="container-page relative py-16 sm:py-20">
          <div className="eyebrow text-brand-300">{c.eyebrow}</div>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold text-white sm:text-5xl">{c.title}</h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">{c.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register?plan=starter&next=%2Fapp%2Fdevelopers%3Ftab%3Dkeys" className="btn-primary btn-lg">{c.ctaKeys} →</Link>
            <Link href="/pricing" className="btn-secondary btn-lg">{c.ctaPricing}</Link>
            <a href="/api/v1/openapi.json" className="btn-ghost btn-lg text-slate-200">OpenAPI</a>
            <a href="/api/v1/axto.proto" className="btn-ghost btn-lg text-slate-200">.proto</a>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-2xl font-bold">{c.transportsTitle}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{c.th.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {c.transports.map(([name, use, ep]) => (
                <tr key={name}><td className="px-4 py-3 font-semibold">{name}</td><td className="px-4 py-3 text-slate-600">{use}</td><td className="px-4 py-3 font-mono text-xs text-slate-700">{ep}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">{c.honestTitle}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{c.honest.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      </section>

      <section className="container-page pb-14">
        <h2 className="text-2xl font-bold">{c.startTitle}</h2>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-ink-900 p-5 text-[13px] leading-relaxed text-slate-100"><code>{DEV_SNIPPET(base)}</code></pre>
      </section>

      <section className="container-page pb-14">
        <h2 className="text-2xl font-bold">{c.securityTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.security.map(([t, d]) => (
            <div key={t} className="card-pad"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <h2 className="text-2xl font-bold">{c.limitsTitle}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{c.limitsTh.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id}><td className="px-4 py-3 font-semibold">{p.name}</td><td className="px-4 py-3">{p.apiKeys}</td><td className="px-4 py-3">{p.apiRpm.toLocaleString("en-US")}</td><td className="px-4 py-3">{p.webhooks}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-page pb-20">
        <h2 className="text-2xl font-bold">{c.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {c.faq.map(([q, a]) => (
            <details key={q} className="card-pad"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-slate-600">{a}</p></details>
          ))}
        </div>
      </section>
    </>
  );
}
