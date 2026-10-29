/* Member: Affiliate — the member's affiliate account (docs/BUSINESS-MASTER-BLUEPRINT.md
 * §7.1, §7.4): join in one click (the terms version is recorded), the personal link,
 * clicks, sign-ups and paying customers, every commission with its state and the
 * date it becomes payable, how payouts are made (stored encrypted, shown masked) and
 * the payouts themselves. Referred members appear only as a masked address.
 * In all 10 languages (lib/i18n-pages/partners.ts). */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { Alert, CopyButton, LoadingBlock, PageHeader, Section, Spinner, Stat } from "@/components/ui";
import { usePartnersCopy, fill } from "@/components/site/partners-i18n";

type Method = "paypal" | "usdt" | "wire";
interface Terms { commissionPct: number; months: number; partnerFeePct: number; holdDays: number; cookieDays: number; minPayoutUsd: number }
interface Data {
  shown: boolean; open: boolean; frozen?: boolean; admin: boolean; terms: Terms | null; termsVersion: string;
  affiliate: null | { code: string; status: "active" | "suspended" | "banned"; link: string; payoutMethod: "" | Method; payoutLabel: string; acceptedAt: string };
  stats?: { clicks30: number; referrals: number; customers: number; held: number; payable: number; paid: number };
  referrals?: { email: string; at: string; until: string }[];
  commissions?: { id: string; kind: "customer" | "partner_fee" | "clawback"; amountUsd: number; status: "held" | "review" | "payable" | "paid" | "reversed"; holdUntil: string; at: string }[];
  payouts?: { id: string; period: string; amountUsd: number; label: string; status: "approval" | "processing" | "paid" | "failed"; paidAt: string; at: string }[];
}

const BADGE: Record<string, string> = { held: "badge-amber", review: "badge-amber", payable: "badge-green", paid: "badge-green", reversed: "badge-gray", approval: "badge-amber", processing: "badge-amber", failed: "badge-red" };

export default function AffiliatePortal() {
  const { t: all, lang, money } = usePartnersCopy();
  const t = all.me;
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => api<Data>("/api/affiliate").then((r) => (r.ok ? setD(r.data) : setError(r.error))), []);
  useEffect(() => { load(); }, [load]);

  const [accept, setAccept] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  async function join() {
    setJoining(true); setJoinErr("");
    const r = await api("/api/affiliate", { body: { action: "join", accept } });
    setJoining(false);
    if (r.ok) load(); else setJoinErr(r.data?.code === "closed" ? t.closed : r.data?.code === "admin" ? t.admin : r.error);
  }

  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<Method>("paypal");
  const [p, setP] = useState({ paypalEmail: "", usdtAddress: "", bankName: "", bankHolder: "", bankAccount: "", bankSwift: "", bankCountry: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function savePayout(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg(null);
    const r = await api("/api/affiliate", { method: "PUT", body: { payout: { method, ...p } } });
    setSaving(false);
    if (r.ok) { setSaveMsg({ ok: true, text: t.saved }); setEditing(false); setP({ paypalEmail: "", usdtAddress: "", bankName: "", bankHolder: "", bankAccount: "", bankSwift: "", bankCountry: "" }); load(); }
    else setSaveMsg({ ok: false, text: r.error });
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!d) return <LoadingBlock />;
  const terms = d.terms;
  const v = terms ? { pct: String(terms.commissionPct), months: String(terms.months), hold: String(terms.holdDays), min: money(terms.minPayoutUsd), version: d.termsVersion } : { pct: "", months: "", hold: "", min: "", version: d.termsVersion };
  const a = d.affiliate;

  if (!a) {
    return (
      <>
        <PageHeader eyebrow="AXTO" title={t.title} description={terms ? fill(t.lead, v) : undefined} />
        {d.admin ? <Alert tone="info">{t.admin}</Alert>
          : !d.shown ? <Alert tone="info">{t.hidden}</Alert>
          : !d.open ? <Alert tone="warn">{t.closed}</Alert>
          : (
            <Section title={t.joinTitle} description={t.joinB}>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={accept} onChange={(e) => setAccept(e.target.checked)} data-testid="aff-accept" />
                <span>{fill(t.accept, v)} <Link href="/affiliate" prefetch={false} target="_blank" className="font-semibold">{t.termsLink}</Link></span>
              </label>
              {joinErr ? <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{joinErr}</p> : null}
              <button type="button" className="btn-primary mt-5" disabled={!accept || joining} onClick={join} data-testid="aff-join">{joining ? <><Spinner /> {t.joining}</> : t.join}</button>
            </Section>
          )}
      </>
    );
  }

  const s = d.stats!;
  return (
    <>
      <PageHeader eyebrow="AXTO" title={t.title} description={terms ? fill(t.lead, v) : undefined} />
      <div className="space-y-6">
        {a.status === "suspended" ? <Alert tone="warn">{t.suspended}</Alert> : a.status === "banned" ? <Alert tone="error">{t.banned}</Alert> : null}
        {d.frozen ? <Alert tone="warn">{t.frozen}</Alert> : null}

        <Section title={t.linkTitle} description={fill(t.code, { code: a.code })}>
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" data-testid="aff-link">{a.link}</code>
            <CopyButton text={a.link} label={t.copy} done={t.copied} className="btn-primary" />
          </div>
          <p className="mt-3 text-xs text-slate-500">{fill(t.shareHint, { code: a.code })}</p>
        </Section>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6" data-testid="aff-stats">
          <Stat label={t.stats.clicks} value={s.clicks30.toLocaleString()} />
          <Stat label={t.stats.signups} value={s.referrals.toLocaleString()} />
          <Stat label={t.stats.customers} value={s.customers.toLocaleString()} />
          <Stat label={t.stats.held} value={money(s.held)} />
          <Stat label={t.stats.payable} value={money(s.payable)} />
          <Stat label={t.stats.paid} value={money(s.paid)} />
        </div>

        <Section title={t.payoutTitle} description={terms ? fill(t.payoutNote, v) : undefined}
          actions={a.payoutMethod && !editing ? <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>{t.change}</button> : undefined}>
          {saveMsg ? <div className="mb-4"><Alert tone={saveMsg.ok ? "success" : "error"}>{saveMsg.text}</Alert></div> : null}
          {a.payoutMethod && !editing ? (
            <p className="text-sm text-slate-700" data-testid="aff-payout-current">{fill(t.payoutCurrent, { label: a.payoutLabel })}</p>
          ) : (
            <form onSubmit={savePayout} className="space-y-4" data-testid="aff-payout-form">
              {!a.payoutMethod ? <p className="text-sm text-slate-600">{t.payoutNone}</p> : null}
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {(["paypal", "usdt", "wire"] as Method[]).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={method === m ? "btn-primary btn-sm" : "btn-secondary btn-sm"} data-testid={`aff-method-${m}`}>{t.methods[m]}</button>
                ))}
              </div>
              {method === "paypal" ? (
                <label className="block text-sm font-semibold text-slate-700">{t.paypalEmail}<input className="input mt-1" type="email" value={p.paypalEmail} onChange={(e) => setP({ ...p, paypalEmail: e.target.value })} autoComplete="email" data-testid="aff-paypal" /></label>
              ) : method === "usdt" ? (
                <label className="block text-sm font-semibold text-slate-700">{t.usdtAddress}<input className="input mt-1 font-mono" value={p.usdtAddress} onChange={(e) => setP({ ...p, usdtAddress: e.target.value })} spellCheck={false} /></label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {([["bankName", t.bankName], ["bankHolder", t.bankHolder], ["bankAccount", t.bankAccount], ["bankSwift", t.bankSwift], ["bankCountry", t.bankCountry]] as [keyof typeof p, string][]).map(([k, label]) => (
                    <label key={k} className="block text-sm font-semibold text-slate-700">{label}<input className="input mt-1" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} spellCheck={false} /></label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={saving} data-testid="aff-payout-save">{saving ? t.saving : t.save}</button>
                {a.payoutMethod ? <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setSaveMsg(null); }}>{t.cancel}</button> : null}
              </div>
            </form>
          )}
        </Section>

        <Section title={t.commTitle}>
          {!d.commissions?.length ? <p className="text-sm text-slate-500">{t.commEmpty}</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[560px]" data-testid="aff-commissions">
                <thead><tr><th>{t.cols.date}</th><th>{t.cols.kind}</th><th className="text-right">{t.cols.amount}</th><th>{t.cols.status}</th><th>{t.cols.until}</th></tr></thead>
                <tbody>
                  {d.commissions.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.at, lang)}</td><td>{t.kinds[c.kind]}</td>
                      <td className={`text-right font-semibold ${c.amountUsd < 0 ? "text-rose-700" : ""}`}>{money(c.amountUsd)}</td>
                      <td><span className={BADGE[c.status] || "badge-gray"}>{t.statuses[c.status]}</span></td>
                      <td>{c.status === "held" || c.status === "review" ? formatDate(c.holdUntil, lang) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={t.refTitle}>
            {!d.referrals?.length ? <p className="text-sm text-slate-500">{t.refEmpty}</p> : (
              <ul className="divide-y divide-slate-100" data-testid="aff-referrals">
                {d.referrals.map((r, i) => <li key={`${r.email}-${i}`} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm"><span className="font-medium text-slate-800">{r.email}</span><span className="text-slate-500">{formatDate(r.at, lang)} · {fill(t.refUntil, { date: formatDate(r.until, lang) })}</span></li>)}
              </ul>
            )}
          </Section>
          <Section title={t.payTitle}>
            {!d.payouts?.length ? <p className="text-sm text-slate-500">{t.payEmpty}</p> : (
              <ul className="divide-y divide-slate-100" data-testid="aff-payouts">
                {d.payouts.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="text-slate-700">{t.period} {x.period.slice(0, 4)}-{x.period.slice(4)} · {x.label}</span>
                    <span className="flex items-center gap-2"><b>{money(x.amountUsd)}</b><span className={BADGE[x.status] || "badge-gray"}>{t.payStatuses[x.status]}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
