/* Admin → Trials — the "100 TRIAL LICENSE" programme per self-hosted app
 * (docs/AXTO-APPS-BLUEPRINT.md §4): switch it on/off, length, apps per account,
 * date window; create, pause, resume or delete batches of codes; see who
 * claimed, ratings and conversions; export CSV; end a trial. All audited. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";

interface Config { enabled: boolean; days: number; maxProducts: number; perApp: number; startsAt: string; endsAt: string }
interface App { slug: string; name: string; total: number; available: number; claimed: number; disabled: number; converted: number; rating: number | null; ratings: number }
interface Batch { batch: string; product: string; name: string; created_at: string; total: number; available: number; claimed: number; disabled: number }
interface Claim { code: string; product: string; name: string; email: string; ip: string; claimed_at: string; rating: number; converted: boolean; license_status: string; expires_at: string; last_seen_at: string }
interface Data { config: Config; apps: App[]; batches: Batch[]; claims: Claim[] }

export default function AdminTrials() {
  const [d, setD] = useState<Data | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [gen, setGen] = useState({ product: "all", count: 100 });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const r = await api<Data>("/api/admin/trials");
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    setD(r.data); setCfg(r.data.config);
  };
  useEffect(() => { load(); }, []);

  // Large jobs (hundreds of codes) run in steps: the server answers with `next` (the body of the
  // following step) or `more`, and this keeps going until the job is done, showing the progress.
  async function call(label: string, path: string, init: { method?: string; body: unknown }) {
    setBusy(label); setMsg(null);
    let body = init.body;
    let r = await api<any>(path, { ...init, body } as never);
    let made = 0, changed = 0;
    for (let step = 0; r.ok && step < 200; step += 1) {
      made += (r.data?.made || []).reduce((n: number, m: { created: number }) => n + m.created, 0);
      changed += Number(r.data?.changed || 0);
      if (r.data?.next) body = r.data.next;
      else if (!r.data?.more) break;
      setMsg({ tone: "success", text: made ? `Creating codes… ${made}` : `Working… ${changed}` });
      r = await api<any>(path, { ...init, body } as never);
    }
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: made ? `Done — ${made} codes created.` : changed ? `Done — ${changed} codes changed.` : "Done." } : { tone: "error", text: r.error });
    if (r.ok) load();
    return r;
  }

  if (!d || !cfg) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const totals = d.apps.reduce((a, x) => ({ available: a.available + x.available, claimed: a.claimed + x.claimed, converted: a.converted + x.converted }), { available: 0, claimed: 0, converted: 0 });
  return (
    <>
      <PageHeader title="Trials" description="100 trial licences per app: a member claims one in the portal and gets a signed Professional-edition licence at once — no admin step."
        actions={<a className="btn-secondary" href="/api/admin/trials?format=csv" data-testid="trials-csv">⬇ CSV</a>} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">Available</div><div className="mt-1 text-2xl font-bold">{totals.available}</div></div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">Claimed</div><div className="mt-1 text-2xl font-bold">{totals.claimed}</div></div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">Converted to paid</div><div className="mt-1 text-2xl font-bold">{totals.converted}{totals.claimed ? <span className="ml-2 text-sm text-slate-500">({Math.round((totals.converted / totals.claimed) * 100)} %)</span> : null}</div></div>
        </div>

        <Section title="Settings">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} data-testid="trials-enabled" /> Programme open</label>
            <label className="block"><span className="label">Trial length (days)</span><input className="input" type="number" min={1} max={90} value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: Number(e.target.value) })} /></label>
            <label className="block"><span className="label">Apps per account</span><input className="input" type="number" min={1} max={10} value={cfg.maxProducts} onChange={(e) => setCfg({ ...cfg, maxProducts: Number(e.target.value) })} /></label>
            <label className="block"><span className="label">Default pool per app</span><input className="input" type="number" min={1} max={1000} value={cfg.perApp} onChange={(e) => setCfg({ ...cfg, perApp: Number(e.target.value) })} /></label>
            <label className="block"><span className="label">Opens (optional)</span><input className="input" type="datetime-local" value={cfg.startsAt ? cfg.startsAt.slice(0, 16) : ""} onChange={(e) => setCfg({ ...cfg, startsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
            <label className="block"><span className="label">Closes (optional)</span><input className="input" type="datetime-local" value={cfg.endsAt ? cfg.endsAt.slice(0, 16) : ""} onChange={(e) => setCfg({ ...cfg, endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
          </div>
          <div className="mt-3"><button className="btn-primary" disabled={!!busy} onClick={() => call("cfg", "/api/admin/trials", { method: "PUT", body: { config: cfg } })} data-testid="trials-save">{busy === "cfg" ? <Spinner /> : null} Save settings</button></div>
          <p className="mt-2 text-xs text-slate-500">Limits: one trial per app per account, per e-mail and per IP; one trial per app per server (checked when the engine activates). Trial licences run the Professional edition.</p>
        </Section>

        <Section title="Pools per app">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="block"><span className="label">App</span>
              <select className="select" value={gen.product} onChange={(e) => setGen({ ...gen, product: e.target.value })} data-testid="trials-gen-app">
                <option value="all">All 10 apps</option>
                {d.apps.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
              </select></label>
            <label className="block"><span className="label">Codes</span><input className="input w-28" type="number" min={1} max={1000} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} /></label>
            <button className="btn-primary" disabled={!!busy} onClick={() => call("gen", "/api/admin/trials", { body: { action: "generate", ...gen } })} data-testid="trials-generate">{busy === "gen" ? <Spinner /> : null} Create codes</button>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>App</th><th>Total</th><th>Available</th><th>Claimed</th><th>Paused</th><th>Converted</th><th>Rating</th></tr></thead>
              <tbody>{d.apps.map((a) => (
                <tr key={a.slug} data-testid={`trials-app-${a.slug}`}><td className="font-semibold">{a.name}</td><td>{a.total}</td><td>{a.available}</td><td>{a.claimed}</td><td>{a.disabled}</td><td>{a.converted}</td><td>{a.rating ? `★ ${a.rating} (${a.ratings})` : "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Section>

        <Section title="Batches">
          {d.batches.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Created</th><th>App</th><th>Total</th><th>Available</th><th>Claimed</th><th>Paused</th><th /></tr></thead>
                <tbody>{d.batches.map((b) => (
                  <tr key={b.batch + b.product}>
                    <td className="text-xs">{formatDate(b.created_at)}</td><td>{b.name}</td><td>{b.total}</td><td>{b.available}</td><td>{b.claimed}</td><td>{b.disabled}</td>
                    <td className="whitespace-nowrap text-right">
                      {b.available ? <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => call(`d-${b.batch}`, "/api/admin/trials", { body: { action: "disable", batch: b.batch } })}>Pause</button> : null}
                      {b.disabled ? <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => call(`e-${b.batch}`, "/api/admin/trials", { body: { action: "enable", batch: b.batch } })}>Resume</button> : null}
                      {b.available + b.disabled ? <button className="btn-ghost btn-sm text-rose-600" disabled={!!busy} onClick={() => { if (confirm("Delete the unclaimed codes of this batch?")) call(`x-${b.batch}`, "/api/admin/trials", { body: { action: "delete", batch: b.batch } }); }}>Delete unclaimed</button> : null}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No codes yet — create the first 100 per app above.</p>}
        </Section>

        <Section title="Latest claims">
          {d.claims.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>App</th><th>Member</th><th>Claimed</th><th>Licence</th><th>Last check-in</th><th>Rating</th><th>Paid</th><th /></tr></thead>
                <tbody>{d.claims.map((c) => (
                  <tr key={c.code}>
                    <td>{c.name}<div className="text-[11px] text-slate-400"><code>{c.code}</code></div></td>
                    <td className="text-xs">{c.email}<div className="text-slate-400">{c.ip}</div></td>
                    <td className="text-xs">{formatDate(c.claimed_at)}</td>
                    <td>{c.license_status ? <StatusBadge status={c.license_status} /> : "—"}{c.expires_at ? <div className="mt-1 text-[11px] text-slate-500">until {formatDate(c.expires_at)}</div> : null}</td>
                    <td className="text-xs">{c.last_seen_at ? formatDate(c.last_seen_at) : "never"}</td>
                    <td>{c.rating ? `★ ${c.rating}` : "—"}</td>
                    <td>{c.converted ? <span className="badge-green">paid</span> : "—"}</td>
                    <td className="text-right">{c.license_status === "active" ? <button className="btn-ghost btn-sm text-rose-600" disabled={!!busy} onClick={() => { if (confirm("End this trial now?")) call(`r-${c.code}`, "/api/admin/trials", { body: { action: "revoke", code: c.code } }); }}>End trial</button> : null}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">No trial has been claimed yet.</p>}
        </Section>
      </div>
    </>
  );
}
