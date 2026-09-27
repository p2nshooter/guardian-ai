/* ==============================================================================
 * Pricing table — server-rendered with the default prices (SEO), then refreshed
 * with the live prices the admin set (/api/billing/options), so the public
 * page and checkout never disagree.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLANS, PLAN_ORDER, defaultPrices, type PriceTable, type Cycle } from "@/lib/plans";

export default function PricingTable({ compact = false }: { compact?: boolean }) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [prices, setPrices] = useState<PriceTable>(defaultPrices());
  useEffect(() => {
    fetch("/api/billing/options").then((r) => r.json()).then((j) => {
      if (!Array.isArray(j?.plans)) return;
      const t = defaultPrices();
      for (const p of j.plans) if (t[p.id as keyof PriceTable]) t[p.id as keyof PriceTable] = { monthly: p.monthly, yearly: p.yearly };
      setPrices(t);
    }).catch(() => {});
  }, []);
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-card" role="tablist" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((c) => (
            <button key={c} role="tab" aria-selected={cycle === c} onClick={() => setCycle(c)}
              className={`rounded-full px-5 py-2 text-sm font-semibold ${cycle === c ? "bg-ink-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
              {c === "monthly" ? "Monthly" : "Yearly"}{c === "yearly" ? <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${cycle === c ? "bg-brand-400 text-ink-950" : "bg-brand-50 text-brand-700"}`}>2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const price = cycle === "yearly" ? prices[id].yearly : prices[id].monthly;
          return (
            <div key={id} className={`relative flex flex-col rounded-2xl border bg-white p-6 ${p.highlight ? "border-brand-500 shadow-lift ring-1 ring-brand-500" : "border-slate-200 shadow-card"}`}>
              {p.highlight ? <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Most popular</span> : null}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.bestFor}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">{fmt(price)}</span>
                <span className="text-sm text-slate-500">/{cycle === "yearly" ? "year" : "month"}</span>
              </div>
              {cycle === "yearly" ? <p className="mt-1 text-xs text-slate-500">≈ {fmt(Math.round((prices[id].yearly / 12) * 100) / 100)}/month</p> : <p className="mt-1 text-xs text-slate-500">Billed monthly, cancel anytime</p>}
              <p className="mt-4 text-sm text-slate-700">{p.headline}</p>
              {!compact ? (
                <ul className="mt-5 space-y-2.5 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600" aria-hidden="true">✓</span><span>{f}</span></li>)}
                </ul>
              ) : null}
              <Link href={`/register?plan=${id}&cycle=${cycle}`} className={`mt-6 ${p.highlight ? "btn-primary" : "btn-secondary"} w-full`}>Choose {p.name}</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
