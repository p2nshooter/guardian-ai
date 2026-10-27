/* Admin → Licence auction (§26.5, §27.4). The auction runs by itself every two
 * weeks — every package, the next auction starting the moment one ends, always
 * ending Friday 07:00 WIB — lots pass to the next bidder when a winner does not
 * pay, and licences issue on payment. Winners are listed first. Here the owner chooses what is
 * auctioned and on which terms, follows every lot and its bids (names and
 * e-mails), and can open a package now, pass a win on or cancel a lot. Every
 * change is in the audit log. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import type { AuctionSettings } from "@/lib/auction-terms";
import type { PackageSpec } from "@/lib/auction-packages";
import type { AuctionBidDoc, AuctionLotDoc } from "@/lib/data/schema";

/** A lot as its index summary carries it (lib/data/schema.ts lotSummary). */
type LotRow = Pick<AuctionLotDoc, "id" | "cycle" | "pkg" | "kind" | "app" | "title" | "normal_usd" | "open_usd" | "step_usd" | "starts_at" | "ends_at" | "status"
  | "bids_count" | "high_usd" | "high_name" | "winner_name" | "winner_email" | "winner_usd" | "pay_by" | "order_id" | "closed_at" | "paid_at"> & { passed_n: number };
interface Data {
  settings: AuctionSettings; defaults: AuctionSettings; catalog: { app: string; name: string; packages: PackageSpec[] }[];
  cycle: string; running: string; cycles: string[]; lots: LotRow[]; awaiting: LotRow[]; winners: LotRow[];
  totals: { lots: number; open: number; awaiting: number; sold: number; unsold: number; cancelled: number; soldUsd: number; normalUsd: number; bids: number };
}
const usd = (n: number) => `US$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
/** Times as the owner reads them: Western Indonesia Time (the auction ends Friday 07:00 WIB). */
const at = (iso: string) => (iso ? `${new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB` : "—");
const BADGE: Record<string, string> = { open: "active", awaiting_payment: "pending", sold: "paid", unsold: "expired", cancelled: "canceled" };
const LABEL: Record<string, string> = { open: "Open", awaiting_payment: "Won — not paid yet", sold: "Sold — paid", unsold: "Unsold", cancelled: "Cancelled" };

export default function AdminAuctionsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [s, setS] = useState<AuctionSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<{ lot: AuctionLotDoc; bids: AuctionBidDoc[] } | null>(null);
  const [pick, setPick] = useState("");
  const [cycle, setCycle] = useState("");

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/admin/auctions${cycle ? `?cycle=${cycle}` : ""}`);
    if (r.ok) { setD(r.data); setS(r.data.settings); } else setMsg({ tone: "error", text: r.error });
  }, [cycle]);
  useEffect(() => { load(); }, [load]);

  async function call(method: "PUT" | "POST", body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const r = await api<any>("/api/admin/auctions", { method, body });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: done } : { tone: "error", text: r.error });
    if (r.ok) { await load(); if (open) showBids(open.lot.id); }
    return r.ok;
  }
  async function showBids(id: string) {
    const r = await api<{ lot: AuctionLotDoc; bids: AuctionBidDoc[] }>(`/api/admin/auctions?lot=${encodeURIComponent(id)}`);
    if (r.ok) setOpen(r.data); else setMsg({ tone: "error", text: r.error });
  }

  const lots = useMemo(() => (d ? d.lots.filter((l) => filter === "all" || l.status === filter) : []), [d, filter]);
  if (!d || !s) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const set = (p: Partial<AuctionSettings>) => setS({ ...s, ...p });
  const toggle = (key: string) => set({ packages: s.packages.includes(key) ? s.packages.filter((k) => k !== key) : [...s.packages, key] });
  const allPkgs = d.catalog.flatMap((g) => g.packages);

  return (
    <>
      <PageHeader eyebrow="Business" title="Licence auction" description="Every package, every two weeks, ending Friday 07:00 WIB (00:00 UTC); the next auction starts the moment one ends. Lots open by themselves, pass to the next bidder when a winner does not pay in time, and the licence issues itself on payment."
        actions={<Link href="/auction" target="_blank" className="btn-secondary">Open /auction ↗</Link>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      <div className="mb-6">
        <Section title={`🏆 Winners (${d.winners.length})`} description="Every win, newest first, with the name each winner chose — paid, or “Not paid yet” (no licence until paid). The same list as on the homepage and in the member portal.">
          {!d.winners.length ? <p className="text-sm text-slate-500">No paid wins yet. The first auction ends {at(d.running ? `${d.running}T00:00:00Z` : "")}.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[760px]" data-testid="auc-winners">
                <thead><tr><th>Winner</th><th>Package</th><th>Price</th><th>Payment</th><th>Normal</th><th>Auction</th></tr></thead>
                <tbody>
                  {d.winners.map((w) => (
                    <tr key={w.id}><td><b>{w.winner_name}</b><div className="text-xs">{w.winner_email}</div></td><td className="text-sm">{w.title}</td>
                      <td className="font-semibold">{usd(w.winner_usd)}</td>
                      <td>{w.status === "sold" ? <><StatusBadge status="paid" label="Paid" /><div className="text-xs text-slate-500">{at(w.paid_at)}</div></> : <><StatusBadge status="pending" label="Not paid yet" /><div className="text-xs text-slate-500">asked by {at(w.pay_by)}{w.order_id ? ` · order ${w.order_id}` : ""}</div></>}</td>
                      <td className="text-sm">{usd(w.normal_usd)}</td><td className="text-xs">{w.cycle}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {d.awaiting.length ? (
        <div className="mb-6">
          <Section title={`Not paid yet (${d.awaiting.length})`} description={s.autoPass ? "Won, not yet paid. After the payment window the lot passes to the next bidder by itself." : "Won, not yet paid — no licence is sent until the payment is confirmed. A bank transfer is approved in Orders, with the payment screenshot."}>
            <ul className="divide-y divide-slate-100 text-sm" data-testid="auc-awaiting">
              {d.awaiting.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span><b>{l.winner_name}</b> <span className="text-slate-500">({l.winner_email})</span> · {l.title}</span>
                  <span className="text-amber-700">{usd(l.winner_usd)} · asked by {at(l.pay_by)}{l.order_id ? <> · <Link href={`/admin/orders?q=${encodeURIComponent(l.order_id)}`}>order {l.order_id}</Link></> : " · no order yet"}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="auc-totals">
        {([
          ["Open lots", `${d.totals.open} / ${d.totals.lots}`], ["Awaiting payment", String(d.totals.awaiting)], ["Sold", String(d.totals.sold)],
          ["Unsold / cancelled", `${d.totals.unsold} / ${d.totals.cancelled}`], ["Bids", String(d.totals.bids)], ["Sold for (normal)", `${usd(d.totals.soldUsd)} (${usd(d.totals.normalUsd)})`],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div><div className="mt-1 text-lg font-extrabold text-slate-900">{v}</div></div>
        ))}
      </div>

      <Section title="Terms" description="Owner's terms (26–27 Oct 2026): opening bid 25 % of the normal price, every bid raises the price by exactly 10 % of that opening bid, 5-minute anti-snipe; the licence is sent only once the win is paid, a bank transfer needs the payment screenshot and your approval. The normal price is read from Admin → Plans when a lot opens.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm font-semibold text-slate-700">Auction
            <select className="select mt-1" value={s.enabled ? "on" : "off"} onChange={(e) => set({ enabled: e.target.value === "on" })} data-testid="auc-enabled">
              <option value="on">On — every 2 weeks</option><option value="off">Paused</option>
            </select>
          </label>
          {([["openPct", "Opening bid (% of normal)"], ["stepPct", "Raise per bid (% of the opening bid)"], ["snipeMinutes", "Anti-snipe (minutes)"], ["payHours", "Hours the winner is asked to pay in"]] as const).map(([k, label]) => (
            <label key={k} className="block text-sm font-semibold text-slate-700">{label}
              <input className="input mt-1" inputMode="decimal" value={String(s[k])} onChange={(e) => set({ [k]: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } as Partial<AuctionSettings>)} data-testid={`auc-${k}`} />
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={s.autoPass} onChange={(e) => set({ autoPass: e.target.checked })} data-testid="auc-autopass" />
          <span><b>Hand an unpaid win to the next bidder</b> after the hours above. Off by default (owner, 27 Oct 2026): the licence is sent only after payment, and an unpaid winner stays listed as “Not paid yet”. You can always pass a lot on or cancel it by hand below.</span>
        </label>
        <h3 className="mt-6 text-sm font-bold text-slate-900">Packages on auction every cycle ({s.packages.length})</h3>
        <p className="text-xs text-slate-500">One lot per package per auction. Default (owner, 27 Oct 2026): every package — each edition of each app for 1 year, each app's lifetime licence in every device tier and the suite.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => set({ packages: [...d.defaults.packages] })} data-testid="auc-all">Choose every package</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => set({ packages: [] })}>Clear</button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="auc-packages">
          {d.catalog.map((g) => (
            <details key={g.app} className="rounded-xl border border-slate-200 bg-white p-3" open={g.packages.some((p) => s.packages.includes(p.key))}>
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">{g.name} <span className="text-xs font-normal text-slate-500">({g.packages.filter((p) => s.packages.includes(p.key)).length} chosen)</span></summary>
              <ul className="mt-2 space-y-1">
                {g.packages.map((p) => (
                  <li key={p.key}><label className="flex items-start gap-2 text-xs text-slate-700">
                    <input type="checkbox" className="mt-0.5" checked={s.packages.includes(p.key)} onChange={() => toggle(p.key)} data-pkg={p.key} />{p.title.replace(`${g.name} — `, "")}
                  </label></li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => call("PUT", { settings: s }, "Saved — the running auction opens lots for any new package straight away.")} data-testid="auc-save">{busy ? <Spinner /> : null} Save</button>
          <button className="btn-secondary" disabled={busy} onClick={() => setS({ ...d.defaults, enabled: s.enabled })}>Reset to the owner's terms</button>
          <button className="btn-ghost" disabled={busy} onClick={() => call("POST", { action: "tick" }, "Ended lots closed and unpaid wins passed on.")} data-testid="auc-tick">Close ended lots now</button>
        </div>
      </Section>

      <div className="mt-6">
        <Section title="Open a package in this auction now" description="For a package not in the list above, or one added after the auction began. Its lot ends with the running auction.">
          <div className="flex flex-wrap gap-2">
            <select className="select min-w-0 flex-1" value={pick} onChange={(e) => setPick(e.target.value)} data-testid="auc-pick">
              <option value="">Choose a package…</option>
              {allPkgs.map((p) => <option key={p.key} value={p.key}>{p.title}</option>)}
            </select>
            <button className="btn-primary" disabled={busy || !pick} onClick={() => call("POST", { action: "open", pkg: pick }, "Lot opened.")} data-testid="auc-open">Open lot</button>
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Lots of the auction ending ${d.cycle} (${lots.length})`} actions={
          <div className="flex flex-wrap gap-2">
            <select className="select" value={d.cycle} onChange={(e) => setCycle(e.target.value)} aria-label="Auction" data-testid="auc-cycle">
              {d.cycles.map((c) => <option key={c} value={c}>{c === d.running ? `${c} (running)` : c}</option>)}
            </select>
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
              <option value="all">All</option>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>}>
          {!lots.length ? <p className="text-sm text-slate-500">No lots in this auction yet — they open by themselves, 20 a minute, once packages are chosen.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[980px]">
                <thead><tr><th>Auction</th><th>Package</th><th>Normal / open</th><th>Bids · high</th><th>Ends / pay by</th><th>Winner</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {lots.map((l) => (
                    <tr key={l.id} data-testid="auc-lot">
                      <td className="text-xs">{l.cycle}<div className="font-mono text-[11px] text-slate-400">{l.id}</div></td>
                      <td className="max-w-[16rem] text-sm font-semibold">{l.title}</td>
                      <td className="text-sm">{usd(l.normal_usd)}<div className="text-xs text-slate-500">{usd(l.open_usd)} · +{usd(l.step_usd)}</div></td>
                      <td className="text-sm">{l.bids_count} · {l.bids_count ? usd(l.high_usd) : "—"}</td>
                      <td className="text-xs">{at(l.ends_at)}{l.pay_by ? <div className="text-amber-700">pay by {at(l.pay_by)}</div> : null}</td>
                      <td className="text-xs">{l.winner_name ? <><b>{l.winner_name}</b><div>{l.winner_email}</div><div>{usd(l.winner_usd)}{l.order_id ? ` · ${l.order_id}` : ""}</div></> : "—"}{l.passed_n ? <div className="text-slate-500">passed on {l.passed_n}×</div> : null}</td>
                      <td><StatusBadge status={BADGE[l.status] || l.status} label={LABEL[l.status] || l.status} /></td>
                      <td className="whitespace-nowrap">
                        <button className="btn-ghost btn-sm" onClick={() => showBids(l.id)} data-testid="auc-bids">Bids</button>
                        {l.status === "awaiting_payment" ? <button className="btn-ghost btn-sm" disabled={busy} onClick={() => confirm(`Pass "${l.title}" from ${l.winner_name} to the next bidder now?`) && call("POST", { action: "pass", lot: l.id }, "Passed to the next bidder.")} data-testid="auc-pass">Pass on</button> : null}
                        {l.status === "open" || l.status === "awaiting_payment" ? <button className="btn-ghost btn-sm text-red-700" disabled={busy} onClick={() => { const note = prompt(`Cancel "${l.title}"? Reason, for the record:`, ""); if (note !== null) call("POST", { action: "cancel", lot: l.id, note }, "Lot cancelled."); }} data-testid="auc-cancel">Cancel</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {open ? (
        <div className="mt-6">
          <Section title={`Bids — ${open.lot.title}`} actions={<button className="btn-ghost btn-sm" onClick={() => setOpen(null)}>Close</button>}>
            {!open.bids.length ? <p className="text-sm text-slate-500">No bids.</p> : (
              <div className="overflow-x-auto">
                <table className="table min-w-[640px]" data-testid="auc-bid-table">
                  <thead><tr><th>#</th><th>Amount</th><th>Bidder</th><th>Placed</th></tr></thead>
                  <tbody>
                    {open.bids.map((b) => (
                      <tr key={b.id}><td>{b.seq}</td><td className="font-semibold">{usd(b.amount_usd)}</td><td><b>{b.display_name}</b><div className="text-xs">{b.email}</div></td><td className="text-xs">{at(b.created_at)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {open.lot.note ? <p className="mt-3 text-xs text-slate-500">Note: {open.lot.note}</p> : null}
          </Section>
        </div>
      ) : null}
    </>
  );
}
