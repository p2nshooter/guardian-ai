// Legal AI primary-law corpus and citation verifier (BLUEPRINT-V4 §32, phase L1):
// canonical keys, versions in R2, and every verification status on real-world
// citation forms (Indonesia, the EU, the US, the UK, Singapore, local regulations).
// The texts below are short excerpts used as fixtures, not the corpus itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeR2, fakeClock } from "../lib/r2/fake";
import { Store } from "../lib/r2/store";
import { LegalCorpus, instrumentId, instrumentKey, levelOf, pinpoint, pinpointChain, normJurisdiction } from "../lib/legal/corpus";
import { euNumber, caseRef } from "../lib/legal/cite-parse";
import { verifyText, verifySummary } from "../lib/legal/verify";

function corpus() {
  const clock = fakeClock();
  return new LegalCorpus(new Store(new FakeR2({ now: clock.now }), { sleep: clock.sleep, now: clock.now }));
}

async function seed(c: LegalCorpus) {
  const bw = await c.upsertInstrument({ jurisdiction: "ID", kind: "code", ref: "kuhperdata", title: "Kitab Undang-Undang Hukum Perdata",
    aliases: ["KUHPerdata", "BW"], language: "id", source_url: "https://peraturan.bpk.go.id/", source_name: "JDIH BPK" });
  await c.putVersion(bw.id, "1848-05-01", [
    { pinpoint: pinpoint("art", 1320), text: "Supaya terjadi persetujuan yang sah, perlu dipenuhi empat syarat: 1. kesepakatan mereka yang mengikatkan dirinya; 2. kecakapan untuk membuat suatu perikatan; 3. suatu pokok persoalan tertentu; 4. suatu sebab yang tidak terlarang." },
    { pinpoint: pinpoint("art", 1338), text: "Semua persetujuan yang dibuat sesuai dengan undang-undang berlaku sebagai undang-undang bagi mereka yang membuatnya." },
  ], { complete: true });

  const pdp = await c.upsertInstrument({ jurisdiction: "ID", kind: "statute", ref: "uu-27-2022", title: "Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi",
    aliases: ["UU PDP"], language: "id", source_url: "https://peraturan.bpk.go.id/", source_name: "JDIH BPK" });
  await c.putVersion(pdp.id, "2022-10-17", [
    { pinpoint: pinpoint("art", 4), text: "(1) Data Pribadi terdiri atas: a. Data Pribadi yang bersifat spesifik; dan b. Data Pribadi yang bersifat umum. (2) Data Pribadi yang bersifat spesifik sebagaimana dimaksud pada ayat (1) huruf a meliputi: a. data dan informasi kesehatan; b. data biometrik;" },
  ], { complete: false });

  await c.upsertInstrument({ jurisdiction: "ID", kind: "case", ref: "mk-91-puu-xviii-2020", title: "Putusan Mahkamah Konstitusi Nomor 91/PUU-XVIII/2020",
    language: "id", source_url: "https://www.mkri.id/", source_name: "Mahkamah Konstitusi" });

  const gdpr = await c.upsertInstrument({ jurisdiction: "EU", kind: "regulation", ref: "reg-2016-679", title: "Regulation (EU) 2016/679 (General Data Protection Regulation)",
    aliases: ["GDPR"], language: "en", source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj", source_name: "EUR-Lex" });
  await c.putVersion(gdpr.id, "2016-05-04", [
    { pinpoint: pinpoint("art", 6), heading: "Lawfulness of processing", text: "1. Processing shall be lawful only if and to the extent that at least one of the following applies: (a) the data subject has given consent to the processing of his or her personal data for one or more specific purposes; (b) processing is necessary for the performance of a contract to which the data subject is party;" },
  ], { complete: true });

  const usc = await c.upsertInstrument({ jurisdiction: "US", kind: "code", ref: "usc-42", title: "United States Code, Title 42",
    language: "en", source_url: "https://uscode.house.gov/", source_name: "Office of the Law Revision Counsel" });
  await c.putVersion(usc.id, "2024-01-01", [
    { pinpoint: pinpoint("sec", 1983), heading: "Civil action for deprivation of rights", text: "Every person who, under color of any statute, ordinance, regulation, custom, or usage, of any State or Territory or the District of Columbia, subjects, or causes to be subjected, any citizen of the United States … shall be liable to the party injured" },
  ], { complete: false });

  const dpa = await c.upsertInstrument({ jurisdiction: "GB", kind: "statute", ref: "ukpga-2018-12", title: "Data Protection Act 2018",
    aliases: ["Data Protection Act 2018"], language: "en", source_url: "https://www.legislation.gov.uk/ukpga/2018/12", source_name: "legislation.gov.uk" });
  await c.putVersion(dpa.id, "2018-05-23", [
    { pinpoint: pinpoint("sec", 7), heading: "Meaning of “public authority” and “public body”", text: "(1) For the purposes of the GDPR, the following (and only the following) are “public authorities” and “public bodies” under the law of the United Kingdom—" },
  ], { complete: false });
}

test("canonical keys: ISO jurisdictions down to districts, ids R2 accepts, levels", () => {
  assert.equal(instrumentKey("id", "statute", "UU 27 2022"), "ID|statute|uu-27-2022");
  assert.equal(normJurisdiction("id-jb.3273"), "ID-JB.3273");
  assert.equal(levelOf("ID-JB.3273"), "local");
  assert.equal(levelOf("US-CA"), "subnational");
  assert.equal(levelOf("ID"), "national");
  assert.equal(levelOf("EU"), "regional");
  assert.equal(levelOf("INT"), "international");
  assert.throws(() => normJurisdiction("Indonesia"));
  const id = instrumentId(instrumentKey("EU", "regulation", "reg-2016/679"));
  assert.doesNotMatch(id, /[/~]/);
  assert.deepEqual(pinpointChain("art:6(1)(a)"), ["art:6(1)(a)", "art:6(1)", "art:6"]);
  assert.equal(euNumber("2016", "679"), "2016-679");
  assert.equal(euNumber("1215", "2012"), "2012-1215");
  assert.equal(caseRef("[2019] UKSC 12"), "2019-uksc-12");
});

test("a version keeps its text, its hash and whether it is complete; bad input is refused", async () => {
  const c = corpus();
  await seed(c);
  const bw = (await c.byAlias("ID", "kuhperdata"))[0];
  assert.equal(bw.current_version, "1848-05-01");
  assert.equal(bw.complete, true);
  assert.equal(bw.versions[0].provisions, 2);
  assert.match(bw.versions[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal((await c.provisionsOf(bw)).map((p) => p.pinpoint).join(","), "art:1320,art:1338");
  await assert.rejects(c.putVersion(bw.id, "1848-05-01", [{ pinpoint: "Pasal 1", text: "x" }], { complete: true }), /invalid pinpoint/);
  await assert.rejects(c.putVersion(bw.id, "1848", [{ pinpoint: "art:1", text: "x" }], { complete: true }), /YYYY-MM-DD/);
  await assert.rejects(c.upsertInstrument({ jurisdiction: "ID", kind: "statute", ref: "uu-1-2000", title: "x", language: "id", source_url: "http://example.org", source_name: "x" }), /https/);
  // Re-importing the same text is idempotent: no second instrument, same provisions.
  await seed(c);
  assert.equal((await c.instruments.listAll("all", "all")).length, 6);
});

test("the verifier reports exactly how far each citation could be checked", async () => {
  const c = corpus();
  await seed(c);
  const text = [
    "Menurut Pasal 1320 KUHPerdata, perjanjian sah bila empat syarat dipenuhi; Pasal 9999 KUHPerdata tidak ada.",
    "Data kesehatan termasuk data spesifik menurut Pasal 4 ayat (2) huruf a UU No. 27 Tahun 2022, dan sanksi di Pasal 99 UU No. 27 Tahun 2022.",
    "Lihat juga UU No. 11 Tahun 2020 dan Putusan MK Nomor 91/PUU-XVIII/2020, serta Perda No. 5/2019.",
    "Consent is a lawful basis under Article 6(1)(a) of the GDPR; Article 120 of the GDPR does not exist.",
    "A claim lies under 42 U.S.C. § 1983. See section 7 of the Data Protection Act 2018 and [2019] UKSC 12, and [2020] SGCA 1.",
  ].join("\n");
  const results = await verifyText(c, text);
  const by = (needle: string) => results.find((r) => r.citation.text.includes(needle));

  assert.equal(by("Pasal 1320")?.status, "verified");
  assert.match(by("Pasal 1320")!.provision!.excerpt, /empat syarat/);
  assert.equal(by("Pasal 9999")?.status, "not_found", "complete instrument, no such article");
  assert.equal(by("Pasal 4 ayat (2)")?.status, "verified", "paragraph and point found inside the article");
  assert.equal(by("Pasal 99 UU")?.status, "instrument_only", "the statute's text is not complete");
  assert.equal(by("11 Tahun 2020")?.status, "unknown_instrument");
  assert.equal(by("91/PUU-XVIII/2020")?.status, "verified");
  assert.equal(by("Perda No")?.status, "needs_region");
  assert.equal(by("Article 6(1)(a)")?.status, "verified");
  assert.equal(by("Article 120")?.status, "not_found");
  assert.equal(by("1983")?.status, "verified");
  assert.equal(by("Data Protection Act 2018")?.status, "verified");
  assert.equal(by("UKSC")?.status, "unknown_instrument", "the UK is covered, this judgment is not");
  assert.equal(by("SGCA")?.status, "not_covered", "no Singapore texts yet");

  const s = verifySummary(results);
  assert.equal(s.not_found, 2);
  assert.ok(results.every((r) => r.status !== "verified" || r.instrument), "verified always names its source");
});

test("coverage is reported as it is, per jurisdiction", async () => {
  const c = corpus();
  await seed(c);
  const cov = await c.coverage();
  const id = cov.find((r) => r.jurisdiction === "ID")!;
  assert.equal(id.instruments, 3);
  assert.equal(id.complete, 1);
  assert.equal(id.provisions, 3);
  assert.deepEqual(cov.map((r) => r.jurisdiction).sort(), ["EU", "GB", "ID", "US"]);
  assert.equal(await c.covers("SG"), false);
});
