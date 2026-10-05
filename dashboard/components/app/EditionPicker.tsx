/* Buy one self-hosted app in an edition (docs/AXTO-APPS-BLUEPRINT.md §3):
 * monthly / yearly, the editions side by side with their translated features,
 * the payment methods that can carry the amount, then checkout. Hosted pages
 * redirect; bank transfer and crypto continue in the shared PayPanel. */
"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { Alert, Modal, Spinner } from "@/components/ui";
import PayPanel, { payFromCheckout, type Pay } from "@/components/app/PayPanel";
import { ED } from "@/lib/i18n-pages/editions";
import { featureText } from "@/lib/editions-text";
import { EDITION_ANY_GATEWAY_MAX, EDITION_LARGE_GATEWAYS, hasOwnName } from "@/lib/editions";

export interface PublicEdition { app: string; tier: "starter" | "professional" | "business" | "enterprise"; code: string; name: string; yearly: number; monthly: number; features: string[] }
interface Gateway { id: string; label: string; methods: string; currency: string; test?: boolean }


export default function EditionPicker({ open, onClose, app, appName, editions, currentCode, onPaid }: {
  open: boolean; onClose: () => void; app: string; appName: string; editions: PublicEdition[]; currentCode?: string; onPaid: () => void;
}) {
  const { lang } = useI18n();
  const t = ED[lang].ui;
  const list = useMemo(() => editions.filter((e) => e.app === app), [editions, app]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [code, setCode] = useState("");
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [cardMax, setCardMax] = useState(999_999);
  const [gateway, setGateway] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Pay | null>(null);

  useEffect(() => { if (open) { setPay(null); setErr(""); setCode(list.find((e) => e.tier === "professional")?.code || list[0]?.code || ""); } }, [open, list]);
  useEffect(() => { if (open && !gateways.length) api<{ gateways: Gateway[]; lifetime: { cardMaxUsd: number } }>("/api/billing/options").then((r) => { if (r.ok) { setGateways(r.data.gateways); setCardMax(r.data.lifetime?.cardMaxUsd || 999_999); } }); }, [open, gateways.length]);

  const chosen = list.find((e) => e.code === code);
  const amount = chosen ? (cycle === "yearly" ? chosen.yearly : chosen.monthly) : 0;
  const methods = useMemo(() => gateways.filter((g) => amount <= EDITION_ANY_GATEWAY_MAX || (EDITION_LARGE_GATEWAYS.includes(g.id) && (g.id !== "stripe" || amount <= cardMax))), [gateways, amount, cardMax]);
  useEffect(() => { if (!methods.some((m) => m.id === gateway)) setGateway(methods[0]?.id || ""); }, [methods, gateway]);

  async function checkout() {
    setBusy(true); setErr("");
    const r = await api<any>("/api/billing/checkout", { body: { kind: "edition", edition: code, cycle, gateway } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (r.data.url) { window.location.href = r.data.url; return; }
    setPay(payFromCheckout(r.data));
  }

  return (
    <Modal open={open} onClose={onClose} wide title={t.editionsOn.replace("{name}", appName)}
      footer={pay ? <button className="btn-ghost" onClick={onClose}>{t.close}</button> : (
        <>
          <button className="btn-ghost" onClick={onClose}>{t.close}</button>
          <button className="btn-primary" onClick={checkout} disabled={busy || !chosen || !gateway} data-testid="edition-pay">
            {busy ? <Spinner /> : null} {t.buy.replace("{amount}", formatMoney(amount, "USD", lang))} →
          </button>
        </>
      )}>
      {pay ? <PayPanel pay={pay} onBack={() => setPay(null)} onPaid={() => { onPaid(); }} paidText={t.paid} /> : (
        <div className="space-y-4" data-testid="edition-picker">
          <p className="text-sm text-slate-600">{t.editionsLead}</p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
            {(["monthly", "yearly"] as const).map((c) => (
              <button key={c} type="button" role="tab" aria-selected={cycle === c} onClick={() => setCycle(c)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${cycle === c ? "bg-ink-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
                {c === "monthly" ? t.monthly : t.yearly}{c === "yearly" ? <span className="ml-1.5 rounded bg-gold-100 px-1 text-[10px] font-bold text-gold-700">{t.save}</span> : null}
              </button>
            ))}
          </div>
          <div className={`grid gap-3 ${list.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {list.map((e) => {
              const sel = e.code === code;
              const price = cycle === "yearly" ? e.yearly : e.monthly;
              return (
                <button key={e.code} type="button" onClick={() => setCode(e.code)} data-testid={`edition-${e.code}`}
                  className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-300 ${sel ? "border-brand-500 bg-brand-50/50 shadow-lift ring-1 ring-brand-500" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-lift"} ${e.tier === "enterprise" ? "before:absolute before:inset-x-4 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-gold-400 before:to-transparent" : ""}`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{hasOwnName(e) ? e.name : t.tiers[e.tier]}</span>
                  <span className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoney(price, "USD", lang)}</span>
                  <span className="text-xs text-slate-500">{cycle === "yearly" ? t.perYear : t.perMonth}</span>
                  <ul className="mt-3 flex-1 space-y-1.5 text-[13px] text-slate-700">
                    {e.features.map((f) => <li key={f} className="flex gap-1.5"><span className="text-brand-600">✓</span>{featureText(lang, f)}</li>)}
                  </ul>
                  {currentCode === e.code ? <span className="mt-3 badge-brand self-start">{t.current}</span> : <span className={`mt-3 text-sm font-semibold ${sel ? "text-brand-700" : "text-slate-500"}`}>{sel ? `✓ ${t.chosen}` : t.choose}</span>}
                </button>
              );
            })}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{t.payMethod}</div>
            {methods.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {methods.map((g) => (
                  <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                    <input type="radio" name="ed-gw" className="mt-1" checked={gateway === g.id} onChange={() => setGateway(g.id)} />
                    <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>{g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">TEST</span> : null}</span>
                  </label>
                ))}
              </div>
            ) : <div className="mt-2"><Alert tone="warn">{t.noMethods}</Alert></div>}
            {amount > EDITION_ANY_GATEWAY_MAX ? <p className="mt-2 text-xs text-slate-500">{t.largeOnly.replace("{max}", formatMoney(EDITION_ANY_GATEWAY_MAX, "USD", lang))}</p> : null}
          </div>
          <p className="text-xs text-slate-500">{t.renewNote}</p>
          {err ? <Alert tone="error">{err}</Alert> : null}
        </div>
      )}
    </Modal>
  );
}
