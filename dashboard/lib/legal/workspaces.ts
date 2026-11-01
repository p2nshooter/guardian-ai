/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * LEGAL AI — WORKSPACES. 36 expert workflows in five groups. Each declares the
 * extra inputs its form shows, the method the AI must follow and the exact
 * output structure. Method/output text is used ONLY on the server when the
 * system prompt is assembled (lib/legal/prompt.ts); the browser receives the
 * public fields (name, description, inputs, starters) via publicWorkspaces().
 * ============================================================================ */

export type WsGroup = "research" | "transactions" | "disputes" | "compliance" | "drafting";

export interface WsField {
  id: string;
  label: string;
  labelId: string;
  type: "text" | "textarea" | "select";
  options?: [string, string, string][];   // value, English, Indonesian
  placeholder?: string;
}

export interface Workspace {
  id: string;
  group: WsGroup;
  icon: string;
  core: boolean;                 // included in Starter
  name: string;
  nameId: string;
  desc: string;
  descId: string;
  docs: "none" | "optional" | "recommended" | "required";
  fields: WsField[];
  starters: [string, string][];  // English, Indonesian
  method: string;                // server only
  output: string;                // server only
}

export const GROUPS: { id: WsGroup; name: string; nameId: string }[] = [
  { id: "research", name: "Research & analysis", nameId: "Riset & analisis" },
  { id: "transactions", name: "Contracts & transactions", nameId: "Kontrak & transaksi" },
  { id: "disputes", name: "Litigation & disputes", nameId: "Litigasi & sengketa" },
  { id: "compliance", name: "Compliance & risk", nameId: "Kepatuhan & risiko" },
  { id: "drafting", name: "Drafting & communication", nameId: "Drafting & komunikasi" },
];

// Reusable inputs
const ROLE: WsField = { id: "role", label: "You act for", labelId: "Anda mewakili", type: "select", options: [
  ["neutral", "Neutral / objective view", "Netral / objektif"], ["claimant", "Claimant / plaintiff / applicant", "Penggugat / pemohon"],
  ["defendant", "Defendant / respondent", "Tergugat / termohon"], ["prosecution", "Prosecution / investigator", "Penuntut umum / penyidik"],
  ["defence", "Criminal defence", "Penasihat hukum terdakwa"], ["judge", "Judge / arbitrator (draft reasoning)", "Hakim / arbiter (draf pertimbangan)"],
  ["inhouse", "In-house counsel / company", "In-house counsel / perusahaan"], ["regulator", "Regulator / government", "Regulator / pemerintah"],
  ["individual", "Individual (not a lawyer)", "Perorangan (bukan praktisi hukum)"],
] };
const STAGE: WsField = { id: "stage", label: "Stage / forum", labelId: "Tahap / forum", type: "select", options: [
  ["pre", "Pre-action / advisory", "Pra-perkara / konsultasi"], ["first", "First instance court", "Pengadilan tingkat pertama"],
  ["appeal", "Appeal", "Banding"], ["cassation", "Cassation / supreme court", "Kasasi / Mahkamah Agung"],
  ["review", "Extraordinary review (e.g. PK)", "Peninjauan kembali (PK)"], ["constitutional", "Constitutional court", "Mahkamah Konstitusi"],
  ["administrative", "Administrative court / tribunal", "PTUN / tribunal administrasi"], ["arbitration", "Arbitration", "Arbitrase"],
  ["mediation", "Mediation / negotiation", "Mediasi / negosiasi"], ["investigation", "Criminal investigation", "Penyelidikan / penyidikan"],
] };
const GOAL: WsField = { id: "goal", label: "Desired outcome", labelId: "Hasil yang diinginkan", type: "text", placeholder: "e.g. recover US$250k, dismiss the claim, settle within 60 days" };
const APPETITE: WsField = { id: "appetite", label: "Risk appetite", labelId: "Toleransi risiko", type: "select", options: [
  ["balanced", "Balanced", "Seimbang"], ["conservative", "Conservative (protect my side)", "Konservatif (lindungi pihak saya)"], ["commercial", "Commercial (close the deal)", "Komersial (utamakan deal jalan)"],
] };

const w = (x: Workspace) => x;

export const WORKSPACES: Workspace[] = [
  // ═══ RESEARCH & ANALYSIS ═══════════════════════════════════════════════════
  w({
    id: "research", group: "research", icon: "🔍", core: true, docs: "optional",
    name: "Legal research memo", nameId: "Memo riset hukum",
    desc: "A partner-grade research memo: the rule, its sources, how courts apply it, and what it means for your facts.",
    descId: "Memo riset setingkat partner: aturannya, sumbernya, cara pengadilan menerapkannya, dan artinya bagi fakta Anda.",
    fields: [{ id: "question", label: "Research question (optional, if not in your request)", labelId: "Pertanyaan riset (opsional)", type: "text" }],
    starters: [
      ["Can an employer terminate an employee for repeated lateness, and what severance is due?", "Bolehkah perusahaan mem-PHK karyawan yang sering terlambat, dan berapa pesangonnya?"],
      ["What are the requirements for a valid electronic signature and is it admissible as evidence?", "Apa syarat sah tanda tangan elektronik dan apakah dapat menjadi alat bukti?"],
      ["Is a non-compete clause enforceable after employment ends?", "Apakah klausul non-kompetisi berlaku setelah hubungan kerja berakhir?"],
    ],
    method: `1. Restate the question precisely; list assumptions and any facts you need but do not have.
2. Identify every applicable layer of law in the selected legal order, top-down (constitution → statutes → regulations → regional/local rules → binding case law → soft law/guidance), plus treaties or supranational law where relevant.
3. For each rule: quote or closely paraphrase the operative words, give the pinpoint citation (article/section/paragraph), status (in force / amended / repealed / pending), effective date and the date you are reasoning "as of".
4. Explain how courts or regulators actually apply it: leading decisions (binding vs persuasive), tests, burdens of proof, typical outcomes. Never invent a case name, number or quotation — if you cannot identify a real authority, say so and describe the principle instead.
5. Apply the law to the user's facts element by element; separate settled points from open or arguable ones.
6. Note conflicts between sources and how they are resolved (lex superior, lex specialis, lex posterior; federal/state or national/regional competence).
7. Conclude with a clear answer, confidence level and the exact items to verify before relying on the memo.`,
    output: `# Research memo — {short title}
**Question presented** · **Short answer** (3–5 lines, with confidence: High / Medium / Low)
## 1. Facts and assumptions
## 2. Applicable law (table: Level | Instrument & pinpoint | Status & effective date | What it says)
## 3. Case law and practice (binding vs persuasive; tests applied)
## 4. Analysis (issue by issue, element by element)
## 5. Counter-arguments and uncertainties
## 6. Conclusion and recommendations
## 7. Sources and verification checklist`,
  }),
  w({
    id: "case-builder", group: "research", icon: "🧩", core: true, docs: "recommended",
    name: "Case builder — restructure a case file", nameId: "Case builder — susun ulang perkara",
    desc: "Upload the case documents: get parties, chronology, legal issues, applicable law from the constitution down, element-by-element analysis, evidence gaps and strategy — against current law.",
    descId: "Unggah dokumen perkara: dapatkan para pihak, kronologi, pokok masalah, dasar hukum dari konstitusi sampai peraturan daerah, analisis per unsur, kekurangan bukti dan strategi — berdasarkan hukum terbaru.",
    fields: [ROLE, STAGE, GOAL, { id: "facts_date", label: "When did the key events happen?", labelId: "Kapan peristiwa utama terjadi?", type: "text", placeholder: "e.g. March 2024 – January 2025" }],
    starters: [
      ["Restructure this case file and tell me our strongest and weakest points.", "Susun ulang berkas perkara ini dan jelaskan poin terkuat dan terlemah kami."],
      ["Rebuild the case under the current law and flag what changed since the events.", "Susun ulang perkara berdasarkan hukum yang berlaku sekarang dan tandai apa yang berubah sejak peristiwa terjadi."],
      ["Prepare a litigation-ready case summary for the partner meeting.", "Siapkan ringkasan perkara siap litigasi untuk rapat dengan partner."],
    ],
    method: `You are rebuilding a case file into a litigation-ready structure.
1. Read every document. Build an index: [DOC-n] title, type (contract, letter, pleading, judgment, evidence, statement…), date, author, relevance. Note unreadable or missing pages.
2. Extract the parties and their roles, representatives and relationships.
3. Build a verified chronology from the documents only: each event with date, actor, what happened, source pinpoint ([DOC-n p.x]) and whether it is disputed. Flag inconsistencies between documents.
4. Frame the legal issues as precise questions (jurisdiction/admissibility first, then merits, then remedies).
5. Determine the applicable law for EACH issue across the full hierarchy for the selected legal order — constitution, statutes/codes, implementing regulations, regional/local regulations, binding case law — and check temporal application: the law in force when the events happened versus now, transitional provisions, and for criminal matters the more-favourable-law principle. Say explicitly where the current law differs from the law at the time.
6. For each issue, list the legal elements/requirements and map facts and evidence to each element (element → supporting facts → evidence → strength: Strong / Adequate / Weak / Missing).
7. Procedural analysis: competent court or forum, venue, standing, limitation and procedural deadlines (calculate them where dates are known and show the calculation), preconditions (notice, mediation, administrative objection).
8. Build the best arguments for the side the user acts for, then steel-man the other side's best arguments and give rebuttals.
9. Assess risk and likely outcomes with probability bands and the drivers of each; estimate remedies/exposure where possible.
10. Recommend strategy options with pros/cons, the immediate next steps, and the documents/evidence to obtain or draft.`,
    output: `# Case file — {case name}
**Bottom line** (5 lines: posture, strongest point, biggest risk, recommended course, confidence)
## 1. Document index (table: DOC | Title/type | Date | Key content | Reliability)
## 2. Parties and roles
## 3. Chronology (table: Date | Event | Source | Disputed?)
## 4. Legal issues
## 5. Applicable law by issue (table: Level | Instrument & pinpoint | In force at time of events? | Current status | Effect)
## 6. Element-by-element analysis (per issue: Element | Facts | Evidence | Strength)
## 7. Evidence gaps and inconsistencies
## 8. Procedure: forum, standing, deadlines (with calculation), preconditions
## 9. Our arguments / their arguments / rebuttals
## 10. Risk assessment and likely outcomes (table: Scenario | Probability band | Drivers | Exposure)
## 11. Strategy options and recommended next steps (numbered, with owner and deadline)
## 12. Sources and verification checklist`,
  }),
  w({
    id: "multi-jurisdiction", group: "research", icon: "🌍", core: false, docs: "optional",
    name: "Multi-jurisdiction comparison", nameId: "Perbandingan multi-yurisdiksi",
    desc: "Compare how up to 8 countries or states treat the same question — side by side, with a recommended structure.",
    descId: "Bandingkan perlakuan hingga 8 negara atau negara bagian atas pertanyaan yang sama — berdampingan, dengan rekomendasi struktur.",
    fields: [{ id: "compare", label: "Compare with (countries/states, comma separated)", labelId: "Bandingkan dengan (negara/negara bagian, pisahkan koma)", type: "text", placeholder: "e.g. Singapore, Malaysia, Delaware, England" }],
    starters: [
      ["Compare data-breach notification duties across these jurisdictions.", "Bandingkan kewajiban notifikasi kebocoran data di yurisdiksi ini."],
      ["Where is it easiest to incorporate a holding company for Southeast Asia and why?", "Di mana paling mudah mendirikan holding company untuk Asia Tenggara dan mengapa?"],
    ],
    method: `1. Treat the selected legal order as the home jurisdiction and the "compare with" list as the others (max 8).
2. Define the comparison criteria from the question (e.g. requirements, deadlines, sanctions, regulator, cost, time, enforceability) — the same criteria for every jurisdiction.
3. For each jurisdiction give the governing instruments with pinpoint citations and their current status; flag where your knowledge may be outdated.
4. Identify convergences, divergences, gold-plating and conflicts (e.g. extraterritorial reach, data localisation).
5. Recommend the best structure/approach for the user's objective and a harmonised compliance baseline ("comply once, satisfy all").`,
    output: `# Multi-jurisdiction comparison — {topic}
**Summary** and recommended approach
## 1. Comparison table (rows = criteria, columns = jurisdictions)
## 2. Jurisdiction notes (per jurisdiction: instruments, status, practical points)
## 3. Key differences and conflicts
## 4. Recommended structure / harmonised baseline
## 5. Sources and verification checklist`,
  }),
  w({
    id: "statute", group: "research", icon: "📜", core: false, docs: "optional",
    name: "Statute & regulation navigator", nameId: "Penjelas pasal & peraturan",
    desc: "Explain any law article by article: meaning, amendments, implementing rules, court interpretations and practical impact.",
    descId: "Jelaskan undang-undang pasal demi pasal: makna, perubahan, peraturan pelaksana, tafsir pengadilan, dan dampak praktis.",
    fields: [{ id: "instrument", label: "Law / regulation and articles", labelId: "UU / peraturan dan pasal", type: "text", placeholder: "e.g. UU 27/2022 Art. 20–25; GDPR Art. 6; Companies Act 2006 s.172" }],
    starters: [
      ["Explain these articles, their amendments and how courts read them.", "Jelaskan pasal-pasal ini, perubahannya, dan cara pengadilan menafsirkannya."],
      ["Which implementing regulations exist for this law and what do they add?", "Peraturan pelaksana apa saja yang ada untuk UU ini dan apa tambahannya?"],
    ],
    method: `1. Identify the exact instrument (official title, number, year, promulgation and effective dates) and its current consolidated status; list amendments, partial annulments by courts and pending changes.
2. For each article/section requested: operative text (quote or close paraphrase), plain-language meaning, definitions it relies on, cross-references, and the elucidation/explanatory memorandum where one exists.
3. Implementing and delegated regulations, guidance and regulator practice linked to the provision.
4. Judicial interpretation: leading decisions and constitutional-court rulings affecting the provision.
5. Sanctions and enforcement practice.
6. Practical impact and a compliance checklist.`,
    output: `# {Instrument} — article-by-article guide
**Status** (in force? consolidated as of …; amendments; annulled parts)
## Article-by-article (for each: Text · Meaning · Cross-references · Implementing rules · Case law · Practical notes)
## Sanctions and enforcement
## Compliance checklist
## Sources and verification checklist`,
  }),
  w({
    id: "constitutional", group: "research", icon: "🏛️", core: false, docs: "optional",
    name: "Constitutional & judicial review", nameId: "Uji konstitusional & judicial review",
    desc: "Test a law, regulation or government act against the constitution or higher law: standing, grounds, precedent and a draft petition outline.",
    descId: "Uji UU, peraturan, atau tindakan pemerintah terhadap UUD atau peraturan yang lebih tinggi: legal standing, dasar pengujian, preseden, dan kerangka permohonan.",
    fields: [ROLE, { id: "target", label: "Norm or act being challenged", labelId: "Norma atau tindakan yang diuji", type: "text" }],
    starters: [
      ["Can this regulation be challenged for conflicting with the constitution?", "Apakah peraturan ini dapat diuji karena bertentangan dengan UUD?"],
      ["Outline a judicial review petition with standing and constitutional grounds.", "Buat kerangka permohonan pengujian dengan legal standing dan batu uji konstitusional."],
    ],
    method: `1. Identify the norm challenged and the correct review route and forum (constitutional court, supreme court review of regulations, administrative court, or ordinary courts in diffuse-review systems).
2. Standing: who may apply, the constitutional loss/injury test, and how the applicant meets it.
3. Grounds: formal (procedure, competence) and material (content) review; the constitutional provisions or higher norms used as the benchmark; applicable tests (proportionality, legitimate aim, legal certainty, equality, non-retroactivity).
4. Precedent: prior decisions on the same or similar norms (including ne bis in idem / res judicata limits on re-testing), with the doctrines they established.
5. Remedies available (annulment, conditional constitutionality, interpretation, suspension) and effects in time.
6. Outline the petition and the evidence/experts needed.`,
    output: `# Constitutional / judicial review assessment — {norm}
**Prospects** (with confidence)
## 1. Review route and forum
## 2. Standing analysis
## 3. Benchmark norms and tests
## 4. Formal review
## 5. Material review (argument by argument)
## 6. Precedent and re-testing limits
## 7. Remedies and temporal effects
## 8. Petition outline and evidence plan
## 9. Sources and verification checklist`,
  }),
  w({
    id: "judgment", group: "research", icon: "⚖️", core: false, docs: "recommended",
    name: "Judgment analyzer", nameId: "Analisis putusan",
    desc: "Upload a judgment or award: holding, ratio decidendi, obiter, reasoning map, precedent value and grounds for appeal.",
    descId: "Unggah putusan atau putusan arbitrase: amar, ratio decidendi, obiter, peta pertimbangan, nilai preseden, dan dasar upaya hukum.",
    fields: [ROLE],
    starters: [
      ["Analyse this judgment and list grounds for appeal.", "Analisis putusan ini dan daftarkan alasan banding/kasasi."],
      ["Summarise the ratio and how it affects our pending case.", "Ringkas ratio decidendi-nya dan pengaruhnya pada perkara kami yang sedang berjalan."],
    ],
    method: `1. Identify court, case number, date, panel, parties, procedural history and the decision (operative part / amar / dispositif).
2. Extract the issues decided, the holding on each, the ratio decidendi and obiter dicta; map the reasoning (facts found → law applied → conclusion) with pinpoints to the document.
3. Evaluate the reasoning: errors of law, misapplication, failure to consider evidence or arguments, procedural irregularities, excess of jurisdiction, inadequate reasons.
4. Precedent value in the hierarchy; consistency with other decisions; whether later law or decisions have overtaken it.
5. Grounds and deadlines for the available challenge routes; enforcement and stay issues.`,
    output: `# Judgment analysis — {court, case no., date}
**Result and significance** (5 lines)
## 1. Case details and procedural history
## 2. Issues and holdings
## 3. Ratio decidendi / obiter
## 4. Reasoning map
## 5. Weaknesses and grounds of challenge (table: Ground | Pinpoint | Strength)
## 6. Precedent value and later developments
## 7. Challenge routes, deadlines, enforcement
## 8. Sources and verification checklist`,
  }),
  w({
    id: "regulatory-radar", group: "research", icon: "📡", core: false, docs: "optional",
    name: "Regulatory radar & impact", nameId: "Radar regulasi & dampak",
    desc: "What changed, what is coming and what it means for your business — with an action plan and deadlines.",
    descId: "Apa yang berubah, apa yang akan datang, dan artinya bagi bisnis Anda — lengkap dengan rencana aksi dan tenggat.",
    fields: [{ id: "business", label: "Your business / sector", labelId: "Bisnis / sektor Anda", type: "text", placeholder: "e.g. digital lending platform, 200 staff" }, { id: "horizon", label: "Time horizon", labelId: "Rentang waktu", type: "select", options: [["12", "Last & next 12 months", "12 bulan terakhir & ke depan"], ["24", "Last & next 24 months", "24 bulan terakhir & ke depan"], ["6", "Last & next 6 months", "6 bulan terakhir & ke depan"]] }],
    starters: [
      ["What regulatory changes affect my sector and what must we do?", "Perubahan regulasi apa yang memengaruhi sektor saya dan apa yang harus kami lakukan?"],
      ["Build a compliance calendar of upcoming deadlines.", "Buat kalender kepatuhan untuk tenggat yang akan datang."],
    ],
    method: `1. Map the regulators and legal instruments relevant to the business and sector in the selected legal order (and EU/international layers that apply).
2. List recent changes and upcoming changes within the horizon: instrument, status (enacted / in force / transitional / draft / consultation), key dates. With live research, search official gazettes and regulator sites and cite them; without it, state the as-of limit of your knowledge.
3. Assess impact on the business (operations, licences, contracts, products, data, reporting, cost) with a HIGH/MEDIUM/LOW rating.
4. Produce an action plan and a dated compliance calendar.`,
    output: `# Regulatory radar — {sector}, as of {date}
**Top 5 changes that matter**
## 1. Regulator map
## 2. Changes (table: Instrument | Status | Key dates | What changes | Impact rating)
## 3. Impact analysis by business function
## 4. Action plan (table: Action | Owner | Deadline | Priority)
## 5. Compliance calendar
## 6. Sources and verification checklist`,
  }),
  w({
    id: "citation-check", group: "research", icon: "✅", core: false, docs: "recommended",
    name: "Citation & authority checker", nameId: "Pemeriksa sitasi & dasar hukum",
    desc: "Check every citation in a brief, memo or AI answer: format, existence, current status and whether it supports the proposition.",
    descId: "Periksa setiap sitasi dalam memo, gugatan, atau jawaban AI: format, keberadaan, status berlaku, dan apakah mendukung dalilnya.",
    fields: [],
    starters: [
      ["Check all citations in this document and flag anything doubtful.", "Periksa semua sitasi dalam dokumen ini dan tandai yang meragukan."],
      ["Verify these statutes are still in force and correctly numbered.", "Pastikan peraturan-peraturan ini masih berlaku dan nomornya benar."],
    ],
    method: `1. Extract every citation (statutes, articles, regulations, cases, treaties, secondary sources) with its location in the document and the proposition it is used for.
2. For each: (a) format against the selected citation style; (b) existence — can you identify it with confidence? (c) currency — in force, amended, repealed, overruled, annulled; (d) support — does it actually support the proposition as used?
3. Never "confirm" something you cannot verify: mark it UNVERIFIED and explain what to check. With live research, verify against official sources and cite them.
4. Suggest corrected citations or better authorities.`,
    output: `# Citation check — {document}
**Summary** (counts: verified / needs correction / unverified / problematic)
## Citation table (Location | Citation as written | Correct form | Exists? | Current status | Supports proposition? | Action)
## Problems in detail
## Suggested additional authorities
## Verification checklist`,
  }),

  // ═══ CONTRACTS & TRANSACTIONS ══════════════════════════════════════════════
  w({
    id: "contract-review", group: "transactions", icon: "📄", core: true, docs: "required",
    name: "Contract review & redline", nameId: "Review & redline kontrak",
    desc: "Clause-by-clause review for your side: risks, missing protections, enforceability under local law and suggested redlines.",
    descId: "Review pasal demi pasal untuk pihak Anda: risiko, perlindungan yang hilang, keberlakuan menurut hukum setempat, dan usulan redline.",
    fields: [
      { id: "side", label: "Your side in the contract", labelId: "Posisi Anda dalam kontrak", type: "text", placeholder: "e.g. the supplier / the tenant / the buyer" },
      APPETITE,
      { id: "playbook", label: "Your playbook / must-haves (optional)", labelId: "Playbook / syarat wajib Anda (opsional)", type: "textarea", placeholder: "e.g. liability cap = 12 months fees; governing law Indonesia; 30-day payment" },
    ],
    starters: [
      ["Review this contract for my side and propose redlines.", "Review kontrak ini untuk pihak saya dan usulkan redline."],
      ["What are the top 10 risks in this agreement and how do I fix them?", "Apa 10 risiko teratas dalam perjanjian ini dan bagaimana memperbaikinya?"],
      ["Check this contract against my playbook.", "Periksa kontrak ini terhadap playbook saya."],
    ],
    method: `1. Identify contract type, parties, governing law and dispute resolution clause, term, and the commercial deal in two sentences. If governing law differs from the selected legal order, analyse both and note mandatory local rules that apply regardless (e.g. language requirements, consumer/employment protections, foreign-exchange, licensing, stamp duty, notarisation or registration).
2. Validity and enforceability: formation requirements, capacity/authority, form, language, prohibited terms, standard-clause rules.
3. Review EVERY clause from the perspective of the side the user acts for: what it does, risk rating (LOW/MEDIUM/HIGH/CRITICAL), why, and a concrete redline (exact replacement wording).
4. Check key protections explicitly: scope & deliverables, price & payment, acceptance, warranties, indemnities, limitation/exclusion of liability, IP, confidentiality, data protection, termination & consequences, force majeure/hardship, assignment/change of control, non-compete/non-solicit, audit, insurance, dispute resolution & governing law, notices, entire agreement, anti-bribery/sanctions.
5. List missing clauses that the user needs, with draft wording.
6. Compare against the user's playbook when given: compliant / deviation / missing.
7. Negotiation priorities: must-have, nice-to-have, can concede.`,
    output: `# Contract review — {contract type}, for {side}
**Verdict** (sign / sign with changes / do not sign) · **Top risks** (5 bullets)
## 1. Contract snapshot (table: Item | Detail)
## 2. Enforceability and mandatory local law
## 3. Clause-by-clause review (table: Clause | What it says | Risk | Why | Redline)
## 4. Missing clauses (with draft wording)
## 5. Playbook compliance (if provided)
## 6. Negotiation priorities
## 7. Sources and verification checklist`,
  }),
  w({
    id: "contract-draft", group: "transactions", icon: "✍️", core: false, docs: "optional",
    name: "Contract drafting", nameId: "Penyusunan kontrak",
    desc: "Draft a complete, locally enforceable contract from a term sheet or description — with drafting notes and alternatives.",
    descId: "Susun kontrak lengkap yang berlaku secara lokal dari term sheet atau deskripsi — dengan catatan drafting dan alternatif klausul.",
    fields: [
      { id: "type", label: "Contract type", labelId: "Jenis kontrak", type: "text", placeholder: "e.g. SaaS agreement, share purchase, distribution, employment, NDA, lease" },
      { id: "side", label: "Drafted in favour of", labelId: "Disusun untuk kepentingan", type: "text" },
      APPETITE,
      { id: "bilingual", label: "Bilingual version", labelId: "Versi dua bahasa", type: "select", options: [["no", "No", "Tidak"], ["en-id", "English + Indonesian (two columns)", "Inggris + Indonesia (dua kolom)"], ["en-local", "English + local official language", "Inggris + bahasa resmi setempat"]] },
    ],
    starters: [
      ["Draft a mutual NDA governed by local law.", "Susun NDA timbal balik yang tunduk pada hukum setempat."],
      ["Draft a software development agreement from these terms.", "Susun perjanjian pengembangan software dari ketentuan ini."],
    ],
    method: `1. Confirm the deal parameters from the request and documents; list any assumption you make and mark each with [ASSUMPTION].
2. Apply the formal requirements of the selected legal order (language requirements for contracts with local parties, notarial deed or registration where required, stamp duty, signing authority, required licences, foreign-ownership limits).
3. Draft the full contract with numbered clauses, defined terms, and schedules; balanced toward the side named, calibrated to the risk appetite.
4. Include boilerplate that works locally (governing law, dispute resolution with a valid arbitration clause or court choice, notices, counterparts and e-signature validity, severability, language precedence for bilingual versions).
5. After the contract, add drafting notes: key choices, alternatives the other side may request, and what to verify locally.`,
    output: `# {Contract title}
(Full contract: parties, recitals, definitions, operative clauses, signature blocks, schedules — bracket every variable like [●])
---
## Drafting notes
## Alternative clauses (for negotiation)
## Execution checklist (formalities, stamps, approvals, registrations)
## Verification checklist`,
  }),
  w({
    id: "negotiation", group: "transactions", icon: "🤝", core: false, docs: "optional",
    name: "Negotiation strategy & playbook", nameId: "Strategi & playbook negosiasi",
    desc: "Positions, BATNA, concessions ladder and word-for-word responses to the other side's asks.",
    descId: "Posisi, BATNA, tangga konsesi, dan jawaban kata demi kata atas permintaan pihak lawan.",
    fields: [{ id: "side", label: "Your side", labelId: "Pihak Anda", type: "text" }, GOAL],
    starters: [
      ["Prepare my negotiation playbook for these contract terms.", "Siapkan playbook negosiasi saya untuk ketentuan kontrak ini."],
      ["How should I respond to their markup?", "Bagaimana saya menanggapi markup dari pihak lawan?"],
    ],
    method: `1. Identify both sides' interests, leverage, BATNA/WATNA and deadlines.
2. For each open issue: our ideal, target, walk-away; their likely position; legal constraints (mandatory law) that limit what can be agreed.
3. Build a concessions ladder with trade-offs (give X for Y) and packaging strategy.
4. Draft scripts: opening statement, responses to expected pushback, and fallback wording for the contract.
5. Flag red lines that are legal requirements, not just preferences.`,
    output: `# Negotiation playbook — {deal}
## 1. Situation and leverage (BATNA/WATNA)
## 2. Issue table (Issue | Ideal | Target | Walk-away | Their likely position | Legal constraints)
## 3. Concessions ladder and trade-offs
## 4. Scripts and fallback clause wording
## 5. Red lines
## 6. Verification checklist`,
  }),
  w({
    id: "due-diligence", group: "transactions", icon: "🔎", core: false, docs: "required",
    name: "Due diligence", nameId: "Uji tuntas (due diligence)",
    desc: "Review a data room: corporate, contracts, licences, employment, IP, disputes, tax and compliance — with a red-flag report and CP list.",
    descId: "Review data room: korporasi, kontrak, perizinan, ketenagakerjaan, HKI, sengketa, pajak, dan kepatuhan — dengan laporan red flag dan daftar CP.",
    fields: [{ id: "deal", label: "Transaction", labelId: "Transaksi", type: "text", placeholder: "e.g. acquisition of 70% of PT X by a foreign investor" }, { id: "materiality", label: "Materiality threshold", labelId: "Ambang materialitas", type: "text", placeholder: "e.g. contracts above US$50k" }],
    starters: [
      ["Produce a red-flag due diligence report from these documents.", "Buat laporan due diligence red flag dari dokumen-dokumen ini."],
      ["List conditions precedent and specific indemnities we need.", "Daftarkan conditions precedent dan indemnitas khusus yang kami butuhkan."],
    ],
    method: `1. Index the documents by workstream: corporate & ownership, material contracts (change-of-control, exclusivity, termination), licences & permits, real estate, employment, IP & IT, data protection, litigation & investigations, tax, regulatory & sector rules, anti-corruption/sanctions, environment, finance & security interests.
2. For each workstream: findings with document pinpoints, legal consequence under the selected legal order (including foreign-ownership limits and required approvals), severity (RED / AMBER / GREEN) and remedy (CP, specific indemnity, price adjustment, covenant, W&I exclusion, walk away).
3. List missing documents and information requests.
4. Produce transaction recommendations: CPs, warranties, indemnities, pre-closing and post-closing actions.`,
    output: `# Due diligence report — {transaction}
**Executive summary** and deal-breakers
## 1. Scope, documents reviewed, limitations
## 2. Red-flag table (Workstream | Finding | Source | Severity | Legal consequence | Recommended remedy)
## 3. Findings by workstream
## 4. Missing documents / information requests
## 5. CPs, warranties, indemnities, covenants
## 6. Verification checklist`,
  }),
  w({
    id: "corporate-secretarial", group: "transactions", icon: "🏢", core: false, docs: "optional",
    name: "Corporate & secretarial", nameId: "Korporasi & kesekretariatan",
    desc: "Board and shareholder resolutions, minutes, articles amendments, filings and approval matrices that meet local formalities.",
    descId: "Keputusan direksi & RUPS, notulen, perubahan anggaran dasar, pelaporan, dan matriks persetujuan sesuai formalitas setempat.",
    fields: [{ id: "entity", label: "Entity type", labelId: "Jenis badan", type: "text", placeholder: "e.g. PT PMA, LLC, private limited company" }],
    starters: [
      ["Draft a circular shareholders' resolution to appoint a new director.", "Susun keputusan sirkuler pemegang saham untuk mengangkat direktur baru."],
      ["What approvals and filings are needed to issue new shares?", "Persetujuan dan pelaporan apa yang dibutuhkan untuk menerbitkan saham baru?"],
    ],
    method: `1. Identify the corporate action, the entity type and the governing company law and articles.
2. Determine the approving organs, quorum and majority, notice periods, circular-resolution rules, notarial deed or filing requirements, regulator approvals and deadlines.
3. Draft the required documents with all formal elements.
4. Provide a step-by-step execution and filing checklist with timelines.`,
    output: `# {Corporate action}
## 1. Legal requirements (table: Step | Organ | Quorum/majority | Formality | Deadline | Legal basis)
## 2. Draft documents
## 3. Execution and filing checklist
## 4. Verification checklist`,
  }),
  w({
    id: "doc-compare", group: "transactions", icon: "🆚", core: false, docs: "required",
    name: "Document comparison", nameId: "Perbandingan dokumen",
    desc: "Compare two versions of a contract or law: every change, who it favours and the legal effect.",
    descId: "Bandingkan dua versi kontrak atau peraturan: setiap perubahan, siapa yang diuntungkan, dan akibat hukumnya.",
    fields: [{ id: "side", label: "Your side (optional)", labelId: "Pihak Anda (opsional)", type: "text" }],
    starters: [
      ["Compare these two versions and explain each change.", "Bandingkan dua versi ini dan jelaskan setiap perubahan."],
      ["What did the new law change compared with the old one?", "Apa yang diubah UU baru dibandingkan UU lama?"],
    ],
    method: `1. Treat [DOC-1] as the original and [DOC-2] as the revised version unless the user says otherwise.
2. Align provisions (even when renumbered) and list every substantive change: added, deleted, modified; ignore pure formatting.
3. For each change: before/after text, who it favours, legal and commercial effect, risk rating and recommended response (accept / reject / counter with wording).`,
    output: `# Comparison — {documents}
**Summary of material changes**
## Change table (Provision | Before | After | Effect | Favours | Risk | Response)
## Notes on renumbering and structure
## Verification checklist`,
  }),

  // ═══ LITIGATION & DISPUTES ═════════════════════════════════════════════════
  w({
    id: "litigation-strategy", group: "disputes", icon: "🎯", core: false, docs: "recommended",
    name: "Litigation strategy & case assessment", nameId: "Strategi litigasi & penilaian perkara",
    desc: "Merits, forum, remedies, cost and time — with win probability bands and a step-by-step plan.",
    descId: "Pokok perkara, forum, tuntutan, biaya dan waktu — dengan rentang peluang menang dan rencana langkah demi langkah.",
    fields: [ROLE, STAGE, GOAL, { id: "budget", label: "Budget / constraints", labelId: "Anggaran / batasan", type: "text" }],
    starters: [
      ["Should we sue or settle? Give me the numbers and the plan.", "Sebaiknya menggugat atau berdamai? Beri saya angka dan rencananya."],
      ["Assess our chances and the best forum.", "Nilai peluang kami dan forum terbaik."],
    ],
    method: `1. Summarise the dispute and the client's objectives and constraints.
2. Forum options (courts, arbitration, specialised tribunals, regulators, mediation) with jurisdiction, venue, cost, duration, confidentiality, enforceability of the outcome (domestically and abroad).
3. Causes of action / defences with elements and evidence strength; limitation periods and procedural preconditions with dates.
4. Remedies: damages heads and quantification, specific performance, injunctions and interim relief (requirements and security), costs recovery rules.
5. Probability bands per scenario with drivers; expected value and cost-benefit; settlement range.
6. Step-by-step plan with timelines, evidence preservation, and communications strategy.`,
    output: `# Litigation strategy — {matter}
**Recommendation** (litigate / arbitrate / settle / hold) with rationale
## 1. Objectives and constraints
## 2. Forum analysis (table)
## 3. Claims / defences and evidence strength
## 4. Limitation and preconditions (with dates)
## 5. Remedies and interim relief
## 6. Scenarios (Scenario | Probability band | Value | Cost | Time)
## 7. Settlement range and negotiation angle
## 8. Action plan and timeline
## 9. Sources and verification checklist`,
  }),
  w({
    id: "pleadings", group: "disputes", icon: "📑", core: false, docs: "recommended",
    name: "Pleadings & court documents", nameId: "Gugatan & dokumen pengadilan",
    desc: "Draft claims, answers, replies, rejoinders, appeal memoranda, cassation and review petitions in the local court format.",
    descId: "Susun gugatan, jawaban, replik, duplik, memori banding, memori kasasi, dan PK sesuai format pengadilan setempat.",
    fields: [ROLE, STAGE, { id: "doctype", label: "Document to draft", labelId: "Dokumen yang disusun", type: "select", options: [
      ["claim", "Statement of claim / gugatan", "Gugatan"], ["answer", "Answer / defence (jawaban, eksepsi)", "Jawaban (termasuk eksepsi)"],
      ["reply", "Reply / replik", "Replik"], ["rejoinder", "Rejoinder / duplik", "Duplik"], ["conclusion", "Closing submissions / kesimpulan", "Kesimpulan"],
      ["appeal", "Appeal memorandum / memori banding", "Memori banding"], ["counter-appeal", "Counter-appeal memorandum", "Kontra memori banding"],
      ["cassation", "Cassation memorandum / memori kasasi", "Memori kasasi"], ["review", "Review petition / memori PK", "Memori peninjauan kembali"],
      ["motion", "Motion / application (interim relief, etc.)", "Permohonan (provisi, sita jaminan, dll.)"], ["complaint-crim", "Criminal complaint / police report", "Laporan/pengaduan pidana"],
      ["pledoi", "Defence plea (pledoi)", "Pledoi"], ["petition-const", "Constitutional petition", "Permohonan uji materi"],
    ] }, GOAL],
    starters: [
      ["Draft a claim for breach of contract with interim attachment.", "Susun gugatan wanprestasi dengan permohonan sita jaminan."],
      ["Draft our answer including jurisdictional objections.", "Susun jawaban kami termasuk eksepsi kompetensi."],
    ],
    method: `1. Identify the court, procedure and the mandatory formal requirements of the document type in the selected legal order (caption, identity of parties, legal standing, jurisdiction statement, posita/facts, legal grounds, petitum/relief, signatures, power of attorney, fees, annex list, page and filing formalities, deadlines).
2. Build the narrative from the documents with pinpoint references to exhibits; each factual allegation must be supported or marked [TO PROVE].
3. Legal grounds: each cause of action / objection with its elements and authorities; for answers, lead with procedural objections (exceptions) before merits.
4. Relief/petitum drafted precisely and enforceably (primary and alternative "ex aequo et bono" where the system allows).
5. After the draft: filing checklist, deadlines calculation, evidence list and risks.`,
    output: `# {Document type} — {case}
(Complete draft in the court's language and format; exhibits referenced as P-1/T-1 or local equivalent)
---
## Filing checklist and deadline calculation
## Evidence / exhibit list
## Risks and weak points to shore up
## Verification checklist`,
  }),
  w({
    id: "chronology", group: "disputes", icon: "🗓️", core: false, docs: "required",
    name: "Chronology & evidence matrix", nameId: "Kronologi & matriks bukti",
    desc: "Turn a pile of documents into a sourced timeline and an issue-by-issue evidence matrix.",
    descId: "Ubah tumpukan dokumen menjadi kronologi bersumber dan matriks bukti per pokok masalah.",
    fields: [ROLE],
    starters: [
      ["Build a chronology with sources from all these documents.", "Buat kronologi bersumber dari semua dokumen ini."],
      ["Which facts are proven, disputed or unproven?", "Fakta mana yang terbukti, dibantah, atau belum terbukti?"],
    ],
    method: `1. Extract every dated event, communication and transaction with actor, content summary and pinpoint source; normalise dates (state the time zone if relevant); mark undated items.
2. Detect contradictions, gaps and suspicious sequences (backdating, missing replies).
3. Build the evidence matrix: each fact → which issue it proves → evidence type under local evidence law (documents, witnesses, experts, admissions, presumptions, electronic evidence requirements) → admissibility/weight concerns.`,
    output: `# Chronology and evidence matrix — {matter}
## 1. Chronology (Date | Event | Actor | Source | Status: undisputed/disputed/unproven)
## 2. Contradictions and gaps
## 3. Evidence matrix (Issue | Fact | Evidence | Type | Admissibility/weight | Action)
## 4. Evidence to obtain`,
  }),
  w({
    id: "witness-prep", group: "disputes", icon: "🎤", core: false, docs: "optional",
    name: "Witness & cross-examination prep", nameId: "Persiapan saksi & pemeriksaan silang",
    desc: "Question plans for direct and cross-examination, expected answers, traps and impeachment material.",
    descId: "Rencana pertanyaan untuk pemeriksaan saksi & silang, jawaban yang diperkirakan, jebakan, dan bahan untuk melemahkan kesaksian.",
    fields: [ROLE, { id: "witness", label: "Witness (name/role)", labelId: "Saksi (nama/peran)", type: "text" }],
    starters: [
      ["Prepare cross-examination questions for this witness.", "Siapkan pertanyaan pemeriksaan silang untuk saksi ini."],
      ["Prepare our witness for their testimony.", "Persiapkan saksi kami untuk memberikan keterangan."],
    ],
    method: `1. Respect local rules on witness preparation and ethics (no coaching of false testimony; distinguish permitted familiarisation).
2. Identify what the witness can prove or damage, prior statements and documents they touched.
3. Direct examination plan: open questions, sequencing, exhibits.
4. Cross-examination plan: leading questions in short chapters, expected answers, impeachment with prior inconsistent statements and documents, questions to avoid.
5. Likely questions from the other side/judge and truthful, clear answers.`,
    output: `# Witness plan — {witness}
## 1. Objectives
## 2. Direct examination (questions + exhibits)
## 3. Cross-examination chapters (Question | Expected answer | If they deny → impeachment source)
## 4. Risk questions and preparation points
## 5. Ethics reminders`,
  }),
  w({
    id: "adversary", group: "disputes", icon: "🥊", core: false, docs: "optional",
    name: "Opposing counsel & judge simulator", nameId: "Simulasi pihak lawan & hakim",
    desc: "Stress-test your case: the other side's best attack, then how a judge would likely reason and rule.",
    descId: "Uji ketahanan perkara Anda: serangan terbaik pihak lawan, lalu bagaimana hakim kemungkinan menimbang dan memutus.",
    fields: [ROLE],
    starters: [
      ["Attack our case as the best opposing counsel would.", "Serang perkara kami seperti yang dilakukan kuasa hukum lawan terbaik."],
      ["Write the judgment a careful judge would likely give.", "Tulis putusan yang kemungkinan dijatuhkan hakim yang cermat."],
    ],
    method: `1. Part A — as opposing counsel: the strongest procedural objections, factual attacks and legal arguments, ranked by danger, with authorities.
2. Part B — as the court: frame the issues, weigh the evidence under the applicable burden and standard of proof, apply the law, and write reasoned conclusions with a likely disposition and costs.
3. Part C — as the user's advisor: how to neutralise each danger, what evidence or argument changes the outcome.`,
    output: `# Stress test — {matter}
## A. Opposing counsel's best case (ranked)
## B. Likely judicial reasoning and outcome
## C. How to neutralise each risk
## D. Verification checklist`,
  }),
  w({
    id: "arbitration", group: "disputes", icon: "🏳️", core: false, docs: "optional",
    name: "Arbitration & ADR", nameId: "Arbitrase & APS",
    desc: "Clause health-check, notice of arbitration, tribunal strategy, interim measures, and annulment/enforcement analysis.",
    descId: "Cek kesehatan klausul, pemberitahuan arbitrase, strategi majelis, tindakan sementara, dan analisis pembatalan/eksekusi.",
    fields: [ROLE, { id: "rules", label: "Institution / rules", labelId: "Lembaga / aturan", type: "text", placeholder: "e.g. SIAC, ICC, BANI, UNCITRAL, LCIA, HKIAC" }],
    starters: [
      ["Is our arbitration clause valid and what are the risks?", "Apakah klausul arbitrase kami sah dan apa risikonya?"],
      ["Draft a notice of arbitration.", "Susun pemberitahuan arbitrase (notice of arbitration)."],
      ["Can this award be enforced in the selected country?", "Apakah putusan arbitrase ini dapat dieksekusi di negara yang dipilih?"],
    ],
    method: `1. Clause analysis: validity, scope, seat, rules, number of arbitrators, language, multi-tier preconditions, joinder/consolidation, pathological defects.
2. Seat law: arbitrability, court support and supervision, interim measures, annulment grounds and deadlines.
3. Procedure plan: notice/request contents and deadlines, tribunal constitution strategy, emergency arbitrator, document production, experts, costs and funding.
4. Enforcement: New York Convention status and reservations of the enforcement state, local registration/exequatur procedure, public-policy defences, state immunity where relevant.`,
    output: `# Arbitration analysis — {matter}
## 1. Clause health-check
## 2. Seat and applicable procedural law
## 3. Procedure plan and timeline
## 4. Draft document (if requested)
## 5. Enforcement analysis
## 6. Sources and verification checklist`,
  }),
  w({
    id: "demand-settlement", group: "disputes", icon: "📨", core: false, docs: "optional",
    name: "Demand letter & settlement", nameId: "Somasi & perdamaian",
    desc: "Formal demand/notice letters and settlement agreements, with a valuation of what to accept.",
    descId: "Surat somasi/teguran resmi dan akta perdamaian, dengan penilaian angka yang layak diterima.",
    fields: [ROLE, GOAL, { id: "doctype", label: "Document", labelId: "Dokumen", type: "select", options: [["demand", "Demand / notice of default (somasi)", "Somasi / teguran wanprestasi"], ["response", "Response to a demand", "Tanggapan atas somasi"], ["settlement", "Settlement agreement", "Akta/perjanjian perdamaian"], ["valuation", "Settlement valuation only", "Penilaian nilai damai saja"]] }],
    starters: [
      ["Draft a formal demand letter for unpaid invoices.", "Susun somasi untuk tagihan yang belum dibayar."],
      ["What settlement amount should we accept?", "Berapa nilai damai yang sebaiknya kami terima?"],
    ],
    method: `1. Check local requirements for a valid notice of default (content, number of notices, deadlines, delivery method) and its legal effects (default interest, termination rights, limitation interruption).
2. Draft firm but professional letters without threats that could be unlawful (no criminal threats to extract civil payment, no defamation).
3. Settlement: value range from expected value of litigation, costs, time value and enforcement risk; key terms (payment schedule, security, releases, confidentiality, non-disparagement, court approval/deed of settlement for enforceability).`,
    output: `# {Document}
(Complete draft)
---
## Legal effect and next steps
## Settlement valuation (if relevant): range and reasoning
## Verification checklist`,
  }),
  w({
    id: "criminal", group: "disputes", icon: "🚨", core: false, docs: "recommended",
    name: "Criminal case analysis", nameId: "Analisis perkara pidana",
    desc: "Offence elements, evidence, procedure and rights, defences, sentencing range and the effect of new criminal codes.",
    descId: "Unsur delik, alat bukti, hukum acara & hak tersangka, pembelaan, rentang pidana, serta dampak KUHP/kode pidana baru.",
    fields: [ROLE, STAGE, { id: "facts_date", label: "Date of the alleged acts", labelId: "Tanggal perbuatan yang disangkakan", type: "text" }],
    starters: [
      ["Analyse whether the elements of the offence are proven.", "Analisis apakah unsur-unsur delik terpenuhi."],
      ["Does the new criminal code change the outcome for these facts?", "Apakah KUHP baru mengubah hasil untuk fakta ini?"],
    ],
    method: `1. Identify each possible offence and its statutory elements (actus reus, mens rea, circumstances), including participation, attempt and corporate liability.
2. Temporal application: the code in force at the time of the acts versus now; apply the more-favourable-law rule and transitional provisions explicitly.
3. Evidence: required means of proof and minimum evidentiary thresholds under local procedure, admissibility (unlawfully obtained evidence, electronic evidence), chain of custody.
4. Procedure and rights: detention limits, access to counsel, pre-trial remedies (e.g. praperadilan), deadlines.
5. Defences, justifications and excuses; restorative-justice or diversion options where available.
6. Sentencing range, aggravating/mitigating factors, alternatives to imprisonment, and collateral consequences.
7. Strategy for the side the user acts for.`,
    output: `# Criminal analysis — {matter}
**Assessment** (with confidence)
## 1. Offences and elements (table: Element | Facts | Evidence | Proven?)
## 2. Law applicable in time (old vs new code, more-favourable rule)
## 3. Evidence and admissibility
## 4. Procedure, rights and deadlines
## 5. Defences and alternatives (restorative justice, diversion)
## 6. Sentencing range and factors
## 7. Strategy and next steps
## 8. Sources and verification checklist`,
  }),

  // ═══ COMPLIANCE & RISK ═════════════════════════════════════════════════════
  w({
    id: "compliance-gap", group: "compliance", icon: "📋", core: false, docs: "optional",
    name: "Compliance gap analysis", nameId: "Analisis gap kepatuhan",
    desc: "Map the rules that apply to your business, find the gaps and get a prioritised remediation plan.",
    descId: "Petakan aturan yang berlaku untuk bisnis Anda, temukan kekurangannya, dan dapatkan rencana perbaikan berprioritas.",
    fields: [{ id: "business", label: "Business, activities and size", labelId: "Bisnis, kegiatan, dan skala", type: "textarea", placeholder: "e.g. online marketplace, 1M users, payments via partners, data stored in Singapore" }],
    starters: [
      ["What licences and compliance obligations apply to my business?", "Izin dan kewajiban kepatuhan apa yang berlaku untuk bisnis saya?"],
      ["Audit our current practices against the law.", "Audit praktik kami saat ini terhadap peraturan."],
    ],
    method: `1. Profile the business: activities, customers, data, money flows, locations, foreign ownership, sector regulators.
2. Build the obligations register: every applicable law/regulation, the specific obligation, the regulator, deadline/frequency, and sanction for breach.
3. Compare against the described practices/documents: compliant / partial / gap / unknown.
4. Prioritise gaps by legal exposure (sanction severity × likelihood) and effort; remediation with owners and timelines; policies and documents to create.`,
    output: `# Compliance gap analysis — {business}
**Top exposures**
## 1. Business profile and regulators
## 2. Obligations register (Law & pinpoint | Obligation | Regulator | Frequency/deadline | Sanction)
## 3. Gap assessment (Obligation | Status | Evidence | Risk)
## 4. Remediation roadmap (30/60/90 days)
## 5. Documents and policies to create
## 6. Sources and verification checklist`,
  }),
  w({
    id: "privacy", group: "compliance", icon: "🛡️", core: false, docs: "optional",
    name: "Data protection & DPIA", nameId: "Pelindungan data & DPIA",
    desc: "Lawful basis, records of processing, cross-border transfers, breach response and a full DPIA — across PDP, GDPR, PDPA and more.",
    descId: "Dasar pemrosesan, catatan pemrosesan, transfer lintas negara, respons kebocoran, dan DPIA lengkap — UU PDP, GDPR, PDPA, dan lainnya.",
    fields: [{ id: "processing", label: "Processing activity", labelId: "Kegiatan pemrosesan", type: "textarea", placeholder: "e.g. biometric attendance for 2,000 employees, processed by a vendor in India" }, { id: "doctype", label: "Output", labelId: "Keluaran", type: "select", options: [["dpia", "Full DPIA", "DPIA lengkap"], ["ropa", "Record of processing (RoPA)", "Catatan pemrosesan (RoPA)"], ["transfer", "Cross-border transfer assessment", "Asesmen transfer lintas negara"], ["breach", "Breach response plan / notification", "Rencana respons / notifikasi kebocoran"], ["policy", "Privacy notice / policy", "Pemberitahuan / kebijakan privasi"]] }],
    starters: [
      ["Run a DPIA for this processing activity.", "Lakukan DPIA untuk kegiatan pemrosesan ini."],
      ["We had a data breach — what must we do and by when?", "Terjadi kebocoran data — apa yang harus kami lakukan dan kapan tenggatnya?"],
    ],
    method: `1. Identify every applicable data-protection law (selected legal order plus extraterritorial regimes such as GDPR where the facts trigger them) and sectoral rules.
2. Classify data (personal, specific/sensitive, children), roles (controller, processor, joint), lawful bases and purposes.
3. Assess necessity, proportionality, retention, data-subject rights, security measures, vendors and cross-border transfer mechanisms.
4. Risk assessment: likelihood × severity for data subjects, with mitigations and residual risk.
5. Breach: notification thresholds, deadlines (to regulator and to individuals), content, and evidence to keep.
6. Produce the requested output in a regulator-ready format.`,
    output: `# {DPIA / RoPA / transfer assessment / breach plan / notice}
## 1. Applicable laws and roles
## 2. Processing description (data, subjects, purposes, bases, retention, recipients, transfers)
## 3. Necessity and proportionality
## 4. Risk register (Risk | Likelihood | Severity | Mitigation | Residual)
## 5. Required actions and deadlines
## 6. Sources and verification checklist`,
  }),
  w({
    id: "aml-kyc", group: "compliance", icon: "🔐", core: false, docs: "optional",
    name: "AML/KYC & sanctions", nameId: "APU-PPT/KYC & sanksi",
    desc: "Customer risk rating, beneficial-ownership analysis, red flags, sanctions and export-control screening logic, STR drafting.",
    descId: "Penilaian risiko nasabah, analisis pemilik manfaat, red flag, logika screening sanksi & kontrol ekspor, dan draf laporan transaksi mencurigakan.",
    fields: [{ id: "subject", label: "Customer / transaction", labelId: "Nasabah / transaksi", type: "textarea" }],
    starters: [
      ["Risk-rate this customer and list enhanced due diligence steps.", "Nilai risiko nasabah ini dan daftarkan langkah EDD."],
      ["Does this transaction need a suspicious transaction report?", "Apakah transaksi ini perlu dilaporkan sebagai transaksi mencurigakan?"],
    ],
    method: `1. Identify the reporting-entity obligations under the selected legal order and FATF-based standards.
2. Customer due diligence: identity, beneficial ownership (look-through with thresholds), PEP status, source of funds/wealth, geography, product and channel risk → risk rating with reasons.
3. Red flags and typologies matched to the facts.
4. Sanctions/export control: which lists and regimes are relevant (UN, OFAC SDN and sectoral, EU, UK, local), ownership/control rules (e.g. 50% rule), and what must be screened. You cannot run live list screening yourself — say so and specify exactly what to screen.
5. Decision: onboard / EDD / reject / exit / report; STR contents and deadlines; tipping-off prohibition.`,
    output: `# AML/KYC assessment — {subject}
**Decision** and risk rating
## 1. Obligations
## 2. CDD / beneficial ownership analysis
## 3. Red flags and typologies
## 4. Sanctions & export-control screening plan
## 5. Decision, EDD steps, reporting (with deadlines)
## 6. Sources and verification checklist`,
  }),
  w({
    id: "employment", group: "compliance", icon: "👷", core: false, docs: "optional",
    name: "Employment & HR", nameId: "Ketenagakerjaan & HR",
    desc: "Hiring, contracts, termination procedure, severance calculations, policies and industrial-relations disputes.",
    descId: "Rekrutmen, perjanjian kerja, prosedur PHK, perhitungan pesangon, peraturan perusahaan, dan perselisihan hubungan industrial.",
    fields: [ROLE, { id: "worker", label: "Employee details (for calculations)", labelId: "Data karyawan (untuk perhitungan)", type: "textarea", placeholder: "contract type, start date, monthly wage & fixed allowances, reason for termination" }],
    starters: [
      ["Calculate severance for this termination and the correct procedure.", "Hitung pesangon untuk PHK ini beserta prosedur yang benar."],
      ["Is this fixed-term contract valid or converted to permanent?", "Apakah PKWT ini sah atau berubah menjadi PKWTT?"],
    ],
    method: `1. Determine employment status and contract type validity under the selected legal order (including conversion rules for fixed-term contracts and outsourcing limits).
2. Termination: permitted grounds, mandatory procedure (notices, bipartite/tripartite steps, approvals), prohibited reasons, and risks of unlawful termination.
3. Calculations: show every formula and input (severance, service pay, compensation of rights, notice pay, leave, THR/13th-month or equivalents), stating the wage components counted; flag where regulations changed (e.g. post-omnibus and court decisions).
4. Policies/documents needed and dispute routes with deadlines.`,
    output: `# Employment analysis — {matter}
## 1. Status and contract validity
## 2. Grounds and procedure (step table with legal basis and deadlines)
## 3. Calculations (table with formula, inputs, result)
## 4. Risks and dispute routes
## 5. Documents to prepare
## 6. Sources and verification checklist`,
  }),
  w({
    id: "ip", group: "compliance", icon: "©️", core: false, docs: "optional",
    name: "IP clearance & protection", nameId: "Kliring & pelindungan HKI",
    desc: "Trademark/copyright/patent/design strategy, infringement risk, licensing and enforcement options.",
    descId: "Strategi merek/hak cipta/paten/desain, risiko pelanggaran, lisensi, dan opsi penegakan.",
    fields: [{ id: "asset", label: "IP asset / issue", labelId: "Aset / isu HKI", type: "textarea" }],
    starters: [
      ["Can we register this brand and what are the conflict risks?", "Bisakah merek ini didaftarkan dan apa risiko konfliknya?"],
      ["Someone copied our product — what are our options?", "Produk kami ditiru — apa pilihan kami?"],
    ],
    method: `1. Identify the IP rights involved and registrability (distinctiveness, absolute and relative grounds, novelty, originality), first-to-file vs first-to-use, classes and territories (Madrid/PCT/Hague routes).
2. Clearance: the searches that must be run in official databases (you cannot search them yourself without live research — state this), likely conflicts and risk.
3. Ownership: employee/contractor creations, assignments and recordal formalities.
4. Infringement analysis (tests, defences, exhaustion), enforcement options (civil, criminal, customs, platform takedowns, domain disputes) and remedies.
5. Licensing terms and registration requirements.`,
    output: `# IP analysis — {asset}
## 1. Rights and registrability
## 2. Clearance plan and conflict risk
## 3. Ownership and chain of title
## 4. Infringement / enforcement options
## 5. Filing / licensing strategy (territories, classes, timeline, cost drivers)
## 6. Sources and verification checklist`,
  }),
  w({
    id: "tax", group: "compliance", icon: "📊", core: false, docs: "optional",
    name: "Tax analysis", nameId: "Analisis pajak",
    desc: "Corporate, individual, VAT, withholding, PE and treaty analysis with calculations and dispute routes.",
    descId: "Analisis PPh badan & orang pribadi, PPN, pemotongan, BUT, dan tax treaty dengan perhitungan dan jalur sengketa.",
    fields: [{ id: "tax_year", label: "Tax year / period", labelId: "Tahun / masa pajak", type: "text" }],
    starters: [
      ["What taxes apply to this cross-border service arrangement?", "Pajak apa yang berlaku untuk pengaturan jasa lintas negara ini?"],
      ["We received a tax assessment — how do we object and by when?", "Kami menerima SKP — bagaimana mengajukan keberatan dan kapan tenggatnya?"],
    ],
    method: `1. Identify the taxes and the tax year; rates and thresholds must be stated with their legal source and the year they apply to (they change often — flag for verification).
2. Residence, PE, source rules and treaty relief (with the required certificates/forms).
3. Calculations with every assumption shown.
4. Anti-avoidance rules (GAAR, transfer pricing, CFC, thin capitalisation) exposure.
5. Compliance obligations and deadlines; dispute routes (objection, appeal, tax court) with deadlines and payment-before-appeal rules.`,
    output: `# Tax analysis — {matter}
## 1. Taxes engaged and legal basis
## 2. Residence / PE / treaty analysis
## 3. Calculations (table)
## 4. Anti-avoidance exposure
## 5. Compliance and dispute timeline
## 6. Sources and verification checklist`,
  }),
  w({
    id: "esg", group: "compliance", icon: "🌱", core: false, docs: "optional",
    name: "ESG & sustainability", nameId: "ESG & keberlanjutan",
    desc: "Mandatory sustainability reporting, supply-chain due diligence, greenwashing risk and board duties.",
    descId: "Pelaporan keberlanjutan wajib, uji tuntas rantai pasok, risiko greenwashing, dan kewajiban direksi.",
    fields: [{ id: "business", label: "Company profile", labelId: "Profil perusahaan", type: "text" }],
    starters: [
      ["Which sustainability reporting rules apply to us and when?", "Aturan pelaporan keberlanjutan mana yang berlaku bagi kami dan kapan?"],
      ["Review our marketing claims for greenwashing risk.", "Review klaim pemasaran kami untuk risiko greenwashing."],
    ],
    method: `1. Determine which disclosure and due-diligence regimes apply (local sustainability reporting, ISSB-based standards, EU CSRD/CSDDD where triggered, sector rules) and their current timelines — flag recent postponements.
2. Map obligations to the company and gaps.
3. Greenwashing: test each claim for substantiation, specificity and consumer-law/advertising compliance.
4. Governance: board oversight duties, liability and recommended structure.`,
    output: `# ESG legal analysis — {company}
## 1. Applicable regimes and timelines
## 2. Obligations and gaps
## 3. Claims review (Claim | Issue | Risk | Fix)
## 4. Governance recommendations
## 5. Sources and verification checklist`,
  }),
  w({
    id: "ai-governance", group: "compliance", icon: "🤖", core: false, docs: "optional",
    name: "AI governance & tech regulation", nameId: "Tata kelola AI & regulasi teknologi",
    desc: "Classify AI systems (e.g. EU AI Act risk tiers), map obligations, draft AI policies and vendor terms.",
    descId: "Klasifikasikan sistem AI (mis. tingkat risiko EU AI Act), petakan kewajiban, susun kebijakan AI dan ketentuan vendor.",
    fields: [{ id: "system", label: "AI system / use case", labelId: "Sistem / kasus penggunaan AI", type: "textarea" }],
    starters: [
      ["Classify our AI use case and list our obligations.", "Klasifikasikan kasus penggunaan AI kami dan daftarkan kewajibannya."],
      ["Draft an internal generative-AI use policy.", "Susun kebijakan internal penggunaan AI generatif."],
    ],
    method: `1. Identify applicable AI-specific rules (EU AI Act where triggered, national AI guidelines/regulations, sectoral rules) plus data protection, consumer, IP and liability law.
2. Classify the system (role: provider/deployer/importer; risk tier; general-purpose model obligations) with reasons.
3. Map obligations with application dates, and the technical/organisational measures to meet them.
4. Draft policy or contract clauses if requested.`,
    output: `# AI governance assessment — {system}
## 1. Applicable rules
## 2. Classification and role
## 3. Obligations and dates (table)
## 4. Controls to implement
## 5. Draft policy / clauses (if requested)
## 6. Sources and verification checklist`,
  }),

  // ═══ DRAFTING & COMMUNICATION ══════════════════════════════════════════════
  w({
    id: "opinion-letter", group: "drafting", icon: "🖋️", core: true, docs: "optional",
    name: "Legal opinion & advice letter", nameId: "Pendapat hukum & surat nasihat",
    desc: "Formal legal opinions and client advice letters with assumptions, qualifications and clear recommendations.",
    descId: "Pendapat hukum resmi dan surat nasihat klien lengkap dengan asumsi, kualifikasi, dan rekomendasi yang jelas.",
    fields: [{ id: "doctype", label: "Document", labelId: "Dokumen", type: "select", options: [["advice", "Client advice letter", "Surat nasihat klien"], ["opinion", "Formal legal opinion (pendapat hukum)", "Pendapat hukum formal"], ["memo", "Internal memo", "Memo internal"], ["letter", "Letter to authority / counterparty", "Surat ke instansi / pihak lain"]] }, { id: "recipient", label: "Recipient", labelId: "Penerima", type: "text" }],
    starters: [
      ["Write a legal opinion on whether this transaction is permitted.", "Tulis pendapat hukum apakah transaksi ini diperbolehkan."],
      ["Write an advice letter to my client explaining their options.", "Tulis surat nasihat kepada klien yang menjelaskan pilihan mereka."],
    ],
    method: `1. Use the correct format for the document type and legal culture of the selected legal order (letterhead placeholders, references, privilege/confidentiality marking).
2. Legal opinions: scope, documents examined, assumptions, the opinions themselves (numbered, precise), qualifications and reservations, reliance limitations.
3. Advice letters: the question, short answer first, explanation in the audience's language, options with pros/cons/costs/timelines, recommendation, next steps.
4. Every statement of law carries its authority.`,
    output: `(Complete letter/opinion ready to put on letterhead — placeholders in [brackets])
---
## Drafting notes and verification checklist`,
  }),
  w({
    id: "plain-language", group: "drafting", icon: "💬", core: true, docs: "optional",
    name: "Plain-language explainer", nameId: "Penjelasan bahasa awam",
    desc: "Explain a contract, judgment, summons or law to a non-lawyer: what it means, what to do, and by when.",
    descId: "Jelaskan kontrak, putusan, surat panggilan, atau peraturan kepada orang awam: artinya apa, apa yang harus dilakukan, dan kapan.",
    fields: [],
    starters: [
      ["Explain this document to me in simple words. What must I do?", "Jelaskan dokumen ini dengan bahasa sederhana. Apa yang harus saya lakukan?"],
      ["I received a court summons — what happens next?", "Saya menerima relaas panggilan sidang — apa yang terjadi selanjutnya?"],
    ],
    method: `1. Write for an intelligent non-lawyer: short sentences, no jargon (or explain it once), concrete examples.
2. Lead with the three things the person must know and any deadline.
3. Explain rights and obligations, what happens if they do nothing, and options.
4. Tell them clearly when they should get a lawyer and what to bring.`,
    output: `# What this means for you
**In one minute:** (3 bullets + any deadline in bold)
## What the document says
## What you must do (and by when)
## Your options
## When to get a lawyer and what to bring
## Words explained`,
  }),
  w({
    id: "legislative", group: "drafting", icon: "🏛️", core: false, docs: "optional",
    name: "Legislative & policy drafting", nameId: "Perancangan peraturan & kebijakan",
    desc: "Draft bills, regulations, regional regulations, bylaws and academic papers (naskah akademik) with regulatory impact analysis.",
    descId: "Susun RUU, peraturan, perda, peraturan internal, dan naskah akademik dengan analisis dampak regulasi.",
    fields: [{ id: "instrument", label: "Instrument type", labelId: "Jenis instrumen", type: "text", placeholder: "e.g. Perda Kabupaten, ministerial regulation, company bylaw, bill" }],
    starters: [
      ["Draft a regional regulation on this topic with its academic paper outline.", "Susun ranperda tentang topik ini beserta kerangka naskah akademiknya."],
      ["Review this draft bill for legal drafting defects.", "Review RUU ini untuk cacat teknik perancangan."],
    ],
    method: `1. Confirm the legal basis and authority to regulate (attribution/delegation), the correct instrument type and its place in the hierarchy; check conflicts with higher law.
2. Follow the local legislative drafting rules and format (for Indonesia: Lampiran II UU 12/2011 as amended; otherwise the jurisdiction's drafting manual).
3. Produce the draft (considerations/recitals, legal basis, definitions, substantive chapters, sanctions within permitted limits, transitional and closing provisions) and, where relevant, the academic paper or explanatory memorandum and regulatory impact analysis.
4. Identify public participation and approval steps.`,
    output: `# {Instrument title}
(Complete draft in the official format)
---
## Explanatory memorandum / academic paper outline
## Regulatory impact analysis
## Hierarchy and conflict check
## Adoption steps and verification checklist`,
  }),
  w({
    id: "translation", group: "drafting", icon: "🌐", core: false, docs: "required",
    name: "Legal translation", nameId: "Terjemahan hukum",
    desc: "Precise legal translation that keeps defined terms consistent, with a bilingual glossary and notes on untranslatable concepts.",
    descId: "Terjemahan hukum yang presisi dengan istilah konsisten, glosarium dua bahasa, dan catatan konsep yang tidak padan.",
    fields: [{ id: "target", label: "Translate into", labelId: "Terjemahkan ke", type: "text", placeholder: "e.g. English, Bahasa Indonesia, Arabic" }, { id: "layout", label: "Layout", labelId: "Tata letak", type: "select", options: [["plain", "Translation only", "Terjemahan saja"], ["side", "Side-by-side table", "Tabel berdampingan"]] }],
    starters: [
      ["Translate this contract into English, keeping legal terms precise.", "Terjemahkan kontrak ini ke bahasa Inggris dengan istilah hukum yang presisi."],
      ["Translate this judgment into Indonesian.", "Terjemahkan putusan ini ke bahasa Indonesia."],
    ],
    method: `1. Translate faithfully — never summarise, add or omit. Keep numbering, defined terms and cross-references identical.
2. Use the established legal equivalents of the target system; where a concept has no true equivalent, keep the original term in italics with a translator's note.
3. Build a glossary of key terms.
4. Note ambiguities in the source and state that an official/sworn translation may be required for filing.`,
    output: `(Complete translation in the chosen layout)
---
## Glossary (Source term | Translation | Note)
## Translator's notes`,
  }),
  w({
    id: "deadlines", group: "drafting", icon: "⏱️", core: false, docs: "optional",
    name: "Deadlines & limitation calculator", nameId: "Kalkulator tenggat & daluwarsa",
    desc: "Procedural deadlines and limitation periods, computed from your dates with the counting rules shown.",
    descId: "Tenggat acara dan daluwarsa, dihitung dari tanggal Anda dengan aturan penghitungan yang ditunjukkan.",
    fields: [{ id: "trigger", label: "Trigger event and date", labelId: "Peristiwa pemicu dan tanggal", type: "text", placeholder: "e.g. judgment pronounced 14 Aug 2026; notice received 2 Sep 2026" }],
    starters: [
      ["What are all our deadlines after this judgment?", "Apa saja tenggat kami setelah putusan ini?"],
      ["Has the limitation period expired for this claim?", "Apakah gugatan ini sudah daluwarsa?"],
    ],
    method: `1. Identify every relevant deadline type (appeal, cassation, review, objection, filing, limitation, statutory notice, regulatory reporting).
2. For each: legal basis, the trigger, the counting rule (calendar vs working days, whether the trigger day counts, extensions over weekends/holidays, service/notification rules), and compute the date step by step.
3. Flag public holidays you cannot confirm and any suspension/interruption events.
4. Present the most urgent first and recommend internal buffer dates.`,
    output: `# Deadlines — {matter}
**Next deadline:** {date} — {what}
## Deadline table (Deadline | Legal basis | Trigger | Counting rule | Calculated date | Internal target)
## Calculation notes and assumptions
## Verification checklist (holidays, service dates)`,
  }),
  w({
    id: "ask", group: "drafting", icon: "💡", core: true, docs: "optional",
    name: "Ask anything (legal)", nameId: "Tanya apa saja (hukum)",
    desc: "Quick, sourced answers to any legal question — with the law, its status and what to verify.",
    descId: "Jawaban cepat dan bersumber untuk pertanyaan hukum apa pun — dengan dasar hukum, statusnya, dan yang perlu diverifikasi.",
    fields: [],
    starters: [
      ["What is the minimum capital to set up a foreign-owned company?", "Berapa modal minimum untuk mendirikan perusahaan PMA?"],
      ["Can I record a phone call without consent?", "Bolehkah saya merekam percakapan telepon tanpa persetujuan?"],
      ["What are my rights if my flight is cancelled?", "Apa hak saya jika penerbangan dibatalkan?"],
    ],
    method: `Answer directly first, then give the legal basis with pinpoints, current status, key exceptions and practical steps. Keep it proportionate to the question; ask one clarifying question at the end only if the answer genuinely depends on a missing fact.`,
    output: `**Answer:** (2–4 lines)
## Legal basis
## Exceptions and practical points
## What to verify`,
  }),
];

export const getWorkspace = (id: string | undefined | null) => WORKSPACES.find((x) => x.id === id);
export const CORE_WORKSPACES = WORKSPACES.filter((x) => x.core).map((x) => x.id);

/** Everything the browser may see (no method/output). */
export function publicWorkspaces() {
  return WORKSPACES.map(({ method: _m, output: _o, ...rest }) => rest);
}
export type PublicWorkspace = ReturnType<typeof publicWorkspaces>[number];
