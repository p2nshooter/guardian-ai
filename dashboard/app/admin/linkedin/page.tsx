/* Admin → LinkedIn auto-post (docs/BLUEPRINT-V4.md §35, REQUESTS 123). Two posts a
 * day — axto.io and xaa.es — from the promotion library, each on its own page at
 * its own time (WIB). The LinkedIn app's Client ID and Secret and the connected
 * token live only in the encrypted R2 document; this page sees the secret masked.
 * Also here: the library (preview, switch posts off, post one now) and the log. */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Alert, CopyButton, LoadingBlock, PageHeader, Section, Spinner, Steps, Tabs } from "@/components/ui";

type Brand = "axto" | "xaa";
interface Slot { enabled: boolean; org: string; orgName: string; time: string }
interface Settings {
  enabled: boolean; clientId: string; clientSecret: string; hasSecret: boolean; scopes: string; version: string;
  token: { connected: boolean; expiresAt: string; refresh: boolean; refreshExpiresAt: string; scope: string; connectedAt: string; connectedBy: string } | null;
  brands: Record<Brand, Slot>; disabled: string[];
}
interface Day { day: string; at: string; post: string }
interface Sched { brand: Brand; problem: string | null; today: Day & { status: string; url: string; error: string }; tomorrow: Day }
interface Item { id: string; brand: Brand; url: string; image: string; eyebrow: string; preview: string; enabled: boolean }
interface Run { id: string; brand: string; day: string; kind: string; post_id: string; status: string; attempts: number; url: string; error: string; by: string; created_at: string }
interface View { settings: Settings; defaults: { scopes: string; version: string }; redirectUri: string; schedule: Sched[]; library: Item[]; log: Run[] }

const NAME: Record<Brand, string> = { axto: "axto.io", xaa: "xaa.es" };
const wib = (iso: string) => iso ? `${new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB` : "—";
const badge = (s: string) => s === "posted" ? "badge-green" : s === "failed" ? "badge-red" : s === "posting" ? "badge-amber" : "badge-gray";

export default function AdminLinkedInPage() {
  const [v, setV] = useState<View | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "warn"; text: string } | null>(null);
  const [tab, setTab] = useState<Brand>("axto");
  const [orgs, setOrgs] = useState<{ id: string; name: string }[] | null>(null);

  const take = (d: View) => { setV(d); setS(d.settings); };
  const load = useCallback(async () => {
    const r = await api<View>("/api/admin/linkedin");
    if (r.ok) take(r.data); else setMsg({ tone: "error", text: r.error });
  }, []);
  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setMsg({ tone: "success", text: "LinkedIn connected. Choose the page for each brand, then switch daily posting on." });
    if (q.get("error")) setMsg({ tone: "error", text: `LinkedIn: ${q.get("error")}` });
    if (q.get("connected") || q.get("error")) window.history.replaceState(null, "", "/admin/linkedin");
  }, [load]);

  const byId = useMemo(() => new Map((v?.library || []).map((p) => [p.id, p])), [v]);
  if (!v || !s) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const set = (p: Partial<Settings>) => setS({ ...s, ...p });
  const setSlot = (b: Brand, p: Partial<Slot>) => setS({ ...s, brands: { ...s.brands, [b]: { ...s.brands[b], ...p } } });

  async function save(extra: Partial<Settings> = {}) {
    setBusy("save"); setMsg(null);
    const r = await api<View>("/api/admin/linkedin", { method: "PUT", body: { settings: { ...s, ...extra } } });
    setBusy("");
    if (r.ok) { take(r.data); setMsg({ tone: "success", text: "Saved." }); } else setMsg({ tone: "error", text: r.error });
  }
  async function act(action: string, body: Record<string, unknown> = {}) {
    setBusy(action + String(body.postId || "")); setMsg(null);
    const r = await api<any>("/api/admin/linkedin", { body: { action, ...body } });
    setBusy("");
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    if (action === "connect") { window.location.href = r.data.url; return; }
    if (action === "orgs") { setOrgs(r.data.orgs); if (!r.data.orgs.length) setMsg({ tone: "warn", text: "This LinkedIn account administers no company page yet." }); return; }
    if (r.data.settings) take(r.data);
    if (action === "post_now") setMsg({ tone: "success", text: `Posted on LinkedIn${r.data.run?.url ? ` — ${r.data.run.url}` : ""}.` });
    if (action === "disconnect") setMsg({ tone: "success", text: "Disconnected; daily posting is off." });
  }
  const toggle = (id: string) => set({ disabled: s.disabled.includes(id) ? s.disabled.filter((x) => x !== id) : [...s.disabled, id] });

  const connected = !!s.token?.connected;
  const items = v.library.filter((p) => p.brand === tab);
  return (
    <>
      <PageHeader eyebrow="Configuration" title="LinkedIn auto-post"
        description="Two posts a day from the promotion library — one for axto.io, one for xaa.es — each on its own LinkedIn page at its own time." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Daily posting">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800">
            <input type="checkbox" className="accent-brand-600" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} data-testid="li-enabled" />
            Post automatically every day
          </label>
          <div className="mt-4 space-y-4">
            {(["axto", "xaa"] as Brand[]).map((b) => {
              const sc = v.schedule.find((x) => x.brand === b)!;
              const today = byId.get(sc.today.post), next = byId.get(sc.tomorrow.post);
              return (
                <div key={b} className="rounded-xl border border-slate-200 p-4" data-testid={`li-brand-${b}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 font-bold text-slate-900"><input type="checkbox" className="accent-brand-600" checked={s.brands[b].enabled} onChange={(e) => setSlot(b, { enabled: e.target.checked })} /> {NAME[b]}</label>
                    <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">Time (WIB)
                      <input type="time" className="input w-28" value={s.brands[b].time} onChange={(e) => setSlot(b, { time: e.target.value })} data-testid={`li-time-${b}`} />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input className="input font-mono" placeholder="Page number (linkedin.com/company/<number>/admin)" value={s.brands[b].org} onChange={(e) => setSlot(b, { org: e.target.value.replace(/\D/g, ""), orgName: "" })} data-testid={`li-org-${b}`} />
                    {orgs?.length ? (
                      <select className="select" value={s.brands[b].org} onChange={(e) => { const o = orgs.find((x) => x.id === e.target.value); setSlot(b, { org: o?.id || "", orgName: o?.name || "" }); }}>
                        <option value="">Choose a page…</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    ) : null}
                  </div>
                  {s.brands[b].orgName ? <p className="mt-1 text-xs text-slate-500">Page: {s.brands[b].orgName}</p> : null}
                  {sc.problem ? <p className="mt-2 text-xs text-amber-800">{sc.problem}</p> : null}
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today · {wib(sc.today.at)}</div>
                      <div className="mt-1 font-semibold text-slate-800">{today?.eyebrow || "—"}</div>
                      {sc.today.status ? <span className={`mt-1 inline-block ${badge(sc.today.status)}`}>{sc.today.status}</span> : null}
                      {sc.today.url ? <a className="ml-2 text-xs" href={sc.today.url} target="_blank" rel="noopener">open ↗</a> : null}
                      {sc.today.error ? <div className="mt-1 text-xs text-rose-700">{sc.today.error}</div> : null}
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tomorrow · {wib(sc.tomorrow.at)}</div>
                      <div className="mt-1 font-semibold text-slate-800">{next?.eyebrow || "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => save()} disabled={!!busy} data-testid="li-save">{busy === "save" ? <Spinner /> : null} Save</button>
            {connected ? <button className="btn-secondary" onClick={() => act("orgs")} disabled={!!busy}>{busy === "orgs" ? <Spinner /> : null} Find my pages</button> : null}
          </div>
        </Section>

        <Section title="LinkedIn app & connection">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Client ID
              <input className="input mt-1 font-mono" value={s.clientId} onChange={(e) => set({ clientId: e.target.value.trim() })} autoComplete="off" data-testid="li-client-id" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Client Secret
              <input className="input mt-1 font-mono" type="password" value={s.clientSecret} placeholder={s.hasSecret ? "saved — type to replace" : ""} onChange={(e) => set({ clientSecret: e.target.value })} autoComplete="new-password" data-testid="li-client-secret" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Scopes
              <input className="input mt-1 font-mono text-xs" value={s.scopes} onChange={(e) => set({ scopes: e.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">LinkedIn-Version (YYYYMM)
              <input className="input mt-1 font-mono" value={s.version} maxLength={6} onChange={(e) => set({ version: e.target.value.replace(/\D/g, "") })} />
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Redirect URL — add it in the LinkedIn app (Auth → Authorized redirect URLs)</div>
            <div className="mt-1 flex items-center justify-between gap-2 break-all font-mono text-xs" data-testid="li-redirect">{v.redirectUri}<CopyButton text={v.redirectUri} className="btn-secondary btn-sm shrink-0" /></div>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm" data-testid="li-connection">
            {connected ? (
              <>
                <div className="font-semibold text-emerald-800">✓ Connected{s.token!.connectedBy ? ` by ${s.token!.connectedBy}` : ""}</div>
                <div className="mt-1 text-xs text-slate-600">Token until {s.token!.expiresAt.slice(0, 10) || "—"} · {s.token!.refresh ? `renews itself (refresh until ${s.token!.refreshExpiresAt.slice(0, 10) || "—"})` : "no refresh token — you will get an e-mail to reconnect 7 days before it ends"}</div>
                {s.token!.scope ? <div className="mt-1 font-mono text-[11px] text-slate-500">{s.token!.scope}</div> : null}
              </>
            ) : <div className="text-slate-600">Not connected.</div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => save()} disabled={!!busy}>Save app details</button>
            <button className="btn-primary" onClick={() => act("connect")} disabled={!!busy || !s.clientId || !s.hasSecret} data-testid="li-connect">{busy === "connect" ? <Spinner /> : null} {connected ? "Reconnect" : "Connect LinkedIn"}</button>
            {connected ? <button className="btn-ghost" onClick={() => confirm("Disconnect LinkedIn? Daily posting stops.") && act("disconnect")} disabled={!!busy}>Disconnect</button> : null}
          </div>
          <details className="mt-4 rounded-lg border border-slate-200 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-800">Setup, step by step</summary>
            <div className="mt-3">
              <Steps steps={[
                { title: "Open the LinkedIn app", body: "LinkedIn Developer Portal → My apps → the app (its Client ID is entered above)." },
                { title: "Request the Community Management API", body: "Products → Community Management API. Posting as a company page needs the w_organization_social permission from this product; LinkedIn reviews the request. Until it is approved, Connect ends with “unauthorized_scope_error”." },
                { title: "Add the redirect URL", body: "Auth → Authorized redirect URLs for your app → add the URL shown above." },
                { title: "Create a fresh Client Secret", body: "Auth → Client credentials → generate a new secret, and paste it here only. A secret that was ever shared in a chat or an e-mail should be replaced." },
                { title: "Connect and choose the pages", body: "Press Connect LinkedIn and sign in as an administrator of the pages. Then Find my pages, pick the page for axto.io and for xaa.es (both may use AXTO Digital Global until their own pages exist), switch daily posting on and Save." },
              ]} />
            </div>
          </details>
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Promotion library (${v.library.length} posts · 28 per brand, four weeks without a repeat)`}
          actions={<Tabs value={tab} onChange={setTab} items={[{ id: "axto", label: "axto.io" }, { id: "xaa", label: "xaa.es" }]} />}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="li-library">
            {items.map((p) => {
              const on = !s.disabled.includes(p.id);
              return (
                <article key={p.id} className={`overflow-hidden rounded-xl border bg-white ${on ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`} data-testid="li-post">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.eyebrow} className="aspect-[1200/627] w-full bg-slate-100 object-cover" loading="lazy" />
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{p.eyebrow}</span>
                      <label className="ml-auto flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" className="accent-brand-600" checked={on} onChange={() => toggle(p.id)} /> in rotation</label>
                    </div>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-snug text-slate-700">{p.preview}</pre>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="btn-secondary btn-sm" disabled={!!busy || !connected} onClick={() => confirm(`Post “${p.eyebrow}” on the ${NAME[p.brand]} page now?`) && act("post_now", { brand: p.brand, postId: p.id })}>
                        {busy === `post_now${p.id}` ? <Spinner /> : null} Post now
                      </button>
                      <CopyButton text={p.preview} label="Copy text" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Switching posts in or out of the rotation takes effect when you press Save above.</p>
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Log (${v.log.length})`}>
          {!v.log.length ? <p className="text-sm text-slate-500">Nothing posted yet.</p> : (
            <div className="overflow-x-auto">
              <table className="table min-w-[760px]">
                <thead><tr><th>When</th><th>Brand</th><th>Post</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {v.log.map((r) => (
                    <tr key={r.id} data-testid="li-log-row">
                      <td className="text-xs">{wib(r.created_at)}<div className="text-[11px] text-slate-400">{r.kind === "manual" ? `by hand · ${r.by}` : "daily"}</div></td>
                      <td>{NAME[r.brand as Brand] || r.brand}</td>
                      <td className="text-xs">{byId.get(r.post_id)?.eyebrow || r.post_id}</td>
                      <td><span className={badge(r.status)}>{r.status}</span>{r.attempts > 1 ? <span className="ml-1 text-[11px] text-slate-500">×{r.attempts}</span> : null}</td>
                      <td className="max-w-xs text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener">open on LinkedIn ↗</a> : <span className="text-rose-700">{r.error}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
