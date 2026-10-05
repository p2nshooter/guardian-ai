/* AXTO — Legal AI catalogue in 10 languages: workspace groups, the 36 workspaces
 * (name, description, example requests), their fields (label, placeholder,
 * options), practice areas and their groups, picker regions, supranational
 * jurisdictions, citation styles and legal traditions. Country names come from
 * the browser (Intl.DisplayNames). English mirrors lib/legal/workspaces.ts,
 * areas.ts and jurisdictions.ts (tests/legal-i18n.test.ts keeps them in sync);
 * the expert instructions behind each workspace stay on the server. */
import type { Lang } from "../i18n-shared";

const en = {
  "groups": {
    "research": "Research & analysis",
    "transactions": "Contracts & transactions",
    "disputes": "Litigation & disputes",
    "compliance": "Compliance & risk",
    "drafting": "Drafting & communication"
  },
  "areaGroups": {
    "General": "General",
    "Public law": "Public law",
    "Private & commercial": "Private & commercial",
    "Technology & IP": "Technology & IP",
    "People": "People",
    "Criminal & compliance": "Criminal & compliance",
    "Sectors": "Sectors",
    "Disputes": "Disputes"
  },
  "areas": {
    "general": "General / not sure",
    "constitutional": "Constitutional law",
    "administrative": "Administrative law & licensing",
    "procurement": "Public procurement & PPP",
    "human-rights": "Human rights",
    "international": "Public international law & treaties",
    "elections": "Elections & political parties",
    "contracts": "Contracts & obligations",
    "torts": "Torts / unlawful acts & liability",
    "corporate": "Corporate & company law",
    "ma": "Mergers & acquisitions",
    "capital-markets": "Capital markets & securities",
    "banking": "Banking & finance",
    "fintech": "Fintech, payments & crypto-assets",
    "insurance": "Insurance",
    "competition": "Competition / antitrust",
    "consumer": "Consumer protection",
    "insolvency": "Insolvency & restructuring",
    "real-estate": "Real estate & land",
    "construction": "Construction & engineering",
    "franchise": "Franchising, agency & distribution",
    "ip": "Intellectual property",
    "privacy": "Data protection & privacy",
    "cyber": "Cybersecurity",
    "ai-tech": "AI & technology regulation",
    "telecom-media": "Telecom, media & broadcasting",
    "employment": "Employment & labour",
    "immigration": "Immigration & nationality",
    "family": "Family & personal status",
    "succession": "Succession, wills & trusts",
    "health": "Health & life sciences",
    "education": "Education",
    "nonprofit": "Non-profits, foundations & religion",
    "indigenous": "Customary & indigenous law",
    "criminal": "Criminal law & procedure",
    "white-collar": "White-collar crime & investigations",
    "aml": "AML/CFT & sanctions",
    "anti-corruption": "Anti-corruption & ethics compliance",
    "tax": "Tax",
    "trade": "Trade, customs & export control",
    "environment": "Environment, climate & natural resources",
    "energy": "Energy, mining & infrastructure",
    "maritime": "Maritime, shipping & aviation",
    "transport": "Transport & logistics",
    "agri-food": "Agriculture & food",
    "islamic-finance": "Islamic finance & Sharia compliance",
    "esg": "ESG & corporate governance",
    "sports-ent": "Sports, media & entertainment",
    "litigation": "Civil litigation & procedure",
    "arbitration": "Arbitration & ADR"
  },
  "regions": {
    "supranational": "International & EU",
    "asia": "Asia",
    "middle-east": "Middle East",
    "europe": "Europe",
    "americas": "Americas",
    "africa": "Africa",
    "oceania": "Oceania"
  },
  "special": {
    "EU": "European Union (EU law)",
    "INT": "Public international law & treaties"
  },
  "citations": {
    "auto": "Local standard for the jurisdiction",
    "bluebook": "Bluebook (US)",
    "oscola": "OSCOLA (UK)",
    "aglc": "AGLC (Australia)",
    "mcgill": "McGill Guide (Canada)",
    "id": "Indonesian practice (Pasal/ayat, Putusan No.)",
    "eu": "EU official style (ECLI, OJ references)"
  },
  "traditions": {
    "civil": "Civil law",
    "common": "Common law",
    "islamic": "Islamic law (Sharia)",
    "customary": "Customary law",
    "socialist": "Socialist law"
  },
  "ws": {
    "research": {
      "name": "Legal research memo",
      "desc": "A partner-grade research memo: the rule, its sources, how courts apply it, and what it means for your facts.",
      "starters": [
        "Can an employer terminate an employee for repeated lateness, and what severance is due?",
        "What are the requirements for a valid electronic signature and is it admissible as evidence?",
        "Is a non-compete clause enforceable after employment ends?"
      ]
    },
    "case-builder": {
      "name": "Case builder — restructure a case file",
      "desc": "Upload the case documents: get parties, chronology, legal issues, applicable law from the constitution down, element-by-element analysis, evidence gaps and strategy — against current law.",
      "starters": [
        "Restructure this case file and tell me our strongest and weakest points.",
        "Rebuild the case under the current law and flag what changed since the events.",
        "Prepare a litigation-ready case summary for the partner meeting."
      ]
    },
    "multi-jurisdiction": {
      "name": "Multi-jurisdiction comparison",
      "desc": "Compare how up to 8 countries or states treat the same question — side by side, with a recommended structure.",
      "starters": [
        "Compare data-breach notification duties across these jurisdictions.",
        "Where is it easiest to incorporate a holding company for Southeast Asia and why?"
      ]
    },
    "statute": {
      "name": "Statute & regulation navigator",
      "desc": "Explain any law article by article: meaning, amendments, implementing rules, court interpretations and practical impact.",
      "starters": [
        "Explain these articles, their amendments and how courts read them.",
        "Which implementing regulations exist for this law and what do they add?"
      ]
    },
    "constitutional": {
      "name": "Constitutional & judicial review",
      "desc": "Test a law, regulation or government act against the constitution or higher law: standing, grounds, precedent and a draft petition outline.",
      "starters": [
        "Can this regulation be challenged for conflicting with the constitution?",
        "Outline a judicial review petition with standing and constitutional grounds."
      ]
    },
    "judgment": {
      "name": "Judgment analyzer",
      "desc": "Upload a judgment or award: holding, ratio decidendi, obiter, reasoning map, precedent value and grounds for appeal.",
      "starters": [
        "Analyse this judgment and list grounds for appeal.",
        "Summarise the ratio and how it affects our pending case."
      ]
    },
    "regulatory-radar": {
      "name": "Regulatory radar & impact",
      "desc": "What changed, what is coming and what it means for your business — with an action plan and deadlines.",
      "starters": [
        "What regulatory changes affect my sector and what must we do?",
        "Build a compliance calendar of upcoming deadlines."
      ]
    },
    "citation-check": {
      "name": "Citation & authority checker",
      "desc": "Check every citation in a brief, memo or AI answer: format, existence, current status and whether it supports the proposition.",
      "starters": [
        "Check all citations in this document and flag anything doubtful.",
        "Verify these statutes are still in force and correctly numbered."
      ]
    },
    "contract-review": {
      "name": "Contract review & redline",
      "desc": "Clause-by-clause review for your side: risks, missing protections, enforceability under local law and suggested redlines.",
      "starters": [
        "Review this contract for my side and propose redlines.",
        "What are the top 10 risks in this agreement and how do I fix them?",
        "Check this contract against my playbook."
      ]
    },
    "contract-draft": {
      "name": "Contract drafting",
      "desc": "Draft a complete, locally enforceable contract from a term sheet or description — with drafting notes and alternatives.",
      "starters": [
        "Draft a mutual NDA governed by local law.",
        "Draft a software development agreement from these terms."
      ]
    },
    "negotiation": {
      "name": "Negotiation strategy & playbook",
      "desc": "Positions, BATNA, concessions ladder and word-for-word responses to the other side's asks.",
      "starters": [
        "Prepare my negotiation playbook for these contract terms.",
        "How should I respond to their markup?"
      ]
    },
    "due-diligence": {
      "name": "Due diligence",
      "desc": "Review a data room: corporate, contracts, licences, employment, IP, disputes, tax and compliance — with a red-flag report and CP list.",
      "starters": [
        "Produce a red-flag due diligence report from these documents.",
        "List conditions precedent and specific indemnities we need."
      ]
    },
    "corporate-secretarial": {
      "name": "Corporate & secretarial",
      "desc": "Board and shareholder resolutions, minutes, articles amendments, filings and approval matrices that meet local formalities.",
      "starters": [
        "Draft a circular shareholders' resolution to appoint a new director.",
        "What approvals and filings are needed to issue new shares?"
      ]
    },
    "doc-compare": {
      "name": "Document comparison",
      "desc": "Compare two versions of a contract or law: every change, who it favours and the legal effect.",
      "starters": [
        "Compare these two versions and explain each change.",
        "What did the new law change compared with the old one?"
      ]
    },
    "litigation-strategy": {
      "name": "Litigation strategy & case assessment",
      "desc": "Merits, forum, remedies, cost and time — with win probability bands and a step-by-step plan.",
      "starters": [
        "Should we sue or settle? Give me the numbers and the plan.",
        "Assess our chances and the best forum."
      ]
    },
    "pleadings": {
      "name": "Pleadings & court documents",
      "desc": "Draft claims, answers, replies, rejoinders, appeal memoranda, cassation and review petitions in the local court format.",
      "starters": [
        "Draft a claim for breach of contract with interim attachment.",
        "Draft our answer including jurisdictional objections."
      ]
    },
    "chronology": {
      "name": "Chronology & evidence matrix",
      "desc": "Turn a pile of documents into a sourced timeline and an issue-by-issue evidence matrix.",
      "starters": [
        "Build a chronology with sources from all these documents.",
        "Which facts are proven, disputed or unproven?"
      ]
    },
    "witness-prep": {
      "name": "Witness & cross-examination prep",
      "desc": "Question plans for direct and cross-examination, expected answers, traps and impeachment material.",
      "starters": [
        "Prepare cross-examination questions for this witness.",
        "Prepare our witness for their testimony."
      ]
    },
    "adversary": {
      "name": "Opposing counsel & judge simulator",
      "desc": "Stress-test your case: the other side's best attack, then how a judge would likely reason and rule.",
      "starters": [
        "Attack our case as the best opposing counsel would.",
        "Write the judgment a careful judge would likely give."
      ]
    },
    "arbitration": {
      "name": "Arbitration & ADR",
      "desc": "Clause health-check, notice of arbitration, tribunal strategy, interim measures, and annulment/enforcement analysis.",
      "starters": [
        "Is our arbitration clause valid and what are the risks?",
        "Draft a notice of arbitration.",
        "Can this award be enforced in the selected country?"
      ]
    },
    "demand-settlement": {
      "name": "Demand letter & settlement",
      "desc": "Formal demand/notice letters and settlement agreements, with a valuation of what to accept.",
      "starters": [
        "Draft a formal demand letter for unpaid invoices.",
        "What settlement amount should we accept?"
      ]
    },
    "criminal": {
      "name": "Criminal case analysis",
      "desc": "Offence elements, evidence, procedure and rights, defences, sentencing range and the effect of new criminal codes.",
      "starters": [
        "Analyse whether the elements of the offence are proven.",
        "Does the new criminal code change the outcome for these facts?"
      ]
    },
    "compliance-gap": {
      "name": "Compliance gap analysis",
      "desc": "Map the rules that apply to your business, find the gaps and get a prioritised remediation plan.",
      "starters": [
        "What licences and compliance obligations apply to my business?",
        "Audit our current practices against the law."
      ]
    },
    "privacy": {
      "name": "Data protection & DPIA",
      "desc": "Lawful basis, records of processing, cross-border transfers, breach response and a full DPIA — across PDP, GDPR, PDPA and more.",
      "starters": [
        "Run a DPIA for this processing activity.",
        "We had a data breach — what must we do and by when?"
      ]
    },
    "aml-kyc": {
      "name": "AML/KYC & sanctions",
      "desc": "Customer risk rating, beneficial-ownership analysis, red flags, sanctions and export-control screening logic, STR drafting.",
      "starters": [
        "Risk-rate this customer and list enhanced due diligence steps.",
        "Does this transaction need a suspicious transaction report?"
      ]
    },
    "employment": {
      "name": "Employment & HR",
      "desc": "Hiring, contracts, termination procedure, severance calculations, policies and industrial-relations disputes.",
      "starters": [
        "Calculate severance for this termination and the correct procedure.",
        "Is this fixed-term contract valid or converted to permanent?"
      ]
    },
    "ip": {
      "name": "IP clearance & protection",
      "desc": "Trademark/copyright/patent/design strategy, infringement risk, licensing and enforcement options.",
      "starters": [
        "Can we register this brand and what are the conflict risks?",
        "Someone copied our product — what are our options?"
      ]
    },
    "tax": {
      "name": "Tax analysis",
      "desc": "Corporate, individual, VAT, withholding, PE and treaty analysis with calculations and dispute routes.",
      "starters": [
        "What taxes apply to this cross-border service arrangement?",
        "We received a tax assessment — how do we object and by when?"
      ]
    },
    "esg": {
      "name": "ESG & sustainability",
      "desc": "Mandatory sustainability reporting, supply-chain due diligence, greenwashing risk and board duties.",
      "starters": [
        "Which sustainability reporting rules apply to us and when?",
        "Review our marketing claims for greenwashing risk."
      ]
    },
    "ai-governance": {
      "name": "AI governance & tech regulation",
      "desc": "Classify AI systems (e.g. EU AI Act risk tiers), map obligations, draft AI policies and vendor terms.",
      "starters": [
        "Classify our AI use case and list our obligations.",
        "Draft an internal generative-AI use policy."
      ]
    },
    "opinion-letter": {
      "name": "Legal opinion & advice letter",
      "desc": "Formal legal opinions and client advice letters with assumptions, qualifications and clear recommendations.",
      "starters": [
        "Write a legal opinion on whether this transaction is permitted.",
        "Write an advice letter to my client explaining their options."
      ]
    },
    "plain-language": {
      "name": "Plain-language explainer",
      "desc": "Explain a contract, judgment, summons or law to a non-lawyer: what it means, what to do, and by when.",
      "starters": [
        "Explain this document to me in simple words. What must I do?",
        "I received a court summons — what happens next?"
      ]
    },
    "legislative": {
      "name": "Legislative & policy drafting",
      "desc": "Draft bills, regulations, regional regulations, bylaws and academic papers (naskah akademik) with regulatory impact analysis.",
      "starters": [
        "Draft a regional regulation on this topic with its academic paper outline.",
        "Review this draft bill for legal drafting defects."
      ]
    },
    "translation": {
      "name": "Legal translation",
      "desc": "Precise legal translation that keeps defined terms consistent, with a bilingual glossary and notes on untranslatable concepts.",
      "starters": [
        "Translate this contract into English, keeping legal terms precise.",
        "Translate this judgment into Indonesian."
      ]
    },
    "deadlines": {
      "name": "Deadlines & limitation calculator",
      "desc": "Procedural deadlines and limitation periods, computed from your dates with the counting rules shown.",
      "starters": [
        "What are all our deadlines after this judgment?",
        "Has the limitation period expired for this claim?"
      ]
    },
    "ask": {
      "name": "Ask anything (legal)",
      "desc": "Quick, sourced answers to any legal question — with the law, its status and what to verify.",
      "starters": [
        "What is the minimum capital to set up a foreign-owned company?",
        "Can I record a phone call without consent?",
        "What are my rights if my flight is cancelled?"
      ]
    }
  },
  "fields": {
    "question": {
      "label": "Research question (optional, if not in your request)"
    },
    "role": {
      "label": "You act for",
      "options": {
        "neutral": "Neutral / objective view",
        "claimant": "Claimant / plaintiff / applicant",
        "defendant": "Defendant / respondent",
        "prosecution": "Prosecution / investigator",
        "defence": "Criminal defence",
        "judge": "Judge / arbitrator (draft reasoning)",
        "inhouse": "In-house counsel / company",
        "regulator": "Regulator / government",
        "individual": "Individual (not a lawyer)"
      }
    },
    "stage": {
      "label": "Stage / forum",
      "options": {
        "pre": "Pre-action / advisory",
        "first": "First instance court",
        "appeal": "Appeal",
        "cassation": "Cassation / supreme court",
        "review": "Extraordinary review (e.g. PK)",
        "constitutional": "Constitutional court",
        "administrative": "Administrative court / tribunal",
        "arbitration": "Arbitration",
        "mediation": "Mediation / negotiation",
        "investigation": "Criminal investigation"
      }
    },
    "goal": {
      "label": "Desired outcome",
      "placeholder": "e.g. recover US$250k, dismiss the claim, settle within 60 days"
    },
    "case-builder:facts_date": {
      "label": "When did the key events happen?",
      "placeholder": "e.g. March 2024 – January 2025"
    },
    "compare": {
      "label": "Compare with (countries/states, comma separated)",
      "placeholder": "e.g. Singapore, Malaysia, Delaware, England"
    },
    "statute:instrument": {
      "label": "Law / regulation and articles",
      "placeholder": "e.g. UU 27/2022 Art. 20–25; GDPR Art. 6; Companies Act 2006 s.172"
    },
    "constitutional:target": {
      "label": "Norm or act being challenged"
    },
    "regulatory-radar:business": {
      "label": "Your business / sector",
      "placeholder": "e.g. digital lending platform, 200 staff"
    },
    "horizon": {
      "label": "Time horizon",
      "options": {
        "6": "Last & next 6 months",
        "12": "Last & next 12 months",
        "24": "Last & next 24 months"
      }
    },
    "contract-review:side": {
      "label": "Your side in the contract",
      "placeholder": "e.g. the supplier / the tenant / the buyer"
    },
    "appetite": {
      "label": "Risk appetite",
      "options": {
        "balanced": "Balanced",
        "conservative": "Conservative (protect my side)",
        "commercial": "Commercial (close the deal)"
      }
    },
    "playbook": {
      "label": "Your playbook / must-haves (optional)",
      "placeholder": "e.g. liability cap = 12 months fees; governing law Indonesia; 30-day payment"
    },
    "type": {
      "label": "Contract type",
      "placeholder": "e.g. SaaS agreement, share purchase, distribution, employment, NDA, lease"
    },
    "contract-draft:side": {
      "label": "Drafted in favour of"
    },
    "bilingual": {
      "label": "Bilingual version",
      "options": {
        "no": "No",
        "en-id": "English + Indonesian (two columns)",
        "en-local": "English + local official language"
      }
    },
    "negotiation:side": {
      "label": "Your side"
    },
    "deal": {
      "label": "Transaction",
      "placeholder": "e.g. acquisition of 70% of PT X by a foreign investor"
    },
    "materiality": {
      "label": "Materiality threshold",
      "placeholder": "e.g. contracts above US$50k"
    },
    "entity": {
      "label": "Entity type",
      "placeholder": "e.g. PT PMA, LLC, private limited company"
    },
    "doc-compare:side": {
      "label": "Your side (optional)"
    },
    "budget": {
      "label": "Budget / constraints"
    },
    "pleadings:doctype": {
      "label": "Document to draft",
      "options": {
        "claim": "Statement of claim / gugatan",
        "answer": "Answer / defence (jawaban, eksepsi)",
        "reply": "Reply / replik",
        "rejoinder": "Rejoinder / duplik",
        "conclusion": "Closing submissions / kesimpulan",
        "appeal": "Appeal memorandum / memori banding",
        "counter-appeal": "Counter-appeal memorandum",
        "cassation": "Cassation memorandum / memori kasasi",
        "review": "Review petition / memori PK",
        "motion": "Motion / application (interim relief, etc.)",
        "complaint-crim": "Criminal complaint / police report",
        "pledoi": "Defence plea (pledoi)",
        "petition-const": "Constitutional petition"
      }
    },
    "witness": {
      "label": "Witness (name/role)"
    },
    "rules": {
      "label": "Institution / rules",
      "placeholder": "e.g. SIAC, ICC, BANI, UNCITRAL, LCIA, HKIAC"
    },
    "demand-settlement:doctype": {
      "label": "Document",
      "options": {
        "demand": "Demand / notice of default (somasi)",
        "response": "Response to a demand",
        "settlement": "Settlement agreement",
        "valuation": "Settlement valuation only"
      }
    },
    "criminal:facts_date": {
      "label": "Date of the alleged acts"
    },
    "compliance-gap:business": {
      "label": "Business, activities and size",
      "placeholder": "e.g. online marketplace, 1M users, payments via partners, data stored in Singapore"
    },
    "processing": {
      "label": "Processing activity",
      "placeholder": "e.g. biometric attendance for 2,000 employees, processed by a vendor in India"
    },
    "privacy:doctype": {
      "label": "Output",
      "options": {
        "dpia": "Full DPIA",
        "ropa": "Record of processing (RoPA)",
        "transfer": "Cross-border transfer assessment",
        "breach": "Breach response plan / notification",
        "policy": "Privacy notice / policy"
      }
    },
    "subject": {
      "label": "Customer / transaction"
    },
    "worker": {
      "label": "Employee details (for calculations)",
      "placeholder": "contract type, start date, monthly wage & fixed allowances, reason for termination"
    },
    "asset": {
      "label": "IP asset / issue"
    },
    "tax_year": {
      "label": "Tax year / period"
    },
    "esg:business": {
      "label": "Company profile"
    },
    "system": {
      "label": "AI system / use case"
    },
    "opinion-letter:doctype": {
      "label": "Document",
      "options": {
        "advice": "Client advice letter",
        "opinion": "Formal legal opinion (pendapat hukum)",
        "memo": "Internal memo",
        "letter": "Letter to authority / counterparty"
      }
    },
    "recipient": {
      "label": "Recipient"
    },
    "legislative:instrument": {
      "label": "Instrument type",
      "placeholder": "e.g. Perda Kabupaten, ministerial regulation, company bylaw, bill"
    },
    "translation:target": {
      "label": "Translate into",
      "placeholder": "e.g. English, Bahasa Indonesia, Arabic"
    },
    "layout": {
      "label": "Layout",
      "options": {
        "plain": "Translation only",
        "side": "Side-by-side table"
      }
    },
    "trigger": {
      "label": "Trigger event and date",
      "placeholder": "e.g. judgment pronounced 14 Aug 2026; notice received 2 Sep 2026"
    }
  }
};

export type LegalWsDict = typeof en;

export const LEGALWS: Record<Lang, LegalWsDict> = {
  en,
  id: {
    "groups": {
      "research": "Riset & analisis",
      "transactions": "Kontrak & transaksi",
      "disputes": "Litigasi & sengketa",
      "compliance": "Kepatuhan & risiko",
      "drafting": "Drafting & komunikasi"
    },
    "areaGroups": {
      "General": "Umum",
      "Public law": "Hukum publik",
      "Private & commercial": "Perdata & komersial",
      "Technology & IP": "Teknologi & HKI",
      "People": "Orang & keluarga",
      "Criminal & compliance": "Pidana & kepatuhan",
      "Sectors": "Sektor",
      "Disputes": "Sengketa"
    },
    "areas": {
      "general": "Umum / belum tahu",
      "constitutional": "Hukum tata negara",
      "administrative": "Hukum administrasi & perizinan",
      "procurement": "Pengadaan barang/jasa & KPBU",
      "human-rights": "Hak asasi manusia",
      "international": "Hukum internasional publik & perjanjian",
      "elections": "Pemilu & partai politik",
      "contracts": "Kontrak & perikatan",
      "torts": "Perbuatan melawan hukum & tanggung gugat",
      "corporate": "Hukum perusahaan & korporasi",
      "ma": "Merger & akuisisi",
      "capital-markets": "Pasar modal & efek",
      "banking": "Perbankan & pembiayaan",
      "fintech": "Fintech, pembayaran & aset kripto",
      "insurance": "Asuransi",
      "competition": "Persaingan usaha / antimonopoli",
      "consumer": "Perlindungan konsumen",
      "insolvency": "Kepailitan & restrukturisasi (PKPU)",
      "real-estate": "Pertanahan & properti",
      "construction": "Konstruksi",
      "franchise": "Waralaba, keagenan & distribusi",
      "ip": "Kekayaan intelektual",
      "privacy": "Pelindungan data pribadi",
      "cyber": "Keamanan siber",
      "ai-tech": "Regulasi AI & teknologi",
      "telecom-media": "Telekomunikasi, media & penyiaran",
      "employment": "Ketenagakerjaan",
      "immigration": "Imigrasi & kewarganegaraan",
      "family": "Hukum keluarga & perkawinan",
      "succession": "Waris, wasiat & trust",
      "health": "Kesehatan & farmasi",
      "education": "Pendidikan",
      "nonprofit": "Yayasan, perkumpulan & keagamaan",
      "indigenous": "Hukum adat & masyarakat adat",
      "criminal": "Hukum pidana & acara pidana",
      "white-collar": "Kejahatan kerah putih & investigasi",
      "aml": "APU-PPT & sanksi",
      "anti-corruption": "Antikorupsi & kepatuhan etik",
      "tax": "Perpajakan",
      "trade": "Perdagangan, kepabeanan & kontrol ekspor",
      "environment": "Lingkungan hidup, iklim & SDA",
      "energy": "Energi, pertambangan & infrastruktur",
      "maritime": "Maritim, pelayaran & penerbangan",
      "transport": "Transportasi & logistik",
      "agri-food": "Pertanian & pangan",
      "islamic-finance": "Keuangan syariah & kepatuhan syariah",
      "esg": "ESG & tata kelola perusahaan",
      "sports-ent": "Olahraga, media & hiburan",
      "litigation": "Litigasi & hukum acara perdata",
      "arbitration": "Arbitrase & APS"
    },
    "regions": {
      "supranational": "Internasional & UE",
      "asia": "Asia",
      "middle-east": "Timur Tengah",
      "europe": "Eropa",
      "americas": "Amerika",
      "africa": "Afrika",
      "oceania": "Oseania"
    },
    "special": {
      "EU": "Uni Eropa (hukum UE)",
      "INT": "Hukum internasional publik & traktat"
    },
    "citations": {
      "auto": "Standar setempat untuk yurisdiksi",
      "bluebook": "Bluebook (AS)",
      "oscola": "OSCOLA (Inggris)",
      "aglc": "AGLC (Australia)",
      "mcgill": "McGill Guide (Kanada)",
      "id": "Praktik Indonesia (Pasal/ayat, Putusan No.)",
      "eu": "Gaya resmi UE (ECLI, rujukan OJ)"
    },
    "traditions": {
      "civil": "Civil law (Eropa kontinental)",
      "common": "Common law",
      "islamic": "Hukum Islam (syariah)",
      "customary": "Hukum adat",
      "socialist": "Hukum sosialis"
    },
    "ws": {
      "research": {
        "name": "Memo riset hukum",
        "desc": "Memo riset setingkat partner: aturannya, sumbernya, cara pengadilan menerapkannya, dan artinya bagi fakta Anda.",
        "starters": [
          "Bolehkah perusahaan mem-PHK karyawan yang sering terlambat, dan berapa pesangonnya?",
          "Apa syarat sah tanda tangan elektronik dan apakah dapat menjadi alat bukti?",
          "Apakah klausul non-kompetisi berlaku setelah hubungan kerja berakhir?"
        ]
      },
      "case-builder": {
        "name": "Case builder — susun ulang perkara",
        "desc": "Unggah dokumen perkara: dapatkan para pihak, kronologi, pokok masalah, dasar hukum dari konstitusi sampai peraturan daerah, analisis per unsur, kekurangan bukti dan strategi — berdasarkan hukum terbaru.",
        "starters": [
          "Susun ulang berkas perkara ini dan jelaskan poin terkuat dan terlemah kami.",
          "Susun ulang perkara berdasarkan hukum yang berlaku sekarang dan tandai apa yang berubah sejak peristiwa terjadi.",
          "Siapkan ringkasan perkara siap litigasi untuk rapat dengan partner."
        ]
      },
      "multi-jurisdiction": {
        "name": "Perbandingan multi-yurisdiksi",
        "desc": "Bandingkan perlakuan hingga 8 negara atau negara bagian atas pertanyaan yang sama — berdampingan, dengan rekomendasi struktur.",
        "starters": [
          "Bandingkan kewajiban notifikasi kebocoran data di yurisdiksi ini.",
          "Di mana paling mudah mendirikan holding company untuk Asia Tenggara dan mengapa?"
        ]
      },
      "statute": {
        "name": "Penjelas pasal & peraturan",
        "desc": "Jelaskan undang-undang pasal demi pasal: makna, perubahan, peraturan pelaksana, tafsir pengadilan, dan dampak praktis.",
        "starters": [
          "Jelaskan pasal-pasal ini, perubahannya, dan cara pengadilan menafsirkannya.",
          "Peraturan pelaksana apa saja yang ada untuk UU ini dan apa tambahannya?"
        ]
      },
      "constitutional": {
        "name": "Uji konstitusional & judicial review",
        "desc": "Uji UU, peraturan, atau tindakan pemerintah terhadap UUD atau peraturan yang lebih tinggi: legal standing, dasar pengujian, preseden, dan kerangka permohonan.",
        "starters": [
          "Apakah peraturan ini dapat diuji karena bertentangan dengan UUD?",
          "Buat kerangka permohonan pengujian dengan legal standing dan batu uji konstitusional."
        ]
      },
      "judgment": {
        "name": "Analisis putusan",
        "desc": "Unggah putusan atau putusan arbitrase: amar, ratio decidendi, obiter, peta pertimbangan, nilai preseden, dan dasar upaya hukum.",
        "starters": [
          "Analisis putusan ini dan daftarkan alasan banding/kasasi.",
          "Ringkas ratio decidendi-nya dan pengaruhnya pada perkara kami yang sedang berjalan."
        ]
      },
      "regulatory-radar": {
        "name": "Radar regulasi & dampak",
        "desc": "Apa yang berubah, apa yang akan datang, dan artinya bagi bisnis Anda — lengkap dengan rencana aksi dan tenggat.",
        "starters": [
          "Perubahan regulasi apa yang memengaruhi sektor saya dan apa yang harus kami lakukan?",
          "Buat kalender kepatuhan untuk tenggat yang akan datang."
        ]
      },
      "citation-check": {
        "name": "Pemeriksa sitasi & dasar hukum",
        "desc": "Periksa setiap sitasi dalam memo, gugatan, atau jawaban AI: format, keberadaan, status berlaku, dan apakah mendukung dalilnya.",
        "starters": [
          "Periksa semua sitasi dalam dokumen ini dan tandai yang meragukan.",
          "Pastikan peraturan-peraturan ini masih berlaku dan nomornya benar."
        ]
      },
      "contract-review": {
        "name": "Review & redline kontrak",
        "desc": "Review pasal demi pasal untuk pihak Anda: risiko, perlindungan yang hilang, keberlakuan menurut hukum setempat, dan usulan redline.",
        "starters": [
          "Review kontrak ini untuk pihak saya dan usulkan redline.",
          "Apa 10 risiko teratas dalam perjanjian ini dan bagaimana memperbaikinya?",
          "Periksa kontrak ini terhadap playbook saya."
        ]
      },
      "contract-draft": {
        "name": "Penyusunan kontrak",
        "desc": "Susun kontrak lengkap yang berlaku secara lokal dari term sheet atau deskripsi — dengan catatan drafting dan alternatif klausul.",
        "starters": [
          "Susun NDA timbal balik yang tunduk pada hukum setempat.",
          "Susun perjanjian pengembangan software dari ketentuan ini."
        ]
      },
      "negotiation": {
        "name": "Strategi & playbook negosiasi",
        "desc": "Posisi, BATNA, tangga konsesi, dan jawaban kata demi kata atas permintaan pihak lawan.",
        "starters": [
          "Siapkan playbook negosiasi saya untuk ketentuan kontrak ini.",
          "Bagaimana saya menanggapi markup dari pihak lawan?"
        ]
      },
      "due-diligence": {
        "name": "Uji tuntas (due diligence)",
        "desc": "Review data room: korporasi, kontrak, perizinan, ketenagakerjaan, HKI, sengketa, pajak, dan kepatuhan — dengan laporan red flag dan daftar CP.",
        "starters": [
          "Buat laporan due diligence red flag dari dokumen-dokumen ini.",
          "Daftarkan conditions precedent dan indemnitas khusus yang kami butuhkan."
        ]
      },
      "corporate-secretarial": {
        "name": "Korporasi & kesekretariatan",
        "desc": "Keputusan direksi & RUPS, notulen, perubahan anggaran dasar, pelaporan, dan matriks persetujuan sesuai formalitas setempat.",
        "starters": [
          "Susun keputusan sirkuler pemegang saham untuk mengangkat direktur baru.",
          "Persetujuan dan pelaporan apa yang dibutuhkan untuk menerbitkan saham baru?"
        ]
      },
      "doc-compare": {
        "name": "Perbandingan dokumen",
        "desc": "Bandingkan dua versi kontrak atau peraturan: setiap perubahan, siapa yang diuntungkan, dan akibat hukumnya.",
        "starters": [
          "Bandingkan dua versi ini dan jelaskan setiap perubahan.",
          "Apa yang diubah UU baru dibandingkan UU lama?"
        ]
      },
      "litigation-strategy": {
        "name": "Strategi litigasi & penilaian perkara",
        "desc": "Pokok perkara, forum, tuntutan, biaya dan waktu — dengan rentang peluang menang dan rencana langkah demi langkah.",
        "starters": [
          "Sebaiknya menggugat atau berdamai? Beri saya angka dan rencananya.",
          "Nilai peluang kami dan forum terbaik."
        ]
      },
      "pleadings": {
        "name": "Gugatan & dokumen pengadilan",
        "desc": "Susun gugatan, jawaban, replik, duplik, memori banding, memori kasasi, dan PK sesuai format pengadilan setempat.",
        "starters": [
          "Susun gugatan wanprestasi dengan permohonan sita jaminan.",
          "Susun jawaban kami termasuk eksepsi kompetensi."
        ]
      },
      "chronology": {
        "name": "Kronologi & matriks bukti",
        "desc": "Ubah tumpukan dokumen menjadi kronologi bersumber dan matriks bukti per pokok masalah.",
        "starters": [
          "Buat kronologi bersumber dari semua dokumen ini.",
          "Fakta mana yang terbukti, dibantah, atau belum terbukti?"
        ]
      },
      "witness-prep": {
        "name": "Persiapan saksi & pemeriksaan silang",
        "desc": "Rencana pertanyaan untuk pemeriksaan saksi & silang, jawaban yang diperkirakan, jebakan, dan bahan untuk melemahkan kesaksian.",
        "starters": [
          "Siapkan pertanyaan pemeriksaan silang untuk saksi ini.",
          "Persiapkan saksi kami untuk memberikan keterangan."
        ]
      },
      "adversary": {
        "name": "Simulasi pihak lawan & hakim",
        "desc": "Uji ketahanan perkara Anda: serangan terbaik pihak lawan, lalu bagaimana hakim kemungkinan menimbang dan memutus.",
        "starters": [
          "Serang perkara kami seperti yang dilakukan kuasa hukum lawan terbaik.",
          "Tulis putusan yang kemungkinan dijatuhkan hakim yang cermat."
        ]
      },
      "arbitration": {
        "name": "Arbitrase & APS",
        "desc": "Cek kesehatan klausul, pemberitahuan arbitrase, strategi majelis, tindakan sementara, dan analisis pembatalan/eksekusi.",
        "starters": [
          "Apakah klausul arbitrase kami sah dan apa risikonya?",
          "Susun pemberitahuan arbitrase (notice of arbitration).",
          "Apakah putusan arbitrase ini dapat dieksekusi di negara yang dipilih?"
        ]
      },
      "demand-settlement": {
        "name": "Somasi & perdamaian",
        "desc": "Surat somasi/teguran resmi dan akta perdamaian, dengan penilaian angka yang layak diterima.",
        "starters": [
          "Susun somasi untuk tagihan yang belum dibayar.",
          "Berapa nilai damai yang sebaiknya kami terima?"
        ]
      },
      "criminal": {
        "name": "Analisis perkara pidana",
        "desc": "Unsur delik, alat bukti, hukum acara & hak tersangka, pembelaan, rentang pidana, serta dampak KUHP/kode pidana baru.",
        "starters": [
          "Analisis apakah unsur-unsur delik terpenuhi.",
          "Apakah KUHP baru mengubah hasil untuk fakta ini?"
        ]
      },
      "compliance-gap": {
        "name": "Analisis gap kepatuhan",
        "desc": "Petakan aturan yang berlaku untuk bisnis Anda, temukan kekurangannya, dan dapatkan rencana perbaikan berprioritas.",
        "starters": [
          "Izin dan kewajiban kepatuhan apa yang berlaku untuk bisnis saya?",
          "Audit praktik kami saat ini terhadap peraturan."
        ]
      },
      "privacy": {
        "name": "Pelindungan data & DPIA",
        "desc": "Dasar pemrosesan, catatan pemrosesan, transfer lintas negara, respons kebocoran, dan DPIA lengkap — UU PDP, GDPR, PDPA, dan lainnya.",
        "starters": [
          "Lakukan DPIA untuk kegiatan pemrosesan ini.",
          "Terjadi kebocoran data — apa yang harus kami lakukan dan kapan tenggatnya?"
        ]
      },
      "aml-kyc": {
        "name": "APU-PPT/KYC & sanksi",
        "desc": "Penilaian risiko nasabah, analisis pemilik manfaat, red flag, logika screening sanksi & kontrol ekspor, dan draf laporan transaksi mencurigakan.",
        "starters": [
          "Nilai risiko nasabah ini dan daftarkan langkah EDD.",
          "Apakah transaksi ini perlu dilaporkan sebagai transaksi mencurigakan?"
        ]
      },
      "employment": {
        "name": "Ketenagakerjaan & HR",
        "desc": "Rekrutmen, perjanjian kerja, prosedur PHK, perhitungan pesangon, peraturan perusahaan, dan perselisihan hubungan industrial.",
        "starters": [
          "Hitung pesangon untuk PHK ini beserta prosedur yang benar.",
          "Apakah PKWT ini sah atau berubah menjadi PKWTT?"
        ]
      },
      "ip": {
        "name": "Kliring & pelindungan HKI",
        "desc": "Strategi merek/hak cipta/paten/desain, risiko pelanggaran, lisensi, dan opsi penegakan.",
        "starters": [
          "Bisakah merek ini didaftarkan dan apa risiko konfliknya?",
          "Produk kami ditiru — apa pilihan kami?"
        ]
      },
      "tax": {
        "name": "Analisis pajak",
        "desc": "Analisis PPh badan & orang pribadi, PPN, pemotongan, BUT, dan tax treaty dengan perhitungan dan jalur sengketa.",
        "starters": [
          "Pajak apa yang berlaku untuk pengaturan jasa lintas negara ini?",
          "Kami menerima SKP — bagaimana mengajukan keberatan dan kapan tenggatnya?"
        ]
      },
      "esg": {
        "name": "ESG & keberlanjutan",
        "desc": "Pelaporan keberlanjutan wajib, uji tuntas rantai pasok, risiko greenwashing, dan kewajiban direksi.",
        "starters": [
          "Aturan pelaporan keberlanjutan mana yang berlaku bagi kami dan kapan?",
          "Review klaim pemasaran kami untuk risiko greenwashing."
        ]
      },
      "ai-governance": {
        "name": "Tata kelola AI & regulasi teknologi",
        "desc": "Klasifikasikan sistem AI (mis. tingkat risiko EU AI Act), petakan kewajiban, susun kebijakan AI dan ketentuan vendor.",
        "starters": [
          "Klasifikasikan kasus penggunaan AI kami dan daftarkan kewajibannya.",
          "Susun kebijakan internal penggunaan AI generatif."
        ]
      },
      "opinion-letter": {
        "name": "Pendapat hukum & surat nasihat",
        "desc": "Pendapat hukum resmi dan surat nasihat klien lengkap dengan asumsi, kualifikasi, dan rekomendasi yang jelas.",
        "starters": [
          "Tulis pendapat hukum apakah transaksi ini diperbolehkan.",
          "Tulis surat nasihat kepada klien yang menjelaskan pilihan mereka."
        ]
      },
      "plain-language": {
        "name": "Penjelasan bahasa awam",
        "desc": "Jelaskan kontrak, putusan, surat panggilan, atau peraturan kepada orang awam: artinya apa, apa yang harus dilakukan, dan kapan.",
        "starters": [
          "Jelaskan dokumen ini dengan bahasa sederhana. Apa yang harus saya lakukan?",
          "Saya menerima relaas panggilan sidang — apa yang terjadi selanjutnya?"
        ]
      },
      "legislative": {
        "name": "Perancangan peraturan & kebijakan",
        "desc": "Susun RUU, peraturan, perda, peraturan internal, dan naskah akademik dengan analisis dampak regulasi.",
        "starters": [
          "Susun ranperda tentang topik ini beserta kerangka naskah akademiknya.",
          "Review RUU ini untuk cacat teknik perancangan."
        ]
      },
      "translation": {
        "name": "Terjemahan hukum",
        "desc": "Terjemahan hukum yang presisi dengan istilah konsisten, glosarium dua bahasa, dan catatan konsep yang tidak padan.",
        "starters": [
          "Terjemahkan kontrak ini ke bahasa Inggris dengan istilah hukum yang presisi.",
          "Terjemahkan putusan ini ke bahasa Indonesia."
        ]
      },
      "deadlines": {
        "name": "Kalkulator tenggat & daluwarsa",
        "desc": "Tenggat acara dan daluwarsa, dihitung dari tanggal Anda dengan aturan penghitungan yang ditunjukkan.",
        "starters": [
          "Apa saja tenggat kami setelah putusan ini?",
          "Apakah gugatan ini sudah daluwarsa?"
        ]
      },
      "ask": {
        "name": "Tanya apa saja (hukum)",
        "desc": "Jawaban cepat dan bersumber untuk pertanyaan hukum apa pun — dengan dasar hukum, statusnya, dan yang perlu diverifikasi.",
        "starters": [
          "Berapa modal minimum untuk mendirikan perusahaan PMA?",
          "Bolehkah saya merekam percakapan telepon tanpa persetujuan?",
          "Apa hak saya jika penerbangan dibatalkan?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "Pertanyaan riset (opsional)"
      },
      "role": {
        "label": "Anda mewakili",
        "options": {
          "neutral": "Netral / objektif",
          "claimant": "Penggugat / pemohon",
          "defendant": "Tergugat / termohon",
          "prosecution": "Penuntut umum / penyidik",
          "defence": "Penasihat hukum terdakwa",
          "judge": "Hakim / arbiter (draf pertimbangan)",
          "inhouse": "In-house counsel / perusahaan",
          "regulator": "Regulator / pemerintah",
          "individual": "Perorangan (bukan praktisi hukum)"
        }
      },
      "stage": {
        "label": "Tahap / forum",
        "options": {
          "pre": "Pra-perkara / konsultasi",
          "first": "Pengadilan tingkat pertama",
          "appeal": "Banding",
          "cassation": "Kasasi / Mahkamah Agung",
          "review": "Peninjauan kembali (PK)",
          "constitutional": "Mahkamah Konstitusi",
          "administrative": "PTUN / tribunal administrasi",
          "arbitration": "Arbitrase",
          "mediation": "Mediasi / negosiasi",
          "investigation": "Penyelidikan / penyidikan"
        }
      },
      "goal": {
        "label": "Hasil yang diinginkan",
        "placeholder": "mis. pulihkan US$250 rb, gugatan ditolak, damai dalam 60 hari"
      },
      "case-builder:facts_date": {
        "label": "Kapan peristiwa utama terjadi?",
        "placeholder": "mis. Maret 2024 – Januari 2025"
      },
      "compare": {
        "label": "Bandingkan dengan (negara/negara bagian, pisahkan koma)",
        "placeholder": "mis. Singapura, Malaysia, Delaware, Inggris"
      },
      "statute:instrument": {
        "label": "UU / peraturan dan pasal",
        "placeholder": "mis. UU 27/2022 Pasal 20–25; GDPR Pasal 6; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "Norma atau tindakan yang diuji"
      },
      "regulatory-radar:business": {
        "label": "Bisnis / sektor Anda",
        "placeholder": "mis. platform pinjaman digital, 200 karyawan"
      },
      "horizon": {
        "label": "Rentang waktu",
        "options": {
          "6": "6 bulan terakhir & ke depan",
          "12": "12 bulan terakhir & ke depan",
          "24": "24 bulan terakhir & ke depan"
        }
      },
      "contract-review:side": {
        "label": "Posisi Anda dalam kontrak",
        "placeholder": "mis. pemasok / penyewa / pembeli"
      },
      "appetite": {
        "label": "Toleransi risiko",
        "options": {
          "balanced": "Seimbang",
          "conservative": "Konservatif (lindungi pihak saya)",
          "commercial": "Komersial (utamakan deal jalan)"
        }
      },
      "playbook": {
        "label": "Playbook / syarat wajib Anda (opsional)",
        "placeholder": "mis. batas tanggung jawab = biaya 12 bulan; hukum Indonesia; pembayaran 30 hari"
      },
      "type": {
        "label": "Jenis kontrak",
        "placeholder": "mis. perjanjian SaaS, jual beli saham, distribusi, kerja, NDA, sewa"
      },
      "contract-draft:side": {
        "label": "Disusun untuk kepentingan"
      },
      "bilingual": {
        "label": "Versi dua bahasa",
        "options": {
          "no": "Tidak",
          "en-id": "Inggris + Indonesia (dua kolom)",
          "en-local": "Inggris + bahasa resmi setempat"
        }
      },
      "negotiation:side": {
        "label": "Pihak Anda"
      },
      "deal": {
        "label": "Transaksi",
        "placeholder": "mis. akuisisi 70% saham PT X oleh investor asing"
      },
      "materiality": {
        "label": "Ambang materialitas",
        "placeholder": "mis. kontrak di atas US$50 rb"
      },
      "entity": {
        "label": "Jenis badan",
        "placeholder": "mis. PT PMA, LLC, private limited company"
      },
      "doc-compare:side": {
        "label": "Pihak Anda (opsional)"
      },
      "budget": {
        "label": "Anggaran / batasan"
      },
      "pleadings:doctype": {
        "label": "Dokumen yang disusun",
        "options": {
          "claim": "Gugatan",
          "answer": "Jawaban (termasuk eksepsi)",
          "reply": "Replik",
          "rejoinder": "Duplik",
          "conclusion": "Kesimpulan",
          "appeal": "Memori banding",
          "counter-appeal": "Kontra memori banding",
          "cassation": "Memori kasasi",
          "review": "Memori peninjauan kembali",
          "motion": "Permohonan (provisi, sita jaminan, dll.)",
          "complaint-crim": "Laporan/pengaduan pidana",
          "pledoi": "Pledoi",
          "petition-const": "Permohonan uji materi"
        }
      },
      "witness": {
        "label": "Saksi (nama/peran)"
      },
      "rules": {
        "label": "Lembaga / aturan",
        "placeholder": "mis. SIAC, ICC, BANI, UNCITRAL, LCIA, HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "Dokumen",
        "options": {
          "demand": "Somasi / teguran wanprestasi",
          "response": "Tanggapan atas somasi",
          "settlement": "Akta/perjanjian perdamaian",
          "valuation": "Penilaian nilai damai saja"
        }
      },
      "criminal:facts_date": {
        "label": "Tanggal perbuatan yang disangkakan"
      },
      "compliance-gap:business": {
        "label": "Bisnis, kegiatan, dan skala",
        "placeholder": "mis. marketplace online, 1 juta pengguna, pembayaran lewat mitra, data disimpan di Singapura"
      },
      "processing": {
        "label": "Kegiatan pemrosesan",
        "placeholder": "mis. absensi biometrik untuk 2.000 karyawan, diproses vendor di India"
      },
      "privacy:doctype": {
        "label": "Keluaran",
        "options": {
          "dpia": "DPIA lengkap",
          "ropa": "Catatan pemrosesan (RoPA)",
          "transfer": "Asesmen transfer lintas negara",
          "breach": "Rencana respons / notifikasi kebocoran",
          "policy": "Pemberitahuan / kebijakan privasi"
        }
      },
      "subject": {
        "label": "Nasabah / transaksi"
      },
      "worker": {
        "label": "Data karyawan (untuk perhitungan)",
        "placeholder": "jenis kontrak, tanggal mulai, upah bulanan & tunjangan tetap, alasan PHK"
      },
      "asset": {
        "label": "Aset / isu HKI"
      },
      "tax_year": {
        "label": "Tahun / masa pajak"
      },
      "esg:business": {
        "label": "Profil perusahaan"
      },
      "system": {
        "label": "Sistem / kasus penggunaan AI"
      },
      "opinion-letter:doctype": {
        "label": "Dokumen",
        "options": {
          "advice": "Surat nasihat klien",
          "opinion": "Pendapat hukum formal",
          "memo": "Memo internal",
          "letter": "Surat ke instansi / pihak lain"
        }
      },
      "recipient": {
        "label": "Penerima"
      },
      "legislative:instrument": {
        "label": "Jenis instrumen",
        "placeholder": "mis. Perda Kabupaten, peraturan menteri, peraturan perusahaan, RUU"
      },
      "translation:target": {
        "label": "Terjemahkan ke",
        "placeholder": "mis. Inggris, Bahasa Indonesia, Arab"
      },
      "layout": {
        "label": "Tata letak",
        "options": {
          "plain": "Terjemahan saja",
          "side": "Tabel berdampingan"
        }
      },
      "trigger": {
        "label": "Peristiwa pemicu dan tanggal",
        "placeholder": "mis. putusan dibacakan 14 Agu 2026; somasi diterima 2 Sep 2026"
      }
    }
  },
  ms: {
    "groups": {
      "research": "Penyelidikan & analisis",
      "transactions": "Kontrak & transaksi",
      "disputes": "Litigasi & pertikaian",
      "compliance": "Pematuhan & risiko",
      "drafting": "Penggubalan & komunikasi"
    },
    "areaGroups": {
      "General": "Umum",
      "Public law": "Undang-undang awam",
      "Private & commercial": "Sivil & komersial",
      "Technology & IP": "Teknologi & HKI",
      "People": "Individu & keluarga",
      "Criminal & compliance": "Jenayah & pematuhan",
      "Sectors": "Sektor",
      "Disputes": "Pertikaian"
    },
    "areas": {
      "general": "Umum / tidak pasti",
      "constitutional": "Undang-undang perlembagaan",
      "administrative": "Undang-undang pentadbiran & pelesenan",
      "procurement": "Perolehan awam & PPP",
      "human-rights": "Hak asasi manusia",
      "international": "Undang-undang antarabangsa awam & triti",
      "elections": "Pilihan raya & parti politik",
      "contracts": "Kontrak & obligasi",
      "torts": "Tort / perbuatan salah & liabiliti",
      "corporate": "Undang-undang korporat & syarikat",
      "ma": "Penggabungan & pengambilalihan",
      "capital-markets": "Pasaran modal & sekuriti",
      "banking": "Perbankan & kewangan",
      "fintech": "Fintech, pembayaran & aset kripto",
      "insurance": "Insurans",
      "competition": "Persaingan / antitrust",
      "consumer": "Perlindungan pengguna",
      "insolvency": "Insolvensi & penstrukturan semula",
      "real-estate": "Hartanah & tanah",
      "construction": "Pembinaan & kejuruteraan",
      "franchise": "Francais, agensi & pengedaran",
      "ip": "Harta intelek",
      "privacy": "Perlindungan data & privasi",
      "cyber": "Keselamatan siber",
      "ai-tech": "Peraturan AI & teknologi",
      "telecom-media": "Telekomunikasi, media & penyiaran",
      "employment": "Pekerjaan & buruh",
      "immigration": "Imigresen & kewarganegaraan",
      "family": "Keluarga & status peribadi",
      "succession": "Pewarisan, wasiat & amanah",
      "health": "Kesihatan & sains hayat",
      "education": "Pendidikan",
      "nonprofit": "Badan bukan untung, yayasan & agama",
      "indigenous": "Undang-undang adat & orang asal",
      "criminal": "Undang-undang & prosedur jenayah",
      "white-collar": "Jenayah kolar putih & siasatan",
      "aml": "AML/CFT & sekatan",
      "anti-corruption": "Pematuhan antirasuah & etika",
      "tax": "Cukai",
      "trade": "Perdagangan, kastam & kawalan eksport",
      "environment": "Alam sekitar, iklim & sumber asli",
      "energy": "Tenaga, perlombongan & infrastruktur",
      "maritime": "Maritim, perkapalan & penerbangan",
      "transport": "Pengangkutan & logistik",
      "agri-food": "Pertanian & makanan",
      "islamic-finance": "Kewangan Islam & pematuhan Syariah",
      "esg": "ESG & tadbir urus korporat",
      "sports-ent": "Sukan, media & hiburan",
      "litigation": "Litigasi & prosedur sivil",
      "arbitration": "Timbang tara & ADR"
    },
    "regions": {
      "supranational": "Antarabangsa & EU",
      "asia": "Asia",
      "middle-east": "Timur Tengah",
      "europe": "Eropah",
      "americas": "Amerika",
      "africa": "Afrika",
      "oceania": "Oceania"
    },
    "special": {
      "EU": "Kesatuan Eropah (undang-undang EU)",
      "INT": "Undang-undang antarabangsa awam & triti"
    },
    "citations": {
      "auto": "Piawaian tempatan bagi bidang kuasa",
      "bluebook": "Bluebook (AS)",
      "oscola": "OSCOLA (UK)",
      "aglc": "AGLC (Australia)",
      "mcgill": "McGill Guide (Kanada)",
      "id": "Amalan Indonesia (Pasal/ayat, Putusan No.)",
      "eu": "Gaya rasmi EU (ECLI, rujukan OJ)"
    },
    "traditions": {
      "civil": "Undang-undang sivil",
      "common": "Common law",
      "islamic": "Undang-undang Islam (Syariah)",
      "customary": "Undang-undang adat",
      "socialist": "Undang-undang sosialis"
    },
    "ws": {
      "research": {
        "name": "Memo penyelidikan undang-undang",
        "desc": "Memo penyelidikan bertaraf rakan kongsi: peraturan, sumbernya, cara mahkamah memakainya dan maksudnya bagi fakta anda.",
        "starters": [
          "Bolehkah majikan menamatkan pekerja kerana kerap lewat, dan apakah pampasan yang perlu dibayar?",
          "Apakah syarat tandatangan elektronik yang sah dan adakah ia boleh diterima sebagai keterangan?",
          "Adakah klausa larangan bersaing boleh dikuatkuasakan selepas pekerjaan tamat?"
        ]
      },
      "case-builder": {
        "name": "Penyusun kes — susun semula fail kes",
        "desc": "Muat naik dokumen kes: dapatkan pihak, kronologi, isu undang-undang, undang-undang terpakai dari perlembagaan ke bawah, analisis elemen demi elemen, jurang keterangan dan strategi — berdasarkan undang-undang semasa.",
        "starters": [
          "Susun semula fail kes ini dan beritahu titik terkuat dan terlemah kami.",
          "Bina semula kes mengikut undang-undang semasa dan tandakan apa yang berubah sejak peristiwa berlaku.",
          "Sediakan ringkasan kes sedia litigasi untuk mesyuarat rakan kongsi."
        ]
      },
      "multi-jurisdiction": {
        "name": "Perbandingan pelbagai bidang kuasa",
        "desc": "Bandingkan cara sehingga 8 negara atau negeri menangani soalan yang sama — sebelah-menyebelah, dengan struktur yang disyorkan.",
        "starters": [
          "Bandingkan kewajipan pemberitahuan pelanggaran data di bidang kuasa ini.",
          "Di manakah paling mudah menubuhkan syarikat induk untuk Asia Tenggara dan mengapa?"
        ]
      },
      "statute": {
        "name": "Panduan statut & peraturan",
        "desc": "Terangkan mana-mana undang-undang seksyen demi seksyen: maksud, pindaan, peraturan pelaksana, tafsiran mahkamah dan kesan praktikal.",
        "starters": [
          "Terangkan seksyen-seksyen ini, pindaannya dan cara mahkamah mentafsirkannya.",
          "Apakah peraturan pelaksana yang wujud bagi undang-undang ini dan apa yang ditambahnya?"
        ]
      },
      "constitutional": {
        "name": "Semakan perlembagaan & kehakiman",
        "desc": "Uji undang-undang, peraturan atau tindakan kerajaan terhadap perlembagaan atau undang-undang lebih tinggi: locus standi, alasan, duluan dan rangka petisyen.",
        "starters": [
          "Bolehkah peraturan ini dicabar kerana bercanggah dengan perlembagaan?",
          "Gariskan petisyen semakan kehakiman dengan locus standi dan alasan perlembagaan."
        ]
      },
      "judgment": {
        "name": "Penganalisis penghakiman",
        "desc": "Muat naik penghakiman atau award: keputusan, ratio decidendi, obiter, peta penaakulan, nilai duluan dan alasan rayuan.",
        "starters": [
          "Analisis penghakiman ini dan senaraikan alasan rayuan.",
          "Ringkaskan ratio dan kesannya terhadap kes kami yang belum selesai."
        ]
      },
      "regulatory-radar": {
        "name": "Radar & impak peraturan",
        "desc": "Apa yang berubah, apa yang akan datang dan maksudnya bagi perniagaan anda — dengan pelan tindakan dan tarikh akhir.",
        "starters": [
          "Perubahan peraturan apakah yang menjejaskan sektor saya dan apa yang perlu kami lakukan?",
          "Bina kalendar pematuhan bagi tarikh akhir yang akan datang."
        ]
      },
      "citation-check": {
        "name": "Penyemak petikan & autoriti",
        "desc": "Semak setiap petikan dalam hujahan, memo atau jawapan AI: format, kewujudan, status semasa dan sama ada ia menyokong dakwaan.",
        "starters": [
          "Semak semua petikan dalam dokumen ini dan tandakan apa-apa yang meragukan.",
          "Sahkan statut ini masih berkuat kuasa dan bernombor dengan betul."
        ]
      },
      "contract-review": {
        "name": "Semakan & redline kontrak",
        "desc": "Semakan klausa demi klausa untuk pihak anda: risiko, perlindungan yang tiada, kebolehkuatkuasaan di bawah undang-undang tempatan dan cadangan redline.",
        "starters": [
          "Semak kontrak ini untuk pihak saya dan cadangkan redline.",
          "Apakah 10 risiko utama dalam perjanjian ini dan bagaimana membaikinya?",
          "Semak kontrak ini berbanding playbook saya."
        ]
      },
      "contract-draft": {
        "name": "Penggubalan kontrak",
        "desc": "Gubal kontrak lengkap yang boleh dikuatkuasakan secara tempatan daripada term sheet atau penerangan — dengan nota penggubalan dan alternatif.",
        "starters": [
          "Gubal NDA bersama di bawah undang-undang tempatan.",
          "Gubal perjanjian pembangunan perisian daripada terma ini."
        ]
      },
      "negotiation": {
        "name": "Strategi & playbook rundingan",
        "desc": "Kedudukan, BATNA, tangga konsesi dan jawapan kata demi kata kepada permintaan pihak lawan.",
        "starters": [
          "Sediakan playbook rundingan saya untuk terma kontrak ini.",
          "Bagaimanakah saya harus menjawab markup mereka?"
        ]
      },
      "due-diligence": {
        "name": "Usaha wajar (due diligence)",
        "desc": "Semak bilik data: korporat, kontrak, lesen, pekerjaan, HKI, pertikaian, cukai dan pematuhan — dengan laporan red flag dan senarai CP.",
        "starters": [
          "Hasilkan laporan due diligence red flag daripada dokumen ini.",
          "Senaraikan syarat duluan dan indemniti khusus yang kami perlukan."
        ]
      },
      "corporate-secretarial": {
        "name": "Korporat & kesetiausahaan",
        "desc": "Resolusi lembaga dan pemegang saham, minit, pindaan perlembagaan syarikat, pemfailan dan matriks kelulusan yang memenuhi formaliti tempatan.",
        "starters": [
          "Gubal resolusi pekeliling pemegang saham untuk melantik pengarah baharu.",
          "Kelulusan dan pemfailan apakah yang diperlukan untuk menerbitkan saham baharu?"
        ]
      },
      "doc-compare": {
        "name": "Perbandingan dokumen",
        "desc": "Bandingkan dua versi kontrak atau undang-undang: setiap perubahan, pihak yang diuntungkan dan kesan undang-undangnya.",
        "starters": [
          "Bandingkan dua versi ini dan terangkan setiap perubahan.",
          "Apakah yang diubah oleh undang-undang baharu berbanding yang lama?"
        ]
      },
      "litigation-strategy": {
        "name": "Strategi litigasi & penilaian kes",
        "desc": "Merit, forum, remedi, kos dan masa — dengan julat kebarangkalian menang dan pelan langkah demi langkah.",
        "starters": [
          "Patutkah kami saman atau berdamai? Beri angka dan pelannya.",
          "Nilai peluang kami dan forum terbaik."
        ]
      },
      "pleadings": {
        "name": "Pliding & dokumen mahkamah",
        "desc": "Gubal tuntutan, pembelaan, jawapan, rejoinder, memorandum rayuan, petisyen kasasi dan semakan dalam format mahkamah tempatan.",
        "starters": [
          "Gubal tuntutan pelanggaran kontrak dengan sitaan interim.",
          "Gubal pembelaan kami termasuk bantahan bidang kuasa."
        ]
      },
      "chronology": {
        "name": "Kronologi & matriks keterangan",
        "desc": "Tukar timbunan dokumen kepada garis masa bersumber dan matriks keterangan mengikut isu.",
        "starters": [
          "Bina kronologi bersumber daripada semua dokumen ini.",
          "Fakta manakah yang terbukti, dipertikaikan atau belum terbukti?"
        ]
      },
      "witness-prep": {
        "name": "Persediaan saksi & pemeriksaan balas",
        "desc": "Pelan soalan untuk pemeriksaan utama dan balas, jawapan dijangka, perangkap dan bahan menjejaskan kredibiliti.",
        "starters": [
          "Sediakan soalan pemeriksaan balas untuk saksi ini.",
          "Sediakan saksi kami untuk memberi keterangan."
        ]
      },
      "adversary": {
        "name": "Simulator peguam lawan & hakim",
        "desc": "Uji kes anda: serangan terbaik pihak lawan, kemudian cara hakim berkemungkinan menaakul dan memutuskan.",
        "starters": [
          "Serang kes kami seperti peguam lawan terbaik.",
          "Tulis penghakiman yang mungkin diberi oleh hakim yang teliti."
        ]
      },
      "arbitration": {
        "name": "Timbang tara & ADR",
        "desc": "Semakan kesihatan klausa, notis timbang tara, strategi tribunal, langkah interim, dan analisis pembatalan/penguatkuasaan.",
        "starters": [
          "Adakah klausa timbang tara kami sah dan apakah risikonya?",
          "Gubal notis timbang tara.",
          "Bolehkah award ini dikuatkuasakan di negara yang dipilih?"
        ]
      },
      "demand-settlement": {
        "name": "Surat tuntutan & penyelesaian",
        "desc": "Surat tuntutan/notis rasmi dan perjanjian penyelesaian, dengan penilaian jumlah yang wajar diterima.",
        "starters": [
          "Gubal surat tuntutan rasmi bagi invois yang belum dibayar.",
          "Berapakah jumlah penyelesaian yang patut kami terima?"
        ]
      },
      "criminal": {
        "name": "Analisis kes jenayah",
        "desc": "Elemen kesalahan, keterangan, prosedur dan hak, pembelaan, julat hukuman dan kesan kanun jenayah baharu.",
        "starters": [
          "Analisis sama ada elemen kesalahan telah dibuktikan.",
          "Adakah kanun jenayah baharu mengubah keputusan bagi fakta ini?"
        ]
      },
      "compliance-gap": {
        "name": "Analisis jurang pematuhan",
        "desc": "Petakan peraturan yang terpakai pada perniagaan anda, cari jurangnya dan dapatkan pelan pemulihan mengikut keutamaan.",
        "starters": [
          "Lesen dan kewajipan pematuhan apakah yang terpakai pada perniagaan saya?",
          "Audit amalan semasa kami berbanding undang-undang."
        ]
      },
      "privacy": {
        "name": "Perlindungan data & DPIA",
        "desc": "Asas sah, rekod pemprosesan, pemindahan rentas sempadan, respons pelanggaran dan DPIA penuh — merentasi PDP, GDPR, PDPA dan lain-lain.",
        "starters": [
          "Jalankan DPIA untuk aktiviti pemprosesan ini.",
          "Kami mengalami pelanggaran data — apa yang perlu dilakukan dan bila?"
        ]
      },
      "aml-kyc": {
        "name": "AML/KYC & sekatan",
        "desc": "Penarafan risiko pelanggan, analisis pemilikan benefisial, red flag, logik saringan sekatan dan kawalan eksport, penggubalan STR.",
        "starters": [
          "Nilai risiko pelanggan ini dan senaraikan langkah usaha wajar dipertingkat.",
          "Adakah transaksi ini memerlukan laporan transaksi mencurigakan?"
        ]
      },
      "employment": {
        "name": "Pekerjaan & HR",
        "desc": "Pengambilan, kontrak, prosedur penamatan, pengiraan pampasan, polisi dan pertikaian perhubungan perusahaan.",
        "starters": [
          "Kira pampasan bagi penamatan ini dan prosedur yang betul.",
          "Adakah kontrak tempoh tetap ini sah atau bertukar menjadi tetap?"
        ]
      },
      "ip": {
        "name": "Penjelasan & perlindungan HKI",
        "desc": "Strategi cap dagangan/hak cipta/paten/reka bentuk, risiko pelanggaran, pelesenan dan pilihan penguatkuasaan.",
        "starters": [
          "Bolehkah kami mendaftarkan jenama ini dan apakah risiko konfliknya?",
          "Seseorang meniru produk kami — apakah pilihan kami?"
        ]
      },
      "tax": {
        "name": "Analisis cukai",
        "desc": "Analisis cukai korporat, individu, VAT, pegangan, PE dan triti dengan pengiraan dan laluan pertikaian.",
        "starters": [
          "Cukai apakah yang terpakai pada susunan perkhidmatan rentas sempadan ini?",
          "Kami menerima taksiran cukai — bagaimana membantah dan bila?"
        ]
      },
      "esg": {
        "name": "ESG & kelestarian",
        "desc": "Pelaporan kelestarian wajib, usaha wajar rantaian bekalan, risiko greenwashing dan tugas lembaga.",
        "starters": [
          "Peraturan pelaporan kelestarian manakah yang terpakai kepada kami dan bila?",
          "Semak dakwaan pemasaran kami untuk risiko greenwashing."
        ]
      },
      "ai-governance": {
        "name": "Tadbir urus AI & peraturan teknologi",
        "desc": "Klasifikasikan sistem AI (cth. tahap risiko EU AI Act), petakan kewajipan, gubal polisi AI dan terma vendor.",
        "starters": [
          "Klasifikasikan kes penggunaan AI kami dan senaraikan kewajipan kami.",
          "Gubal polisi dalaman penggunaan AI generatif."
        ]
      },
      "opinion-letter": {
        "name": "Pendapat undang-undang & surat nasihat",
        "desc": "Pendapat undang-undang rasmi dan surat nasihat klien dengan andaian, kelayakan dan cadangan yang jelas.",
        "starters": [
          "Tulis pendapat undang-undang sama ada transaksi ini dibenarkan.",
          "Tulis surat nasihat kepada klien saya yang menerangkan pilihan mereka."
        ]
      },
      "plain-language": {
        "name": "Penerangan bahasa mudah",
        "desc": "Terangkan kontrak, penghakiman, saman atau undang-undang kepada bukan peguam: maksudnya, apa perlu dibuat, dan bila.",
        "starters": [
          "Terangkan dokumen ini dengan bahasa mudah. Apa yang perlu saya lakukan?",
          "Saya menerima saman mahkamah — apa yang berlaku seterusnya?"
        ]
      },
      "legislative": {
        "name": "Penggubalan perundangan & dasar",
        "desc": "Gubal rang undang-undang, peraturan, peraturan wilayah, undang-undang kecil dan kertas akademik (naskah akademik) dengan analisis impak peraturan.",
        "starters": [
          "Gubal peraturan wilayah mengenai topik ini beserta rangka kertas akademiknya.",
          "Semak draf rang undang-undang ini untuk kecacatan penggubalan."
        ]
      },
      "translation": {
        "name": "Terjemahan undang-undang",
        "desc": "Terjemahan undang-undang yang tepat dengan istilah tertakrif yang konsisten, glosari dwibahasa dan nota konsep yang sukar diterjemah.",
        "starters": [
          "Terjemahkan kontrak ini ke bahasa Inggeris dengan istilah undang-undang yang tepat.",
          "Terjemahkan penghakiman ini ke bahasa Indonesia."
        ]
      },
      "deadlines": {
        "name": "Pengira tarikh akhir & had masa",
        "desc": "Tarikh akhir prosedur dan tempoh had masa, dikira daripada tarikh anda dengan peraturan pengiraan ditunjukkan.",
        "starters": [
          "Apakah semua tarikh akhir kami selepas penghakiman ini?",
          "Adakah tempoh had masa bagi tuntutan ini telah tamat?"
        ]
      },
      "ask": {
        "name": "Tanya apa sahaja (undang-undang)",
        "desc": "Jawapan pantas bersumber untuk sebarang soalan undang-undang — dengan undang-undangnya, statusnya dan apa yang perlu disahkan.",
        "starters": [
          "Berapakah modal minimum untuk menubuhkan syarikat milik asing?",
          "Bolehkah saya merakam panggilan telefon tanpa persetujuan?",
          "Apakah hak saya jika penerbangan saya dibatalkan?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "Soalan penyelidikan (pilihan, jika tiada dalam permintaan)"
      },
      "role": {
        "label": "Anda mewakili",
        "options": {
          "neutral": "Neutral / pandangan objektif",
          "claimant": "Penuntut / plaintif / pemohon",
          "defendant": "Defendan / responden",
          "prosecution": "Pendakwaan / penyiasat",
          "defence": "Pembelaan jenayah",
          "judge": "Hakim / penimbang tara (draf penaakulan)",
          "inhouse": "Peguam dalaman / syarikat",
          "regulator": "Pengawal selia / kerajaan",
          "individual": "Individu (bukan peguam)"
        }
      },
      "stage": {
        "label": "Peringkat / forum",
        "options": {
          "pre": "Pra-tindakan / nasihat",
          "first": "Mahkamah peringkat pertama",
          "appeal": "Rayuan",
          "cassation": "Kasasi / mahkamah agung",
          "review": "Semakan luar biasa (cth. PK)",
          "constitutional": "Mahkamah perlembagaan",
          "administrative": "Mahkamah / tribunal pentadbiran",
          "arbitration": "Timbang tara",
          "mediation": "Pengantaraan / rundingan",
          "investigation": "Siasatan jenayah"
        }
      },
      "goal": {
        "label": "Hasil yang diingini",
        "placeholder": "cth. tuntut semula US$250 ribu, tuntutan ditolak, berdamai dalam 60 hari"
      },
      "case-builder:facts_date": {
        "label": "Bilakah peristiwa utama berlaku?",
        "placeholder": "cth. Mac 2024 – Januari 2025"
      },
      "compare": {
        "label": "Bandingkan dengan (negara/negeri, dipisahkan koma)",
        "placeholder": "cth. Singapura, Malaysia, Delaware, England"
      },
      "statute:instrument": {
        "label": "Undang-undang / peraturan dan seksyen",
        "placeholder": "cth. UU 27/2022 Pasal 20–25; GDPR Perkara 6; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "Norma atau tindakan yang dicabar"
      },
      "regulatory-radar:business": {
        "label": "Perniagaan / sektor anda",
        "placeholder": "cth. platform pinjaman digital, 200 kakitangan"
      },
      "horizon": {
        "label": "Tempoh masa",
        "options": {
          "6": "6 bulan lalu & akan datang",
          "12": "12 bulan lalu & akan datang",
          "24": "24 bulan lalu & akan datang"
        }
      },
      "contract-review:side": {
        "label": "Pihak anda dalam kontrak",
        "placeholder": "cth. pembekal / penyewa / pembeli"
      },
      "appetite": {
        "label": "Selera risiko",
        "options": {
          "balanced": "Seimbang",
          "conservative": "Konservatif (lindungi pihak saya)",
          "commercial": "Komersial (meterai perjanjian)"
        }
      },
      "playbook": {
        "label": "Playbook / perkara wajib anda (pilihan)",
        "placeholder": "cth. had liabiliti = yuran 12 bulan; undang-undang Indonesia; bayaran 30 hari"
      },
      "type": {
        "label": "Jenis kontrak",
        "placeholder": "cth. perjanjian SaaS, pembelian saham, pengedaran, pekerjaan, NDA, sewaan"
      },
      "contract-draft:side": {
        "label": "Digubal memihak kepada"
      },
      "bilingual": {
        "label": "Versi dwibahasa",
        "options": {
          "no": "Tidak",
          "en-id": "Inggeris + Indonesia (dua lajur)",
          "en-local": "Inggeris + bahasa rasmi tempatan"
        }
      },
      "negotiation:side": {
        "label": "Pihak anda"
      },
      "deal": {
        "label": "Transaksi",
        "placeholder": "cth. pengambilalihan 70% PT X oleh pelabur asing"
      },
      "materiality": {
        "label": "Ambang material",
        "placeholder": "cth. kontrak melebihi US$50 ribu"
      },
      "entity": {
        "label": "Jenis entiti",
        "placeholder": "cth. PT PMA, LLC, Sdn. Bhd."
      },
      "doc-compare:side": {
        "label": "Pihak anda (pilihan)"
      },
      "budget": {
        "label": "Bajet / kekangan"
      },
      "pleadings:doctype": {
        "label": "Dokumen untuk digubal",
        "options": {
          "claim": "Pernyataan tuntutan / gugatan",
          "answer": "Pembelaan (jawaban, eksepsi)",
          "reply": "Jawapan / replik",
          "rejoinder": "Rejoinder / duplik",
          "conclusion": "Hujahan penutup / kesimpulan",
          "appeal": "Memorandum rayuan / memori banding",
          "counter-appeal": "Memorandum balas rayuan",
          "cassation": "Memorandum kasasi / memori kasasi",
          "review": "Petisyen semakan / memori PK",
          "motion": "Usul / permohonan (relief interim, dll.)",
          "complaint-crim": "Aduan jenayah / laporan polis",
          "pledoi": "Rayuan pembelaan (pledoi)",
          "petition-const": "Petisyen perlembagaan"
        }
      },
      "witness": {
        "label": "Saksi (nama/peranan)"
      },
      "rules": {
        "label": "Institusi / kaedah",
        "placeholder": "cth. SIAC, ICC, BANI, UNCITRAL, LCIA, HKIAC, AIAC"
      },
      "demand-settlement:doctype": {
        "label": "Dokumen",
        "options": {
          "demand": "Tuntutan / notis keingkaran (somasi)",
          "response": "Jawapan kepada tuntutan",
          "settlement": "Perjanjian penyelesaian",
          "valuation": "Penilaian penyelesaian sahaja"
        }
      },
      "criminal:facts_date": {
        "label": "Tarikh perbuatan yang didakwa"
      },
      "compliance-gap:business": {
        "label": "Perniagaan, aktiviti dan saiz",
        "placeholder": "cth. pasaran dalam talian, 1 juta pengguna, bayaran melalui rakan, data disimpan di Singapura"
      },
      "processing": {
        "label": "Aktiviti pemprosesan",
        "placeholder": "cth. kehadiran biometrik untuk 2,000 pekerja, diproses oleh vendor di India"
      },
      "privacy:doctype": {
        "label": "Output",
        "options": {
          "dpia": "DPIA penuh",
          "ropa": "Rekod pemprosesan (RoPA)",
          "transfer": "Penilaian pemindahan rentas sempadan",
          "breach": "Pelan respons / pemberitahuan pelanggaran",
          "policy": "Notis / polisi privasi"
        }
      },
      "subject": {
        "label": "Pelanggan / transaksi"
      },
      "worker": {
        "label": "Butiran pekerja (untuk pengiraan)",
        "placeholder": "jenis kontrak, tarikh mula, gaji bulanan & elaun tetap, sebab penamatan"
      },
      "asset": {
        "label": "Aset / isu HKI"
      },
      "tax_year": {
        "label": "Tahun / tempoh cukai"
      },
      "esg:business": {
        "label": "Profil syarikat"
      },
      "system": {
        "label": "Sistem / kes penggunaan AI"
      },
      "opinion-letter:doctype": {
        "label": "Dokumen",
        "options": {
          "advice": "Surat nasihat klien",
          "opinion": "Pendapat undang-undang rasmi (pendapat hukum)",
          "memo": "Memo dalaman",
          "letter": "Surat kepada pihak berkuasa / pihak lawan"
        }
      },
      "recipient": {
        "label": "Penerima"
      },
      "legislative:instrument": {
        "label": "Jenis instrumen",
        "placeholder": "cth. Perda Kabupaten, peraturan menteri, undang-undang kecil syarikat, rang undang-undang"
      },
      "translation:target": {
        "label": "Terjemah ke",
        "placeholder": "cth. Inggeris, Bahasa Indonesia, Arab"
      },
      "layout": {
        "label": "Susun atur",
        "options": {
          "plain": "Terjemahan sahaja",
          "side": "Jadual sebelah-menyebelah"
        }
      },
      "trigger": {
        "label": "Peristiwa pencetus dan tarikh",
        "placeholder": "cth. penghakiman dibacakan 14 Ogos 2026; notis diterima 2 Sep 2026"
      }
    }
  },
  de: {
    "groups": {
      "research": "Recherche & Analyse",
      "transactions": "Verträge & Transaktionen",
      "disputes": "Prozesse & Streitigkeiten",
      "compliance": "Compliance & Risiko",
      "drafting": "Entwürfe & Kommunikation"
    },
    "areaGroups": {
      "General": "Allgemein",
      "Public law": "Öffentliches Recht",
      "Private & commercial": "Zivil- & Wirtschaftsrecht",
      "Technology & IP": "Technologie & IP",
      "People": "Personen & Familie",
      "Criminal & compliance": "Strafrecht & Compliance",
      "Sectors": "Branchen",
      "Disputes": "Streitigkeiten"
    },
    "areas": {
      "general": "Allgemein / unsicher",
      "constitutional": "Verfassungsrecht",
      "administrative": "Verwaltungsrecht & Genehmigungen",
      "procurement": "Vergaberecht & ÖPP",
      "human-rights": "Menschenrechte",
      "international": "Völkerrecht & Verträge",
      "elections": "Wahlen & Parteien",
      "contracts": "Verträge & Schuldrecht",
      "torts": "Delikte / unerlaubte Handlungen & Haftung",
      "corporate": "Gesellschaftsrecht",
      "ma": "Fusionen & Übernahmen (M&A)",
      "capital-markets": "Kapitalmarkt- & Wertpapierrecht",
      "banking": "Bank- & Finanzrecht",
      "fintech": "Fintech, Zahlungen & Kryptowerte",
      "insurance": "Versicherungsrecht",
      "competition": "Wettbewerbs- / Kartellrecht",
      "consumer": "Verbraucherschutz",
      "insolvency": "Insolvenz & Restrukturierung",
      "real-estate": "Immobilien & Grundstücke",
      "construction": "Bau- & Anlagenbau",
      "franchise": "Franchise, Handelsvertretung & Vertrieb",
      "ip": "Geistiges Eigentum",
      "privacy": "Datenschutz",
      "cyber": "Cybersicherheit",
      "ai-tech": "KI- & Technologieregulierung",
      "telecom-media": "Telekommunikation, Medien & Rundfunk",
      "employment": "Arbeitsrecht",
      "immigration": "Aufenthalts- & Staatsangehörigkeitsrecht",
      "family": "Familienrecht & Personenstand",
      "succession": "Erbrecht, Testamente & Trusts",
      "health": "Gesundheit & Life Sciences",
      "education": "Bildung",
      "nonprofit": "Gemeinnützige Organisationen, Stiftungen & Religion",
      "indigenous": "Gewohnheitsrecht & Rechte indigener Völker",
      "criminal": "Strafrecht & Strafprozess",
      "white-collar": "Wirtschaftsstrafrecht & Ermittlungen",
      "aml": "Geldwäsche-/Terrorfinanzierungsprävention & Sanktionen",
      "anti-corruption": "Korruptionsbekämpfung & Ethik-Compliance",
      "tax": "Steuerrecht",
      "trade": "Handel, Zoll & Exportkontrolle",
      "environment": "Umwelt, Klima & natürliche Ressourcen",
      "energy": "Energie, Bergbau & Infrastruktur",
      "maritime": "See-, Schifffahrts- & Luftrecht",
      "transport": "Transport & Logistik",
      "agri-food": "Landwirtschaft & Lebensmittel",
      "islamic-finance": "Islamische Finanzen & Scharia-Compliance",
      "esg": "ESG & Corporate Governance",
      "sports-ent": "Sport, Medien & Unterhaltung",
      "litigation": "Zivilprozess",
      "arbitration": "Schiedsverfahren & ADR"
    },
    "regions": {
      "supranational": "International & EU",
      "asia": "Asien",
      "middle-east": "Naher Osten",
      "europe": "Europa",
      "americas": "Amerika",
      "africa": "Afrika",
      "oceania": "Ozeanien"
    },
    "special": {
      "EU": "Europäische Union (EU-Recht)",
      "INT": "Völkerrecht & internationale Verträge"
    },
    "citations": {
      "auto": "Lokaler Standard der Rechtsordnung",
      "bluebook": "Bluebook (USA)",
      "oscola": "OSCOLA (UK)",
      "aglc": "AGLC (Australien)",
      "mcgill": "McGill Guide (Kanada)",
      "id": "Indonesische Praxis (Pasal/ayat, Putusan No.)",
      "eu": "Amtlicher EU-Stil (ECLI, ABl.-Fundstellen)"
    },
    "traditions": {
      "civil": "Kontinentaleuropäisches Recht (Civil Law)",
      "common": "Common Law",
      "islamic": "Islamisches Recht (Scharia)",
      "customary": "Gewohnheitsrecht",
      "socialist": "Sozialistisches Recht"
    },
    "ws": {
      "research": {
        "name": "Rechtsgutachten (Recherchememo)",
        "desc": "Ein Recherchememo auf Partnerniveau: die Regel, ihre Quellen, wie Gerichte sie anwenden und was sie für Ihren Sachverhalt bedeutet.",
        "starters": [
          "Darf ein Arbeitgeber wegen wiederholter Verspätung kündigen, und welche Abfindung ist fällig?",
          "Welche Anforderungen gelten für eine wirksame elektronische Signatur, und ist sie als Beweis zulässig?",
          "Ist ein nachvertragliches Wettbewerbsverbot durchsetzbar?"
        ]
      },
      "case-builder": {
        "name": "Fallaufbau — Akte neu strukturieren",
        "desc": "Laden Sie die Fallunterlagen hoch: Parteien, Chronologie, Rechtsfragen, anwendbares Recht von der Verfassung abwärts, Prüfung Merkmal für Merkmal, Beweislücken und Strategie — nach geltendem Recht.",
        "starters": [
          "Strukturiere diese Akte neu und nenne unsere stärksten und schwächsten Punkte.",
          "Baue den Fall nach geltendem Recht neu auf und markiere, was sich seit den Ereignissen geändert hat.",
          "Erstelle eine prozessreife Fallzusammenfassung für die Partnerbesprechung."
        ]
      },
      "multi-jurisdiction": {
        "name": "Rechtsvergleich mehrerer Rechtsordnungen",
        "desc": "Vergleichen Sie, wie bis zu 8 Länder oder Bundesstaaten dieselbe Frage behandeln — nebeneinander, mit empfohlener Struktur.",
        "starters": [
          "Vergleiche die Meldepflichten bei Datenpannen in diesen Rechtsordnungen.",
          "Wo lässt sich eine Holding für Südostasien am einfachsten gründen und warum?"
        ]
      },
      "statute": {
        "name": "Gesetzes- & Verordnungsnavigator",
        "desc": "Erläutert jedes Gesetz Artikel für Artikel: Bedeutung, Änderungen, Durchführungsvorschriften, Auslegung durch Gerichte und praktische Folgen.",
        "starters": [
          "Erläutere diese Artikel, ihre Änderungen und wie Gerichte sie auslegen.",
          "Welche Durchführungsverordnungen gibt es zu diesem Gesetz und was regeln sie zusätzlich?"
        ]
      },
      "constitutional": {
        "name": "Verfassungs- & Normenkontrolle",
        "desc": "Prüfen Sie ein Gesetz, eine Verordnung oder einen Hoheitsakt am Maßstab der Verfassung oder höherrangigen Rechts: Antragsbefugnis, Gründe, Präzedenzfälle und Entwurf einer Antragsgliederung.",
        "starters": [
          "Kann diese Verordnung wegen Verfassungswidrigkeit angegriffen werden?",
          "Skizziere einen Normenkontrollantrag mit Antragsbefugnis und verfassungsrechtlichen Gründen."
        ]
      },
      "judgment": {
        "name": "Urteilsanalyse",
        "desc": "Laden Sie ein Urteil oder einen Schiedsspruch hoch: Tenor, tragende Gründe, obiter dicta, Argumentationskarte, Präjudizwert und Rechtsmittelgründe.",
        "starters": [
          "Analysiere dieses Urteil und liste Rechtsmittelgründe auf.",
          "Fasse die tragenden Gründe zusammen und wie sie unser laufendes Verfahren beeinflussen."
        ]
      },
      "regulatory-radar": {
        "name": "Regulierungsradar & Auswirkungen",
        "desc": "Was sich geändert hat, was kommt und was es für Ihr Unternehmen bedeutet — mit Maßnahmenplan und Fristen.",
        "starters": [
          "Welche regulatorischen Änderungen betreffen meine Branche und was müssen wir tun?",
          "Erstelle einen Compliance-Kalender mit anstehenden Fristen."
        ]
      },
      "citation-check": {
        "name": "Zitat- & Fundstellenprüfung",
        "desc": "Prüft jedes Zitat in einem Schriftsatz, Memo oder einer KI-Antwort: Format, Existenz, aktueller Stand und ob es die Aussage stützt.",
        "starters": [
          "Prüfe alle Zitate in diesem Dokument und markiere Zweifelhaftes.",
          "Prüfe, ob diese Vorschriften noch gelten und richtig nummeriert sind."
        ]
      },
      "contract-review": {
        "name": "Vertragsprüfung & Redline",
        "desc": "Prüfung Klausel für Klausel für Ihre Seite: Risiken, fehlender Schutz, Durchsetzbarkeit nach lokalem Recht und vorgeschlagene Änderungen.",
        "starters": [
          "Prüfe diesen Vertrag für meine Seite und schlage Änderungen vor.",
          "Was sind die 10 größten Risiken in diesem Vertrag und wie behebe ich sie?",
          "Prüfe diesen Vertrag gegen mein Playbook."
        ]
      },
      "contract-draft": {
        "name": "Vertragsentwurf",
        "desc": "Entwirft aus einem Term Sheet oder einer Beschreibung einen vollständigen, lokal durchsetzbaren Vertrag — mit Anmerkungen und Alternativen.",
        "starters": [
          "Entwirf eine gegenseitige Geheimhaltungsvereinbarung nach lokalem Recht.",
          "Entwirf einen Softwareentwicklungsvertrag aus diesen Eckpunkten."
        ]
      },
      "negotiation": {
        "name": "Verhandlungsstrategie & Playbook",
        "desc": "Positionen, BATNA, Zugeständnisleiter und wörtliche Antworten auf die Forderungen der Gegenseite.",
        "starters": [
          "Erstelle mein Verhandlungs-Playbook für diese Vertragsbedingungen.",
          "Wie soll ich auf ihre Änderungen reagieren?"
        ]
      },
      "due-diligence": {
        "name": "Due Diligence",
        "desc": "Prüft einen Datenraum: Gesellschaftsrecht, Verträge, Genehmigungen, Arbeitsrecht, IP, Streitigkeiten, Steuern und Compliance — mit Red-Flag-Bericht und Liste der Vollzugsbedingungen.",
        "starters": [
          "Erstelle aus diesen Unterlagen einen Red-Flag-Due-Diligence-Bericht.",
          "Liste die Vollzugsbedingungen und besonderen Freistellungen auf, die wir brauchen."
        ]
      },
      "corporate-secretarial": {
        "name": "Gesellschaftsrecht & Organbeschlüsse",
        "desc": "Vorstands- und Gesellschafterbeschlüsse, Protokolle, Satzungsänderungen, Registeranmeldungen und Zustimmungsmatrizen nach lokalen Formvorschriften.",
        "starters": [
          "Entwirf einen Umlaufbeschluss der Gesellschafter zur Bestellung eines neuen Geschäftsführers.",
          "Welche Zustimmungen und Anmeldungen sind für die Ausgabe neuer Anteile nötig?"
        ]
      },
      "doc-compare": {
        "name": "Dokumentenvergleich",
        "desc": "Vergleicht zwei Fassungen eines Vertrags oder Gesetzes: jede Änderung, wen sie begünstigt und ihre rechtliche Wirkung.",
        "starters": [
          "Vergleiche diese beiden Fassungen und erkläre jede Änderung.",
          "Was hat das neue Gesetz gegenüber dem alten geändert?"
        ]
      },
      "litigation-strategy": {
        "name": "Prozessstrategie & Fallbewertung",
        "desc": "Erfolgsaussichten, Gerichtsstand, Rechtsbehelfe, Kosten und Dauer — mit Wahrscheinlichkeitsbändern und einem Schritt-für-Schritt-Plan.",
        "starters": [
          "Sollen wir klagen oder uns vergleichen? Gib mir Zahlen und Plan.",
          "Bewerte unsere Chancen und den besten Gerichtsstand."
        ]
      },
      "pleadings": {
        "name": "Schriftsätze & Gerichtsdokumente",
        "desc": "Entwirft Klagen, Klageerwiderungen, Repliken, Dupliken, Berufungs-, Revisions- und Wiederaufnahmeschriftsätze im lokalen Gerichtsformat.",
        "starters": [
          "Entwirf eine Klage wegen Vertragsverletzung mit Antrag auf Arrest.",
          "Entwirf unsere Klageerwiderung einschließlich Zuständigkeitsrügen."
        ]
      },
      "chronology": {
        "name": "Chronologie & Beweismatrix",
        "desc": "Macht aus einem Stapel Dokumente eine belegte Zeitleiste und eine Beweismatrix je Streitpunkt.",
        "starters": [
          "Erstelle eine Chronologie mit Quellen aus allen diesen Dokumenten.",
          "Welche Tatsachen sind bewiesen, bestritten oder unbewiesen?"
        ]
      },
      "witness-prep": {
        "name": "Zeugenvorbereitung & Kreuzverhör",
        "desc": "Fragepläne für Haupt- und Kreuzverhör, erwartete Antworten, Fallen und Material zur Glaubwürdigkeit.",
        "starters": [
          "Bereite Fragen für das Kreuzverhör dieses Zeugen vor.",
          "Bereite unseren Zeugen auf seine Aussage vor."
        ]
      },
      "adversary": {
        "name": "Simulator für Gegenanwalt & Gericht",
        "desc": "Stresstest für Ihren Fall: der beste Angriff der Gegenseite, dann wie ein Gericht voraussichtlich argumentieren und entscheiden würde.",
        "starters": [
          "Greif unseren Fall an wie der beste Gegenanwalt.",
          "Schreib das Urteil, das ein sorgfältiges Gericht wahrscheinlich fällen würde."
        ]
      },
      "arbitration": {
        "name": "Schiedsverfahren & ADR",
        "desc": "Prüfung der Schiedsklausel, Schiedsklage, Strategie vor dem Schiedsgericht, einstweilige Maßnahmen sowie Aufhebung und Vollstreckung.",
        "starters": [
          "Ist unsere Schiedsklausel wirksam und welche Risiken gibt es?",
          "Entwirf eine Schiedsklage (Notice of Arbitration).",
          "Kann dieser Schiedsspruch im gewählten Land vollstreckt werden?"
        ]
      },
      "demand-settlement": {
        "name": "Mahnschreiben & Vergleich",
        "desc": "Förmliche Mahnungen und Vergleichsvereinbarungen, mit einer Bewertung, was akzeptabel ist.",
        "starters": [
          "Entwirf ein förmliches Mahnschreiben wegen offener Rechnungen.",
          "Welchen Vergleichsbetrag sollten wir akzeptieren?"
        ]
      },
      "criminal": {
        "name": "Strafrechtliche Fallanalyse",
        "desc": "Tatbestandsmerkmale, Beweise, Verfahren und Rechte, Verteidigungen, Strafrahmen und Auswirkungen neuer Strafgesetzbücher.",
        "starters": [
          "Prüfe, ob die Tatbestandsmerkmale bewiesen sind.",
          "Ändert das neue Strafgesetzbuch das Ergebnis für diesen Sachverhalt?"
        ]
      },
      "compliance-gap": {
        "name": "Compliance-Lückenanalyse",
        "desc": "Erfasst die für Ihr Unternehmen geltenden Regeln, findet Lücken und liefert einen priorisierten Maßnahmenplan.",
        "starters": [
          "Welche Genehmigungen und Compliance-Pflichten gelten für mein Unternehmen?",
          "Prüfe unsere aktuelle Praxis anhand der Gesetze."
        ]
      },
      "privacy": {
        "name": "Datenschutz & DSFA",
        "desc": "Rechtsgrundlage, Verarbeitungsverzeichnis, Drittlandübermittlungen, Reaktion auf Datenpannen und vollständige DSFA — nach PDP, DSGVO, PDPA und mehr.",
        "starters": [
          "Führe eine DSFA für diese Verarbeitungstätigkeit durch.",
          "Wir hatten eine Datenpanne — was müssen wir bis wann tun?"
        ]
      },
      "aml-kyc": {
        "name": "Geldwäscheprävention/KYC & Sanktionen",
        "desc": "Kundenrisikobewertung, Analyse wirtschaftlich Berechtigter, Warnsignale, Prüflogik für Sanktionen und Exportkontrolle, Entwurf von Verdachtsmeldungen.",
        "starters": [
          "Bewerte das Risiko dieses Kunden und liste verstärkte Sorgfaltspflichten auf.",
          "Braucht diese Transaktion eine Verdachtsmeldung?"
        ]
      },
      "employment": {
        "name": "Arbeitsrecht & HR",
        "desc": "Einstellung, Verträge, Kündigungsverfahren, Abfindungsberechnung, Richtlinien und arbeitsrechtliche Streitigkeiten.",
        "starters": [
          "Berechne die Abfindung für diese Kündigung und das richtige Verfahren.",
          "Ist dieser befristete Vertrag wirksam oder gilt er als unbefristet?"
        ]
      },
      "ip": {
        "name": "IP-Prüfung & Schutz",
        "desc": "Strategie für Marken, Urheberrecht, Patente und Designs, Verletzungsrisiko, Lizenzierung und Durchsetzung.",
        "starters": [
          "Können wir diese Marke anmelden und welche Kollisionsrisiken gibt es?",
          "Jemand hat unser Produkt kopiert — welche Möglichkeiten haben wir?"
        ]
      },
      "tax": {
        "name": "Steueranalyse",
        "desc": "Körperschaft-, Einkommen-, Umsatz- und Quellensteuer, Betriebsstätte und DBA — mit Berechnungen und Rechtsbehelfswegen.",
        "starters": [
          "Welche Steuern fallen bei dieser grenzüberschreitenden Dienstleistung an?",
          "Wir haben einen Steuerbescheid erhalten — wie und bis wann legen wir Einspruch ein?"
        ]
      },
      "esg": {
        "name": "ESG & Nachhaltigkeit",
        "desc": "Verpflichtende Nachhaltigkeitsberichterstattung, Sorgfaltspflichten in der Lieferkette, Greenwashing-Risiko und Pflichten der Geschäftsleitung.",
        "starters": [
          "Welche Berichtspflichten zur Nachhaltigkeit gelten für uns und ab wann?",
          "Prüfe unsere Werbeaussagen auf Greenwashing-Risiken."
        ]
      },
      "ai-governance": {
        "name": "KI-Governance & Technologieregulierung",
        "desc": "Klassifiziert KI-Systeme (z. B. Risikostufen des EU AI Act), erfasst Pflichten, entwirft KI-Richtlinien und Lieferantenbedingungen.",
        "starters": [
          "Klassifiziere unseren KI-Anwendungsfall und liste unsere Pflichten auf.",
          "Entwirf eine interne Richtlinie zur Nutzung generativer KI."
        ]
      },
      "opinion-letter": {
        "name": "Rechtsgutachten & Mandantenschreiben",
        "desc": "Förmliche Rechtsgutachten und Beratungsschreiben mit Annahmen, Vorbehalten und klaren Empfehlungen.",
        "starters": [
          "Schreib ein Rechtsgutachten, ob diese Transaktion zulässig ist.",
          "Schreib meinem Mandanten ein Beratungsschreiben zu seinen Optionen."
        ]
      },
      "plain-language": {
        "name": "Erklärung in einfacher Sprache",
        "desc": "Erklärt einen Vertrag, ein Urteil, eine Ladung oder ein Gesetz für Nichtjuristen: was es bedeutet, was zu tun ist und bis wann.",
        "starters": [
          "Erkläre mir dieses Dokument in einfachen Worten. Was muss ich tun?",
          "Ich habe eine gerichtliche Ladung erhalten — wie geht es weiter?"
        ]
      },
      "legislative": {
        "name": "Gesetzgebung & Policy-Entwürfe",
        "desc": "Entwirft Gesetze, Verordnungen, Regionalverordnungen, Satzungen und Begründungen (naskah akademik) mit Gesetzesfolgenabschätzung.",
        "starters": [
          "Entwirf eine Regionalverordnung zu diesem Thema mit Gliederung der Begründung.",
          "Prüfe diesen Gesetzentwurf auf handwerkliche Mängel."
        ]
      },
      "translation": {
        "name": "Juristische Übersetzung",
        "desc": "Präzise juristische Übersetzung mit einheitlichen Definitionen, zweisprachigem Glossar und Hinweisen zu unübersetzbaren Begriffen.",
        "starters": [
          "Übersetze diesen Vertrag ins Englische und halte die Rechtsbegriffe präzise.",
          "Übersetze dieses Urteil ins Indonesische."
        ]
      },
      "deadlines": {
        "name": "Fristen- & Verjährungsrechner",
        "desc": "Verfahrensfristen und Verjährungsfristen, aus Ihren Daten berechnet, mit den angezeigten Zählregeln.",
        "starters": [
          "Welche Fristen laufen für uns nach diesem Urteil?",
          "Ist der Anspruch bereits verjährt?"
        ]
      },
      "ask": {
        "name": "Rechtsfrage stellen",
        "desc": "Schnelle, belegte Antworten auf jede Rechtsfrage — mit der Rechtsgrundlage, ihrem Stand und was zu prüfen ist.",
        "starters": [
          "Wie hoch ist das Mindestkapital für eine Gesellschaft in ausländischem Besitz?",
          "Darf ich ein Telefonat ohne Einwilligung aufzeichnen?",
          "Welche Rechte habe ich, wenn mein Flug annulliert wird?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "Recherchefrage (optional, falls nicht in Ihrer Anfrage)"
      },
      "role": {
        "label": "Sie vertreten",
        "options": {
          "neutral": "Neutral / objektive Sicht",
          "claimant": "Kläger / Antragsteller",
          "defendant": "Beklagter / Antragsgegner",
          "prosecution": "Staatsanwaltschaft / Ermittler",
          "defence": "Strafverteidigung",
          "judge": "Richter / Schiedsrichter (Begründungsentwurf)",
          "inhouse": "Unternehmensjurist / Unternehmen",
          "regulator": "Aufsichtsbehörde / Staat",
          "individual": "Privatperson (keine Juristin, kein Jurist)"
        }
      },
      "stage": {
        "label": "Verfahrensstand / Forum",
        "options": {
          "pre": "Vorgerichtlich / Beratung",
          "first": "Erste Instanz",
          "appeal": "Berufung",
          "cassation": "Revision / oberstes Gericht",
          "review": "Wiederaufnahme (z. B. PK)",
          "constitutional": "Verfassungsgericht",
          "administrative": "Verwaltungsgericht",
          "arbitration": "Schiedsverfahren",
          "mediation": "Mediation / Verhandlung",
          "investigation": "Ermittlungsverfahren"
        }
      },
      "goal": {
        "label": "Gewünschtes Ergebnis",
        "placeholder": "z. B. 250.000 US$ zurückerhalten, Klageabweisung, Vergleich binnen 60 Tagen"
      },
      "case-builder:facts_date": {
        "label": "Wann geschahen die wesentlichen Ereignisse?",
        "placeholder": "z. B. März 2024 – Januar 2025"
      },
      "compare": {
        "label": "Vergleichen mit (Länder/Bundesstaaten, durch Komma getrennt)",
        "placeholder": "z. B. Singapur, Malaysia, Delaware, England"
      },
      "statute:instrument": {
        "label": "Gesetz / Verordnung und Artikel",
        "placeholder": "z. B. UU 27/2022 Art. 20–25; DSGVO Art. 6; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "Angegriffene Norm oder Maßnahme"
      },
      "regulatory-radar:business": {
        "label": "Ihr Unternehmen / Ihre Branche",
        "placeholder": "z. B. digitale Kreditplattform, 200 Mitarbeitende"
      },
      "horizon": {
        "label": "Zeitraum",
        "options": {
          "6": "Letzte & nächste 6 Monate",
          "12": "Letzte & nächste 12 Monate",
          "24": "Letzte & nächste 24 Monate"
        }
      },
      "contract-review:side": {
        "label": "Ihre Seite im Vertrag",
        "placeholder": "z. B. der Lieferant / der Mieter / der Käufer"
      },
      "appetite": {
        "label": "Risikobereitschaft",
        "options": {
          "balanced": "Ausgewogen",
          "conservative": "Konservativ (meine Seite schützen)",
          "commercial": "Kommerziell (Abschluss sichern)"
        }
      },
      "playbook": {
        "label": "Ihr Playbook / Muss-Kriterien (optional)",
        "placeholder": "z. B. Haftungsgrenze = 12 Monatsentgelte; indonesisches Recht; Zahlung binnen 30 Tagen"
      },
      "type": {
        "label": "Vertragsart",
        "placeholder": "z. B. SaaS-Vertrag, Anteilskauf, Vertrieb, Arbeitsvertrag, NDA, Miete"
      },
      "contract-draft:side": {
        "label": "Entworfen zugunsten von"
      },
      "bilingual": {
        "label": "Zweisprachige Fassung",
        "options": {
          "no": "Nein",
          "en-id": "Englisch + Indonesisch (zwei Spalten)",
          "en-local": "Englisch + lokale Amtssprache"
        }
      },
      "negotiation:side": {
        "label": "Ihre Seite"
      },
      "deal": {
        "label": "Transaktion",
        "placeholder": "z. B. Erwerb von 70 % an PT X durch einen ausländischen Investor"
      },
      "materiality": {
        "label": "Wesentlichkeitsschwelle",
        "placeholder": "z. B. Verträge über 50.000 US$"
      },
      "entity": {
        "label": "Rechtsform",
        "placeholder": "z. B. PT PMA, LLC, GmbH"
      },
      "doc-compare:side": {
        "label": "Ihre Seite (optional)"
      },
      "budget": {
        "label": "Budget / Rahmenbedingungen"
      },
      "pleadings:doctype": {
        "label": "Zu entwerfendes Dokument",
        "options": {
          "claim": "Klageschrift / gugatan",
          "answer": "Klageerwiderung (jawaban, eksepsi)",
          "reply": "Replik",
          "rejoinder": "Duplik",
          "conclusion": "Schlussvortrag / kesimpulan",
          "appeal": "Berufungsbegründung / memori banding",
          "counter-appeal": "Berufungserwiderung",
          "cassation": "Revisionsbegründung / memori kasasi",
          "review": "Wiederaufnahmeantrag / memori PK",
          "motion": "Antrag (einstweiliger Rechtsschutz usw.)",
          "complaint-crim": "Strafanzeige",
          "pledoi": "Plädoyer der Verteidigung (pledoi)",
          "petition-const": "Verfassungsbeschwerde"
        }
      },
      "witness": {
        "label": "Zeuge (Name/Rolle)"
      },
      "rules": {
        "label": "Institution / Regeln",
        "placeholder": "z. B. SIAC, ICC, DIS, BANI, UNCITRAL, LCIA, HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "Dokument",
        "options": {
          "demand": "Mahnung / Inverzugsetzung (somasi)",
          "response": "Antwort auf eine Mahnung",
          "settlement": "Vergleichsvereinbarung",
          "valuation": "Nur Bewertung des Vergleichs"
        }
      },
      "criminal:facts_date": {
        "label": "Datum der vorgeworfenen Taten"
      },
      "compliance-gap:business": {
        "label": "Unternehmen, Tätigkeiten und Größe",
        "placeholder": "z. B. Online-Marktplatz, 1 Mio. Nutzer, Zahlungen über Partner, Daten in Singapur gespeichert"
      },
      "processing": {
        "label": "Verarbeitungstätigkeit",
        "placeholder": "z. B. biometrische Zeiterfassung für 2.000 Beschäftigte durch einen Dienstleister in Indien"
      },
      "privacy:doctype": {
        "label": "Ergebnis",
        "options": {
          "dpia": "Vollständige DSFA",
          "ropa": "Verarbeitungsverzeichnis",
          "transfer": "Prüfung der Drittlandübermittlung",
          "breach": "Reaktionsplan / Meldung einer Datenpanne",
          "policy": "Datenschutzhinweis / -richtlinie"
        }
      },
      "subject": {
        "label": "Kunde / Transaktion"
      },
      "worker": {
        "label": "Angaben zum Beschäftigten (für Berechnungen)",
        "placeholder": "Vertragsart, Beginn, Monatsgehalt & feste Zulagen, Kündigungsgrund"
      },
      "asset": {
        "label": "IP-Recht / Thema"
      },
      "tax_year": {
        "label": "Steuerjahr / Zeitraum"
      },
      "esg:business": {
        "label": "Unternehmensprofil"
      },
      "system": {
        "label": "KI-System / Anwendungsfall"
      },
      "opinion-letter:doctype": {
        "label": "Dokument",
        "options": {
          "advice": "Beratungsschreiben an Mandanten",
          "opinion": "Förmliches Rechtsgutachten (pendapat hukum)",
          "memo": "Internes Memo",
          "letter": "Schreiben an Behörde / Gegenseite"
        }
      },
      "recipient": {
        "label": "Empfänger"
      },
      "legislative:instrument": {
        "label": "Art des Rechtsakts",
        "placeholder": "z. B. Perda Kabupaten, Ministerialverordnung, Unternehmenssatzung, Gesetzentwurf"
      },
      "translation:target": {
        "label": "Übersetzen ins",
        "placeholder": "z. B. Englisch, Indonesisch, Arabisch"
      },
      "layout": {
        "label": "Layout",
        "options": {
          "plain": "Nur Übersetzung",
          "side": "Tabelle nebeneinander"
        }
      },
      "trigger": {
        "label": "Auslösendes Ereignis und Datum",
        "placeholder": "z. B. Urteil verkündet am 14.08.2026; Schreiben erhalten am 02.09.2026"
      }
    }
  },
  fr: {
    "groups": {
      "research": "Recherche & analyse",
      "transactions": "Contrats & transactions",
      "disputes": "Contentieux & litiges",
      "compliance": "Conformité & risques",
      "drafting": "Rédaction & communication"
    },
    "areaGroups": {
      "General": "Général",
      "Public law": "Droit public",
      "Private & commercial": "Droit privé & commercial",
      "Technology & IP": "Technologies & PI",
      "People": "Personnes & famille",
      "Criminal & compliance": "Pénal & conformité",
      "Sectors": "Secteurs",
      "Disputes": "Litiges"
    },
    "areas": {
      "general": "Général / je ne sais pas",
      "constitutional": "Droit constitutionnel",
      "administrative": "Droit administratif & autorisations",
      "procurement": "Marchés publics & PPP",
      "human-rights": "Droits de l'homme",
      "international": "Droit international public & traités",
      "elections": "Élections & partis politiques",
      "contracts": "Contrats & obligations",
      "torts": "Responsabilité civile délictuelle",
      "corporate": "Droit des sociétés",
      "ma": "Fusions & acquisitions",
      "capital-markets": "Marchés de capitaux & valeurs mobilières",
      "banking": "Banque & finance",
      "fintech": "Fintech, paiements & crypto-actifs",
      "insurance": "Assurances",
      "competition": "Concurrence / antitrust",
      "consumer": "Protection des consommateurs",
      "insolvency": "Procédures collectives & restructuration",
      "real-estate": "Immobilier & foncier",
      "construction": "Construction & ingénierie",
      "franchise": "Franchise, agence & distribution",
      "ip": "Propriété intellectuelle",
      "privacy": "Protection des données & vie privée",
      "cyber": "Cybersécurité",
      "ai-tech": "Régulation de l'IA & des technologies",
      "telecom-media": "Télécoms, médias & audiovisuel",
      "employment": "Droit du travail",
      "immigration": "Immigration & nationalité",
      "family": "Famille & statut personnel",
      "succession": "Successions, testaments & trusts",
      "health": "Santé & sciences de la vie",
      "education": "Éducation",
      "nonprofit": "Associations, fondations & cultes",
      "indigenous": "Droit coutumier & autochtone",
      "criminal": "Droit & procédure pénale",
      "white-collar": "Délinquance financière & enquêtes",
      "aml": "LCB-FT & sanctions",
      "anti-corruption": "Anticorruption & conformité éthique",
      "tax": "Fiscalité",
      "trade": "Commerce, douanes & contrôle des exportations",
      "environment": "Environnement, climat & ressources naturelles",
      "energy": "Énergie, mines & infrastructures",
      "maritime": "Maritime, transport maritime & aérien",
      "transport": "Transport & logistique",
      "agri-food": "Agriculture & alimentation",
      "islamic-finance": "Finance islamique & conformité charia",
      "esg": "ESG & gouvernance d'entreprise",
      "sports-ent": "Sport, médias & divertissement",
      "litigation": "Contentieux & procédure civile",
      "arbitration": "Arbitrage & MARD"
    },
    "regions": {
      "supranational": "International & UE",
      "asia": "Asie",
      "middle-east": "Moyen-Orient",
      "europe": "Europe",
      "americas": "Amériques",
      "africa": "Afrique",
      "oceania": "Océanie"
    },
    "special": {
      "EU": "Union européenne (droit de l'UE)",
      "INT": "Droit international public & traités"
    },
    "citations": {
      "auto": "Norme locale de la juridiction",
      "bluebook": "Bluebook (États-Unis)",
      "oscola": "OSCOLA (Royaume-Uni)",
      "aglc": "AGLC (Australie)",
      "mcgill": "Guide McGill (Canada)",
      "id": "Pratique indonésienne (Pasal/ayat, Putusan No.)",
      "eu": "Style officiel de l'UE (ECLI, références JO)"
    },
    "traditions": {
      "civil": "Droit civil",
      "common": "Common law",
      "islamic": "Droit musulman (charia)",
      "customary": "Droit coutumier",
      "socialist": "Droit socialiste"
    },
    "ws": {
      "research": {
        "name": "Note de recherche juridique",
        "desc": "Une note de recherche digne d'un associé : la règle, ses sources, son application par les tribunaux et ce qu'elle signifie pour vos faits.",
        "starters": [
          "Un employeur peut-il licencier un salarié pour retards répétés, et quelle indemnité est due ?",
          "Quelles sont les conditions d'une signature électronique valable, et est-elle recevable comme preuve ?",
          "Une clause de non-concurrence est-elle opposable après la fin du contrat ?"
        ]
      },
      "case-builder": {
        "name": "Constructeur de dossier — restructurer un dossier",
        "desc": "Chargez les pièces : parties, chronologie, questions juridiques, droit applicable de la constitution aux textes d'application, analyse élément par élément, lacunes de preuve et stratégie — selon le droit en vigueur.",
        "starters": [
          "Restructure ce dossier et indique nos points les plus forts et les plus faibles.",
          "Reconstruis le dossier selon le droit en vigueur et signale ce qui a changé depuis les faits.",
          "Prépare une synthèse prête pour le contentieux pour la réunion des associés."
        ]
      },
      "multi-jurisdiction": {
        "name": "Comparaison multi-juridictions",
        "desc": "Comparez comment jusqu'à 8 pays ou États traitent la même question — côte à côte, avec une structure recommandée.",
        "starters": [
          "Compare les obligations de notification des violations de données dans ces juridictions.",
          "Où est-il le plus simple de créer une holding pour l'Asie du Sud-Est, et pourquoi ?"
        ]
      },
      "statute": {
        "name": "Navigateur de lois & règlements",
        "desc": "Explique toute loi article par article : sens, modifications, textes d'application, interprétation jurisprudentielle et impact pratique.",
        "starters": [
          "Explique ces articles, leurs modifications et leur interprétation par les tribunaux.",
          "Quels textes d'application existent pour cette loi et qu'apportent-ils ?"
        ]
      },
      "constitutional": {
        "name": "Contrôle de constitutionnalité & recours",
        "desc": "Confrontez une loi, un règlement ou un acte de l'administration à la constitution ou à une norme supérieure : intérêt à agir, moyens, précédents et plan de requête.",
        "starters": [
          "Ce règlement peut-il être contesté pour contrariété à la constitution ?",
          "Esquisse une requête en contrôle juridictionnel avec l'intérêt à agir et les moyens constitutionnels."
        ]
      },
      "judgment": {
        "name": "Analyseur de décisions",
        "desc": "Chargez un jugement ou une sentence : dispositif, ratio decidendi, obiter, carte du raisonnement, valeur de précédent et moyens d'appel.",
        "starters": [
          "Analyse ce jugement et liste les moyens d'appel.",
          "Résume la ratio et son effet sur notre affaire en cours."
        ]
      },
      "regulatory-radar": {
        "name": "Veille & impact réglementaires",
        "desc": "Ce qui a changé, ce qui arrive et ce que cela signifie pour votre activité — avec un plan d'action et des échéances.",
        "starters": [
          "Quels changements réglementaires touchent mon secteur et que devons-nous faire ?",
          "Construis un calendrier de conformité des prochaines échéances."
        ]
      },
      "citation-check": {
        "name": "Vérificateur de citations & d'autorités",
        "desc": "Vérifie chaque citation d'un mémoire, d'une note ou d'une réponse d'IA : format, existence, statut actuel et pertinence pour la proposition.",
        "starters": [
          "Vérifie toutes les citations de ce document et signale tout point douteux.",
          "Vérifie que ces textes sont toujours en vigueur et correctement numérotés."
        ]
      },
      "contract-review": {
        "name": "Revue de contrat & redline",
        "desc": "Revue clause par clause pour votre partie : risques, protections manquantes, force exécutoire en droit local et modifications proposées.",
        "starters": [
          "Revois ce contrat pour ma partie et propose des modifications.",
          "Quels sont les 10 principaux risques de ce contrat et comment les corriger ?",
          "Vérifie ce contrat par rapport à mon playbook."
        ]
      },
      "contract-draft": {
        "name": "Rédaction de contrats",
        "desc": "Rédige un contrat complet et exécutoire localement à partir d'une term sheet ou d'une description — avec notes de rédaction et variantes.",
        "starters": [
          "Rédige un accord de confidentialité réciproque régi par le droit local.",
          "Rédige un contrat de développement logiciel à partir de ces conditions."
        ]
      },
      "negotiation": {
        "name": "Stratégie & playbook de négociation",
        "desc": "Positions, BATNA, échelle de concessions et réponses mot pour mot aux demandes de l'autre partie.",
        "starters": [
          "Prépare mon playbook de négociation pour ces conditions contractuelles.",
          "Comment dois-je répondre à leurs modifications ?"
        ]
      },
      "due-diligence": {
        "name": "Audit juridique (due diligence)",
        "desc": "Examine une data room : sociétés, contrats, autorisations, social, PI, litiges, fiscalité et conformité — avec rapport des points rouges et liste des conditions suspensives.",
        "starters": [
          "Produis un rapport d'audit des points rouges à partir de ces documents.",
          "Liste les conditions suspensives et les garanties spécifiques nécessaires."
        ]
      },
      "corporate-secretarial": {
        "name": "Droit des sociétés & secrétariat juridique",
        "desc": "Décisions du conseil et des associés, procès-verbaux, modifications statutaires, formalités et matrices d'approbation conformes aux exigences locales.",
        "starters": [
          "Rédige une décision écrite des associés pour nommer un nouveau dirigeant.",
          "Quelles autorisations et formalités faut-il pour émettre de nouvelles actions ?"
        ]
      },
      "doc-compare": {
        "name": "Comparaison de documents",
        "desc": "Compare deux versions d'un contrat ou d'une loi : chaque modification, à qui elle profite et son effet juridique.",
        "starters": [
          "Compare ces deux versions et explique chaque modification.",
          "Qu'a changé la nouvelle loi par rapport à l'ancienne ?"
        ]
      },
      "litigation-strategy": {
        "name": "Stratégie contentieuse & évaluation du dossier",
        "desc": "Fond, juridiction, remèdes, coûts et délais — avec des fourchettes de probabilité de succès et un plan étape par étape.",
        "starters": [
          "Faut-il agir ou transiger ? Donne-moi les chiffres et le plan.",
          "Évalue nos chances et la meilleure juridiction."
        ]
      },
      "pleadings": {
        "name": "Actes de procédure & écritures",
        "desc": "Rédige assignations, conclusions en défense, répliques, dupliques, déclarations d'appel, pourvois et recours en révision au format local.",
        "starters": [
          "Rédige une assignation pour inexécution contractuelle avec saisie conservatoire.",
          "Rédige nos conclusions en défense, exceptions d'incompétence comprises."
        ]
      },
      "chronology": {
        "name": "Chronologie & matrice des preuves",
        "desc": "Transforme une pile de documents en chronologie sourcée et en matrice des preuves question par question.",
        "starters": [
          "Établis une chronologie sourcée à partir de tous ces documents.",
          "Quels faits sont prouvés, contestés ou non prouvés ?"
        ]
      },
      "witness-prep": {
        "name": "Préparation des témoins & contre-interrogatoire",
        "desc": "Plans de questions pour l'interrogatoire et le contre-interrogatoire, réponses attendues, pièges et éléments de crédibilité.",
        "starters": [
          "Prépare les questions du contre-interrogatoire de ce témoin.",
          "Prépare notre témoin à sa déposition."
        ]
      },
      "adversary": {
        "name": "Simulateur avocat adverse & juge",
        "desc": "Mettez votre dossier à l'épreuve : la meilleure attaque adverse, puis le raisonnement et la décision probables d'un juge.",
        "starters": [
          "Attaque notre dossier comme le ferait le meilleur avocat adverse.",
          "Rédige la décision qu'un juge attentif rendrait probablement."
        ]
      },
      "arbitration": {
        "name": "Arbitrage & MARD",
        "desc": "Bilan de la clause, demande d'arbitrage, stratégie devant le tribunal, mesures provisoires, annulation et exécution.",
        "starters": [
          "Notre clause compromissoire est-elle valable et quels sont les risques ?",
          "Rédige une demande d'arbitrage.",
          "Cette sentence peut-elle être exécutée dans le pays choisi ?"
        ]
      },
      "demand-settlement": {
        "name": "Mise en demeure & transaction",
        "desc": "Mises en demeure formelles et protocoles transactionnels, avec une évaluation du montant acceptable.",
        "starters": [
          "Rédige une mise en demeure pour factures impayées.",
          "Quel montant transactionnel devrions-nous accepter ?"
        ]
      },
      "criminal": {
        "name": "Analyse d'affaire pénale",
        "desc": "Éléments constitutifs, preuves, procédure et droits, moyens de défense, peines encourues et effet des nouveaux codes pénaux.",
        "starters": [
          "Analyse si les éléments constitutifs de l'infraction sont établis.",
          "Le nouveau code pénal change-t-il l'issue pour ces faits ?"
        ]
      },
      "compliance-gap": {
        "name": "Analyse des écarts de conformité",
        "desc": "Cartographie les règles applicables à votre activité, identifie les écarts et fournit un plan de remédiation priorisé.",
        "starters": [
          "Quelles autorisations et obligations de conformité s'appliquent à mon activité ?",
          "Audite nos pratiques actuelles au regard de la loi."
        ]
      },
      "privacy": {
        "name": "Protection des données & AIPD",
        "desc": "Base légale, registre des traitements, transferts internationaux, gestion des violations et AIPD complète — PDP, RGPD, PDPA et autres.",
        "starters": [
          "Réalise une AIPD pour ce traitement.",
          "Nous avons subi une violation de données — que faire et dans quels délais ?"
        ]
      },
      "aml-kyc": {
        "name": "LCB-FT/KYC & sanctions",
        "desc": "Notation du risque client, analyse des bénéficiaires effectifs, signaux d'alerte, logique de filtrage sanctions et contrôle des exportations, rédaction de déclarations de soupçon.",
        "starters": [
          "Note le risque de ce client et liste les mesures de vigilance renforcée.",
          "Cette opération nécessite-t-elle une déclaration de soupçon ?"
        ]
      },
      "employment": {
        "name": "Droit du travail & RH",
        "desc": "Recrutement, contrats, procédure de licenciement, calcul des indemnités, politiques internes et conflits collectifs.",
        "starters": [
          "Calcule l'indemnité pour ce licenciement et la procédure à suivre.",
          "Ce CDD est-il valable ou requalifié en CDI ?"
        ]
      },
      "ip": {
        "name": "Disponibilité & protection de la PI",
        "desc": "Stratégie marques/droit d'auteur/brevets/dessins et modèles, risque de contrefaçon, licences et actions.",
        "starters": [
          "Pouvons-nous déposer cette marque et quels sont les risques d'antériorité ?",
          "Quelqu'un a copié notre produit — quelles sont nos options ?"
        ]
      },
      "tax": {
        "name": "Analyse fiscale",
        "desc": "IS, IR, TVA, retenues à la source, établissement stable et conventions fiscales — avec calculs et voies de recours.",
        "starters": [
          "Quels impôts s'appliquent à cette prestation transfrontalière ?",
          "Nous avons reçu un avis d'imposition — comment le contester et avant quand ?"
        ]
      },
      "esg": {
        "name": "ESG & durabilité",
        "desc": "Reporting de durabilité obligatoire, devoir de vigilance dans la chaîne d'approvisionnement, risque d'écoblanchiment et devoirs des dirigeants.",
        "starters": [
          "Quelles règles de reporting de durabilité s'appliquent à nous et quand ?",
          "Vérifie nos allégations marketing au regard du risque d'écoblanchiment."
        ]
      },
      "ai-governance": {
        "name": "Gouvernance de l'IA & régulation technologique",
        "desc": "Classe les systèmes d'IA (par ex. niveaux de risque de l'AI Act), cartographie les obligations, rédige les politiques IA et les clauses fournisseurs.",
        "starters": [
          "Classe notre cas d'usage d'IA et liste nos obligations.",
          "Rédige une politique interne d'utilisation de l'IA générative."
        ]
      },
      "opinion-letter": {
        "name": "Avis juridique & lettre de conseil",
        "desc": "Avis juridiques formels et lettres de conseil avec hypothèses, réserves et recommandations claires.",
        "starters": [
          "Rédige un avis juridique sur la licéité de cette opération.",
          "Rédige une lettre à mon client expliquant ses options."
        ]
      },
      "plain-language": {
        "name": "Explication en langage clair",
        "desc": "Explique un contrat, un jugement, une convocation ou une loi à un non-juriste : ce que cela signifie, que faire et avant quand.",
        "starters": [
          "Explique-moi ce document simplement. Que dois-je faire ?",
          "J'ai reçu une convocation au tribunal — que se passe-t-il ensuite ?"
        ]
      },
      "legislative": {
        "name": "Rédaction législative & politiques publiques",
        "desc": "Rédige projets de loi, règlements, règlements régionaux, statuts et exposés des motifs (naskah akademik) avec étude d'impact.",
        "starters": [
          "Rédige un règlement régional sur ce sujet avec le plan de son exposé des motifs.",
          "Relis ce projet de loi pour en repérer les défauts de rédaction."
        ]
      },
      "translation": {
        "name": "Traduction juridique",
        "desc": "Traduction juridique précise aux termes définis cohérents, avec glossaire bilingue et notes sur les notions intraduisibles.",
        "starters": [
          "Traduis ce contrat en anglais en gardant des termes juridiques précis.",
          "Traduis ce jugement en indonésien."
        ]
      },
      "deadlines": {
        "name": "Calculateur de délais & prescription",
        "desc": "Délais de procédure et de prescription, calculés à partir de vos dates avec les règles de computation affichées.",
        "starters": [
          "Quels sont tous nos délais après ce jugement ?",
          "Cette action est-elle prescrite ?"
        ]
      },
      "ask": {
        "name": "Question juridique libre",
        "desc": "Réponses rapides et sourcées à toute question juridique — avec la règle, son statut et ce qu'il faut vérifier.",
        "starters": [
          "Quel est le capital minimum pour créer une société à capitaux étrangers ?",
          "Puis-je enregistrer un appel téléphonique sans consentement ?",
          "Quels sont mes droits si mon vol est annulé ?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "Question de recherche (facultatif, si absente de votre demande)"
      },
      "role": {
        "label": "Vous représentez",
        "options": {
          "neutral": "Neutre / vision objective",
          "claimant": "Demandeur / requérant",
          "defendant": "Défendeur / intimé",
          "prosecution": "Parquet / enquêteur",
          "defence": "Défense pénale",
          "judge": "Juge / arbitre (projet de motivation)",
          "inhouse": "Juriste d'entreprise / société",
          "regulator": "Régulateur / administration",
          "individual": "Particulier (non juriste)"
        }
      },
      "stage": {
        "label": "Stade / juridiction",
        "options": {
          "pre": "Précontentieux / conseil",
          "first": "Première instance",
          "appeal": "Appel",
          "cassation": "Cassation / cour suprême",
          "review": "Recours extraordinaire (ex. PK)",
          "constitutional": "Cour constitutionnelle",
          "administrative": "Juridiction administrative",
          "arbitration": "Arbitrage",
          "mediation": "Médiation / négociation",
          "investigation": "Enquête pénale"
        }
      },
      "goal": {
        "label": "Résultat souhaité",
        "placeholder": "ex. récupérer 250 000 US$, obtenir le rejet de la demande, transiger sous 60 jours"
      },
      "case-builder:facts_date": {
        "label": "Quand les faits principaux ont-ils eu lieu ?",
        "placeholder": "ex. mars 2024 – janvier 2025"
      },
      "compare": {
        "label": "Comparer avec (pays/États, séparés par des virgules)",
        "placeholder": "ex. Singapour, Malaisie, Delaware, Angleterre"
      },
      "statute:instrument": {
        "label": "Loi / règlement et articles",
        "placeholder": "ex. UU 27/2022 art. 20–25 ; RGPD art. 6 ; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "Norme ou acte contesté"
      },
      "regulatory-radar:business": {
        "label": "Votre activité / secteur",
        "placeholder": "ex. plateforme de crédit en ligne, 200 salariés"
      },
      "horizon": {
        "label": "Horizon",
        "options": {
          "6": "6 derniers & prochains mois",
          "12": "12 derniers & prochains mois",
          "24": "24 derniers & prochains mois"
        }
      },
      "contract-review:side": {
        "label": "Votre partie au contrat",
        "placeholder": "ex. le fournisseur / le locataire / l'acheteur"
      },
      "appetite": {
        "label": "Appétence au risque",
        "options": {
          "balanced": "Équilibrée",
          "conservative": "Prudente (protéger ma partie)",
          "commercial": "Commerciale (conclure l'affaire)"
        }
      },
      "playbook": {
        "label": "Votre playbook / exigences (facultatif)",
        "placeholder": "ex. plafond de responsabilité = 12 mois de redevances ; droit indonésien ; paiement à 30 jours"
      },
      "type": {
        "label": "Type de contrat",
        "placeholder": "ex. contrat SaaS, cession d'actions, distribution, travail, NDA, bail"
      },
      "contract-draft:side": {
        "label": "Rédigé en faveur de"
      },
      "bilingual": {
        "label": "Version bilingue",
        "options": {
          "no": "Non",
          "en-id": "Anglais + indonésien (deux colonnes)",
          "en-local": "Anglais + langue officielle locale"
        }
      },
      "negotiation:side": {
        "label": "Votre partie"
      },
      "deal": {
        "label": "Opération",
        "placeholder": "ex. acquisition de 70 % de PT X par un investisseur étranger"
      },
      "materiality": {
        "label": "Seuil de matérialité",
        "placeholder": "ex. contrats de plus de 50 000 US$"
      },
      "entity": {
        "label": "Forme sociale",
        "placeholder": "ex. PT PMA, LLC, SAS"
      },
      "doc-compare:side": {
        "label": "Votre partie (facultatif)"
      },
      "budget": {
        "label": "Budget / contraintes"
      },
      "pleadings:doctype": {
        "label": "Acte à rédiger",
        "options": {
          "claim": "Assignation / requête (gugatan)",
          "answer": "Conclusions en défense (jawaban, eksepsi)",
          "reply": "Réplique / replik",
          "rejoinder": "Duplique / duplik",
          "conclusion": "Conclusions récapitulatives / kesimpulan",
          "appeal": "Mémoire d'appel / memori banding",
          "counter-appeal": "Mémoire en réponse à l'appel",
          "cassation": "Mémoire en cassation / memori kasasi",
          "review": "Requête en révision / memori PK",
          "motion": "Requête (mesures provisoires, etc.)",
          "complaint-crim": "Plainte pénale",
          "pledoi": "Plaidoirie de la défense (pledoi)",
          "petition-const": "Requête constitutionnelle"
        }
      },
      "witness": {
        "label": "Témoin (nom/qualité)"
      },
      "rules": {
        "label": "Institution / règlement",
        "placeholder": "ex. SIAC, CCI, BANI, CNUDCI, LCIA, HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "Document",
        "options": {
          "demand": "Mise en demeure (somasi)",
          "response": "Réponse à une mise en demeure",
          "settlement": "Protocole transactionnel",
          "valuation": "Évaluation transactionnelle seule"
        }
      },
      "criminal:facts_date": {
        "label": "Date des faits reprochés"
      },
      "compliance-gap:business": {
        "label": "Activité, opérations et taille",
        "placeholder": "ex. place de marché en ligne, 1 M d'utilisateurs, paiements via partenaires, données hébergées à Singapour"
      },
      "processing": {
        "label": "Traitement",
        "placeholder": "ex. pointage biométrique de 2 000 salariés, traité par un prestataire en Inde"
      },
      "privacy:doctype": {
        "label": "Livrable",
        "options": {
          "dpia": "AIPD complète",
          "ropa": "Registre des traitements",
          "transfer": "Évaluation de transfert international",
          "breach": "Plan de réponse / notification de violation",
          "policy": "Mention / politique de confidentialité"
        }
      },
      "subject": {
        "label": "Client / opération"
      },
      "worker": {
        "label": "Informations sur le salarié (pour les calculs)",
        "placeholder": "type de contrat, date d'entrée, salaire mensuel & primes fixes, motif du licenciement"
      },
      "asset": {
        "label": "Actif / question de PI"
      },
      "tax_year": {
        "label": "Exercice / période fiscale"
      },
      "esg:business": {
        "label": "Profil de l'entreprise"
      },
      "system": {
        "label": "Système / cas d'usage d'IA"
      },
      "opinion-letter:doctype": {
        "label": "Document",
        "options": {
          "advice": "Lettre de conseil au client",
          "opinion": "Avis juridique formel (pendapat hukum)",
          "memo": "Note interne",
          "letter": "Lettre à une autorité / à la partie adverse"
        }
      },
      "recipient": {
        "label": "Destinataire"
      },
      "legislative:instrument": {
        "label": "Type d'acte",
        "placeholder": "ex. Perda Kabupaten, arrêté ministériel, règlement intérieur, projet de loi"
      },
      "translation:target": {
        "label": "Traduire en",
        "placeholder": "ex. anglais, indonésien, arabe"
      },
      "layout": {
        "label": "Mise en page",
        "options": {
          "plain": "Traduction seule",
          "side": "Tableau côte à côte"
        }
      },
      "trigger": {
        "label": "Événement déclencheur et date",
        "placeholder": "ex. jugement prononcé le 14 août 2026 ; courrier reçu le 2 sept. 2026"
      }
    }
  },
  it: {
    "groups": {
      "research": "Ricerca & analisi",
      "transactions": "Contratti & operazioni",
      "disputes": "Contenzioso & controversie",
      "compliance": "Compliance & rischi",
      "drafting": "Redazione & comunicazione"
    },
    "areaGroups": {
      "General": "Generale",
      "Public law": "Diritto pubblico",
      "Private & commercial": "Diritto privato & commerciale",
      "Technology & IP": "Tecnologia & PI",
      "People": "Persone & famiglia",
      "Criminal & compliance": "Penale & compliance",
      "Sectors": "Settori",
      "Disputes": "Controversie"
    },
    "areas": {
      "general": "Generale / non so",
      "constitutional": "Diritto costituzionale",
      "administrative": "Diritto amministrativo & autorizzazioni",
      "procurement": "Appalti pubblici & PPP",
      "human-rights": "Diritti umani",
      "international": "Diritto internazionale pubblico & trattati",
      "elections": "Elezioni & partiti politici",
      "contracts": "Contratti & obbligazioni",
      "torts": "Responsabilità extracontrattuale",
      "corporate": "Diritto societario",
      "ma": "Fusioni & acquisizioni",
      "capital-markets": "Mercati dei capitali & strumenti finanziari",
      "banking": "Banca & finanza",
      "fintech": "Fintech, pagamenti & cripto-attività",
      "insurance": "Assicurazioni",
      "competition": "Concorrenza / antitrust",
      "consumer": "Tutela dei consumatori",
      "insolvency": "Insolvenza & ristrutturazione",
      "real-estate": "Immobiliare & fondiario",
      "construction": "Costruzioni & ingegneria",
      "franchise": "Franchising, agenzia & distribuzione",
      "ip": "Proprietà intellettuale",
      "privacy": "Protezione dei dati & privacy",
      "cyber": "Cybersicurezza",
      "ai-tech": "Regolazione di IA & tecnologia",
      "telecom-media": "Telecomunicazioni, media & radiotelevisione",
      "employment": "Diritto del lavoro",
      "immigration": "Immigrazione & cittadinanza",
      "family": "Famiglia & stato personale",
      "succession": "Successioni, testamenti & trust",
      "health": "Sanità & scienze della vita",
      "education": "Istruzione",
      "nonprofit": "Enti non profit, fondazioni & confessioni religiose",
      "indigenous": "Diritto consuetudinario & dei popoli indigeni",
      "criminal": "Diritto & procedura penale",
      "white-collar": "Reati economici & indagini",
      "aml": "Antiriciclaggio & sanzioni",
      "anti-corruption": "Anticorruzione & compliance etica",
      "tax": "Diritto tributario",
      "trade": "Commercio, dogane & controllo delle esportazioni",
      "environment": "Ambiente, clima & risorse naturali",
      "energy": "Energia, miniere & infrastrutture",
      "maritime": "Diritto marittimo, navigazione & aviazione",
      "transport": "Trasporti & logistica",
      "agri-food": "Agricoltura & alimentare",
      "islamic-finance": "Finanza islamica & conformità alla sharia",
      "esg": "ESG & corporate governance",
      "sports-ent": "Sport, media & intrattenimento",
      "litigation": "Contenzioso & procedura civile",
      "arbitration": "Arbitrato & ADR"
    },
    "regions": {
      "supranational": "Internazionale & UE",
      "asia": "Asia",
      "middle-east": "Medio Oriente",
      "europe": "Europa",
      "americas": "Americhe",
      "africa": "Africa",
      "oceania": "Oceania"
    },
    "special": {
      "EU": "Unione europea (diritto UE)",
      "INT": "Diritto internazionale pubblico & trattati"
    },
    "citations": {
      "auto": "Standard locale dell'ordinamento",
      "bluebook": "Bluebook (USA)",
      "oscola": "OSCOLA (Regno Unito)",
      "aglc": "AGLC (Australia)",
      "mcgill": "McGill Guide (Canada)",
      "id": "Prassi indonesiana (Pasal/ayat, Putusan No.)",
      "eu": "Stile ufficiale UE (ECLI, riferimenti GU)"
    },
    "traditions": {
      "civil": "Civil law",
      "common": "Common law",
      "islamic": "Diritto islamico (sharia)",
      "customary": "Diritto consuetudinario",
      "socialist": "Diritto socialista"
    },
    "ws": {
      "research": {
        "name": "Memo di ricerca giuridica",
        "desc": "Un memo di ricerca da partner: la regola, le sue fonti, come la applicano i giudici e cosa significa per i tuoi fatti.",
        "starters": [
          "Un datore di lavoro può licenziare un dipendente per ritardi ripetuti, e quale indennità spetta?",
          "Quali sono i requisiti di una firma elettronica valida ed è ammissibile come prova?",
          "Un patto di non concorrenza è efficace dopo la fine del rapporto?"
        ]
      },
      "case-builder": {
        "name": "Costruttore del caso — riordina un fascicolo",
        "desc": "Carica gli atti: parti, cronologia, questioni giuridiche, diritto applicabile dalla costituzione in giù, analisi elemento per elemento, lacune probatorie e strategia — secondo il diritto vigente.",
        "starters": [
          "Riordina questo fascicolo e dimmi i nostri punti più forti e più deboli.",
          "Ricostruisci il caso secondo il diritto vigente e segnala cosa è cambiato dai fatti.",
          "Prepara una sintesi del caso pronta per il contenzioso per la riunione dei partner."
        ]
      },
      "multi-jurisdiction": {
        "name": "Confronto tra ordinamenti",
        "desc": "Confronta come fino a 8 paesi o stati trattano la stessa questione — fianco a fianco, con una struttura consigliata.",
        "starters": [
          "Confronta gli obblighi di notifica dei data breach in questi ordinamenti.",
          "Dove è più semplice costituire una holding per il Sud-est asiatico e perché?"
        ]
      },
      "statute": {
        "name": "Navigatore di leggi & regolamenti",
        "desc": "Spiega qualsiasi legge articolo per articolo: significato, modifiche, norme attuative, interpretazioni giurisprudenziali e impatto pratico.",
        "starters": [
          "Spiega questi articoli, le loro modifiche e come li leggono i giudici.",
          "Quali regolamenti attuativi esistono per questa legge e cosa aggiungono?"
        ]
      },
      "constitutional": {
        "name": "Controllo di costituzionalità & ricorsi",
        "desc": "Verifica una legge, un regolamento o un atto della PA rispetto alla costituzione o a norme superiori: legittimazione, motivi, precedenti e schema di ricorso.",
        "starters": [
          "Questo regolamento può essere impugnato per contrasto con la costituzione?",
          "Abbozza un ricorso con legittimazione e motivi di costituzionalità."
        ]
      },
      "judgment": {
        "name": "Analisi delle sentenze",
        "desc": "Carica una sentenza o un lodo: dispositivo, ratio decidendi, obiter, mappa del ragionamento, valore di precedente e motivi di impugnazione.",
        "starters": [
          "Analizza questa sentenza ed elenca i motivi di appello.",
          "Riassumi la ratio e come incide sulla nostra causa pendente."
        ]
      },
      "regulatory-radar": {
        "name": "Radar & impatto normativo",
        "desc": "Cosa è cambiato, cosa arriva e cosa significa per la tua attività — con piano d'azione e scadenze.",
        "starters": [
          "Quali novità normative riguardano il mio settore e cosa dobbiamo fare?",
          "Costruisci un calendario di compliance con le prossime scadenze."
        ]
      },
      "citation-check": {
        "name": "Verifica di citazioni & fonti",
        "desc": "Controlla ogni citazione in un atto, memo o risposta di IA: formato, esistenza, stato attuale e se sostiene l'affermazione.",
        "starters": [
          "Controlla tutte le citazioni di questo documento e segnala i dubbi.",
          "Verifica che queste norme siano ancora in vigore e numerate correttamente."
        ]
      },
      "contract-review": {
        "name": "Revisione contrattuale & redline",
        "desc": "Revisione clausola per clausola per la tua parte: rischi, tutele mancanti, efficacia secondo il diritto locale e modifiche proposte.",
        "starters": [
          "Rivedi questo contratto per la mia parte e proponi modifiche.",
          "Quali sono i 10 rischi principali di questo accordo e come risolverli?",
          "Verifica questo contratto rispetto al mio playbook."
        ]
      },
      "contract-draft": {
        "name": "Redazione di contratti",
        "desc": "Redige un contratto completo ed efficace localmente da un term sheet o una descrizione — con note di redazione e alternative.",
        "starters": [
          "Redigi un accordo di riservatezza reciproco regolato dal diritto locale.",
          "Redigi un contratto di sviluppo software da questi termini."
        ]
      },
      "negotiation": {
        "name": "Strategia & playbook di negoziazione",
        "desc": "Posizioni, BATNA, scala delle concessioni e risposte parola per parola alle richieste della controparte.",
        "starters": [
          "Prepara il mio playbook di negoziazione per questi termini contrattuali.",
          "Come devo rispondere alle loro modifiche?"
        ]
      },
      "due-diligence": {
        "name": "Due diligence",
        "desc": "Esamina una data room: societario, contratti, licenze, lavoro, PI, contenziosi, fisco e compliance — con report delle red flag ed elenco delle condizioni sospensive.",
        "starters": [
          "Produci un report di due diligence con le red flag da questi documenti.",
          "Elenca le condizioni sospensive e le manleve specifiche necessarie."
        ]
      },
      "corporate-secretarial": {
        "name": "Societario & segreteria",
        "desc": "Delibere del CdA e dei soci, verbali, modifiche statutarie, adempimenti e matrici di approvazione conformi alle formalità locali.",
        "starters": [
          "Redigi una decisione dei soci per nominare un nuovo amministratore.",
          "Quali approvazioni e adempimenti servono per emettere nuove azioni?"
        ]
      },
      "doc-compare": {
        "name": "Confronto di documenti",
        "desc": "Confronta due versioni di un contratto o di una legge: ogni modifica, chi favorisce e il suo effetto giuridico.",
        "starters": [
          "Confronta queste due versioni e spiega ogni modifica.",
          "Cosa ha cambiato la nuova legge rispetto a quella precedente?"
        ]
      },
      "litigation-strategy": {
        "name": "Strategia processuale & valutazione del caso",
        "desc": "Merito, foro, rimedi, costi e tempi — con fasce di probabilità di successo e un piano passo per passo.",
        "starters": [
          "Facciamo causa o transigiamo? Dammi i numeri e il piano.",
          "Valuta le nostre probabilità e il foro migliore."
        ]
      },
      "pleadings": {
        "name": "Atti processuali",
        "desc": "Redige citazioni, comparse di risposta, repliche, controrepliche, atti di appello, ricorsi per cassazione e revocazione nel formato del giudice locale.",
        "starters": [
          "Redigi una citazione per inadempimento contrattuale con sequestro conservativo.",
          "Redigi la nostra comparsa di risposta con le eccezioni di giurisdizione."
        ]
      },
      "chronology": {
        "name": "Cronologia & matrice delle prove",
        "desc": "Trasforma una pila di documenti in una cronologia con fonti e una matrice delle prove per questione.",
        "starters": [
          "Costruisci una cronologia con fonti da tutti questi documenti.",
          "Quali fatti sono provati, contestati o non provati?"
        ]
      },
      "witness-prep": {
        "name": "Preparazione testi & controesame",
        "desc": "Piani di domande per esame e controesame, risposte attese, trappole ed elementi sulla credibilità.",
        "starters": [
          "Prepara le domande del controesame per questo testimone.",
          "Prepara il nostro testimone alla deposizione."
        ]
      },
      "adversary": {
        "name": "Simulatore controparte & giudice",
        "desc": "Metti alla prova il tuo caso: il miglior attacco della controparte, poi come un giudice probabilmente ragionerebbe e deciderebbe.",
        "starters": [
          "Attacca il nostro caso come farebbe il miglior avvocato avversario.",
          "Scrivi la sentenza che un giudice scrupoloso probabilmente emetterebbe."
        ]
      },
      "arbitration": {
        "name": "Arbitrato & ADR",
        "desc": "Verifica della clausola, domanda di arbitrato, strategia davanti al tribunale, misure cautelari, impugnazione ed esecuzione del lodo.",
        "starters": [
          "La nostra clausola arbitrale è valida e quali sono i rischi?",
          "Redigi una domanda di arbitrato.",
          "Questo lodo può essere eseguito nel paese scelto?"
        ]
      },
      "demand-settlement": {
        "name": "Diffida & transazione",
        "desc": "Diffide e messe in mora formali e accordi transattivi, con una valutazione di cosa accettare.",
        "starters": [
          "Redigi una diffida formale per fatture non pagate.",
          "Quale importo transattivo dovremmo accettare?"
        ]
      },
      "criminal": {
        "name": "Analisi del caso penale",
        "desc": "Elementi del reato, prove, procedura e diritti, difese, cornice edittale ed effetto dei nuovi codici penali.",
        "starters": [
          "Analizza se gli elementi del reato sono provati.",
          "Il nuovo codice penale cambia l'esito per questi fatti?"
        ]
      },
      "compliance-gap": {
        "name": "Gap analysis di compliance",
        "desc": "Mappa le norme applicabili alla tua attività, individua le lacune e fornisce un piano di rimedio con priorità.",
        "starters": [
          "Quali licenze e obblighi di compliance si applicano alla mia attività?",
          "Verifica le nostre prassi attuali rispetto alla legge."
        ]
      },
      "privacy": {
        "name": "Protezione dei dati & DPIA",
        "desc": "Base giuridica, registro dei trattamenti, trasferimenti all'estero, gestione dei data breach e DPIA completa — PDP, GDPR, PDPA e altro.",
        "starters": [
          "Esegui una DPIA per questo trattamento.",
          "Abbiamo subito un data breach — cosa dobbiamo fare ed entro quando?"
        ]
      },
      "aml-kyc": {
        "name": "Antiriciclaggio/KYC & sanzioni",
        "desc": "Profilazione del rischio cliente, analisi del titolare effettivo, indicatori di anomalia, logica di screening sanzioni ed export control, redazione di segnalazioni sospette.",
        "starters": [
          "Valuta il rischio di questo cliente ed elenca le misure di adeguata verifica rafforzata.",
          "Questa operazione richiede una segnalazione di operazione sospetta?"
        ]
      },
      "employment": {
        "name": "Lavoro & HR",
        "desc": "Assunzioni, contratti, procedura di licenziamento, calcolo delle indennità, policy e vertenze sindacali.",
        "starters": [
          "Calcola l'indennità per questo licenziamento e la procedura corretta.",
          "Questo contratto a termine è valido o si converte a tempo indeterminato?"
        ]
      },
      "ip": {
        "name": "Ricerca di anteriorità & tutela della PI",
        "desc": "Strategia per marchi, diritto d'autore, brevetti e design, rischio di contraffazione, licenze e azioni di tutela.",
        "starters": [
          "Possiamo registrare questo marchio e quali sono i rischi di conflitto?",
          "Qualcuno ha copiato il nostro prodotto — quali opzioni abbiamo?"
        ]
      },
      "tax": {
        "name": "Analisi fiscale",
        "desc": "Imposte societarie, personali, IVA, ritenute, stabile organizzazione e convenzioni — con calcoli e vie di contenzioso.",
        "starters": [
          "Quali imposte si applicano a questo servizio transfrontaliero?",
          "Abbiamo ricevuto un avviso di accertamento — come e entro quando opporci?"
        ]
      },
      "esg": {
        "name": "ESG & sostenibilità",
        "desc": "Rendicontazione di sostenibilità obbligatoria, due diligence della filiera, rischio di greenwashing e doveri degli amministratori.",
        "starters": [
          "Quali obblighi di rendicontazione di sostenibilità si applicano a noi e da quando?",
          "Verifica i nostri claim di marketing per il rischio di greenwashing."
        ]
      },
      "ai-governance": {
        "name": "Governance dell'IA & regolazione tecnologica",
        "desc": "Classifica i sistemi di IA (es. livelli di rischio dell'AI Act), mappa gli obblighi, redige policy sull'IA e clausole per i fornitori.",
        "starters": [
          "Classifica il nostro caso d'uso di IA ed elenca i nostri obblighi.",
          "Redigi una policy interna sull'uso dell'IA generativa."
        ]
      },
      "opinion-letter": {
        "name": "Parere legale & lettera di consulenza",
        "desc": "Pareri legali formali e lettere di consulenza con presupposti, riserve e raccomandazioni chiare.",
        "starters": [
          "Scrivi un parere legale sulla liceità di questa operazione.",
          "Scrivi una lettera al mio cliente che spieghi le sue opzioni."
        ]
      },
      "plain-language": {
        "name": "Spiegazione in linguaggio semplice",
        "desc": "Spiega un contratto, una sentenza, una citazione o una legge a chi non è giurista: cosa significa, cosa fare ed entro quando.",
        "starters": [
          "Spiegami questo documento in parole semplici. Cosa devo fare?",
          "Ho ricevuto una citazione in tribunale — cosa succede ora?"
        ]
      },
      "legislative": {
        "name": "Redazione normativa & policy",
        "desc": "Redige disegni di legge, regolamenti, regolamenti regionali, statuti e relazioni illustrative (naskah akademik) con analisi d'impatto.",
        "starters": [
          "Redigi un regolamento regionale su questo tema con lo schema della relazione illustrativa.",
          "Rivedi questo disegno di legge per i difetti di drafting."
        ]
      },
      "translation": {
        "name": "Traduzione giuridica",
        "desc": "Traduzione giuridica precisa con termini definiti coerenti, glossario bilingue e note sui concetti intraducibili.",
        "starters": [
          "Traduci questo contratto in inglese mantenendo precisi i termini giuridici.",
          "Traduci questa sentenza in indonesiano."
        ]
      },
      "deadlines": {
        "name": "Calcolatore di termini & prescrizione",
        "desc": "Termini processuali e di prescrizione, calcolati dalle tue date con le regole di computo mostrate.",
        "starters": [
          "Quali sono tutti i nostri termini dopo questa sentenza?",
          "Il termine di prescrizione per questa domanda è scaduto?"
        ]
      },
      "ask": {
        "name": "Domanda giuridica libera",
        "desc": "Risposte rapide e documentate a qualsiasi domanda giuridica — con la norma, il suo stato e cosa verificare.",
        "starters": [
          "Qual è il capitale minimo per costituire una società a partecipazione estera?",
          "Posso registrare una telefonata senza consenso?",
          "Quali diritti ho se il mio volo viene cancellato?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "Domanda di ricerca (facoltativa, se non è nella richiesta)"
      },
      "role": {
        "label": "Rappresenti",
        "options": {
          "neutral": "Neutrale / visione oggettiva",
          "claimant": "Attore / ricorrente",
          "defendant": "Convenuto / resistente",
          "prosecution": "Accusa / inquirente",
          "defence": "Difesa penale",
          "judge": "Giudice / arbitro (bozza di motivazione)",
          "inhouse": "Legale d'impresa / società",
          "regulator": "Autorità / amministrazione",
          "individual": "Privato (non giurista)"
        }
      },
      "stage": {
        "label": "Fase / foro",
        "options": {
          "pre": "Pre-contenzioso / consulenza",
          "first": "Primo grado",
          "appeal": "Appello",
          "cassation": "Cassazione / corte suprema",
          "review": "Impugnazione straordinaria (es. PK)",
          "constitutional": "Corte costituzionale",
          "administrative": "Giudice amministrativo",
          "arbitration": "Arbitrato",
          "mediation": "Mediazione / negoziazione",
          "investigation": "Indagine penale"
        }
      },
      "goal": {
        "label": "Risultato desiderato",
        "placeholder": "es. recuperare 250.000 US$, rigetto della domanda, transazione entro 60 giorni"
      },
      "case-builder:facts_date": {
        "label": "Quando sono avvenuti i fatti principali?",
        "placeholder": "es. marzo 2024 – gennaio 2025"
      },
      "compare": {
        "label": "Confronta con (paesi/stati, separati da virgola)",
        "placeholder": "es. Singapore, Malesia, Delaware, Inghilterra"
      },
      "statute:instrument": {
        "label": "Legge / regolamento e articoli",
        "placeholder": "es. UU 27/2022 artt. 20–25; GDPR art. 6; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "Norma o atto impugnato"
      },
      "regulatory-radar:business": {
        "label": "La tua attività / settore",
        "placeholder": "es. piattaforma di prestiti digitali, 200 dipendenti"
      },
      "horizon": {
        "label": "Orizzonte temporale",
        "options": {
          "6": "Ultimi & prossimi 6 mesi",
          "12": "Ultimi & prossimi 12 mesi",
          "24": "Ultimi & prossimi 24 mesi"
        }
      },
      "contract-review:side": {
        "label": "La tua parte nel contratto",
        "placeholder": "es. il fornitore / il conduttore / l'acquirente"
      },
      "appetite": {
        "label": "Propensione al rischio",
        "options": {
          "balanced": "Equilibrata",
          "conservative": "Prudente (tutela la mia parte)",
          "commercial": "Commerciale (chiudere l'affare)"
        }
      },
      "playbook": {
        "label": "Il tuo playbook / requisiti irrinunciabili (facoltativo)",
        "placeholder": "es. limite di responsabilità = 12 mesi di corrispettivi; legge indonesiana; pagamento a 30 giorni"
      },
      "type": {
        "label": "Tipo di contratto",
        "placeholder": "es. contratto SaaS, cessione di quote, distribuzione, lavoro, NDA, locazione"
      },
      "contract-draft:side": {
        "label": "Redatto a favore di"
      },
      "bilingual": {
        "label": "Versione bilingue",
        "options": {
          "no": "No",
          "en-id": "Inglese + indonesiano (due colonne)",
          "en-local": "Inglese + lingua ufficiale locale"
        }
      },
      "negotiation:side": {
        "label": "La tua parte"
      },
      "deal": {
        "label": "Operazione",
        "placeholder": "es. acquisizione del 70% di PT X da parte di un investitore estero"
      },
      "materiality": {
        "label": "Soglia di rilevanza",
        "placeholder": "es. contratti oltre 50.000 US$"
      },
      "entity": {
        "label": "Tipo di ente",
        "placeholder": "es. PT PMA, LLC, S.r.l."
      },
      "doc-compare:side": {
        "label": "La tua parte (facoltativa)"
      },
      "budget": {
        "label": "Budget / vincoli"
      },
      "pleadings:doctype": {
        "label": "Atto da redigere",
        "options": {
          "claim": "Atto di citazione / gugatan",
          "answer": "Comparsa di risposta (jawaban, eksepsi)",
          "reply": "Replica / replik",
          "rejoinder": "Controreplica / duplik",
          "conclusion": "Comparsa conclusionale / kesimpulan",
          "appeal": "Atto di appello / memori banding",
          "counter-appeal": "Comparsa di risposta in appello",
          "cassation": "Ricorso per cassazione / memori kasasi",
          "review": "Ricorso per revocazione / memori PK",
          "motion": "Istanza (provvedimenti cautelari, ecc.)",
          "complaint-crim": "Denuncia-querela",
          "pledoi": "Arringa difensiva (pledoi)",
          "petition-const": "Ricorso costituzionale"
        }
      },
      "witness": {
        "label": "Testimone (nome/ruolo)"
      },
      "rules": {
        "label": "Istituzione / regolamento",
        "placeholder": "es. SIAC, ICC, CAM, BANI, UNCITRAL, LCIA, HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "Documento",
        "options": {
          "demand": "Diffida / messa in mora (somasi)",
          "response": "Risposta a una diffida",
          "settlement": "Accordo transattivo",
          "valuation": "Solo valutazione della transazione"
        }
      },
      "criminal:facts_date": {
        "label": "Data dei fatti contestati"
      },
      "compliance-gap:business": {
        "label": "Attività, operazioni e dimensioni",
        "placeholder": "es. marketplace online, 1 milione di utenti, pagamenti tramite partner, dati a Singapore"
      },
      "processing": {
        "label": "Trattamento",
        "placeholder": "es. rilevazione presenze biometrica di 2.000 dipendenti, gestita da un fornitore in India"
      },
      "privacy:doctype": {
        "label": "Risultato",
        "options": {
          "dpia": "DPIA completa",
          "ropa": "Registro dei trattamenti",
          "transfer": "Valutazione del trasferimento all'estero",
          "breach": "Piano di risposta / notifica di data breach",
          "policy": "Informativa / policy privacy"
        }
      },
      "subject": {
        "label": "Cliente / operazione"
      },
      "worker": {
        "label": "Dati del dipendente (per i calcoli)",
        "placeholder": "tipo di contratto, data di inizio, retribuzione mensile & indennità fisse, motivo del licenziamento"
      },
      "asset": {
        "label": "Diritto / questione di PI"
      },
      "tax_year": {
        "label": "Anno / periodo d'imposta"
      },
      "esg:business": {
        "label": "Profilo aziendale"
      },
      "system": {
        "label": "Sistema / caso d'uso di IA"
      },
      "opinion-letter:doctype": {
        "label": "Documento",
        "options": {
          "advice": "Lettera di consulenza al cliente",
          "opinion": "Parere legale formale (pendapat hukum)",
          "memo": "Memo interno",
          "letter": "Lettera all'autorità / alla controparte"
        }
      },
      "recipient": {
        "label": "Destinatario"
      },
      "legislative:instrument": {
        "label": "Tipo di atto",
        "placeholder": "es. Perda Kabupaten, decreto ministeriale, regolamento aziendale, disegno di legge"
      },
      "translation:target": {
        "label": "Traduci in",
        "placeholder": "es. inglese, indonesiano, arabo"
      },
      "layout": {
        "label": "Impaginazione",
        "options": {
          "plain": "Solo traduzione",
          "side": "Tabella a fronte"
        }
      },
      "trigger": {
        "label": "Evento iniziale e data",
        "placeholder": "es. sentenza pubblicata il 14 ago 2026; atto ricevuto il 2 set 2026"
      }
    }
  },
  zh: {
    "groups": {
      "research": "研究与分析",
      "transactions": "合同与交易",
      "disputes": "诉讼与争议",
      "compliance": "合规与风险",
      "drafting": "起草与沟通"
    },
    "areaGroups": {
      "General": "通用",
      "Public law": "公法",
      "Private & commercial": "民商法",
      "Technology & IP": "科技与知识产权",
      "People": "个人与家庭",
      "Criminal & compliance": "刑事与合规",
      "Sectors": "行业",
      "Disputes": "争议解决"
    },
    "areas": {
      "general": "通用 / 不确定",
      "constitutional": "宪法",
      "administrative": "行政法与许可",
      "procurement": "政府采购与 PPP",
      "human-rights": "人权",
      "international": "国际公法与条约",
      "elections": "选举与政党",
      "contracts": "合同与债法",
      "torts": "侵权 / 违法行为与责任",
      "corporate": "公司法",
      "ma": "并购",
      "capital-markets": "资本市场与证券",
      "banking": "银行与金融",
      "fintech": "金融科技、支付与加密资产",
      "insurance": "保险",
      "competition": "竞争 / 反垄断",
      "consumer": "消费者保护",
      "insolvency": "破产与重组",
      "real-estate": "房地产与土地",
      "construction": "建设工程",
      "franchise": "特许经营、代理与分销",
      "ip": "知识产权",
      "privacy": "数据保护与隐私",
      "cyber": "网络安全",
      "ai-tech": "人工智能与科技监管",
      "telecom-media": "电信、媒体与广播",
      "employment": "劳动与雇佣",
      "immigration": "移民与国籍",
      "family": "婚姻家庭与身份",
      "succession": "继承、遗嘱与信托",
      "health": "医疗与生命科学",
      "education": "教育",
      "nonprofit": "非营利组织、基金会与宗教",
      "indigenous": "习惯法与原住民法",
      "criminal": "刑法与刑事诉讼",
      "white-collar": "白领犯罪与调查",
      "aml": "反洗钱/反恐融资与制裁",
      "anti-corruption": "反腐败与道德合规",
      "tax": "税法",
      "trade": "贸易、海关与出口管制",
      "environment": "环境、气候与自然资源",
      "energy": "能源、矿业与基础设施",
      "maritime": "海事、航运与航空",
      "transport": "运输与物流",
      "agri-food": "农业与食品",
      "islamic-finance": "伊斯兰金融与教法合规",
      "esg": "ESG 与公司治理",
      "sports-ent": "体育、媒体与娱乐",
      "litigation": "民事诉讼与程序",
      "arbitration": "仲裁与替代性纠纷解决"
    },
    "regions": {
      "supranational": "国际与欧盟",
      "asia": "亚洲",
      "middle-east": "中东",
      "europe": "欧洲",
      "americas": "美洲",
      "africa": "非洲",
      "oceania": "大洋洲"
    },
    "special": {
      "EU": "欧盟（欧盟法）",
      "INT": "国际公法与条约"
    },
    "citations": {
      "auto": "该法域的本地标准",
      "bluebook": "Bluebook（美国）",
      "oscola": "OSCOLA（英国）",
      "aglc": "AGLC（澳大利亚）",
      "mcgill": "McGill Guide（加拿大）",
      "id": "印度尼西亚惯例（Pasal/ayat、Putusan No.）",
      "eu": "欧盟官方格式（ECLI、OJ 引注）"
    },
    "traditions": {
      "civil": "大陆法系",
      "common": "普通法系",
      "islamic": "伊斯兰法（沙里亚）",
      "customary": "习惯法",
      "socialist": "社会主义法系"
    },
    "ws": {
      "research": {
        "name": "法律研究备忘录",
        "desc": "合伙人水准的研究备忘录：规则、出处、法院如何适用，以及对您案情的意义。",
        "starters": [
          "雇主能否因员工屡次迟到而解雇，需支付哪些经济补偿？",
          "有效电子签名的要件是什么？能否作为证据采纳？",
          "竞业限制条款在劳动关系结束后是否可执行？"
        ]
      },
      "case-builder": {
        "name": "案件构建 —— 重整案卷",
        "desc": "上传案件材料：获得当事人、时间线、法律争点、从宪法到下位法的适用法律、逐要件分析、证据缺口与策略 —— 依据现行法律。",
        "starters": [
          "重整这份案卷，告诉我我们最强和最弱的论点。",
          "依据现行法律重建案件，并标出事件发生后有哪些变化。",
          "为合伙人会议准备一份可直接用于诉讼的案件摘要。"
        ]
      },
      "multi-jurisdiction": {
        "name": "多法域比较",
        "desc": "并列比较最多 8 个国家或州对同一问题的处理，并给出推荐架构。",
        "starters": [
          "比较这些法域的数据泄露通知义务。",
          "在哪里设立东南亚控股公司最方便？为什么？"
        ]
      },
      "statute": {
        "name": "法律法规导读",
        "desc": "逐条解读任何法律：含义、修订、实施细则、司法解释与实际影响。",
        "starters": [
          "解释这些条文、其修订情况以及法院如何理解。",
          "这部法律有哪些实施细则？它们补充了什么？"
        ]
      },
      "constitutional": {
        "name": "合宪性与司法审查",
        "desc": "以宪法或上位法审查法律、法规或政府行为：诉讼资格、理由、先例及申请书提纲。",
        "starters": [
          "这项法规能否以违宪为由提出挑战？",
          "拟定司法审查申请提纲，包括诉讼资格和宪法理由。"
        ]
      },
      "judgment": {
        "name": "裁判文书分析",
        "desc": "上传判决或裁决：裁判结果、裁判要旨、附带意见、推理图谱、先例价值与上诉理由。",
        "starters": [
          "分析这份判决并列出上诉理由。",
          "概括裁判要旨及其对我们未决案件的影响。"
        ]
      },
      "regulatory-radar": {
        "name": "监管雷达与影响",
        "desc": "发生了哪些变化、即将出台什么、对您的业务意味着什么 —— 附行动计划与时限。",
        "starters": [
          "哪些监管变化影响我的行业？我们必须做什么？",
          "建立一份即将到期事项的合规日历。"
        ]
      },
      "citation-check": {
        "name": "引注与依据核查",
        "desc": "核查诉状、备忘录或 AI 回答中的每一处引注：格式、是否存在、现行效力以及是否支持所述观点。",
        "starters": [
          "核查本文件中的所有引注并标出可疑之处。",
          "确认这些法规仍然有效且条号正确。"
        ]
      },
      "contract-review": {
        "name": "合同审查与修订",
        "desc": "站在您一方逐条审查：风险、缺失的保护、依当地法律的可执行性及修改建议。",
        "starters": [
          "站在我方审查这份合同并提出修改。",
          "这份协议的十大风险是什么？如何修正？",
          "对照我的谈判手册检查这份合同。"
        ]
      },
      "contract-draft": {
        "name": "合同起草",
        "desc": "根据条款清单或描述起草完整且在当地可执行的合同 —— 附起草说明与备选条款。",
        "starters": [
          "起草一份适用当地法律的双向保密协议。",
          "根据这些条款起草软件开发协议。"
        ]
      },
      "negotiation": {
        "name": "谈判策略与手册",
        "desc": "立场、BATNA、让步阶梯，以及逐字回应对方要求的话术。",
        "starters": [
          "为这些合同条款准备我的谈判手册。",
          "我该如何回应他们的修改稿？"
        ]
      },
      "due-diligence": {
        "name": "尽职调查",
        "desc": "审阅数据室：公司、合同、许可、劳动、知识产权、争议、税务与合规 —— 出具风险报告与先决条件清单。",
        "starters": [
          "根据这些文件出具尽职调查风险报告。",
          "列出我们需要的先决条件和特别赔偿条款。"
        ]
      },
      "corporate-secretarial": {
        "name": "公司与秘书事务",
        "desc": "符合当地形式要求的董事会和股东决议、会议记录、章程修订、备案及审批矩阵。",
        "starters": [
          "起草委任新董事的股东书面决议。",
          "发行新股需要哪些审批和备案？"
        ]
      },
      "doc-compare": {
        "name": "文件比对",
        "desc": "比较合同或法律的两个版本：每处改动、对谁有利及其法律效果。",
        "starters": [
          "比较这两个版本并解释每处改动。",
          "新法与旧法相比改了什么？"
        ]
      },
      "litigation-strategy": {
        "name": "诉讼策略与案件评估",
        "desc": "实体、管辖、救济、成本与时间 —— 附胜诉概率区间和分步计划。",
        "starters": [
          "我们该起诉还是和解？给我数据和计划。",
          "评估我们的胜算和最佳管辖法院。"
        ]
      },
      "pleadings": {
        "name": "诉讼文书",
        "desc": "按当地法院格式起草起诉状、答辩状、反驳、再答辩、上诉状、再审及申诉申请。",
        "starters": [
          "起草一份违约起诉状并申请财产保全。",
          "起草我们的答辩状，包括管辖异议。"
        ]
      },
      "chronology": {
        "name": "时间线与证据矩阵",
        "desc": "把一堆文件整理成有出处的时间线和按争点排列的证据矩阵。",
        "starters": [
          "根据所有这些文件建立带出处的时间线。",
          "哪些事实已证明、有争议或未证明？"
        ]
      },
      "witness-prep": {
        "name": "证人准备与交叉询问",
        "desc": "主询问与交叉询问的问题计划、预期回答、陷阱及质疑可信度的材料。",
        "starters": [
          "为这名证人准备交叉询问问题。",
          "帮我们的证人做好出庭作证准备。"
        ]
      },
      "adversary": {
        "name": "对方律师与法官模拟",
        "desc": "对您的案件做压力测试：对方最强的攻击，以及法官可能如何推理和裁判。",
        "starters": [
          "像最优秀的对方律师一样攻击我们的案件。",
          "写出一位审慎法官可能作出的判决。"
        ]
      },
      "arbitration": {
        "name": "仲裁与替代性纠纷解决",
        "desc": "仲裁条款体检、仲裁通知、仲裁庭策略、临时措施，以及撤销与执行分析。",
        "starters": [
          "我们的仲裁条款是否有效？有哪些风险？",
          "起草仲裁通知。",
          "该裁决能否在所选国家执行？"
        ]
      },
      "demand-settlement": {
        "name": "催告函与和解",
        "desc": "正式催告/通知函和和解协议，并评估可接受的金额。",
        "starters": [
          "为未付发票起草正式催告函。",
          "我们应接受多少和解金额？"
        ]
      },
      "criminal": {
        "name": "刑事案件分析",
        "desc": "犯罪构成要件、证据、程序与权利、辩护、量刑幅度以及新刑法典的影响。",
        "starters": [
          "分析犯罪构成要件是否得到证明。",
          "新刑法典会改变这些事实的结果吗？"
        ]
      },
      "compliance-gap": {
        "name": "合规差距分析",
        "desc": "梳理适用于您业务的规则，找出差距，并给出按优先级排列的整改计划。",
        "starters": [
          "我的业务需要哪些许可和合规义务？",
          "对照法律审计我们的现行做法。"
        ]
      },
      "privacy": {
        "name": "数据保护与影响评估（DPIA）",
        "desc": "合法性基础、处理活动记录、跨境传输、泄露应对及完整 DPIA —— 涵盖 PDP、GDPR、PDPA 等。",
        "starters": [
          "为这项处理活动做一次 DPIA。",
          "我们发生了数据泄露 —— 必须做什么、何时之前？"
        ]
      },
      "aml-kyc": {
        "name": "反洗钱/KYC 与制裁",
        "desc": "客户风险评级、受益所有人分析、可疑迹象、制裁与出口管制筛查逻辑、可疑交易报告起草。",
        "starters": [
          "为该客户评定风险并列出强化尽职调查步骤。",
          "这笔交易需要提交可疑交易报告吗？"
        ]
      },
      "employment": {
        "name": "劳动与人力资源",
        "desc": "招聘、合同、解雇程序、经济补偿计算、规章制度与劳动争议。",
        "starters": [
          "计算这次解雇的经济补偿并说明正确程序。",
          "这份固定期限合同有效吗？是否已转为无固定期限？"
        ]
      },
      "ip": {
        "name": "知识产权检索与保护",
        "desc": "商标、著作权、专利、外观设计策略，侵权风险，许可与维权方案。",
        "starters": [
          "我们能注册这个品牌吗？有哪些冲突风险？",
          "有人抄袭了我们的产品 —— 我们有哪些选择？"
        ]
      },
      "tax": {
        "name": "税务分析",
        "desc": "企业所得税、个人所得税、增值税、预提税、常设机构与税收协定分析，附计算与争议途径。",
        "starters": [
          "这项跨境服务安排涉及哪些税？",
          "我们收到了税务评定 —— 如何、何时之前提出异议？"
        ]
      },
      "esg": {
        "name": "ESG 与可持续发展",
        "desc": "强制性可持续发展报告、供应链尽职调查、漂绿风险与董事职责。",
        "starters": [
          "哪些可持续发展报告规则适用于我们？何时开始？",
          "检查我们的营销宣传是否存在漂绿风险。"
        ]
      },
      "ai-governance": {
        "name": "AI 治理与科技监管",
        "desc": "对 AI 系统分类（如欧盟《人工智能法》风险等级），梳理义务，起草 AI 政策和供应商条款。",
        "starters": [
          "对我们的 AI 用例分类并列出我们的义务。",
          "起草一份内部生成式 AI 使用政策。"
        ]
      },
      "opinion-letter": {
        "name": "法律意见书与咨询函",
        "desc": "正式法律意见书和客户咨询函，包含假设、保留意见与明确建议。",
        "starters": [
          "就这笔交易是否被允许出具法律意见书。",
          "给我的客户写一封咨询函，解释其可选方案。"
        ]
      },
      "plain-language": {
        "name": "通俗解读",
        "desc": "向非法律人士解释合同、判决、传票或法律：是什么意思、该做什么、何时之前。",
        "starters": [
          "用简单的话给我解释这份文件。我必须做什么？",
          "我收到了法院传票 —— 接下来会怎样？"
        ]
      },
      "legislative": {
        "name": "立法与政策起草",
        "desc": "起草法律草案、法规、地方性法规、规章制度与立法说明（naskah akademik），并做监管影响分析。",
        "starters": [
          "就该议题起草一部地方性法规，并附立法说明提纲。",
          "审查这份法律草案的起草缺陷。"
        ]
      },
      "translation": {
        "name": "法律翻译",
        "desc": "精准的法律翻译，保持定义术语一致，附双语词汇表和不可译概念的说明。",
        "starters": [
          "把这份合同译成英文，保持法律术语精准。",
          "把这份判决译成印尼语。"
        ]
      },
      "deadlines": {
        "name": "期限与时效计算",
        "desc": "根据您的日期计算程序期限和诉讼时效，并显示计算规则。",
        "starters": [
          "这份判决之后我们有哪些期限？",
          "这项请求的诉讼时效是否已过？"
        ]
      },
      "ask": {
        "name": "任意法律问题",
        "desc": "快速、有出处地回答任何法律问题 —— 包括法律依据、现行效力以及需要核实的事项。",
        "starters": [
          "设立外资公司的最低资本是多少？",
          "未经同意可以录制电话通话吗？",
          "航班取消时我有哪些权利？"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "研究问题（可选，若请求中未写明）"
      },
      "role": {
        "label": "您代表",
        "options": {
          "neutral": "中立 / 客观立场",
          "claimant": "原告 / 申请人",
          "defendant": "被告 / 被申请人",
          "prosecution": "公诉方 / 侦查人员",
          "defence": "刑事辩护",
          "judge": "法官 / 仲裁员（拟写裁判理由）",
          "inhouse": "企业法务 / 公司",
          "regulator": "监管机构 / 政府",
          "individual": "个人（非法律专业人士）"
        }
      },
      "stage": {
        "label": "阶段 / 机构",
        "options": {
          "pre": "诉前 / 咨询",
          "first": "一审法院",
          "appeal": "上诉",
          "cassation": "最高法院 / 撤销审",
          "review": "特别再审（如 PK）",
          "constitutional": "宪法法院",
          "administrative": "行政法院 / 行政裁判机构",
          "arbitration": "仲裁",
          "mediation": "调解 / 谈判",
          "investigation": "刑事侦查"
        }
      },
      "goal": {
        "label": "期望结果",
        "placeholder": "例如：追回 25 万美元、驳回起诉、60 天内和解"
      },
      "case-builder:facts_date": {
        "label": "关键事件发生在何时？",
        "placeholder": "例如：2024 年 3 月 – 2025 年 1 月"
      },
      "compare": {
        "label": "比较对象（国家/州，用逗号分隔）",
        "placeholder": "例如：新加坡、马来西亚、特拉华、英格兰"
      },
      "statute:instrument": {
        "label": "法律 / 法规及条文",
        "placeholder": "例如：UU 27/2022 第 20–25 条；GDPR 第 6 条；Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "被审查的规范或行为"
      },
      "regulatory-radar:business": {
        "label": "您的业务 / 行业",
        "placeholder": "例如：数字借贷平台，200 名员工"
      },
      "horizon": {
        "label": "时间范围",
        "options": {
          "6": "过去及未来 6 个月",
          "12": "过去及未来 12 个月",
          "24": "过去及未来 24 个月"
        }
      },
      "contract-review:side": {
        "label": "您在合同中的身份",
        "placeholder": "例如：供应商 / 承租人 / 买方"
      },
      "appetite": {
        "label": "风险偏好",
        "options": {
          "balanced": "平衡",
          "conservative": "保守（保护我方）",
          "commercial": "商业（促成交易）"
        }
      },
      "playbook": {
        "label": "您的谈判手册 / 必备条款（可选）",
        "placeholder": "例如：责任上限 = 12 个月费用；适用印尼法律；30 天付款"
      },
      "type": {
        "label": "合同类型",
        "placeholder": "例如：SaaS 协议、股权转让、分销、劳动、保密协议、租赁"
      },
      "contract-draft:side": {
        "label": "起草时偏向"
      },
      "bilingual": {
        "label": "双语版本",
        "options": {
          "no": "否",
          "en-id": "英文 + 印尼文（两栏）",
          "en-local": "英文 + 当地官方语言"
        }
      },
      "negotiation:side": {
        "label": "您的一方"
      },
      "deal": {
        "label": "交易",
        "placeholder": "例如：外国投资者收购 PT X 70% 股权"
      },
      "materiality": {
        "label": "重要性门槛",
        "placeholder": "例如：金额超过 5 万美元的合同"
      },
      "entity": {
        "label": "主体类型",
        "placeholder": "例如：PT PMA、LLC、有限责任公司"
      },
      "doc-compare:side": {
        "label": "您的一方（可选）"
      },
      "budget": {
        "label": "预算 / 限制条件"
      },
      "pleadings:doctype": {
        "label": "要起草的文书",
        "options": {
          "claim": "起诉状 / gugatan",
          "answer": "答辩状（jawaban、eksepsi）",
          "reply": "反驳 / replik",
          "rejoinder": "再答辩 / duplik",
          "conclusion": "结案陈词 / kesimpulan",
          "appeal": "上诉状 / memori banding",
          "counter-appeal": "上诉答辩状",
          "cassation": "最高法院上诉状 / memori kasasi",
          "review": "再审申请 / memori PK",
          "motion": "申请（临时救济等）",
          "complaint-crim": "刑事控告 / 报案材料",
          "pledoi": "辩护词（pledoi）",
          "petition-const": "宪法诉愿书"
        }
      },
      "witness": {
        "label": "证人（姓名/身份）"
      },
      "rules": {
        "label": "机构 / 规则",
        "placeholder": "例如：SIAC、ICC、CIETAC、BANI、UNCITRAL、LCIA、HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "文书",
        "options": {
          "demand": "催告函 / 违约通知（somasi）",
          "response": "对催告函的回复",
          "settlement": "和解协议",
          "valuation": "仅评估和解金额"
        }
      },
      "criminal:facts_date": {
        "label": "被指控行为的日期"
      },
      "compliance-gap:business": {
        "label": "业务、活动与规模",
        "placeholder": "例如：线上平台，100 万用户，通过合作方收款，数据存储在新加坡"
      },
      "processing": {
        "label": "处理活动",
        "placeholder": "例如：为 2,000 名员工做生物识别考勤，由印度的供应商处理"
      },
      "privacy:doctype": {
        "label": "输出",
        "options": {
          "dpia": "完整 DPIA",
          "ropa": "处理活动记录（RoPA）",
          "transfer": "跨境传输评估",
          "breach": "泄露应对计划 / 通知",
          "policy": "隐私声明 / 政策"
        }
      },
      "subject": {
        "label": "客户 / 交易"
      },
      "worker": {
        "label": "员工信息（用于计算）",
        "placeholder": "合同类型、入职日期、月工资及固定津贴、解雇原因"
      },
      "asset": {
        "label": "知识产权资产 / 问题"
      },
      "tax_year": {
        "label": "纳税年度 / 期间"
      },
      "esg:business": {
        "label": "公司概况"
      },
      "system": {
        "label": "AI 系统 / 用例"
      },
      "opinion-letter:doctype": {
        "label": "文书",
        "options": {
          "advice": "客户咨询函",
          "opinion": "正式法律意见书（pendapat hukum）",
          "memo": "内部备忘录",
          "letter": "致主管机关 / 对方的函件"
        }
      },
      "recipient": {
        "label": "收件人"
      },
      "legislative:instrument": {
        "label": "文件类型",
        "placeholder": "例如：Perda Kabupaten、部门规章、公司规章制度、法律草案"
      },
      "translation:target": {
        "label": "译为",
        "placeholder": "例如：英语、印尼语、阿拉伯语"
      },
      "layout": {
        "label": "版式",
        "options": {
          "plain": "仅译文",
          "side": "左右对照表"
        }
      },
      "trigger": {
        "label": "起算事件及日期",
        "placeholder": "例如：2026 年 8 月 14 日宣判；2026 年 9 月 2 日收到通知"
      }
    }
  },
  ja: {
    "groups": {
      "research": "リサーチ・分析",
      "transactions": "契約・取引",
      "disputes": "訴訟・紛争",
      "compliance": "コンプライアンス・リスク",
      "drafting": "起案・コミュニケーション"
    },
    "areaGroups": {
      "General": "一般",
      "Public law": "公法",
      "Private & commercial": "民事・商事",
      "Technology & IP": "テクノロジー・知財",
      "People": "個人・家族",
      "Criminal & compliance": "刑事・コンプライアンス",
      "Sectors": "業界",
      "Disputes": "紛争解決"
    },
    "areas": {
      "general": "一般 / 不明",
      "constitutional": "憲法",
      "administrative": "行政法・許認可",
      "procurement": "公共調達・PPP",
      "human-rights": "人権",
      "international": "国際公法・条約",
      "elections": "選挙・政党",
      "contracts": "契約・債権法",
      "torts": "不法行為・損害賠償責任",
      "corporate": "会社法",
      "ma": "M&A",
      "capital-markets": "資本市場・証券",
      "banking": "銀行・金融",
      "fintech": "フィンテック・決済・暗号資産",
      "insurance": "保険",
      "competition": "競争法 / 独占禁止法",
      "consumer": "消費者保護",
      "insolvency": "倒産・事業再生",
      "real-estate": "不動産・土地",
      "construction": "建設・エンジニアリング",
      "franchise": "フランチャイズ・代理店・販売",
      "ip": "知的財産",
      "privacy": "データ保護・プライバシー",
      "cyber": "サイバーセキュリティ",
      "ai-tech": "AI・テクノロジー規制",
      "telecom-media": "通信・メディア・放送",
      "employment": "労働・雇用",
      "immigration": "出入国管理・国籍",
      "family": "家族・身分関係",
      "succession": "相続・遺言・信託",
      "health": "医療・ライフサイエンス",
      "education": "教育",
      "nonprofit": "非営利法人・財団・宗教",
      "indigenous": "慣習法・先住民法",
      "criminal": "刑法・刑事手続",
      "white-collar": "経済犯罪・調査",
      "aml": "AML/CFT・制裁",
      "anti-corruption": "腐敗防止・倫理コンプライアンス",
      "tax": "税務",
      "trade": "貿易・関税・輸出管理",
      "environment": "環境・気候・天然資源",
      "energy": "エネルギー・鉱業・インフラ",
      "maritime": "海事・海運・航空",
      "transport": "運輸・物流",
      "agri-food": "農業・食品",
      "islamic-finance": "イスラム金融・シャリーア適合",
      "esg": "ESG・コーポレートガバナンス",
      "sports-ent": "スポーツ・メディア・エンターテインメント",
      "litigation": "民事訴訟・手続",
      "arbitration": "仲裁・ADR"
    },
    "regions": {
      "supranational": "国際・EU",
      "asia": "アジア",
      "middle-east": "中東",
      "europe": "ヨーロッパ",
      "americas": "南北アメリカ",
      "africa": "アフリカ",
      "oceania": "オセアニア"
    },
    "special": {
      "EU": "欧州連合（EU法）",
      "INT": "国際公法・条約"
    },
    "citations": {
      "auto": "その法域の標準",
      "bluebook": "Bluebook（米国）",
      "oscola": "OSCOLA（英国）",
      "aglc": "AGLC（オーストラリア）",
      "mcgill": "McGill Guide（カナダ）",
      "id": "インドネシアの実務（Pasal/ayat、Putusan No.）",
      "eu": "EU公式形式（ECLI、官報参照）"
    },
    "traditions": {
      "civil": "大陸法",
      "common": "英米法（コモン・ロー）",
      "islamic": "イスラム法（シャリーア）",
      "customary": "慣習法",
      "socialist": "社会主義法"
    },
    "ws": {
      "research": {
        "name": "リーガルリサーチ・メモ",
        "desc": "パートナー水準のリサーチメモ：ルール、その根拠、裁判所の適用例、そしてあなたの事実関係への意味。",
        "starters": [
          "遅刻を繰り返す従業員を解雇できますか。支払うべき解雇手当は？",
          "有効な電子署名の要件は何ですか。証拠として認められますか？",
          "競業避止条項は雇用終了後も有効ですか？"
        ]
      },
      "case-builder": {
        "name": "ケースビルダー — 事件記録を再構成",
        "desc": "事件資料をアップロード：当事者、時系列、法的争点、憲法以下の適用法、要件ごとの分析、証拠の欠落と戦略 — 現行法に基づいて。",
        "starters": [
          "この事件記録を再構成し、当方の最も強い点と弱い点を教えてください。",
          "現行法で事件を組み立て直し、事件当時から変わった点を示してください。",
          "パートナー会議用に、訴訟に使える事件サマリーを作成してください。"
        ]
      },
      "multi-jurisdiction": {
        "name": "複数法域の比較",
        "desc": "最大8か国・州が同じ問題をどう扱うかを並べて比較し、推奨スキームを示します。",
        "starters": [
          "これらの法域のデータ侵害通知義務を比較してください。",
          "東南アジア向け持株会社を最も設立しやすいのはどこで、なぜですか？"
        ]
      },
      "statute": {
        "name": "法令ナビゲーター",
        "desc": "あらゆる法令を条文ごとに解説：意味、改正、施行規則、裁判所の解釈、実務への影響。",
        "starters": [
          "これらの条文、その改正、裁判所の解釈を説明してください。",
          "この法律にはどんな施行規則があり、何を追加していますか？"
        ]
      },
      "constitutional": {
        "name": "違憲審査・司法審査",
        "desc": "法律・規則・行政行為を憲法や上位法に照らして検討：原告適格、理由、先例、申立書の骨子。",
        "starters": [
          "この規則は憲法違反として争えますか？",
          "原告適格と憲法上の理由を含む司法審査申立書の骨子を作成してください。"
        ]
      },
      "judgment": {
        "name": "判決分析",
        "desc": "判決や仲裁判断をアップロード：結論、判決理由（レイシオ）、傍論、推論マップ、先例価値、上訴理由。",
        "starters": [
          "この判決を分析し、上訴理由を挙げてください。",
          "判決理由を要約し、係属中の当方事件への影響を示してください。"
        ]
      },
      "regulatory-radar": {
        "name": "規制レーダーと影響",
        "desc": "何が変わり、何が来るのか、事業にとって何を意味するのか — 行動計画と期限付きで。",
        "starters": [
          "私の業界に影響する規制変更は何で、何をすべきですか？",
          "今後の期限をまとめたコンプライアンス・カレンダーを作ってください。"
        ]
      },
      "citation-check": {
        "name": "引用・典拠チェッカー",
        "desc": "準備書面、メモ、AIの回答に含まれるすべての引用を確認：形式、実在性、現在の効力、主張を裏付けるか。",
        "starters": [
          "この文書のすべての引用を確認し、疑わしいものを示してください。",
          "これらの法令がまだ有効で、条番号が正しいか確認してください。"
        ]
      },
      "contract-review": {
        "name": "契約レビュー・修正案",
        "desc": "あなたの立場から条項ごとにレビュー：リスク、欠けている保護、現地法での執行可能性、修正案。",
        "starters": [
          "当方の立場でこの契約をレビューし、修正案を出してください。",
          "この契約の主要リスク10点と、その直し方は？",
          "この契約を私のプレイブックと照合してください。"
        ]
      },
      "contract-draft": {
        "name": "契約書の起案",
        "desc": "タームシートや説明から、現地で執行可能な完全な契約書を起案 — 起案メモと代替案付き。",
        "starters": [
          "現地法を準拠法とする双方向の秘密保持契約を起案してください。",
          "これらの条件からソフトウェア開発契約を起案してください。"
        ]
      },
      "negotiation": {
        "name": "交渉戦略・プレイブック",
        "desc": "ポジション、BATNA、譲歩のステップ、相手方の要求への一語一句の回答案。",
        "starters": [
          "この契約条件について交渉プレイブックを用意してください。",
          "相手方の修正案にどう答えるべきですか？"
        ]
      },
      "due-diligence": {
        "name": "デュー・ディリジェンス",
        "desc": "データルームを確認：会社、契約、許認可、労務、知財、紛争、税務、コンプライアンス — レッドフラッグ報告書と前提条件リスト付き。",
        "starters": [
          "これらの資料からレッドフラッグ型のDD報告書を作成してください。",
          "必要な前提条件と特別補償を挙げてください。"
        ]
      },
      "corporate-secretarial": {
        "name": "会社法務・機関運営",
        "desc": "取締役会・株主の決議、議事録、定款変更、登記・届出、承認マトリクスを現地の方式で作成。",
        "starters": [
          "新任取締役を選任する株主の書面決議を起案してください。",
          "新株発行に必要な承認と届出は何ですか？"
        ]
      },
      "doc-compare": {
        "name": "文書比較",
        "desc": "契約や法令の2つの版を比較：すべての変更点、誰に有利か、その法的効果。",
        "starters": [
          "この2つの版を比較し、各変更を説明してください。",
          "新法は旧法と比べて何を変えましたか？"
        ]
      },
      "litigation-strategy": {
        "name": "訴訟戦略・事件評価",
        "desc": "本案の見通し、管轄、救済、費用と期間 — 勝訴確率の幅と段階的な計画付き。",
        "starters": [
          "提訴すべきか和解すべきか、数字と計画を示してください。",
          "当方の勝算と最適な管轄を評価してください。"
        ]
      },
      "pleadings": {
        "name": "訴訟書面",
        "desc": "訴状、答弁書、準備書面、再反論、控訴理由書、上告・再審申立書を現地の裁判所形式で起案。",
        "starters": [
          "仮差押えを伴う契約違反の訴状を起案してください。",
          "管轄違いの抗弁を含む答弁書を起案してください。"
        ]
      },
      "chronology": {
        "name": "時系列・証拠マトリクス",
        "desc": "大量の資料を出典付きの時系列と争点別の証拠マトリクスに整理。",
        "starters": [
          "これらすべての資料から出典付きの時系列を作成してください。",
          "立証済み、争いあり、未立証の事実はどれですか？"
        ]
      },
      "witness-prep": {
        "name": "証人準備・反対尋問",
        "desc": "主尋問・反対尋問の質問計画、想定回答、落とし穴、信用性に関する材料。",
        "starters": [
          "この証人への反対尋問の質問を準備してください。",
          "当方の証人を証言に向けて準備してください。"
        ]
      },
      "adversary": {
        "name": "相手方代理人・裁判官シミュレーター",
        "desc": "事件のストレステスト：相手方の最強の攻撃、そして裁判官がどう考え判断しそうか。",
        "starters": [
          "最も優秀な相手方代理人のように当方の主張を攻撃してください。",
          "慎重な裁判官が下しそうな判決を書いてください。"
        ]
      },
      "arbitration": {
        "name": "仲裁・ADR",
        "desc": "仲裁条項の健全性チェック、仲裁申立書、仲裁廷での戦略、暫定措置、取消し・執行の分析。",
        "starters": [
          "当方の仲裁条項は有効か、リスクは何ですか？",
          "仲裁申立書を起案してください。",
          "この仲裁判断は選んだ国で執行できますか？"
        ]
      },
      "demand-settlement": {
        "name": "催告書・和解",
        "desc": "正式な催告書・通知書と和解契約、受け入れるべき金額の評価付き。",
        "starters": [
          "未払い請求書について正式な催告書を起案してください。",
          "どの程度の和解金額を受け入れるべきですか？"
        ]
      },
      "criminal": {
        "name": "刑事事件分析",
        "desc": "構成要件、証拠、手続と権利、防御、量刑の幅、新刑法典の影響。",
        "starters": [
          "構成要件が立証されているか分析してください。",
          "新しい刑法典でこの事実の結論は変わりますか？"
        ]
      },
      "compliance-gap": {
        "name": "コンプライアンス・ギャップ分析",
        "desc": "事業に適用されるルールを整理し、ギャップを見つけ、優先順位付きの是正計画を作成。",
        "starters": [
          "私の事業に必要な許認可とコンプライアンス義務は何ですか？",
          "現在の実務を法令に照らして監査してください。"
        ]
      },
      "privacy": {
        "name": "データ保護・DPIA",
        "desc": "法的根拠、処理記録、越境移転、漏えい対応、完全なDPIA — PDP、GDPR、PDPAなどに対応。",
        "starters": [
          "この処理活動についてDPIAを実施してください。",
          "データ漏えいが起きました — 何を、いつまでに行うべきですか？"
        ]
      },
      "aml-kyc": {
        "name": "AML/KYC・制裁",
        "desc": "顧客リスク評価、実質的支配者の分析、不審な兆候、制裁・輸出管理のスクリーニング、疑わしい取引の届出の起案。",
        "starters": [
          "この顧客のリスクを評価し、厳格な確認手続を挙げてください。",
          "この取引は疑わしい取引の届出が必要ですか？"
        ]
      },
      "employment": {
        "name": "労務・人事",
        "desc": "採用、契約、解雇手続、解雇手当の計算、社内規程、労使紛争。",
        "starters": [
          "この解雇の手当額と正しい手続を計算してください。",
          "この有期契約は有効ですか、それとも無期に転換されますか？"
        ]
      },
      "ip": {
        "name": "知財クリアランス・保護",
        "desc": "商標・著作権・特許・意匠の戦略、侵害リスク、ライセンスと権利行使の選択肢。",
        "starters": [
          "このブランドを登録できますか。抵触リスクは？",
          "当社製品が模倣されました — どんな選択肢がありますか？"
        ]
      },
      "tax": {
        "name": "税務分析",
        "desc": "法人税、所得税、付加価値税、源泉税、恒久的施設、租税条約の分析 — 計算と不服申立ての道筋付き。",
        "starters": [
          "この越境サービス契約にはどの税が課されますか？",
          "更正通知を受けました — どのように、いつまでに不服を申し立てますか？"
        ]
      },
      "esg": {
        "name": "ESG・サステナビリティ",
        "desc": "義務的なサステナビリティ開示、サプライチェーンのデュー・ディリジェンス、グリーンウォッシュのリスク、取締役の義務。",
        "starters": [
          "当社に適用されるサステナビリティ開示ルールと時期は？",
          "当社の広告表示をグリーンウォッシュの観点で確認してください。"
        ]
      },
      "ai-governance": {
        "name": "AIガバナンス・テック規制",
        "desc": "AIシステムの分類（例：EU AI法のリスク区分）、義務の整理、AIポリシーと委託先条項の起案。",
        "starters": [
          "当社のAI活用事例を分類し、義務を挙げてください。",
          "生成AI利用に関する社内ポリシーを起案してください。"
        ]
      },
      "opinion-letter": {
        "name": "法律意見書・助言書簡",
        "desc": "前提、留保、明確な推奨を備えた正式な法律意見書とクライアント向け助言書簡。",
        "starters": [
          "この取引が許容されるかについて法律意見書を作成してください。",
          "クライアントに選択肢を説明する助言書簡を作成してください。"
        ]
      },
      "plain-language": {
        "name": "やさしい言葉で解説",
        "desc": "契約、判決、呼出状、法律を専門家でない人に説明：意味、すべきこと、期限。",
        "starters": [
          "この文書をやさしい言葉で説明してください。何をすべきですか？",
          "裁判所から呼出状が届きました — この先どうなりますか？"
        ]
      },
      "legislative": {
        "name": "立法・政策の起案",
        "desc": "法案、規則、地方条例、社内規程、立法趣旨書（naskah akademik）を規制影響分析付きで起案。",
        "starters": [
          "このテーマで地方条例を起案し、立法趣旨書の骨子も示してください。",
          "この法案の起案上の欠陥を確認してください。"
        ]
      },
      "translation": {
        "name": "法務翻訳",
        "desc": "定義語を一貫させた正確な法務翻訳、二か国語の用語集、訳しにくい概念の注記付き。",
        "starters": [
          "法律用語を正確に保って、この契約を英訳してください。",
          "この判決をインドネシア語に翻訳してください。"
        ]
      },
      "deadlines": {
        "name": "期限・時効計算",
        "desc": "手続上の期限と時効期間を日付から計算し、計算ルールも表示。",
        "starters": [
          "この判決の後、当方の期限はすべていつですか？",
          "この請求の時効は完成していますか？"
        ]
      },
      "ask": {
        "name": "法律の質問（何でも）",
        "desc": "あらゆる法律の質問に、根拠付きで素早く回答 — 法令、その効力、確認すべき点を示します。",
        "starters": [
          "外資系会社を設立する最低資本金はいくらですか？",
          "同意なしに通話を録音してもよいですか？",
          "フライトが欠航した場合の私の権利は？"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "調査事項（任意、依頼文にない場合）"
      },
      "role": {
        "label": "代理する立場",
        "options": {
          "neutral": "中立 / 客観的な見解",
          "claimant": "原告 / 申立人",
          "defendant": "被告 / 相手方",
          "prosecution": "検察 / 捜査機関",
          "defence": "刑事弁護",
          "judge": "裁判官 / 仲裁人（理由の起案）",
          "inhouse": "企業内弁護士 / 会社",
          "regulator": "規制当局 / 政府",
          "individual": "個人（法律家ではない）"
        }
      },
      "stage": {
        "label": "段階 / 手続の場",
        "options": {
          "pre": "提訴前 / 助言",
          "first": "第一審",
          "appeal": "控訴審",
          "cassation": "上告審 / 最高裁",
          "review": "再審（例：PK）",
          "constitutional": "憲法裁判所",
          "administrative": "行政裁判所・審判",
          "arbitration": "仲裁",
          "mediation": "調停 / 交渉",
          "investigation": "刑事捜査"
        }
      },
      "goal": {
        "label": "望む結果",
        "placeholder": "例：25万米ドルを回収、請求棄却、60日以内に和解"
      },
      "case-builder:facts_date": {
        "label": "主な出来事はいつ起きましたか？",
        "placeholder": "例：2024年3月〜2025年1月"
      },
      "compare": {
        "label": "比較対象（国・州、カンマ区切り）",
        "placeholder": "例：シンガポール、マレーシア、デラウェア、イングランド"
      },
      "statute:instrument": {
        "label": "法令と条文",
        "placeholder": "例：UU 27/2022 第20〜25条、GDPR 第6条、Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "争う規範または行為"
      },
      "regulatory-radar:business": {
        "label": "事業 / 業界",
        "placeholder": "例：デジタル融資プラットフォーム、従業員200名"
      },
      "horizon": {
        "label": "対象期間",
        "options": {
          "6": "過去・今後6か月",
          "12": "過去・今後12か月",
          "24": "過去・今後24か月"
        }
      },
      "contract-review:side": {
        "label": "契約における当方の立場",
        "placeholder": "例：供給者 / 賃借人 / 買主"
      },
      "appetite": {
        "label": "リスク許容度",
        "options": {
          "balanced": "バランス重視",
          "conservative": "保守的（当方を守る）",
          "commercial": "ビジネス重視（取引成立）"
        }
      },
      "playbook": {
        "label": "プレイブック / 必須事項（任意）",
        "placeholder": "例：責任上限＝12か月分の料金、準拠法インドネシア、30日払い"
      },
      "type": {
        "label": "契約の種類",
        "placeholder": "例：SaaS契約、株式譲渡、販売代理、雇用、NDA、賃貸借"
      },
      "contract-draft:side": {
        "label": "有利に起案する相手"
      },
      "bilingual": {
        "label": "二か国語版",
        "options": {
          "no": "なし",
          "en-id": "英語＋インドネシア語（2列）",
          "en-local": "英語＋現地の公用語"
        }
      },
      "negotiation:side": {
        "label": "当方の立場"
      },
      "deal": {
        "label": "取引",
        "placeholder": "例：外国投資家による PT X の株式70%取得"
      },
      "materiality": {
        "label": "重要性の基準",
        "placeholder": "例：5万米ドルを超える契約"
      },
      "entity": {
        "label": "法人形態",
        "placeholder": "例：PT PMA、LLC、株式会社"
      },
      "doc-compare:side": {
        "label": "当方の立場（任意）"
      },
      "budget": {
        "label": "予算 / 制約"
      },
      "pleadings:doctype": {
        "label": "起案する書面",
        "options": {
          "claim": "訴状 / gugatan",
          "answer": "答弁書（jawaban、eksepsi）",
          "reply": "準備書面（反論）/ replik",
          "rejoinder": "再反論 / duplik",
          "conclusion": "最終準備書面 / kesimpulan",
          "appeal": "控訴理由書 / memori banding",
          "counter-appeal": "控訴答弁書",
          "cassation": "上告理由書 / memori kasasi",
          "review": "再審申立書 / memori PK",
          "motion": "申立て（保全処分など）",
          "complaint-crim": "告訴状・被害届",
          "pledoi": "弁論要旨（pledoi）",
          "petition-const": "憲法訴願"
        }
      },
      "witness": {
        "label": "証人（氏名・役割）"
      },
      "rules": {
        "label": "機関 / 規則",
        "placeholder": "例：SIAC、ICC、JCAA、BANI、UNCITRAL、LCIA、HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "書面",
        "options": {
          "demand": "催告書・債務不履行通知（somasi）",
          "response": "催告への回答",
          "settlement": "和解契約",
          "valuation": "和解額の評価のみ"
        }
      },
      "criminal:facts_date": {
        "label": "被疑事実の日付"
      },
      "compliance-gap:business": {
        "label": "事業内容・活動・規模",
        "placeholder": "例：オンラインマーケットプレイス、利用者100万人、決済はパートナー経由、データはシンガポールに保存"
      },
      "processing": {
        "label": "処理活動",
        "placeholder": "例：従業員2,000名の生体認証による勤怠管理、インドの委託先が処理"
      },
      "privacy:doctype": {
        "label": "成果物",
        "options": {
          "dpia": "完全なDPIA",
          "ropa": "処理活動の記録（RoPA）",
          "transfer": "越境移転の評価",
          "breach": "漏えい対応計画 / 通知",
          "policy": "プライバシー通知 / ポリシー"
        }
      },
      "subject": {
        "label": "顧客 / 取引"
      },
      "worker": {
        "label": "従業員の情報（計算用）",
        "placeholder": "契約形態、入社日、月額賃金と固定手当、解雇理由"
      },
      "asset": {
        "label": "知財 / 論点"
      },
      "tax_year": {
        "label": "課税年度 / 期間"
      },
      "esg:business": {
        "label": "会社概要"
      },
      "system": {
        "label": "AIシステム / 活用事例"
      },
      "opinion-letter:doctype": {
        "label": "書面",
        "options": {
          "advice": "クライアント向け助言書簡",
          "opinion": "正式な法律意見書（pendapat hukum）",
          "memo": "社内メモ",
          "letter": "当局・相手方への書簡"
        }
      },
      "recipient": {
        "label": "宛先"
      },
      "legislative:instrument": {
        "label": "法令の種類",
        "placeholder": "例：Perda Kabupaten、省令、社内規程、法案"
      },
      "translation:target": {
        "label": "翻訳先",
        "placeholder": "例：英語、インドネシア語、アラビア語"
      },
      "layout": {
        "label": "レイアウト",
        "options": {
          "plain": "訳文のみ",
          "side": "対訳表"
        }
      },
      "trigger": {
        "label": "起算となる出来事と日付",
        "placeholder": "例：2026年8月14日判決言渡し、2026年9月2日通知受領"
      }
    }
  },
  hi: {
    "groups": {
      "research": "शोध और विश्लेषण",
      "transactions": "अनुबंध और लेन-देन",
      "disputes": "मुकदमे और विवाद",
      "compliance": "अनुपालन और जोखिम",
      "drafting": "मसौदा और संवाद"
    },
    "areaGroups": {
      "General": "सामान्य",
      "Public law": "लोक विधि",
      "Private & commercial": "दीवानी और वाणिज्यिक",
      "Technology & IP": "प्रौद्योगिकी और बौद्धिक संपदा",
      "People": "व्यक्ति और परिवार",
      "Criminal & compliance": "आपराधिक और अनुपालन",
      "Sectors": "क्षेत्र",
      "Disputes": "विवाद"
    },
    "areas": {
      "general": "सामान्य / पक्का नहीं",
      "constitutional": "संवैधानिक विधि",
      "administrative": "प्रशासनिक विधि और लाइसेंस",
      "procurement": "सार्वजनिक खरीद और PPP",
      "human-rights": "मानवाधिकार",
      "international": "अंतरराष्ट्रीय लोक विधि और संधियाँ",
      "elections": "चुनाव और राजनीतिक दल",
      "contracts": "अनुबंध और दायित्व",
      "torts": "अपकृत्य / गैरकानूनी कार्य और दायित्व",
      "corporate": "कंपनी विधि",
      "ma": "विलय और अधिग्रहण",
      "capital-markets": "पूँजी बाज़ार और प्रतिभूतियाँ",
      "banking": "बैंकिंग और वित्त",
      "fintech": "फिनटेक, भुगतान और क्रिप्टो-परिसंपत्तियाँ",
      "insurance": "बीमा",
      "competition": "प्रतिस्पर्धा / एंटीट्रस्ट",
      "consumer": "उपभोक्ता संरक्षण",
      "insolvency": "दिवाला और पुनर्गठन",
      "real-estate": "अचल संपत्ति और भूमि",
      "construction": "निर्माण और इंजीनियरिंग",
      "franchise": "फ्रैंचाइज़, एजेंसी और वितरण",
      "ip": "बौद्धिक संपदा",
      "privacy": "डेटा संरक्षण और निजता",
      "cyber": "साइबर सुरक्षा",
      "ai-tech": "AI और प्रौद्योगिकी विनियमन",
      "telecom-media": "दूरसंचार, मीडिया और प्रसारण",
      "employment": "रोज़गार और श्रम",
      "immigration": "आप्रवासन और नागरिकता",
      "family": "परिवार और व्यक्तिगत स्थिति",
      "succession": "उत्तराधिकार, वसीयत और ट्रस्ट",
      "health": "स्वास्थ्य और जीवन विज्ञान",
      "education": "शिक्षा",
      "nonprofit": "गैर-लाभकारी संस्थाएँ, फ़ाउंडेशन और धर्म",
      "indigenous": "प्रथागत और मूलनिवासी विधि",
      "criminal": "आपराधिक विधि और प्रक्रिया",
      "white-collar": "सफ़ेदपोश अपराध और जाँच",
      "aml": "AML/CFT और प्रतिबंध",
      "anti-corruption": "भ्रष्टाचार-रोधी और नैतिक अनुपालन",
      "tax": "कर",
      "trade": "व्यापार, सीमा शुल्क और निर्यात नियंत्रण",
      "environment": "पर्यावरण, जलवायु और प्राकृतिक संसाधन",
      "energy": "ऊर्जा, खनन और अवसंरचना",
      "maritime": "समुद्री, नौवहन और विमानन",
      "transport": "परिवहन और लॉजिस्टिक्स",
      "agri-food": "कृषि और खाद्य",
      "islamic-finance": "इस्लामी वित्त और शरिया अनुपालन",
      "esg": "ESG और कॉर्पोरेट गवर्नेंस",
      "sports-ent": "खेल, मीडिया और मनोरंजन",
      "litigation": "दीवानी मुकदमा और प्रक्रिया",
      "arbitration": "मध्यस्थता और ADR"
    },
    "regions": {
      "supranational": "अंतरराष्ट्रीय और EU",
      "asia": "एशिया",
      "middle-east": "मध्य पूर्व",
      "europe": "यूरोप",
      "americas": "अमेरिकाएँ",
      "africa": "अफ्रीका",
      "oceania": "ओशिनिया"
    },
    "special": {
      "EU": "यूरोपीय संघ (EU विधि)",
      "INT": "अंतरराष्ट्रीय लोक विधि और संधियाँ"
    },
    "citations": {
      "auto": "क्षेत्राधिकार का स्थानीय मानक",
      "bluebook": "Bluebook (अमेरिका)",
      "oscola": "OSCOLA (ब्रिटेन)",
      "aglc": "AGLC (ऑस्ट्रेलिया)",
      "mcgill": "McGill Guide (कनाडा)",
      "id": "इंडोनेशियाई प्रथा (Pasal/ayat, Putusan No.)",
      "eu": "EU आधिकारिक शैली (ECLI, OJ संदर्भ)"
    },
    "traditions": {
      "civil": "सिविल लॉ",
      "common": "कॉमन लॉ",
      "islamic": "इस्लामी विधि (शरिया)",
      "customary": "प्रथागत विधि",
      "socialist": "समाजवादी विधि"
    },
    "ws": {
      "research": {
        "name": "विधिक शोध मेमो",
        "desc": "पार्टनर-स्तर का शोध मेमो: नियम, उसके स्रोत, अदालतें उसे कैसे लागू करती हैं और आपके तथ्यों के लिए उसका अर्थ।",
        "starters": [
          "क्या नियोक्ता बार-बार देर से आने पर कर्मचारी को हटा सकता है, और कितना मुआवज़ा देय है?",
          "वैध इलेक्ट्रॉनिक हस्ताक्षर की शर्तें क्या हैं और क्या यह साक्ष्य के रूप में स्वीकार्य है?",
          "क्या नौकरी ख़त्म होने के बाद गैर-प्रतिस्पर्धा खंड लागू होता है?"
        ]
      },
      "case-builder": {
        "name": "केस बिल्डर — केस फ़ाइल पुनर्गठित करें",
        "desc": "केस दस्तावेज़ अपलोड करें: पक्षकार, घटनाक्रम, विधिक प्रश्न, संविधान से नीचे तक लागू विधि, तत्व-दर-तत्व विश्लेषण, साक्ष्य की कमियाँ और रणनीति — वर्तमान विधि के अनुसार।",
        "starters": [
          "इस केस फ़ाइल को पुनर्गठित करें और हमारे सबसे मज़बूत और कमज़ोर बिंदु बताएँ।",
          "वर्तमान विधि के तहत केस को फिर से बनाएँ और बताएँ कि घटनाओं के बाद क्या बदला।",
          "पार्टनर बैठक के लिए मुकदमे के लिए तैयार केस सारांश बनाएँ।"
        ]
      },
      "multi-jurisdiction": {
        "name": "बहु-क्षेत्राधिकार तुलना",
        "desc": "तुलना करें कि अधिकतम 8 देश या राज्य एक ही प्रश्न को कैसे देखते हैं — साथ-साथ, एक अनुशंसित संरचना के साथ।",
        "starters": [
          "इन क्षेत्राधिकारों में डेटा उल्लंघन सूचना दायित्वों की तुलना करें।",
          "दक्षिण-पूर्व एशिया के लिए होल्डिंग कंपनी कहाँ बनाना सबसे आसान है और क्यों?"
        ]
      },
      "statute": {
        "name": "क़ानून और विनियम गाइड",
        "desc": "किसी भी क़ानून को धारा-दर-धारा समझाएँ: अर्थ, संशोधन, कार्यान्वयन नियम, न्यायिक व्याख्याएँ और व्यावहारिक प्रभाव।",
        "starters": [
          "इन धाराओं, उनके संशोधनों और अदालतें इन्हें कैसे पढ़ती हैं, यह समझाएँ।",
          "इस क़ानून के लिए कौन-से कार्यान्वयन नियम हैं और वे क्या जोड़ते हैं?"
        ]
      },
      "constitutional": {
        "name": "संवैधानिक और न्यायिक समीक्षा",
        "desc": "किसी क़ानून, विनियम या सरकारी कार्य को संविधान या उच्च विधि पर परखें: लोकस स्टैंडी, आधार, पूर्व निर्णय और याचिका की रूपरेखा।",
        "starters": [
          "क्या इस विनियम को संविधान के विरुद्ध होने के आधार पर चुनौती दी जा सकती है?",
          "लोकस स्टैंडी और संवैधानिक आधारों के साथ न्यायिक समीक्षा याचिका की रूपरेखा बनाएँ।"
        ]
      },
      "judgment": {
        "name": "निर्णय विश्लेषक",
        "desc": "निर्णय या पंचाट अपलोड करें: निष्कर्ष, ratio decidendi, obiter, तर्क-मानचित्र, नज़ीर का मूल्य और अपील के आधार।",
        "starters": [
          "इस निर्णय का विश्लेषण करें और अपील के आधार बताएँ।",
          "ratio का सार दें और बताएँ कि यह हमारे लंबित मामले को कैसे प्रभावित करता है।"
        ]
      },
      "regulatory-radar": {
        "name": "विनियामक रडार और प्रभाव",
        "desc": "क्या बदला, क्या आने वाला है और आपके व्यवसाय के लिए इसका क्या अर्थ है — कार्य योजना और समय-सीमाओं के साथ।",
        "starters": [
          "कौन-से विनियामक बदलाव मेरे क्षेत्र को प्रभावित करते हैं और हमें क्या करना होगा?",
          "आने वाली समय-सीमाओं का अनुपालन कैलेंडर बनाएँ।"
        ]
      },
      "citation-check": {
        "name": "उद्धरण और प्रमाण जाँचक",
        "desc": "किसी याचिका, मेमो या AI उत्तर के हर उद्धरण की जाँच: प्रारूप, अस्तित्व, वर्तमान स्थिति और क्या वह दावे का समर्थन करता है।",
        "starters": [
          "इस दस्तावेज़ के सभी उद्धरण जाँचें और संदिग्ध चीज़ें चिह्नित करें।",
          "पुष्टि करें कि ये क़ानून अभी लागू हैं और सही क्रमांकित हैं।"
        ]
      },
      "contract-review": {
        "name": "अनुबंध समीक्षा और रेडलाइन",
        "desc": "आपके पक्ष के लिए खंड-दर-खंड समीक्षा: जोखिम, छूटे हुए संरक्षण, स्थानीय विधि में प्रवर्तनीयता और सुझाए गए संशोधन।",
        "starters": [
          "मेरे पक्ष के लिए इस अनुबंध की समीक्षा करें और संशोधन सुझाएँ।",
          "इस समझौते के शीर्ष 10 जोखिम क्या हैं और मैं उन्हें कैसे ठीक करूँ?",
          "इस अनुबंध को मेरी प्लेबुक से मिलाएँ।"
        ]
      },
      "contract-draft": {
        "name": "अनुबंध मसौदा",
        "desc": "टर्म शीट या विवरण से पूर्ण, स्थानीय रूप से प्रवर्तनीय अनुबंध तैयार करें — मसौदा नोट्स और विकल्पों के साथ।",
        "starters": [
          "स्थानीय विधि के अधीन पारस्परिक NDA का मसौदा तैयार करें।",
          "इन शर्तों से सॉफ़्टवेयर विकास समझौते का मसौदा तैयार करें।"
        ]
      },
      "negotiation": {
        "name": "वार्ता रणनीति और प्लेबुक",
        "desc": "स्थितियाँ, BATNA, रियायतों की सीढ़ी और दूसरे पक्ष की माँगों के शब्दशः जवाब।",
        "starters": [
          "इन अनुबंध शर्तों के लिए मेरी वार्ता प्लेबुक तैयार करें।",
          "मुझे उनके संशोधनों का जवाब कैसे देना चाहिए?"
        ]
      },
      "due-diligence": {
        "name": "ड्यू डिलिजेंस",
        "desc": "डेटा रूम की समीक्षा: कॉर्पोरेट, अनुबंध, लाइसेंस, रोज़गार, IP, विवाद, कर और अनुपालन — रेड-फ़्लैग रिपोर्ट और पूर्व-शर्तों की सूची के साथ।",
        "starters": [
          "इन दस्तावेज़ों से रेड-फ़्लैग ड्यू डिलिजेंस रिपोर्ट बनाएँ।",
          "हमें चाहिए पूर्व-शर्तें और विशेष क्षतिपूर्तियाँ सूचीबद्ध करें।"
        ]
      },
      "corporate-secretarial": {
        "name": "कॉर्पोरेट और सचिवीय",
        "desc": "स्थानीय औपचारिकताओं के अनुरूप बोर्ड और शेयरधारक प्रस्ताव, कार्यवृत्त, संविधान संशोधन, फ़ाइलिंग और अनुमोदन मैट्रिक्स।",
        "starters": [
          "नए निदेशक की नियुक्ति के लिए शेयरधारकों का परिपत्र प्रस्ताव तैयार करें।",
          "नए शेयर जारी करने के लिए कौन-से अनुमोदन और फ़ाइलिंग चाहिए?"
        ]
      },
      "doc-compare": {
        "name": "दस्तावेज़ तुलना",
        "desc": "किसी अनुबंध या क़ानून के दो संस्करणों की तुलना: हर बदलाव, किसके पक्ष में है और उसका विधिक प्रभाव।",
        "starters": [
          "इन दो संस्करणों की तुलना करें और हर बदलाव समझाएँ।",
          "नए क़ानून ने पुराने की तुलना में क्या बदला?"
        ]
      },
      "litigation-strategy": {
        "name": "मुकदमा रणनीति और केस आकलन",
        "desc": "गुण-दोष, मंच, उपाय, लागत और समय — जीत की संभावना के दायरे और चरण-दर-चरण योजना के साथ।",
        "starters": [
          "हम मुकदमा करें या समझौता? मुझे आँकड़े और योजना दें।",
          "हमारी संभावनाओं और सबसे अच्छे मंच का आकलन करें।"
        ]
      },
      "pleadings": {
        "name": "अभिवचन और अदालती दस्तावेज़",
        "desc": "स्थानीय अदालत के प्रारूप में वाद, लिखित कथन, प्रत्युत्तर, अपील ज्ञापन, कैसेशन और पुनरीक्षण याचिकाएँ तैयार करें।",
        "starters": [
          "अंतरिम कुर्की के साथ अनुबंध उल्लंघन का वाद तैयार करें।",
          "क्षेत्राधिकार आपत्तियों सहित हमारा लिखित कथन तैयार करें।"
        ]
      },
      "chronology": {
        "name": "घटनाक्रम और साक्ष्य मैट्रिक्स",
        "desc": "दस्तावेज़ों के ढेर को स्रोत-सहित समयरेखा और मुद्दा-वार साक्ष्य मैट्रिक्स में बदलें।",
        "starters": [
          "इन सभी दस्तावेज़ों से स्रोत-सहित घटनाक्रम बनाएँ।",
          "कौन-से तथ्य सिद्ध, विवादित या असिद्ध हैं?"
        ]
      },
      "witness-prep": {
        "name": "गवाह तैयारी और जिरह",
        "desc": "मुख्य परीक्षा और जिरह के प्रश्न, अपेक्षित उत्तर, जाल और विश्वसनीयता पर सवाल उठाने की सामग्री।",
        "starters": [
          "इस गवाह की जिरह के प्रश्न तैयार करें।",
          "हमारे गवाह को गवाही के लिए तैयार करें।"
        ]
      },
      "adversary": {
        "name": "विरोधी वकील और न्यायाधीश सिम्युलेटर",
        "desc": "अपने केस की कड़ी परीक्षा: दूसरे पक्ष का सबसे मज़बूत हमला, फिर न्यायाधीश संभवतः कैसे तर्क और निर्णय देंगे।",
        "starters": [
          "सबसे अच्छे विरोधी वकील की तरह हमारे केस पर हमला करें।",
          "एक सावधान न्यायाधीश संभवतः जो निर्णय देगा, वह लिखें।"
        ]
      },
      "arbitration": {
        "name": "मध्यस्थता और ADR",
        "desc": "मध्यस्थता खंड की जाँच, मध्यस्थता नोटिस, अधिकरण रणनीति, अंतरिम उपाय, और रद्दीकरण/प्रवर्तन विश्लेषण।",
        "starters": [
          "क्या हमारा मध्यस्थता खंड वैध है और जोखिम क्या हैं?",
          "मध्यस्थता नोटिस का मसौदा तैयार करें।",
          "क्या यह पंचाट चुने गए देश में लागू हो सकता है?"
        ]
      },
      "demand-settlement": {
        "name": "माँग पत्र और समझौता",
        "desc": "औपचारिक माँग/नोटिस पत्र और समझौता करार, यह आकलन करते हुए कि क्या स्वीकार करें।",
        "starters": [
          "बकाया चालानों के लिए औपचारिक माँग पत्र तैयार करें।",
          "हमें कितनी समझौता राशि स्वीकार करनी चाहिए?"
        ]
      },
      "criminal": {
        "name": "आपराधिक केस विश्लेषण",
        "desc": "अपराध के तत्व, साक्ष्य, प्रक्रिया और अधिकार, बचाव, सज़ा की सीमा और नई दंड संहिताओं का प्रभाव।",
        "starters": [
          "विश्लेषण करें कि अपराध के तत्व सिद्ध हुए हैं या नहीं।",
          "क्या नई दंड संहिता इन तथ्यों का परिणाम बदलती है?"
        ]
      },
      "compliance-gap": {
        "name": "अनुपालन अंतर विश्लेषण",
        "desc": "आपके व्यवसाय पर लागू नियमों का नक्शा बनाएँ, कमियाँ खोजें और प्राथमिकता वाली सुधार योजना पाएँ।",
        "starters": [
          "मेरे व्यवसाय पर कौन-से लाइसेंस और अनुपालन दायित्व लागू होते हैं?",
          "हमारी मौजूदा प्रथाओं का विधि के अनुसार ऑडिट करें।"
        ]
      },
      "privacy": {
        "name": "डेटा संरक्षण और DPIA",
        "desc": "वैध आधार, प्रसंस्करण के अभिलेख, सीमा-पार हस्तांतरण, उल्लंघन प्रतिक्रिया और पूर्ण DPIA — PDP, GDPR, PDPA आदि के अनुसार।",
        "starters": [
          "इस प्रसंस्करण गतिविधि के लिए DPIA करें।",
          "हमारे यहाँ डेटा उल्लंघन हुआ — हमें क्या और कब तक करना होगा?"
        ]
      },
      "aml-kyc": {
        "name": "AML/KYC और प्रतिबंध",
        "desc": "ग्राहक जोखिम रेटिंग, लाभकारी स्वामित्व विश्लेषण, संदिग्ध संकेत, प्रतिबंध और निर्यात-नियंत्रण जाँच तर्क, STR मसौदा।",
        "starters": [
          "इस ग्राहक का जोखिम आँकें और बढ़ी हुई सावधानी के कदम बताएँ।",
          "क्या इस लेन-देन के लिए संदिग्ध लेन-देन रिपोर्ट चाहिए?"
        ]
      },
      "employment": {
        "name": "रोज़गार और HR",
        "desc": "भर्ती, अनुबंध, सेवा-समाप्ति प्रक्रिया, मुआवज़ा गणना, नीतियाँ और औद्योगिक विवाद।",
        "starters": [
          "इस सेवा-समाप्ति का मुआवज़ा और सही प्रक्रिया की गणना करें।",
          "क्या यह निश्चित-अवधि अनुबंध वैध है या स्थायी में बदल गया है?"
        ]
      },
      "ip": {
        "name": "IP क्लियरेंस और संरक्षण",
        "desc": "ट्रेडमार्क/कॉपीराइट/पेटेंट/डिज़ाइन रणनीति, उल्लंघन जोखिम, लाइसेंसिंग और प्रवर्तन विकल्प।",
        "starters": [
          "क्या हम यह ब्रांड पंजीकृत कर सकते हैं और टकराव के जोखिम क्या हैं?",
          "किसी ने हमारे उत्पाद की नक़ल की — हमारे पास क्या विकल्प हैं?"
        ]
      },
      "tax": {
        "name": "कर विश्लेषण",
        "desc": "कॉर्पोरेट, व्यक्तिगत, VAT/GST, विदहोल्डिंग, स्थायी प्रतिष्ठान और संधि विश्लेषण — गणनाओं और विवाद मार्गों के साथ।",
        "starters": [
          "इस सीमा-पार सेवा व्यवस्था पर कौन-से कर लागू होते हैं?",
          "हमें कर निर्धारण मिला है — आपत्ति कैसे और कब तक करें?"
        ]
      },
      "esg": {
        "name": "ESG और स्थिरता",
        "desc": "अनिवार्य स्थिरता रिपोर्टिंग, आपूर्ति-श्रृंखला ड्यू डिलिजेंस, ग्रीनवॉशिंग जोखिम और बोर्ड के कर्तव्य।",
        "starters": [
          "हम पर कौन-से स्थिरता रिपोर्टिंग नियम लागू होते हैं और कब से?",
          "हमारे मार्केटिंग दावों की ग्रीनवॉशिंग जोखिम के लिए समीक्षा करें।"
        ]
      },
      "ai-governance": {
        "name": "AI गवर्नेंस और टेक विनियमन",
        "desc": "AI प्रणालियों का वर्गीकरण (जैसे EU AI Act जोखिम स्तर), दायित्वों का नक्शा, AI नीतियाँ और विक्रेता शर्तों का मसौदा।",
        "starters": [
          "हमारे AI उपयोग मामले का वर्गीकरण करें और हमारे दायित्व बताएँ।",
          "जनरेटिव-AI उपयोग के लिए आंतरिक नीति का मसौदा तैयार करें।"
        ]
      },
      "opinion-letter": {
        "name": "विधिक राय और सलाह पत्र",
        "desc": "मान्यताओं, सीमाओं और स्पष्ट सिफ़ारिशों के साथ औपचारिक विधिक राय और ग्राहक सलाह पत्र।",
        "starters": [
          "इस लेन-देन की अनुमति है या नहीं, इस पर विधिक राय लिखें।",
          "मेरे ग्राहक को उनके विकल्प समझाते हुए सलाह पत्र लिखें।"
        ]
      },
      "plain-language": {
        "name": "सरल भाषा में व्याख्या",
        "desc": "किसी अनुबंध, निर्णय, समन या क़ानून को गैर-वकील को समझाएँ: इसका अर्थ, क्या करना है और कब तक।",
        "starters": [
          "इस दस्तावेज़ को सरल शब्दों में समझाएँ। मुझे क्या करना होगा?",
          "मुझे अदालत का समन मिला है — आगे क्या होगा?"
        ]
      },
      "legislative": {
        "name": "विधायी और नीति मसौदा",
        "desc": "विधेयक, विनियम, क्षेत्रीय विनियम, उपनियम और अकादमिक पत्र (naskah akademik) विनियामक प्रभाव विश्लेषण के साथ तैयार करें।",
        "starters": [
          "इस विषय पर क्षेत्रीय विनियम और उसके अकादमिक पत्र की रूपरेखा तैयार करें।",
          "इस मसौदा विधेयक की मसौदा-त्रुटियों की समीक्षा करें।"
        ]
      },
      "translation": {
        "name": "विधिक अनुवाद",
        "desc": "परिभाषित शब्दों को एकरूप रखते हुए सटीक विधिक अनुवाद, द्विभाषी शब्दावली और अनूदित न हो सकने वाली अवधारणाओं पर टिप्पणी के साथ।",
        "starters": [
          "विधिक शब्दों को सटीक रखते हुए इस अनुबंध का अंग्रेज़ी में अनुवाद करें।",
          "इस निर्णय का इंडोनेशियाई में अनुवाद करें।"
        ]
      },
      "deadlines": {
        "name": "समय-सीमा और परिसीमा कैलकुलेटर",
        "desc": "प्रक्रियात्मक समय-सीमाएँ और परिसीमा अवधि, आपकी तिथियों से गणना और गिनती के नियमों के साथ।",
        "starters": [
          "इस निर्णय के बाद हमारी सभी समय-सीमाएँ क्या हैं?",
          "क्या इस दावे की परिसीमा अवधि समाप्त हो गई है?"
        ]
      },
      "ask": {
        "name": "कुछ भी पूछें (विधिक)",
        "desc": "किसी भी विधिक प्रश्न के त्वरित, स्रोत-सहित उत्तर — विधि, उसकी स्थिति और क्या सत्यापित करना है, इसके साथ।",
        "starters": [
          "विदेशी स्वामित्व वाली कंपनी बनाने के लिए न्यूनतम पूँजी कितनी है?",
          "क्या मैं बिना सहमति के फ़ोन कॉल रिकॉर्ड कर सकता हूँ?",
          "मेरी उड़ान रद्द होने पर मेरे क्या अधिकार हैं?"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "शोध प्रश्न (वैकल्पिक, यदि अनुरोध में नहीं है)"
      },
      "role": {
        "label": "आप किसकी ओर से हैं",
        "options": {
          "neutral": "तटस्थ / वस्तुनिष्ठ दृष्टि",
          "claimant": "वादी / आवेदक",
          "defendant": "प्रतिवादी / उत्तरदाता",
          "prosecution": "अभियोजन / जाँचकर्ता",
          "defence": "आपराधिक बचाव",
          "judge": "न्यायाधीश / मध्यस्थ (तर्क का मसौदा)",
          "inhouse": "इन-हाउस वकील / कंपनी",
          "regulator": "नियामक / सरकार",
          "individual": "व्यक्ति (वकील नहीं)"
        }
      },
      "stage": {
        "label": "चरण / मंच",
        "options": {
          "pre": "मुकदमे से पहले / सलाह",
          "first": "प्रथम दृष्टया अदालत",
          "appeal": "अपील",
          "cassation": "कैसेशन / सर्वोच्च न्यायालय",
          "review": "असाधारण पुनरीक्षण (जैसे PK)",
          "constitutional": "संवैधानिक न्यायालय",
          "administrative": "प्रशासनिक न्यायालय / अधिकरण",
          "arbitration": "मध्यस्थता",
          "mediation": "सुलह / वार्ता",
          "investigation": "आपराधिक जाँच"
        }
      },
      "goal": {
        "label": "वांछित परिणाम",
        "placeholder": "जैसे US$2.5 लाख वसूलना, दावा ख़ारिज कराना, 60 दिन में समझौता"
      },
      "case-builder:facts_date": {
        "label": "मुख्य घटनाएँ कब हुईं?",
        "placeholder": "जैसे मार्च 2024 – जनवरी 2025"
      },
      "compare": {
        "label": "किससे तुलना करें (देश/राज्य, कॉमा से अलग)",
        "placeholder": "जैसे सिंगापुर, मलेशिया, डेलावेयर, इंग्लैंड"
      },
      "statute:instrument": {
        "label": "क़ानून / विनियम और धाराएँ",
        "placeholder": "जैसे UU 27/2022 अनु. 20–25; GDPR अनु. 6; Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "चुनौती दिया जा रहा मानदंड या कार्य"
      },
      "regulatory-radar:business": {
        "label": "आपका व्यवसाय / क्षेत्र",
        "placeholder": "जैसे डिजिटल ऋण प्लेटफ़ॉर्म, 200 कर्मचारी"
      },
      "horizon": {
        "label": "समय-सीमा",
        "options": {
          "6": "पिछले और अगले 6 महीने",
          "12": "पिछले और अगले 12 महीने",
          "24": "पिछले और अगले 24 महीने"
        }
      },
      "contract-review:side": {
        "label": "अनुबंध में आपका पक्ष",
        "placeholder": "जैसे आपूर्तिकर्ता / किरायेदार / ख़रीदार"
      },
      "appetite": {
        "label": "जोखिम सहनशीलता",
        "options": {
          "balanced": "संतुलित",
          "conservative": "सतर्क (मेरे पक्ष की रक्षा)",
          "commercial": "व्यावसायिक (सौदा पूरा करना)"
        }
      },
      "playbook": {
        "label": "आपकी प्लेबुक / अनिवार्य बातें (वैकल्पिक)",
        "placeholder": "जैसे दायित्व सीमा = 12 महीने का शुल्क; इंडोनेशियाई विधि; 30 दिन में भुगतान"
      },
      "type": {
        "label": "अनुबंध का प्रकार",
        "placeholder": "जैसे SaaS समझौता, शेयर ख़रीद, वितरण, रोज़गार, NDA, पट्टा"
      },
      "contract-draft:side": {
        "label": "किसके पक्ष में मसौदा"
      },
      "bilingual": {
        "label": "द्विभाषी संस्करण",
        "options": {
          "no": "नहीं",
          "en-id": "अंग्रेज़ी + इंडोनेशियाई (दो स्तंभ)",
          "en-local": "अंग्रेज़ी + स्थानीय राजभाषा"
        }
      },
      "negotiation:side": {
        "label": "आपका पक्ष"
      },
      "deal": {
        "label": "लेन-देन",
        "placeholder": "जैसे एक विदेशी निवेशक द्वारा PT X के 70% का अधिग्रहण"
      },
      "materiality": {
        "label": "महत्त्व की सीमा",
        "placeholder": "जैसे US$50 हज़ार से अधिक के अनुबंध"
      },
      "entity": {
        "label": "इकाई का प्रकार",
        "placeholder": "जैसे PT PMA, LLC, प्राइवेट लिमिटेड कंपनी"
      },
      "doc-compare:side": {
        "label": "आपका पक्ष (वैकल्पिक)"
      },
      "budget": {
        "label": "बजट / सीमाएँ"
      },
      "pleadings:doctype": {
        "label": "तैयार करने वाला दस्तावेज़",
        "options": {
          "claim": "वाद-पत्र / gugatan",
          "answer": "लिखित कथन (jawaban, eksepsi)",
          "reply": "प्रत्युत्तर / replik",
          "rejoinder": "प्रति-प्रत्युत्तर / duplik",
          "conclusion": "अंतिम दलीलें / kesimpulan",
          "appeal": "अपील ज्ञापन / memori banding",
          "counter-appeal": "प्रति-अपील ज्ञापन",
          "cassation": "कैसेशन ज्ञापन / memori kasasi",
          "review": "पुनरीक्षण याचिका / memori PK",
          "motion": "आवेदन (अंतरिम राहत आदि)",
          "complaint-crim": "आपराधिक शिकायत / पुलिस रिपोर्ट",
          "pledoi": "बचाव पक्ष की दलील (pledoi)",
          "petition-const": "संवैधानिक याचिका"
        }
      },
      "witness": {
        "label": "गवाह (नाम/भूमिका)"
      },
      "rules": {
        "label": "संस्था / नियम",
        "placeholder": "जैसे SIAC, ICC, MCIA, BANI, UNCITRAL, LCIA, HKIAC"
      },
      "demand-settlement:doctype": {
        "label": "दस्तावेज़",
        "options": {
          "demand": "माँग / चूक नोटिस (somasi)",
          "response": "माँग का जवाब",
          "settlement": "समझौता करार",
          "valuation": "केवल समझौता मूल्यांकन"
        }
      },
      "criminal:facts_date": {
        "label": "कथित कृत्यों की तिथि"
      },
      "compliance-gap:business": {
        "label": "व्यवसाय, गतिविधियाँ और आकार",
        "placeholder": "जैसे ऑनलाइन मार्केटप्लेस, 10 लाख उपयोगकर्ता, साझेदारों के ज़रिए भुगतान, डेटा सिंगापुर में"
      },
      "processing": {
        "label": "प्रसंस्करण गतिविधि",
        "placeholder": "जैसे 2,000 कर्मचारियों की बायोमेट्रिक उपस्थिति, भारत के एक विक्रेता द्वारा संसाधित"
      },
      "privacy:doctype": {
        "label": "आउटपुट",
        "options": {
          "dpia": "पूर्ण DPIA",
          "ropa": "प्रसंस्करण का अभिलेख (RoPA)",
          "transfer": "सीमा-पार हस्तांतरण आकलन",
          "breach": "उल्लंघन प्रतिक्रिया योजना / सूचना",
          "policy": "निजता सूचना / नीति"
        }
      },
      "subject": {
        "label": "ग्राहक / लेन-देन"
      },
      "worker": {
        "label": "कर्मचारी का विवरण (गणना के लिए)",
        "placeholder": "अनुबंध का प्रकार, आरंभ तिथि, मासिक वेतन और स्थायी भत्ते, सेवा-समाप्ति का कारण"
      },
      "asset": {
        "label": "IP परिसंपत्ति / मुद्दा"
      },
      "tax_year": {
        "label": "कर वर्ष / अवधि"
      },
      "esg:business": {
        "label": "कंपनी प्रोफ़ाइल"
      },
      "system": {
        "label": "AI प्रणाली / उपयोग मामला"
      },
      "opinion-letter:doctype": {
        "label": "दस्तावेज़",
        "options": {
          "advice": "ग्राहक सलाह पत्र",
          "opinion": "औपचारिक विधिक राय (pendapat hukum)",
          "memo": "आंतरिक मेमो",
          "letter": "प्राधिकरण / दूसरे पक्ष को पत्र"
        }
      },
      "recipient": {
        "label": "प्राप्तकर्ता"
      },
      "legislative:instrument": {
        "label": "दस्तावेज़ का प्रकार",
        "placeholder": "जैसे Perda Kabupaten, मंत्रालयी विनियम, कंपनी उपनियम, विधेयक"
      },
      "translation:target": {
        "label": "किस भाषा में अनुवाद",
        "placeholder": "जैसे अंग्रेज़ी, इंडोनेशियाई, अरबी"
      },
      "layout": {
        "label": "लेआउट",
        "options": {
          "plain": "केवल अनुवाद",
          "side": "साथ-साथ तालिका"
        }
      },
      "trigger": {
        "label": "आरंभिक घटना और तिथि",
        "placeholder": "जैसे निर्णय 14 अग॰ 2026 को सुनाया गया; नोटिस 2 सित॰ 2026 को मिला"
      }
    }
  },
  ar: {
    "groups": {
      "research": "البحث والتحليل",
      "transactions": "العقود والصفقات",
      "disputes": "التقاضي والنزاعات",
      "compliance": "الامتثال والمخاطر",
      "drafting": "الصياغة والتواصل"
    },
    "areaGroups": {
      "General": "عام",
      "Public law": "القانون العام",
      "Private & commercial": "القانون الخاص والتجاري",
      "Technology & IP": "التقنية والملكية الفكرية",
      "People": "الأفراد والأسرة",
      "Criminal & compliance": "الجنائي والامتثال",
      "Sectors": "القطاعات",
      "Disputes": "النزاعات"
    },
    "areas": {
      "general": "عام / غير متأكد",
      "constitutional": "القانون الدستوري",
      "administrative": "القانون الإداري والتراخيص",
      "procurement": "المشتريات الحكومية والشراكة بين القطاعين",
      "human-rights": "حقوق الإنسان",
      "international": "القانون الدولي العام والمعاهدات",
      "elections": "الانتخابات والأحزاب السياسية",
      "contracts": "العقود والالتزامات",
      "torts": "المسؤولية التقصيرية والأفعال الضارة",
      "corporate": "قانون الشركات",
      "ma": "الاندماج والاستحواذ",
      "capital-markets": "أسواق المال والأوراق المالية",
      "banking": "المصارف والتمويل",
      "fintech": "التقنية المالية والمدفوعات والأصول المشفّرة",
      "insurance": "التأمين",
      "competition": "المنافسة / مكافحة الاحتكار",
      "consumer": "حماية المستهلك",
      "insolvency": "الإعسار وإعادة الهيكلة",
      "real-estate": "العقارات والأراضي",
      "construction": "الإنشاءات والهندسة",
      "franchise": "الامتياز التجاري والوكالة والتوزيع",
      "ip": "الملكية الفكرية",
      "privacy": "حماية البيانات والخصوصية",
      "cyber": "الأمن السيبراني",
      "ai-tech": "تنظيم الذكاء الاصطناعي والتقنية",
      "telecom-media": "الاتصالات والإعلام والبث",
      "employment": "العمل والتوظيف",
      "immigration": "الهجرة والجنسية",
      "family": "الأسرة والأحوال الشخصية",
      "succession": "المواريث والوصايا والصناديق الاستئمانية",
      "health": "الصحة وعلوم الحياة",
      "education": "التعليم",
      "nonprofit": "الجمعيات غير الربحية والمؤسسات والأديان",
      "indigenous": "القانون العرفي وحقوق الشعوب الأصلية",
      "criminal": "القانون والإجراءات الجنائية",
      "white-collar": "جرائم ذوي الياقات البيضاء والتحقيقات",
      "aml": "مكافحة غسل الأموال وتمويل الإرهاب والعقوبات",
      "anti-corruption": "مكافحة الفساد والامتثال الأخلاقي",
      "tax": "الضرائب",
      "trade": "التجارة والجمارك ورقابة الصادرات",
      "environment": "البيئة والمناخ والموارد الطبيعية",
      "energy": "الطاقة والتعدين والبنية التحتية",
      "maritime": "البحري والشحن والطيران",
      "transport": "النقل والخدمات اللوجستية",
      "agri-food": "الزراعة والغذاء",
      "islamic-finance": "التمويل الإسلامي والامتثال الشرعي",
      "esg": "الحوكمة البيئية والاجتماعية وحوكمة الشركات",
      "sports-ent": "الرياضة والإعلام والترفيه",
      "litigation": "التقاضي والإجراءات المدنية",
      "arbitration": "التحكيم والوسائل البديلة لتسوية النزاعات"
    },
    "regions": {
      "supranational": "دولي والاتحاد الأوروبي",
      "asia": "آسيا",
      "middle-east": "الشرق الأوسط",
      "europe": "أوروبا",
      "americas": "الأمريكتان",
      "africa": "أفريقيا",
      "oceania": "أوقيانوسيا"
    },
    "special": {
      "EU": "الاتحاد الأوروبي (قانون الاتحاد)",
      "INT": "القانون الدولي العام والمعاهدات"
    },
    "citations": {
      "auto": "المعيار المحلي للولاية القضائية",
      "bluebook": "Bluebook (الولايات المتحدة)",
      "oscola": "OSCOLA (المملكة المتحدة)",
      "aglc": "AGLC (أستراليا)",
      "mcgill": "McGill Guide (كندا)",
      "id": "الممارسة الإندونيسية (Pasal/ayat، Putusan No.)",
      "eu": "الأسلوب الرسمي للاتحاد الأوروبي (ECLI، مراجع الجريدة الرسمية)"
    },
    "traditions": {
      "civil": "القانون المدني (اللاتيني)",
      "common": "القانون العام (الأنجلوسكسوني)",
      "islamic": "الشريعة الإسلامية",
      "customary": "القانون العرفي",
      "socialist": "القانون الاشتراكي"
    },
    "ws": {
      "research": {
        "name": "مذكرة بحث قانوني",
        "desc": "مذكرة بحث بمستوى الشريك: القاعدة ومصادرها وكيف تطبّقها المحاكم وما تعنيه لوقائعك.",
        "starters": [
          "هل يجوز لصاحب العمل فصل موظف بسبب التأخر المتكرر، وما التعويض المستحق؟",
          "ما شروط التوقيع الإلكتروني الصحيح وهل يُقبل دليلًا؟",
          "هل يمكن تنفيذ شرط عدم المنافسة بعد انتهاء العمل؟"
        ]
      },
      "case-builder": {
        "name": "بناء القضية — إعادة ترتيب ملف القضية",
        "desc": "ارفع مستندات القضية: الأطراف والتسلسل الزمني والمسائل القانونية والقانون الواجب التطبيق من الدستور نزولًا وتحليل كل عنصر وثغرات الإثبات والاستراتيجية — وفق القانون النافذ.",
        "starters": [
          "أعد ترتيب ملف القضية هذا وأخبرني بأقوى نقاطنا وأضعفها.",
          "أعد بناء القضية وفق القانون النافذ وأشر إلى ما تغيّر منذ وقوع الأحداث.",
          "حضّر ملخصًا للقضية جاهزًا للتقاضي لاجتماع الشركاء."
        ]
      },
      "multi-jurisdiction": {
        "name": "مقارنة بين عدة ولايات قضائية",
        "desc": "قارن كيف تعالج حتى 8 دول أو ولايات المسألة نفسها — جنبًا إلى جنب، مع هيكل موصى به.",
        "starters": [
          "قارن التزامات الإخطار باختراق البيانات في هذه الولايات القضائية.",
          "أين يسهل تأسيس شركة قابضة لجنوب شرق آسيا ولماذا؟"
        ]
      },
      "statute": {
        "name": "دليل التشريعات واللوائح",
        "desc": "اشرح أي قانون مادة بمادة: المعنى والتعديلات واللوائح التنفيذية وتفسير المحاكم والأثر العملي.",
        "starters": [
          "اشرح هذه المواد وتعديلاتها وكيف تفسّرها المحاكم.",
          "ما اللوائح التنفيذية لهذا القانون وماذا تضيف؟"
        ]
      },
      "constitutional": {
        "name": "الرقابة الدستورية والقضائية",
        "desc": "اختبر قانونًا أو لائحة أو قرارًا حكوميًا في ضوء الدستور أو القانون الأعلى: الصفة والمصلحة والأسباب والسوابق ومخطط لعريضة الطعن.",
        "starters": [
          "هل يمكن الطعن في هذه اللائحة لمخالفتها الدستور؟",
          "ضع مخططًا لعريضة طعن قضائي تتضمن الصفة والأسباب الدستورية."
        ]
      },
      "judgment": {
        "name": "محلل الأحكام",
        "desc": "ارفع حكمًا أو قرار تحكيم: المنطوق والعلّة الحاكمة والآراء العارضة وخريطة التسبيب وقيمة السابقة وأسباب الطعن.",
        "starters": [
          "حلّل هذا الحكم واذكر أسباب الاستئناف.",
          "لخّص العلّة الحاكمة وأثرها على قضيتنا المنظورة."
        ]
      },
      "regulatory-radar": {
        "name": "رادار التشريعات وأثرها",
        "desc": "ما الذي تغيّر وما القادم وماذا يعني لنشاطك — مع خطة عمل ومواعيد نهائية.",
        "starters": [
          "ما التغييرات التنظيمية التي تمس قطاعي وماذا علينا أن نفعل؟",
          "أنشئ تقويم امتثال للمواعيد النهائية القادمة."
        ]
      },
      "citation-check": {
        "name": "مدقق الاستشهادات والمراجع",
        "desc": "تحقق من كل استشهاد في مذكرة أو تقرير أو إجابة ذكاء اصطناعي: الشكل والوجود والحالة الراهنة ومدى دعمه للحجة.",
        "starters": [
          "تحقق من جميع الاستشهادات في هذا المستند وأشر إلى أي شيء مشكوك فيه.",
          "تأكد من أن هذه التشريعات ما زالت نافذة ومرقّمة بشكل صحيح."
        ]
      },
      "contract-review": {
        "name": "مراجعة العقود وتعديلها",
        "desc": "مراجعة بندًا بندًا لصالح طرفك: المخاطر والحمايات الناقصة وقابلية التنفيذ وفق القانون المحلي والتعديلات المقترحة.",
        "starters": [
          "راجع هذا العقد لصالح طرفي واقترح تعديلات.",
          "ما أبرز 10 مخاطر في هذه الاتفاقية وكيف أعالجها؟",
          "طابق هذا العقد مع دليل التفاوض الخاص بي."
        ]
      },
      "contract-draft": {
        "name": "صياغة العقود",
        "desc": "صِغ عقدًا كاملًا قابلًا للتنفيذ محليًا من ورقة شروط أو وصف — مع ملاحظات الصياغة والبدائل.",
        "starters": [
          "صِغ اتفاقية عدم إفصاح متبادلة يحكمها القانون المحلي.",
          "صِغ اتفاقية تطوير برمجيات من هذه الشروط."
        ]
      },
      "negotiation": {
        "name": "استراتيجية التفاوض ودليله",
        "desc": "المواقف والبديل الأفضل (BATNA) وسلّم التنازلات وردود حرفية على طلبات الطرف الآخر.",
        "starters": [
          "حضّر دليل التفاوض الخاص بي لشروط هذا العقد.",
          "كيف أردّ على تعديلاتهم؟"
        ]
      },
      "due-diligence": {
        "name": "العناية الواجبة",
        "desc": "مراجعة غرفة البيانات: الشركات والعقود والتراخيص والعمل والملكية الفكرية والنزاعات والضرائب والامتثال — مع تقرير بالمخاطر الجوهرية وقائمة الشروط المسبقة.",
        "starters": [
          "أعدّ تقرير عناية واجبة بالمخاطر الجوهرية من هذه المستندات.",
          "اذكر الشروط المسبقة والتعويضات الخاصة التي نحتاجها."
        ]
      },
      "corporate-secretarial": {
        "name": "شؤون الشركات وأمانة السر",
        "desc": "قرارات مجلس الإدارة والمساهمين والمحاضر وتعديلات النظام الأساسي والإيداعات ومصفوفات الموافقة وفق الشكليات المحلية.",
        "starters": [
          "صِغ قرارًا كتابيًا للمساهمين بتعيين مدير جديد.",
          "ما الموافقات والإيداعات اللازمة لإصدار أسهم جديدة؟"
        ]
      },
      "doc-compare": {
        "name": "مقارنة المستندات",
        "desc": "قارن نسختين من عقد أو قانون: كل تغيير ولصالح من وأثره القانوني.",
        "starters": [
          "قارن هاتين النسختين واشرح كل تغيير.",
          "ما الذي غيّره القانون الجديد مقارنة بالقديم؟"
        ]
      },
      "litigation-strategy": {
        "name": "استراتيجية التقاضي وتقييم القضية",
        "desc": "الموضوع والجهة المختصة وسبل الانتصاف والتكلفة والوقت — مع نطاقات احتمال الكسب وخطة خطوة بخطوة.",
        "starters": [
          "هل نرفع دعوى أم نتصالح؟ أعطني الأرقام والخطة.",
          "قيّم فرصنا وأفضل جهة قضائية."
        ]
      },
      "pleadings": {
        "name": "المذكرات ومستندات المحكمة",
        "desc": "صِغ صحف الدعوى ومذكرات الدفاع والرد والتعقيب ومذكرات الاستئناف وطعون النقض والتماس إعادة النظر بصيغة المحكمة المحلية.",
        "starters": [
          "صِغ صحيفة دعوى لإخلال بعقد مع طلب حجز تحفظي.",
          "صِغ مذكرة دفاعنا بما فيها الدفع بعدم الاختصاص."
        ]
      },
      "chronology": {
        "name": "التسلسل الزمني ومصفوفة الأدلة",
        "desc": "حوّل كومة من المستندات إلى خط زمني موثّق ومصفوفة أدلة لكل مسألة.",
        "starters": [
          "أنشئ تسلسلًا زمنيًا موثّقًا من جميع هذه المستندات.",
          "ما الوقائع الثابتة والمتنازع عليها وغير الثابتة؟"
        ]
      },
      "witness-prep": {
        "name": "تحضير الشهود والاستجواب المضاد",
        "desc": "خطط أسئلة للاستجواب الرئيسي والمضاد، والإجابات المتوقعة، والفخاخ، ومواد الطعن في المصداقية.",
        "starters": [
          "حضّر أسئلة الاستجواب المضاد لهذا الشاهد.",
          "جهّز شاهدنا لأداء شهادته."
        ]
      },
      "adversary": {
        "name": "محاكي محامي الخصم والقاضي",
        "desc": "اختبر قضيتك تحت الضغط: أقوى هجوم للطرف الآخر، ثم كيف يُرجَّح أن يفكّر القاضي ويحكم.",
        "starters": [
          "هاجم قضيتنا كما يفعل أفضل محامٍ للخصم.",
          "اكتب الحكم الذي يُرجَّح أن يصدره قاضٍ متأنٍّ."
        ]
      },
      "arbitration": {
        "name": "التحكيم والوسائل البديلة",
        "desc": "فحص سلامة شرط التحكيم، وطلب التحكيم، واستراتيجية هيئة التحكيم، والتدابير المؤقتة، وتحليل البطلان والتنفيذ.",
        "starters": [
          "هل شرط التحكيم لدينا صحيح وما مخاطره؟",
          "صِغ طلب تحكيم.",
          "هل يمكن تنفيذ قرار التحكيم هذا في البلد المختار؟"
        ]
      },
      "demand-settlement": {
        "name": "خطاب المطالبة والتسوية",
        "desc": "خطابات مطالبة وإنذار رسمية واتفاقيات تسوية، مع تقييم ما يُقبل.",
        "starters": [
          "صِغ خطاب مطالبة رسميًا بفواتير غير مدفوعة.",
          "ما مبلغ التسوية الذي ينبغي أن نقبله؟"
        ]
      },
      "criminal": {
        "name": "تحليل القضية الجنائية",
        "desc": "أركان الجريمة والأدلة والإجراءات والحقوق والدفوع ونطاق العقوبة وأثر قوانين العقوبات الجديدة.",
        "starters": [
          "حلّل ما إذا كانت أركان الجريمة ثابتة.",
          "هل يغيّر قانون العقوبات الجديد النتيجة لهذه الوقائع؟"
        ]
      },
      "compliance-gap": {
        "name": "تحليل فجوات الامتثال",
        "desc": "حدّد القواعد المنطبقة على نشاطك وابحث عن الفجوات واحصل على خطة معالجة مرتبة حسب الأولوية.",
        "starters": [
          "ما التراخيص والتزامات الامتثال التي تنطبق على نشاطي؟",
          "دقّق ممارساتنا الحالية في ضوء القانون."
        ]
      },
      "privacy": {
        "name": "حماية البيانات وتقييم الأثر (DPIA)",
        "desc": "الأساس القانوني وسجلات المعالجة والنقل عبر الحدود والاستجابة للاختراق وتقييم أثر كامل — وفق PDP وGDPR وPDPA وغيرها.",
        "starters": [
          "أجرِ تقييم أثر لحماية البيانات لنشاط المعالجة هذا.",
          "تعرّضنا لاختراق بيانات — ماذا يجب أن نفعل ومتى؟"
        ]
      },
      "aml-kyc": {
        "name": "مكافحة غسل الأموال/اعرف عميلك والعقوبات",
        "desc": "تصنيف مخاطر العملاء، وتحليل المستفيد الحقيقي، والمؤشرات المريبة، ومنطق فحص العقوبات ورقابة الصادرات، وصياغة بلاغات الاشتباه.",
        "starters": [
          "صنّف مخاطر هذا العميل واذكر خطوات العناية المعززة.",
          "هل تتطلب هذه المعاملة بلاغًا عن معاملة مشبوهة؟"
        ]
      },
      "employment": {
        "name": "العمل والموارد البشرية",
        "desc": "التوظيف والعقود وإجراءات إنهاء الخدمة وحساب التعويضات والسياسات ونزاعات العمل.",
        "starters": [
          "احسب تعويض إنهاء الخدمة هذا والإجراء الصحيح.",
          "هل هذا العقد محدد المدة صحيح أم تحوّل إلى غير محدد المدة؟"
        ]
      },
      "ip": {
        "name": "فحص الملكية الفكرية وحمايتها",
        "desc": "استراتيجية العلامات التجارية وحق المؤلف وبراءات الاختراع والتصاميم، ومخاطر التعدي، والترخيص، وخيارات الإنفاذ.",
        "starters": [
          "هل يمكننا تسجيل هذه العلامة وما مخاطر التعارض؟",
          "قام أحدهم بنسخ منتجنا — ما خياراتنا؟"
        ]
      },
      "tax": {
        "name": "التحليل الضريبي",
        "desc": "تحليل ضريبة الشركات والأفراد والقيمة المضافة والاستقطاع والمنشأة الدائمة والاتفاقيات الضريبية مع الحسابات وطرق الاعتراض.",
        "starters": [
          "ما الضرائب التي تنطبق على ترتيب الخدمة العابرة للحدود هذا؟",
          "تلقينا ربطًا ضريبيًا — كيف نعترض ومتى؟"
        ]
      },
      "esg": {
        "name": "الاستدامة والحوكمة (ESG)",
        "desc": "إفصاحات الاستدامة الإلزامية، والعناية الواجبة في سلاسل التوريد، ومخاطر الغسل الأخضر، وواجبات مجلس الإدارة.",
        "starters": [
          "ما قواعد إفصاح الاستدامة التي تنطبق علينا ومتى؟",
          "راجع ادعاءاتنا التسويقية بحثًا عن مخاطر الغسل الأخضر."
        ]
      },
      "ai-governance": {
        "name": "حوكمة الذكاء الاصطناعي وتنظيم التقنية",
        "desc": "صنّف أنظمة الذكاء الاصطناعي (مثل مستويات المخاطر في قانون الذكاء الاصطناعي الأوروبي)، وحدد الالتزامات، وصِغ سياسات الذكاء الاصطناعي وشروط الموردين.",
        "starters": [
          "صنّف حالة استخدامنا للذكاء الاصطناعي واذكر التزاماتنا.",
          "صِغ سياسة داخلية لاستخدام الذكاء الاصطناعي التوليدي."
        ]
      },
      "opinion-letter": {
        "name": "الرأي القانوني وخطاب الاستشارة",
        "desc": "آراء قانونية رسمية وخطابات استشارة للعملاء مع الافتراضات والتحفظات والتوصيات الواضحة.",
        "starters": [
          "اكتب رأيًا قانونيًا حول ما إذا كانت هذه الصفقة جائزة.",
          "اكتب خطاب استشارة لعميلي يشرح خياراته."
        ]
      },
      "plain-language": {
        "name": "شرح بلغة بسيطة",
        "desc": "اشرح عقدًا أو حكمًا أو تكليفًا بالحضور أو قانونًا لغير المختص: ماذا يعني، وماذا يفعل، ومتى.",
        "starters": [
          "اشرح لي هذا المستند بكلمات بسيطة. ماذا يجب أن أفعل؟",
          "تلقيت تكليفًا بالحضور أمام المحكمة — ماذا سيحدث بعد ذلك؟"
        ]
      },
      "legislative": {
        "name": "الصياغة التشريعية والسياسات",
        "desc": "صِغ مشروعات القوانين واللوائح واللوائح الإقليمية والأنظمة الداخلية والمذكرات الإيضاحية (naskah akademik) مع تحليل الأثر التنظيمي.",
        "starters": [
          "صِغ لائحة إقليمية حول هذا الموضوع مع مخطط مذكرتها الإيضاحية.",
          "راجع مشروع القانون هذا بحثًا عن عيوب الصياغة."
        ]
      },
      "translation": {
        "name": "الترجمة القانونية",
        "desc": "ترجمة قانونية دقيقة تحافظ على اتساق المصطلحات المعرّفة، مع مسرد ثنائي اللغة وملاحظات على المفاهيم غير القابلة للترجمة.",
        "starters": [
          "ترجم هذا العقد إلى الإنجليزية مع الحفاظ على دقة المصطلحات القانونية.",
          "ترجم هذا الحكم إلى الإندونيسية."
        ]
      },
      "deadlines": {
        "name": "حاسبة المواعيد والتقادم",
        "desc": "المواعيد الإجرائية ومدد التقادم، محسوبة من تواريخك مع عرض قواعد الحساب.",
        "starters": [
          "ما جميع مواعيدنا بعد هذا الحكم؟",
          "هل انقضت مدة التقادم لهذه المطالبة؟"
        ]
      },
      "ask": {
        "name": "اسأل أي شيء (قانوني)",
        "desc": "إجابات سريعة وموثّقة لأي سؤال قانوني — مع القانون وحالته وما يجب التحقق منه.",
        "starters": [
          "ما الحد الأدنى لرأس المال لتأسيس شركة مملوكة لأجانب؟",
          "هل يجوز تسجيل مكالمة هاتفية دون موافقة؟",
          "ما حقوقي إذا أُلغيت رحلتي؟"
        ]
      }
    },
    "fields": {
      "question": {
        "label": "سؤال البحث (اختياري، إن لم يكن في طلبك)"
      },
      "role": {
        "label": "أنت تمثل",
        "options": {
          "neutral": "محايد / رأي موضوعي",
          "claimant": "المدعي / مقدم الطلب",
          "defendant": "المدعى عليه / المستجيب",
          "prosecution": "النيابة / جهة التحقيق",
          "defence": "الدفاع الجنائي",
          "judge": "القاضي / المحكّم (مسودة التسبيب)",
          "inhouse": "مستشار قانوني داخلي / الشركة",
          "regulator": "الجهة التنظيمية / الحكومة",
          "individual": "فرد (ليس محاميًا)"
        }
      },
      "stage": {
        "label": "المرحلة / الجهة",
        "options": {
          "pre": "قبل رفع الدعوى / استشارة",
          "first": "محكمة أول درجة",
          "appeal": "الاستئناف",
          "cassation": "النقض / المحكمة العليا",
          "review": "طعن غير عادي (مثل PK)",
          "constitutional": "المحكمة الدستورية",
          "administrative": "المحكمة الإدارية / لجنة قضائية",
          "arbitration": "التحكيم",
          "mediation": "الوساطة / التفاوض",
          "investigation": "التحقيق الجنائي"
        }
      },
      "goal": {
        "label": "النتيجة المرجوة",
        "placeholder": "مثال: استرداد 250 ألف دولار، رفض الدعوى، التسوية خلال 60 يومًا"
      },
      "case-builder:facts_date": {
        "label": "متى وقعت الأحداث الرئيسية؟",
        "placeholder": "مثال: مارس 2024 – يناير 2025"
      },
      "compare": {
        "label": "المقارنة مع (دول/ولايات، مفصولة بفواصل)",
        "placeholder": "مثال: سنغافورة، ماليزيا، ديلاوير، إنجلترا"
      },
      "statute:instrument": {
        "label": "القانون / اللائحة والمواد",
        "placeholder": "مثال: UU 27/2022 المواد 20–25؛ GDPR المادة 6؛ Companies Act 2006 s.172"
      },
      "constitutional:target": {
        "label": "القاعدة أو القرار المطعون فيه"
      },
      "regulatory-radar:business": {
        "label": "نشاطك / قطاعك",
        "placeholder": "مثال: منصة إقراض رقمية، 200 موظف"
      },
      "horizon": {
        "label": "الأفق الزمني",
        "options": {
          "6": "آخر 6 أشهر والقادمة",
          "12": "آخر 12 شهرًا والقادمة",
          "24": "آخر 24 شهرًا والقادمة"
        }
      },
      "contract-review:side": {
        "label": "طرفك في العقد",
        "placeholder": "مثال: المورّد / المستأجر / المشتري"
      },
      "appetite": {
        "label": "تقبّل المخاطر",
        "options": {
          "balanced": "متوازن",
          "conservative": "متحفظ (حماية طرفي)",
          "commercial": "تجاري (إتمام الصفقة)"
        }
      },
      "playbook": {
        "label": "دليلك / الشروط الأساسية (اختياري)",
        "placeholder": "مثال: حد المسؤولية = رسوم 12 شهرًا؛ القانون الإندونيسي؛ الدفع خلال 30 يومًا"
      },
      "type": {
        "label": "نوع العقد",
        "placeholder": "مثال: اتفاقية SaaS، شراء أسهم، توزيع، عمل، عدم إفصاح، إيجار"
      },
      "contract-draft:side": {
        "label": "يُصاغ لصالح"
      },
      "bilingual": {
        "label": "نسخة ثنائية اللغة",
        "options": {
          "no": "لا",
          "en-id": "الإنجليزية + الإندونيسية (عمودان)",
          "en-local": "الإنجليزية + اللغة الرسمية المحلية"
        }
      },
      "negotiation:side": {
        "label": "طرفك"
      },
      "deal": {
        "label": "الصفقة",
        "placeholder": "مثال: استحواذ مستثمر أجنبي على 70% من PT X"
      },
      "materiality": {
        "label": "حد الأهمية النسبية",
        "placeholder": "مثال: العقود التي تزيد على 50 ألف دولار"
      },
      "entity": {
        "label": "نوع الكيان",
        "placeholder": "مثال: PT PMA، LLC، شركة ذات مسؤولية محدودة"
      },
      "doc-compare:side": {
        "label": "طرفك (اختياري)"
      },
      "budget": {
        "label": "الميزانية / القيود"
      },
      "pleadings:doctype": {
        "label": "المستند المطلوب صياغته",
        "options": {
          "claim": "صحيفة دعوى / gugatan",
          "answer": "مذكرة دفاع (jawaban، eksepsi)",
          "reply": "مذكرة رد / replik",
          "rejoinder": "مذكرة تعقيب / duplik",
          "conclusion": "المذكرة الختامية / kesimpulan",
          "appeal": "مذكرة استئناف / memori banding",
          "counter-appeal": "مذكرة رد على الاستئناف",
          "cassation": "مذكرة طعن بالنقض / memori kasasi",
          "review": "التماس إعادة النظر / memori PK",
          "motion": "طلب (تدابير مؤقتة وغيرها)",
          "complaint-crim": "شكوى جنائية / بلاغ للشرطة",
          "pledoi": "مرافعة الدفاع (pledoi)",
          "petition-const": "عريضة دستورية"
        }
      },
      "witness": {
        "label": "الشاهد (الاسم/الصفة)"
      },
      "rules": {
        "label": "المؤسسة / القواعد",
        "placeholder": "مثال: SIAC، ICC، BANI، UNCITRAL، LCIA، HKIAC، DIAC"
      },
      "demand-settlement:doctype": {
        "label": "المستند",
        "options": {
          "demand": "مطالبة / إنذار بالإخلال (somasi)",
          "response": "رد على مطالبة",
          "settlement": "اتفاقية تسوية",
          "valuation": "تقييم التسوية فقط"
        }
      },
      "criminal:facts_date": {
        "label": "تاريخ الأفعال المنسوبة"
      },
      "compliance-gap:business": {
        "label": "النشاط والأعمال والحجم",
        "placeholder": "مثال: سوق إلكتروني، مليون مستخدم، مدفوعات عبر شركاء، بيانات مخزّنة في سنغافورة"
      },
      "processing": {
        "label": "نشاط المعالجة",
        "placeholder": "مثال: حضور بيومتري لـ 2,000 موظف يعالجه مورّد في الهند"
      },
      "privacy:doctype": {
        "label": "المخرجات",
        "options": {
          "dpia": "تقييم أثر كامل",
          "ropa": "سجل أنشطة المعالجة (RoPA)",
          "transfer": "تقييم النقل عبر الحدود",
          "breach": "خطة الاستجابة للاختراق / الإخطار",
          "policy": "إشعار / سياسة الخصوصية"
        }
      },
      "subject": {
        "label": "العميل / المعاملة"
      },
      "worker": {
        "label": "بيانات الموظف (للحساب)",
        "placeholder": "نوع العقد، تاريخ البدء، الأجر الشهري والبدلات الثابتة، سبب إنهاء الخدمة"
      },
      "asset": {
        "label": "أصل / مسألة الملكية الفكرية"
      },
      "tax_year": {
        "label": "السنة / الفترة الضريبية"
      },
      "esg:business": {
        "label": "ملف الشركة"
      },
      "system": {
        "label": "نظام الذكاء الاصطناعي / حالة الاستخدام"
      },
      "opinion-letter:doctype": {
        "label": "المستند",
        "options": {
          "advice": "خطاب استشارة للعميل",
          "opinion": "رأي قانوني رسمي (pendapat hukum)",
          "memo": "مذكرة داخلية",
          "letter": "خطاب إلى جهة رسمية / الطرف الآخر"
        }
      },
      "recipient": {
        "label": "المستلم"
      },
      "legislative:instrument": {
        "label": "نوع الأداة التشريعية",
        "placeholder": "مثال: Perda Kabupaten، قرار وزاري، لائحة داخلية للشركة، مشروع قانون"
      },
      "translation:target": {
        "label": "الترجمة إلى",
        "placeholder": "مثال: الإنجليزية، الإندونيسية، العربية"
      },
      "layout": {
        "label": "التنسيق",
        "options": {
          "plain": "الترجمة فقط",
          "side": "جدول متقابل"
        }
      },
      "trigger": {
        "label": "الحدث المنشئ وتاريخه",
        "placeholder": "مثال: صدر الحكم في 14 أغسطس 2026؛ استُلم الإنذار في 2 سبتمبر 2026"
      }
    }
  },
};
