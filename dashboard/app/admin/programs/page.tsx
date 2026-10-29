/* Admin → Partner programmes (docs/BUSINESS-MASTER-BLUEPRINT.md §3–§4). The three
 * programmes — affiliate, reseller, white label — each with its three switches:
 * shown on the site (default: shown), taking new members, frozen (emergency stop);
 * every number in §4 (fees, credit, tiers, commission, windows); and the reseller and
 * white-label applications. A hidden programme's pages are a 404 and it disappears
 * from the menu, the sitemap, llms.txt and the chat's knowledge. Every save is in
 * the audit log with what changed. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, StatusBadge } from "@/components/ui";
import type { ProgramId, Programs, Tier } from "@/lib/programs";

interface AppRow { id: string; email: string; name: string; company: string; country: string; status: "new" | "contacted" | "invited" | "declined"; created_at: string }
interface Data { programs: Programs; defaults: Programs; portal: Record<ProgramId, boolean>; counts: { affiliates: number; reseller: number; whitelabel: number }; applications: { reseller: AppRow[]; whitelabel: AppRow[] } }

const NAMES: Record<ProgramId, string> = { affiliate: "Affiliate", reseller: "Reseller", whitelabel: "White label" };
const PATHS: Record<ProgramId, string> = { affiliate: "/affiliate", reseller: "/resellers", whitelabel: "/white-label" };
const usd = (n: number) => `US$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

type NumKey<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
const FIELDS: { [P in ProgramId]: [NumKey<Programs[P]>, string, string?][] } = {
  affiliate: [
    ["commissionPct", "Commission on a referred customer's paid orders (%)", "0–50"],
    ["months", "…for this many months after sign-up", "1–60"],
    ["partnerFeePct", "Commission on a referred partner's entry fee, once (%)", "0–30"],
    ["holdDays", "Held for the refund window (days)", "14–120"],
    ["cookieDays", "Referral link remembered (days)", "1–365"],
    ["minPayoutUsd", "Minimum payout (USD)", "10–10,000"],
    ["reviewAboveUsd", "One admin look for a commission from (USD)", "internal — never shown"],
  ],
  reseller: [
    ["entryUsd", "Entry fee (USD)"], ["includedCreditUsd", "Credit included in the entry fee (USD)", "never above the fee"],
    ["annualUsd", "Annual fee from year two (USD)"], ["annualWaivedFromUsd", "Annual fee waived from 12-month purchases of (USD)"],
    ["mapPct", "Minimum advertised price: list minus (%)", "0–50"],
  ],
  whitelabel: [
    ["entryUsd", "Entry fee, first year (USD)"], ["includedCreditUsd", "Wholesale credit included (USD)", "never above the fee"],
    ["annualUsd", "Platform fee from year two (USD)"], ["annualReducedUsd", "Reduced platform fee (USD)"], ["annualReducedFromUsd", "…from 12-month purchases of (USD)"],
    ["minAnnualUsd", "Minimum purchases a year from year two (USD)", "a shortfall is issued as credit"],
    ["maxCombinedDiscountPct", "Combined discounts never above (%)", "0–90"],
    ["aiMarkup", "Manage AI wholesale = supplier cost ×", "internal — never shown"],
  ],
};

export default function AdminProgramsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [p, setP] = useState<Programs | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<Data>("/api/admin/programs");
    if (r.ok) { setD(r.data); setP(r.data.programs); } else setMsg({ tone: "error", text: r.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(next: Programs, done: string) {
    setBusy(true); setMsg(null);
    const r = await api<Data>("/api/admin/programs", { method: "PUT", body: { programs: next } });
    setBusy(false);
    if (r.ok) { setD(r.data); setP(r.data.programs); setMsg({ tone: "success", text: done }); }
    else setMsg({ tone: "error", text: r.error });
  }
  async function toggle(id: ProgramId, key: "visible" | "accepting" | "frozen") {
    if (!p) return;
    const on = !p[id][key];
    const what = key === "visible" ? (on ? "SHOW" : "HIDE") : key === "accepting" ? (on ? "OPEN to new members" : "CLOSE to new members") : (on ? "FREEZE" : "UNFREEZE");
    const note = key === "visible" && !on ? " Its pages become a 404 and it disappears from the menu, the sitemap, llms.txt and the chat. Existing members keep their portal."
      : key === "frozen" && on ? " New issuing and payouts stop; what exists keeps working." : "";
    if (!confirm(`${what} the ${NAMES[id]} programme?${note}`)) return;
    await save({ ...p, [id]: { ...p[id], [key]: on } }, `${NAMES[id]}: ${what.toLowerCase()} — saved.`);
  }
  async function mark(id: string, status: AppRow["status"]) {
    const note = prompt(`Mark this application as "${status}". Note for the record (optional):`, "");
    if (note === null) return;
    setBusy(true); setMsg(null);
    const r = await api<Data>("/api/admin/programs", { body: { action: "application", id, status, note } });
    setBusy(false);
    if (r.ok) { setD(r.data); setMsg({ tone: "success", text: `Application marked "${status}".` }); } else setMsg({ tone: "error", text: r.error });
  }

  if (!d || !p) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const setNum = (id: ProgramId, k: string, v: string) => setP({ ...p, [id]: { ...p[id], [k]: v === "" ? "" : Number(v) } } as Programs);
  const setTier = (id: "reseller" | "whitelabel", i: number, k: keyof Tier, v: string) => {
    const tiers = p[id].tiers.map((t, j) => (j === i ? { ...t, [k]: Number(v) } : t));
    setP({ ...p, [id]: { ...p[id], tiers } });
  };

  return (
    <>
      <PageHeader eyebrow="Business" title="Partner programmes" description="Affiliate, reseller and white label: what the site shows, who may join, the emergency stop and every number. Defaults come from the business master blueprint; partners always pay first (prepaid credit), there is no revenue share."
        actions={<Link href="/partners" target="_blank" className="btn-secondary">Open /partners ↗</Link>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3" data-testid="prog-summary">
        {([["Active affiliates", String(d.counts.affiliates)], ["Reseller applications", String(d.counts.reseller)], ["White-label applications", String(d.counts.whitelabel)]] as [string, string][]).map(([k, v]) => (
          <div key={k} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div><div className="mt-1 text-lg font-extrabold text-slate-900">{v}</div></div>
        ))}
      </div>

      <div className="space-y-5">
        {(["affiliate", "reseller", "whitelabel"] as ProgramId[]).map((id) => {
          const x = p[id];
          return (
            <Section key={id} title={`${NAMES[id]} programme`}
              description={d.portal[id] ? "Self-serve portal live." : "Portal opens in its build phase — the page takes applications until then; nobody is asked to pay."}
              actions={x.visible ? <Link href={PATHS[id]} target="_blank" className="btn-secondary btn-sm">Open {PATHS[id]} ↗</Link> : undefined}>
              <div className="flex flex-wrap items-center gap-2" data-testid={`prog-${id}-switches`}>
                <StatusBadge status={x.visible ? "active" : "canceled"} label={x.visible ? "Shown" : "Hidden"} />
                <StatusBadge status={x.accepting ? "active" : "pending"} label={x.accepting ? "Taking members" : "Closed to new members"} />
                {x.frozen ? <StatusBadge status="failed" label="Frozen" /> : null}
                <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:inline-block" />
                <button className="btn-secondary btn-sm" disabled={busy} onClick={() => toggle(id, "visible")} data-testid={`prog-${id}-visible`}>{x.visible ? "Hide" : "Show"}</button>
                <button className="btn-secondary btn-sm" disabled={busy} onClick={() => toggle(id, "accepting")} data-testid={`prog-${id}-accepting`}>{x.accepting ? "Close to new members" : "Open to new members"}</button>
                <button className={x.frozen ? "btn-primary btn-sm" : "btn-secondary btn-sm"} disabled={busy} onClick={() => toggle(id, "frozen")} data-testid={`prog-${id}-frozen`}>{x.frozen ? "Unfreeze" : "Freeze (emergency)"}</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS[id].map(([k, label, hint]) => (
                  <label key={String(k)} className="block text-sm font-semibold text-slate-700">{label}
                    <input className="input mt-1" type="number" step="any" min={0} value={String((x as any)[k] ?? "")} onChange={(e) => setNum(id, String(k), e.target.value)} data-testid={`prog-${id}-${String(k)}`} />
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">Default {String((d.defaults[id] as any)[k])}{hint ? ` · ${hint}` : ""}</span>
                  </label>
                ))}
                {id === "affiliate" ? (
                  <label className="flex items-start gap-2.5 text-sm text-slate-700 sm:col-span-2 lg:col-span-3">
                    <input type="checkbox" className="mt-0.5" checked={p.affiliate.paypalPayouts} onChange={(e) => setP({ ...p, affiliate: { ...p.affiliate, paypalPayouts: e.target.checked } })} data-testid="prog-affiliate-paypal" />
                    <span><b>PayPal Payouts run by themselves</b> — needs Payouts enabled on the PayPal app (Admin → Payment &amp; email). Wire and USDT payouts always wait for one approval in Admin → Affiliates.</span>
                  </label>
                ) : null}
              </div>
              {id !== "affiliate" ? (
                <div className="mt-5">
                  <div className="text-sm font-semibold text-slate-700">Wholesale tiers (12-month purchases → discount off list)</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {p[id].tiers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                        <span className="text-slate-500">from</span>
                        <input className="input w-28" type="number" min={0} value={t.fromUsd} disabled={i === 0} onChange={(e) => setTier(id, i, "fromUsd", e.target.value)} aria-label="From (USD)" />
                        <input className="input w-16" type="number" min={0} max={90} value={t.pct} onChange={(e) => setTier(id, i, "pct", e.target.value)} aria-label="Discount (%)" /><span>%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">The first tier starts at 0; thresholds rise and discounts never fall as volume rises — an invalid set keeps the saved one.</p>
                </div>
              ) : null}
            </Section>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => save(p, "Saved — the pages, the chat and the sitemap use it immediately.")} data-testid="prog-save">Save all numbers</button>
          <button className="btn-secondary" disabled={busy} onClick={() => { if (confirm("Put every number back to the blueprint defaults? The switches stay as they are.")) save({ ...d.defaults, affiliate: { ...d.defaults.affiliate, visible: p.affiliate.visible, accepting: p.affiliate.accepting, frozen: p.affiliate.frozen }, reseller: { ...d.defaults.reseller, visible: p.reseller.visible, accepting: p.reseller.accepting, frozen: p.reseller.frozen }, whitelabel: { ...d.defaults.whitelabel, visible: p.whitelabel.visible, accepting: p.whitelabel.accepting, frozen: p.whitelabel.frozen } }, "Numbers reset to the defaults."); }}>Reset numbers to defaults</button>
        </div>

        {(["reseller", "whitelabel"] as const).map((id) => (
          <Section key={id} title={`${NAMES[id]} applications`} description="One per member. When the portal opens, invite them first. Nobody has paid anything.">
            {!d.applications[id].length ? <p className="text-sm text-slate-500">No applications yet.</p> : (
              <div className="overflow-x-auto">
                <table className="table min-w-[720px]" data-testid={`prog-apps-${id}`}>
                  <thead><tr><th>Date</th><th>Name</th><th>Company</th><th>Country</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {d.applications[id].map((a) => (
                      <tr key={a.id}>
                        <td>{a.created_at.slice(0, 10)}</td>
                        <td><div className="font-semibold">{a.name}</div><div className="text-xs text-slate-500">{a.email}</div></td>
                        <td>{a.company}</td><td>{a.country}</td>
                        <td><StatusBadge status={a.status === "declined" ? "canceled" : a.status === "invited" ? "active" : "pending"} label={a.status} /></td>
                        <td className="whitespace-nowrap text-right">
                          {(["contacted", "invited", "declined"] as const).filter((s) => s !== a.status).map((s) => <button key={s} className="btn-ghost btn-sm" disabled={busy} onClick={() => mark(a.id, s)}>{s}</button>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        ))}
        <p className="text-xs text-slate-500">Entry fees, for reference: reseller {usd(p.reseller.entryUsd)} ({usd(p.reseller.includedCreditUsd)} credit) · white label {usd(p.whitelabel.entryUsd)} ({usd(p.whitelabel.includedCreditUsd)} credit).</p>
      </div>
    </>
  );
}
