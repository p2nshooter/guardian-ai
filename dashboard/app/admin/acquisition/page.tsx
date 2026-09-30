/* Admin → Site sale. The /acquire offer: price, status, automatic admin grant,
 * payment methods (each must also be live in Payment & email), the WhatsApp
 * number for receipts and the BNI receiving accounts — plus every acquisition
 * order, with "mark as paid" for a verified bank wire (which grants the buyer
 * administrator access like any other verified payment). */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import type { SaleSettings } from "@/lib/acquisition";

interface OrderRow { id: string; email: string; amountUsd: number; amountIdr: number; gateway: string; status: string; invoiceNo: string; createdAt: string; paidAt: string; env: string; buyer: { company?: string; name?: string; phone?: string; message?: string }; proof: any }
interface Data { settings: SaleSettings; defaults: SaleSettings; gateways: string[]; live: Record<string, string>; orders: OrderRow[] }

const LABEL: Record<string, string> = { paypal: "PayPal", nowpayments: "Crypto — NOWPayments", crypto: "Crypto — direct wallets", manual: "Bank wire (BNI)", stripe: "Card (Stripe)" };
const usd = (n: number) => `$${Number(n || 0).toLocaleString("en-US")}`;

export default function AdminAcquisitionPage() {
  const [d, setD] = useState<Data | null>(null);
  const [s, setS] = useState<SaleSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<Data>("/api/admin/acquisition");
    if (r.ok) { setD(r.data); setS(r.data.settings); } else setMsg({ tone: "error", text: r.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!s) return;
    setBusy(true); setMsg(null);
    const r = await api<{ settings: SaleSettings }>("/api/admin/acquisition", { method: "PUT", body: { settings: s } });
    setBusy(false);
    if (r.ok) { setS(r.data.settings); setMsg({ tone: "success", text: "Saved — /acquire uses it immediately." }); load(); }
    else setMsg({ tone: "error", text: r.error });
  }
  async function act(o: OrderRow, action: "mark_paid" | "refund" | "cancel") {
    const q = action === "mark_paid" ? `Mark ${o.id} as PAID? The buyer (${o.email}) becomes an administrator${s?.autoGrantAdmin ? "" : " (auto grant is off — you will grant it yourself)"}.`
      : action === "refund" ? `Refund ${o.id}? The buyer's administrator role is removed and the offer reopens.` : `Cancel ${o.id}?`;
    if (!confirm(q)) return;
    const note = action === "mark_paid" ? prompt("Bank reference (optional)") || "" : "";
    const r = await api("/api/admin/orders", { body: { action, id: o.id, note, endAccess: action === "refund" } });
    setMsg(r.ok ? { tone: "success", text: `Order ${o.id}: ${action.replace("_", " ")} done.` } : { tone: "error", text: r.error });
    load();
  }

  if (!d || !s) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const set = (p: Partial<SaleSettings>) => setS({ ...s, ...p });
  const setBank = (p: Partial<SaleSettings["bank"]>) => setS({ ...s, bank: { ...s.bank, ...p } });

  return (
    <>
      <PageHeader eyebrow="Business" title="Site sale" description="The public offer on /acquire. A verified payment makes the buyer an administrator automatically; the rest of the handover follows the checklist on the offer page."
        actions={<Link href="/acquire" target="_blank" className="btn-secondary">Open /acquire ↗</Link>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      {s.status === "sold" && s.soldTo ? <div className="mb-4"><Alert tone="success" title="Sold">To {s.soldTo.email}{s.soldTo.company ? ` (${s.soldTo.company})` : ""} · order {s.soldTo.orderId} · {s.soldTo.paidAt.slice(0, 10)}</Alert></div> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Offer">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Asking price (USD)
              <input className="input mt-1" inputMode="numeric" value={String(s.priceUsd)} onChange={(e) => set({ priceUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} data-testid="sale-price" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Status
              <select className="select mt-1" value={s.status} onChange={(e) => set({ status: e.target.value as SaleSettings["status"] })} data-testid="sale-status">
                <option value="open">Open — accepting payments</option><option value="paused">Paused</option><option value="sold">Sold</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">WhatsApp for receipts & handover
              <input className="input mt-1" value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="accent-brand-600" checked={s.autoGrantAdmin} onChange={(e) => set({ autoGrantAdmin: e.target.checked })} data-testid="sale-autogrant" />
              Grant administrator access automatically on verified payment
            </label>
          </div>
          <div className="mt-5 text-sm font-semibold text-slate-700">Payment methods on /acquire</div>
          <div className="mt-2 space-y-2">
            {d.gateways.map((g) => {
              const on = s.gateways.includes(g as any);
              const live = g === "manual" ? "BNI accounts below" : d.live[g] ? (d.live[g] === "sandbox" ? "active · SANDBOX (test money never grants admin)" : "active · live") : "not active in Payment & email";
              return (
                <label key={g} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" className="accent-brand-600" checked={on} onChange={() => set({ gateways: on ? s.gateways.filter((x) => x !== g) : [...s.gateways, g as any] })} />
                  <span className="font-semibold text-slate-900">{LABEL[g] || g}</span>
                  <span className={`ml-auto text-xs ${g === "manual" || d.live[g] === "live" ? "text-emerald-700" : "text-amber-700"}`}>{live}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">PayPal caps single payments for most accounts (typically $10,000–$60,000); buyers are told to use crypto or a wire for the full price if PayPal declines. Only verified live payments grant administrator access.</p>
        </Section>

        <Section title="BNI receiving accounts (bank wire)">
          <div className="grid gap-3 sm:grid-cols-2">
            {([["name", "Bank"], ["holder", "Beneficiary"], ["swift", "SWIFT / BIC"], ["code", "Bank code (Indonesia)"], ["branch", "Branch (optional)"]] as [keyof SaleSettings["bank"], string][]).map(([k, l]) => (
              <label key={k} className="block text-sm font-semibold text-slate-700">{l}
                <input className="input mt-1" value={String(s.bank[k] || "")} onChange={(e) => setBank({ [k]: e.target.value } as any)} />
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-700">Accounts per currency</div>
          <div className="mt-2 space-y-2">
            {s.bank.accounts.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className="input w-24 font-mono" value={a.currency} maxLength={3} onChange={(e) => setBank({ accounts: s.bank.accounts.map((x, j) => (j === i ? { ...x, currency: e.target.value.toUpperCase() } : x)) })} aria-label="Currency" />
                <input className="input flex-1 font-mono" value={a.number} onChange={(e) => setBank({ accounts: s.bank.accounts.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) })} aria-label="Account number" />
                <button type="button" className="btn-ghost btn-sm" onClick={() => setBank({ accounts: s.bank.accounts.filter((_, j) => j !== i) })} aria-label="Remove">✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={() => setBank({ accounts: [...s.bank.accounts, { currency: "USD", number: "" }] })}>＋ Add account</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Shown to a signed-in buyer only after they start a bank-wire checkout, with step-by-step transfer instructions and the WhatsApp link for the receipt.</p>
        </Section>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={save} disabled={busy} data-testid="sale-save">{busy ? <Spinner /> : null} Save</button>
        <button className="btn-secondary" onClick={() => setS({ ...d.defaults, status: s.status, soldTo: s.soldTo })} disabled={busy}>Reset to defaults</button>
      </div>

      <div className="mt-8">
        <Section title={`Acquisition orders (${d.orders.length})`}>
          {!d.orders.length ? <p className="text-sm text-slate-500">No acquisition orders yet.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[900px]">
                <thead><tr><th>Created</th><th>Buyer</th><th>Method</th><th>Amount</th><th>Status</th><th>Proof</th><th /></tr></thead>
                <tbody>
                  {d.orders.map((o) => (
                    <tr key={o.id} data-testid="sale-order">
                      <td className="text-xs">{o.createdAt.slice(0, 16).replace("T", " ")}<div className="font-mono text-[11px] text-slate-400">{o.id}</div></td>
                      <td><div className="font-semibold">{o.email}</div><div className="text-xs text-slate-500">{[o.buyer.name, o.buyer.company, o.buyer.phone].filter(Boolean).join(" · ")}</div>{o.buyer.message ? <div className="max-w-xs truncate text-xs text-slate-500" title={o.buyer.message}>“{o.buyer.message}”</div> : null}</td>
                      <td>{LABEL[o.gateway] || o.gateway}{o.env === "sandbox" ? <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">TEST</span> : null}</td>
                      <td>{usd(o.amountUsd)}{o.amountIdr ? <div className="text-xs text-slate-500">≈ Rp{Number(o.amountIdr).toLocaleString("id-ID")}</div> : null}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="max-w-[200px] truncate text-xs">{o.proof ? (o.proof.reference || o.proof.tx || JSON.stringify(o.proof)) : "—"}</td>
                      <td className="whitespace-nowrap">
                        {o.status === "pending" ? <><button className="btn-primary btn-sm" onClick={() => act(o, "mark_paid")} data-testid="sale-mark-paid">Mark paid</button> <button className="btn-ghost btn-sm" onClick={() => act(o, "cancel")}>Cancel</button></> : null}
                        {o.status === "paid" ? <button className="btn-ghost btn-sm" onClick={() => act(o, "refund")}>Refund</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
