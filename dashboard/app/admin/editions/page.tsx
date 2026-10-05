/* Admin → App editions (docs/AXTO-APPS-BLUEPRINT.md §3): the price of every
 * edition of the 10 self-hosted apps, monthly and yearly, and whether it is on
 * sale. Checkout, the public product pages and the member portal read these
 * prices. Package codes and limits are fixed in lib/editions.ts (signed into
 * every licence), so they are shown, not edited. */
"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Spinner } from "@/components/ui";
import { catalogEntry } from "@/lib/selfhosted";

interface Row { app: string; tier: string; code: string; name: string; defaultYearly: number; defaultMonthly: number; yearly: number; monthly: number; enabled: boolean; limits: Record<string, unknown>; active: number }

const limitText = (l: Record<string, unknown>) => Object.entries(l).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v === -1 ? "∞" : v}`).join(" · ");

export default function AdminEditions() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<Record<string, { yearly: string; monthly: string; enabled: boolean }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const r = await api<{ editions: Row[] }>("/api/admin/editions");
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    setRows(r.data.editions);
    setEdit(Object.fromEntries(r.data.editions.map((e) => [e.code, { yearly: String(e.yearly), monthly: String(e.monthly), enabled: e.enabled }])));
  };
  useEffect(() => { load(); }, []);
  const apps = useMemo(() => Array.from(new Set((rows || []).map((r) => r.app))), [rows]);

  async function save() {
    setBusy(true); setMsg(null);
    const prices = Object.entries(edit).map(([code, v]) => ({ code, yearly: Number(v.yearly), monthly: Number(v.monthly), enabled: v.enabled }));
    const r = await api("/api/admin/editions", { method: "PUT", body: { prices } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: "Saved — checkout, the public pages and the member portal use these prices now." } : { tone: "error", text: r.error });
    if (r.ok) load();
  }

  if (!rows) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  return (
    <>
      <PageHeader title="App editions" description="Sell each self-hosted app in its own editions (Starter → Enterprise), monthly or yearly. Plan licences (Business / Enterprise) stay the top edition."
        actions={<button className="btn-primary" onClick={save} disabled={busy} data-testid="ed-save">{busy ? <Spinner /> : null} Save prices</button>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="space-y-5">
        {apps.map((app) => (
          <section key={app} className="card overflow-x-auto" data-testid={`ed-app-${app}`}>
            <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">{catalogEntry(app)?.name || app}</div>
            <table className="table">
              <thead><tr><th>Edition</th><th>Package code</th><th>Limits (signed)</th><th>Monthly (USD)</th><th>Yearly (USD)</th><th>On sale</th><th>Active</th></tr></thead>
              <tbody>{rows.filter((r) => r.app === app).map((r) => {
                const v = edit[r.code];
                return (
                  <tr key={r.code}>
                    <td className="font-semibold">{r.name}</td>
                    <td><code className="text-xs">{r.code}</code></td>
                    <td className="max-w-[260px] text-xs text-slate-600">{limitText(r.limits)}</td>
                    <td><input className="input w-28" inputMode="decimal" value={v.monthly} onChange={(e) => setEdit({ ...edit, [r.code]: { ...v, monthly: e.target.value } })} aria-label={`${r.name} monthly`} /><div className="mt-1 text-[11px] text-slate-400">default {formatMoney(r.defaultMonthly, "USD", "en")}</div></td>
                    <td><input className="input w-32" inputMode="decimal" value={v.yearly} onChange={(e) => setEdit({ ...edit, [r.code]: { ...v, yearly: e.target.value } })} aria-label={`${r.name} yearly`} /><div className="mt-1 text-[11px] text-slate-400">default {formatMoney(r.defaultYearly, "USD", "en")}</div></td>
                    <td><input type="checkbox" checked={v.enabled} onChange={(e) => setEdit({ ...edit, [r.code]: { ...v, enabled: e.target.checked } })} aria-label={`${r.name} on sale`} /></td>
                    <td>{r.active}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}
