/* Admin: self-hosted licences — search, suspend/activate/revoke, reset the bound machine. */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminLicenses() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => { const r = await api<{ licenses: any[] }>(`/api/admin/licenses?q=${encodeURIComponent(q)}&status=${status}`); if (r.ok) setRows(r.data.licenses); }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  async function act(id: string, action: string) {
    if ((action === "revoke" || action === "suspend") && !confirm(`${action} this licence?`)) return;
    const r = await api("/api/admin/licenses", { body: { id, action } });
    setMsg(r.ok ? `Licence ${action} done.` : r.error);
    load();
  }
  return (
    <>
      <PageHeader title="Licences" description="Issued automatically on payment. Every engine validates its signed licence online." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-sm" placeholder="Key, e-mail or product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select>
      </div>
      {msg ? <div className="mb-4"><Alert tone="info">{msg}</Alert></div> : null}
      {!rows ? <LoadingBlock /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Product</th><th>Key</th><th>Owner</th><th>Status</th><th>Expires</th><th>Machine</th><th>Last seen</th><th /></tr></thead>
            <tbody>{rows.map((l) => (
              <tr key={l.id}>
                <td className="capitalize">{l.product}</td>
                <td><code className="text-xs">{l.license_key}</code></td>
                <td className="text-xs">{l.email}</td>
                <td><StatusBadge status={l.status} />{l.notes === "admin_hold" ? <div className="mt-1 text-[11px] font-semibold text-rose-600" title="Set by an admin — the member cannot re-issue it and renewals don't lift it">🔒 admin lock</div> : null}</td>
                <td>{formatDate(l.expires_at)}</td>
                <td className="max-w-[120px] truncate text-xs">{l.bound_machine_id || "—"}{l.reset_count ? ` (reset ×${l.reset_count})` : ""}</td>
                <td className="text-xs">{l.last_seen_at ? `${formatDate(l.last_seen_at)} · v${l.last_version || "?"} · ${l.last_ip || ""}` : "never"}</td>
                <td className="whitespace-nowrap text-right">
                  {l.status === "active" ? <button className="btn-ghost btn-sm" onClick={() => act(l.id, "suspend")}>Suspend</button>
                    : <button className="btn-ghost btn-sm" onClick={() => act(l.id, "activate")}>{l.status === "revoked" ? "Restore" : "Activate"}</button>}
                  {l.bound_machine_id ? <button className="btn-ghost btn-sm" onClick={() => act(l.id, "reset")}>Reset machine</button> : null}
                  {l.status !== "revoked" ? <button className="btn-ghost btn-sm text-rose-600" onClick={() => act(l.id, "revoke")}>Revoke</button> : null}
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!rows.length ? <p className="p-5 text-sm text-slate-500">No licences.</p> : null}
        </div>
      )}
    </>
  );
}
