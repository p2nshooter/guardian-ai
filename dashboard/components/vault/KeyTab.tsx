/* PRIVACY VAULT — Key & restore: the placeholder → original map of the text,
 * the file batch, the Safe AI conversation or an imported key file; export it
 * encrypted with a password (PBKDF2 + AES-GCM, lib/vault/keyfile), import it
 * back, and restore any text that still carries the placeholders. */
"use client";
import { useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { openMap, sealMap } from "@/lib/vault/keyfile";
import { restore } from "@/lib/vault/pii";
import type { VaultDict } from "@/lib/i18n-pages/vault";
import { download, short } from "./shared";

export type KeySource = "text" | "files" | "ai" | "imported";

export default function KeyTab({ t, maps, onImported }: { t: VaultDict; maps: Record<KeySource, Record<string, string>>; onImported: (m: Record<string, string>) => void }) {
  const first = (["text", "files", "ai", "imported"] as KeySource[]).find((k) => Object.keys(maps[k]).length) || "text";
  const [src, setSrc] = useState<KeySource>(first);
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ipw, setIpw] = useState("");
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);
  const map = maps[src];
  const rows = Object.entries(map);
  const label: Record<KeySource, string> = { text: t.srcText, files: t.srcFiles, ai: t.srcAi, imported: t.srcImported };

  const restored = useMemo(() => (paste ? restore(paste, map) : ""), [paste, map]);
  const count = useMemo(() => (paste ? Object.keys(map).reduce((n, k) => n + (paste.split(k).length - 1), 0) : 0), [paste, map]);
  const pwErr = pw && pw.length < 8 ? t.pwShort : pw2 && pw !== pw2 ? t.pwMismatch : "";

  async function exportKey() {
    if (pw.length < 8 || pw !== pw2 || !rows.length) return;
    setBusy(true);
    try {
      const json = await sealMap(map, pw);
      download(`axto-vault-key-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
      setPw(""); setPw2("");
    } finally { setBusy(false); }
  }
  async function importKey(f: File) {
    setBusy(true); setMsg(null);
    try {
      const m = await openMap(await f.text(), ipw);
      onImported(m); setSrc("imported");
      setMsg({ ok: true, text: t.importOk.replace("{n}", String(Object.keys(m).length)) });
    } catch { setMsg({ ok: false, text: t.importBad }); }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card-pad min-w-0">
        <h2 className="text-base font-bold text-slate-900">🔑 {t.keyTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.keySub}</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist">
          {(["text", "files", "ai", "imported"] as KeySource[]).map((k) => (
            <button key={k} type="button" onClick={() => setSrc(k)} data-testid={`vault-key-${k}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${src === k ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600"}`}>
              {label[k]} · {Object.keys(maps[k]).length}
            </button>
          ))}
        </div>
        {!rows.length ? <p className="mt-4 text-sm text-slate-500">{t.noEntries}</p> : (
          <>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>{t.entries.replace("{n}", String(rows.length))}</span>
              <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setShow((s) => !s)} data-testid="vault-key-reveal">{show ? `🙈 ${t.hide}` : `👁️ ${t.reveal}`}</button>
            </div>
            <div className="mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-3 py-1.5 font-semibold">{t.placeholder}</th><th className="px-3 py-1.5 font-semibold">{t.original}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {rows.slice(0, 500).map(([k, v]) => (
                    <tr key={k}><td className="px-3 py-1.5 text-brand-700">{short(k, 40)}</td><td className="px-3 py-1.5 text-slate-700">{show ? short(v, 60) : "••••••"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">{t.exportTitle}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input type="password" className="input" placeholder={t.password} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" data-testid="vault-pw" />
                <input type="password" className="input" placeholder={t.password2} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" data-testid="vault-pw2" />
              </div>
              {pwErr ? <p className="mt-1 text-xs text-amber-700">{pwErr}</p> : null}
              <button type="button" className="btn-primary btn-sm mt-2" onClick={exportKey} disabled={busy || !!pwErr || pw.length < 8 || pw !== pw2} data-testid="vault-export">{busy ? <Spinner /> : "⬇️"} {t.exportBtn}</button>
            </div>
          </>
        )}
        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <div className="text-sm font-semibold text-slate-800">{t.importTitle}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input type="password" className="input max-w-xs flex-1" placeholder={t.password} value={ipw} onChange={(e) => setIpw(e.target.value)} autoComplete="current-password" data-testid="vault-ipw" />
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileIn.current?.click()} disabled={busy || !ipw}>📂 {t.importBtn}</button>
            <input ref={fileIn} type="file" accept=".json,application/json" className="hidden" data-testid="vault-import" onChange={(e) => { const f = e.target.files?.[0]; if (f) importKey(f); e.target.value = ""; }} />
          </div>
          {msg ? <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`} data-testid="vault-import-msg">{msg.text}</p> : null}
        </div>
        <p className="mt-3 text-xs text-amber-700">⚠️ {t.keyWarn}</p>
      </section>

      <section className="card-pad min-w-0">
        <h2 className="text-base font-bold text-slate-900">↩️ {t.restoreTitle} <span className="text-xs font-normal text-slate-500">· {label[src]}</span></h2>
        <textarea className="textarea mt-3 min-h-[180px] w-full font-mono text-xs" placeholder={t.restorePh} value={paste} onChange={(e) => setPaste(e.target.value)} data-testid="vault-restore-in" />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{t.restored}</span>
          {paste ? <span className="text-xs text-emerald-700">{t.restoredCount.replace("{n}", String(count))}</span> : null}
          <button type="button" className="btn-secondary btn-sm ml-auto" disabled={!restored}
            onClick={async () => { try { await navigator.clipboard.writeText(restored); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? t.copied : `📋 ${t.copy}`}</button>
        </div>
        <pre className="mt-2 min-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800" data-testid="vault-restore-out">{restored || <span className="text-slate-400">…</span>}</pre>
      </section>
    </div>
  );
}
