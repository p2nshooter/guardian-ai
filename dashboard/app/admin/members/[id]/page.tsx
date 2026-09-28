/* Admin: one member — subscription, payments, licences, AI keys; grant, extend, cancel, suspend, reset password. */
"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatBytes, formatDate, formatMoney } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";

export default function AdminMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [grant, setGrant] = useState({ plan: "pro", cycle: "monthly", note: "" });
  const [days, setDays] = useState(30);
  const load = useCallback(async () => { const r = await api(`/api/admin/members/${id}`); if (r.ok) setD(r.data); else setMsg({ tone: "error", text: r.error }); }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(action); setMsg(null);
    const r = await api(`/api/admin/members/${id}`, { body: { action, ...extra } });
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: "Done." } : { tone: "error", text: r.error });
    load();
  }
  if (!d) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const u = d.user, s = d.subscription;
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/members">← Members</Link>} title={u.name || u.email} description={`${u.email}${u.organization ? ` · ${u.organization}` : ""}${u.country ? ` · ${u.country}` : ""}`}
        actions={<>
          <button className="btn-secondary btn-sm" onClick={() => act("reset_password")} disabled={!!busy}>E-mail reset link</button>
          {u.status === "suspended"
            ? <button className="btn-primary btn-sm" onClick={() => act("activate")} disabled={!!busy}>Reactivate</button>
            : <button className="btn-danger btn-sm" onClick={() => act("suspend", {}, "Suspend this member? Sign-in and licences stop working.")} disabled={!!busy}>Suspend</button>}
        </>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Subscription">
          {s ? <p className="text-sm"><strong className="capitalize">{s.plan} · {s.cycle}</strong> <StatusBadge status={s.status} /> until {formatDate(s.current_period_end)}</p> : <p className="text-sm text-slate-500">No subscription.</p>}
          <p className="mt-2 text-xs text-slate-500">Joined {formatDate(u.created_at)} · last sign-in {formatDate(u.last_login_at)} · storage {formatBytes(u.storage_bytes || 0)} · {d.usage?.requests || 0} AI runs this month</p>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <label><span className="label">Grant plan</span><select className="select" value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })}>{["starter", "pro", "business", "enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
              <label><span className="label">Period</span><select className="select" value={grant.cycle} onChange={(e) => setGrant({ ...grant, cycle: e.target.value })}><option value="monthly">1 month</option><option value="yearly">1 year</option></select></label>
              <input className="input max-w-[220px]" placeholder="Note (why)" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} />
              <button className="btn-primary" onClick={() => act("grant", grant, `Grant ${grant.plan} (${grant.cycle}) free of charge?`)} disabled={!!busy}>{busy === "grant" ? <Spinner /> : null} Grant</button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label><span className="label">Extend by days</span><input type="number" min={1} max={3650} className="input w-28" value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
              <button className="btn-secondary" onClick={() => act("extend", { days })} disabled={!!busy || !s}>Extend</button>
              <button className="btn-ghost text-rose-600" onClick={() => act("cancel", {}, "End this subscription now? Licences will be suspended.")} disabled={!!busy || !s}>End subscription now</button>
            </div>
          </div>
        </Section>
        <Section title="AI keys (BYOX)">
          {d.byoxKeys.length ? <ul className="space-y-1 text-sm">{d.byoxKeys.map((k: any) => <li key={k.provider}>{k.provider} <code className="text-xs">{k.hint}</code> <span className="text-xs text-slate-500">since {formatDate(k.created_at)}</span></li>)}</ul> : <p className="text-sm text-slate-500">No keys yet.</p>}
          <p className="mt-2 text-xs text-slate-500">Keys are encrypted; only the last 4 characters are visible.</p>
        </Section>
      </div>
      <div className="mt-5"><Section title="Payments">
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>{d.orders.map((o: any) => <tr key={o.id}><td>{formatDate(o.created_at)}</td><td className="capitalize">{o.plan} · {o.cycle}</td><td>{formatMoney(o.amount_usd)}</td><td>{o.gateway}</td><td><StatusBadge status={o.status} /></td></tr>)}</tbody></table></div>
      </Section></div>
      <div className="mt-5"><Section title="Self-hosted licences">
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>Product</th><th>Key</th><th>Status</th><th>Expires</th><th>Last seen</th></tr></thead>
          <tbody>{d.licenses.map((l: any) => <tr key={l.id}><td>{l.product}</td><td><code className="text-xs">{l.license_key}</code></td><td><StatusBadge status={l.status} /></td><td>{formatDate(l.expires_at)}</td><td>{l.last_seen_at ? `${formatDate(l.last_seen_at)} · v${l.last_version || "?"}` : "never"}</td></tr>)}</tbody></table></div>
      </Section></div>
    </>
  );
}
