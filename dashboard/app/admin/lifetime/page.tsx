/* Admin: Lifetime (offline) licences — list prices, negotiated deals, device
 * activations. Offline activations cannot be switched off remotely, so
 * "Retire device" only frees a slot after the customer confirms the old
 * hardware is gone; revoking a licence stops NEW activations and downloads. */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/i18n";
import { Alert, Field, LoadingBlock, PageHeader, Section, StatusBadge } from "@/components/ui";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";

interface Tier { devices: number; label: string; app: number; suite: number }
interface Act { id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string }
interface Lic { id: string; email: string; name: string; scope: string; product: string; productName: string; devices: number; updates_until: string; status: string; order_id: string; note: string; created_at: string; activations: Act[] }

const APPS = SELF_HOSTED.map((p) => ({ slug: p.slug, name: catalogEntry(p.slug)?.name || p.slug }));

export default function AdminLifetime() {
  const [data, setData] = useState<{ licenses: Lic[]; tiers: Tier[]; defaults: Tier[] } | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState("");
  const [f, setF] = useState({ email: "", scope: "app", product: APPS[0].slug, devices: 1, updateMonths: 12, note: "" });

  const load = useCallback(async () => {
    const r = await api<{ licenses: Lic[]; tiers: Tier[]; defaults: Tier[] }>("/api/admin/lifetime");
    if (r.ok) { setData(r.data); setTiers(r.data.tiers); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const done = (ok: boolean, text: string) => { setMsg({ tone: ok ? "success" : "error", text }); if (ok) load(); };

  async function savePrices() {
    const r = await api("/api/admin/lifetime", { method: "PUT", body: { tiers } });
    done(r.ok, r.ok ? "Lifetime prices saved — checkout uses them immediately." : r.error);
  }
  async function issue() {
    const r = await api<{ license: { id: string } }>("/api/admin/lifetime", { body: { action: "issue", ...f } });
    done(r.ok, r.ok ? `Licence ${r.data.license.id} issued and e-mailed to ${f.email}.` : r.error);
  }
  async function act(body: Record<string, string>, confirmText: string) {
    if (!confirm(confirmText)) return;
    const r = await api("/api/admin/lifetime", { body });
    done(r.ok, r.ok ? "Done." : r.error);
  }

  if (!data) return <LoadingBlock />;
  return (
    <>
      <PageHeader title="Lifetime licences" description="Perpetual, offline self-hosted licences. Paid lifetime orders issue themselves; issue negotiated deals here." />
      <div className="space-y-5">
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

        <Section title="Licences" description={`${data.licenses.length} issued`}>
          {data.licenses.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Licence</th><th>Owner</th><th>Covers</th><th>Devices</th><th>Updates until</th><th>Status</th><th /></tr></thead>
                <tbody>{data.licenses.map((l) => {
                  const live = l.activations.filter((a) => !a.revoked_at);
                  return [
                    <tr key={l.id}>
                      <td><code className="text-xs font-bold">{l.id}</code><div className="text-xs text-slate-500">{l.order_id ? `order ${l.order_id}` : "admin-issued"} · {formatDate(l.created_at)}</div></td>
                      <td className="text-xs">{l.email}<div className="text-slate-500">{l.name}</div></td>
                      <td>{l.productName}</td>
                      <td>{l.devices}{l.scope === "suite" ? " / app" : ""} · <span className="text-xs text-slate-500">{live.length} active</span></td>
                      <td>{formatDate(l.updates_until)}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn-ghost btn-sm" onClick={() => setOpen(open === l.id ? "" : l.id)}>Devices</button>
                        {l.status === "active"
                          ? <button className="btn-ghost btn-sm text-rose-600" onClick={() => act({ action: "revoke", licenseId: l.id }, `Revoke ${l.id}? New activations and downloads stop; devices already activated offline keep running.`)}>Revoke</button>
                          : <button className="btn-ghost btn-sm" onClick={() => act({ action: "restore", licenseId: l.id }, `Restore ${l.id}?`)}>Restore</button>}
                      </td>
                    </tr>,
                    open === l.id ? (
                      <tr key={`${l.id}-d`}><td colSpan={7} className="bg-slate-50">
                        {l.activations.length ? (
                          <ul className="divide-y divide-slate-200 text-sm">
                            {l.activations.map((a) => (
                              <li key={a.id} className="flex flex-wrap items-center gap-3 py-1.5">
                                <span className="font-medium capitalize">{a.product}</span>
                                <span>{a.label || "—"}</span>
                                <code className="text-xs">{a.machine_id}</code>
                                <span className="text-xs text-slate-500">{formatDate(a.created_at)}{a.revoked_at ? ` · retired ${formatDate(a.revoked_at)}` : ""}</span>
                                {!a.revoked_at ? (
                                  <span className="ml-auto flex gap-2">
                                    <a className="btn-ghost btn-sm" href={`/api/lifetime/file?id=${a.id}`}>File</a>
                                    <button className="btn-ghost btn-sm text-rose-600" onClick={() => act({ action: "retire", activationId: a.id }, "Retire this device? Only do this after the customer confirms the old device is decommissioned — its offline file keeps working.")}>Retire device</button>
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-sm text-slate-500">No devices activated yet.</p>}
                      </td></tr>
                    ) : null,
                  ];
                })}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No lifetime licences yet.</p>}
        </Section>

        <Section title="Issue a negotiated licence" description="For wire-transfer deals, POs and custom terms. The customer must have an AXTO account; the licence is e-mailed to them.">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Customer e-mail"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Covers">
              <select className="select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}><option value="app">One app</option><option value="suite">Suite (all 10 apps)</option></select>
            </Field>
            {f.scope === "app" ? (
              <Field label="App"><select className="select" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>{APPS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></Field>
            ) : <div />}
            <Field label="Devices (per app, 1–100)"><input className="input" type="number" min={1} max={100} value={f.devices} onChange={(e) => setF({ ...f, devices: Number(e.target.value) })} /></Field>
            <Field label="Months of updates"><input className="input" type="number" min={0} max={120} value={f.updateMonths} onChange={(e) => setF({ ...f, updateMonths: Number(e.target.value) })} /></Field>
            <Field label="Internal note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="PO number, deal terms…" /></Field>
          </div>
          <div className="mt-4 text-right"><button className="btn-primary" onClick={issue} disabled={!f.email.includes("@")}>Issue licence</button></div>
        </Section>

        <Section title="List prices (USD)" description="Shown on /pricing and used by checkout. Card is offered up to $999,999; above that the customer pays by wire or crypto.">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Devices</th><th>One app</th><th>Suite (10 apps)</th><th>Default</th></tr></thead>
              <tbody>{tiers.map((t, i) => (
                <tr key={t.devices}>
                  <td>{t.label}</td>
                  <td><input className="input w-36" type="number" min={1} value={t.app} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, app: Number(e.target.value) } : x)))} /></td>
                  <td><input className="input w-40" type="number" min={1} value={t.suite} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, suite: Number(e.target.value) } : x)))} /></td>
                  <td className="text-xs text-slate-500">{formatMoney(data.defaults[i].app)} · {formatMoney(data.defaults[i].suite)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setTiers(data.defaults)}>Reset to defaults</button>
            <button className="btn-primary" onClick={savePrices}>Save prices</button>
          </div>
        </Section>
      </div>
    </>
  );
}
