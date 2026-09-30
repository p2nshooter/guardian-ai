/* ==============================================================================
 * Member: Plan & billing — choose a plan, pay (card, PayPal, Indonesian local
 * methods, crypto, BNI bank transfer), watch activation, download invoices.
 * Everything that can confirm itself does: card/PayPal/crypto activate the plan
 * and issue licences automatically; bank transfers are approved by the team.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatMoney, pick, statusLabel, type Key } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import PayPanel, { payFromCheckout, type Pay } from "@/components/app/PayPanel";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { L } from "@/lib/i18n-pages/billing";

interface Options { plans: { id: PlanId; name: string; monthly: number; yearly: number }[]; gateways: { id: string; label: string; methods: string; currency: string; test?: boolean }[]; usdIdr: number }
interface Overview { subscription: { plan: string; cycle: string; status: string; current_period_end: string } | null; orders: { id: string; invoice_no: string; plan: string; cycle: string; amount_usd: number; currency: string; amount_local: number; gateway: string; status: string; created_at: string; paid_at: string }[] }

const SH_APPS: [string, string][] = [["guardian", "Guardian AI"], ["orchestra", "Orchestra AI"], ["vault", "Vault"], ["edge", "Edge"], ["soc", "SOC"], ["compliance", "Compliance"], ["sentinel", "Sentinel"], ["antivirus", "Antivirus"], ["studio", "Studio"], ["legal", "Legal (self-hosted)"]];

function BillingInner() {
  const { lang, t: tg } = useI18n();
  const t = pick(L, lang);
  const { me, reload } = useMe();
  const q = useSearchParams();
  const [opts, setOpts] = useState<Options | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [plan, setPlan] = useState<PlanId | "">((PLAN_ORDER as string[]).includes(q.get("plan") || "") ? (q.get("plan") as PlanId) : "");
  const [gateway, setGateway] = useState("");
  const [apps, setApps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Pay | null>(null);

  const loadOv = useCallback(async () => { const r = await api<Overview>("/api/billing/overview"); if (r.ok) setOv(r.data); }, []);
  useEffect(() => {
    api<Options>("/api/billing/options").then((r) => { if (r.ok) { setOpts(r.data); setGateway(r.data.gateways[0]?.id || ""); } });
    loadOv();
    if (q.get("paid")) reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPaid = useCallback(() => { reload(); loadOv(); }, [reload, loadOv]);

  const price = (id: PlanId) => opts?.plans.find((p) => p.id === id) || { monthly: PLANS[id].monthly, yearly: PLANS[id].yearly };
  const selected = plan ? PLANS[plan] : null;
  const needApps = selected ? selected.limits.selfHostedApps > 0 : false;
  const amount = plan ? price(plan)[cycle] : 0;
  const gw = opts?.gateways.find((g) => g.id === gateway);
  const idr = useMemo(() => (opts && gw?.currency === "IDR" ? Math.round((amount * opts.usdIdr) / 1000) * 1000 : 0), [opts, gw, amount]);

  async function checkout() {
    if (!plan || !gateway) return;
    setBusy(true); setErr("");
    const r = await api<any>("/api/billing/checkout", { body: { plan, cycle, gateway, apps: needApps ? apps : undefined } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (r.data.url) { window.location.href = r.data.url; return; }
    setPay(payFromCheckout(r.data));
    loadOv();
    setTimeout(() => document.getElementById("pay-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  if (!opts || !me) return <LoadingBlock />;
  const sub = ov?.subscription;

  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="space-y-5">
        {q.get("welcome") ? <Alert tone="info">{t.welcome}</Alert> : null}
        {q.get("paid") ? <Alert tone="success">{t.paid}</Alert> : null}
        {q.get("canceled") ? <Alert tone="warn">{t.canceled}</Alert> : null}
        {q.get("error") ? <Alert tone="error">{tg("pay.error")}</Alert> : null}

        <Section title={t.current}>
          {sub && sub.status === "active" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl font-bold">{PLANS[sub.plan as PlanId]?.name || sub.plan}</span>
              <StatusBadge status={sub.status} label={statusLabel(tg, sub.status)} />
              <span className="text-sm text-slate-600">{t.until} <strong>{formatDate(sub.current_period_end, lang)}</strong> · {sub.cycle === "yearly" ? t.yearly : t.monthly}</span>
              <button className="btn-secondary btn-sm ml-auto" onClick={() => { setPlan(sub.plan as PlanId); document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); }}>{t.renew}</button>
            </div>
          ) : <p className="text-sm text-slate-600">{t.none}</p>}
        </Section>

        <section id="plans">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} onClick={() => setCycle(c)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${cycle === c ? "bg-ink-900 text-white" : "text-slate-600"}`}>
                  {c === "monthly" ? t.monthly : <>{t.yearly} <span className="ml-1 rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">{t.save}</span></>}
                </button>
              ))}
            </div>
            <Link href="/pricing" className="text-sm font-semibold">{t.compare} →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              const pr = price(id);
              const active = plan === id;
              return (
                <button key={id} onClick={() => { setPlan(id); setPay(null); setApps([]); setTimeout(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" }), 50); }}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-card transition ${active ? "border-brand-500 ring-2 ring-brand-500" : p.highlight ? "border-brand-300" : "border-slate-200 hover:border-slate-300"}`}>
                  {p.highlight ? <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">{t.popular}</span> : null}
                  <div className="text-lg font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{tg(`plan.${id}.bestFor` as Key)}</div>
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold text-slate-900">{formatMoney(cycle === "yearly" ? Math.round((pr.yearly / 12) * 100) / 100 : pr.monthly, "USD", lang)}</span>
                    <span className="text-sm text-slate-500">{t.perMo}</span>
                    {cycle === "yearly" ? <div className="text-xs text-slate-500">{formatMoney(pr.yearly, "USD", lang)}{t.perYr}</div> : null}
                  </div>
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">{p.features.slice(0, 7).map((f, i) => <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{tg(`plan.${id}.f${i + 1}` as Key)}</li>)}</ul>
                  <span className={`mt-5 w-full ${active ? "btn-primary" : p.highlight ? "btn-primary" : "btn-secondary"}`}>{active ? `✓ ${t.chosen}` : tg("price.choose", { name: p.name })}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-500">{t.trust.map((x) => <span key={x}>{x}</span>)}</div>
        </section>

        {selected ? (
          <div id="checkout">
            <Section title={`${t.step2} — ${selected.name} · ${formatMoney(amount, "USD", lang)}${cycle === "yearly" ? t.perYr : t.perMo}`}>
              {needApps ? (
                <div className="mb-5">
                  <div className="font-semibold text-slate-900">{t.pickApps} ({apps.length}/{selected.limits.selfHostedApps})</div>
                  <p className="text-xs text-slate-500">{t.pickAppsHint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SH_APPS.map(([slug, name]) => {
                      const on = apps.includes(slug);
                      return (
                        <button key={slug} type="button" onClick={() => setApps((a) => (on ? a.filter((x) => x !== slug) : a.length < selected.limits.selfHostedApps ? [...a, slug] : a))}
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-500 bg-brand-50 font-semibold text-brand-800" : "border-slate-300 bg-white text-slate-700"}`}>{on ? "✓ " : ""}{name}</button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {opts.gateways.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {opts.gateways.map((g) => (
                    <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                      <input type="radio" name="gw" className="mt-1" checked={gateway === g.id} onChange={() => { setGateway(g.id); setPay(null); }} />
                      <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>{g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{tg("pay.testMode")}</span> : null}</span>
                    </label>
                  ))}
                </div>
              ) : <Alert tone="warn">{t.noMethods}</Alert>}
              {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
              {!pay ? (
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                  {idr ? <span className="text-sm text-slate-600">≈ {formatMoney(idr, "IDR", lang)}</span> : null}
                  <button className="btn-primary btn-lg" onClick={checkout} disabled={busy || !gateway || (needApps && apps.length === 0)}>
                    {busy ? <><Spinner /> {t.paying}</> : <>{t.pay} {formatMoney(amount, "USD", lang)} →</>}
                  </button>
                </div>
              ) : null}
            </Section>
          </div>
        ) : null}

        {pay ? <PayPanel pay={pay} onBack={() => setPay(null)} onPaid={onPaid} paidText={t.paid} /> : null}

        <Section title={t.history}>
          {ov?.orders.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>{t.date}</th><th>{t.plan}</th><th>{t.method}</th><th>{t.total}</th><th>{t.status}</th><th /></tr></thead>
                <tbody>
                  {ov.orders.map((o) => (
                    <tr key={o.id}>
                      <td>{formatDate(o.created_at, lang)}</td>
                      <td>{o.plan === "lifetime" ? `${t.lifetime} · ${t.once}` : `${PLANS[o.plan as PlanId]?.name || o.plan} · ${o.cycle === "yearly" ? t.yearly : t.monthly}`}</td>
                      <td>{opts.gateways.find((g) => g.id === o.gateway)?.label || o.gateway}</td>
                      <td>{formatMoney(o.amount_usd, "USD", lang)}{o.amount_local ? <span className="block text-xs text-slate-500">{formatMoney(o.amount_local, "IDR", lang)}</span> : null}</td>
                      <td><StatusBadge status={o.status} label={statusLabel(tg, o.status)} /></td>
                      <td>{o.status === "paid" ? <a href={`/api/billing/invoice/${o.id}`} target="_blank" rel="noopener" className="text-sm font-semibold">{t.invoice}</a> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">{t.noOrders}</p>}
        </Section>
      </div>
    </>
  );
}

export default function BillingPage() {
  return <Suspense fallback={<LoadingBlock />}><BillingInner /></Suspense>;
}
