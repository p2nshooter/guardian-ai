/* Admin → Site sale. The /acquire offer: auction or fixed price, the auction
 * (opening bid drawn in US$10M–100M or set, step, length, anti-snipe, payment
 * window, restart, bidder approval; the running round with its bids, approve or
 * refuse bidders, pass an unpaid win on, cancel, start a round — §34), status,
 * automatic admin grant, payment methods (each must also be live in Payment &
 * email), the WhatsApp number for receipts and the BNI receiving accounts — plus
 * every acquisition order, with "mark as paid" for a verified bank wire (which
 * grants the buyer administrator access like any other verified payment). */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import type { SaleSettings } from "@/lib/acquisition";

interface OrderRow { id: string; email: string; amountUsd: number; amountIdr: number; gateway: string; status: string; invoiceNo: string; createdAt: string; paidAt: string; env: string; buyer: { company?: string; name?: string; phone?: string; message?: string }; proof: any }
interface Round { id: string; no: number; status: string; open_usd: number; step_usd: number; starts_at: string; ends_at: string; bids_count: number; high_usd: number; high_name: string; winner_name: string; winner_email: string; winner_usd: number; pay_by: string; order_id: string; next_min_usd: number; note: string }
interface Auction {
  range: { min: number; max: number }; round: Round | null;
  bids: { id: string; seq: number; name: string; email: string; company: string; amountUsd: number; at: string }[];
  rounds: { id: string; no: number; status: string; open_usd: number; bids_count: number; high_usd: number; winner_usd: number; starts_at: string; ends_at: string }[];
  bidders: { id: string; status: string; email: string; display_name: string; company: string; country: string; phone: string; message: string; created_at: string }[];
}
interface Data { settings: SaleSettings; defaults: SaleSettings; gateways: string[]; live: Record<string, string>; orders: OrderRow[]; auction: Auction }

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
  async function auctionAct(action: string, body: Record<string, unknown> = {}, ask = "") {
    if (ask && !confirm(ask)) return;
    setBusy(true); setMsg(null);
    const r = await api<{ auction: Auction }>("/api/admin/acquisition", { body: { action, ...body } });
    setBusy(false);
    if (r.ok) { setD((x) => (x ? { ...x, auction: r.data.auction } : x)); setMsg({ tone: "success", text: "Done." }); } else setMsg({ tone: "error", text: r.error });
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
  const setA = (p: Partial<SaleSettings["auction"]>) => setS({ ...s, auction: { ...s.auction, ...p } });
  const A = d.auction;
  const draw = () => Math.round((A.range.min + Math.random() * (A.range.max - A.range.min)) / 100_000) * 100_000;
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
            <label className="block text-sm font-semibold text-slate-700">How it is sold
              <select className="select mt-1" value={s.mode} onChange={(e) => set({ mode: e.target.value as SaleSettings["mode"] })} data-testid="sale-mode">
                <option value="auction">Auction — rounds, real bids, the winner pays</option><option value="fixed">Fixed asking price</option>
              </select>
            </label>
            {s.mode === "fixed" ? (
              <label className="block text-sm font-semibold text-slate-700">Asking price (USD)
                <input className="input mt-1" inputMode="numeric" value={String(s.priceUsd)} onChange={(e) => set({ priceUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} data-testid="sale-price" />
              </label>
            ) : null}
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
      {s.mode === "auction" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-2" data-testid="sale-auction-admin">
          <Section title="Auction settings" description="Owner, 28 Oct 2026: the opening bid is random between US$10M and US$100M. It is drawn once when a round opens and stored, so every visitor sees the same figure.">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="accent-brand-600" checked={s.auction.randomOpen} onChange={(e) => setA({ randomOpen: e.target.checked })} data-testid="sale-random-open" />
              Draw a new random opening bid (US$10M–100M) for every round
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">Opening bid when not drawn (USD)
                <div className="mt-1 flex gap-2">
                  <input className="input" inputMode="numeric" disabled={s.auction.randomOpen} value={s.auction.openUsd ? String(s.auction.openUsd) : ""} placeholder="10000000 – 100000000"
                    onChange={(e) => setA({ openUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} data-testid="sale-open" />
                  <button type="button" className="btn-secondary" disabled={s.auction.randomOpen} onClick={() => setA({ openUsd: draw() })} title="Draw a random figure in the range">🎲</button>
                </div>
              </label>
              <label className="block text-sm font-semibold text-slate-700">Minimum raise (USD)
                <input className="input mt-1" inputMode="numeric" value={String(s.auction.stepUsd)} onChange={(e) => setA({ stepUsd: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Round length (days)
                <input className="input mt-1" inputMode="numeric" value={String(s.auction.days)} onChange={(e) => setA({ days: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Anti-snipe (minutes)
                <input className="input mt-1" inputMode="numeric" value={String(s.auction.snipeMinutes)} onChange={(e) => setA({ snipeMinutes: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Winner pays within (days)
                <input className="input mt-1" inputMode="numeric" value={String(s.auction.payDays)} onChange={(e) => setA({ payDays: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="accent-brand-600" checked={s.auction.autoRestart} onChange={(e) => setA({ autoRestart: e.target.checked })} />
              A round with no bid is followed by a new round at once
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="accent-brand-600" checked={s.auction.approval} onChange={(e) => setA({ approval: e.target.checked })} data-testid="sale-approval" />
              I approve every bidder before they can bid
            </label>
            <p className="mt-2 text-xs text-slate-500">Changes apply to the next round; the running round keeps its opening bid, raise and deadline.</p>
          </Section>

          <Section title={A.round ? `Round ${A.round.no} — ${A.round.status.replace("_", " ")}` : "No round yet"} description="The first round opens by itself within a minute of the sale being open in auction mode.">
            {A.round ? (
              <div data-testid="sale-round">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-slate-500">Opening bid</dt><dd className="font-bold">{usd(A.round.open_usd)}</dd></div>
                  <div><dt className="text-xs text-slate-500">High bid</dt><dd className="font-bold">{A.round.bids_count ? `${usd(A.round.high_usd)} · ${A.round.high_name}` : "—"}</dd></div>
                  <div><dt className="text-xs text-slate-500">Bids</dt><dd className="font-bold">{A.round.bids_count}</dd></div>
                  <div><dt className="text-xs text-slate-500">Next bid from</dt><dd className="font-bold">{usd(A.round.next_min_usd)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Started</dt><dd>{A.round.starts_at.slice(0, 16).replace("T", " ")} UTC</dd></div>
                  <div><dt className="text-xs text-slate-500">Ends</dt><dd>{A.round.ends_at.slice(0, 16).replace("T", " ")} UTC</dd></div>
                  {A.round.winner_usd ? <div className="col-span-2"><dt className="text-xs text-slate-500">Winner</dt><dd className="font-bold">{A.round.winner_name} · {A.round.winner_email} · {usd(A.round.winner_usd)} · pay by {A.round.pay_by.slice(0, 10)}{A.round.order_id ? ` · order ${A.round.order_id}` : ""}</dd></div> : null}
                  {A.round.note ? <div className="col-span-2 text-xs text-slate-500">{A.round.note}</div> : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {A.round.status === "awaiting_payment" ? <button className="btn-secondary btn-sm" disabled={busy} onClick={() => auctionAct("pass_round", { id: A.round!.id }, "Give this win to the next bidder? The current winner's open order is cancelled.")}>Pass to next bidder</button> : null}
                  {A.round.status === "open" || A.round.status === "awaiting_payment" ? <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { const note = prompt("Cancel this round — reason (shown to admins only)"); if (note !== null) auctionAct("cancel_round", { id: A.round!.id, note }); }}>Cancel round</button> : null}
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">No round has opened yet.</p>}
            {!A.round || !["open", "awaiting_payment"].includes(A.round.status) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" disabled={busy} onClick={() => auctionAct("start_round", {}, "Open a new round now with the saved settings?")} data-testid="sale-start-round">Start a new round</button>
              </div>
            ) : null}
            {A.rounds.length > 1 ? (
              <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-slate-700">Earlier rounds</summary>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">{A.rounds.slice(1).map((r) => <li key={r.id}>Round {r.no}: {r.status} · opening {usd(r.open_usd)} · {r.bids_count} bids{r.winner_usd ? ` · won at ${usd(r.winner_usd)}` : ""}</li>)}</ul>
              </details>
            ) : null}
          </Section>

          <Section title={`Bidders (${A.bidders.length})`} description="Name shown (masked on the page), company, country and phone — seen only here.">
            {!A.bidders.length ? <p className="text-sm text-slate-500">No bidder has registered yet.</p> : (
              <div className="space-y-2" data-testid="sale-bidders">
                {A.bidders.map((b) => (
                  <div key={b.id} className="rounded-lg border border-slate-200 p-3 text-sm" data-testid="sale-bidder">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{b.display_name}</span>
                      <span className={b.status === "approved" ? "badge-green" : b.status === "pending" ? "badge-amber" : "badge-gray"}>{b.status}</span>
                      <span className="ml-auto flex gap-1">
                        {b.status !== "approved" ? <button className="btn-primary btn-sm" disabled={busy} onClick={() => auctionAct("approve_bidder", { id: b.id })} data-testid="sale-bidder-approve">Approve</button> : null}
                        {b.status !== "rejected" ? <button className="btn-ghost btn-sm" disabled={busy} onClick={() => auctionAct("reject_bidder", { id: b.id }, `Refuse ${b.display_name}? They will not be able to bid.`)}>Refuse</button> : null}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{[b.email, b.company, b.country, b.phone].filter(Boolean).join(" · ")}</div>
                    {b.message ? <div className="mt-1 text-xs text-slate-500">“{b.message}”</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Bids in this round (${A.bids.length})`}>
            {!A.bids.length ? <p className="text-sm text-slate-500">No bids yet.</p> : (
              <div className="overflow-x-auto">
                <table className="table min-w-[520px]" data-testid="sale-bids">
                  <thead><tr><th>#</th><th>Bidder</th><th>Amount</th><th>When (UTC)</th></tr></thead>
                  <tbody>{A.bids.map((b) => <tr key={b.id}><td>{b.seq}</td><td><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-500">{b.email}{b.company ? ` · ${b.company}` : ""}</div></td><td className="font-bold">{usd(b.amountUsd)}</td><td className="text-xs">{b.at.slice(0, 19).replace("T", " ")}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      ) : null}
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
