/* AXTO — Privacy Vault v4: validators, detection with confidence and context,
 * custom rules, masking styles, key files, the PDF writer and in-place
 * DOCX / XLSX redaction. All of it runs on the member's device. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../lib/vault/validators";
import { detect, redact, restore, createRedactor, compileRule, auditReport, review, findingKey, PRESETS, PII_TYPES, CATEGORIES, reversible } from "../lib/vault/pii";
import { sealMap, openMap } from "../lib/vault/keyfile";
import { imagePdf } from "../lib/vault/pdfwriter";
import { redactOffice, redactXml } from "../lib/vault/office";
import { zipStore } from "../lib/export/docx";
import { unzip } from "../lib/legal/extract";
import { getTask } from "../lib/ai/tasks";
import { DEFAULT_SETTINGS, SAMPLE, aiStyle, applyPreset, auditMarkdown, engineOptions, exposure, fileKind, redactedName, sanitizeSettings } from "../lib/vault/settings";
import "../lib/ai/register";

const types = (s: string, o = {}) => detect(s, undefined, o).map((f) => f.type);

test("validators: checksums accept real numbers and reject near-misses", () => {
  assert.ok(V.card("4111 1111 1111 1111") && !V.card("4111 1111 1111 1112") && !V.card("1111111111111117"));
  assert.ok(V.iban("GB82 WEST 1234 5698 7654 32") && V.iban("DE89370400440532013000") && !V.iban("DE89370400440532013001"));
  assert.ok(V.aadhaar("2345 6789 0124") === V.verhoeff("234567890124"));
  assert.ok(V.nik("3171014505900003"), "Jakarta, female born 05-05-1990");
  assert.ok(!V.nik("9971014505900003"), "no province 99");
  assert.ok(!V.nik("3171013213900003"), "month 13");
  assert.ok(V.ssn("123-45-6789") && !V.ssn("666-45-6789") && !V.ssn("123-00-6789"));
  assert.ok(V.nino("AB 12 34 56 C") && !V.nino("BG123456C"));
  assert.ok(V.nhs("943 476 5919") && !V.nhs("943 476 5918"));
  assert.ok(V.nric("S1234567D") && !V.nric("S1234567A"));
  assert.ok(V.cnId("11010519491231002X") && !V.cnId("110105194912310021"));
  assert.ok(V.cpf("529.982.247-25") && !V.cpf("529.982.247-26") && !V.cpf("111.111.111-11"));
  assert.ok(V.cnpj("11.222.333/0001-81") && !V.cnpj("11.222.333/0001-82"));
  assert.ok(V.dniNie("12345678Z") && V.dniNie("X1234567L") && !V.dniNie("12345678A"));
  assert.ok(V.aba("011000015") && !V.aba("011000016"));
  assert.ok(V.thId("1101700230708") && !V.thId("1101700230705"));
  assert.ok(V.mykad("900101-14-5678") && !V.mykad("901301-14-5678"));
  assert.ok(V.tfn("123456782") && !V.tfn("123456789"));
});

test("detection: 55+ types in 7 categories, secrets included", () => {
  assert.ok(PII_TYPES.length >= 55, `${PII_TYPES.length} types`);
  assert.deepEqual(new Set(PII_TYPES.map((t) => t.category)), new Set(CATEGORIES.filter((c) => c !== "custom")));
  const text = [
    "token ghp_" + "a".repeat(36), "key AKIAIOSFODNN7EXAMPLE", "stripe sk_live_" + "x".repeat(24),
    "db postgres://app:hunter2@db.internal:5432/prod", "password = S3cr3t!pass", "anthropic sk-ant-" + "b".repeat(30),
    "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----",
  ].join("\n");
  const t = types(text);
  for (const id of ["GITHUB_TOKEN", "AWS_KEY", "STRIPE_KEY", "CONN_STRING", "PASSWORD", "AI_KEY", "PRIVATE_KEY"]) assert.ok(t.includes(id), id);
  const pw = detect("password = S3cr3t!pass").find((f) => f.type === "PASSWORD");
  assert.equal(pw?.value, "S3cr3t!pass", "only the secret value, not the label");
});

test("confidence: checksums score high, weak patterns need context", () => {
  const nikOk = detect("3171014505900003")[0];
  assert.equal(nikOk?.type, "NIK");
  assert.ok(nikOk.score >= 0.9, "a structurally valid NIK needs no keyword");
  assert.equal(detect("ref 9971014505900003").filter((f) => f.type === "NIK").length, 0, "an invalid 16-digit run alone is not a NIK");
  assert.equal(detect("NIK 9971014505900003").filter((f) => f.type === "NIK").length, 1, "…but it is with the keyword");
  assert.equal(types("order 12345678").includes("BANK_ACCOUNT"), false);
  assert.equal(types("No. rekening BCA 1234567890").includes("BANK_ACCOUNT"), true);
  assert.equal(types("Passport: A1234567").includes("PASSPORT"), true);
  assert.equal(types("Build A1234567").includes("PASSPORT"), false);
  assert.equal(types("Tanggal lahir 17-08-1985").includes("DOB"), true);
  assert.equal(types("Invoice date 17-08-1985").includes("DOB"), false);
  const low = detect("see https://example.com/x", undefined, { minScore: 0.9 });
  assert.equal(low.length, 0, "the threshold filters low-confidence types");
});

test("people, addresses, phones and network data", () => {
  const t = detect("Nama: Budi Santoso, tinggal di Jl. Merdeka No. 10, HP 0812-3456-7890. Contact Mr John Smith at +1 415 555 0100. MAC 00:1A:2B:3C:4D:5E, host 10.0.0.12, v6 2001:db8::1");
  const got = (ty: string) => t.filter((f) => f.type === ty).map((f) => f.value);
  assert.deepEqual(got("NAME"), ["Budi Santoso", "John Smith"]);
  assert.ok(got("ADDRESS")[0].startsWith("Jl. Merdeka"));
  assert.equal(got("PHONE").length, 2);
  assert.deepEqual(got("MAC"), ["00:1A:2B:3C:4D:5E"], "a MAC is not an IPv6");
  assert.deepEqual(got("IPV4"), ["10.0.0.12"]);
  assert.deepEqual(got("IPV6"), ["2001:db8::1"]);
  assert.equal(types("at 10:30:00 the job ran").includes("IPV6"), false, "times are not IPv6");
});

test("custom rules, deny and allow lists", () => {
  const rules = [{ id: "emp", label: "Employee ID", pattern: "EMP-\\d{5}" }];
  const f = detect("Ticket for EMP-00421 from Project Falcon, cc support@axto.io", undefined, { rules, deny: ["Project Falcon"], allow: ["support@axto.io"] });
  assert.deepEqual(f.map((x) => [x.type, x.value]), [["CUSTOM_emp", "EMP-00421"], ["DENY", "Project Falcon"]]);
  assert.equal(compileRule({ id: "x", label: "x", pattern: "(" }), null, "bad regex is ignored");
  assert.equal(compileRule({ id: "x", label: "x", pattern: "a*" }), null, "an empty-matching pattern is refused");
  const ex = detect("a@b.com c@d.com", undefined, { exclude: new Set(["EMAIL:a@b.com"]) });
  assert.deepEqual(ex.map((x) => x.value), ["c@d.com"], "a single finding can be excluded");
});

test("styles: token, hash and synthetic are reversible; full and partial are one-way", () => {
  const text = "Email jane@corp.com twice: jane@corp.com. Call +62 812 3456 7890. Name: Rina Wijaya.";
  for (const style of ["token", "hash", "synthetic"] as const) {
    const r = redact(text, style);
    assert.ok(!r.redacted.includes("jane@corp.com"), style);
    assert.equal(restore(r.redacted, r.map), text, `${style} restores exactly`);
    assert.ok(reversible(style));
  }
  assert.match(redact(text, "hash").redacted, /\[EMAIL:[0-9a-f]{8}\]/);
  assert.match(redact(text, "synthetic").redacted, /person1@example\.com twice: person1@example\.com/);
  assert.equal(Object.keys(redact(text, "full").map).length, 0);
  assert.match(redact("Name: Rina Wijaya", "partial").redacted, /R••• W•••••/);
  const r = restore("[EMAIL_10] and [EMAIL_1]", { "[EMAIL_1]": "a@x.io", "[EMAIL_10]": "b@x.io" });
  assert.equal(r, "b@x.io and a@x.io", "longest placeholder first");
});

test("one redactor keeps placeholders consistent across texts; audit has counts only", () => {
  const rd = createRedactor("token");
  const a = rd.redact("from a@x.io").redacted, b = rd.redact("to a@x.io and b@x.io").redacted;
  assert.equal(a, "from [EMAIL_1]");
  assert.equal(b, "to [EMAIL_1] and [EMAIL_2]");
  const rep = auditReport([{ source: "a.txt", findings: rd.findings }], { style: "token", minScore: 0.5 });
  assert.equal(rep.total, 3);
  assert.equal(rep.items[0].byType.EMAIL, 3);
  assert.ok(!JSON.stringify(rep).includes("a@x.io"), "no values in the report");
});

test("key file: AES-GCM with a password; wrong password and tampering fail", async () => {
  const map = { "[EMAIL_1]": "jane@corp.com", "[NIK_1]": "3171014505900003" };
  const file = await sealMap(map, "correct horse battery", 1000);
  assert.ok(!file.includes("jane@corp.com"), "nothing readable");
  assert.deepEqual(await openMap(file, "correct horse battery"), map);
  await assert.rejects(openMap(file, "wrong password!"), /Wrong password/);
  const j = JSON.parse(file); j.data = j.data.slice(0, -4) + "AAAA";
  await assert.rejects(openMap(JSON.stringify(j), "correct horse battery"), /Wrong password|changed/);
  await assert.rejects(sealMap(map, "short"), /at least 8/);
});

test("PDF writer: image-only pages with a correct cross-reference table", () => {
  const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = imagePdf([{ jpeg: fake, width: 10, height: 20, pageWidth: 595, pageHeight: 842 }, { jpeg: fake, width: 10, height: 20, pageWidth: 595, pageHeight: 842 }]);
  const s = new TextDecoder("latin1").decode(pdf);
  assert.ok(s.startsWith("%PDF-1.4"));
  assert.match(s, /\/Count 2/);
  assert.ok(!/\/Font|BT\s/.test(s), "no text objects at all");
  const xref = +s.match(/startxref\n(\d+)/)![1];
  assert.ok(s.slice(xref).startsWith("xref"));
  const entries = s.slice(xref).split("\n").slice(3).filter((l) => / n $/.test(l)).map((l) => +l.slice(0, 10));
  entries.forEach((off, i) => assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj`), `object ${i + 1} at its offset`));
});

test("DOCX in place: values split across runs are redacted; metadata wiped; layout parts kept", async () => {
  const doc = `<?xml version="1.0"?><w:document xmlns:w="w"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Contact </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>jane@</w:t></w:r><w:r><w:t>corp.com</w:t></w:r></w:p><w:p><w:r><w:t>No personal data &amp; fine</w:t></w:r></w:p></w:body></w:document>`;
  const core = `<cp:coreProperties><dc:creator>Jane Doe</dc:creator><cp:lastModifiedBy>Jane Doe</cp:lastModifiedBy></cp:coreProperties>`;
  const zip = zipStore([{ name: "[Content_Types].xml", data: "<Types/>" }, { name: "word/document.xml", data: doc }, { name: "docProps/core.xml", data: core }, { name: "word/styles.xml", data: "<styles/>" }]);
  const rd = createRedactor("token");
  const { bytes, changed } = await redactOffice(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer, "docx", (s) => rd.redact(s).redacted);
  assert.equal(changed, 1);
  const files = await unzip(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, () => true);
  const out = new TextDecoder().decode(files.get("word/document.xml"));
  assert.ok(!out.includes("jane@") && !out.includes("corp.com"));
  assert.match(out, /<w:t xml:space="preserve">Contact \[EMAIL_1\]<\/w:t>/);
  assert.match(out, /<w:pStyle w:val="Heading1"\/>/, "paragraph style kept");
  assert.match(out, /No personal data &amp; fine/, "untouched paragraphs are byte-identical");
  assert.match(new TextDecoder().decode(files.get("docProps/core.xml")), /<dc:creator>Redacted<\/dc:creator>/);
  assert.ok(files.has("word/styles.xml") && files.has("[Content_Types].xml"));
});

test("XLSX shared strings: each cell string is redacted, XML stays valid", () => {
  const xml = `<sst><si><t>Budi</t></si><si><r><t>email: </t></r><r><t>budi@x.co.id</t></r></si></sst>`;
  const rd = createRedactor("full");
  const r = redactXml(xml, /<si>[\s\S]*?<\/si>/g, /(<t(?:\s[^>]*)?>)([^<]*)<\/t>/g, (s) => rd.redact(s).redacted);
  assert.equal(r.changed, 1);
  assert.ok(!r.xml.includes("budi@x.co.id"));
  assert.match(r.xml, /<si><t>Budi<\/t><\/si>/);
});

test("Safe AI task keeps placeholders verbatim", () => {
  const h = getTask("vault")!;
  const b = h.build({ messages: [{ role: "user", content: "Summarise: [NAME_1] owes [EMAIL_1] money" }], options: {} }, "starter");
  assert.ok("system" in b && /EXACTLY as written/.test(b.system) && /Never guess/.test(b.system));
  assert.ok("error" in h.build({ messages: [{ role: "user", content: " " }], options: {} }, "starter"));
});

test("review: low-confidence suggestions never overlap findings; apply redacts exactly the reviewed list", () => {
  const text = "Email budi@contoh.co.id. Ref 3171234567890123 and code 123456789012.";
  const { findings, suggestions } = review(text, undefined, { minScore: 0.5 });
  assert.ok(findings.some((f) => f.type === "EMAIL"));
  for (const s of suggestions) {
    assert.ok(s.score < 0.5 && s.score >= 0.25);
    assert.ok(!findings.some((f) => f.start < s.end && s.start < f.end), "suggestion overlaps a finding");
  }
  // The member excludes the email and accepts every suggestion.
  const pick = [...findings.filter((f) => f.type !== "EMAIL"), ...suggestions];
  const r = createRedactor("token");
  const out = r.apply(text, pick);
  assert.ok(out.redacted.includes("budi@contoh.co.id"), "excluded finding stays");
  for (const s of suggestions) assert.ok(!out.redacted.includes(s.value));
  assert.equal(restore(out.redacted, r.map), text);
  // Overlapping picks keep the first, never corrupting the text.
  const a = { ...findings[0] }, b = { ...findings[0], start: findings[0].start + 2, value: findings[0].value.slice(2) };
  assert.equal(createRedactor("token").apply(text, [a, b]).findings.length, 1);
  assert.equal(findingKey(a), `EMAIL:budi@contoh.co.id`);
});

test("presets only name real types; every category is reachable", () => {
  const ids = new Set(PII_TYPES.map((t) => t.id));
  for (const p of PRESETS) {
    assert.ok(p.types.length > 3, p.id);
    for (const t of p.types) assert.ok(ids.has(t), `${p.id}: ${t}`);
  }
  const pdp = new Set(PRESETS.find((p) => p.id === "pdp")!.types);
  assert.ok(pdp.has("NIK") && pdp.has("NPWP") && !pdp.has("SSN"));
  assert.equal(PRESETS.find((p) => p.id === "all")!.types.length, PII_TYPES.length);
});

test("settings: stored values are sanitised; presets and engine options line up", () => {
  const s = sanitizeSettings({ style: "evil", minScore: 7, preset: "x", disabled: ["EMAIL", "NOPE", 3], rules: [{ id: "a!", label: "Emp", pattern: "EMP-\\d{5}", flags: "gi" }, { id: "b", pattern: "(" }, { id: "c", pattern: "" }], deny: ["Project Falcon", "", 5], allow: ["info@axto.io"] });
  assert.equal(s.style, "token"); assert.equal(s.minScore, 0.95); assert.equal(s.preset, "custom");
  assert.deepEqual(s.disabled, ["EMAIL"]);
  assert.deepEqual(s.rules, [{ id: "a", label: "Emp", pattern: "EMP-\\d{5}", flags: "" }]);
  assert.deepEqual(s.deny, ["Project Falcon"]);
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
  const pci = applyPreset(DEFAULT_SETTINGS, "pci");
  const { enabled, options } = engineOptions(pci);
  assert.ok(enabled.has("CARD") && !enabled.has("NIK") && !enabled.has("AWS_KEY"));
  assert.equal(options.minScore, 0.5);
  assert.equal(aiStyle("full"), "token"); assert.equal(aiStyle("synthetic"), "synthetic");
});

test("the sample finds every headline type; exposure is critical with secrets", () => {
  const { enabled, options } = engineOptions(DEFAULT_SETTINGS);
  const found = new Set(detect(SAMPLE, enabled, options).map((f) => f.type));
  for (const ty of ["EMAIL", "PHONE", "NIK", "ADDRESS", "CARD", "IBAN", "NAME", "IPV4", "PASSWORD", "AI_KEY", "PASSPORT", "SSN", "DOB", "CVV"]) assert.ok(found.has(ty), `sample: ${ty}`);
  assert.equal(exposure(detect(SAMPLE)), 4);
  assert.equal(exposure([]), 0);
  assert.equal(exposure([{ category: "network" }]), 1);
  assert.equal(exposure(Array(8).fill({ category: "contact" })), 3);
});

test("file kinds, output names and the Markdown audit report", () => {
  assert.equal(fileKind("a.DOCX"), "docx"); assert.equal(fileKind("scan.jpeg"), "image"); assert.equal(fileKind("x.pdf"), "pdf");
  assert.equal(fileKind("notes.env"), "text"); assert.equal(fileKind("a.exe"), null); assert.equal(fileKind("blob", "text/plain"), "text");
  assert.equal(redactedName("report.final.pdf", "pdf"), "report.final-redacted.pdf");
  assert.equal(redactedName("photo.webp", "image", "image/jpeg"), "photo-redacted.jpg");
  const r = auditReport([{ source: "a|b.txt", findings: detect("mail me: a@b.co") }], { style: "token", minScore: 0.5 });
  const md = auditMarkdown(r);
  assert.match(md, /\| a\\\|b\.txt \| 1 \| EMAIL × 1 \|/);
  assert.ok(!md.includes("a@b.co"), "values never appear in the report");
});

test("context keywords match whole words only (no 'conto' inside 'contoh')", () => {
  const bank = new Set(["BANK_ACCOUNT"]);
  assert.equal(detect("Lihat contoh: 1234567890", bank).length, 0);
  assert.equal(detect("No. rekening: 1234567890", bank).length, 1);
  assert.equal(detect("Banking ref 1234567890", bank).length, 1, "variants still count");
  assert.equal(detect("Teknik 3171011203900003", new Set(["NIK"]))[0]?.score, 0.9, "checksum-valid NIK still found, without a context boost from 'teknik'");
});

test("consistent redaction: a value found once is hidden everywhere, also in later texts", () => {
  const r = createRedactor("token");
  const a = r.redact("From: Budi Santoso <budi@contoh.co.id>\nBudi Santoso will call.");
  assert.equal(a.redacted, "From: [NAME_1] <[EMAIL_1]>\n[NAME_1] will call.");
  const b = r.redact("Please reply to Budi Santoso today.");
  assert.equal(b.redacted, "Please reply to [NAME_1] today.", "later text (e.g. a Safe AI follow-up) uses the same key");
  assert.equal(restore(b.redacted, r.map), "Please reply to Budi Santoso today.");
  r.redact("Card CVV: 123");
  assert.equal(r.redact("Meet in room 123.").redacted, "Meet in room 123.", "short / ambiguous values (CVV) are not spread to later texts");
});
