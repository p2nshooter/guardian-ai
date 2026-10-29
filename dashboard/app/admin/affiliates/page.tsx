/* Admin → Affiliates & payouts (docs/BUSINESS-MASTER-BLUEPRINT.md §7.1, §7.4, §8). Runs
 * by itself: commissions are held for the refund window, mature, and are gathered into
 * one payout per affiliate from the 5th of each month; PayPal payouts can go out on
 * their own. The owner's touches are here: the one approval for a wire or USDT payout
 * (reveal the destination — audited — send it, mark it paid), a look at a large or
 * flagged commission, suspending or banning an affiliate, and running the month's
 * payouts early. Every action is in the audit log. */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, StatusBadge } from "@/components/ui";

type Row = Record<string, any> & { id: string };
interface Data {
  affiliates: { active: Row[]; suspended: Row[]; banned: Row[] };
  commissions: { review: Row[]; held: Row[]; payable: Row[] };
  payouts: { approval: Row[]; processing: Row[]; failed: Row[]; paid: Row[] };
  totals: { held: number; payable: number; awaiting: number; paid: number };
  detail: null | { affiliate: Row; stats: Record<string, number>; referrals: Row[]; commissions: Row[]; payouts: Row[] };
}

const usd = (n: number) => `US$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) => (iso ? String(iso).slice(0, 10) : "—");

export default function AdminAffiliatesPage() {
  const [d, setD] = useState<Data | null>(null);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [revealed, setRevealed] = useState<{ id: string; details: Record<string, string> } | null>(null);
  const load = useCallback(async (id = sel) => {
    const r = await api<Data>(`/api/admin/affiliates${id ? `?id=${encodeURIComponent(id)}` : ""}`);
    if (r.ok) setD(r.data); else setMsg({ tone: "error", text: r.error });
  }, [sel]);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const r = await api<Data & { run?: Record<string, number>; details?: Record<string, string> }>(`/api/admin/affiliates${sel ? `?id=${encodeURIComponent(sel)}` : ""}`, { body });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return null; }
    if (r.data.affiliates) setD(r.data);
    setMsg({ tone: "success", text: done });
    return r.data;
  }
  async function reveal(affId: string) {
    if (!confirm("Show this affiliate's payout destination? It is decrypted for you and the view is written to the audit log.")) return;
    const r = await act({ action: "reveal_payout", id: affId }, "Payout destination shown (audited).");
    if (r?.details) setRevealed({ id: affId, details: r.details });
  }
  async function paid(p: Row) {
    const reference = prompt(`Mark ${usd(p.amount_usd)} to ${p.label} as SENT. Transfer reference / transaction hash:`, "");
    if (reference === null) return;
    await act({ action: "payout_paid", id: p.id, reference }, `Payout ${p.id} marked paid.`);
    setRevealed(null);
  }
  async function failed(p: Row) {
    const reason = prompt("Why could this payout not be made? Its commissions return to the next payout.", "");
    if (!reason) return;
    await act({ action: "payout_failed", id: p.id, reason }, `Payout ${p.id} marked failed; its commissions return to the next payout.`);
  }
  async function status(a: Row, s: "active" | "suspended" | "banned") {
    const note = prompt(`Set ${a.email} to ${s.toUpperCase()}. Reason, for the record:`, "");
    if (note === null) return;
    await act({ action: "set_status", id: a.id, status: s, note }, `${a.email}: ${s}.`);
  }
  async function runPayouts() {
    if (!confirm("Make this month's payouts now (normally from the 5th)? Matured commissions are gathered per affiliate; PayPal ones go out by themselves if enabled.")) return;
    const r = await act({ action: "run_payouts" }, "Payout run finished.");
    if (r?.run) setMsg({ tone: "success", text: `Payout run: ${r.run.matured} matured, ${r.run.payouts} payouts created, ${r.run.paid} paid by PayPal, ${r.run.failed} failed.` });
  }

  if (!d) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const all = [...d.affiliates.active, ...d.affiliates.suspended, ...d.affiliates.banned];
  const name = (id: string) => all.find((a) => a.id === id)?.email || id;

  return (
    <>
      <PageHeader eyebrow="Business" title="Affiliates & payouts" description="Commissions are held for the refund window, then paid monthly from the 5th. Money only leaves by itself through PayPal Payouts; wire and USDT payouts wait for your one approval here."
        actions={<button className="btn-secondary" disabled={busy} onClick={runPayouts} data-testid="aff-run">Run this month's payouts now</button>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="aff-summary">
        {([["Affiliates", String(d.affiliates.active.length)], ["Held (refund window)", usd(d.totals.held)], ["Ready for payout", usd(d.totals.payable)], ["Waiting for your approval", usd(d.totals.awaiting)], ["Paid (recent)", usd(d.totals.paid)]] as [string, string][]).map(([k, v]) => (
          <div key={k} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div><div className="mt-1 text-lg font-extrabold text-slate-900">{v}</div></div>
        ))}
      </div>

      <div className="space-y-5">
        <Section title="Payouts waiting for your approval" description="Reveal the destination, send the money, then mark it paid with the reference.">
          {!d.payouts.approval.length && !d.payouts.failed.length ? <p className="text-sm text-slate-500">Nothing to approve.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[720px]" data-testid="aff-approvals">
                <thead><tr><th>Month</th><th>Affiliate</th><th>To</th><th className="text-right">Amount</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {[...d.payouts.approval, ...d.payouts.failed].map((p) => (
                    <tr key={p.id}>
                      <td>{p.period}</td><td>{name(p.affiliate_id)}</td><td>{p.label}</td><td className="text-right font-semibold">{usd(p.amount_usd)}</td>
                      <td><StatusBadge status={p.status === "failed" ? "failed" : "pending"} label={p.status} /></td>
                      <td className="whitespace-nowrap text-right">
                        {p.status === "approval" ? <>
                          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => reveal(p.affiliate_id)} data-testid="aff-reveal">Reveal destination</button>
                          <button className="btn-primary btn-sm" disabled={busy} onClick={() => paid(p)} data-testid="aff-mark-paid">Mark paid</button>
                          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => failed(p)}>Failed</button>
                        </> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {revealed ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm" data-testid="aff-revealed">
              <div className="font-semibold text-amber-900">Destination of {name(revealed.id)}</div>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(revealed.details).map(([k, v]) => <div key={k}><dt className="inline text-slate-500">{k}: </dt><dd className="inline font-mono">{v}</dd></div>)}</dl>
              <button className="btn-secondary btn-sm mt-3" onClick={() => setRevealed(null)}>Hide</button>
            </div>
          ) : null}
        </Section>

        <Section title="Commissions waiting for a look" description="Large commissions and sign-ups from the affiliate's own network. Approve → it continues its hold; reject → reversed.">
          {!d.commissions.review.length ? <p className="text-sm text-slate-500">Nothing to review.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[640px]" data-testid="aff-reviews">
                <thead><tr><th>Date</th><th>Affiliate</th><th>Kind</th><th className="text-right">Amount</th><th>Payable from</th><th /></tr></thead>
                <tbody>
                  {d.commissions.review.map((c) => (
                    <tr key={c.id}>
                      <td>{day(c.created_at)}</td><td>{name(c.affiliate_id)}</td><td>{c.kind}</td><td className="text-right font-semibold">{usd(c.amount_usd)}</td><td>{day(c.hold_until)}</td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn-primary btn-sm" disabled={busy} onClick={() => act({ action: "review", id: c.id, approve: true }, "Commission approved.")} data-testid="aff-approve">Approve</button>
                        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act({ action: "review", id: c.id, approve: false }, "Commission rejected.")}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Affiliates" description="Click one to see its sign-ups, commissions and payouts.">
          {!all.length ? <p className="text-sm text-slate-500">No affiliates yet.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[720px]" data-testid="aff-list">
                <thead><tr><th>Joined</th><th>Affiliate</th><th>Code</th><th>Payout</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {all.map((a) => (
                    <tr key={a.id} className={sel === a.id ? "bg-amber-50/60" : ""}>
                      <td>{day(a.created_at)}</td>
                      <td><button className="text-left font-semibold text-brand-700 hover:underline" onClick={() => setSel(sel === a.id ? "" : a.id)}>{a.email}</button><div className="text-xs text-slate-500">{a.name}</div></td>
                      <td><code>{a.code}</code></td><td>{a.payout_method || "—"}</td>
                      <td><StatusBadge status={d.affiliates.active.includes(a) ? "active" : d.affiliates.suspended.includes(a) ? "suspended" : "revoked"} label={d.affiliates.active.includes(a) ? "active" : d.affiliates.suspended.includes(a) ? "suspended" : "banned"} /></td>
                      <td className="whitespace-nowrap text-right">
                        {!d.affiliates.active.includes(a) ? <button className="btn-ghost btn-sm" disabled={busy} onClick={() => status(a, "active")}>Reactivate</button> : <button className="btn-ghost btn-sm" disabled={busy} onClick={() => status(a, "suspended")}>Suspend</button>}
                        {!d.affiliates.banned.includes(a) ? <button className="btn-ghost btn-sm text-rose-700" disabled={busy} onClick={() => status(a, "banned")}>Ban</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {d.detail ? (
          <Section title={`Affiliate ${d.detail.affiliate.email}`} description={`Code ${d.detail.affiliate.code} · terms ${d.detail.affiliate.terms_version} accepted ${day(d.detail.affiliate.accepted_at)}${d.detail.affiliate.note ? ` · note: ${d.detail.affiliate.note}` : ""}`}>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="aff-detail">
              {([["Clicks (30 d)", String(d.detail.stats.clicks30)], ["Sign-ups", String(d.detail.stats.referrals)], ["Paying customers", String(d.detail.stats.customers)], ["Held", usd(d.detail.stats.held)], ["Ready", usd(d.detail.stats.payable)], ["Paid", usd(d.detail.stats.paid)]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div><div className="mt-1 font-extrabold text-slate-900">{v}</div></div>
              ))}
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="overflow-x-auto">
                <div className="mb-2 text-sm font-semibold text-slate-700">Sign-ups</div>
                <table className="table"><thead><tr><th>Date</th><th>E-mail</th><th>Until</th><th>Flag</th></tr></thead>
                  <tbody>{d.detail.referrals.map((r) => <tr key={r.id}><td>{day(r.attributed_at)}</td><td>{r.email}</td><td>{day(r.until)}</td><td>{r.flagged || "—"}</td></tr>)}</tbody></table>
              </div>
              <div className="overflow-x-auto">
                <div className="mb-2 text-sm font-semibold text-slate-700">Commissions</div>
                <table className="table"><thead><tr><th>Date</th><th>Order</th><th>Kind</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
                  <tbody>{d.detail.commissions.map((c) => <tr key={c.id}><td>{day(c.created_at)}</td><td className="font-mono text-xs">{c.order_id}</td><td>{c.kind}</td><td className="text-right">{usd(c.amount_usd)}</td><td>{c.status}</td></tr>)}</tbody></table>
              </div>
            </div>
          </Section>
        ) : null}

        <Section title="Recent payouts">
          {![...d.payouts.processing, ...d.payouts.paid].length ? <p className="text-sm text-slate-500">No payouts yet.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[640px]" data-testid="aff-paid">
                <thead><tr><th>Month</th><th>Affiliate</th><th>To</th><th className="text-right">Amount</th><th>Reference</th><th>Status</th></tr></thead>
                <tbody>{[...d.payouts.processing, ...d.payouts.paid].map((p) => <tr key={p.id}><td>{p.period}</td><td>{name(p.affiliate_id)}</td><td>{p.label}</td><td className="text-right">{usd(p.amount_usd)}</td><td className="font-mono text-xs">{p.reference || "—"}</td><td>{p.status}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
