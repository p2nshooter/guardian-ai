/* Admin → Settings. USD→IDR exchange-rate override for Indonesian payment
 * methods, the list of admin accounts, and changing your own admin password. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, Spinner, Section } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";

interface AdminRow { id: string; email: string; name: string; last_login_at: string }

export default function AdminSettingsPage() {
  const [data, setData] = useState<{ usdIdrRate: string; admins: AdminRow[] } | null>(null);
  const [rate, setRate] = useState("");
  const [cur, setCur] = useState(""); const [next, setNext] = useState("");
  const [busy, setBusy] = useState<"" | "rate" | "pw">("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const r = await api<{ usdIdrRate: string; admins: AdminRow[] }>("/api/admin/settings");
    if (r.ok) { setData(r.data); setRate(r.data.usdIdrRate || ""); } else setMsg({ tone: "error", text: r.error || "Could not load settings." });
  };
  useEffect(() => { load(); }, []);

  async function saveRate() {
    setBusy("rate"); setMsg(null);
    const r = await api("/api/admin/settings", { method: "PUT", body: { usd_idr_rate: rate.trim() } });
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: rate.trim() ? `Rate fixed at Rp${Number(rate).toLocaleString("id-ID")} per USD.` : "Automatic exchange rate restored." } : { tone: "error", text: r.error || "Could not save." });
    if (r.ok) load();
  }
  async function changePw() {
    setBusy("pw"); setMsg(null);
    const r = await api("/api/admin/settings", { body: { action: "password", current: cur, next } });
    setBusy("");
    if (r.ok) { setCur(""); setNext(""); setMsg({ tone: "success", text: "Password changed." }); }
    else setMsg({ tone: "error", text: r.error || "Could not change the password." });
  }

  if (!data) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Platform-wide settings and your admin account." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="USD → IDR exchange rate">
          <p className="text-sm text-slate-600">Used to convert plan prices for BNI bank transfer, QRIS and other rupiah methods. Leave empty to use the automatic daily rate.</p>
          <div className="mt-3 flex gap-2">
            <input className="input" inputMode="numeric" placeholder="Automatic (e.g. 16400)" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="USD to IDR rate" />
            <button className="btn-primary" disabled={busy !== ""} onClick={saveRate}>{busy === "rate" ? <Spinner /> : "Save"}</button>
          </div>
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
