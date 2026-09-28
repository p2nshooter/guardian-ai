"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Field, Spinner } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";

function ResetForm() {
  const { t } = useI18n();
  const token = useSearchParams().get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { setError(t("auth.mismatch")); return; }
    setBusy(true); setError("");
    const r = await api<{ redirect: string }>("/api/auth/reset", { body: { token, password: pw } });
    if (r.ok) { window.location.href = r.data.redirect || "/app"; return; }
    setError(r.error); setBusy(false);
  }

  if (!token) {
    return (
      <div className="card-pad">
        <Alert tone="warn">{t("auth.noToken")}</Alert>
        <Link href="/forgot-password" className="btn-primary mt-4 w-full">{t("auth.sendLink")}</Link>
      </div>
    );
  }
  return (
    <div className="card-pad">
      <h1 className="text-2xl font-bold">{t("auth.resetTitle")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={t("auth.newPassword")} hint={t("auth.pwHint")} htmlFor="pw">
          <PasswordInput id="pw" value={pw} onChange={setPw} autoComplete="new-password" />
        </Field>
        <Field label={t("auth.confirmPassword")} htmlFor="pw2">
          <PasswordInput id="pw2" value={pw2} onChange={setPw2} autoComplete="new-password" />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> {t("auth.working")}</> : t("auth.setPassword")}</button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold">← {t("auth.backToSignin")}</Link></p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetForm /></Suspense>;
}
