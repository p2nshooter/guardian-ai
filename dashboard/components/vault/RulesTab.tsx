/* PRIVACY VAULT — Rules: compliance profile, redaction style, sensitivity,
 * every data type by category, custom regex patterns and always / never
 * lists. Saved to the member's encrypted history. */
"use client";
import { useMemo, useState } from "react";
import { CATEGORIES, PII_TYPES, PRESETS, compileRule, redact, reversible, type MaskStyle } from "@/lib/vault/pii";
import { STYLES, applyPreset, type VaultSettings } from "@/lib/vault/settings";
import type { VaultDict } from "@/lib/i18n-pages/vault";
import { CAT_DOT, CAT_ICON } from "./shared";

const EXAMPLE = "jane.doe@mail.com";
const EMAIL_ONLY = new Set(["EMAIL"]);

export default function RulesTab({ t, settings, onChange, text, onSave, saved, dirty, onReset }: {
  t: VaultDict; settings: VaultSettings; onChange: (s: VaultSettings) => void; text: string;
  onSave: () => void; saved: boolean; dirty: boolean; onReset: () => void;
}) {
  const s = settings;
  const off = useMemo(() => new Set(s.disabled), [s.disabled]);
  const [label, setLabel] = useState("");
  const [pattern, setPattern] = useState("");
  const [icase, setIcase] = useState(true);
  const set = (p: Partial<VaultSettings>) => onChange({ ...s, ...p, preset: p.disabled ? "custom" : p.preset ?? s.preset });
  const toggle = (ids: string[], on: boolean) => {
    const n = new Set(off);
    for (const id of ids) on ? n.delete(id) : n.add(id);
    set({ disabled: Array.from(n) });
  };
  const draft = { id: "draft", label, pattern, flags: icase ? "i" : "" };
  const re = pattern ? compileRule(draft) : null;
  const matches = re && text ? Array.from(text.matchAll(re)).length : 0;
  function addRule() {
    if (!re) return;
    const id = `R${Date.now().toString(36).slice(-6)}`;
    set({ rules: [...s.rules, { id, label: label.trim() || `${t.customLabel} ${s.rules.length + 1}`, pattern, flags: icase ? "i" : "" }] });
    setLabel(""); setPattern("");
  }
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <section className="card-pad">
        <h2 className="text-base font-bold text-slate-900">{t.presetsTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.presetsSub}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => onChange(applyPreset(s, p.id))} data-testid={`vault-preset-${p.id}`}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${s.preset === p.id ? "border-brand-500 bg-brand-50 font-semibold text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
              {(t.presetNames as Record<string, string>)[p.id] || p.label}<span className="ml-1.5 text-xs font-normal text-slate-500">{p.types.length}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-pad">
          <h2 className="text-base font-bold text-slate-900">{t.styleTitle}</h2>
          <div className="mt-3 grid gap-2">
            {STYLES.map((st: MaskStyle) => (
              <label key={st} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${s.style === st ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                <input type="radio" name="vault-style" className="mt-1 accent-brand-600" checked={s.style === st} onChange={() => set({ style: st })} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">{t.styles[st]}
                    {reversible(st) ? <span className="rounded bg-emerald-100 px-1.5 text-[10px] font-bold uppercase text-emerald-800">{t.reversible}</span> : null}
                  </span>
                  <span className="block text-xs text-slate-600">{t.styleDesc[st]}</span>
                  <span className="mt-0.5 block font-mono text-xs text-brand-700">{EXAMPLE} → {redact(EXAMPLE, st, EMAIL_ONLY).redacted}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="card-pad">
          <h2 className="text-base font-bold text-slate-900">{t.sensitivity} <span className="font-mono text-sm text-brand-700">{Math.round(s.minScore * 100)}%</span></h2>
          <input type="range" min={0.3} max={0.95} step={0.05} value={s.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} className="mt-4 w-full accent-brand-600" data-testid="vault-min" aria-label={t.sensitivity} />
          <div className="flex justify-between text-xs text-slate-500"><span>← {t.recall}</span><span>{t.precision} →</span></div>
          <p className="mt-3 text-xs text-slate-600">{t.minScoreNote.replace("{n}", String(Math.round(s.minScore * 100)))}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">🚫 {t.denyTitle}</div>
              <p className="text-xs text-slate-500">{t.denySub}</p>
              <textarea className="textarea mt-1 min-h-[110px] w-full font-mono text-xs" defaultValue={s.deny.join("\n")} key={`d${s.deny.join("|")}`}
                onBlur={(e) => set({ deny: lines(e.target.value) })} data-testid="vault-deny" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">✅ {t.allowTitle}</div>
              <p className="text-xs text-slate-500">{t.allowSub}</p>
              <textarea className="textarea mt-1 min-h-[110px] w-full font-mono text-xs" defaultValue={s.allow.join("\n")} key={`a${s.allow.join("|")}`}
                onBlur={(e) => set({ allow: lines(e.target.value) })} data-testid="vault-allow" />
            </div>
          </div>
        </section>
      </div>

      <section className="card-pad">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900">{t.typesTitle}</h2>
          <span className="text-xs text-slate-500">{t.typesSub.replace("{on}", String(PII_TYPES.length - off.size)).replace("{total}", String(PII_TYPES.length))}</span>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.filter((c) => c !== "custom").map((c) => {
            const list = PII_TYPES.filter((x) => x.category === c);
            const ids = list.map((x) => x.id);
            return (
              <div key={c} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className={`h-2 w-2 rounded-full ${CAT_DOT[c]}`} />{CAT_ICON[c]} {t.categories[c]}
                  <span className="text-xs font-normal text-slate-500">{list.filter((x) => !off.has(x.id)).length}/{list.length}</span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" className="btn-ghost btn-sm px-1.5 text-xs" onClick={() => toggle(ids, true)}>{t.all}</button>
                    <button type="button" className="btn-ghost btn-sm px-1.5 text-xs" onClick={() => toggle(ids, false)}>{t.noneBtn}</button>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((x) => {
                    const on = !off.has(x.id);
                    return (
                      <button key={x.id} type="button" onClick={() => toggle([x.id], !on)} data-testid={`vault-type-${x.id}`} data-on={on ? "1" : "0"}
                        className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-brand-300 bg-brand-50 font-semibold text-brand-800" : "border-slate-200 text-slate-400 line-through"}`}>
                        {(t.typeNames as Record<string, string>)[x.id] || x.label}{x.country ? <span className="ml-1 font-mono text-[10px] opacity-70">{x.country}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-pad">
        <h2 className="text-base font-bold text-slate-900">{t.rulesTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.rulesSub}</p>
        {s.rules.length ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {s.rules.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{r.label}</span>
                <code className="min-w-0 flex-1 truncate text-xs text-slate-600">/{r.pattern}/{r.flags}</code>
                <button type="button" className="btn-ghost btn-sm" onClick={() => set({ rules: s.rules.filter((x) => x.id !== r.id) })} aria-label={t.remove}>✕</button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 grid gap-2 md:grid-cols-[200px_minmax(0,1fr)_auto_auto]">
          <input className="input" placeholder={t.ruleLabel} value={label} onChange={(e) => setLabel(e.target.value)} data-testid="vault-rule-label" />
          <input className="input font-mono text-sm" placeholder="EMP-\d{5}" value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label={t.rulePattern} data-testid="vault-rule-pattern" />
          <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-brand-600" checked={icase} onChange={(e) => setIcase(e.target.checked)} />{t.ruleCase}</label>
          <button type="button" className="btn-secondary" onClick={addRule} disabled={!re} data-testid="vault-rule-add">＋ {t.ruleAdd}</button>
        </div>
        {pattern ? <p className={`mt-1 text-xs ${re ? "text-slate-500" : "text-rose-700"}`}>{re ? t.ruleMatches.replace("{n}", String(matches)) : t.ruleBad}</p> : null}
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
        <button type="button" className="btn-primary" onClick={onSave} disabled={!dirty && saved} data-testid="vault-save-settings">{saved && !dirty ? t.settingsSaved : `💾 ${t.saveSettings}`}</button>
        <button type="button" className="btn-ghost" onClick={onReset}>↺ {t.reset}</button>
      </div>
    </div>
  );
}
