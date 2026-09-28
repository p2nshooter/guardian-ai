"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Field, Spinner } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";

function LoginForm() {
  const { t } = useI18n();
  const q = useSearchParams();
  const redirect = q.get("redirect") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api<{ redirect: string }>("/api/auth/login", { body: { email, password, redirect } });
    if (r.ok) { window.location.href = r.data.redirect || "/app"; return; }
    setError(r.error); setBusy(false);
  }

  return (
    <div className="card-pad">
      <h1 className="text-2xl font-bold">{t("auth.signinTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("auth.signinSub")}</p>
      {q.get("reset") ? <div className="mt-4"><Alert tone="success">{t("auth.linkSent")}</Alert></div> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={t("auth.email")} htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label={<span className="flex items-center justify-between">{t("auth.password")}<Link href="/forgot-password" className="text-xs font-semibold">{t("auth.forgot")}</Link></span>} htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> {t("auth.working")}</> : t("auth.signin")}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("auth.noAccount")} <Link href={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="font-semibold">{t("auth.register")}</Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-400">🔒 {t("auth.secure")}</p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
