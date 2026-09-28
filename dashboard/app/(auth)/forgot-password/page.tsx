"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Field, Spinner } from "@/components/ui";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await api("/api/auth/forgot", { body: { email } });
    setSent(true); setBusy(false);
  }

  return (
    <div className="card-pad">
      <h1 className="text-2xl font-bold">{t("auth.forgotTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("auth.forgotSub")}</p>
      {sent ? (
        <div className="mt-6"><Alert tone="success">{t("auth.linkSent")}</Alert></div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label={t("auth.email")} htmlFor="email">
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> {t("auth.working")}</> : t("auth.sendLink")}</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold">← {t("auth.backToSignin")}</Link></p>
    </div>
  );
}
