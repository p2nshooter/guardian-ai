/* AXTO — Legal AI v4 tools that run on the device: redline, playbook review,
 * clause library, deadline calculator, citation list, matter search. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { redline, splitClauses, diffWords, redlineMarkdown } from "../lib/legal/redline";
import { review, PLAYBOOKS } from "../lib/legal/playbook";
import { CLAUSES, placeholders, variantById } from "../lib/legal/clauses";
import { compute, holidays, easter, iso, toIcs, sanitizeDeadlines, RULES, daysUntil, deadlinesCsv } from "../lib/legal/deadlines";
import { extractCitations, citationsMarkdown, summary } from "../lib/legal/citations";
import { buildIndex, search, excerptBundle, chunk, tokenize, highlight } from "../lib/legal/retrieve";

test("redline: clauses are matched, changes are word-level and material changes are flagged", () => {
  const a = "1. Term\nThis Agreement lasts 2 years.\n\n2. Liability\nThe Supplier's liability is capped at 12 months of fees.\n\n3. Notices\nNotices must be in writing.";
  const b = "1. Term\nThis Agreement lasts 5 years.\n\n2. Liability\nThe Supplier shall not be liable for any loss.\n\n4. Audit\nThe Customer may audit once a year.";
  const r = redline(a, b);
  assert.equal(r.stats.changed, 2);
  assert.equal(r.stats.added, 1);
  assert.equal(r.stats.removed, 1);
  const term = r.clauses.find((c) => c.a?.heading === "Term")!;
  assert.ok(term.ops.some((o) => o.t === "del" && o.s.includes("2")) && term.ops.some((o) => o.t === "ins" && o.s.includes("5")));
  assert.ok(term.flags.includes("numbers"), "a changed number is material");
  const liab = r.clauses.find((c) => c.a?.heading === "Liability")!;
  assert.ok(liab.flags.includes("risk-topic"));
  assert.ok(r.stats.material >= 2);
  assert.match(redlineMarkdown(r, "v1 → v2"), /Liability/);
  // Indonesian numbering on its own line
  assert.equal(splitClauses("Pasal 1\nDefinisi.\n\nPasal 2\nJangka waktu.").length, 2);
  // the word diff reproduces both sides
  const ops = diffWords("the quick brown fox", "the slow brown dog");
  assert.equal(ops.filter((o) => o.t !== "ins").map((o) => o.s).join(""), "the quick brown fox");
  assert.equal(ops.filter((o) => o.t !== "del").map((o) => o.s).join(""), "the slow brown dog");
});

test("playbook: missing clauses, deviations and red flags are found", () => {
  const nda = PLAYBOOKS.find((p) => p.id === "nda-mutual")!;
  const doc = "1. Confidentiality\nEach party shall keep confidential any information whatsoever received, in perpetuity.\n\n2. Term\nThis Agreement shall remain in force for a period of 10 years.\n\n3. Governing law\nThis Agreement is governed by the laws of New York.";
  const { findings } = review(doc, nda);
  const f = (id: string) => findings.find((x) => x.clause === id)!;
  assert.equal(f("confidentiality").status, "deviation", "red-flag wording");
  assert.equal(f("term").status, "deviation");
  assert.match(f("term").detail, /10 years exceeds 5/);
  assert.equal(f("ip").status, "missing");
  assert.equal(f("governing-law").status, "deviation");
  assert.equal(findings[0].status, "missing", "missing clauses come first");
});

test("clause library: 24 clause types, unique variant ids, placeholders listed", () => {
  assert.ok(CLAUSES.length >= 24);
  const ids = CLAUSES.flatMap((c) => c.variants.map((v) => v.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(placeholders("Pay within [30] days to [Bank] or [30]."), ["30", "Bank"]);
  assert.equal(variantById("liability-bal")?.clause.id, "liability");
});

test("deadlines: holidays, business days, month ends, rolling and hours", () => {
  assert.equal(iso(easter(2026)), "2026-04-05");
  assert.equal(iso(easter(2027)), "2027-03-28");
  const id26 = holidays("ID", 2026);
  assert.equal(id26.get("2026-08-17"), "Hari Kemerdekaan RI");
  assert.ok(id26.has("2026-04-03"), "Good Friday");
  assert.ok(id26.has("2026-05-14"), "Ascension = Easter + 39");
  const us26 = holidays("US", 2026);
  assert.ok(us26.has("2026-07-03"), "4 July 2026 is a Saturday → observed Friday");
  assert.ok(us26.has("2026-11-26"), "Thanksgiving");
  const gb27 = holidays("GB", 2027);
  assert.ok(gb27.has("2027-12-27") && gb27.has("2027-12-28"), "Christmas Sat + Boxing Sun → Mon 27 + Tue 28");

  // 14 days after Mon 3 Aug 2026 = Mon 17 Aug (Independence Day) → rolls to Tue 18 Aug
  const r = compute({ trigger: "2026-08-03", amount: 14, unit: "days", roll: "following", country: "ID" });
  assert.ok(!("error" in r));
  if ("error" in r) return;
  assert.equal(r.unrolled, "2026-08-17");
  assert.equal(r.due, "2026-08-18");
  assert.equal(r.reason, "Hari Kemerdekaan RI");
  // business days skip weekends and holidays: 5 business days after Thu 13 Aug 2026 → Fri 14, Tue 18, Wed 19, Thu 20, Fri 21
  const b = compute({ trigger: "2026-08-13", amount: 5, unit: "business", country: "ID" });
  assert.equal("error" in b ? "" : b.due, "2026-08-21");
  // month-end clamp and leap years
  const m = compute({ trigger: "2028-01-31", amount: 1, unit: "months", roll: "none", country: "none" });
  assert.equal("error" in m ? "" : m.due, "2028-02-29");
  // preceding / modified following
  const p = compute({ trigger: "2026-10-24", amount: 7, unit: "days", roll: "preceding", country: "none" }); // Sat 31 Oct → Fri 30
  assert.equal("error" in p ? "" : p.due, "2026-10-30");
  const mf = compute({ trigger: "2026-10-24", amount: 7, unit: "days", roll: "modified", country: "none" });
  assert.equal("error" in mf ? "" : mf.due, "2026-10-30", "following would cross into November");
  // custom (decreed) holiday
  const c = compute({ trigger: "2026-03-13", amount: 7, unit: "days", roll: "following", country: "ID", custom: { "2026-03-20": "Idul Fitri" } });
  assert.equal("error" in c ? "" : c.due, "2026-03-23");
  // hours never roll
  const h = compute({ trigger: "2026-05-01T09:30", amount: 72, unit: "hours", country: "ID" });
  assert.equal("error" in h ? "" : h.due, "2026-05-04T09:30");
  // before
  const bf = compute({ trigger: "2026-12-10", amount: 30, unit: "days", direction: "before", roll: "none", country: "none" });
  assert.equal("error" in bf ? "" : bf.due, "2026-11-10");
  assert.ok("error" in compute({ trigger: "2026-02-30", amount: 1, unit: "days", country: "none" }));
  assert.equal(daysUntil("2026-10-10", "2026-10-01"), 9);
  assert.ok(RULES.every((x) => x.source && x.amount > 0));
});

test("deadlines: saved lists are validated; .ics is RFC 5545 with reminders", () => {
  const list = sanitizeDeadlines([
    { id: "dl_one", title: "Banding, perkara 12/Pdt.G/2026", trigger: "2026-08-03", due: "2026-08-18", amount: 14, unit: "days", roll: "following", country: "ID", remind: [7, 1, 1, 999] },
    { title: "bad date", trigger: "x", due: "2026-01-01" },
    "junk",
  ]);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].remind, [7, 1]);
  const ics = toIcs(list, "Matter A", new Date("2026-09-30T00:00:00Z"));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260818\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20260819\r\n/);
  assert.match(ics, /SUMMARY:⚖️ Banding\\, perkara 12\/Pdt.G\/2026/);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 2);
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75), "folded at 75 octets");
  assert.match(deadlinesCsv(list), /^Title,Due/);
});

test("citations: statutes, regulations and cases across jurisdictions, with source links", () => {
  const text = `Berdasarkan Pasal 1365 KUHPerdata dan Undang-Undang Nomor 27 Tahun 2022, serta Putusan Mahkamah Agung Nomor 1234 K/Pdt/2020.
  PP No. 71 Tahun 2019 juga relevan. Lihat Putusan MK Nomor 91/PUU-XVIII/2020.
  In Donoghue v Stevenson [1932] AC 562 and Caparo [1990] UKHL 2; see s 172 of the Companies Act 2006.
  Brown v. Board of Education, 347 U.S. 483 (1954); 42 U.S.C. § 1983; Fed. R. Civ. P. 12(b)(6); 21 C.F.R. § 101.9.
  Regulation (EU) 2016/679, Art. 33 GDPR, Case C-311/18. [2020] SGCA 12. Again: 347 U.S. 483 (1954).`;
  const list = extractCitations(text);
  const has = (re: RegExp) => list.find((c) => re.test(c.text));
  assert.ok(has(/^Pasal 1365 KUHPerdata$/)?.jurisdiction === "ID");
  assert.ok(has(/Undang-Undang Nomor 27 Tahun 2022/));
  assert.ok(has(/1234 K\/Pdt\/2020/)?.kind === "case");
  assert.ok(has(/PP No\. 71 Tahun 2019/)?.kind === "regulation");
  assert.ok(has(/91\/PUU-XVIII\/2020/));
  assert.ok(has(/\[1932\] AC 562/)?.jurisdiction === "GB");
  assert.ok(has(/\[1990\] UKHL 2/));
  assert.ok(has(/Companies Act 2006/));
  const brown = has(/347 U\.S\. 483/)!;
  assert.equal(brown.count, 2, "repeats are grouped");
  assert.ok(brown.links.some((l) => l.url.startsWith("https://www.courtlistener.com/")));
  const usc = has(/42 U\.S\.C\. § 1983/)!;
  assert.equal(usc.links[0].url, "https://www.law.cornell.edu/uscode/text/42/1983");
  assert.ok(has(/Fed\. R\. Civ\. P\. 12\(b\)\(6\)/)!.links.some((l) => l.url.endsWith("/rules/frcp/rule_12")));
  assert.ok(has(/21 C\.F\.R\. § 101\.9/));
  assert.ok(has(/Regulation \(EU\) 2016\/679/)?.jurisdiction === "EU");
  assert.ok(has(/Art\. 33 GDPR/));
  assert.ok(has(/C-311\/18/)!.links.some((l) => l.url.includes("curia.europa.eu")));
  assert.ok(has(/\[2020\] SGCA 12/)?.jurisdiction === "SG");
  const checks = { [brown.key]: { status: "verified" as const } };
  assert.equal(summary(list, checks).verified, 1);
  assert.match(citationsMarkdown(list, checks, "Draft"), /\| verified \|/);
});

test("ask the matter: passages ranked across documents, bundle labelled for citing", () => {
  const docs = [
    { name: "Contract.pdf", text: "Clause 1. The term is two years.\n\nClause 9. The Supplier's liability is capped at twelve months of fees paid.\n\nClause 12. Governing law: Singapore." },
    { name: "Email thread.txt", text: "We never agreed to a liability cap. The cap was removed in the last draft, according to the email of 3 May." },
    { name: "Invoice.pdf", text: "Invoice 42. Amount due within 30 days." },
  ];
  const ix = buildIndex(docs);
  const hits = search(ix, "liability cap");
  assert.ok(hits.length >= 2);
  assert.deepEqual(new Set(hits.slice(0, 2).map((h) => h.docName)), new Set(["Contract.pdf", "Email thread.txt"]));
  assert.ok(!hits.some((h) => h.docName === "Invoice.pdf"));
  assert.match(excerptBundle(hits), /^\[Doc \d ¶\d+\] /);
  assert.equal(search(ix, "the of and").length, 0, "stop words alone find nothing");
  assert.ok(search(ix, '"governing law"')[0].text.includes("Governing law"));
  // long documents are cut into overlapping passages that cover all of the text
  const long = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} about the matter.`).join(" ");
  const parts = chunk(long);
  assert.ok(parts.length > 3);
  assert.ok(parts.at(-1)!.text.endsWith("Sentence number 199 about the matter."));
  assert.deepEqual(tokenize("Pasal 1365 dan pembayaran tagihan"), ["pasal", "1365", "pembayaran", "tagihan"]);
  assert.deepEqual(highlight("A liability cap.", ["liability"]).filter((p) => p.hit).map((p) => p.s), ["liability"]);
});
