"use client";
import Link from "next/link";
import { safeRedirect } from "@/lib/safe-redirect";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Field, Spinner } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";

function RegisterForm() {
  const { t } = useI18n();
  const q = useSearchParams();
  const plan = q.get("plan") || "";
  const redirect = safeRedirect(q.get("redirect") || q.get("next"), "");
  const [f, setF] = useState({ name: "", email: "", organization: "", password: "" });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api<{ redirect: string }>("/api/auth/register", { body: { ...f, acceptTerms: accept } });
    if (r.ok) {
      const next = redirect || (plan ? `/app/billing?welcome=1&plan=${encodeURIComponent(plan)}` : r.data.redirect || "/app");
      window.location.href = next;
      return;
    }
    setError(r.error); setBusy(false);
  }

  const [terms, privacy] = [t("auth.termsLink"), t("auth.privacyLink")];
  const sentence = t("auth.terms").split(/(\{terms\}|\{privacy\})/);

  return (
    <div className="card-pad">
      <h1 className="text-2xl font-bold">{t("auth.registerTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("auth.registerSub")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={t("auth.name")} htmlFor="name">
          <input id="name" className="input" autoComplete="name" value={f.name} onChange={(e) => set("name")(e.target.value)} required autoFocus />
        </Field>
        <Field label={t("auth.email")} htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email")(e.target.value)} required />
        </Field>
        <Field label={t("auth.org")} htmlFor="org">
          <input id="org" className="input" autoComplete="organization" value={f.organization} onChange={(e) => set("organization")(e.target.value)} />
        </Field>
        <Field label={t("auth.password")} hint={t("auth.pwHint")} htmlFor="password">
          <PasswordInput id="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
          <span>{sentence.map((p, i) => p === "{terms}" ? <Link key={i} href="/terms" target="_blank">{terms}</Link> : p === "{privacy}" ? <Link key={i} href="/privacy" target="_blank">{privacy}</Link> : p)}</span>
        </label>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <button className="btn-primary w-full" disabled={busy || !accept}>{busy ? <><Spinner /> {t("auth.working")}</> : t("auth.register")}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("auth.haveAccount")} <Link href={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="font-semibold">{t("auth.signin")}</Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-400">🔒 {t("auth.secure")}</p>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}
