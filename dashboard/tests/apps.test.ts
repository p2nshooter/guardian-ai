/* AXTO — Security / Compliance / Vault engine unit tests (node:test via tsx). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractIocs, iocCount, iocBlock, refang, SEC_MODES, isSecMode } from "../lib/security/modes";
import { detect, redact, restore, luhn, summarize, PII_TYPES, type MaskStyle } from "../lib/vault/pii";
import { FRAMEWORKS, COMP_MODES, getFramework, isFramework, isCompMode } from "../lib/compliance/frameworks";
import { PLATFORMS, getPlatform, transcriptForModel, parseClips, buildCaptions } from "../lib/clipper/options";
import { getTask } from "../lib/ai/tasks";
import { parseIdrQuery } from "../lib/billing/unique-amount";
import "../lib/ai/register";

/* ── Security: IOC extraction ─────────────────────────────────────────────── */
test("security: refang defanged indicators", () => {
  assert.equal(refang("hxxps://evil[.]com/x"), "https://evil.com/x");
  assert.equal(refang("1[.]2[.]3[.]4"), "1.2.3.4");
  assert.match(refang("bob[at]evil(dot)com"), /bob@evil\.com/);
});

test("security: extract & classify IOCs, drop private IPs, keep hashes/CVEs", () => {
  const log = `2026-09-01 conn from 8.8.8.8 and 192.168.1.10 to hxxp://mal[.]example[.]com
    hash e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 md5 d41d8cd98f00b204e9800998ecf8427e
    exploit CVE-2026-12345 phishing from admin[at]evil[.]com`;
  const i = extractIocs(log);
  assert.ok(i.ipv4.includes("8.8.8.8"), "public IP kept");
  assert.ok(!i.ipv4.includes("192.168.1.10"), "private IP dropped");
  assert.ok(i.urls.some((u) => u.includes("mal.example.com")), "url refanged");
  assert.ok(i.sha256.length === 1 && i.md5.length === 1, "hashes split by length");
  assert.deepEqual(i.cves, ["CVE-2026-12345"], "CVE upper-cased");
  assert.ok(i.emails.some((e) => e === "admin@evil.com"), "email refanged");
  assert.ok(iocCount(i) >= 6);
  assert.match(iocBlock(i), /Indicators extracted locally/);
});

test("security: modes present and gated by handler", () => {
  assert.ok(SEC_MODES.length >= 5 && isSecMode("triage") && !isSecMode("attack"));
  const h = getTask("security");
  assert.ok(h, "security task registered");
  const built = h!.build({ task: "triage", messages: [{ role: "user", content: "failed login x100 from 8.8.8.8" }], options: { mode: "triage", iocs: "IOCS\n\n" } }, "pro");
  assert.ok("system" in built && /MITRE ATT&CK/.test(built.system), "MITRE in prompt");
  assert.ok("messages" in built && built.messages[0].content.startsWith("IOCS"), "local IOCs prepended");
  assert.ok(/defensive/i.test((built as any).system), "defensive-only guardrail present");
});

/* ── Vault: PII engine ────────────────────────────────────────────────────── */
test("vault: Luhn validates real card numbers only", () => {
  assert.ok(luhn("4111111111111111"), "valid Visa test card");
  assert.ok(!luhn("4111111111111112"), "bad checksum rejected");
});

test("vault: detect, redact with tokens, restore round-trip", () => {
  const text = "Email bob@acme.com, card 4111 1111 1111 1111, IP 203.0.113.9, NIK 3201234567890123.";
  const r = redact(text, "token");
  assert.ok(r.findings.length >= 4, "found the sensitive values");
  assert.ok(!/bob@acme\.com/.test(r.redacted), "email removed");
  assert.ok(!/4111 1111 1111 1111/.test(r.redacted), "card removed");
  assert.match(r.redacted, /\[EMAIL_1\]/, "reversible token used");
  assert.equal(restore(r.redacted, r.map), text, "restore is exact");
});

test("vault: same value reuses one token", () => {
  const r = redact("write to a@x.com and a@x.com again", "token");
  const tokens = (r.redacted.match(/\[EMAIL_\d+\]/g) || []);
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0], tokens[1], "identical value → identical token");
  assert.equal(Object.keys(r.map).length, 1);
});

test("vault: masking styles are one-way; overlaps resolved", () => {
  const full = redact("call +1 415 555 0000", "full");
  assert.match(full.redacted, /•/);
  assert.equal(Object.keys(full.map).length, 0, "full mask keeps no restore map");
  const partial = redact("card 4111111111111111", "partial");
  assert.match(partial.redacted, /••••1111/, "partial keeps last 4");
  // An email must not also be double-counted as a bare domain.
  const d = detect("mail me at jane@example.com");
  assert.equal(d.filter((f) => f.value.includes("example.com")).length, 1, "no overlap double count");
});

test("vault: 20+ data types and a clean summary", () => {
  assert.ok(PII_TYPES.length >= 18, `rich detector set (${PII_TYPES.length})`);
  const s = summarize(detect("a@b.com c@d.com 8.8.8.8"));
  assert.ok(s.find((x) => x.type === "EMAIL")?.count === 2);
});

/* ── Compliance ───────────────────────────────────────────────────────────── */
test("compliance: 7 frameworks + modes; handler requires a valid framework", () => {
  assert.ok(FRAMEWORKS.length === 7 && isFramework("soc2") && !isFramework("nope"));
  assert.ok(COMP_MODES.length >= 4 && isCompMode("gap"));
  assert.ok(getFramework("iso27001")?.full.includes("27001"));
  const h = getTask("compliance");
  assert.ok(h, "compliance task registered");
  const bad = h!.build({ messages: [{ role: "user", content: "help" }], options: {} }, "pro");
  assert.ok("error" in bad, "missing framework rejected");
  const ok = h!.build({ task: "gap", messages: [{ role: "user", content: "assess us" }], options: { framework: "soc2", mode: "gap", org: "SaaS" } }, "pro");
  assert.ok("system" in ok && /SOC 2/.test(ok.system) && /not legal advice/i.test(ok.system));
});

/* ── Clipper ──────────────────────────────────────────────────────────────── */
test("clipper: transcript builder groups words with timestamps", () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, start: i * 1.0, end: i * 1.0 + 0.9 }));
  const t = transcriptForModel(words, 6);
  assert.match(t, /^\[0\.0\] /, "starts with a timestamp");
  assert.ok(t.split("\n").length >= 3, "chunked into multiple lines");
});

test("clipper: parse clips from fenced JSON, clamp to duration, rank by score", () => {
  const out = "```json\n{\"clips\":[{\"title\":\"A\",\"start\":5,\"end\":25,\"score\":80,\"hashtags\":[\"#x\",\"y\"]},{\"title\":\"B\",\"start\":10,\"end\":9999,\"score\":95}]}\n```";
  const clips = parseClips(out, 120);
  assert.equal(clips.length, 2);
  assert.equal(clips[0].title, "B", "highest score first");
  assert.equal(clips[0].end, 120, "clamped to duration");
  assert.deepEqual(clips[1].hashtags, ["x", "y"], "hashtags stripped of #");
});

test("clipper: parse tolerates raw JSON and drops invalid ranges", () => {
  const clips = parseClips('prose {"clips":[{"title":"ok","start":2,"end":8},{"title":"bad","start":9,"end":9}]} trailing');
  assert.equal(clips.length, 1);
  assert.equal(clips[0].title, "ok");
});

test("clipper: SRT/VTT captions built from word timings, offset to clip start", () => {
  const words = [{ word: "hello", start: 10, end: 10.5 }, { word: "world", start: 10.6, end: 11.2 }, { word: "again", start: 30, end: 30.4 }];
  const srt = buildCaptions(words, 10, 12, "srt");
  assert.match(srt, /00:00:00,000 --> /, "first cue offset to clip start");
  assert.match(srt, /hello world/);
  assert.ok(!srt.includes("again"), "words outside the window excluded");
  assert.match(buildCaptions(words, 10, 12, "vtt"), /^WEBVTT/);
});

test("clipper: platforms + handler need a real transcript", () => {
  assert.ok(PLATFORMS.length >= 5 && getPlatform("shorts").aspect === "9:16");
  const h = getTask("clipper");
  assert.ok(h, "clipper task registered");
  const bad = h!.build({ messages: [{ role: "user", content: "hi" }], options: { platform: "tiktok" } }, "starter");
  assert.ok("error" in bad, "too-short transcript rejected");
  const ok = h!.build({ messages: [{ role: "user", content: "[0.0] a fairly long transcript line with real content to analyse for clips" }], options: { platform: "tiktok", count: "5" } }, "starter");
  assert.ok("system" in ok && /ONLY valid JSON/.test(ok.system), "JSON-only instruction present");
});

/* ── Bank transfer unique amount ──────────────────────────────────────────── */
test("billing: pasted transfer amounts parse to rupiah; other queries don't", () => {
  assert.equal(parseIdrQuery("Rp 3.284.517"), 3284517);
  assert.equal(parseIdrQuery("3,284,517.00"), 3284517);
  assert.equal(parseIdrQuery("rp3284517"), 3284517);
  assert.equal(parseIdrQuery("3284517"), 3284517);
  assert.equal(parseIdrQuery("ord_abc123"), null);
  assert.equal(parseIdrQuery("someone@example.com"), null);
  assert.equal(parseIdrQuery("12"), null, "too small to be an amount");
});
