/* Grid of the cloud apps — used on the homepage and /apps. */
import Link from "next/link";
import { CLOUD_APPS } from "@/lib/apps";

export default function AppGrid({ dark = false }: { dark?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CLOUD_APPS.map((a) => (
        <Link key={a.slug} href={`/apps/${a.slug}`}
          className={`group relative flex flex-col rounded-2xl border p-6 no-underline transition-all hover:-translate-y-0.5 ${dark ? "border-white/10 bg-white/[.03] hover:border-brand-400/40 hover:bg-white/[.06]" : "border-slate-200 bg-white shadow-card hover:shadow-lift"}`}>
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${a.color}18` }} aria-hidden="true">{a.icon}</span>
            {a.live ? <span className="badge-green">Available</span> : <span className={dark ? "badge bg-white/10 text-slate-300" : "badge-gray"}>Coming soon</span>}
          </div>
          <h3 className={`mt-4 text-lg font-bold ${dark ? "text-white" : ""}`}>{a.name}</h3>
          <p className={`mt-1.5 flex-1 text-sm leading-relaxed ${dark ? "text-slate-400" : "text-slate-600"}`}>{a.short}</p>
          <span className={`mt-4 text-sm font-semibold ${dark ? "text-brand-300" : "text-brand-700"}`}>Learn more →</span>
        </Link>
      ))}
    </div>
  );
}
