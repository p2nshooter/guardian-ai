/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — the project format shared by every surface (REQUESTS 137,
 * docs/apps/CLIPPER-BLUEPRINT.md §3, phase C1).
 *
 *   One JSON document, format "axto.clipper", version 5: the settings, the
 *   transcript and its word timings, the clips, every edit and the repurposed
 *   text — never the video. The video is referred to by name, size, duration
 *   and a fingerprint (SHA-256 of its size, first 2 MiB and last 2 MiB), so a
 *   project saved on the web opens in the desktop app or on a Clipper Server and
 *   asks for the same file, and says so when a different file is picked.
 *
 *   readProject() accepts what older Clippers saved (v4 and earlier), checks and
 *   bounds every field, and refuses a project made by a newer Clipper instead of
 *   damaging it. Pure: no DOM, no network — the API validates with the same code.
 * ============================================================================ */
import { ASPECTS, LENGTHS, PLATFORMS, REPURPOSE, type Aspect, type Clip, type ClipEdit, type ClipLength, type RepurposeKind, type Word } from "./options";

export const CLIPPER_FORMAT = "axto.clipper";
export const PROJECT_VERSION = 5;
export const PROJECT_FILE_EXT = ".axclip";

export const PROJECT_LIMITS = { clips: 60, words: 400_000, transcriptChars: 4_000_000, repurposeChars: 200_000, textChars: 2_000 } as const;

export interface MediaRef {
  name: string; size: number; duration: number; width: number; height: number;
  type?: string;
  /** "sha256:<hex>" of the size, the first 2 MiB and the last 2 MiB of the file. */
  fingerprint?: string;
}

export interface ProjectSettings { platform: string; aspect: Aspect; count: number; length: ClipLength; instruction: string; videoLang: string }

export type ProjectClip = Clip & { id: string };

export interface ClipperProject {
  format: typeof CLIPPER_FORMAT;
  v: typeof PROJECT_VERSION;
  media: MediaRef;
  settings: ProjectSettings;
  transcript: string;
  words: Word[];
  clips: ProjectClip[];
  edits: Record<string, ClipEdit>;
  repurpose: Partial<Record<RepurposeKind, string>>;
  /** Where it was last saved: web, desktop or server, and that build. */
  surface?: "web" | "desktop" | "server";
  savedWith?: string;
}

export class ProjectError extends Error {
  constructor(message: string, public code: "not_a_project" | "newer" | "invalid") { super(message); }
}

const num = (v: unknown, lo: number, hi: number, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
const str = (v: unknown, max: number): string => (typeof v === "string" ? v : v == null ? "" : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function readMedia(raw: unknown): MediaRef {
  const m = isObj(raw) ? raw : {};
  const fp = str(m.fingerprint, 80);
  return {
    name: str(m.name, 300) || "video",
    size: num(m.size, 0, 1e13), duration: num(m.duration, 0, 1e6),
    width: Math.round(num(m.width, 0, 20_000)), height: Math.round(num(m.height, 0, 20_000)),
    ...(m.type ? { type: str(m.type, 100) } : {}),
    ...(/^sha256:[0-9a-f]{64}$/.test(fp) ? { fingerprint: fp } : {}),
  };
}

function readWords(raw: unknown): Word[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length > PROJECT_LIMITS.words) throw new ProjectError(`This project has more than ${PROJECT_LIMITS.words} words.`, "invalid");
  const out: Word[] = [];
  for (const w of raw) {
    if (!isObj(w)) continue;
    const start = Number(w.start), end = Number(w.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const word: Word = { word: str(w.word, 200), start: Math.max(0, start), end: Math.max(start, end) };
    if (w.speaker != null && Number.isFinite(Number(w.speaker))) word.speaker = Math.round(num(w.speaker, 0, 64));
    out.push(word);
  }
  return out;
}

function readClips(raw: unknown, duration: number): ProjectClip[] {
  if (!Array.isArray(raw)) return [];
  const max = duration > 0 ? duration : 1e6;
  const out: ProjectClip[] = [];
  const seen = new Set<string>();
  for (const c of raw.slice(0, PROJECT_LIMITS.clips)) {
    if (!isObj(c)) continue;
    const start = num(c.start, 0, max), end = num(c.end, 0, max);
    if (end <= start) continue;
    let id = typeof c.id === "string" && ID_RE.test(c.id) ? c.id : "";
    if (!id || seen.has(id)) id = `c${out.length + 1}${Math.random().toString(36).slice(2, 7)}`;
    seen.add(id);
    const clip: ProjectClip = { id, title: str(c.title, 200) || "Untitled clip", start, end };
    if (c.hook) clip.hook = str(c.hook, PROJECT_LIMITS.textChars);
    if (c.summary) clip.summary = str(c.summary, PROJECT_LIMITS.textChars);
    if (c.caption) clip.caption = str(c.caption, PROJECT_LIMITS.textChars);
    if (c.why) clip.why = str(c.why, PROJECT_LIMITS.textChars);
    if (Array.isArray(c.hashtags)) clip.hashtags = c.hashtags.slice(0, 20).map((h: unknown) => str(h, 60)).filter(Boolean);
    if (c.score != null) clip.score = num(c.score, 0, 100);
    if (isObj(c.scores)) clip.scores = { hook: num(c.scores.hook, 0, 100), flow: num(c.scores.flow, 0, 100), value: num(c.scores.value, 0, 100), trend: num(c.scores.trend, 0, 100) };
    if (isObj(c.emojis)) {
      const e: Record<string, string> = {};
      for (const [k, v] of Object.entries(c.emojis).slice(0, 30)) if (typeof v === "string" && v.length <= 8) e[str(k, 30)] = v;
      clip.emojis = e;
    }
    out.push(clip);
  }
  return out;
}

function readEdits(raw: unknown, clips: ProjectClip[]): Record<string, ClipEdit> {
  if (!isObj(raw)) return {};
  const ids = new Set(clips.map((c) => c.id));
  const out: Record<string, ClipEdit> = {};
  for (const [id, e] of Object.entries(raw)) {
    // An edit is the editor's own state; it is kept as saved (bounded) for clips that still exist.
    if (!ids.has(id) || !isObj(e)) continue;
    if (JSON.stringify(e).length > 200_000) throw new ProjectError("One clip's edit is too large.", "invalid");
    out[id] = e as ClipEdit;
  }
  return out;
}

function readRepurpose(raw: unknown): Partial<Record<RepurposeKind, string>> {
  if (!isObj(raw)) return {};
  const out: Partial<Record<RepurposeKind, string>> = {};
  for (const k of REPURPOSE) if (typeof raw[k] === "string" && raw[k]) out[k] = str(raw[k], PROJECT_LIMITS.repurposeChars);
  return out;
}

function readSettings(raw: Record<string, any>): ProjectSettings {
  const platform = PLATFORMS.some((p) => p.id === raw.platform) ? String(raw.platform) : PLATFORMS[0].id;
  const fallbackAspect = PLATFORMS.find((p) => p.id === platform)?.aspect ?? ASPECTS[0];
  return {
    platform,
    aspect: (ASPECTS as readonly string[]).includes(raw.aspect) ? raw.aspect : fallbackAspect,
    count: Math.round(num(raw.count, 1, 30, 8)),
    length: LENGTHS.some((l) => l.id === raw.length) ? raw.length : "auto",
    instruction: str(raw.instruction, 1_000),
    videoLang: str(raw.videoLang, 12),
  };
}

/**
 * Any saved Clipper project → the current format. Older versions are upgraded; a project
 * from a newer Clipper is refused (it would lose what this version does not know).
 */
export function readProject(raw: unknown): ClipperProject {
  if (!isObj(raw)) throw new ProjectError("This is not a Clipper project.", "not_a_project");
  const v = Number(raw.v ?? 0);
  if (raw.format != null && raw.format !== CLIPPER_FORMAT) throw new ProjectError("This is not a Clipper project.", "not_a_project");
  if (v > PROJECT_VERSION) throw new ProjectError("This project was made by a newer Clipper. Update to open it.", "newer");
  // v5 keeps settings in "settings" and the video in "media"; v4 and older kept both at the top ("file").
  const settingsSrc = isObj(raw.settings) ? raw.settings : raw;
  const media = readMedia(raw.media ?? raw.file);
  if (!raw.media && !raw.file && !Array.isArray(raw.words) && !Array.isArray(raw.clips)) {
    throw new ProjectError("This is not a Clipper project.", "not_a_project");
  }
  const transcript = str(raw.transcript, PROJECT_LIMITS.transcriptChars);
  const words = readWords(raw.words);
  const duration = media.duration || (words.length ? words[words.length - 1].end : 0);
  const clips = readClips(raw.clips, duration);
  const p: ClipperProject = {
    format: CLIPPER_FORMAT, v: PROJECT_VERSION, media, settings: readSettings(settingsSrc),
    transcript, words, clips, edits: readEdits(raw.edits, clips), repurpose: readRepurpose(raw.repurpose),
  };
  if (raw.surface === "web" || raw.surface === "desktop" || raw.surface === "server") p.surface = raw.surface;
  if (raw.savedWith) p.savedWith = str(raw.savedWith, 40);
  return p;
}

/** What the project list shows without opening the project. */
export function projectMeta(p: ClipperProject): Record<string, string> {
  return {
    v: String(PROJECT_VERSION), clips: String(p.clips.length),
    duration: String(Math.round(p.media.duration || 0)), media: p.media.name.slice(0, 80),
    ...(p.media.fingerprint ? { fp: p.media.fingerprint.slice(7, 19) } : {}),
  };
}

/** Is this file the project's video? "unknown" when the project predates fingerprints. */
export function sameMedia(ref: MediaRef, file: { name: string; size: number; fingerprint?: string }): "same" | "different" | "unknown" {
  if (ref.fingerprint && file.fingerprint) return ref.fingerprint === file.fingerprint ? "same" : "different";
  if (!ref.size) return "unknown";
  return ref.name === file.name && ref.size === file.size ? "same" : "different";
}

const SLICE = 2 * 1024 * 1024;

/** "sha256:<hex>" of the size, the first 2 MiB and the last 2 MiB — fast even for a 20 GB file. */
export async function fingerprint(blob: Blob): Promise<string> {
  const size = new TextEncoder().encode(String(blob.size) + ":");
  const head = new Uint8Array(await blob.slice(0, Math.min(SLICE, blob.size)).arrayBuffer());
  const tail = blob.size > SLICE * 2 ? new Uint8Array(await blob.slice(blob.size - SLICE).arrayBuffer()) : new Uint8Array();
  const all = new Uint8Array(size.length + head.length + tail.length);
  all.set(size, 0); all.set(head, size.length); all.set(tail, size.length + head.length);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", all));
  return "sha256:" + Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The project as a file the member can keep, move or open in the desktop app. */
export function projectFile(p: ClipperProject): string {
  return JSON.stringify({ ...p, format: CLIPPER_FORMAT, v: PROJECT_VERSION });
}
