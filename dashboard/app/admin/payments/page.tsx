/* Admin → Payments & email. Every value is saved AES-256-GCM encrypted in R2;
 * secrets come back masked and are kept when a masked/blank value is saved. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, CopyButton } from "@/components/ui";

interface Field { key: string; label: string; secret?: boolean; placeholder?: string; multiline?: boolean }
interface Gateway {
  id: string; label: string; methods: string; currency: string; confirmation: "automatic" | "admin";
  fields: Field[]; values: Record<string, string>; configured: boolean; active: boolean; testMode: boolean; sandbox: boolean; testHint: string; updatedAt: string; webhookUrl: string;
}

export default function PaymentsPage() {
  const [data, setData] = useState<{ gateways: Gateway[]; email: { fields: Field[]; values: Record<string, string>; configured: boolean } } | null>(null);
  const [error, setError] = useState("");
  const load = () => api<any>("/api/admin/gateways").then((r) => (r.ok ? setData(r.data) : setError(r.error || "Could not load settings.")));
  useEffect(() => { load(); }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <LoadingBlock />;
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Payments & e-mail"
        description="Turn payment methods on, paste their keys, and set where support and contact messages are e-mailed. Everything is stored encrypted in R2 — never in the database or the code." />
      <div className="grid gap-5">
        {data.gateways.map((g) => <GatewayCard key={g.id} g={g} onSaved={load} />)}
        <EmailCard e={data.email} onSaved={load} />
      </div>
    </>
  );
}

function GatewayCard({ g, onSaved }: { g: Gateway; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(g.values);
  const [active, setActive] = useState(g.active);
  const [testMode, setTestMode] = useState(g.testMode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/gateways", { method: "PUT", body: { gateway: g.id, credentials: values, is_active: active, is_test_mode: testMode } });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: "Saved." }); onSaved(); } else setMsg({ tone: "error", text: r.error || "Could not save." });
  }

  return (
    <section className="card-pad">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{g.label}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{g.methods} · charged in {g.currency} · {g.confirmation === "automatic" ? "confirmed automatically" : "you confirm the payment (Admin → Orders → Mark paid)"}</p>
        </div>
        <div className="flex items-center gap-2">
          {g.configured ? <span className="badge-green">configured</span> : <span className="badge-gray">not configured</span>}
          {g.active ? <span className="badge-green">offered at checkout</span> : <span className="badge-gray">off</span>}
          {g.active && g.sandbox && g.testMode ? <span className="badge-amber">test mode</span> : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {g.fields.map((f) => (
          <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={`${g.id}-${f.key}`}>{f.label}{f.secret ? <span className="ml-1 text-xs font-normal text-slate-400">🔒 encrypted</span> : null}</label>
            {f.multiline ? (
              <textarea id={`${g.id}-${f.key}`} className="input min-h-[80px]" value={values[f.key] || ""} placeholder={f.placeholder} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : (
              <input id={`${g.id}-${f.key}`} className="input font-mono text-xs" value={values[f.key] || ""} placeholder={f.placeholder || (f.secret && g.values[f.key] ? "saved — leave as is to keep" : "")}
                autoComplete="off" spellCheck={false} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>
      {g.webhookUrl ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Webhook URL for the {g.label.split(" (")[0]} dashboard: <code className="break-all font-mono text-slate-800">{g.webhookUrl}</code> <CopyButton text={g.webhookUrl} className="btn-ghost btn-sm" />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Offer at checkout</label>
        {g.sandbox ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} /> Test mode (sandbox — no real money)</label>
          : g.testHint ? <span className="text-xs text-slate-500">{g.testHint}</span> : null}
        <button className="btn-primary btn-sm ml-auto" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
      </div>
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
    </section>
  );
}

function EmailCard({ e, onSaved }: { e: { fields: Field[]; values: Record<string, string>; configured: boolean }; onSaved: () => void }) {
  const [values, setValues] = useState(e.values);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function save() {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/gateways", { method: "PUT", body: { gateway: "email", credentials: values } });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: "Saved." }); onSaved(); } else setMsg({ tone: "error", text: r.error || "Could not save." });
  }
  return (
    <section className="card-pad">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold">E-mail (Resend)</h2><p className="mt-0.5 text-sm text-slate-500">Receipts, licence keys, password resets — and support/contact notifications to your admin inbox.</p></div>
        {e.configured ? <span className="badge-green">configured</span> : <span className="badge-amber">not configured</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {e.fields.map((f) => (
          <div key={f.key}><label className="label">{f.label}</label>
            <input className="input font-mono text-xs" value={values[f.key] || ""} placeholder={f.placeholder} autoComplete="off" onChange={(ev) => setValues({ ...values, [f.key]: ev.target.value })} /></div>
        ))}
      </div>
      <div className="mt-4 flex"><button className="btn-primary btn-sm ml-auto" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button></div>
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
    </section>
  );
}
