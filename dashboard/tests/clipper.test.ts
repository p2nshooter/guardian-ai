/* AXTO — Clipper v4 editing logic: cuts, captions, reframing, long audio and the
 * AI task modes. Pure functions only (the renderer draws what these return). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fillerIndices, keptSegments, toOut, toSrc, totalDuration, captionPages, pageAt, spreadWords,
  emojiFor, smoothTrack, trackAt, twoFaceShare, cropBox, chunkPlan, mergeTranscripts, segmentAt,
} from "../lib/clipper/edit";
import { parseClips, parseLines, outputSize, defaultEdit, styleFromTemplate, TEMPLATES, cuesToFile, stamp, transcriptForModel, safeName } from "../lib/clipper/options";
import { getTask } from "../lib/ai/tasks";
import "../lib/ai/register";

const W = (spec: string, from = 0, step = 0.5, gap = 0.1) =>
  spec.split(" ").map((word, i) => ({ word, start: from + i * step, end: from + i * step + step - gap }));

test("fillers: single sounds and two-word fillers, in several languages", () => {
  const words = W("so um this is uh you know really anu bagus eh");
  const f = fillerIndices(words);
  assert.deepEqual([...f].sort((a, b) => a - b), [1, 4, 5, 6, 8, 10]);
  assert.equal(fillerIndices(W("I mean it")).size, 2, "'I mean' is a filler pair");
  assert.equal(fillerIndices(W("Um, well")).has(0), true, "punctuation is ignored");
});

test("cuts: fillers, silences and manual cuts leave the right pieces", () => {
  // words 0..9 at 0.5 s steps; a 3 s silence after word 4
  const words = [...W("one two um three four"), ...W("five six seven eight nine", 5.5)];
  const all = keptSegments(words, { start: 0, end: 8 });
  assert.equal(all.length, 1);
  assert.equal(totalDuration(all), 8);
  const noFill = keptSegments(words, { start: 0, end: 8 }, { removeFillers: true });
  assert.equal(noFill.length, 2, "the 'um' is cut out");
  assert.ok(noFill[0].end <= 1.0 + 1e-9 && noFill[1].start >= 1.4 - 1e-9);
  const noSil = keptSegments(words, { start: 0, end: 8 }, { removeSilence: true, silenceGap: 0.7, keepPause: 0.15 });
  assert.ok(totalDuration(noSil) < 6.5, `the 3 s pause is shortened (${totalDuration(noSil)})`);
  const manual = keptSegments(words, { start: 0, end: 8 }, { cuts: [{ start: 5.5, end: 6.5 }] });
  assert.equal(manual.length, 2);
  assert.equal(manual[1].start, 6.5);
});

test("time mapping: source ↔ exported clip, and cut moments map to null", () => {
  const segs = [{ start: 10, end: 12 }, { start: 15, end: 20 }];
  assert.equal(toOut(segs, 10), 0);
  assert.equal(toOut(segs, 11), 1);
  assert.equal(toOut(segs, 13), null, "cut");
  assert.equal(toOut(segs, 16), 3);
  assert.equal(toSrc(segs, 3), 16);
  assert.equal(toSrc(segs, 99), 20, "past the end clamps");
  assert.equal(segmentAt(segs, 13), 1, "a time in a cut belongs to the next piece");
  assert.equal(segmentAt(segs, 25), -1);
});

test("captions: pages follow words per line, lines, pauses and sentence ends; cut words disappear", () => {
  const words = [...W("Hello world. This is a test of captions"), ...W("after pause", 10)];
  const segs = [{ start: 0, end: 12 }];
  const pages = captionPages(words, segs, { wordsPerLine: 3, lines: 1 });
  assert.equal(pages[0].lines[0].map((w) => w.text).join(" "), "Hello world.", "breaks after a sentence");
  assert.ok(pages.every((p) => p.lines.every((l) => l.length <= 3)));
  assert.equal(pages[pages.length - 1].lines[0][0].text, "after", "a long pause starts a new page");
  const two = captionPages(words, segs, { wordsPerLine: 2, lines: 2 });
  assert.ok(two.some((p) => p.lines.length === 2), "two lines per page");
  const cut = captionPages(words, [{ start: 0, end: 1.2 }, { start: 10, end: 12 }], { wordsPerLine: 5 });
  assert.ok(!cut.flatMap((p) => p.lines.flat()).some((w) => w.text === "test"), "cut words are not captioned");
  const edited = captionPages(words, segs, { wordsPerLine: 3, edits: { 1: "World!", 2: "" } });
  const flat = edited.flatMap((p) => p.lines.flat()).map((w) => w.text);
  assert.ok(flat.includes("World!") && !flat.includes("This"), "corrections apply; an emptied word is hidden");
  assert.ok(pageAt(pages, 0.2) && !pageAt(pages, 50));
  const sp = spreadWords("satu dua tiga", 3, 6);
  assert.deepEqual(sp.map((w) => [w.start, w.end]), [[3, 4], [4, 5], [5, 6]]);
});

test("emoji: built-in dictionary (multilingual) and per-clip suggestions", () => {
  assert.equal(emojiFor("Money!"), "💰");
  assert.equal(emojiFor("uang"), "💰");
  assert.equal(emojiFor("rocket"), "🚀");
  assert.equal(emojiFor("pricing", { pricing: "🏷️" }), "🏷️");
  assert.equal(emojiFor("table"), "");
});

test("reframe: dead zone, speed limit, hard cut on a jump, holds through missed frames", () => {
  const jitter = smoothTrack([0.5, 0.52, 0.48, 0.51, 0.49].map((cx, i) => ({ t: i * 0.5, cx })));
  assert.ok(jitter.every((k) => Math.abs(k.cx - 0.5) < 1e-9), "small jitter never moves the camera");
  const slow = smoothTrack([{ t: 0, cx: 0.3 }, { t: 0.5, cx: 0.5 }, { t: 1, cx: 0.5 }], { maxSpeed: 0.2, jump: 0.5 });
  assert.ok(slow[1].cx < 0.5 && slow[1].cx > 0.3, "glides at a limited speed");
  const cut = smoothTrack([{ t: 0, cx: 0.2 }, { t: 0.5, cx: 0.8 }, { t: 1, cx: 0.8 }, { t: 1.5, cx: 0.81 }]);
  assert.equal(cut[1].cut, true);
  assert.equal(cut[1].cx, 0.8, "a persistent jump is a cut, not a pan");
  const hold = smoothTrack([{ t: 0, cx: 0.7 }, { t: 0.5, cx: null }, { t: 1, cx: null }]);
  assert.ok(hold.every((k) => k.cx === 0.7), "no face = hold");
  assert.equal(trackAt(cut, 0.25), 0.2, "before a cut key the camera stays");
  assert.equal(trackAt(cut, 0.75), 0.8);
  assert.equal(trackAt([], 3), 0.5);
  assert.equal(twoFaceShare([{ t: 0, cx: 0.3, cx2: 0.7 }, { t: 1, cx: 0.5, cx2: null }]), 0.5);
});

test("crop box fills the output aspect, stays inside the frame and zooms", () => {
  const b = cropBox(1920, 1080, 1080, 1920, 0.5);
  assert.equal(Math.round(b.w), 608);
  assert.equal(b.h, 1080);
  assert.equal(Math.round(b.x), 656);
  assert.equal(cropBox(1920, 1080, 1080, 1920, 0).x, 0, "left edge");
  assert.equal(Math.round(cropBox(1920, 1080, 1080, 1920, 1).x), 1313, "right edge");
  const z = cropBox(1920, 1080, 1080, 1920, 0.5, 1.5);
  assert.equal(Math.round(z.h), 720);
  const wide = cropBox(1080, 1920, 1920, 1080, 0.5);
  assert.equal(wide.w, 1080, "portrait source into landscape output");
});

test("long audio: chunk plan and merged transcript offsets", () => {
  assert.deepEqual(chunkPlan(3000, 1200), [{ start: 0, end: 1200 }, { start: 1200, end: 2400 }, { start: 2400, end: 3000 }]);
  assert.deepEqual(chunkPlan(2450, 1200), [{ start: 0, end: 1200 }, { start: 1200, end: 2450 }], "short tail folded in");
  assert.deepEqual(chunkPlan(600, 1200), [{ start: 0, end: 600 }]);
  const m = mergeTranscripts([{ offset: 1200, text: "b", words: [{ word: "b", start: 1, end: 2 }] }, { offset: 0, text: "a", words: [{ word: "a", start: 1, end: 2 }] }]);
  assert.equal(m.text, "a b");
  assert.deepEqual(m.words.map((w) => w.start), [1, 1201]);
});

test("clips: sub-scores, overall score fallback, emoji map", () => {
  const out = JSON.stringify({ clips: [
    { title: "A", start: 1, end: 20, scores: { hook: 90, flow: 80, value: 70, trend: 60 }, emojis: { money: "💰" }, why: "strong hook" },
    { title: "B", start: 30, end: 50, score: 99 },
  ] });
  const c = parseClips(out, 100);
  assert.equal(c[0].title, "B");
  assert.equal(c[1].score, 75, "no overall score → average of sub-scores");
  assert.deepEqual(c[1].scores, { hook: 90, flow: 80, value: 70, trend: 60 });
  assert.equal(c[1].emojis?.money, "💰");
  assert.equal(parseClips('{"clips":[{"title":"x","start":200,"end":300}]}', 100).length, 0, "entirely past the end → dropped");
  assert.deepEqual(parseLines('```json\n["a","b"]\n```', 2), ["a", "b"]);
  assert.equal(parseLines('["a"]', 2), null, "wrong count is rejected");
});

test("templates, output sizes, defaults, files", () => {
  assert.ok(TEMPLATES.length >= 8);
  assert.deepEqual(outputSize("9:16"), [1080, 1920]);
  assert.deepEqual(outputSize("4:5", "720"), [720, 900]);
  assert.deepEqual(outputSize("16:9"), [1920, 1080]);
  const e = defaultEdit({ start: 5, end: 25, title: "Big idea" }, { template: "neon", progress: false });
  assert.equal(e.captions.template, "neon");
  assert.equal(e.hook.text, "Big idea");
  assert.equal(e.progress, false);
  assert.equal(styleFromTemplate("nope").template, "bold", "unknown template → default");
  assert.equal(stamp(3661.5, ","), "01:01:01,500");
  assert.match(cuesToFile([{ s: 0, e: 1, text: "hi" }], "vtt"), /^WEBVTT\n\n00:00:00\.000 --> 00:00:01\.000\nhi/);
  assert.equal(safeName("Héllo / wörld?"), "Héllo_wörld_");
  const t = transcriptForModel([{ word: "a", start: 0, end: 1, speaker: 0 }, { word: "b", start: 1, end: 2, speaker: 1 }]);
  assert.match(t, /S1: a\n\[1\.0\] S2: b/, "speaker changes start a new line");
});

test("AI task: clip, repurpose and translate modes", () => {
  const h = getTask("clipper")!;
  const tr = "[0.0] " + "word ".repeat(40);
  const clips = h.build({ messages: [{ role: "user", content: tr }], options: { platform: "shorts", count: "5", length: "short", instruction: "pricing\nmoments" } }, "starter");
  assert.ok("system" in clips);
  assert.match(clips.system, /between 15 and 30 seconds/);
  assert.match(clips.system, /"pricing moments"/, "instruction included, newlines stripped");
  assert.match(clips.system, /"scores"/);
  const rep = h.build({ messages: [{ role: "user", content: tr }], options: { mode: "repurpose", kind: "chapters" } }, "starter");
  assert.ok("system" in rep && /YouTube chapters/.test(rep.system));
  const bad = h.build({ messages: [{ role: "user", content: '["a"]' }], options: { mode: "translate" } }, "starter");
  assert.ok("error" in bad, "translate needs a target language");
  const tl = h.build({ messages: [{ role: "user", content: '["hello","world"]' }], options: { mode: "translate", target: "Indonesian" } }, "starter");
  assert.ok("system" in tl && /EXACTLY the same number/.test(tl.system));
});

test("manual cuts toggle and merge; subtitles import as timed words", async () => {
  const { toggleCut, isCut, parseSubtitles } = await import("../lib/clipper/edit");
  let cuts = toggleCut([], { start: 2, end: 3 }, true);
  cuts = toggleCut(cuts, { start: 3, end: 4 }, true);
  assert.deepEqual(cuts, [{ start: 2, end: 4 }], "adjacent cuts merge");
  cuts = toggleCut(cuts, { start: 2.5, end: 3.5 }, false);
  assert.deepEqual(cuts, [{ start: 2, end: 2.5 }, { start: 3.5, end: 4 }], "restoring the middle splits the cut");
  assert.equal(isCut(cuts, { word: "x", start: 2.1, end: 2.3 }), true);
  assert.equal(isCut(cuts, { word: "y", start: 2.9, end: 3.1 }), false);
  const srt = "1\n00:00:01,000 --> 00:00:03,000\nHello <i>big</i> world\n\n2\n00:00:04,500 --> 00:00:05,500\nagain\n";
  const w = parseSubtitles(srt);
  assert.deepEqual(w.map((x) => x.word), ["Hello", "big", "world", "again"]);
  assert.equal(w[0].start, 1);
  assert.ok(Math.abs(w[2].end - 3) < 1e-9);
  assert.equal(parseSubtitles("WEBVTT\n\n00:01.000 --> 00:02.000\nshort form\n")[1].word, "form", "VTT without hours");
});

test("caption files follow the exported clock (cuts shift the cues)", async () => {
  const { pagesToCues, toOutClamped, captionPages } = await import("../lib/clipper/edit");
  const segs = [{ start: 10, end: 12 }, { start: 15, end: 20 }];
  assert.equal(toOutClamped(segs, 13), 2, "a cut moment → the next piece's start");
  assert.equal(toOutClamped(segs, 30), 7);
  const words = [{ word: "one", start: 10.2, end: 10.8 }, { word: "two", start: 15.5, end: 16 }];
  const pages = captionPages(words, segs, { wordsPerLine: 1 });
  const cues = pagesToCues(pages, segs, true);
  assert.deepEqual(cues.map((c) => c.text), ["ONE", "TWO"]);
  assert.ok(Math.abs(cues[1].s - 2.5) < 1e-9, "the second word starts 0.5 s into the second piece");
});
