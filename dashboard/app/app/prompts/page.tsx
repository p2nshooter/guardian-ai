/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PROMPT LIBRARY — browse premium prompts by field and level, fill the
 * {{variables}}, copy the result or run it in AI Studio, and save favourites.
 * Free accounts get Basic; higher levels unlock with the plan.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, CopyButton, LoadingBlock, Modal, PageHeader, Spinner } from "@/components/ui";

interface Var { key: string; label: string; placeholder?: string }
interface PPrompt { id: string; field: string; level: "basic" | "pro" | "premium" | "elite"; title: string; summary: string; variables: Var[]; locked?: boolean }
interface Field { id: string; name: string; icon: string; blurb: string }
interface Level { id: string; name: string; blurb: string }
interface Catalog { fields: Field[]; levels: Level[]; prompts: PPrompt[]; unlocked: string[] }

const L = {
  en: { title: "Prompt Library", sub: "Premium, ready-to-run prompts for every profession.", search: "Search prompts…", all: "All fields",
    fill: "Fill in and use", copy: "Copy prompt", copied: "Copied", run: "Run in AI Studio", save: "Save", saved: "Saved ✓", locked: "Upgrade to unlock", upgrade: "See plans",
    none: "No prompts match.", level: "Level", result: "Your prompt", close: "Close", favs: "Saved prompts", byLevel: "by level" },
  id: { title: "Perpustakaan Prompt", sub: "Prompt premium siap pakai untuk setiap profesi.", search: "Cari prompt…", all: "Semua bidang",
    fill: "Isi & pakai", copy: "Salin prompt", copied: "Tersalin", run: "Jalankan di AI Studio", save: "Simpan", saved: "Tersimpan ✓", locked: "Upgrade untuk membuka", upgrade: "Lihat paket",
    none: "Tidak ada prompt yang cocok.", level: "Level", result: "Prompt Anda", close: "Tutup", favs: "Prompt tersimpan", byLevel: "per level" },
};
const LEVEL_BADGE: Record<string, string> = { basic: "badge-gray", pro: "badge-brand", premium: "badge-amber", elite: "badge-green" };

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k) => values[k] || `{{${k}}}`);
}

export default function PromptsApp() {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const { me } = useMe();
  const router = useRouter();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [field, setField] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<PPrompt | null>(null);
  const [tpl, setTpl] = useState<{ template: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; need?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api<Catalog>("/api/prompts").then((r) => { if (r.ok) setCat(r.data); }); }, []);

  const shown = useMemo(() => {
    if (!cat) return [];
    const needle = q.trim().toLowerCase();
    return cat.prompts.filter((p) => (!field || p.field === field) && (!needle || `${p.title} ${p.summary}`.toLowerCase().includes(needle)));
  }, [cat, field, q]);

  async function openPrompt(p: PPrompt) {
    setOpen(p); setTpl(null); setValues({}); setErr(null); setSaved(false);
    if (p.locked) { setErr({ msg: t.locked }); return; }
    const r = await api<{ prompt: { template: string } }>(`/api/prompts/${p.id}`);
    if (r.ok) setTpl(r.data.prompt); else setErr({ msg: r.error, need: (r.data as any)?.need });
  }
  const filled = tpl ? fill(tpl.template, values) : "";

  async function runInStudio() {
    if (!filled) return;
    try { sessionStorage.setItem("axto_studio_prefill", filled); } catch {}
    router.push("/app/studio?from=prompt");
  }
  async function saveFav() {
    if (!open) return;
    setBusy(true);
    const r = await api("/api/history/prompts", { body: { title: open.title, body: { promptId: open.id, values, filled }, meta: { field: open.field, level: open.level } } });
    setBusy(false);
    if (r.ok) setSaved(true);
  }

  if (!cat || !me) return <LoadingBlock />;

  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="mb-5 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select w-auto" value={field} onChange={(e) => setField(e.target.value)}>
          <option value="">{t.all}</option>
          {cat.fields.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-1 text-xs">
          {cat.levels.map((lv) => <span key={lv.id} className={`${LEVEL_BADGE[lv.id]} ${cat.unlocked.includes(lv.id) ? "" : "opacity-50"}`}>{lv.name}{cat.unlocked.includes(lv.id) ? "" : " 🔒"}</span>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const f = cat.fields.find((x) => x.id === p.field);
          return (
            <button key={p.id} onClick={() => openPrompt(p)} className="card-pad flex flex-col text-left transition hover:shadow-lift">
              <div className="flex items-center justify-between">
                <span className="text-lg" aria-hidden="true">{f?.icon}</span>
                <span className={LEVEL_BADGE[p.level]}>{p.level}{p.locked ? " 🔒" : ""}</span>
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{p.summary}</p>
              <span className="mt-3 text-xs font-semibold text-brand-700">{p.locked ? t.locked : t.fill} →</span>
            </button>
          );
        })}
      </div>
      {!shown.length ? <p className="mt-6 text-sm text-slate-500">{t.none}</p> : null}

      <Modal open={!!open} onClose={() => setOpen(null)} wide title={open ? `${open.title}` : ""}
        footer={open && !open.locked && tpl ? <>
          <button className="btn-ghost" onClick={saveFav} disabled={busy}>{busy ? <Spinner /> : "💾"} {saved ? t.saved : t.save}</button>
          <CopyButton text={filled} label={`📋 ${t.copy}`} done={`✓ ${t.copied}`} className="btn-secondary" />
          <button className="btn-primary" onClick={runInStudio}>⚡ {t.run}</button>
        </> : <Link href="/app/billing" className="btn-primary">{t.upgrade} →</Link>}>
        {open ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{open.summary}</p>
            {err ? <Alert tone={open.locked ? "warn" : "error"}>{err.msg}</Alert> : null}
            {!open.locked && tpl ? (
              <>
                {open.variables.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {open.variables.map((v) => (
                      <label key={v.key}><span className="label">{v.label}</span>
                        <input className="input" placeholder={v.placeholder} value={values[v.key] || ""} onChange={(e) => setValues({ ...values, [v.key]: e.target.value })} /></label>
                    ))}
                  </div>
                ) : null}
                <div>
                  <div className="label">{t.result}</div>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{filled}</pre>
                </div>
              </>
            ) : open.locked ? null : <LoadingBlock />}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
