/* AXTO — AI Studio S0 (REQUESTS 141, docs/apps/AI-STUDIO-BLUEPRINT.md §11.1): the film project format. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FILM_FORMAT, FILM_VERSION, FilmProjectError, MAX_DURATION_S, durationOf, filmFile, filmMeta, newFilmProject, readFilmProject, timecode, toFrames } from "../lib/film/project";

test("a new film starts with picture, dialogue, music, effects and title tracks at the chosen settings", () => {
  const p = newFilmProject("Pilot", { frameRate: "23.976", resolution: "4k-dci" });
  assert.equal(p.format, FILM_FORMAT);
  assert.equal(p.v, FILM_VERSION);
  assert.deepEqual(p.timeline.tracks.map((t) => [t.kind, t.name]), [["video", "V1"], ["audio", "Dialogue"], ["audio", "Music"], ["audio", "Effects"], ["text", "Titles"]]);
  assert.deepEqual(p.settings, { frameRate: "23.976", resolution: "4k-dci", colorSpace: "rec709" });
  assert.deepEqual(readFilmProject(JSON.parse(filmFile(p))), p, "round trip");
});

test("frame-exact time: NTSC rates, timecode, and the 24-hour limit", () => {
  assert.equal(toFrames(10, "24"), 240);
  assert.equal(toFrames(3600, "23.976"), 86314, "one hour at 24000/1001");
  assert.equal(timecode(86400 * 24 - 1, "24"), "23:59:59:23");
  assert.equal(timecode(25 * 61 + 3, "25"), "00:01:01:03");
  const long = readFilmProject({ format: FILM_FORMAT, v: 1, settings: { frameRate: "24" }, timeline: { tracks: [{ kind: "video", items: [
    { id: "a", range: { start: { value: 0, rate: 24 }, duration: { value: 240, rate: 24 } } },
    { id: "b", range: { start: { value: 240, rate: 24 }, duration: { value: 24 * MAX_DURATION_S * 2, rate: 24 } } },
  ] }] } });
  assert.equal(durationOf(long), MAX_DURATION_S, "a timeline never runs past 24 hours");
  assert.equal(long.timeline.tracks[0]!.items.length, 2);
});

test("every field is checked: unknown settings fall back, broken references are dropped, ids stay unique", () => {
  const p = readFilmProject({
    format: FILM_FORMAT, v: 1, title: "x\u0000y", settings: { frameRate: "13", resolution: "16k", colorSpace: "srgb" },
    media: [{ id: "m1", name: "a.mp4", kind: "video", size: -1, fingerprint: "md5:1" }, { id: "m1", name: "b.wav", kind: "audio" }],
    cast: [{ id: "c1", name: "Rafi", original: false }, { id: "c2", name: "Ayu", original: false, consent: { by: "Ayu Lestari", scope: "this film", until: "2027-12-31" } }],
    shots: [{ id: "s1", prompt: "rooftop chase", cast: ["c1", "ghost"], look: "nope", seconds: 9999 }],
    timeline: { tracks: [{ id: "v1", kind: "video", items: [
      { id: "i1", media: "m1", shot: "s1", range: { start: { value: 48, rate: 24 }, duration: { value: 96, rate: 24 } } },
      { id: "i1", media: "missing", range: { start: { value: 0, rate: 24 }, duration: { value: 24, rate: 24 } } },
      { id: "i3", range: { start: { value: 0, rate: 24 }, duration: { value: 0, rate: 24 } } },
    ] }] },
  });
  assert.equal(p.title, "xy");
  assert.deepEqual(p.settings, { frameRate: "24", resolution: "1080p", colorSpace: "rec709" });
  assert.notEqual(p.media[0]!.id, p.media[1]!.id);
  assert.equal(p.media[0]!.size, 0);
  assert.equal(p.media[0]!.fingerprint, undefined);
  assert.equal(p.cast[0]!.original, true, "a real person's likeness needs recorded consent; without it the character is original");
  assert.deepEqual(p.cast[1]!.consent, { by: "Ayu Lestari", scope: "this film", until: "2027-12-31" });
  assert.deepEqual(p.shots[0]!.cast, ["c1"]);
  assert.equal(p.shots[0]!.look, undefined);
  assert.equal(p.shots[0]!.seconds, 600);
  const items = p.timeline.tracks[0]!.items;
  assert.equal(items.length, 2, "an empty clip is dropped");
  assert.deepEqual(items.map((i) => i.range.start.value), [0, 48], "items are in time order");
  assert.notEqual(items[0]!.id, items[1]!.id);
  assert.equal(items[0]!.media, undefined, "a clip of missing media keeps no reference");
  assert.equal(items[1]!.shot, "s1");
  assert.deepEqual(filmMeta(p), { v: "1", fps: "24", res: "1080p", duration: "6", shots: "1", media: "2" });
});

test("not a project, or a newer AI Studio's project, is refused", () => {
  assert.throws(() => readFilmProject("hello"), (e: any) => e instanceof FilmProjectError && e.code === "not_a_project");
  assert.throws(() => readFilmProject({ format: "axto.clipper", v: 5 }), (e: any) => e.code === "not_a_project");
  assert.throws(() => readFilmProject({ title: "no timeline" }), (e: any) => e.code === "not_a_project");
  assert.throws(() => readFilmProject({ format: FILM_FORMAT, v: 2, timeline: {} }), (e: any) => e.code === "newer");
  assert.throws(() => readFilmProject({ format: FILM_FORMAT, v: 1, timeline: { tracks: new Array(65).fill({ kind: "video" }) } }), (e: any) => e.code === "invalid");
});
