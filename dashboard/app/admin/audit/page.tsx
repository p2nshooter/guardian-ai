/* Admin: audit log — every sign-in, payment, licence and admin action. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LoadingBlock, PageHeader } from "@/components/ui";

export default function AdminAudit() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => api<{ entries: any[] }>(`/api/admin/audit?q=${encodeURIComponent(q)}&page=${page}`).then((r) => r.ok && setRows(r.data.entries)), 250);
    return () => clearTimeout(t);
  }, [q, page]);
  return (
    <>
      <PageHeader title="Audit log" description="Tamper-evident record of account, payment, licence and admin actions." />
      <input className="input mb-4 max-w-sm" placeholder="Search actor, action or id…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {!rows ? <LoadingBlock /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>{rows.map((e) => (
              <tr key={e.id}><td className="whitespace-nowrap text-xs">{new Date(e.created_at.endsWith("Z") ? e.created_at : `${e.created_at}Z`).toLocaleString()}</td><td className="text-xs">{e.actor_email}</td><td><code className="text-xs">{e.action}</code></td><td className="text-xs">{e.entity_type} {e.entity_id}</td><td className="max-w-[260px] truncate text-xs">{e.metadata && e.metadata !== "{}" ? e.metadata : ""}</td><td className="text-xs">{e.ip_address}</td></tr>
            ))}</tbody>
          </table>
          <div className="flex justify-between p-3"><button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button><button className="btn-ghost btn-sm" disabled={rows.length < 100} onClick={() => setPage(page + 1)}>Older →</button></div>
        </div>
      )}
    </>
  );
}
