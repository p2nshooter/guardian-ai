/* Admin overview: revenue, MRR, members, subscriptions, pending payments, recent orders. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Section, Stat, StatusBadge } from "@/components/ui";
import AuctionWinnersCard from "@/components/site/AuctionWinnersCard";

interface Stats {
  members: number; newMembers30d: number; activeSubscriptions: number; byPlan: { plan: string; cycle: string; n: number }[]; mrr: number;
  revenue30d: number; orders30d: number; revenueAll: number; pendingOrders: number; activeLicenses: number; byoxRequestsMonth: number; clipperVideosMonth: number;
  recentOrders: { id: string; email: string; plan: string; cycle: string; amount_usd: number; gateway: string; status: string; created_at: string; env?: string }[];
  revenueByMonth: { m: string; s: number }[];
}

export default function AdminHome() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<Stats>("/api/admin/stats").then((r) => (r.ok ? setS(r.data) : setErr(r.error))); }, []);
  if (err) return <Alert tone="error">{err}</Alert>;
  if (!s) return <LoadingBlock />;
  const max = Math.max(1, ...s.revenueByMonth.map((x) => x.s));
  return (
    <>
      <PageHeader title="Overview" description="Everything runs automatically — this is what happened." actions={<Link href="/admin/orders?status=pending" className="btn-secondary">Pending payments ({s.pendingOrders})</Link>} />
      {s.pendingOrders ? <div className="mb-5"><Alert tone="warn" title={`${s.pendingOrders} payment(s) pending`}>Card, PayPal and crypto confirm themselves. Bank transfers wait for your approval in <Link href="/admin/orders?status=pending" className="font-semibold underline">Orders</Link> or the <Link href="/admin/support" className="font-semibold underline">Support inbox</Link>.</Alert></div> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={formatMoney(s.mrr)} hint={`${s.activeSubscriptions} active subscription${s.activeSubscriptions === 1 ? "" : "s"} · as paid`} />
        <Stat label="Revenue · 30 days" value={formatMoney(s.revenue30d)} hint={`${s.orders30d} paid order${s.orders30d === 1 ? "" : "s"}`} />
        <Stat label="Members" value={s.members.toLocaleString()} hint={`+${s.newMembers30d} in 30 days`} />
        <Stat label="Active licences" value={s.activeLicenses.toLocaleString()} hint={`All-time revenue ${formatMoney(s.revenueAll)}`} />
      </div>
      <div className="mt-5"><AuctionWinnersCard href="/admin/auctions" admin /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Revenue by month">
          {s.revenueByMonth.length ? (
            <div className="flex h-44 items-end gap-2">
              {s.revenueByMonth.map((x) => (
                <div key={x.m} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${Math.max(4, (x.s / max) * 150)}px` }} title={formatMoney(x.s)} />
                  <span className="text-[10px] text-slate-500">{x.m.slice(2)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No paid orders yet.</p>}
        </Section>
        <Section title="Subscriptions by plan">
          {s.byPlan.length ? (
            <ul className="space-y-2 text-sm">{s.byPlan.map((p) => <li key={p.plan + p.cycle} className="flex justify-between"><span className="capitalize">{p.plan} · {p.cycle}</span><strong>{p.n}</strong></li>)}</ul>
          ) : <p className="text-sm text-slate-500">No active subscriptions.</p>}
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">This month: {s.byoxRequestsMonth.toLocaleString()} AI runs on members' own keys · {s.clipperVideosMonth} Clipper videos</div>
        </Section>
      </div>
      <div className="mt-5">
        <Section title="Recent orders" actions={<Link href="/admin/orders" className="text-sm font-semibold">All orders →</Link>}>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Date</th><th>Member</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>{s.recentOrders.map((o) => (
                <tr key={o.id}><td>{formatDate(o.created_at)}</td><td>{o.email}</td><td className="capitalize">{o.plan} · {o.cycle}</td><td>{formatMoney(o.amount_usd)}</td><td>{o.gateway}{o.env === "sandbox" ? <span className="badge-amber ml-1">TEST</span> : null}</td><td><StatusBadge status={o.status} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
