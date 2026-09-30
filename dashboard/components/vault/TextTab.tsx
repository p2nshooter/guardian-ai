/* PRIVACY VAULT — Text: paste or open a document, review every finding in
 * place (click to keep / click a suggestion to redact), and take the safe
 * version: copy, download, save, or ask AI about it. */
"use client";
import { useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { CATEGORIES, PRESETS, findingKey, summarize, type Finding } from "@/lib/vault/pii";
import { STYLES, type VaultSettings } from "@/lib/vault/settings";
import { ACCEPT, extractFile } from "@/lib/legal/extract";
import type { VaultDict } from "@/lib/i18n-pages/vault";
import { CAT_DOT, CAT_ICON, CAT_MARK, ExposureBadge, download, pct, short, typeName } from "./shared";

interface Props {
  t: VaultDict;
  text: string; onText: (s: string) => void;
  findings: Finding[]; suggestions: Finding[];
  excluded: Set<string>; included: Set<string>;
  onToggle: (key: string, suggestion: boolean) => void; onResetChoices: () => void;
  redacted: string; placeholderOf: (f: Finding) => string; exposure: number;
  settings: VaultSettings; onPreset: (id: string) => void; onStyle: (s: VaultSettings["style"]) => void;
  onAlwaysRedact: (value: string) => void;
  onSample: () => void; onAsk: () => void; onSave: () => void; saved: boolean; notice: string;
}

interface Group { key: string; f: Finding; count: number; score: number }

export default function TextTab(p: Props) {
  const { t } = p;
  const [mode, setMode] = useState<"edit" | "review">("edit");
  const [reading, setReading] = useState("");
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);

  const marks = useMemo(() => [...p.findings.map((f) => ({ f, s: false })), ...p.suggestions.map((f) => ({ f, s: true }))].sort((a, b) => a.f.start - b.f.start), [p.findings, p.suggestions]);
  const groups = useMemo(() => {
    const by = new Map<string, Group>();
    for (const f of p.findings) {
      const k = findingKey(f);
      const g = by.get(k);
      if (g) { g.count++; g.score = Math.max(g.score, f.score); } else by.set(k, { key: k, f, count: 1, score: f.score });
    }
    return Array.from(by.values());
  }, [p.findings]);
  const sugGroups = useMemo(() => {
    const by = new Map<string, Group>();
    for (const f of p.suggestions) { const k = findingKey(f); const g = by.get(k); if (g) g.count++; else by.set(k, { key: k, f, count: 1, score: f.score }); }
    return Array.from(by.values());
  }, [p.suggestions]);
  const active = p.findings.filter((f) => !p.excluded.has(findingKey(f))).length + p.suggestions.filter((f) => p.included.has(findingKey(f))).length;
  const types = summarize(p.findings.filter((f) => !p.excluded.has(findingKey(f)))).length;

  async function open(file: File) {
    setReading(file.name);
    try { const x = await extractFile(file); p.onText(x.text); setMode("review"); }
    catch (e: any) { setHint(String(e?.message || e)); }
    setReading("");
  }
  function alwaysRedact() {
    const el = area.current;
    const v = el ? p.text.slice(el.selectionStart, el.selectionEnd).trim() : "";
    if (!v) { setHint(t.selectFirst); return; }
    p.onAlwaysRedact(v); setHint("");
  }
  async function copy() { try { await navigator.clipboard.writeText(p.redacted); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} }

  // Highlighted original text, one chunk per finding.
  const review = useMemo(() => {
    const out: React.ReactNode[] = [];
    let cur = 0;
    marks.forEach(({ f, s }, i) => {
      if (f.start < cur) return;
      if (f.start > cur) out.push(p.text.slice(cur, f.start));
      const k = findingKey(f);
      const on = s ? p.included.has(k) : !p.excluded.has(k);
      const cls = on ? `${CAT_MARK[f.category]} ring-1` : s ? "border border-dashed border-slate-400 bg-transparent text-slate-800" : "bg-transparent text-slate-500 line-through ring-1 ring-slate-300";
      out.push(
        <button key={i} type="button" onClick={() => p.onToggle(k, s)} title={`${typeName(t, f)} · ${pct(f.score)} ${t.confidence}`}
          className={`rounded px-0.5 font-mono ${cls}`} data-testid={s ? "vault-suggestion" : "vault-mark"} data-on={on ? "1" : "0"}>
          {p.text.slice(f.start, f.end)}
        </button>,
      );
      cur = f.end;
    });
    out.push(p.text.slice(cur));
    return out;
  }, [marks, p.text, p.excluded, p.included]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">{t.preset}
          <select className="select w-auto py-1 text-sm" value={p.settings.preset} onChange={(e) => p.onPreset(e.target.value)} data-testid="vault-preset">
            {PRESETS.map((x) => <option key={x.id} value={x.id}>{(t.presetNames as Record<string, string>)[x.id] || x.label}</option>)}
            {p.settings.preset === "custom" ? <option value="custom">{t.customLabel}</option> : null}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">{t.styleLabel}
          <select className="select w-auto py-1 text-sm" value={p.settings.style} onChange={(e) => p.onStyle(e.target.value as VaultSettings["style"])} data-testid="vault-style">
            {STYLES.map((s) => <option key={s} value={s}>{t.styles[s]}</option>)}
          </select>
        </label>
        <span className="flex-1" />
        <ExposureBadge t={t} level={p.exposure} />
      </div>

      {p.notice ? <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{p.notice}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-pad min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{t.input}</span>
            <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["edit", "review"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} data-testid={`vault-mode-${m}`}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === m ? "bg-white shadow-sm" : "text-slate-500"}`}>{m === "edit" ? `✏️ ${t.edit}` : `🔍 ${t.reviewMode}`}</button>
              ))}
            </div>
          </div>
          {mode === "edit" ? (
            <textarea ref={area} className="textarea min-h-[340px] w-full font-mono text-xs leading-relaxed" placeholder={t.inputPh} value={p.text}
              onChange={(e) => p.onText(e.target.value)} data-testid="vault-input" spellCheck={false} />
          ) : (
            <div className="min-h-[340px] max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800" data-testid="vault-review">
              {p.text ? review : <span className="text-slate-400">{t.empty}</span>}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={p.onSample} data-testid="vault-sample">✨ {t.sample}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileIn.current?.click()} disabled={!!reading}>{reading ? <><Spinner /> {t.reading.replace("{name}", short(reading, 24))}</> : `📄 ${t.openFile}`}</button>
            <input ref={fileIn} type="file" className="hidden" accept={ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = ""; }} />
            {mode === "edit" ? <button type="button" className="btn-ghost btn-sm" onClick={alwaysRedact} data-testid="vault-always">🚫 {t.alwaysRedact}</button> : <span className="text-xs text-slate-500">{t.reviewHint}</span>}
            {p.text ? <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => p.onText("")}>{t.clear}</button> : null}
          </div>
          {hint ? <p className="mt-2 text-xs text-amber-700">{hint}</p> : null}
          <p className="mt-2 text-xs text-emerald-700">🛡️ {t.onDevice}</p>
        </section>

        <section className="card-pad min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{t.output}</span>
            <span className="text-xs text-slate-500" data-testid="vault-stats">{t.stats.replace("{n}", String(active)).replace("{types}", String(types))}</span>
          </div>
          <pre className="min-h-[340px] max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800" data-testid="vault-output">{p.redacted || <span className="text-slate-400">…</span>}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={p.onAsk} disabled={!p.redacted.trim()} data-testid="vault-ask">🤖 {t.askAi}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={copy} disabled={!p.redacted.trim()} data-testid="vault-copy">{copied ? t.copied : `📋 ${t.copy}`}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => download("redacted.txt", p.redacted)} disabled={!p.redacted.trim()}>⬇️ {t.download}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={p.onSave} disabled={!p.redacted.trim()} data-testid="vault-save">{p.saved ? t.saved : `💾 ${t.save}`}</button>
          </div>
        </section>
      </div>

      <section className="card-pad">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">{t.findings} <span className="font-normal text-slate-500">· {groups.length}</span></h2>
          {p.excluded.size || p.included.size ? <button type="button" className="btn-ghost btn-sm ml-auto" onClick={p.onResetChoices}>↺ {t.resetChoices}</button> : null}
        </div>
        {!groups.length ? <p className="text-sm text-slate-500">{p.text ? t.none : t.empty}</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {CATEGORIES.map((c) => {
              const rows = groups.filter((g) => g.f.category === c);
              if (!rows.length) return null;
              return (
                <div key={c} className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${CAT_DOT[c]}`} />{CAT_ICON[c]} {t.categories[c]} · {rows.length}
                  </div>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid={`vault-cat-${c}`}>
                    {rows.map((g) => {
                      const on = !p.excluded.has(g.key);
                      return (
                        <li key={g.key} className={`flex items-center gap-2 px-3 py-2 text-sm ${on ? "" : "bg-slate-50 opacity-70"}`}>
                          <input type="checkbox" className="accent-brand-600" checked={on} onChange={() => p.onToggle(g.key, false)} aria-label={on ? t.keep : t.redactIt} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-semibold text-slate-800">{typeName(t, g.f)}</span>
                              {g.count > 1 ? <span className="text-xs text-slate-500">×{g.count}</span> : null}
                            </div>
                            <div className="truncate font-mono text-xs text-slate-600" title={g.f.value}>{short(g.f.value)}{on ? <span className="text-brand-700"> → {short(p.placeholderOf(g.f), 28)}</span> : null}</div>
                          </div>
                          <div className="w-16 shrink-0 text-right" title={`${pct(g.score)} ${t.confidence}`}>
                            <div className="h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${g.score >= 0.85 ? "bg-emerald-500" : g.score >= 0.65 ? "bg-amber-500" : "bg-slate-400"}`} style={{ width: pct(g.score) }} /></div>
                            <div className="mt-0.5 text-[10px] text-slate-500">{pct(g.score)}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {sugGroups.length ? (
          <div className="mt-5">
            <div className="text-sm font-bold text-slate-900">{t.suggestions} <span className="font-normal text-slate-500">· {sugGroups.length}</span></div>
            <p className="mb-2 text-xs text-slate-500">{t.suggestionsHint}</p>
            <div className="flex flex-wrap gap-1.5" data-testid="vault-suggestions">
              {sugGroups.map((g) => {
                const on = p.included.has(g.key);
                return (
                  <button key={g.key} type="button" onClick={() => p.onToggle(g.key, true)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-brand-400 bg-brand-50 font-semibold text-brand-800" : "border-dashed border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                    {on ? "✓ " : "+ "}{typeName(t, g.f)}: <span className="font-mono">{short(g.f.value, 24)}</span> · {pct(g.score)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
