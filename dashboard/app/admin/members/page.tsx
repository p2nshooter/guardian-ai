/* Admin: members — search, filter by plan, open a member. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatBytes, formatDate } from "@/lib/i18n";
import { LoadingBlock, PageHeader, StatusBadge } from "@/components/ui";

interface Row { id: string; email: string; name: string; organization: string; country: string; status: string; created_at: string; last_login_at: string; storage_bytes: number; plan: string | null; cycle: string | null; sub_status: string | null; current_period_end: string | null }

export default function AdminMembers() {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ members: Row[]; total: number; pageSize: number } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => api<any>(`/api/admin/members?q=${encodeURIComponent(q)}&plan=${plan}&page=${page}`).then((r) => r.ok && setData(r.data)), 250);
    return () => clearTimeout(t);
  }, [q, plan, page]);
  return (
    <>
      <PageHeader title="Members" description={data ? `${data.total.toLocaleString()} members` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-sm" placeholder="Search name, e-mail, company…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="select w-auto" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">All plans</option><option value="none">No plan</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="business">Business</option><option value="enterprise">Enterprise</option>
        </select>
      </div>
      {!data ? <LoadingBlock /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Member</th><th>Plan</th><th>Until</th><th>Storage</th><th>Joined</th><th>Last sign-in</th><th>Status</th></tr></thead>
            <tbody>{data.members.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/admin/members/${m.id}`} className="font-semibold">{m.name || m.email}</Link><span className="block text-xs text-slate-500">{m.email}{m.organization ? ` · ${m.organization}` : ""}{m.country ? ` · ${m.country}` : ""}</span></td>
                <td className="capitalize">{m.plan && m.sub_status === "active" ? `${m.plan} · ${m.cycle}` : "—"}</td>
                <td>{m.current_period_end && m.sub_status === "active" ? formatDate(m.current_period_end) : "—"}</td>
                <td>{formatBytes(m.storage_bytes || 0)}</td>
                <td>{formatDate(m.created_at)}</td>
                <td>{formatDate(m.last_login_at)}</td>
                <td><StatusBadge status={m.status || "active"} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="flex items-center justify-between p-3 text-sm">
            <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span>Page {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <button className="btn-ghost btn-sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      )}
    </>
  );
}
