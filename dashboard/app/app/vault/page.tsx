/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT v4 — find and redact personal data and secrets ON THE DEVICE:
 *   text       paste or open a document · 65 data types in 7 categories with a
 *              confidence score · review highlights in place (keep / redact /
 *              accept a low-confidence suggestion) · always-redact a selection ·
 *              exposure level · copy, download, save the redacted version
 *   files      batch: DOCX / XLSX in place, PDF rebuilt as images (true
 *              redaction), images and scans via on-device OCR · ZIP · audit report
 *   safe AI    ask the member's own AI about redacted text; answers are restored
 *              in the browser — the server and provider only see placeholders
 *   key        placeholder map: view, export encrypted (password), import, restore
 *   rules      compliance profiles (GDPR, UU PDP, HIPAA, PCI DSS, secrets) ·
 *              5 styles · sensitivity · types · custom regex · always/never lists
 * Only the redacted output and the member's settings are ever saved (encrypted
 * history); originals and the key never leave the device unencrypted.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { LoadingBlock } from "@/components/ui";
import { createRedactor, findingKey, review, summarize, type Finding } from "@/lib/vault/pii";
import { DEFAULT_SETTINGS, SAMPLE, SETTINGS_ID, applyPreset, engineOptions, exposure, sanitizeSettings, type VaultSettings } from "@/lib/vault/settings";
import TextTab from "@/components/vault/TextTab";
import FilesTab from "@/components/vault/FilesTab";
import SafeAiTab from "@/components/vault/SafeAiTab";
import KeyTab, { type KeySource } from "@/components/vault/KeyTab";
import RulesTab from "@/components/vault/RulesTab";
import { L } from "@/lib/i18n-pages/vault";

type Tab = "text" | "files" | "ai" | "key" | "rules";
const TAB_ICON: Record<Tab, string> = { text: "📝", files: "🗂️", ai: "🤖", key: "🔑", rules: "⚙️" };

export default function VaultApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes("vault");

  const [tab, setTab] = useState<Tab>("text");
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<string>(JSON.stringify(DEFAULT_SETTINGS));
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [text, setText] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [maps, setMaps] = useState<Record<Exclude<KeySource, "text">, Record<string, string>>>({ files: {}, ai: {}, imported: {} });
  const setMap = useCallback((k: Exclude<KeySource, "text">) => (m: Record<string, string>) => setMaps((x) => ({ ...x, [k]: m })), []);

  // Settings live in the member's encrypted history.
  useEffect(() => {
    if (!access) return;
    api<{ item: { body: unknown } }>(`/api/history/vault/${SETTINGS_ID}`).then((r) => {
      if (r.ok && r.data.item?.body) { const s = sanitizeSettings(r.data.item.body); setSettings(s); setSavedSettings(JSON.stringify(s)); setSettingsSaved(true); }
    });
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid && oid !== SETTINGS_ID) {
      api<{ item: { body: any } }>(`/api/history/vault/${oid}`).then((r) => {
        if (r.ok && typeof r.data.item?.body?.redacted === "string") { setText(r.data.item.body.redacted); setNotice(t.openedSaved); }
      });
    }
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(settings) !== savedSettings;

  // Detection → review → redaction, all in this browser.
  const deferred = useDeferredValue(text);
  const { enabled, options } = useMemo(() => engineOptions(settings), [settings]);
  const rv = useMemo(() => (deferred ? review(deferred, enabled, options) : { findings: [], suggestions: [] }), [deferred, enabled, options]);
  const picked = useMemo<Finding[]>(() => [
    ...rv.findings.filter((f) => !excluded.has(findingKey(f))),
    ...rv.suggestions.filter((f) => included.has(findingKey(f))),
  ].sort((a, b) => a.start - b.start), [rv, excluded, included]);
  const result = useMemo(() => {
    const r = createRedactor(settings.style, enabled, options);
    const out = r.apply(deferred, picked);
    return { ...out, map: r.map, placeholderOf: (f: Finding) => r.placeholder(f) };
  }, [deferred, picked, settings.style, enabled, options]);
  const level = useMemo(() => exposure(picked), [picked]);
  const aiSource = useMemo(() => (deferred.trim() ? { text: deferred, findings: picked } : null), [deferred, picked]);
  useEffect(() => { setSaved(false); }, [text, settings, excluded, included]);

  function onText(s: string) { setText(s); if (!s) { setExcluded(new Set()); setIncluded(new Set()); setNotice(""); } }
  function onToggle(key: string, suggestion: boolean) {
    const upd = (set: Set<string>) => { const n = new Set(set); n.has(key) ? n.delete(key) : n.add(key); return n; };
    if (suggestion) setIncluded(upd); else setExcluded(upd);
  }
  function changeSettings(s: VaultSettings) { setSettings(s); setSettingsSaved(false); }
  async function saveSettings() {
    const r = await api("/api/history/vault", { body: { id: SETTINGS_ID, title: "Privacy Vault settings", body: settings, meta: { kind: "settings" } } });
    if (r.ok) { setSavedSettings(JSON.stringify(settings)); setSettingsSaved(true); }
  }
  async function saveRedacted() {
    if (!result.redacted.trim()) return;
    const types = summarize(result.findings);
    const r = await api("/api/history/vault", { body: {
      title: `Redacted · ${new Date().toLocaleString()}`,
      body: { kind: "redaction", redacted: result.redacted, style: settings.style, types: types.map(({ type, count }) => ({ type, count })) },
      meta: { items: String(result.findings.length), style: settings.style },
    } });
    if (r.ok) setSaved(true);
  }

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🔒</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <p className="mt-2 max-w-xl text-slate-300">{t.sub}</p>
        <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const counts: Partial<Record<Tab, number>> = {
    text: picked.length || undefined,
    key: Object.keys(result.map).length + Object.keys(maps.files).length + Object.keys(maps.ai).length + Object.keys(maps.imported).length || undefined,
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <div className="eyebrow">🔒 {t.onDevice}</div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-slate-600">{t.sub}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {(Object.keys(t.tabs) as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`vault-tab-${k}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            <span>{TAB_ICON[k]}</span>{t.tabs[k]}
            {counts[k] ? <span className="rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-800">{counts[k]}</span> : null}
          </button>
        ))}
      </div>

      <div hidden={tab !== "text"}>
        <TextTab t={t} text={text} onText={onText} findings={rv.findings} suggestions={rv.suggestions}
          excluded={excluded} included={included} onToggle={onToggle} onResetChoices={() => { setExcluded(new Set()); setIncluded(new Set()); }}
          redacted={result.redacted} placeholderOf={result.placeholderOf} exposure={level}
          settings={settings} onPreset={(id) => changeSettings(applyPreset(settings, id))} onStyle={(style) => changeSettings({ ...settings, style })}
          onAlwaysRedact={(v) => changeSettings({ ...settings, deny: Array.from(new Set([...settings.deny, v])) })}
          onSample={() => { setText(SAMPLE); setNotice(""); }} onAsk={() => setTab("ai")} onSave={saveRedacted} saved={saved} notice={notice} />
      </div>
      <div hidden={tab !== "files"}><FilesTab t={t} settings={settings} onMap={setMap("files")} /></div>
      <div hidden={tab !== "ai"}>
        <SafeAiTab t={t} lang={lang} source={aiSource} settings={settings} onMap={setMap("ai")} onGoText={() => setTab("text")} />
      </div>
      {tab === "key" ? <KeyTab t={t} maps={{ text: result.map, files: maps.files, ai: maps.ai, imported: maps.imported }} onImported={setMap("imported")} /> : null}
      {tab === "rules" ? (
        <RulesTab t={t} settings={settings} onChange={changeSettings} text={deferred} onSave={saveSettings} saved={settingsSaved} dirty={dirty}
          onReset={() => changeSettings({ ...DEFAULT_SETTINGS })} />
      ) : null}
    </div>
  );
}
