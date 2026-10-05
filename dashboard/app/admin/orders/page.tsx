/* Admin: orders & payments — check BNI receipts, approve (plan + licences activate at once)
 * or reject with a reason, refund, cancel stale orders. */
"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/i18n";
import { Alert, LoadingBlock, Modal, PageHeader, Spinner, StatusBadge } from "@/components/ui";

/** Orders created while a gateway ran in Sandbox mode (test money — excluded from revenue). */
const isTest = (o: { meta?: string }) => { try { return JSON.parse(o.meta || "{}").env === "sandbox"; } catch { return false; } };

interface Order { id: string; email: string; plan: string; cycle: string; amount_usd: number; amount_local: number; currency: string; gateway: string; gateway_ref: string; status: string; invoice_no: string; created_at: string; paid_at: string; meta: string }

function OrdersInner() {
  const q = useSearchParams();
  const [status, setStatus] = useState(q.get("status") || "");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ orders: Order[]; total: number } | null>(null);
  const [act, setAct] = useState<{ order: Order; action: "mark_paid" | "reject_proof" | "refund" | "cancel" } | null>(null);
  const [view, setView] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [endAccess, setEndAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ orders: Order[]; total: number }>(`/api/admin/orders?status=${encodeURIComponent(status === "review" ? "pending" : status)}&q=${encodeURIComponent(search)}`);
    if (r.ok) setData(r.data);
  }, [status, search]);
  useEffect(() => { load(); }, [load]);

  async function run() {
    if (!act) return;
    setBusy(true);
    const r = await api("/api/admin/orders", { body: { action: act.action, id: act.order.id, note, endAccess } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: act.action === "mark_paid" ? "Payment approved — plan activated, licences issued and visible in the member's dashboard." : act.action === "reject_proof" ? "Proof rejected — the member was e-mailed the reason and can upload a new receipt." : "Done." } : { tone: "error", text: r.error });
    setAct(null); setNote(""); setEndAccess(false);
    load();
  }

  const meta = (o: Order): any => { try { return JSON.parse(o.meta || "{}"); } catch { return {}; } };
  const proof = (o: Order) => { const m = meta(o); return m.bank_proof?.reference || m.crypto?.proof?.tx || ""; };
  const receipt = (o: Order) => meta(o).bank_proof?.receipt as { name: string; type: string } | undefined;
  const rejected = (o: Order) => meta(o).bank_proof?.rejected as { reason: string } | undefined;
  const awaiting = (o: Order) => o.status === "pending" && !!meta(o).bank_proof && !rejected(o);
  const shown = data ? (status === "review" ? data.orders.filter(awaiting) : data.orders) : [];

  return (
    <>
      <PageHeader title="Orders & payments" description="Automatic methods activate by themselves. BNI transfers: open the receipt the member uploaded, check it against your bank app (paste the amount in the search box — the unique last 3 digits find the exact order), then approve — the plan and licences appear in the member's dashboard immediately — or reject with a reason." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "review", "pending", "paid", "failed", "refunded"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === s ? "bg-ink-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{s === "review" ? "Awaiting approval" : s || "All"}</button>
        ))}
        <input className="input ml-auto max-w-xs" placeholder="E-mail, order, invoice, tx — or paste a transfer amount (Rp 3.284.517)" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      {!data ? <LoadingBlock /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Created</th><th>Member</th><th>Plan</th><th>Amount</th><th>Method</th><th>Proof / ref</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{formatDate(o.created_at)}<span className="block text-[11px] text-slate-400">{o.id}</span></td>
                  <td>{o.email}</td>
                  <td className="capitalize">{o.plan} · {o.cycle}</td>
                  <td className="whitespace-nowrap">{formatMoney(o.amount_usd)}{o.amount_local ? <span className="block text-xs text-slate-500">{formatMoney(o.amount_local, "IDR")}</span> : null}</td>
                  <td>{o.gateway}{/"method"\s*:\s*"card"/.test(o.meta || "") ? <span className="badge-gray ml-1">card</span> : null}{isTest(o) ? <span className="badge-amber ml-1" title="Paid in the provider's sandbox — not revenue">TEST</span> : null}</td>
                  <td className="max-w-[220px] text-xs">
                    <span className="block truncate">{proof(o) || o.gateway_ref || "—"}</span>
                    {receipt(o) ? <button className="mt-1 font-semibold text-brand-700 underline" onClick={() => setView(o)}>🧾 View receipt</button> : null}
                    {rejected(o) ? <span className="badge-amber mt-1 block w-fit">Rejected: {rejected(o)!.reason}</span> : awaiting(o) ? <span className="badge-brand mt-1 block w-fit">Awaiting approval</span> : null}
                  </td>
                  <td><StatusBadge status={o.status} />{o.invoice_no ? <span className="block text-[11px] text-slate-400">{o.invoice_no}</span> : null}</td>
                  <td className="whitespace-nowrap text-right">
                    {o.status === "pending" ? <>
                      <button className="btn-primary btn-sm" onClick={() => setAct({ order: o, action: "mark_paid" })}>Approve</button>
                      {meta(o).bank_proof && !rejected(o) ? <button className="btn-ghost btn-sm text-amber-700" onClick={() => setAct({ order: o, action: "reject_proof" })}>Reject proof</button> : null}
                      <button className="btn-ghost btn-sm" onClick={() => setAct({ order: o, action: "cancel" })}>Cancel</button>
                    </> : o.status === "paid" ? <>
                      <a className="btn-ghost btn-sm" href={`/api/billing/invoice/${o.id}`} target="_blank" rel="noopener">Invoice</a>
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => setAct({ order: o, action: "refund" })}>Refund</button>
                    </> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length ? <p className="p-5 text-sm text-slate-500">No orders.</p> : null}
        </div>
      )}
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.action === "mark_paid" ? "Approve payment" : act?.action === "reject_proof" ? "Reject transfer proof" : act?.action === "refund" ? "Record a refund" : "Cancel order"}
        footer={<><button className="btn-ghost" onClick={() => setAct(null)}>Close</button><button className={act?.action === "refund" ? "btn-danger" : "btn-primary"} onClick={run} disabled={busy}>{busy ? <Spinner /> : null} Confirm</button></>}>
        {act ? (
          <div className="space-y-3 text-sm">
            <p><strong>{act.order.email}</strong> — {act.order.plan} · {act.order.cycle} · {formatMoney(act.order.amount_usd)}{act.order.amount_local ? ` (${formatMoney(act.order.amount_local, "IDR")})` : ""}</p>
            {act.action === "mark_paid" ? <Alert tone="info">Approving activates the plan immediately, issues any self-hosted licences (they appear in the member's dashboard at once) and e-mails the invoice.</Alert> : null}
            {act.action === "reject_proof" ? <Alert tone="warn">The order stays open. The member sees this reason on the payment screen, gets it by e-mail and can upload a new receipt.</Alert> : null}
            <label className="block"><span className="label">{act.action === "reject_proof" ? "Reason (required, shown to the member)" : "Note (e.g. bank reference)"}</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            {act.action === "refund" ? <label className="flex items-center gap-2"><input type="checkbox" checked={endAccess} onChange={(e) => setEndAccess(e.target.checked)} /> Also end the member's access now</label> : null}
          </div>
        ) : null}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Receipt — ${view.id}` : ""}
        footer={<>{view ? <a className="btn-ghost" href={`/api/admin/orders/receipt?id=${encodeURIComponent(view.id)}`} target="_blank" rel="noopener">Open in a new tab</a> : null}
          {view && view.status === "pending" ? <><button className="btn-ghost text-amber-700" onClick={() => { setAct({ order: view, action: "reject_proof" }); setView(null); }}>Reject proof</button>
          <button className="btn-primary" onClick={() => { setAct({ order: view, action: "mark_paid" }); setView(null); }}>Approve</button></> : null}</>}>
        {view ? (
          <div className="space-y-3 text-sm">
            <p><strong>{view.email}</strong> — {view.plan} · {view.cycle} · {formatMoney(view.amount_usd)}{view.amount_local ? ` (${formatMoney(view.amount_local, "IDR")})` : ""}</p>
            {receipt(view)?.type === "application/pdf"
              ? <iframe title="Receipt" className="h-[60vh] w-full rounded-lg border border-slate-200" src={`/api/admin/orders/receipt?id=${encodeURIComponent(view.id)}`} />
              : <img alt="Transfer receipt" className="max-h-[60vh] w-full rounded-lg border border-slate-200 object-contain" src={`/api/admin/orders/receipt?id=${encodeURIComponent(view.id)}`} />}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default function AdminOrders() { return <Suspense fallback={<LoadingBlock />}><OrdersInner /></Suspense>; }
