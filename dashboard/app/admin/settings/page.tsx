/* Admin → Settings. Local Mode (AI on the member's device) on/off, the list of
 * admin accounts and changing your own admin password (the USD→IDR rate is on
 * Admin → Payments). */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, Spinner, Section } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";

interface AdminRow { id: string; email: string; name: string; last_login_at: string }

export default function AdminSettingsPage() {
  const [data, setData] = useState<{ usdIdrRate: string; localMode: boolean; admins: AdminRow[] } | null>(null);
  const [cur, setCur] = useState(""); const [next, setNext] = useState("");
  const [busy, setBusy] = useState<"" | "pw" | "local">("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const r = await api<{ usdIdrRate: string; localMode: boolean; admins: AdminRow[] }>("/api/admin/settings");
    if (r.ok) setData(r.data); else setMsg({ tone: "error", text: r.error || "Could not load settings." });
  };
  useEffect(() => { load(); }, []);

  async function changePw() {
    setBusy("pw"); setMsg(null);
    const r = await api("/api/admin/settings", { body: { action: "password", current: cur, next } });
    setBusy("");
    if (r.ok) { setCur(""); setNext(""); setMsg({ tone: "success", text: "Password changed." }); }
    else setMsg({ tone: "error", text: r.error || "Could not change the password." });
  }

  async function toggleLocal() {
    if (!data) return;
    setBusy("local"); setMsg(null);
    const r = await api("/api/admin/settings", { method: "PUT", body: { local_mode: !data.localMode } });
    setBusy("");
    if (r.ok) { setMsg({ tone: "success", text: data.localMode ? "Local Mode switched off for every member." : "Local Mode switched on." }); load(); }
    else setMsg({ tone: "error", text: r.error || "Could not save." });
  }

  if (!data) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Platform-wide settings and your admin account." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="mb-5">
        <Section title="🖥️ Local Mode — AI on the member's device" description="Members connect Ollama, LM Studio or another OpenAI-compatible server on their own computer; prompts are built in their browser and answers come from their model. AXTO relays nothing, stores nothing and pays nothing for these runs. Legal AI's expert instructions are assembled on the server around placeholders, so they stay private.">
          <div className="flex flex-wrap items-center gap-3" data-testid="admin-local">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.localMode ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`} data-testid="admin-local-state">{data.localMode ? "ON" : "OFF"}</span>
            <span className="text-sm text-slate-600">Included in every paid plan (Admin → Plans shows it in the matrix).</span>
            <button className={data.localMode ? "btn-secondary btn-sm" : "btn-primary btn-sm"} disabled={busy !== ""} onClick={toggleLocal} data-testid="admin-local-toggle">{busy === "local" ? <Spinner /> : data.localMode ? "Switch off" : "Switch on"}</button>
          </div>
        </Section>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="USD → IDR exchange rate">
          <p className="text-sm text-slate-600">The rupiah rate lives with the payment methods it affects: <a href="/admin/payments" className="font-semibold">Payments &amp; e-mail → Rupiah conversion</a>. Currently {data.usdIdrRate ? <b>fixed at Rp{Number(data.usdIdrRate).toLocaleString("id-ID")}</b> : <b>automatic</b>}.</p>
        </Section>
        <Section title="Change your password">
          <div className="grid gap-3">
            <label><span className="label">Current password</span><PasswordInput id="cur" value={cur} onChange={setCur} autoComplete="current-password" /></label>
            <label><span className="label">New password</span><PasswordInput id="next" value={next} onChange={setNext} autoComplete="new-password" /></label>
            <button className="btn-primary w-fit" disabled={busy !== "" || !next} onClick={changePw}>{busy === "pw" ? <Spinner /> : "Change password"}</button>
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <Section title={`Admin accounts (${data.admins.length})`}>
          <ul className="divide-y divide-slate-100">
            {data.admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><span className="font-semibold text-slate-900">{a.name || a.email}</span> <span className="text-slate-500">{a.email}</span></span>
                <span className="text-xs text-slate-500">{a.last_login_at ? `Last sign-in ${new Date(a.last_login_at).toLocaleString()}` : "Never signed in"}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
