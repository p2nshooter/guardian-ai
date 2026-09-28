/* Admin: orders & payments — approve bank transfers, refund, cancel stale orders. */
"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/i18n";
import { Alert, LoadingBlock, Modal, PageHeader, Spinner, StatusBadge } from "@/components/ui";

interface Order { id: string; email: string; plan: string; cycle: string; amount_usd: number; amount_local: number; currency: string; gateway: string; gateway_ref: string; status: string; invoice_no: string; created_at: string; paid_at: string; meta: string }

function OrdersInner() {
  const q = useSearchParams();
  const [status, setStatus] = useState(q.get("status") || "");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ orders: Order[]; total: number } | null>(null);
  const [act, setAct] = useState<{ order: Order; action: "mark_paid" | "refund" | "cancel" } | null>(null);
  const [note, setNote] = useState("");
  const [endAccess, setEndAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ orders: Order[]; total: number }>(`/api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(search)}`);
    if (r.ok) setData(r.data);
  }, [status, search]);
  useEffect(() => { load(); }, [load]);

  async function run() {
    if (!act) return;
    setBusy(true);
    const r = await api("/api/admin/orders", { body: { action: act.action, id: act.order.id, note, endAccess } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: act.action === "mark_paid" ? "Payment approved — plan activated and licences issued." : "Done." } : { tone: "error", text: r.error });
    setAct(null); setNote(""); setEndAccess(false);
    load();
  }

  const proof = (o: Order) => { try { const m = JSON.parse(o.meta || "{}"); return m.bank_proof?.reference || m.crypto?.proof?.tx || ""; } catch { return ""; } };

  return (
    <>
      <PageHeader title="Orders & payments" description="Automatic methods activate by themselves. Approve bank transfers here after checking your BNI mutation." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "pending", "paid", "failed", "refunded"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === s ? "bg-ink-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{s || "All"}</button>
        ))}
        <input className="input ml-auto max-w-xs" placeholder="Search e-mail, order, invoice, tx…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      {!data ? <LoadingBlock /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Created</th><th>Member</th><th>Plan</th><th>Amount</th><th>Method</th><th>Proof / ref</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{formatDate(o.created_at)}<span className="block text-[11px] text-slate-400">{o.id}</span></td>
                  <td>{o.email}</td>
                  <td className="capitalize">{o.plan} · {o.cycle}</td>
                  <td className="whitespace-nowrap">{formatMoney(o.amount_usd)}{o.amount_local ? <span className="block text-xs text-slate-500">{formatMoney(o.amount_local, "IDR")}</span> : null}</td>
                  <td>{o.gateway}</td>
                  <td className="max-w-[200px] truncate text-xs">{proof(o) || o.gateway_ref || "—"}</td>
                  <td><StatusBadge status={o.status} />{o.invoice_no ? <span className="block text-[11px] text-slate-400">{o.invoice_no}</span> : null}</td>
                  <td className="whitespace-nowrap text-right">
                    {o.status === "pending" ? <>
                      <button className="btn-primary btn-sm" onClick={() => setAct({ order: o, action: "mark_paid" })}>Approve</button>
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
          {!data.orders.length ? <p className="p-5 text-sm text-slate-500">No orders.</p> : null}
        </div>
      )}
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.action === "mark_paid" ? "Approve payment" : act?.action === "refund" ? "Record a refund" : "Cancel order"}
        footer={<><button className="btn-ghost" onClick={() => setAct(null)}>Close</button><button className={act?.action === "refund" ? "btn-danger" : "btn-primary"} onClick={run} disabled={busy}>{busy ? <Spinner /> : null} Confirm</button></>}>
        {act ? (
          <div className="space-y-3 text-sm">
            <p><strong>{act.order.email}</strong> — {act.order.plan} · {act.order.cycle} · {formatMoney(act.order.amount_usd)}{act.order.amount_local ? ` (${formatMoney(act.order.amount_local, "IDR")})` : ""}</p>
            {act.action === "mark_paid" ? <Alert tone="info">Approving activates the plan immediately, issues any self-hosted licences and e-mails the invoice.</Alert> : null}
            <label className="block"><span className="label">Note (e.g. bank reference)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            {act.action === "refund" ? <label className="flex items-center gap-2"><input type="checkbox" checked={endAccess} onChange={(e) => setEndAccess(e.target.checked)} /> Also end the member's access now</label> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default function AdminOrders() { return <Suspense fallback={<LoadingBlock />}><OrdersInner /></Suspense>; }
