/* Admin → Investors. The AXTO-only investor round on /invest: its terms (status,
 * round, minimum ticket, revenue pool, the WhatsApp given to applicants), every
 * application, and for each verified stake the month-by-month statement —
 * revenue, share due, paid, open — with "record payout" and "capital returned".
 * Verifying is the one manual step: only once the signed agreement and the
 * capital are both in. From that moment the investor's share is computed. */
"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import { pct, shareOf, type InvestOffer, type Investor, type Payout, type Statement } from "@/lib/invest-terms";

type Row = Investor & { payouts: Payout[]; statement: Statement | null };
interface Data { settings: InvestOffer; defaults: InvestOffer; raisedUsd: number; investors: Row[] }

const usd = (n: number) => `US$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => (iso ? iso.slice(0, 10) : "—");
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminInvestorsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [s, setS] = useState<InvestOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState("");
  const [pay, setPay] = useState({ period: thisMonth(), amount: "", reference: "" });
  const load = useCallback(async () => {
    const r = await api<Data>("/api/admin/investors");
    if (r.ok) { setD(r.data); setS(r.data.settings); } else setMsg({ tone: "error", text: r.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!s) return;
    setBusy(true); setMsg(null);
    const r = await api<{ settings: InvestOffer }>("/api/admin/investors", { method: "PUT", body: { settings: s } });
    setBusy(false);
    if (r.ok) { setS(r.data.settings); setMsg({ tone: "success", text: "Saved — /invest uses it immediately." }); load(); }
    else setMsg({ tone: "error", text: r.error });
  }
  async function setVisible(visible: boolean) {
    if (!confirm(visible
      ? "SHOW the investor round on axto.io? The footer link, the sitemap entry, /invest, applications and the member menu item appear for everyone."
      : "HIDE the investor round? /invest becomes a 404, the footer link, the sitemap entry and applications disappear. Existing investors keep their statement.")) return;
    setBusy(true); setMsg(null);
    const r = await api<{ settings: InvestOffer }>("/api/admin/investors", { method: "PUT", body: { visible } });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: visible ? "The investor round is now shown on axto.io." : "The investor round is now hidden on axto.io." }); load(); }
    else setMsg({ tone: "error", text: r.error });
  }
  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/investors", { body });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: done } : { tone: "error", text: r.error });
    if (r.ok) load();
    return r.ok;
  }
  async function verify(i: Row) {
    const capital = prompt(`Capital RECEIVED from ${i.name} (USD). Verify only once the signed agreement and the money are both in — the revenue share starts now.`, String(i.pledge_usd));
    if (!capital) return;
    const method = confirm("Received by bank wire? (Cancel = PayPal)") ? "wire" : "paypal";
    await act({ action: "verify", id: i.id, capital, method }, `${i.name}: capital verified — the share starts today.`);
  }
  async function close(i: Row, action: "decline" | "returned") {
    const note = prompt(action === "decline" ? `Decline ${i.name}'s application — reason, for the record:` : `Mark ${i.name}'s capital as RETURNED (the acquisition)? The revenue share ends today. Note / wire reference:`, "");
    if (note === null) return;
    await act({ action, id: i.id, note }, action === "decline" ? "Application declined." : "Capital marked as returned — the share has ended.");
  }
  async function payout(i: Row) {
    if (await act({ action: "payout", id: i.id, ...pay }, `Payout of ${usd(Number(pay.amount))} for ${pay.period} recorded.`)) setPay({ period: thisMonth(), amount: "", reference: "" });
  }

  if (!d || !s) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const set = (p: Partial<InvestOffer>) => setS({ ...s, ...p });
  const applied = d.investors.filter((i) => i.status === "applied");
  const stakes = d.investors.filter((i) => i.status === "verified" || i.status === "returned");
  const closed = d.investors.filter((i) => i.status === "declined");
  const total = (k: "totalDueUsd" | "totalPaidUsd" | "balanceUsd") => stakes.reduce((n, i) => n + (i.statement?.[k] || 0), 0);

  return (
    <>
      <PageHeader eyebrow="Business" title="Investors" description="The AXTO-only revenue-sharing round on /invest. xaa.es raises separately on its own site — nothing here is shared with it."
        actions={d.settings.visible ? <Link href="/invest" target="_blank" className="btn-secondary">Open /invest ↗</Link> : undefined} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      <div className="mb-5">
        <Section title="Visibility on axto.io" description="Shown by default (owner, 27 Oct 2026). While hidden there is no footer link and no sitemap entry, /invest is a noindex 404, the public API and applications are refused, and “Investment” shows in the member menu only for someone who already has a record here. Every change is in the audit log.">
          <div className="flex flex-wrap items-center gap-3" data-testid="inv-visibility">
            <StatusBadge status={d.settings.visible ? "active" : "inactive"} label={d.settings.visible ? "Shown" : "Hidden"} />
            {d.settings.visible
              ? <button className="btn-secondary" onClick={() => setVisible(false)} disabled={busy} data-testid="inv-hide">Hide the investor round</button>
              : <button className="btn-primary" onClick={() => setVisible(true)} disabled={busy} data-testid="inv-show">Show the investor round</button>}
          </div>
        </Section>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="inv-summary">
        {([
          ["Raised (verified)", `${usd(d.raisedUsd)} of ${usd(s.targetUsd)}`],
          ["Open applications", String(applied.length)],
          ["Share due to date", usd(total("totalDueUsd"))],
          ["Paid to date", usd(total("totalPaidUsd"))],
          ["Still to pay", usd(total("balanceUsd"))],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div><div className="mt-1 text-lg font-extrabold text-slate-900">{v}</div></div>
        ))}
      </div>

      <Section title="Terms of the round">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm font-semibold text-slate-700">Status
            <select className="select mt-1" value={s.status} onChange={(e) => set({ status: e.target.value as InvestOffer["status"] })} data-testid="inv-status">
              <option value="open">Open — accepting applications</option><option value="paused">Paused</option><option value="closed">Closed — round complete</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Round (USD)
            <input className="input mt-1" inputMode="numeric" value={String(s.targetUsd)} onChange={(e) => set({ targetUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} data-testid="inv-target" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Minimum ticket (USD)
            <input className="input mt-1" inputMode="numeric" value={String(s.minUsd)} onChange={(e) => set({ minUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} data-testid="inv-min" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Revenue pool (% of every paid order)
            <input className="input mt-1" inputMode="decimal" value={String(s.poolPct)} onChange={(e) => set({ poolPct: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} data-testid="inv-pool" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">WhatsApp for applicants
            <input className="input mt-1" value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          With these terms the minimum ticket earns {pct(shareOf(s.minUsd, s))} of every paid AXTO order and the full round {pct(shareOf(s.targetUsd, s))}.
          Revenue = paid axto.io orders in USD from the day a stake is verified — never sandbox payments, refunds, investment or acquisition orders. The WhatsApp number is shown to an applicant only after they apply.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={save} disabled={busy} data-testid="inv-save">{busy ? <Spinner /> : null} Save</button>
          <button className="btn-secondary" onClick={() => setS({ ...d.defaults, status: s.status })} disabled={busy}>Reset to defaults</button>
        </div>
      </Section>

      <div className="mt-6">
        <Section title={`Applications (${applied.length})`} description="Send the memorandum, the NDA and the draft agreement. Verify only once the signed agreement and the capital have both arrived.">
          {!applied.length ? <p className="text-sm text-slate-500">No open applications.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[900px]">
                <thead><tr><th>Received</th><th>Applicant</th><th>Intends</th><th>Message</th><th /></tr></thead>
                <tbody>
                  {applied.map((i) => (
                    <tr key={i.id} data-testid="inv-applied">
                      <td className="text-xs">{i.created_at.slice(0, 16).replace("T", " ")}<div className="font-mono text-[11px] text-slate-400">{i.id}</div></td>
                      <td><div className="font-semibold">{i.name}</div><a className="text-xs" href={`mailto:${i.email}`}>{i.email}</a><div className="text-xs text-slate-500">{[i.company, i.country, i.lang.toUpperCase()].filter(Boolean).join(" · ")}</div></td>
                      <td>{usd(i.pledge_usd)}<div className="text-xs text-slate-500">{i.method === "paypal" ? "PayPal" : "Bank wire"} · {pct(shareOf(i.pledge_usd, s))}</div></td>
                      <td className="max-w-xs text-xs text-slate-600"><div className="line-clamp-3 whitespace-pre-line" title={i.message}>{i.message || "—"}</div></td>
                      <td className="whitespace-nowrap">
                        <button className="btn-primary btn-sm" onClick={() => verify(i)} disabled={busy} data-testid="inv-verify">Verify capital</button>{" "}
                        <button className="btn-ghost btn-sm" onClick={() => close(i, "decline")} disabled={busy}>Decline</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Stakes (${stakes.length})`} description="Each investor sees the same figures on /app/investor (signed in with the e-mail they applied with).">
          {!stakes.length ? <p className="text-sm text-slate-500">No verified stakes yet.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[980px]">
                <thead><tr><th>Investor</th><th>Capital</th><th>Share</th><th>Verified</th><th className="text-right">Due</th><th className="text-right">Paid</th><th className="text-right">Open</th><th /></tr></thead>
                <tbody>
                  {stakes.map((i) => {
                    const st = i.statement;
                    return (
                      <Fragment key={i.id}>
                        <tr data-testid="inv-stake">
                          <td><div className="font-semibold">{i.name}</div><div className="text-xs text-slate-500">{i.email}{i.company ? ` · ${i.company}` : ""}</div></td>
                          <td>{usd(i.capital_usd)}<div className="text-xs text-slate-500">{i.method === "paypal" ? "PayPal" : "Bank wire"}</div></td>
                          <td>{pct(st?.share || 0)}</td>
                          <td className="text-xs">{day(i.verified_at)}{i.returned_at ? <div><StatusBadge status="returned" label={`returned ${day(i.returned_at)}`} /></div> : null}</td>
                          <td className="text-right">{usd(st?.totalDueUsd || 0)}</td>
                          <td className="text-right">{usd(st?.totalPaidUsd || 0)}</td>
                          <td className="text-right font-semibold" data-testid="inv-open">{usd(st?.balanceUsd || 0)}</td>
                          <td className="whitespace-nowrap text-right">
                            <button className="btn-secondary btn-sm" onClick={() => { setOpen(open === i.id ? "" : i.id); setPay({ period: thisMonth(), amount: "", reference: "" }); }} data-testid="inv-manage">{open === i.id ? "Close" : "Statement & payouts"}</button>
                          </td>
                        </tr>
                        {open === i.id ? (
                          <tr><td colSpan={8} className="bg-slate-50">
                            <div className="grid gap-5 p-2 lg:grid-cols-2">
                              <div>
                                <div className="text-sm font-semibold text-slate-800">Month by month</div>
                                {!st?.months.length ? <p className="mt-1 text-sm text-slate-500">No paid AXTO revenue since the capital was verified.</p> : (
                                  <table className="table mt-2"><thead><tr><th>Month</th><th className="text-right">Revenue</th><th className="text-right">Due</th><th className="text-right">Paid</th><th /></tr></thead>
                                    <tbody>{st.months.map((m) => (
                                      <tr key={m.period}><td>{m.period}</td><td className="text-right">{usd(m.revenueUsd)}</td><td className="text-right">{usd(m.dueUsd)}</td><td className="text-right">{usd(m.paidUsd)}</td>
                                        <td>{m.dueUsd > m.paidUsd && i.status === "verified" ? <button className="btn-ghost btn-sm" onClick={() => setPay({ period: m.period, amount: String(Math.round((m.dueUsd - m.paidUsd) * 100) / 100), reference: "" })}>Pay</button> : null}</td></tr>
                                    ))}</tbody></table>
                                )}
                                {i.payouts.length ? <div className="mt-3 text-xs text-slate-500">Payouts: {i.payouts.map((p) => `${p.period} ${usd(p.amount_usd)}${p.reference ? ` (${p.reference})` : ""}`).join(" · ")}</div> : null}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800">Record a payout</div>
                                <div className="mt-2 flex flex-wrap items-end gap-2" data-testid="inv-payout">
                                  <label className="text-xs font-semibold text-slate-600">Month<input type="month" className="input mt-1" value={pay.period} onChange={(e) => setPay({ ...pay, period: e.target.value })} /></label>
                                  <label className="text-xs font-semibold text-slate-600">Paid (USD)<input className="input mt-1 w-32" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} data-testid="inv-payout-amount" /></label>
                                  <label className="text-xs font-semibold text-slate-600">Reference<input className="input mt-1 w-40" placeholder="wire / PayPal ref" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></label>
                                  <button className="btn-primary btn-sm" onClick={() => payout(i)} disabled={busy || !pay.amount} data-testid="inv-payout-save">Record payout</button>
                                </div>
                                {i.status === "verified" ? (
                                  <button className="btn-ghost btn-sm mt-4" onClick={() => close(i, "returned")} disabled={busy}>Mark capital returned (acquisition)</button>
                                ) : <p className="mt-4 text-xs text-slate-500">Capital returned {day(i.returned_at)}{i.note ? ` — ${i.note}` : ""}.</p>}
                              </div>
                            </div>
                          </td></tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {closed.length ? (
        <div className="mt-6">
          <Section title={`Declined (${closed.length})`}>
            <ul className="space-y-1 text-sm text-slate-600">{closed.map((i) => <li key={i.id}>{day(i.created_at)} · {i.name} &lt;{i.email}&gt; · {usd(i.pledge_usd)}{i.note ? ` — ${i.note}` : ""}</li>)}</ul>
          </Section>
        </div>
      ) : null}
    </>
  );
}
