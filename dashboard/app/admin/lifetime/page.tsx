/* Admin: Lifetime (offline) licences — Friday deals and the customer-offer queue
 * (docs/AXTO-APPS-BLUEPRINT.md §15), list prices, negotiated deals, device
 * activations. Offline activations cannot be switched off remotely, so
 * "Retire device" only frees a slot after the customer confirms the old
 * hardware is gone; revoking a licence stops NEW activations and downloads. */
"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/i18n";
import { Alert, Field, LoadingBlock, PageHeader, Section, StatusBadge } from "@/components/ui";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";
import type { DealConfig, DealState } from "@/lib/lifetime-deals";

interface Tier { devices: number; label: string; app: number; suite: number }
interface Act { id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string }
interface Lic { id: string; email: string; name: string; scope: string; product: string; productName: string; devices: number; updates_until: string; status: string; order_id: string; note: string; created_at: string; activations: Act[] }

const APPS = SELF_HOSTED.map((p) => ({ slug: p.slug, name: catalogEntry(p.slug)?.name || p.slug }));

interface Offer {
  id: string; email: string; scope: string; product: string; productName: string; devices: number; list_usd: number; offer_usd: number; note: string;
  status: string; agreed_usd: number; admin_note: string; decided_by: string; decided_at: string; valid_until: string; order_id: string; created_at: string; dealUsd: number;
}
const OFFER_BADGE: Record<string, string> = { pending: "badge-amber", accepted: "badge-green", countered: "badge-gold", declined: "badge-red", withdrawn: "badge-gray", expired: "badge-gray", paid: "badge-green" };
const when = (d: DealState["active"]) => (d ? `${d.kind === "lastFriday" ? "Last Friday of the month" : "Friday"} ${d.date} · −${d.pct}%` : "");

/** Friday deals (automatic) and the rules for customer offers. */
function DealSettings({ onSaved }: { onSaved: (ok: boolean, text: string) => void }) {
  const [d, setD] = useState<{ cfg: DealConfig; defaults: DealConfig; maxPct: number; deal: DealState } | null>(null);
  const [c, setC] = useState<DealConfig | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ cfg: DealConfig; defaults: DealConfig; maxPct: number; deal: DealState }>("/api/admin/lifetime/deals");
    if (r.ok) { setD(r.data); setC(r.data.cfg); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    const r = await api<{ deal: DealState }>("/api/admin/lifetime/deals", { method: "PUT", body: c });
    onSaved(r.ok, r.ok ? "Deal settings saved — prices on /pricing and checkout follow them immediately." : r.error);
    if (r.ok) load();
  }
  if (!d || !c) return null;
  const num = (k: keyof DealConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: Number(e.target.value) });
  return (
    <Section title="Friday deals & offer rules" description="Automatic: every Friday and a bigger discount on the last Friday of the month, counted 00:00–23:59 in the time zone below. Checkout charges the lowest valid price — deal or agreed offer, never both.">
      <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm" data-testid="admin-deal-state">
        {d.deal.active ? <><span className="badge-gold">Live now</span> <b>{when(d.deal.active)}</b> · ends {formatDate(d.deal.active.endsAt)}</> : <span className="text-slate-600">No deal today.</span>}
        {d.deal.next ? <span className="ml-2 text-slate-600">Next: <b>{when(d.deal.next)}</b></span> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Friday deals">
          <select className="select" value={c.enabled ? "on" : "off"} onChange={(e) => setC({ ...c, enabled: e.target.value === "on" })}><option value="on">On</option><option value="off">Off</option></select>
        </Field>
        <Field label={`Every Friday (%, 0–${d.maxPct})`}><input className="input" type="number" min={0} max={d.maxPct} value={c.fridayPct} onChange={num("fridayPct")} /></Field>
        <Field label={`Last Friday of the month (%, 0–${d.maxPct})`}><input className="input" type="number" min={0} max={d.maxPct} value={c.lastFridayPct} onChange={num("lastFridayPct")} /></Field>
        <Field label="Time zone (IANA)"><input className="input" value={c.tz} onChange={(e) => setC({ ...c, tz: e.target.value.trim() })} placeholder="Asia/Jakarta" /></Field>
        <Field label="Customer offers">
          <select className="select" value={c.offersEnabled ? "on" : "off"} onChange={(e) => setC({ ...c, offersEnabled: e.target.value === "on" })}><option value="on">Open</option><option value="off">Closed</option></select>
        </Field>
        <Field label="Refuse offers below (% of list)" hint="Kept private — customers only hear “too low”."><input className="input" type="number" min={1} max={100} value={c.minOfferPct} onChange={num("minOfferPct")} /></Field>
        <Field label="Agreed price valid (days)"><input className="input" type="number" min={1} max={60} value={c.offerValidDays} onChange={num("offerValidDays")} /></Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => setC(d.defaults)}>Reset to defaults (30 % · 50 % · Asia/Jakarta)</button>
        <button className="btn-primary" onClick={save} data-testid="admin-deal-save">Save deal settings</button>
      </div>
    </Section>
  );
}

/** Customer offers: accept, counter (admin's price) or decline (reason the customer sees). */
function OfferQueue({ onDone }: { onDone: (ok: boolean, text: string) => void }) {
  const [rows, setRows] = useState<Offer[] | null>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<{ id: string; mode: "counter" | "decline" | "accept" } | null>(null);
  const [form, setForm] = useState({ agreedUsd: "", note: "" });
  const load = useCallback(async () => {
    const r = await api<{ offers: Offer[] }>(`/api/admin/lifetime/offers${filter ? `?status=${filter}` : ""}`);
    if (r.ok) setRows(r.data.offers);
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  async function decide(o: Offer, action: "accept" | "counter" | "decline") {
    const r = await api<{ offer: Offer }>("/api/admin/lifetime/offers", { body: { action, id: o.id, agreedUsd: action === "counter" ? Number(form.agreedUsd) : undefined, note: form.note } });
    onDone(r.ok, r.ok ? `Offer ${action === "accept" ? "accepted" : action === "counter" ? "countered" : "declined"} — ${o.email} has been e-mailed.` : r.error);
    if (r.ok) { setOpen(null); setForm({ agreedUsd: "", note: "" }); load(); }
  }
  const pending = (rows || []).filter((o) => o.status === "pending").length;
  return (
    <section id="offers" className="scroll-mt-20">
      <Section title="Customer offers" description={`${pending} waiting for a decision. Accepting or countering reserves the price; the customer pays it in the portal and the licence is issued automatically.`}
        actions={<select className="select w-44" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter offers">
          <option value="">All (pending first)</option>{["pending", "accepted", "countered", "declined", "withdrawn", "expired", "paid"].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>}>
        {!rows ? <LoadingBlock /> : rows.length ? (
          <div className="overflow-x-auto">
            <table className="table" data-testid="admin-offers">
              <thead><tr><th>Received</th><th>Customer</th><th>Licence</th><th>List · today</th><th>Offer</th><th>Status</th><th /></tr></thead>
              <tbody>{rows.map((o) => {
                const below = Math.round((1 - o.offer_usd / o.list_usd) * 100);
                return [
                  <tr key={o.id}>
                    <td className="text-xs">{formatDate(o.created_at)}</td>
                    <td className="text-xs">{o.email}{o.note ? <div className="mt-0.5 max-w-xs text-slate-500">“{o.note}”</div> : null}</td>
                    <td>{o.productName}<div className="text-xs text-slate-500">{o.devices} device{o.devices === 1 ? "" : "s"}{o.scope === "suite" ? " / app" : ""}</div></td>
                    <td className="text-xs">{formatMoney(o.list_usd)}{o.dealUsd ? <div className="text-gold-700">Friday {formatMoney(o.dealUsd)}</div> : null}</td>
                    <td><b>{formatMoney(o.offer_usd)}</b><div className="text-xs text-slate-500">{below}% below list</div>{o.agreed_usd && o.agreed_usd !== o.offer_usd ? <div className="text-xs">agreed {formatMoney(o.agreed_usd)}</div> : null}</td>
                    <td><span className={OFFER_BADGE[o.status] || "badge-gray"}>{o.status}</span>{o.valid_until && (o.status === "accepted" || o.status === "countered") ? <div className="text-xs text-slate-500">until {formatDate(o.valid_until)}</div> : null}{o.order_id ? <div className="text-xs text-slate-500">order {o.order_id}</div> : null}</td>
                    <td className="whitespace-nowrap text-right">
                      {o.status === "pending" ? <>
                        <button className="btn-primary btn-sm" onClick={() => { setOpen({ id: o.id, mode: "accept" }); setForm({ agreedUsd: "", note: "" }); }}>Accept</button>
                        <button className="btn-ghost btn-sm" onClick={() => { setOpen({ id: o.id, mode: "counter" }); setForm({ agreedUsd: String(Math.round((o.offer_usd + o.list_usd) / 2)), note: "" }); }}>Counter</button>
                        <button className="btn-ghost btn-sm text-rose-600" onClick={() => { setOpen({ id: o.id, mode: "decline" }); setForm({ agreedUsd: "", note: "" }); }}>Decline</button>
                      </> : o.admin_note ? <span className="text-xs text-slate-500" title={o.admin_note}>{o.decided_by}</span> : null}
                    </td>
                  </tr>,
                  open?.id === o.id ? (
                    <tr key={`${o.id}-d`}><td colSpan={7} className="bg-slate-50">
                      <div className="grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-end">
                        {open.mode === "counter" ? (
                          <Field label="Your price (USD)" hint={`Above ${formatMoney(o.offer_usd)}, below ${formatMoney(o.list_usd)}`}>
                            <input className="input" type="number" min={o.offer_usd + 1} max={o.list_usd - 1} value={form.agreedUsd} onChange={(e) => setForm({ ...form, agreedUsd: e.target.value })} />
                          </Field>
                        ) : <div className="text-sm font-semibold">{open.mode === "accept" ? `Accept ${formatMoney(o.offer_usd)}` : "Decline"}</div>}
                        <Field label={open.mode === "decline" ? "Reason (the customer sees it)" : "Message to the customer (optional)"}>
                          <input className="input" maxLength={600} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                        </Field>
                        <span className="flex gap-2">
                          <button className="btn-ghost" onClick={() => setOpen(null)}>Cancel</button>
                          <button className={open.mode === "decline" ? "btn-danger" : "btn-primary"} onClick={() => decide(o, open.mode)} data-testid="admin-offer-confirm">
                            {open.mode === "accept" ? "Accept offer" : open.mode === "counter" ? "Send counter-offer" : "Decline offer"}
                          </button>
                        </span>
                      </div>
                    </td></tr>
                  ) : null,
                ];
              })}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-500">No offers{filter ? ` with status “${filter}”` : ""} yet.</p>}
      </Section>
    </section>
  );
}

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

        <OfferQueue onDone={done} />
        <DealSettings onSaved={(ok, text) => setMsg({ tone: ok ? "success" : "error", text })} />

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

        <Section title="List prices (USD)" description="Shown on /pricing and used by checkout (the Friday deal is taken off these). Card is offered up to $999,999; above that the customer pays by wire or crypto.">
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
