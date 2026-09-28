/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Frame for the auth pages: the form card on the right, the value of an AXTO
 * account on the left (hidden on phones so the form is first), language switch.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

const POINTS = {
  en: [
    ["⚖️", "Legal AI for 190+ countries", "Filter by country, state or province; restructure a case file against current law, with sources."],
    ["🔑", "Your own AI — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter or your private model. Unlimited use, your data stays yours."],
    ["🖥️", "Self-hosted editions", "Business & Enterprise run the apps on your own servers with a signed licence."],
    ["⚡", "Instant activation", "Pay by card, PayPal, crypto or bank transfer — your plan and licences activate automatically."],
  ],
  id: [
    ["⚖️", "Legal AI untuk 190+ negara", "Filter negara, negara bagian atau provinsi; susun ulang berkas perkara sesuai hukum terbaru, lengkap dengan sumber."],
    ["🔑", "AI milik Anda — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter atau model privat Anda. Tanpa batas, data tetap milik Anda."],
    ["🖥️", "Edisi self-hosted", "Business & Enterprise menjalankan aplikasi di server Anda sendiri dengan lisensi bertanda tangan."],
    ["⚡", "Aktivasi instan", "Bayar dengan kartu, PayPal, kripto atau transfer bank — paket dan lisensi aktif otomatis."],
  ],
} as const;

export default function AuthFrame({ children }: { children: ReactNode }) {
  const { lang, setLang } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="surface-ink relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <Link href="/" className="relative no-underline"><Logo dark /></Link>
        <div className="relative max-w-lg">
          <p className="eyebrow !text-brand-300">{lang === "id" ? "Ruang kerja AI profesional" : "The professional AI workspace"}</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            {lang === "id" ? "Kerjakan pekerjaan hukum, keamanan & bisnis 10× lebih cepat." : "Do legal, security & business work 10× faster."}
          </h2>
          <ul className="mt-8 space-y-5">
            {POINTS[lang].map(([icon, title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg" aria-hidden="true">{icon}</span>
                <div>
                  <div className="font-semibold text-white">{title}</div>
                  <div className="mt-0.5 text-sm text-slate-400">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} AXTO · <Link href="/privacy" className="text-slate-400">Privacy</Link> · <Link href="/terms" className="text-slate-400">Terms</Link></p>
      </aside>
      <div className="flex flex-col bg-slate-50">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="no-underline lg:invisible"><Logo size={24} /></Link>
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" aria-label="Language">
            {(["en", "id"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded px-2.5 py-1 text-xs font-bold ${lang === l ? "bg-ink-900 text-white" : "text-slate-600"}`}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input id={id} className="input pr-24" type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} placeholder={placeholder} required />
      <button type="button" className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
        onClick={() => setShown((v) => !v)} aria-controls={id}>{shown ? t("auth.hide") : t("auth.show")}</button>
    </div>
  );
}
