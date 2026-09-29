/* Lifetime (offline) licence price table — server-rendered with the default
 * prices (SEO), then refreshed with the admin's live prices, like PricingTable. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LIFETIME_TIERS, LIFETIME_INCLUDES, type LifetimeTier } from "@/lib/lifetime";

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function LifetimePricing() {
  const [tiers, setTiers] = useState<LifetimeTier[]>(LIFETIME_TIERS);
  useEffect(() => {
    fetch("/api/billing/options").then((r) => r.json()).then((j) => { if (Array.isArray(j?.lifetime?.tiers)) setTiers(j.lifetime.tiers); }).catch(() => {});
  }, []);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="table min-w-[520px]">
          <thead><tr><th>Devices (per app)</th><th>One app</th><th>Suite — all 10 apps</th></tr></thead>
          <tbody>{tiers.map((t) => (
            <tr key={t.devices}><td className="font-medium text-slate-900">{t.devices === 1 ? "1 device" : `Up to ${t.devices}`}</td><td>{fmt(t.app)}</td><td>{fmt(t.suite)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card-pad">
        <div className="font-semibold text-slate-900">One-time payment, yours forever</div>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">{LIFETIME_INCLUDES.map((x) => <li key={x} className="flex gap-2"><span className="text-brand-600">✓</span>{x}</li>)}</ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/register?redirect=/app/lifetime" className="btn-primary">Buy a lifetime licence</Link>
          <Link href="/contact" className="btn-secondary">Request a quotation</Link>
        </div>
      </div>
    </div>
  );
}
