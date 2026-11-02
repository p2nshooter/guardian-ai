/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — the AI-assisted film studio (REQUESTS 141, docs/apps/AI-STUDIO-BLUEPRINT.md §11.1, phase S0).
 *
 *   films      every film in the shared format axto.film v1 (lib/film/project.ts), saved encrypted in R2
 *              (history app `film`): revisions, a conflict prompt when another device saved first, versions
 *              and restore, .axfilm export/import — the same safety as Clipper C1
 *   settings   frame rate (incl. 23.976 / 29.97 / 59.94), resolution up to 8K, colour space
 *   tracks     picture, dialogue, music, effects and titles, renamed, added and removed
 *   next       the professional timeline (S1), generation (S2), the GPU Node (S0b/S2G) — shown as the roadmap
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Spinner } from "@/components/ui";
import { L } from "@/lib/i18n-pages/film";
import {
  COLOR_SPACES, FILM_FILE_EXT, FRAME_RATES, FilmProjectError, RESOLUTIONS, TRACK_KINDS, durationOf, filmFile, newFilmProject, readFilmProject,
  timecode, toFrames, type FilmProject, type FrameRateId, type ResolutionId, type Track,
} from "@/lib/film/project";
import { planAppFor } from "@/lib/plans";

interface Entry { id: string; title: string; updatedAt: string; rev?: number; created?: boolean; meta?: Record<string, unknown> }
interface Version { rev: number; at: string; reason: "auto" | "overwrite" | "restore"; bytes: number }

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const safe = (s: string) => s.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "film";

export default function AiStudioPage() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes(planAppFor("film"));

  const [items, setItems] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [film, setFilm] = useState<FilmProject | null>(null);
  const [id, setIdState] = useState<string | null>(null);
  const idRef = useRef<string | null>(null);
  const setId = (v: string | null) => { idRef.current = v; setIdState(v); };
  const revRef = useRef<number | null>(null);
  const saving = useRef(false), changes = useRef(0), dirty = useRef(false);
  const [state, setState] = useState<{ s: "idle" | "saving" | "saved" | "error"; msg?: string }>({ s: "idle" });
  const [conflict, setConflict] = useState<Entry | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", logline: "", frameRate: "24" as FrameRateId, resolution: "1080p" as ResolutionId });

  const reload = useCallback(async () => {
    const r = await api<{ items: Entry[] }>("/api/history/film");
    if (r.ok) setItems(r.data.items);
  }, []);
  useEffect(() => {
    if (!access) return;
    reload();
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid) open(oid);
  }, [access, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const problem = (e: unknown) => e instanceof FilmProjectError
    ? (e.code === "newer" ? t.newer : e.code === "not_a_project" ? t.notProject : t.importFail.replace("{error}", e.message))
    : t.importFail.replace("{error}", String((e as any)?.message || e).slice(0, 160));

  function show(p: FilmProject, pid: string | null, rev: number | null) {
    setFilm(p); setId(pid); revRef.current = rev; setConflict(null); setVersions(null); setErr("");
    dirty.current = pid === null; setState(pid === null ? { s: "idle" } : { s: "saved" });
  }
  async function open(pid: string) {
    const r = await api<{ item: { body: unknown; rev?: number } }>(`/api/history/film/${pid}`);
    if (!r.ok) { setErr(r.error); return; }
    try { show(readFilmProject(r.data.item.body), pid, r.data.item.rev ?? 0); } catch (e) { setErr(problem(e)); }
  }

  /** One save at a time; a plain save names the revision it edited, so another device's newer work is never lost. */
  const save = useCallback(async (how: { force?: boolean } = {}) => {
    if (!film || (conflict && !how.force)) return;
    if (saving.current) return;
    saving.current = true;
    const at = changes.current, pid = idRef.current;
    setState({ s: "saving" });
    const r = await api<{ item: Entry & { rev: number }; conflict?: boolean; current?: Entry }>("/api/history/film", {
      body: { id: pid || undefined, title: pid ? undefined : film.title, body: { ...film, surface: "web" }, rev: pid ? revRef.current ?? undefined : undefined, force: how.force || undefined },
    });
    saving.current = false;
    if (r.ok) {
      setId(r.data.item.id); revRef.current = r.data.item.rev; setConflict(null);
      dirty.current = changes.current !== at;
      setState(dirty.current ? { s: "idle" } : { s: "saved" });
      reload();
    } else if (r.status === 409 && r.data?.conflict) {
      setConflict(r.data.current || { id: pid || "", title: film.title, updatedAt: new Date().toISOString() });
      setState({ s: "idle" });
    } else setState({ s: "error", msg: r.error });
  }, [film, conflict, reload]);
  useEffect(() => {
    if (!film || !dirty.current) return;
    const h = setTimeout(() => save(), 1200);
    return () => clearTimeout(h);
  }, [film, save]);
  const change = (fn: (p: FilmProject) => FilmProject) => {
    if (!film) return;
    dirty.current = true; changes.current += 1;
    setFilm(fn(structuredClone(film)));
    setState((s) => (s.s === "saved" ? { s: "idle" } : s));
  };

  function create() {
    const p = newFilmProject(draft.title.trim() || t.filmTitlePh, { frameRate: draft.frameRate, resolution: draft.resolution });
    p.logline = draft.logline.trim();
    setCreating(false);
    show(p, null, null);
  }
  async function rename(pid: string, cur: string) {
    const title = prompt(t.renamePrompt, cur);
    if (title == null) return;
    await api(`/api/history/film/${pid}/rename`, { body: { title } });
    if (pid === id && film) setFilm({ ...film, title: title.trim() || film.title });
    reload();
  }
  async function del(pid: string) {
    if (!confirm(t.confirmDel)) return;
    await api(`/api/history/film/${pid}`, { method: "DELETE" });
    if (pid === id) { setFilm(null); setId(null); }
    reload();
  }
  async function importFile(f: File) {
    try { const p = readFilmProject(JSON.parse(await f.text())); show(p, null, null); } catch (e) { setErr(problem(e)); }
  }
  async function toggleVersions() {
    if (versions) { setVersions(null); return; }
    if (!id) return;
    const r = await api<{ versions: Version[] }>(`/api/history/film/${id}/versions`);
    if (r.ok) setVersions(r.data.versions); else setErr(r.error);
  }
  async function restore(rev: number) {
    if (!id || !confirm(t.restoreConfirm)) return;
    const r = await api(`/api/history/film/${id}/restore`, { body: { rev } });
    if (!r.ok) { setErr(r.error); return; }
    await open(id);
  }

  const filtered = useMemo(() => items.filter((i) => !q.trim() || i.title.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);
  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🎞️</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const fps = film?.settings.frameRate || "24";
  const dur = film ? durationOf(film) : 0;
  const kindLabel = (k: Track["kind"]) => (k === "video" ? t.kindVideo : k === "audio" ? t.kindAudio : t.kindText);

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="card h-fit p-3 lg:sticky lg:top-20">
        <button className="btn-primary btn-sm mb-2 w-full" onClick={() => { setCreating(true); setDraft({ title: "", logline: "", frameRate: "24", resolution: "1080p" }); }}>＋ {t.newFilm}</button>
        <label className="btn-ghost btn-sm mb-3 w-full cursor-pointer justify-center">📂 {t.importFile}
          <input type="file" accept={`${FILM_FILE_EXT},application/json`} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.currentTarget.value = ""; }} />
        </label>
        <input className="input mb-2 py-1.5 text-sm" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.projects}</div>
        <div className="max-h-[50vh] overflow-y-auto">
          {filtered.length ? filtered.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${c.id === id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => open(c.id)}>{c.title}</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} aria-label={t.rename} onClick={() => rename(c.id, c.title)}>✎</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} aria-label={t.del} onClick={() => del(c.id)}>✕</button>
            </div>
          )) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><div className="eyebrow">🎞️ {t.sub}</div><h1 className="text-2xl font-bold">{film ? film.title : t.title}</h1></div>
          {film ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {conflict ? <span className="text-amber-700">⚠️ {t.conflictTitle}</span> : state.s === "saving" ? <><Spinner /> {t.saving}</> : state.s === "saved" ? <span className="text-emerald-700">{t.saved}</span> : state.s === "error" ? <span className="text-rose-600">{t.saveFail.replace("{error}", state.msg || "")}</span> : null}
              {id ? <button className="btn-ghost btn-sm" onClick={toggleVersions} aria-expanded={!!versions}>🕘 {t.versions}</button> : null}
              <button className="btn-ghost btn-sm" onClick={() => download(`${safe(film.title)}${FILM_FILE_EXT}`, filmFile(film))}>⬇ {t.exportFile}</button>
            </div>
          ) : null}
        </div>
        {err ? <Alert tone="error">{err}</Alert> : null}

        {creating ? (
          <section className="card-pad space-y-3" aria-label={t.newFilm}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">{t.filmTitle}</span><input className="input" value={draft.title} maxLength={200} placeholder={t.filmTitlePh} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label className="block"><span className="label">{t.frameRate}</span>
                <select className="select" value={draft.frameRate} onChange={(e) => setDraft({ ...draft, frameRate: e.target.value as FrameRateId })}>{FRAME_RATES.map((r) => <option key={r.id} value={r.id}>{r.id} fps</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="label">{t.logline}</span><input className="input" value={draft.logline} maxLength={1000} placeholder={t.loglinePh} onChange={(e) => setDraft({ ...draft, logline: e.target.value })} /></label>
              <label className="block"><span className="label">{t.resolution}</span>
                <select className="select" value={draft.resolution} onChange={(e) => setDraft({ ...draft, resolution: e.target.value as ResolutionId })}>{RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.w}×{r.h}</option>)}</select></label>
            </div>
            <p className="text-xs text-slate-500">🛡️ {t.original}</p>
            <div className="flex gap-2"><button className="btn-primary" onClick={create}>{t.create}</button><button className="btn-ghost" onClick={() => setCreating(false)}>{t.cancel}</button></div>
          </section>
        ) : null}

        {conflict ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            <div className="font-bold">⚠️ {t.conflictTitle}</div>
            <p className="mt-1">{t.conflictBody.replace("{time}", new Date(conflict.updatedAt).toLocaleString(lang))}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={() => save({ force: true })}>{t.keepMine}</button>
              <button className="btn-secondary btn-sm" onClick={() => id && open(id)}>{t.loadTheirs}</button>
            </div>
          </div>
        ) : null}

        {versions ? (
          <section className="card-pad" aria-label={t.versions}>
            <h2 className="text-sm font-bold">🕘 {t.versions}</h2>
            {versions.length ? (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {versions.map((v) => (
                  <li key={v.rev} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <b>{new Date(v.at).toLocaleString(lang)}</b>
                    <button className="btn-secondary btn-sm" onClick={() => restore(v.rev)}>{t.restore}</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">{t.versionsEmpty}</p>}
          </section>
        ) : null}

        {film ? (
          <>
            <section className="card-pad space-y-3" aria-label={t.settings}>
              <label className="block"><span className="label">{t.logline}</span>
                <input className="input" value={film.logline} maxLength={1000} placeholder={t.loglinePh} onChange={(e) => { const v = e.target.value; change((p) => ({ ...p, logline: v })); }} /></label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block"><span className="label">{t.frameRate}</span>
                  <select className="select" value={film.settings.frameRate} onChange={(e) => { const v = e.target.value as FrameRateId; change((p) => ({ ...p, settings: { ...p.settings, frameRate: v } })); }}>{FRAME_RATES.map((r) => <option key={r.id} value={r.id}>{r.id} fps</option>)}</select></label>
                <label className="block"><span className="label">{t.resolution}</span>
                  <select className="select" value={film.settings.resolution} onChange={(e) => { const v = e.target.value as ResolutionId; change((p) => ({ ...p, settings: { ...p.settings, resolution: v } })); }}>{RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.w}×{r.h}</option>)}</select></label>
                <label className="block"><span className="label">{t.colorSpace}</span>
                  <select className="select" value={film.settings.colorSpace} onChange={(e) => { const v = e.target.value as FilmProject["settings"]["colorSpace"]; change((p) => ({ ...p, settings: { ...p.settings, colorSpace: v } })); }}>{COLOR_SPACES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span>{t.duration}: <b className="font-mono">{timecode(toFrames(dur, fps), fps)}</b></span>
                <span>{t.shots}: <b>{film.shots.length}</b></span>
                <span>{t.media}: <b>{film.media.length}</b></span>
              </div>
            </section>

            <section className="card-pad" aria-label={t.tracks}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{t.tracks}</h2>
                <div className="flex gap-1">
                  {TRACK_KINDS.map((k) => (
                    <button key={k} className="btn-ghost btn-sm" disabled={film.timeline.tracks.length >= 64}
                      onClick={() => change((p) => ({ ...p, timeline: { ...p.timeline, tracks: [...p.timeline.tracks, { id: `${k[0]}${Date.now().toString(36)}`, kind: k, name: `${kindLabel(k)} ${p.timeline.tracks.filter((x) => x.kind === k).length + 1}`, muted: false, locked: false, items: [] }] } }))}>
                      ＋ {kindLabel(k)}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {film.timeline.tracks.map((tr, i) => (
                  <li key={tr.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className={`badge-gray ${tr.kind === "video" ? "!bg-sky-100 !text-sky-800" : tr.kind === "audio" ? "!bg-emerald-100 !text-emerald-800" : "!bg-amber-100 !text-amber-800"}`}>{kindLabel(tr.kind)}</span>
                    <input className="input w-auto min-w-0 flex-1 py-1 text-sm" value={tr.name} maxLength={80} aria-label={t.trackName}
                      onChange={(e) => { const v = e.target.value; change((p) => { p.timeline.tracks[i]!.name = v; return p; }); }} />
                    <span className="text-xs text-slate-400">{tr.items.length}</span>
                    <button className="btn-ghost btn-sm text-rose-600" onClick={() => change((p) => ({ ...p, timeline: { ...p.timeline, tracks: p.timeline.tracks.filter((x) => x.id !== tr.id) } }))}>{t.removeTrack}</button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        <section className="card-pad">
          <h2 className="text-sm font-bold">🛠️ {t.roadmapTitle}</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {t.roadmap.map((x) => <li key={x} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><span className="text-brand-600">✦</span>{x}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
