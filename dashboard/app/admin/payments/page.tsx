/* Admin → Payments & e-mail.
 * Each automatic method has two SEPARATE credential sets — Live (real money)
 * and Sandbox (the provider's test environment) — and one switch for which set
 * checkout uses. Everything is saved AES-256-GCM encrypted in R2; secrets come
 * back masked and are kept when a masked/blank value is saved. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { PageHeader, Alert, LoadingBlock, CopyButton } from "@/components/ui";

type Env = "live" | "sandbox";
interface Field { key: string; label: string; secret?: boolean; placeholder?: string; sandboxPlaceholder?: string; multiline?: boolean; hint?: string }
interface EnvState { available: boolean; configured: boolean; values: Record<string, string> }
interface Gateway {
  id: string; label: string; methods: string; currency: string; confirmation: "automatic" | "admin"; envs: Env[]; fields: Field[]; requires: string;
  active: boolean; mode: Env; ready: boolean; updatedAt: string; updatedBy: string;
  live: EnvState; sandbox: EnvState; webhookUrl: string; events: string; keysAt: string;
}
type Msg = { tone: "success" | "error" | "info" | "warn"; text: string } | null;
const ENV_LABEL: Record<Env, string> = { live: "Live", sandbox: "Sandbox" };
/** Words that fit the method: API keys, bank details or wallet addresses. */
const nouns = (g: Gateway, env: Env) => g.id === "manual" ? { thing: "bank details", check: "Check details" }
  : g.id === "crypto" ? { thing: "wallet addresses", check: "Check addresses" }
  : { thing: `${ENV_LABEL[env]} credentials`, check: "Test connection" };

export default function PaymentsPage() {
  const [data, setData] = useState<{ gateways: Gateway[]; email: { fields: Field[]; values: Record<string, string>; configured: boolean } } | null>(null);
  const [error, setError] = useState("");
  const load = () => api<any>("/api/admin/gateways").then((r) => (r.ok ? setData(r.data) : setError(r.error || "Could not load settings.")));
  useEffect(() => { load(); }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <LoadingBlock />;
  const testing = data.gateways.filter((g) => g.active && g.mode === "sandbox");
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Payments & e-mail"
        description="Each payment method keeps two separate sets of keys: Live (real money) and Sandbox (the provider's test environment). Choose which set checkout uses, and switch the method on or off. Everything is stored encrypted — never in the database or the code." />
      {testing.length ? (
        <div className="mb-5"><Alert tone="warn" title="Sandbox is live at checkout">
          {testing.map((g) => g.label).join(", ")} {testing.length === 1 ? "runs" : "run"} in Sandbox mode: customers see “TEST MODE”, can pay with test cards and get access without real money. Test orders are marked TEST and never count as revenue. Switch to Live before launch.
        </Alert></div>
      ) : null}
      <Overview gateways={data.gateways} />
      <div className="mt-5"><RateCard ccy="IDR" />
        <RateCard ccy="EUR" /></div>
      <div className="mt-5 grid gap-5">
        {data.gateways.map((g) => <GatewayCard key={g.id} g={g} onChange={load} />)}
        <EmailCard e={data.email} onSaved={load} />
      </div>
    </>
  );
}

function checkoutLabel(g: Gateway) {
  if (!g.active) return <span className="badge-gray">Off</span>;
  if (!g.ready) return <span className="badge-red">On — missing {ENV_LABEL[g.mode]} keys</span>;
  return g.mode === "sandbox" ? <span className="badge-amber">Sandbox · TEST</span> : <span className="badge-green">Live</span>;
}
const envCell = (g: Gateway, e: Env) => !g.envs.includes(e) ? <span className="text-xs text-slate-400">n/a</span>
  : g[e].configured ? <span className="text-emerald-700">✓ saved</span> : <span className="text-slate-400">— empty</span>;

function Overview({ gateways }: { gateways: Gateway[] }) {
  return (
    <section className="card overflow-x-auto">
      <table className="table min-w-[640px]">
        <thead><tr><th>Payment method</th><th>At checkout</th><th>Live keys</th><th>Sandbox keys</th><th>Last change</th></tr></thead>
        <tbody>{gateways.map((g) => (
          <tr key={g.id}>
            <td><a href={`#gw-${g.id}`} className="font-medium text-slate-900">{g.label}</a><div className="text-xs text-slate-500">{g.currency} · {g.confirmation === "automatic" ? "confirmed automatically" : "confirmed by you"}</div></td>
            <td>{checkoutLabel(g)}</td>
            <td>{envCell(g, "live")}</td>
            <td>{envCell(g, "sandbox")}</td>
            <td className="text-xs text-slate-500">{g.updatedAt ? `${formatDate(g.updatedAt)}${g.updatedBy ? ` · ${g.updatedBy}` : ""}` : "never"}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function GatewayCard({ g, onChange }: { g: Gateway; onChange: () => void }) {
  const [tab, setTab] = useState<Env>(g.mode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const hasSandbox = g.envs.includes("sandbox");

  async function patch(body: { active?: boolean; mode?: Env }, confirmText: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/gateways", { method: "PATCH", body: { gateway: g.id, ...body } });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: "Checkout updated." }); onChange(); } else setMsg({ tone: "error", text: r.error || "Could not update." });
  }
  const toggle = () => patch({ active: !g.active }, g.active
    ? `Stop offering ${g.label} at checkout? Open orders can still be completed.`
    : g.mode === "live" ? `Offer ${g.label} at checkout with the LIVE keys? Customers pay real money.`
      : `Offer ${g.label} at checkout in SANDBOX mode? Customers see “TEST MODE”, can pay with test cards and get access without real money.`);
  const switchTo = (mode: Env) => mode === g.mode ? undefined : patch({ mode }, !g.active ? "" : mode === "live"
    ? `Switch ${g.label} to LIVE? From now on customers pay real money with the Live keys.`
    : `Switch ${g.label} to SANDBOX? Customers will see “TEST MODE” and can pay with test cards — only do this while testing.`);

  return (
    <section id={`gw-${g.id}`} className="card-pad scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{g.label}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{g.methods} · charged in {g.currency} · {g.confirmation === "automatic" ? "confirmed automatically" : "you confirm each payment in Orders → Mark paid"}</p>
        </div>
        {checkoutLabel(g)}
      </div>

      {/* 1. What checkout does */}
      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer at checkout</div>
          <label className="mt-2 flex cursor-pointer items-center gap-3">
            <button type="button" role="switch" aria-checked={g.active} aria-label={`Offer ${g.label} at checkout`} disabled={busy} onClick={toggle}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${g.active ? "bg-brand-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${g.active ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <span className="text-sm font-medium text-slate-900">{g.active ? "On — customers can choose it" : "Off — hidden from customers"}</span>
          </label>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{hasSandbox ? "Keys checkout uses" : "Environment"}</div>
          {hasSandbox ? (
            <div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="radiogroup" aria-label="Environment">
              {(["live", "sandbox"] as Env[]).map((e) => (
                <button key={e} type="button" role="radio" aria-checked={g.mode === e} disabled={busy} onClick={() => switchTo(e)}
                  className={`rounded-md px-4 py-1.5 text-sm font-semibold ${g.mode === e ? (e === "live" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white") : "text-slate-600 hover:bg-slate-50"}`}>
                  {ENV_LABEL[e]}{g[e].configured ? "" : " (empty)"}
                </button>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-slate-700">Live only — these are your real {g.id === "manual" ? "bank" : "wallet"} details; there is no sandbox.</p>}
          <p className="mt-1 text-xs text-slate-500">{g.mode === "live" ? "Live = real payments." : "Sandbox = the provider's test environment, no real money."}</p>
        </div>
      </div>
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      {/* 2. The two credential sets */}
      {hasSandbox ? (
        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
          {(["live", "sandbox"] as Env[]).map((e) => (
            <button key={e} type="button" role="tab" aria-selected={tab === e} onClick={() => setTab(e)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${tab === e ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {ENV_LABEL[e]} keys <span className={`ml-1 inline-block h-2 w-2 rounded-full ${g[e].configured ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
              {g.active && g.mode === e ? <span className="ml-2 text-[11px] font-bold uppercase text-brand-600">in use</span> : null}
            </button>
          ))}
        </div>
      ) : <div className="mt-5 text-sm font-semibold text-slate-900">Details shown to customers</div>}
      <EnvForm key={`${g.id}-${tab}-${g.updatedAt}`} g={g} env={hasSandbox ? tab : "live"} onChange={onChange} />

      {/* 3. Setup help */}
      {g.webhookUrl || g.keysAt ? (
        <details className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">How to set it up</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {g.keysAt ? <li>Keys: {g.keysAt}. Paste Live keys in the Live tab and test keys in the Sandbox tab.</li> : null}
            {g.webhookUrl ? <li className="break-all">Notification / webhook URL (the same for Live and Sandbox — each is verified with its own secret): <code className="font-mono text-slate-900">{g.webhookUrl}</code> <CopyButton text={g.webhookUrl} className="btn-ghost btn-sm" /></li> : null}
            {g.events ? <li>Enable: <b>{g.events}</b>.</li> : null}
            <li>Press <b>Test connection</b>, then switch the method on. Sandbox payments are marked TEST and can never pay a Live order.</li>
          </ol>
        </details>
      ) : null}
      <p className="mt-3 text-xs text-slate-400">{g.updatedAt ? `Last changed ${formatDate(g.updatedAt)}${g.updatedBy ? ` by ${g.updatedBy}` : ""}.` : "Never configured."} Required: {g.requires}.</p>
    </section>
  );
}

function EnvForm({ g, env, onChange }: { g: Gateway; env: Env; onChange: () => void }) {
  const saved = g[env].values;
  // null = remove this saved secret on Save (an empty secret field keeps the stored value).
  const [values, setValues] = useState<Record<string, string | null>>(saved);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const { thing, check } = nouns(g, env);
  const Thing = thing[0].toUpperCase() + thing.slice(1);

  async function save() {
    setBusy("save"); setMsg(null);
    const r = await api("/api/admin/gateways", { method: "PUT", body: { gateway: g.id, env, credentials: values } });
    setBusy("");
    // PayPal: the save also checks the keys and sets up the webhook — say how that went.
    const setup = r.ok ? (r.data as { setup?: { ok: boolean; message: string } }).setup : undefined;
    if (r.ok) { setMsg({ tone: setup && !setup.ok ? "error" : "success", text: setup ? `${Thing} saved. ${setup.message}` : `${Thing} saved.` }); onChange(); } else setMsg({ tone: "error", text: r.error || "Could not save." });
  }
  async function test() {
    setBusy("test"); setMsg(null);
    const r = await api<{ ok: boolean; message: string }>("/api/admin/gateways", { body: { gateway: g.id, env, action: "test" } });
    setBusy("");
    if (r.ok) setMsg({ tone: r.data.ok ? "success" : "error", text: r.data.message }); else setMsg({ tone: "error", text: r.error || "Test failed." });
  }
  async function clear() {
    const inUse = g.active && g.mode === env;
    if (!confirm(`Delete all saved ${thing} of ${g.label}?${inUse ? " They are in use at checkout, so the method will be switched off." : ""} This cannot be undone.`)) return;
    setBusy("clear"); setMsg(null);
    const r = await api<{ switchedOff: boolean }>("/api/admin/gateways", { method: "DELETE", body: { gateway: g.id, env } });
    setBusy("");
    if (r.ok) { setMsg({ tone: "info", text: `${Thing} deleted${r.data.switchedOff ? " and the method switched off" : ""}.` }); onChange(); } else setMsg({ tone: "error", text: r.error || "Could not delete." });
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {g.fields.map((f) => {
          const id = `${g.id}-${env}-${f.key}`;
          const example = (env === "sandbox" && f.sandboxPlaceholder) || f.placeholder || "";
          return (
            <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={id}>{f.label}{f.secret ? <span className="ml-1 text-xs font-normal text-slate-400">🔒 encrypted</span> : null}
                {f.secret && saved[f.key] ? (values[f.key] === null
                  ? <button type="button" className="ml-2 text-xs font-semibold text-slate-500" onClick={() => setValues({ ...values, [f.key]: saved[f.key] })}>undo</button>
                  : <button type="button" className="ml-2 text-xs font-semibold text-rose-600" onClick={() => setValues({ ...values, [f.key]: null })}>remove</button>) : null}
              </label>
              {f.multiline ? (
                <textarea id={id} className="input min-h-[80px]" value={values[f.key] || ""} placeholder={example} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              ) : (
                <input id={id} className="input font-mono text-xs" value={values[f.key] || ""} autoComplete="off" spellCheck={false}
                  placeholder={values[f.key] === null ? "will be removed when you save" : f.secret && saved[f.key] ? "saved — leave as is to keep" : example}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              )}
              {f.hint ? <p className="mt-1 text-xs text-slate-500">{f.hint}</p> : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn-primary btn-sm" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving…" : `Save ${thing}`}</button>
        <button className="btn-secondary btn-sm" disabled={!!busy || !g[env].configured} onClick={test} title={g[env].configured ? "" : `Save the ${thing} first`}>{busy === "test" ? "Checking…" : check}</button>
        {g[env].configured ? <button className="btn-ghost btn-sm ml-auto text-rose-600" disabled={!!busy} onClick={clear}>Delete {thing}</button> : null}
      </div>
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
    </div>
  );
}

/** USD → IDR / EUR: what the rupiah methods (Xendit, Midtrans, BNI IDR) and the BNI EUR account charge. */
const RATE = {
  IDR: {
    key: "usd_idr_rate", read: "usdIdrRate", opt: "usdIdr", title: "Rupiah conversion (USD → IDR)",
    lead: "Prices are set in USD. Xendit, Midtrans and the BNI rupiah account charge the rupiah amount at this rate, rounded up to Rp1,000.",
    placeholder: "e.g. 16400", fmt: (n: number) => `Rp${n.toLocaleString("id-ID")}`, example: (r: number) => `Rp${(Math.ceil((12 * r) / 1000) * 1000).toLocaleString("id-ID")}`,
  },
  EUR: {
    key: "usd_eur_rate", read: "usdEurRate", opt: "usdEur", title: "Euro conversion (USD → EUR)",
    lead: "The BNI euro account is quoted at this rate, rounded up to the cent, so the dollar price always arrives in full.",
    placeholder: "e.g. 0.92", fmt: (n: number) => `€${n}`, example: (r: number) => `€${(Math.ceil(Math.round(12 * r * 1e6) / 1e4) / 100).toFixed(2)}`,
  },
} as const;

function RateCard({ ccy }: { ccy: keyof typeof RATE }) {
  const c = RATE[ccy];
  const [fixed, setFixed] = useState<string | null>(null);
  const [effective, setEffective] = useState(0);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const load = async () => {
    const [s, o] = await Promise.all([api<Record<string, string>>("/api/admin/settings"), api<Record<string, number>>("/api/billing/options")]);
    if (s.ok) { setFixed(s.data[c.read] || ""); setRate(s.data[c.read] || ""); }
    if (o.ok) setEffective(o.data[c.opt]);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(value: string) {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/settings", { method: "PUT", body: { [c.key]: value } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: value ? `Fixed at ${c.fmt(Number(value))} per USD.` : "Automatic daily rate restored." } : { tone: "error", text: r.error || "Could not save." });
    if (r.ok) load();
  }
  if (fixed === null) return null;
  return (
    <section className="card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{c.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{c.lead}</p>
        </div>
        <span className={fixed ? "badge-brand" : "badge-gray"}>{fixed ? "Fixed rate" : "Automatic (daily market rate)"}</span>
      </div>
      <p className="mt-3 text-sm text-slate-700">In use now: <b>{c.fmt(effective)}</b> per USD · e.g. US$12 → <b>{c.example(effective)}</b></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input w-48" inputMode="decimal" placeholder={c.placeholder} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} aria-label={`Fixed USD to ${ccy} rate`} />
        <button className="btn-primary btn-sm" disabled={busy || !rate.trim()} onClick={() => save(rate.trim())}>Fix this rate</button>
        {fixed ? <button className="btn-secondary btn-sm" disabled={busy} onClick={() => { setRate(""); save(""); }}>Use the automatic rate</button> : null}
      </div>
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
    </section>
  );
}

function EmailCard({ e, onSaved }: { e: { fields: Field[]; values: Record<string, string>; configured: boolean }; onSaved: () => void }) {
  const [values, setValues] = useState(e.values);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
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
