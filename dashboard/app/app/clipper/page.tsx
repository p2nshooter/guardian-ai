/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER v4 — long video → ranked, edited, captioned short clips.
 *
 *   pipeline   probe → (ffmpeg.wasm speech track, split for long videos) →
 *              transcription on the member's own key (one quota slot per
 *              video) → highlight detection with virality sub-scores
 *   editor     WYSIWYG canvas preview · trim timeline · edit by transcript ·
 *              filler/silence removal · face-tracked reframe / split / fit ·
 *              8 animated caption templates · hook title · progress bar ·
 *              brand kit · caption translation
 *   output     real-time render on the device (MP4, or WebM → MP4) · batch ·
 *              SRT/VTT on the exported clock · thumbnail · repurposed text
 *   projects   everything but the video, autosaved to encrypted history in the
 *              shared format v5 (lib/clipper/project.ts): revisions, a conflict
 *              prompt when another device saved first, versions and restore,
 *              .axclip export/import, the video recognised by its fingerprint
 *   usage      videos this month, storage, and the usage log (/api/clipper/usage)
 *
 * The video never leaves the device; only the speech track goes to the
 * member's transcription provider.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick, formatBytes } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Progress, Spinner } from "@/components/ui";
import ModelPicker, { useAiKeys, useLocalAi, type AiChoice } from "@/components/ai/ModelPicker";
import Preview, { type PreviewHandle } from "@/components/clipper/Preview";
import Inspector, { type ExportState, type InspectorTab } from "@/components/clipper/Inspector";
import ClipList, { type ClipItem } from "@/components/clipper/ClipList";
import FullTranscript from "@/components/clipper/FullTranscript";
import Repurpose from "@/components/clipper/Repurpose";
import {
  ASPECTS, DEFAULT_BRAND, LENGTHS, PLATFORMS, cuesToFile, defaultEdit, getPlatform, outputSize, parseClips, safeName, transcriptForModel,
  type Aspect, type BrandKit, type CaptionStyle, type ClipEdit, type ClipLength, type RepurposeKind, type Word,
} from "@/lib/clipper/options";
import { pagesToCues, parseSubtitles, toOutClamped } from "@/lib/clipper/edit";
import { CHUNK_SEC, DIRECT_LIMIT, download, extractAudioParts, jobPieces, loadFfmpeg, logoDataUrl, posters as makePosters, probe, recordClip, thumbnail, toMp4 } from "@/lib/clipper/media";
import { runAi, transcribeParts } from "@/lib/clipper/client";
import { CLIPPER_FORMAT, PROJECT_FILE_EXT, PROJECT_VERSION, ProjectError, fingerprint, projectFile, readProject, sameMedia, type ClipperProject, type MediaRef } from "@/lib/clipper/project";
import { L, type ClipperDict } from "@/lib/i18n-pages/clipper";
import type { Lang } from "@/lib/i18n-shared";

interface Entry { id: string; title: string; updatedAt: string; rev?: number; created?: boolean; meta?: Record<string, unknown> }
type FileMeta = MediaRef;
interface Version { rev: number; at: string; reason: "auto" | "overwrite" | "restore"; bytes: number }
interface UsageView {
  usage: { month: string; clipperVideos: number; clipperLimit: number; storageBytes: number; storageLimit: number };
  events: { id: string; event: string; bytes: number; created_at: string }[];
}
type StepId = "read" | "engine" | "audio" | "transcribe" | "detect";
type StepState = { id: StepId; state: "wait" | "run" | "done"; p?: number; label?: string };
type Err = { msg: string; needKey?: boolean; upgrade?: boolean } | null;

const BRAND_ID = "brand-kit";
const STT_LANGS: [string, string][] = [["", ""], ["en", "English"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["es", "Español"], ["pt", "Português"], ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"], ["nl", "Nederlands"], ["tr", "Türkçe"], ["ru", "Русский"], ["ar", "العربية"], ["hi", "हिन्दी"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["th", "ไทย"], ["vi", "Tiếng Việt"], ["tl", "Filipino"]];
const newId = () => Math.random().toString(36).slice(2, 10);

export default function ClipperApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes("clipper");
  const keys = useAiKeys();
  const localAi = useLocalAi();
  const sttKeys = keys.keys.filter((k) => keys.providers.find((p) => p.id === k.provider)?.stt);

  // Projects
  const [items, setItems] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [projectId, setProjectIdState] = useState<string | null>(null);
  // The id is also kept in a ref, so a save started before the first one returned never creates the project twice.
  const pidRef = useRef<string | null>(null);
  const setProjectId = (id: string | null) => { pidRef.current = id; setProjectIdState(id); };
  const [saveState, setSaveState] = useState<{ s: "idle" | "saving" | "saved" | "error"; msg?: string }>({ s: "idle" });
  // Across devices: the revision this copy is based on; one save at a time; a conflict waits for the member's choice.
  const revRef = useRef<number | null>(null);
  const saving = useRef(false);
  const again = useRef(false);
  const changes = useRef(0);
  const epoch = useRef(0);
  const [conflict, setConflict] = useState<Entry | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [versionKeep, setVersionKeep] = useState(10);
  const [usage, setUsage] = useState<UsageView | null>(null);
  // Settings
  const [platform, setPlatform] = useState("tiktok");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [count, setCount] = useState(8);
  const [length, setLength] = useState<ClipLength>("auto");
  const [instruction, setInstruction] = useState("");
  const [videoLang, setVideoLang] = useState("");
  const [stt, setStt] = useState("");
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  // Pipeline
  const [phase, setPhase] = useState<"new" | "processing" | "project">("new");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [err, setErr] = useState<Err>(null);
  const pipeCtrl = useRef<AbortController | null>(null);
  // Media + project data
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [mismatch, setMismatch] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [transcript, setTranscript] = useState("");
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [edits, setEdits] = useState<Record<string, ClipEdit>>({});
  const [repurpose, setRepurpose] = useState<Partial<Record<RepurposeKind, string>>>({});
  const [view, setView] = useState<"clips" | "transcript" | "repurpose">("clips");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("captions");
  const [now, setNow] = useState(0);
  const [postersMap, setPosters] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState<"720" | "1080">("1080");
  const [exportState, setExportState] = useState<ExportState | null>(null);
  const [batch, setBatch] = useState<{ i: number; n: number } | null>(null);
  const exportCtrl = useRef<AbortController | null>(null);
  const [detecting, setDetecting] = useState(false);
  // Brand
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [brandSaved, setBrandSaved] = useState(false);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const dirty = useRef(false);

  const reload = useCallback(async (): Promise<Entry[]> => {
    const r = await api<{ items: Entry[] }>("/api/history/clipper");
    if (!r.ok) return [];
    setItems(r.data.items.filter((i) => i.id !== BRAND_ID && i.meta?.kind !== "brand"));
    return r.data.items;
  }, []);
  const loadUsage = useCallback(async () => {
    const r = await api<UsageView>("/api/clipper/usage");
    if (r.ok) setUsage(r.data);
  }, []);
  useEffect(() => {
    if (!access) return;
    // The brand kit is read only when the member has saved one (no request that can only answer 404).
    reload().then((all) => {
      if (all.some((i) => i.id === BRAND_ID)) api<{ item: { body: Partial<BrandKit> } }>(`/api/history/clipper/${BRAND_ID}`).then((r) => { if (r.ok && r.data.item?.body) setBrand({ ...DEFAULT_BRAND, ...r.data.item.body }); });
    });
    loadUsage();
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid) openProject(oid);
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new platform brings its own aspect; an opened project keeps the aspect it was saved with.
  const choosePlatform = (v: string) => { setPlatform(v); setAspect(getPlatform(v).aspect); };
  useEffect(() => {
    if (!brand.logo) { setLogoImg(null); return; }
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = brand.logo;
  }, [brand.logo]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // Posters for the clip list once the video is attached.
  const posterKey = clips.map((c) => `${c.id}:${Math.round(c.start)}`).join(",");
  useEffect(() => {
    if (!url || !clips.length) return;
    const missing = clips.filter((c) => !postersMap[c.id]);
    if (!missing.length) return;
    let live = true;
    makePosters(url, missing.map((c) => c.start + 1)).then((list) => {
      if (!live) return;
      setPosters((m) => { const n = { ...m }; missing.forEach((c, i) => { if (list[i]) n[c.id] = list[i]; }); return n; });
    }).catch(() => {});
    return () => { live = false; };
  }, [url, posterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave ────────────────────────────────────────────────────────────────
  const project = (): ClipperProject | null => meta ? {
    format: CLIPPER_FORMAT, v: PROJECT_VERSION, media: meta,
    settings: { platform, aspect, count, length, instruction, videoLang },
    transcript, words, clips, edits, repurpose, surface: "web",
  } : null;
  const titleOf = (p: ClipperProject) => p.clips[0]?.title ? `${p.media.name.replace(/\.[^.]+$/, "")} · ${p.clips[0].title}`.slice(0, 90) : p.media.name || t.untitled;
  /** Save this copy. A plain save names the revision it edited, so another device's newer work is never overwritten
   *  without the member choosing it: `force` keeps mine (theirs is kept in Versions), `asCopy` saves mine as a new project. */
  const save = useCallback(async (how: { force?: boolean; asCopy?: boolean } = {}) => {
    const p = project();
    if (!p || (!p.words.length && !p.clips.length)) return;
    if (conflict && !how.force && !how.asCopy) return;
    if (saving.current) { again.current = true; return; }
    saving.current = true;
    const mine = epoch.current, at = changes.current;
    setSaveState({ s: "saving" });
    const pid = pidRef.current;
    const isNew = !!how.asCopy || !pid;
    const title = how.asCopy ? t.copyOf.replace("{title}", items.find((i) => i.id === pid)?.title || titleOf(p)) : isNew ? titleOf(p) : undefined;
    const r = await api<{ item: Entry & { rev: number }; conflict?: boolean; current?: Entry }>("/api/history/clipper", {
      body: { id: isNew ? undefined : pid, title, body: p, rev: isNew ? undefined : revRef.current ?? undefined, force: how.force || undefined },
    });
    saving.current = false;
    if (mine !== epoch.current) { again.current = false; return; }   // another project was opened meanwhile
    if (r.ok) {
      const it = r.data.item;
      setProjectId(it.id); revRef.current = it.rev; setConflict(null);
      dirty.current = changes.current !== at;
      setSaveState(dirty.current ? { s: "idle" } : { s: "saved" });
      reload();
      if (it.created || how.force) loadUsage();
    } else if (r.status === 409 && r.data?.conflict) {
      setConflict(r.data.current || { id: pid || "", title: "", updatedAt: new Date().toISOString() });
      setSaveState({ s: "idle" });
      again.current = false;
      return;
    } else {
      setSaveState({ s: "error", msg: r.status === 413 ? t.storageFull : r.error || "error" });
      if (r.status === 413) loadUsage();
    }
    if (again.current || dirty.current) { again.current = false; setTimeout(() => { if (dirty.current) saveRef.current(); }, 1500); }
  }, [projectId, meta, platform, aspect, count, length, instruction, videoLang, transcript, words, clips, edits, repurpose, conflict, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (phase !== "project" || !dirty.current) return;
    const h = setTimeout(save, 1500);
    return () => clearTimeout(h);
  }, [phase, clips, edits, repurpose, aspect, meta, save]);
  const touch = () => { dirty.current = true; changes.current += 1; setSaveState((s) => (s.s === "saved" ? { s: "idle" } : s)); };
  const keepMine = () => save({ force: true });
  const saveAsCopy = () => save({ asCopy: true });
  const loadTheirs = () => { if (projectId) openProject(projectId); };
  function exportProject() {
    const p = project();
    if (p) download(`${safeName(titleOf(p))}${PROJECT_FILE_EXT}`, projectFile(p), "application/json");
  }
  const projectProblem = (e: unknown) => e instanceof ProjectError
    ? (e.code === "newer" ? t.projectNewer : e.code === "not_a_project" ? t.notProject : t.importFail.replace("{error}", e.message))
    : t.importFail.replace("{error}", String((e as any)?.message || e).slice(0, 160));
  async function importProject(f: File) {
    let p: ClipperProject;
    try { p = readProject(JSON.parse(await f.text())); } catch (e) { setErr({ msg: projectProblem(e) }); return; }
    loadProject(p, null, null);
    touch();   // saved to the member's projects as a new project
  }

  // ── Versions ────────────────────────────────────────────────────────────────
  async function toggleVersions() {
    if (versions) { setVersions(null); return; }
    if (!projectId) return;
    const r = await api<{ versions: Version[]; keep: number }>(`/api/history/clipper/${projectId}/versions`);
    if (r.ok) { setVersions(r.data.versions); setVersionKeep(r.data.keep || 10); } else setErr({ msg: r.error });
  }
  async function restoreVersion(rev: number) {
    if (!projectId || !confirm(t.restoreConfirm)) return;
    const id = projectId;
    while (saving.current) await new Promise((res) => setTimeout(res, 100));
    if (dirty.current && !conflict) await save();
    const r = await api(`/api/history/clipper/${id}/restore`, { body: { rev } });
    if (!r.ok) { setErr({ msg: r.status === 413 ? t.storageFull : r.error }); return; }
    setVersions(null);
    await openProject(id);
    loadUsage();
  }

  // ── Pipeline ────────────────────────────────────────────────────────────────
  const setStep = (id: StepId, patch: Partial<StepState>) => setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  function reset() {
    epoch.current += 1; again.current = false; revRef.current = null; setConflict(null); setVersions(null);
    setProjectId(null); setClips([]); setEdits({}); setRepurpose({}); setWords([]); setTranscript(""); setSelected(null); setPosters({});
    setChecked(new Set()); setErr(null); setMismatch(""); setSaveState({ s: "idle" }); setView("clips"); setExportState(null);
  }
  function attach(f: File) {
    if (url) URL.revokeObjectURL(url);
    setFile(f); setUrl(URL.createObjectURL(f));
  }

  async function start(f: File, subs?: File) {
    reset();
    attach(f);
    setPhase("processing");
    const ctrl = new AbortController();
    pipeCtrl.current = ctrl;
    setSteps([{ id: "read", state: "run" }]);
    const [pr, fp] = await Promise.all([probe(f), fingerprint(f).catch(() => undefined)]);
    const m: FileMeta = { name: f.name, size: f.size, duration: pr.duration, width: pr.width, height: pr.height, ...(f.type ? { type: f.type } : {}), ...(fp ? { fingerprint: fp } : {}) };
    setMeta(m);
    // Small, short files go straight to speech-to-text; anything else gets a compact speech track first.
    const needsFf = !subs && (f.size > DIRECT_LIMIT || pr.duration > CHUNK_SEC * 1.1);
    setSteps([
      { id: "read", state: "done" },
      ...(needsFf ? [{ id: "engine" as StepId, state: "wait" as const }, { id: "audio" as StepId, state: "wait" as const }] : []),
      { id: "transcribe", state: "wait" }, { id: "detect", state: "wait" },
    ]);

    let w: Word[] = [], text = "";
    if (subs) {
      setStep("transcribe", { state: "run" });
      w = parseSubtitles(await subs.text());
      text = w.map((x) => x.word).join(" ");
    } else {
      let parts: { blob: Blob; offset: number; name?: string }[] = [{ blob: f, offset: 0, name: f.name }];
      if (needsFf) {
        setStep("engine", { state: "run" });
        try { await loadFfmpeg(); } catch { setErr({ msg: t.ffFail }); setPhase("new"); return; }
        setStep("engine", { state: "done" });
        setStep("audio", { state: "run", p: 0 });
        try { parts = await extractAudioParts(f, pr.duration, (p) => setStep("audio", { p })); }
        catch { setErr({ msg: t.ffFail }); setPhase("new"); return; }
        setStep("audio", { state: "done" });
      }
      if (ctrl.signal.aborted) { setPhase("new"); return; }
      setStep("transcribe", { state: "run" });
      const tr = await transcribeParts(parts, {
        language: videoLang || undefined, provider: stt || undefined, signal: ctrl.signal,
        onPart: (i, n) => setStep("transcribe", { label: n > 1 ? t.stepPart.replace("{i}", String(i + 1)).replace("{n}", String(n)) : undefined, p: i / n }),
      });
      if (tr.error) { if (tr.error !== "aborted") setErr({ msg: tr.error, needKey: tr.needKey, upgrade: tr.upgrade }); setPhase("new"); return; }
      w = tr.words; text = tr.text;
      if (tr.duration && !m.duration) setMeta({ ...m, duration: tr.duration });
    }
    if (!w.length) { setErr({ msg: t.noSpeechWords }); setPhase("new"); return; }
    setWords(w); setTranscript(text);
    setStep("transcribe", { state: "done", p: 1 });
    setStep("detect", { state: "run" });
    await detect(w, m.duration || w[w.length - 1].end, ctrl.signal);
    setStep("detect", { state: "done" });
    setPhase("project");
    touch();
    loadUsage();
  }

  async function detect(w = words, dur = meta?.duration || 0, signal?: AbortSignal) {
    if (!ai.provider) { setErr({ msg: t.noKeyAi, needKey: true }); return; }
    setDetecting(true);
    const r = await runAi({ options: { platform, count: String(count), length, instruction }, content: transcriptForModel(w), provider: ai.provider, model: ai.model }, undefined, signal);
    setDetecting(false);
    if (r.error) { if (r.error !== "aborted") setErr({ msg: r.error, needKey: r.needKey, upgrade: r.upgrade }); return; }
    const found = parseClips(r.text, dur || Infinity);
    if (!found.length) { setErr({ msg: t.detectFail }); return; }
    const list: ClipItem[] = found.map((c) => ({ ...c, id: newId() }));
    const ed: Record<string, ClipEdit> = {};
    for (const c of list) ed[c.id] = defaultEdit(c, brand);
    setClips(list); setEdits(ed); setSelected(null); setChecked(new Set()); setPosters({});
    setErr(null);
    touch();
  }

  /** Show a project (from the member's saved projects, or a .axclip file when id is null). */
  function loadProject(p: ClipperProject, id: string | null, rev: number | null) {
    reset();
    setProjectId(id);
    revRef.current = rev;
    setPlatform(p.settings.platform); setAspect(p.settings.aspect);
    setCount(p.settings.count); setLength(p.settings.length); setInstruction(p.settings.instruction); setVideoLang(p.settings.videoLang);
    setWords(p.words); setTranscript(p.transcript);
    const ed: Record<string, ClipEdit> = {};
    for (const c of p.clips) ed[c.id] = p.edits[c.id] ? { ...defaultEdit(c, brand), ...p.edits[c.id] } : defaultEdit(c, brand);
    setClips(p.clips); setEdits(ed); setRepurpose(p.repurpose);
    setMeta(p.media);
    setFile(null); if (url) URL.revokeObjectURL(url); setUrl(null);
    setPhase("project");
  }
  async function openProject(id: string) {
    const r = await api<{ item: { id: string; title: string; body: unknown; rev?: number } }>(`/api/history/clipper/${id}`);
    if (!r.ok) { setErr({ msg: r.error }); return; }
    let p: ClipperProject;
    try { p = readProject(r.data.item.body); } catch (e) { setErr({ msg: projectProblem(e) }); return; }
    loadProject(p, id, r.data.item.rev ?? 0);
    dirty.current = false;
    setSaveState({ s: "saved" });
  }
  async function reattach(f: File) {
    attach(f);
    if (!meta) return;
    const fp = await fingerprint(f).catch(() => undefined);
    const same = sameMedia(meta, { name: f.name, size: f.size, fingerprint: fp });
    setMismatch(same === "different" ? t.mismatch.replace("{name}", meta.name) : "");
    // A project saved before fingerprints learns its video's fingerprint once the right file is attached.
    if (same === "same" && fp && !meta.fingerprint) { setMeta({ ...meta, fingerprint: fp }); touch(); }
  }
  function newProject() {
    pipeCtrl.current?.abort();
    reset(); setPhase("new"); setMeta(null); setFile(null); if (url) URL.revokeObjectURL(url); setUrl(null);
    loadUsage();
  }
  async function rename(id: string, cur: string) { const title = prompt(t.renamePrompt, cur); if (title == null) return; await api(`/api/history/clipper/${id}/rename`, { body: { title } }); reload(); }
  async function del(id: string) { if (!confirm(t.confirmDel)) return; await api(`/api/history/clipper/${id}`, { method: "DELETE" }); if (id === projectId) newProject(); reload(); loadUsage(); }

  // ── Clip editing ────────────────────────────────────────────────────────────
  const clip = clips.find((c) => c.id === selected) || null;
  const edit = clip ? edits[clip.id] || defaultEdit(clip, brand) : null;
  const setEdit = (e: ClipEdit) => { if (!clip) return; setEdits((m) => ({ ...m, [clip.id]: e })); touch(); };
  const setClip = (c: ClipItem) => { setClips((l) => l.map((x) => (x.id === c.id ? c : x))); touch(); };
  const applyAll = (s: CaptionStyle) => { setEdits((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, captions: { ...s } }]))); touch(); };
  function addClip(start: number, end: number) {
    const inWin = words.filter((w) => w.start >= start && w.end <= end).slice(0, 8).map((w) => w.word).join(" ");
    const c: ClipItem = { id: newId(), title: inWin || `${t.addClip}`, start, end };
    setClips((l) => [...l, c]);
    setEdits((m) => ({ ...m, [c.id]: defaultEdit(c, brand) }));
    setSelected(c.id); setView("clips"); setTab("edit");
    touch();
  }
  function removeClip(id: string) {
    setClips((l) => l.filter((c) => c.id !== id));
    setEdits((m) => { const n = { ...m }; delete n[id]; return n; });
    setChecked((s) => { const n = new Set(s); n.delete(id); return n; });
    if (selected === id) setSelected(null);
    touch();
  }
  const seek = (s: number) => { previewRef.current?.seek(s); setNow(s); };
  const openClip = (id: string) => { setSelected(id); const c = clips.find((x) => x.id === id); if (c) setTimeout(() => previewRef.current?.seek(c.start), 50); };

  async function saveBrand() {
    const r = await api("/api/history/clipper", { body: { id: BRAND_ID, title: "Brand kit", body: brand, meta: { kind: "brand" } } });
    if (r.ok) { setBrandSaved(true); setTimeout(() => setBrandSaved(false), 2000); }
  }
  async function onLogoFile(f: File) { try { setBrand((b) => ({ ...b })); const d = await logoDataUrl(f); setBrand((b) => ({ ...b, logo: d })); } catch {} }

  // ── Output ──────────────────────────────────────────────────────────────────
  async function renderOne(c: ClipItem, convert: boolean, signal: AbortSignal) {
    if (!url) return;
    const e = edits[c.id] || defaultEdit(c, brand);
    const [W, H] = outputSize(aspect, quality);
    setExportState({ id: c.id, phase: "render", p: 0 });
    const r = await recordClip({ url, edit: e, brand, words, emojis: c.emojis, logo: logoImg, W, H, signal, onProgress: (p) => setExportState({ id: c.id, phase: "render", p }) });
    let blob = r.blob, ext: string = r.ext;
    if (convert && r.ext === "webm") {
      setExportState({ id: c.id, phase: "convert", p: 0 });
      try { blob = await toMp4(r.blob, (p) => setExportState({ id: c.id, phase: "convert", p })); ext = "mp4"; } catch { /* keep the WebM */ }
    }
    download(`${safeName(c.title)}.${ext}`, blob, blob.type);
    setExportState({ id: c.id, phase: "done", p: 1 });
  }
  async function exportClip(convert: boolean) {
    if (!clip) return;
    exportCtrl.current = new AbortController();
    try { await renderOne(clip, convert, exportCtrl.current.signal); }
    catch (e: any) { setExportState({ id: clip.id, phase: "error", p: 0, message: e?.name === "AbortError" ? t.cancelled : String(e?.message || e) }); }
  }
  async function exportSelected() {
    const list = clips.filter((c) => checked.has(c.id));
    if (!list.length || !url) return;
    exportCtrl.current = new AbortController();
    const convert = true;
    try {
      for (let i = 0; i < list.length; i++) { setBatch({ i: i + 1, n: list.length }); await renderOne(list[i], convert, exportCtrl.current.signal); }
    } catch (e: any) { setErr({ msg: e?.name === "AbortError" ? t.cancelled : String(e?.message || e) }); }
    setBatch(null);
  }
  function captionsFile(fmt: "srt" | "vtt") {
    if (!clip || !edit) return;
    const { segs, pages } = jobPieces({ edit, words });
    const cues = edit.translated
      ? edit.translated.lines.map((l) => ({ s: toOutClamped(segs, l.start), e: toOutClamped(segs, l.end), text: l.text })).filter((c) => c.e > c.s)
      : pagesToCues(pages, segs, edit.captions.uppercase);
    download(`${safeName(clip.title)}.${fmt}`, cuesToFile(cues, fmt), fmt === "vtt" ? "text/vtt" : "text/plain");
  }
  async function thumb() {
    if (!clip || !edit || !url) return;
    const [W, H] = outputSize(aspect, quality);
    try { download(`${safeName(clip.title)}.png`, await thumbnail({ url, edit, brand, words, emojis: clip.emojis, logo: logoImg, W, H }, edit.start + 0.6), "image/png"); } catch {}
  }
  function clipText() {
    if (!clip || !edit) return;
    const { pages } = jobPieces({ edit, words });
    download(`${safeName(clip.title)}.txt`, pages.map((p) => p.lines.map((l) => l.map((w) => w.text).join(" ")).join(" ")).join("\n"));
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => items.filter((i) => !q.trim() || i.title.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);
  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🎬</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );
  const quotaLeft = me.limits.clipperVideosPerMonth < 0 ? -1 : Math.max(0, me.limits.clipperVideosPerMonth - (me.usage?.clipperVideos || 0));
  const hasChat = !!localAi || keys.keys.some((k) => keys.providers.find((p) => p.id === k.provider)?.chat);
  const editing = phase === "project" && view === "clips" && !!clip;   // full-width editor: the project list steps aside

  const sidebar = (
    <div className="flex h-full flex-col">
      <button className="btn-primary btn-sm mb-2" onClick={newProject}>＋ {t.newProj}</button>
      <label className="btn-ghost btn-sm mb-3 cursor-pointer justify-center">📂 {t.importProject}
        <input type="file" accept={`${PROJECT_FILE_EXT},application/json`} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importProject(f); e.currentTarget.value = ""; }} />
      </label>
      <input className="input mb-2 py-1.5 text-sm" placeholder={t.searchProjects} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.history}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length ? filtered.map((c) => (
          <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${c.id === projectId ? "bg-brand-50" : "hover:bg-slate-50"}`}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => openProject(c.id)}>{c.title}</button>
            <div className="hidden shrink-0 gap-0.5 group-hover:flex">
              <button className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} onClick={() => rename(c.id, c.title)}>✎</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} onClick={() => del(c.id)}>✕</button>
            </div>
          </div>
        )) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
      </div>
    </div>
  );

  const errBox = err ? (
    <Alert tone="error">{err.msg}
      {err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.addKey}</Link> : null}
      {err.upgrade ? <Link href="/app/billing" className="ml-2 font-semibold underline">{t.upgrade}</Link> : null}
    </Alert>
  ) : null;

  return (
    <div className={`grid gap-5 ${editing ? "" : "lg:grid-cols-[230px_minmax(0,1fr)]"}`}>
      {editing ? null : <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{sidebar}</div></aside>}
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><div className="eyebrow">🎬 {t.sub}</div><h1 className="text-2xl font-bold">{t.title}</h1></div>
          {phase === "project" ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {conflict ? <span className="text-amber-700">⚠️ {t.conflictTitle}</span> : saveState.s === "saving" ? <><Spinner /> {t.saving}</> : saveState.s === "saved" ? <span className="text-emerald-700">{t.saved}</span> : saveState.s === "error" ? <span className="text-rose-600">{t.saveFail.replace("{error}", saveState.msg || "")}</span> : null}
              {projectId ? <button className="btn-ghost btn-sm" onClick={toggleVersions} aria-expanded={!!versions}>🕘 {t.versions}</button> : null}
              <button className="btn-ghost btn-sm" onClick={exportProject} title={t.exportProject}>⬇ {PROJECT_FILE_EXT}</button>
              <button className="btn-ghost btn-sm lg:hidden" onClick={newProject}>＋ {t.newProj}</button>
            </div>
          ) : null}
        </div>

        {phase === "new" ? (
          <NewProject t={t} lang={lang} ai={ai} setAi={setAi} hasChat={hasChat} sttKeys={sttKeys.map((k) => ({ id: k.provider, name: keys.providers.find((p) => p.id === k.provider)?.name || k.provider }))}
            platform={platform} setPlatform={choosePlatform} count={count} setCount={setCount} length={length} setLength={setLength}
            instruction={instruction} setInstruction={setInstruction} videoLang={videoLang} setVideoLang={setVideoLang} stt={stt} setStt={setStt}
            quotaLeft={quotaLeft} err={errBox} onStart={start} onImport={importProject} />
        ) : null}
        {phase === "new" && usage ? <div className="mt-4"><UsageCard t={t} lang={lang} u={usage} /></div> : null}

        {phase === "processing" ? (
          <section className="card-pad max-w-xl space-y-3">
            {steps.map((s) => {
              const label = s.label || { read: t.stepRead, engine: t.stepEngine, audio: t.stepAudio, transcribe: t.stepTranscribe, detect: t.stepDetect }[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center">{s.state === "done" ? "✅" : s.state === "run" ? <Spinner /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}</span>
                  <div className="flex-1">
                    <div className={`text-sm ${s.state === "wait" ? "text-slate-400" : "font-medium text-slate-800"}`}>{label}</div>
                    {s.state === "run" && typeof s.p === "number" && s.p > 0 ? <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.round(s.p * 100)}%` }} /></div> : null}
                  </div>
                </div>
              );
            })}
            <button className="btn-ghost btn-sm" onClick={() => { pipeCtrl.current?.abort(); setPhase("new"); }}>{t.cancel}</button>
            <p className="text-xs text-emerald-700">🔒 {t.onDevice}</p>
          </section>
        ) : null}

        {phase === "project" ? (
          <>
            {!url ? (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>🎞️ {t.reattach}</span>
                <label className="btn-primary btn-sm cursor-pointer">{t.reattachBtn}<input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) reattach(f); e.currentTarget.value = ""; }} /></label>
              </div>
            ) : null}
            {mismatch ? <Alert tone="warn">{mismatch}</Alert> : null}
            {conflict ? (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                <div className="font-bold">⚠️ {t.conflictTitle}</div>
                <p className="mt-1">{t.conflictBody.replace("{time}", new Date(conflict.updatedAt).toLocaleString(lang))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-primary btn-sm" onClick={keepMine}>{t.keepMine}</button>
                  <button className="btn-secondary btn-sm" onClick={loadTheirs}>{t.loadTheirs}</button>
                  <button className="btn-ghost btn-sm" onClick={saveAsCopy}>{t.saveCopy}</button>
                </div>
              </div>
            ) : null}
            {versions ? (
              <section className="card-pad mb-3" aria-label={t.versions}>
                <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold">🕘 {t.versions}</h2><button className="btn-ghost btn-sm" onClick={() => setVersions(null)} aria-label={t.cancel}>✕</button></div>
                <p className="mt-1 text-xs text-slate-500">{t.versionsHint.replace("{n}", String(versionKeep))}</p>
                {versions.length ? (
                  <ul className="mt-2 divide-y divide-slate-100 text-sm">
                    {versions.map((v) => (
                      <li key={v.rev} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span><b>{new Date(v.at).toLocaleString(lang)}</b> <span className="text-slate-500">· {{ auto: t.reasonAuto, overwrite: t.reasonOverwrite, restore: t.reasonRestore }[v.reason]} · {formatBytes(v.bytes)}</span></span>
                        <button className="btn-secondary btn-sm" onClick={() => restoreVersion(v.rev)}>{t.restore}</button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-500">{t.versionsEmpty}</p>}
              </section>
            ) : null}
            {errBox}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-full bg-slate-100 p-1">
                {(["clips", "transcript", "repurpose"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-sm font-semibold ${view === v ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}>
                    {v === "clips" ? `${t.tabClips} · ${clips.length}` : v === "transcript" ? t.tabTranscript : t.tabRepurpose}
                  </button>
                ))}
              </div>
              <select className="select w-auto py-1.5 text-sm" value={aspect} onChange={(e) => { setAspect(e.target.value as Aspect); touch(); }} aria-label="Aspect">{ASPECTS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              {view === "clips" ? (
                <div className="ml-auto flex flex-wrap gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => addClip(Math.max(0, now), Math.min(meta?.duration || now + 30, now + 30))} disabled={!words.length}>＋ {t.addClip}</button>
                  <button className="btn-secondary btn-sm" onClick={() => detect()} disabled={detecting || !words.length}>{detecting ? <><Spinner /> {t.stepDetect}</> : `↻ ${t.redetect}`}</button>
                  {checked.size ? (batch ? <button className="btn-secondary btn-sm" onClick={() => exportCtrl.current?.abort()}>■ {t.exportingN.replace("{i}", String(batch.i)).replace("{n}", String(batch.n))}</button>
                    : <button className="btn-primary btn-sm" onClick={exportSelected} disabled={!url}>🎬 {t.exportSel.replace("{n}", String(checked.size))}</button>) : null}
                </div>
              ) : null}
            </div>

            {view === "clips" ? (
              <div className={`grid gap-4 ${clip ? "lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"}`}>
                <div className={clip ? "hidden lg:block" : ""}>
                  <ClipList t={t} clips={clips} selectedId={selected} posters={postersMap} checked={checked}
                    onCheck={(id, on) => setChecked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; })}
                    onCheckAll={(on) => setChecked(on ? new Set(clips.map((c) => c.id)) : new Set())}
                    onOpen={openClip} onRemove={removeClip} />
                </div>
                {clip && edit ? (
                  <div className="min-w-0">
                    <button className="btn-ghost btn-sm mb-2 lg:hidden" onClick={() => setSelected(null)}>{t.back}</button>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                      <div className="mx-auto w-full max-w-[360px] xl:sticky xl:top-20 xl:self-start">
                        <Preview ref={previewRef} url={url} words={words} edit={edit} brand={brand} aspect={aspect} logo={logoImg} emojis={clip.emojis} t={t} onTime={setNow} />
                        <h2 className="mt-3 line-clamp-2 text-sm font-bold text-slate-900">{clip.title}</h2>
                        {clip.why ? <p className="mt-1 text-xs text-slate-500">💡 {clip.why}</p> : null}
                      </div>
                      <Inspector t={t} tab={tab} onTab={setTab} clip={clip} onClip={(c) => setClip(c as ClipItem)} edit={edit} onEdit={setEdit}
                        words={words} duration={meta?.duration || 0} now={now} onSeek={seek}
                        brand={brand} onBrand={(b) => setBrand(b)} onSaveBrand={saveBrand} brandSaved={brandSaved} onApplyAll={applyAll}
                        url={url} ai={ai} quality={quality} onQuality={setQuality}
                        onExport={exportClip} onCancelExport={() => exportCtrl.current?.abort()} exportState={exportState?.id === clip.id ? exportState : null}
                        onCaptionsFile={captionsFile} onThumbnail={thumb} onClipText={clipText} onLogoFile={onLogoFile} />
                    </div>
                  </div>
                ) : (
                  <div className="hidden items-center justify-center rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 lg:flex">{clips.length ? "← " + t.edit : t.noClips}</div>
                )}
              </div>
            ) : null}
            {view === "transcript" ? <FullTranscript t={t} words={words} title={meta?.name || ""} now={now} onSeek={seek} onMakeClip={addClip} /> : null}
            {view === "repurpose" ? (
              <>
                <div className="mb-3 max-w-2xl"><ModelPicker lang={lang} value={ai} onChange={setAi} showResearch={false} /></div>
                <Repurpose t={t} words={words} transcript={transcript} title={meta?.name?.replace(/\.[^.]+$/, "") || t.untitled} ai={ai} language=""
                  results={repurpose} onResult={(k, v) => { setRepurpose((r) => ({ ...r, [k]: v })); touch(); }} onError={(msg, needKey) => setErr({ msg, needKey })} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── New project form ──────────────────────────────────────────────────────────
function NewProject(p: {
  t: ClipperDict; lang: Lang; ai: AiChoice; setAi: (a: AiChoice) => void; hasChat: boolean; sttKeys: { id: string; name: string }[];
  platform: string; setPlatform: (v: string) => void; count: number; setCount: (v: number) => void; length: ClipLength; setLength: (v: ClipLength) => void;
  instruction: string; setInstruction: (v: string) => void; videoLang: string; setVideoLang: (v: string) => void; stt: string; setStt: (v: string) => void;
  quotaLeft: number; err: React.ReactNode; onStart: (f: File, subs?: File) => void; onImport: (f: File) => void;
}) {
  const { t } = p;
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const blocked = !p.hasChat;
  const take = (f?: File | null) => { if (f && !blocked) p.onStart(f); };
  const lens: Record<ClipLength, string> = { auto: t.lenAuto, short: t.lenShort, medium: t.lenMedium, long: t.lenLong };

  return (
    <div className="space-y-4">
      {p.err}
      <section className="card-pad space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.platform}</span>
            <select className="select" value={p.platform} onChange={(e) => p.setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.aspect}</option>)}</select>
          </label>
          <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.clipCount}: {p.count}</span>
            <input type="range" min={1} max={15} value={p.count} onChange={(e) => p.setCount(+e.target.value)} className="mt-2 w-full accent-brand-600" />
          </label>
          <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.length}</span>
            <select className="select" value={p.length} onChange={(e) => p.setLength(e.target.value as ClipLength)}>{LENGTHS.map((l) => <option key={l.id} value={l.id}>{lens[l.id]}</option>)}</select>
          </label>
          <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.videoLang}</span>
            <select className="select" value={p.videoLang} onChange={(e) => p.setVideoLang(e.target.value)}>{STT_LANGS.map(([c, n]) => <option key={c} value={c}>{c ? n : t.langAuto}</option>)}</select>
          </label>
        </div>
        <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.instruction}</span>
          <input className="input" value={p.instruction} maxLength={300} placeholder={t.instructionPh} onChange={(e) => p.setInstruction(e.target.value)} />
        </label>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div><div className="mb-1 text-sm font-semibold text-slate-700">{t.aiModel}</div><ModelPicker lang={p.lang} value={p.ai} onChange={p.setAi} showResearch={false} /></div>
          <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{t.stt}</span>
            <select className="select py-2" value={p.stt} onChange={(e) => p.setStt(e.target.value)}>
              <option value="">{t.sttAuto}</option>
              {p.sttKeys.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
        </div>
        {!p.sttKeys.length ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">🎙️ {t.noKeyStt} <Link href="/app/settings?tab=ai" className="font-semibold underline">{t.addKey}</Link></p> : null}

        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${blocked ? "pointer-events-none opacity-60" : drag ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"}`}>
          <input type="file" accept="video/*,.mkv" className="hidden" disabled={blocked} onChange={(e) => { take(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <div className="text-4xl">🎬</div>
          <div className="mt-2 text-base font-bold text-slate-800">{t.uploadTitle}</div>
          <div className="mt-1 text-xs text-slate-500">{t.uploadHint}</div>
          <span className="btn-primary btn-sm mt-3">{t.choose}</span>
          {blocked ? <div className="mt-2 text-xs text-amber-700">{t.noKeyAi}</div> : null}
        </label>

        <details className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">📝 {t.importSubs}</summary>
          <p className="mt-1 text-xs text-slate-500">{t.importHint}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="btn-secondary btn-sm cursor-pointer">🎞️ {pending ? pending.name.slice(0, 28) : t.choose}
              <input type="file" accept="video/*,.mkv" className="hidden" onChange={(e) => { setPending(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
            </label>
            <label className={`btn-secondary btn-sm cursor-pointer ${!pending || blocked ? "pointer-events-none opacity-50" : ""}`} title={!pending ? t.importNeedVideo : ""}>📝 .srt / .vtt
              <input type="file" accept=".srt,.vtt,text/vtt" className="hidden" disabled={!pending || blocked} onChange={(e) => { const s = e.target.files?.[0]; if (s && pending) p.onStart(pending, s); e.currentTarget.value = ""; }} />
            </label>
          </div>
        </details>

        <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          <span className="font-semibold text-slate-700">📂 {t.importProject}</span>
          <span className="text-xs text-slate-500">{t.importProjectHint}</span>
          <input type="file" accept={`${PROJECT_FILE_EXT},application/json`} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImport(f); e.currentTarget.value = ""; }} />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-emerald-700">🔒 {t.onDevice}</span>
          <span className="text-slate-500">{p.quotaLeft < 0 ? t.unlimited : t.quota.replace("{n}", String(p.quotaLeft))}</span>
        </div>
      </section>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {t.features.map((f) => <div key={f} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><span className="text-brand-600">✦</span>{f}</div>)}
      </div>
    </div>
  );
}

// ── Usage: videos this month, storage, and the latest usage events ────────────
function UsageCard({ t, lang, u }: { t: ClipperDict; lang: Lang; u: UsageView }) {
  const { clipperVideos: n, clipperLimit: max, storageBytes: used, storageLimit: cap } = u.usage;
  const label: Record<string, string> = {
    video: t.evVideo, quota_full: t.evQuotaFull, storage_full: t.evStorageFull, project_created: t.evCreated,
    project_restored: t.evRestored, project_deleted: t.evDeleted, conflict_overwrite: t.evOverwrite,
  };
  const tone = (a: number, b: number) => (a >= b ? "red" : a >= b * 0.8 ? "amber" : "brand") as "red" | "amber" | "brand";
  return (
    <section className="card-pad" aria-label={t.usageTitle}>
      <h2 className="text-sm font-bold text-slate-900">📊 {t.usageTitle}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-slate-600">{max < 0 ? t.usageVideosUnlimited.replace("{n}", String(n)) : t.usageVideos.replace("{n}", String(n)).replace("{max}", String(max))}</div>
          {max > 0 ? <Progress value={n} max={max} tone={tone(n, max)} /> : null}
        </div>
        <div>
          <div className="mb-1 text-xs text-slate-600">{t.usageStorage.replace("{used}", formatBytes(used)).replace("{max}", formatBytes(cap))}</div>
          {cap > 0 ? <Progress value={used} max={cap} tone={tone(used, cap)} /> : null}
        </div>
      </div>
      <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.usageEvents}</h3>
      {u.events.length ? (
        <ul className="mt-1 divide-y divide-slate-100">
          {u.events.slice(0, 8).map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 py-1.5 text-xs">
              <span className="text-slate-700">{label[e.event] || e.event}</span>
              <span className="text-slate-400">{new Date(e.created_at).toLocaleString(lang)}{e.bytes ? ` · ${formatBytes(e.bytes)}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-1 text-xs text-slate-500">{t.usageNone}</p>}
    </section>
  );
}
