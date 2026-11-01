/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — the film project format shared by the web, the desktop app and a
 * Studio Server (REQUESTS 141, docs/apps/AI-STUDIO-BLUEPRINT.md §3 and §11.1).
 *
 *   One JSON document, format "axto.film", version 1. The timeline follows
 *   OpenTimelineIO (timeline → tracks → items: clips, gaps, transitions), with
 *   rational time {value, rate} so every cut lands on a frame, including the
 *   NTSC rates (23.976 = 24000/1001). Media is referred to by fingerprint (the
 *   Clipper method), never stored inside the project. Cast, looks, the script
 *   and the shot recipes travel with it.
 *
 *   readFilmProject() checks and bounds every field and refuses a project made
 *   by a newer AI Studio instead of damaging it. Pure: no DOM, no network — the
 *   API validates with the same code.
 * ============================================================================ */

export const FILM_FORMAT = "axto.film";
export const FILM_VERSION = 1;
export const FILM_FILE_EXT = ".axfilm";

/** Up to 24 hours on one timeline (owner: "durasi 10 detik sampai 1 hari"). */
export const MAX_DURATION_S = 24 * 3600;
export const FILM_LIMITS = { tracks: 64, items: 20_000, media: 5_000, cast: 200, looks: 100, shots: 20_000, text: 4_000, script: 2_000_000 } as const;

/** Frame rates used in film, TV and online video, as exact fractions. */
export const FRAME_RATES = [
  { id: "23.976", num: 24000, den: 1001 }, { id: "24", num: 24, den: 1 }, { id: "25", num: 25, den: 1 },
  { id: "29.97", num: 30000, den: 1001 }, { id: "30", num: 30, den: 1 }, { id: "48", num: 48, den: 1 },
  { id: "50", num: 50, den: 1 }, { id: "59.94", num: 60000, den: 1001 }, { id: "60", num: 60, den: 1 },
] as const;
export type FrameRateId = (typeof FRAME_RATES)[number]["id"];

export const RESOLUTIONS = [
  { id: "1080p", w: 1920, h: 1080 }, { id: "2k-dci", w: 2048, h: 1080 }, { id: "uhd", w: 3840, h: 2160 },
  { id: "4k-dci", w: 4096, h: 2160 }, { id: "8k", w: 7680, h: 4320 },
  { id: "vertical-1080", w: 1080, h: 1920 }, { id: "square-1080", w: 1080, h: 1080 },
] as const;
export type ResolutionId = (typeof RESOLUTIONS)[number]["id"];

export const COLOR_SPACES = ["rec709", "rec2020-pq", "rec2020-hlg", "aces-cg"] as const;
export const TRACK_KINDS = ["video", "audio", "text"] as const;
export const ITEM_KINDS = ["clip", "gap", "transition"] as const;
export const SHOT_SOURCES = ["text", "image", "video", "keyframes", "performance", "footage"] as const;

/** A time on the timeline: `value` frames at `rate` frames per second (OTIO RationalTime, whole frames). */
export interface RationalTime { value: number; rate: number }
export interface TimeRange { start: RationalTime; duration: RationalTime }

export interface MediaRef { id: string; name: string; kind: "video" | "audio" | "image"; size: number; duration: number; width: number; height: number; fingerprint?: string }
export interface Item { id: string; kind: (typeof ITEM_KINDS)[number]; name: string; range: TimeRange; media?: string; shot?: string; effect?: string }
export interface Track { id: string; kind: (typeof TRACK_KINDS)[number]; name: string; muted: boolean; locked: boolean; items: Item[] }
export interface CastMember { id: string; name: string; role: string; description: string; original: boolean; consent?: { by: string; scope: string; until: string } }
export interface Look { id: string; name: string; description: string }
export interface Shot { id: string; scene: string; source: (typeof SHOT_SOURCES)[number]; prompt: string; cast: string[]; look?: string; camera: string; seconds: number; status: "planned" | "generating" | "done" | "approved" }
export interface FilmSettings { frameRate: FrameRateId; resolution: ResolutionId; colorSpace: (typeof COLOR_SPACES)[number] }

export interface FilmProject {
  format: typeof FILM_FORMAT;
  v: typeof FILM_VERSION;
  title: string;
  logline: string;
  settings: FilmSettings;
  timeline: { name: string; tracks: Track[] };
  media: MediaRef[];
  cast: CastMember[];
  looks: Look[];
  script: string;
  shots: Shot[];
  surface?: "web" | "desktop" | "server";
}

export class FilmProjectError extends Error {
  constructor(message: string, public code: "not_a_project" | "newer" | "invalid") { super(message); }
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v : v == null ? "" : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => ((list as readonly string[]).includes(v as string) ? (v as T) : d);
const rateOf = (id: FrameRateId): number => { const r = FRAME_RATES.find((x) => x.id === id)!; return r.num / r.den; };

/** Unique ids: keep a valid one once, otherwise make one. */
function ids() {
  const seen = new Set<string>();
  let n = 0;
  return (v: unknown, prefix: string): string => {
    let id = typeof v === "string" && ID_RE.test(v) && !seen.has(v) ? v : "";
    while (!id || seen.has(id)) id = `${prefix}${++n}`;
    seen.add(id);
    return id;
  };
}

/** Frames as a whole number within the 24-hour limit at this rate. */
function time(v: unknown, rate: number): RationalTime {
  const t = isObj(v) ? v : {};
  const r = Number(t.rate) > 0 ? Number(t.rate) : rate;
  const frames = Math.round(Number(t.value) || 0);
  const maxFrames = Math.ceil(MAX_DURATION_S * r);
  return { value: Math.min(maxFrames, Math.max(0, frames)), rate: Math.round(r * 1000) / 1000 };
}

/** Seconds of a rational time. */
export const seconds = (t: RationalTime): number => t.value / t.rate;

/** Seconds → frames at the project's rate (rounded to the nearest frame). */
export const toFrames = (s: number, rate: FrameRateId): number => Math.round(s * rateOf(rate));

/** SMPTE timecode HH:MM:SS:FF (non-drop-frame) for a frame count. */
export function timecode(frames: number, rate: FrameRateId): string {
  const fps = Math.round(rateOf(rate));
  const f = Math.max(0, Math.round(frames));
  const hh = Math.floor(f / (fps * 3600)), mm = Math.floor(f / (fps * 60)) % 60, ss = Math.floor(f / fps) % 60, ff = f % fps;
  return [hh, mm, ss, ff].map((x) => String(x).padStart(2, "0")).join(":");
}

/** The end of the last item over all tracks, in seconds. */
export function durationOf(p: Pick<FilmProject, "timeline">): number {
  let end = 0;
  for (const t of p.timeline.tracks) for (const i of t.items) end = Math.max(end, seconds(i.range.start) + seconds(i.range.duration));
  return end;
}

/** A new, empty project with the usual starting tracks. */
export function newFilmProject(title: string, settings: Partial<FilmSettings> = {}): FilmProject {
  return readFilmProject({
    format: FILM_FORMAT, v: FILM_VERSION, title, logline: "", settings,
    timeline: { name: "Main", tracks: [
      { id: "v1", kind: "video", name: "V1", items: [] }, { id: "a1", kind: "audio", name: "Dialogue", items: [] },
      { id: "a2", kind: "audio", name: "Music", items: [] }, { id: "a3", kind: "audio", name: "Effects", items: [] },
      { id: "t1", kind: "text", name: "Titles", items: [] },
    ] },
  });
}

/** Any saved AI Studio project → the current format, every field checked and bounded. */
export function readFilmProject(raw: unknown): FilmProject {
  if (!isObj(raw) || (raw.format != null && raw.format !== FILM_FORMAT)) throw new FilmProjectError("This is not an AI Studio project.", "not_a_project");
  if (Number(raw.v ?? FILM_VERSION) > FILM_VERSION) throw new FilmProjectError("This project was made by a newer AI Studio. Update to open it.", "newer");
  if (raw.format == null && !isObj(raw.timeline)) throw new FilmProjectError("This is not an AI Studio project.", "not_a_project");
  const s = isObj(raw.settings) ? raw.settings : {};
  const settings: FilmSettings = {
    frameRate: pick(s.frameRate, FRAME_RATES.map((r) => r.id), "24"),
    resolution: pick(s.resolution, RESOLUTIONS.map((r) => r.id), "1080p"),
    colorSpace: pick(s.colorSpace, COLOR_SPACES, "rec709"),
  };
  const rate = Math.round(rateOf(settings.frameRate) * 1000) / 1000;

  const mediaId = ids();
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  if (mediaRaw.length > FILM_LIMITS.media) throw new FilmProjectError(`A project can hold up to ${FILM_LIMITS.media} media files.`, "invalid");
  const media: MediaRef[] = mediaRaw.filter(isObj).map((m) => {
    const fp = str(m.fingerprint, 80);
    return {
      id: mediaId(m.id, "m"), name: str(m.name, 300) || "media", kind: pick(m.kind, ["video", "audio", "image"] as const, "video"),
      size: Math.max(0, Math.min(1e13, Number(m.size) || 0)), duration: Math.max(0, Math.min(MAX_DURATION_S, Number(m.duration) || 0)),
      width: Math.max(0, Math.min(20_000, Math.round(Number(m.width) || 0))), height: Math.max(0, Math.min(20_000, Math.round(Number(m.height) || 0))),
      ...(/^sha256:[0-9a-f]{64}$/.test(fp) ? { fingerprint: fp } : {}),
    };
  });
  const mediaIds = new Set(media.map((m) => m.id));

  const castId = ids();
  const cast: CastMember[] = (Array.isArray(raw.cast) ? raw.cast : []).filter(isObj).slice(0, FILM_LIMITS.cast).map((c) => {
    const original = c.original !== false;
    const consent = isObj(c.consent) && str(c.consent.by, 200) ? { by: str(c.consent.by, 200), scope: str(c.consent.scope, 500), until: str(c.consent.until, 40) } : undefined;
    // A real person's likeness only with recorded consent (blueprint §10): otherwise the member is an original character.
    return { id: castId(c.id, "c"), name: str(c.name, 120) || "Character", role: str(c.role, 120), description: str(c.description, FILM_LIMITS.text), original: original || !consent, ...(consent && !original ? { consent } : {}) };
  });
  const castIds = new Set(cast.map((c) => c.id));

  const lookId = ids();
  const looks: Look[] = (Array.isArray(raw.looks) ? raw.looks : []).filter(isObj).slice(0, FILM_LIMITS.looks).map((l) => ({ id: lookId(l.id, "l"), name: str(l.name, 120) || "Look", description: str(l.description, FILM_LIMITS.text) }));
  const lookIds = new Set(looks.map((l) => l.id));

  const shotId = ids();
  const shotsRaw = Array.isArray(raw.shots) ? raw.shots : [];
  if (shotsRaw.length > FILM_LIMITS.shots) throw new FilmProjectError(`A project can hold up to ${FILM_LIMITS.shots} shots.`, "invalid");
  const shots: Shot[] = shotsRaw.filter(isObj).map((x) => ({
    id: shotId(x.id, "s"), scene: str(x.scene, 40), source: pick(x.source, SHOT_SOURCES, "text"), prompt: str(x.prompt, FILM_LIMITS.text),
    cast: (Array.isArray(x.cast) ? x.cast : []).map((c: unknown) => String(c)).filter((c: string) => castIds.has(c)).slice(0, 20),
    ...(lookIds.has(String(x.look)) ? { look: String(x.look) } : {}),
    camera: str(x.camera, 200), seconds: Math.max(0, Math.min(600, Number(x.seconds) || 0)),
    status: pick(x.status, ["planned", "generating", "done", "approved"] as const, "planned"),
  }));
  const shotIds = new Set(shots.map((x) => x.id));

  const tl = isObj(raw.timeline) ? raw.timeline : {};
  const tracksRaw = Array.isArray(tl.tracks) ? tl.tracks : [];
  if (tracksRaw.length > FILM_LIMITS.tracks) throw new FilmProjectError(`A timeline can hold up to ${FILM_LIMITS.tracks} tracks.`, "invalid");
  const trackId = ids(), itemId = ids();
  let items = 0;
  const tracks: Track[] = tracksRaw.filter(isObj).map((t) => {
    const its: Item[] = [];
    for (const i of Array.isArray(t.items) ? t.items : []) {
      if (!isObj(i)) continue;
      if (++items > FILM_LIMITS.items) throw new FilmProjectError(`A timeline can hold up to ${FILM_LIMITS.items} items.`, "invalid");
      const r = isObj(i.range) ? i.range : {};
      const range = { start: time(r.start, rate), duration: time(r.duration, rate) };
      if (range.duration.value <= 0 && i.kind !== "transition") continue;
      if (seconds(range.start) + seconds(range.duration) > MAX_DURATION_S + 1e-6) range.duration.value = Math.max(0, Math.floor((MAX_DURATION_S - seconds(range.start)) * range.duration.rate));
      its.push({
        id: itemId(i.id, "i"), kind: pick(i.kind, ITEM_KINDS, "clip"), name: str(i.name, 200), range,
        ...(mediaIds.has(String(i.media)) ? { media: String(i.media) } : {}),
        ...(shotIds.has(String(i.shot)) ? { shot: String(i.shot) } : {}),
        ...(i.effect ? { effect: str(i.effect, 80) } : {}),
      });
    }
    its.sort((a, b) => a.range.start.value / a.range.start.rate - b.range.start.value / b.range.start.rate);
    return { id: trackId(t.id, "t"), kind: pick(t.kind, TRACK_KINDS, "video"), name: str(t.name, 80) || "Track", muted: t.muted === true, locked: t.locked === true, items: its };
  });

  const p: FilmProject = {
    format: FILM_FORMAT, v: FILM_VERSION, title: str(raw.title, 200) || "Untitled film", logline: str(raw.logline, 1_000), settings,
    timeline: { name: str(tl.name, 120) || "Main", tracks }, media, cast, looks, script: str(raw.script, FILM_LIMITS.script), shots,
  };
  if (raw.surface === "web" || raw.surface === "desktop" || raw.surface === "server") p.surface = raw.surface;
  return p;
}

/** What the project list shows without opening the project. */
export function filmMeta(p: FilmProject): Record<string, string> {
  return {
    v: String(FILM_VERSION), fps: p.settings.frameRate, res: p.settings.resolution,
    duration: String(Math.round(durationOf(p))), shots: String(p.shots.length), media: String(p.media.length),
  };
}

/** The project as a file the member can keep, move, or open on another surface. */
export const filmFile = (p: FilmProject): string => JSON.stringify({ ...p, format: FILM_FORMAT, v: FILM_VERSION });
