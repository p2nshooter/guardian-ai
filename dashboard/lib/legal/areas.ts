/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * LEGAL AI — PRACTICE AREAS. Each area adds a focus checklist to the prompt so
 * the analysis covers what a specialist in that field would check first.
 * ============================================================================ */

export interface PracticeArea { id: string; name: string; nameId: string; group: string; focus: string }

const a = (id: string, name: string, nameId: string, group: string, focus: string): PracticeArea => ({ id, name, nameId, group, focus });

export const AREAS: PracticeArea[] = [
  a("general", "General / not sure", "Umum / belum tahu", "General", "Identify which areas of law are engaged before analysing; flag cross-area issues."),
  // Public law
  a("constitutional", "Constitutional law", "Hukum tata negara", "Public law", "Constitutional rights and freedoms, separation of powers, competence of the legislature, judicial review standards and standing, constitutional court procedure and effects of decisions."),
  a("administrative", "Administrative law & licensing", "Hukum administrasi & perizinan", "Public law", "Authority and procedure of the decision-maker, general principles of good administration, licensing (risk-based licensing where applicable), objections, administrative appeals and administrative-court deadlines."),
  a("procurement", "Public procurement & PPP", "Pengadaan barang/jasa & KPBU", "Public law", "Procurement method and thresholds, eligibility, evaluation, blacklisting, bid challenges, PPP structuring and government support."),
  a("human-rights", "Human rights", "Hak asasi manusia", "Public law", "Constitutional and treaty rights, proportionality, remedies before national bodies and international mechanisms."),
  a("international", "Public international law & treaties", "Hukum internasional publik & perjanjian", "Public law", "Treaty status (signature, ratification, reservations), incorporation into domestic law, state responsibility, immunities, investment treaties and ISDS."),
  a("elections", "Elections & political parties", "Pemilu & partai politik", "Public law", "Election calendar and deadlines, candidacy requirements, campaign finance, disputes before election bodies and courts."),
  // Private & commercial
  a("contracts", "Contracts & obligations", "Kontrak & perikatan", "Private & commercial", "Formation, validity requirements, interpretation, performance, breach and default notices, force majeure/hardship, limitation of liability, termination, remedies and damages."),
  a("torts", "Torts / unlawful acts & liability", "Perbuatan melawan hukum & tanggung gugat", "Private & commercial", "Elements of liability (fault/unlawfulness, damage, causation), vicarious and strict liability, defences, heads of damage and quantification."),
  a("corporate", "Corporate & company law", "Hukum perusahaan & korporasi", "Private & commercial", "Incorporation, capital and shares, organs and fiduciary duties, shareholder rights and agreements, corporate approvals, beneficial ownership and filings."),
  a("ma", "Mergers & acquisitions", "Merger & akuisisi", "Private & commercial", "Deal structure, due diligence, conditions precedent, regulatory and merger-control approvals, foreign-ownership limits, warranties/indemnities, W&I insurance, closing mechanics."),
  a("capital-markets", "Capital markets & securities", "Pasar modal & efek", "Private & commercial", "Offering and listing rules, disclosure and continuous reporting, insider trading and market abuse, takeovers and tender offers."),
  a("banking", "Banking & finance", "Perbankan & pembiayaan", "Private & commercial", "Lending documentation, security and perfection, guarantees, enforcement, prudential rules, syndication and intercreditor issues."),
  a("fintech", "Fintech, payments & crypto-assets", "Fintech, pembayaran & aset kripto", "Private & commercial", "Licensing of payment, lending and digital-asset activities, e-money, crypto-asset regulation and taxation, consumer protection, AML obligations."),
  a("insurance", "Insurance", "Asuransi", "Private & commercial", "Policy wording and exclusions, disclosure duties, claims handling, subrogation, regulatory licensing."),
  a("competition", "Competition / antitrust", "Persaingan usaha / antimonopoli", "Private & commercial", "Market definition, dominance, anti-competitive agreements, merger notification thresholds and deadlines, leniency, sanctions."),
  a("consumer", "Consumer protection", "Perlindungan konsumen", "Private & commercial", "Unfair terms, standard clauses, product liability, labelling, e-commerce rules, recalls, dispute bodies and class actions."),
  a("insolvency", "Insolvency & restructuring", "Kepailitan & restrukturisasi (PKPU)", "Private & commercial", "Insolvency tests, moratoria/suspension of payments, creditor ranking, claw-back, restructuring plans, cross-border recognition."),
  a("real-estate", "Real estate & land", "Pertanahan & properti", "Private & commercial", "Title and registration, land rights types and foreign-ownership limits, zoning/spatial planning, leases, strata titles, customary land rights."),
  a("construction", "Construction & engineering", "Konstruksi", "Private & commercial", "Standard forms (e.g. FIDIC), time and cost claims, variations, defects liability, certification, security of payment, dispute boards."),
  a("franchise", "Franchising, agency & distribution", "Waralaba, keagenan & distribusi", "Private & commercial", "Registration and disclosure duties, exclusivity, termination compensation, competition law limits."),
  // Technology & IP
  a("ip", "Intellectual property", "Kekayaan intelektual", "Technology & IP", "Registrability and ownership, infringement tests, licensing and assignment formalities, border measures, remedies, trade secrets and employee inventions."),
  a("privacy", "Data protection & privacy", "Pelindungan data pribadi", "Technology & IP", "Lawful bases, sensitive data, data-subject rights, controller/processor duties, cross-border transfers, breach notification deadlines, DPIAs, sanctions."),
  a("cyber", "Cybersecurity", "Keamanan siber", "Technology & IP", "Security obligations for critical infrastructure and regulated sectors, incident reporting deadlines, cybercrime offences, evidence handling."),
  a("ai-tech", "AI & technology regulation", "Regulasi AI & teknologi", "Technology & IP", "AI risk classification and obligations, transparency, automated decision-making, liability, platform and e-commerce regulation."),
  a("telecom-media", "Telecom, media & broadcasting", "Telekomunikasi, media & penyiaran", "Technology & IP", "Licensing, spectrum, content regulation, defamation and press law, platform takedown duties."),
  // People
  a("employment", "Employment & labour", "Ketenagakerjaan", "People", "Employment status and contract types, working time and wages, termination grounds and procedure, severance and statutory entitlements, collective labour relations, foreign workers, industrial-relations dispute procedure."),
  a("immigration", "Immigration & nationality", "Imigrasi & kewarganegaraan", "People", "Visa and permit categories, sponsorship, overstay consequences, residency and citizenship rules, appeals."),
  a("family", "Family & personal status", "Hukum keluarga & perkawinan", "People", "Marriage validity and registration, divorce grounds and procedure, marital property and prenuptial agreements, custody and maintenance, religious-court jurisdiction."),
  a("succession", "Succession, wills & trusts", "Waris, wasiat & trust", "People", "Applicable succession regime (civil, religious, customary), forced heirship, wills formalities, estate administration, trusts/foundations, cross-border estates."),
  a("health", "Health & life sciences", "Kesehatan & farmasi", "People", "Licensing of facilities and professionals, medical negligence, drug and device approvals, clinical trials, advertising restrictions, health data."),
  a("education", "Education", "Pendidikan", "People", "Accreditation and licensing, student rights and discipline, foreign institutions, research ethics."),
  a("nonprofit", "Non-profits, foundations & religion", "Yayasan, perkumpulan & keagamaan", "People", "Formation and governance of foundations/associations, donations and tax treatment, foreign funding rules, religious bodies."),
  a("indigenous", "Customary & indigenous law", "Hukum adat & masyarakat adat", "People", "Recognition of customary communities and their institutions, customary land and resource rights, interaction with state courts."),
  // Criminal & compliance
  a("criminal", "Criminal law & procedure", "Hukum pidana & acara pidana", "Criminal & compliance", "Elements of each offence, mens rea, participation and attempt, defences, investigation and detention rules, evidence admissibility, rights of suspects, sentencing, and temporal application (more-favourable law)."),
  a("white-collar", "White-collar crime & investigations", "Kejahatan kerah putih & investigasi", "Criminal & compliance", "Fraud, corruption and bribery, corporate criminal liability, internal investigations, privilege, cooperation and self-reporting, asset recovery."),
  a("aml", "AML/CFT & sanctions", "APU-PPT & sanksi", "Criminal & compliance", "Reporting-entity obligations, CDD/EDD, beneficial ownership, suspicious-transaction reporting, sanctions lists (UN, US OFAC, EU, UK) and export controls."),
  a("anti-corruption", "Anti-corruption & ethics compliance", "Antikorupsi & kepatuhan etik", "Criminal & compliance", "Bribery of officials and private bribery, gifts and hospitality, third-party due diligence, compliance programmes, extraterritorial laws (FCPA, UK Bribery Act)."),
  // Sectors
  a("tax", "Tax", "Perpajakan", "Sectors", "Tax residence and permanent establishment, corporate and personal income tax, VAT/GST, withholding, transfer pricing, tax treaties, audits, objections and tax-court deadlines."),
  a("trade", "Trade, customs & export control", "Perdagangan, kepabeanan & kontrol ekspor", "Sectors", "Tariff classification, origin, valuation, trade remedies, import/export licensing, free-trade agreements, export-control lists."),
  a("environment", "Environment, climate & natural resources", "Lingkungan hidup, iklim & SDA", "Sectors", "Environmental approvals and impact assessments, permits, liability and remediation, climate disclosures and carbon markets, forestry, mining and water rights."),
  a("energy", "Energy, mining & infrastructure", "Energi, pertambangan & infrastruktur", "Sectors", "Concessions and licences, local-content and divestment rules, PPAs, tariffs, state-owned enterprise roles, project finance."),
  a("maritime", "Maritime, shipping & aviation", "Maritim, pelayaran & penerbangan", "Sectors", "Cabotage, vessel/aircraft registration and mortgages, charterparties, carriage of goods, arrest of ships, aviation liability conventions."),
  a("transport", "Transport & logistics", "Transportasi & logistik", "Sectors", "Carrier liability, licensing, multimodal transport, warehousing, road and rail regulation."),
  a("agri-food", "Agriculture & food", "Pertanian & pangan", "Sectors", "Food safety and labelling, halal certification, plantation and land rules, import quotas."),
  a("islamic-finance", "Islamic finance & Sharia compliance", "Keuangan syariah & kepatuhan syariah", "Sectors", "Sharia-compliant structures (murabahah, ijarah, musharakah, sukuk), Sharia supervisory board fatwas and standards (e.g. AAOIFI, national Sharia councils), regulatory treatment."),
  a("esg", "ESG & corporate governance", "ESG & tata kelola perusahaan", "Sectors", "Board duties and composition, sustainability reporting standards, supply-chain due diligence, greenwashing risk, stakeholder engagement."),
  a("sports-ent", "Sports, media & entertainment", "Olahraga, media & hiburan", "Sectors", "Image rights, talent and production agreements, broadcasting rights, sports-governing-body rules and CAS arbitration."),
  // Disputes
  a("litigation", "Civil litigation & procedure", "Litigasi & hukum acara perdata", "Disputes", "Jurisdiction and venue, standing, pleadings requirements, service, interim relief, evidence rules, appeal routes and deadlines, enforcement of judgments."),
  a("arbitration", "Arbitration & ADR", "Arbitrase & APS", "Disputes", "Arbitration agreement validity and scope, seat and rules, tribunal constitution, interim measures, annulment grounds, recognition and enforcement under the New York Convention, mediation."),
];

export const getArea = (id: string | undefined | null) => AREAS.find((x) => x.id === id);
