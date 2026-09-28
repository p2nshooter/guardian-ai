/* Admin → Plans & pricing. Override the monthly / yearly price of each plan.
 * Checkout, the public pricing table and invoices all read these prices, so the
 * site and the payment page can never disagree. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, Spinner } from "@/components/ui";

interface PlanRow { id: string; name: string; headline: string; highlight?: boolean; price: { monthly: number; yearly: number }; defaultPrice: { monthly: number; yearly: number } }
type Prices = Record<string, { monthly: string; yearly: string }>;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [prices, setPrices] = useState<Prices>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const r = await api<{ plans: PlanRow[] }>("/api/admin/plans");
    if (!r.ok) { setMsg({ tone: "error", text: r.error || "Could not load plans." }); return; }
    setPlans(r.data.plans);
    setPrices(Object.fromEntries(r.data.plans.map((p) => [p.id, { monthly: String(p.price.monthly), yearly: String(p.price.yearly) }])));
  };
  useEffect(() => { load(); }, []);

  async function save(next: Prices) {
    setBusy(true); setMsg(null);
    const body = Object.fromEntries(Object.entries(next).map(([id, v]) => [id, { monthly: Number(v.monthly), yearly: Number(v.yearly) }]));
    const r = await api("/api/admin/plans", { method: "PUT", body: { prices: body } });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: "Prices saved — checkout and the public pricing page use them immediately." }); load(); }
    else setMsg({ tone: "error", text: r.error || "Could not save prices." });
  }

  if (!plans) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const set = (id: string, k: "monthly" | "yearly", v: string) => setPrices({ ...prices, [id]: { ...prices[id], [k]: v.replace(/[^0-9.]/g, "") } });
  const resetDefaults = () => { const d = Object.fromEntries(plans.map((p) => [p.id, { monthly: String(p.defaultPrice.monthly), yearly: String(p.defaultPrice.yearly) }])); setPrices(d); };

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Plans & pricing"
        description="Set the price of every plan in USD. Indonesian methods convert at the USD→IDR rate from Settings. Changes apply to new orders immediately." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Monthly (USD)</th><th className="px-4 py-3">Yearly (USD)</th><th className="px-4 py-3">Yearly saving</th><th className="px-4 py-3">Default</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => {
              const m = Number(prices[p.id]?.monthly) || 0, y = Number(prices[p.id]?.yearly) || 0;
              const saving = m > 0 && y > 0 ? Math.round((1 - y / (m * 12)) * 100) : 0;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3"><div className="font-semibold text-slate-900">{p.name}{p.highlight ? <span className="badge-brand ml-2">popular</span> : null}</div><div className="text-xs text-slate-500">{p.headline}</div></td>
                  <td className="px-4 py-3"><input className="input w-32" inputMode="decimal" value={prices[p.id]?.monthly || ""} onChange={(e) => set(p.id, "monthly", e.target.value)} aria-label={`${p.name} monthly price`} /></td>
                  <td className="px-4 py-3"><input className="input w-32" inputMode="decimal" value={prices[p.id]?.yearly || ""} onChange={(e) => set(p.id, "yearly", e.target.value)} aria-label={`${p.name} yearly price`} /></td>
                  <td className="px-4 py-3">{saving > 0 ? <span className="badge-green">{saving}%</span> : <span className="text-xs text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">${p.defaultPrice.monthly} / ${p.defaultPrice.yearly}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy} onClick={() => save(prices)}>{busy ? <Spinner /> : null} Save prices</button>
        <button className="btn-secondary" disabled={busy} onClick={resetDefaults}>Reset to defaults</button>
      </div>
    </>
  );
}
