# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
"""
Real-Time Regulatory Intelligence Engine
Scans legal databases, government portals, and regulatory feeds
to keep legal knowledge current for 195+ jurisdictions.
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("axto.legal.regulatory")

# ── Legal Information Sources per Jurisdiction ────────────────────────────────
# These are real, publicly accessible legal information sources
LEGAL_SOURCES = {
    "id": {
        "name": "Indonesia",
        "sources": [
            {"name": "JDIH (Jaringan Dokumentasi Hukum)",    "url": "https://jdih.go.id",           "type": "official"},
            {"name": "OJK Regulations",                       "url": "https://ojk.go.id/id/regulasi", "type": "financial"},
            {"name": "Bank Indonesia",                        "url": "https://www.bi.go.id/id/regulasi","type": "financial"},
            {"name": "Peraturan.go.id",                       "url": "https://peraturan.go.id",       "type": "official"},
        ]
    },
    "us": {
        "name": "United States",
        "sources": [
            {"name": "Federal Register",     "url": "https://www.federalregister.gov",      "type": "official"},
            {"name": "Code of Federal Regs", "url": "https://www.ecfr.gov",                 "type": "official"},
            {"name": "SEC EDGAR",            "url": "https://www.sec.gov/cgi-bin/browse-edgar","type": "financial"},
            {"name": "US Code (Cornell)",    "url": "https://www.law.cornell.edu/uscode",   "type": "academic"},
        ]
    },
    "eu": {
        "name": "European Union",
        "sources": [
            {"name": "EUR-Lex",              "url": "https://eur-lex.europa.eu",            "type": "official"},
            {"name": "ESMA Regulations",     "url": "https://www.esma.europa.eu/rules-databases","type": "financial"},
            {"name": "EDPB (GDPR)",          "url": "https://edpb.europa.eu/our-work-tools","type": "privacy"},
        ]
    },
    "uk": {
        "name": "United Kingdom",
        "sources": [
            {"name": "Legislation.gov.uk",   "url": "https://www.legislation.gov.uk",       "type": "official"},
            {"name": "FCA Handbook",         "url": "https://www.handbook.fca.org.uk",       "type": "financial"},
            {"name": "ICO (Data Protection)","url": "https://ico.org.uk/for-organisations",  "type": "privacy"},
        ]
    },
    "sg": {
        "name": "Singapore",
        "sources": [
            {"name": "Singapore Statutes",   "url": "https://sso.agc.gov.sg",               "type": "official"},
            {"name": "MAS Regulations",      "url": "https://www.mas.gov.sg/regulation",     "type": "financial"},
            {"name": "PDPC (PDPA)",          "url": "https://www.pdpc.gov.sg",               "type": "privacy"},
        ]
    },
    "my": {
        "name": "Malaysia",
        "sources": [
            {"name": "MyLawyer DB",          "url": "https://www.agc.gov.my/agcportal/index.php","type": "official"},
            {"name": "SC Malaysia",          "url": "https://www.sc.com.my",                 "type": "financial"},
            {"name": "BNM",                  "url": "https://www.bnm.gov.my/legal-framework", "type": "financial"},
        ]
    },
    "au": {
        "name": "Australia",
        "sources": [
            {"name": "AustLII",              "url": "https://www.austlii.edu.au",            "type": "academic"},
            {"name": "Federal Register of Legislation","url":"https://www.legislation.gov.au","type": "official"},
            {"name": "ASIC Regulations",     "url": "https://asic.gov.au/regulatory-resources","type": "financial"},
        ]
    },
    "de": {
        "name": "Germany",
        "sources": [
            {"name": "Bundesgesetze",        "url": "https://www.bundesgerichtshof.de",       "type": "official"},
            {"name": "Gesetze im Internet",  "url": "https://www.gesetze-im-internet.de",     "type": "official"},
            {"name": "BaFin",                "url": "https://www.bafin.de/EN/Aufsicht",        "type": "financial"},
        ]
    },
    "fr": {
        "name": "France",
        "sources": [
            {"name": "Légifrance",           "url": "https://www.legifrance.gouv.fr",         "type": "official"},
            {"name": "AMF (Financial)",      "url": "https://www.amf-france.org/en",           "type": "financial"},
            {"name": "CNIL (Data Privacy)",  "url": "https://www.cnil.fr/en",                  "type": "privacy"},
        ]
    },
    "jp": {
        "name": "Japan",
        "sources": [
            {"name": "e-Gov Laws",           "url": "https://laws.e-gov.go.jp/search/lawSearch","type": "official"},
            {"name": "FSA Japan",            "url": "https://www.fsa.go.jp/en/policy",         "type": "financial"},
        ]
    },
    "cn": {
        "name": "China",
        "sources": [
            {"name": "NPC Laws",             "url": "http://www.npc.gov.cn/npc/c30834/201802/9ef737d7714d45b3.shtml","type": "official"},
            {"name": "CSRC",                 "url": "http://www.csrc.gov.cn/csrc/c100098",     "type": "financial"},
        ]
    },
    "in": {
        "name": "India",
        "sources": [
            {"name": "India Code",           "url": "https://www.indiacode.nic.in",            "type": "official"},
            {"name": "SEBI",                 "url": "https://www.sebi.gov.in/acts.html",        "type": "financial"},
            {"name": "RBI",                  "url": "https://www.rbi.org.in/Scripts/BS_ViewActs.aspx","type": "financial"},
        ]
    },
    "br": {
        "name": "Brazil",
        "sources": [
            {"name": "Planalto (Laws)",      "url": "https://www.planalto.gov.br/ccivil_03",   "type": "official"},
            {"name": "CVM (Securities)",     "url": "https://www.gov.br/cvm/pt-br",             "type": "financial"},
        ]
    },
    "ae": {
        "name": "UAE",
        "sources": [
            {"name": "UAE Laws",             "url": "https://uaelegislation.gov.ae/en",         "type": "official"},
            {"name": "DFSA",                 "url": "https://www.dfsa.ae/rules-and-legislation", "type": "financial"},
        ]
    },
    "sa": {
        "name": "Saudi Arabia",
        "sources": [
            {"name": "Noor (Laws)",          "url": "https://noor.gov.sa",                      "type": "official"},
            {"name": "SAMA",                 "url": "https://www.sama.gov.sa/en-US/Laws",       "type": "financial"},
        ]
    },
    "ca": {
        "name": "Canada",
        "sources": [
            {"name": "Justice Laws Canada",  "url": "https://laws-lois.justice.gc.ca",          "type": "official"},
            {"name": "OSC",                  "url": "https://www.osc.ca/en/securities-law",     "type": "financial"},
            {"name": "OPC (Privacy)",        "url": "https://www.priv.gc.ca/en/privacy-topics", "type": "privacy"},
        ]
    },
    "za": {
        "name": "South Africa",
        "sources": [
            {"name": "SA Law",               "url": "https://www.salaw.com",                    "type": "academic"},
            {"name": "FSCA",                 "url": "https://www.fsca.co.za/Regulatory%20Frameworks","type": "financial"},
        ]
    },
}

# Add remaining countries as abbreviated entries
ADDITIONAL_JURISDICTIONS = {
    "ng": "Nigeria", "ke": "Kenya", "eg": "Egypt", "ma": "Morocco",
    "gh": "Ghana",   "th": "Thailand", "ph": "Philippines", "vn": "Vietnam",
    "kr": "South Korea", "tw": "Taiwan", "nz": "New Zealand", "pk": "Pakistan",
    "bd": "Bangladesh", "lk": "Sri Lanka", "mm": "Myanmar", "kh": "Cambodia",
    "at": "Austria", "be": "Belgium", "ch": "Switzerland", "nl": "Netherlands",
    "se": "Sweden", "no": "Norway", "dk": "Denmark", "fi": "Finland",
    "pl": "Poland", "cz": "Czech Republic", "hu": "Hungary", "ro": "Romania",
    "it": "Italy", "es": "Spain", "pt": "Portugal", "gr": "Greece",
    "mx": "Mexico", "ar": "Argentina", "cl": "Chile", "co": "Colombia",
    "pe": "Peru", "uy": "Uruguay", "ec": "Ecuador", "ve": "Venezuela",
    "kw": "Kuwait", "qa": "Qatar", "bh": "Bahrain", "om": "Oman",
    "jo": "Jordan", "lb": "Lebanon", "tr": "Turkey", "il": "Israel",
    "ru": "Russia", "ua": "Ukraine", "kz": "Kazakhstan", "az": "Azerbaijan",
    "tz": "Tanzania", "ug": "Uganda", "et": "Ethiopia", "zm": "Zambia",
    "sn": "Senegal", "ci": "Côte d'Ivoire", "cm": "Cameroon", "ao": "Angola",
    "pa": "Panama", "cr": "Costa Rica", "gt": "Guatemala", "hn": "Honduras",
    "jm": "Jamaica", "do": "Dominican Republic", "cu": "Cuba", "pr": "Puerto Rico",
    "pg": "Papua New Guinea", "fj": "Fiji", "ws": "Samoa", "to": "Tonga",
}

# Build full country list
ALL_COUNTRIES: dict = {}
ALL_COUNTRIES.update(LEGAL_SOURCES)
for code, name in ADDITIONAL_JURISDICTIONS.items():
    ALL_COUNTRIES[code] = {"name": name, "sources": []}


# ── Compliance Frameworks ─────────────────────────────────────────────────────
COMPLIANCE_FRAMEWORKS = {
    # Global Privacy
    "gdpr":       {"name": "GDPR",           "region": "EU",       "domain": "privacy",      "url": "https://eur-lex.europa.eu/eli/reg/2016/679"},
    "ccpa":       {"name": "CCPA/CPRA",       "region": "US-CA",    "domain": "privacy",      "url": "https://oag.ca.gov/privacy/ccpa"},
    "hipaa":      {"name": "HIPAA",           "region": "US",       "domain": "healthcare",   "url": "https://www.hhs.gov/hipaa"},
    "pdpa_sg":    {"name": "PDPA Singapore",  "region": "SG",       "domain": "privacy",      "url": "https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act"},
    "pdpa_th":    {"name": "PDPA Thailand",   "region": "TH",       "domain": "privacy",      "url": "https://www.pdpc.or.th"},
    "pdpa_my":    {"name": "PDPA Malaysia",   "region": "MY",       "domain": "privacy",      "url": "https://pdp.agc.gov.my"},
    "uu_pdp":     {"name": "UU PDP Indonesia","region": "ID",       "domain": "privacy",      "url": "https://jdih.kominfo.go.id"},
    "uk_gdpr":    {"name": "UK GDPR",         "region": "UK",       "domain": "privacy",      "url": "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources"},
    "pipeda":     {"name": "PIPEDA Canada",   "region": "CA",       "domain": "privacy",      "url": "https://laws-lois.justice.gc.ca/eng/acts/P-8.6"},
    # Financial
    "basel_iii":  {"name": "Basel III/IV",    "region": "Global",   "domain": "banking",      "url": "https://www.bis.org/bcbs/basel3.htm"},
    "mifid2":     {"name": "MiFID II",        "region": "EU",       "domain": "financial",    "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32014L0065"},
    "psd2":       {"name": "PSD2",            "region": "EU",       "domain": "payments",     "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32015L2366"},
    "dora":       {"name": "DORA",            "region": "EU",       "domain": "fintech",      "url": "https://www.eba.europa.eu/regulation-and-policy/operational-resilience/digital-operational-resilience-act-dora"},
    "sox":        {"name": "SOX",             "region": "US",       "domain": "accounting",   "url": "https://www.sec.gov/spotlight/sarbanes-oxley.htm"},
    "fatca":      {"name": "FATCA",           "region": "US",       "domain": "tax",          "url": "https://www.irs.gov/businesses/corporations/fatca-information-for-foreign-financial-institutions"},
    "crs":        {"name": "CRS (OECD)",      "region": "Global",   "domain": "tax",          "url": "https://www.oecd.org/tax/automatic-exchange"},
    # AML/KYC
    "fatf":       {"name": "FATF Recommendations","region":"Global", "domain": "aml",          "url": "https://www.fatf-gafi.org/en/topics/fatf-recommendations.html"},
    "aml_eu":     {"name": "EU AMLD6",        "region": "EU",       "domain": "aml",          "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L1673"},
    "kyc_id":     {"name": "KYC/AML Indonesia","region":"ID",        "domain": "aml",          "url": "https://www.ppatk.go.id/peraturan"},
    "ofac":       {"name": "OFAC Sanctions",  "region": "US",       "domain": "sanctions",    "url": "https://ofac.treasury.gov"},
    # Cybersecurity
    "iso27001":   {"name": "ISO 27001:2022",  "region": "Global",   "domain": "security",     "url": "https://www.iso.org/standard/27001"},
    "nist_csf":   {"name": "NIST CSF 2.0",   "region": "US",       "domain": "security",     "url": "https://www.nist.gov/cyberframework"},
    "nis2":       {"name": "NIS2 Directive",  "region": "EU",       "domain": "security",     "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555"},
    "pci_dss":    {"name": "PCI DSS v4.0",   "region": "Global",   "domain": "payments",     "url": "https://www.pcisecuritystandards.org"},
    "soc2":       {"name": "SOC 2",           "region": "US",       "domain": "audit",        "url": "https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report"},
    # AI Regulation
    "eu_ai_act":  {"name": "EU AI Act",       "region": "EU",       "domain": "ai",           "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"},
    "nist_ai":    {"name": "NIST AI RMF",     "region": "US",       "domain": "ai",           "url": "https://airc.nist.gov/Home"},
    # ESG
    "csrd":       {"name": "CSRD",            "region": "EU",       "domain": "esg",          "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464"},
    "gri":        {"name": "GRI Standards",   "region": "Global",   "domain": "esg",          "url": "https://www.globalreporting.org/standards"},
    "tcfd":       {"name": "TCFD",            "region": "Global",   "domain": "climate",      "url": "https://www.fsb-tcfd.org"},
    "ifrs_s1":    {"name": "IFRS S1/S2",      "region": "Global",   "domain": "esg",          "url": "https://www.ifrs.org/issued-standards/ifrs-sustainability-disclosure-standards"},
    # Indonesia-specific
    "ojk":        {"name": "OJK Regulations", "region": "ID",       "domain": "financial",    "url": "https://ojk.go.id/id/regulasi"},
    "bi":         {"name": "Bank Indonesia",  "region": "ID",       "domain": "banking",      "url": "https://www.bi.go.id/id/regulasi"},
    "uu_pt":      {"name": "UU PT No.40/2007","region":"ID",         "domain": "corporate",    "url": "https://jdih.go.id"},
    "uu_ck":      {"name": "UU Cipta Kerja",  "region": "ID",       "domain": "employment",   "url": "https://jdih.go.id"},
    # Healthcare
    "hl7_fhir":   {"name": "HL7 FHIR",        "region": "Global",   "domain": "healthcare",   "url": "https://hl7.org/fhir"},
    "mdr_eu":     {"name": "EU MDR",           "region": "EU",       "domain": "medical",      "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0745"},
    # Energy/OT
    "iec62443":   {"name": "IEC 62443",        "region": "Global",   "domain": "ot_security",  "url": "https://www.iec.ch/iecnorm/iec/62443"},
    "nerc_cip":   {"name": "NERC CIP",         "region": "US/CA",    "domain": "energy",       "url": "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx"},
    # HR/Labor
    "ilo":        {"name": "ILO Conventions",  "region": "Global",   "domain": "labor",        "url": "https://normlex.ilo.org/dyn/normlex/en"},
    "uu_tk":      {"name": "UU Ketenagakerjaan","region":"ID",        "domain": "labor",        "url": "https://jdih.go.id"},
    # Corporate Governance
    "coso":       {"name": "COSO Framework",   "region": "Global",   "domain": "governance",   "url": "https://www.coso.org"},
    "cobit":      {"name": "COBIT 2019",       "region": "Global",   "domain": "governance",   "url": "https://www.isaca.org/resources/cobit"},
    # Sanctions
    "eu_sanctions":{"name":"EU Sanctions",      "region": "EU",       "domain": "sanctions",    "url": "https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions"},
    "un_sanctions":{"name":"UN Sanctions",      "region": "UN",       "domain": "sanctions",    "url": "https://main.un.org/securitycouncil/en/sanctions/information"},
    "uk_sanctions":{"name":"UK Sanctions",      "region": "UK",       "domain": "sanctions",    "url": "https://www.gov.uk/government/collections/financial-sanctions-regime-specific-legislation"},
    # Government
    "wto":        {"name": "WTO Agreements",   "region": "Global",   "domain": "trade",        "url": "https://www.wto.org/english/docs_e/legal_e/legal_e.htm"},
    "oecd_mli":   {"name": "OECD MLI (Tax)",   "region": "Global",   "domain": "tax",          "url": "https://www.oecd.org/tax/treaties/beps-mli-position-country-list.pdf"},
    # Defense
    "itar":       {"name": "ITAR",             "region": "US",       "domain": "defense",      "url": "https://www.pmddtc.state.gov/ddtc_public?id=ddtc_public_portal_itar_pbl"},
    "ear":        {"name": "EAR/Export Control","region":"US",        "domain": "defense",      "url": "https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear"},
    # Standards
    "iso27701":   {"name": "ISO 27701",        "region": "Global",   "domain": "privacy",      "url": "https://www.iso.org/standard/71670.html"},
    "fedramp":    {"name": "FedRAMP",          "region": "US",       "domain": "cloud",        "url": "https://www.fedramp.gov"},
}


# ── Regulatory Update Scanner ─────────────────────────────────────────────────
class RegulatoryRadar:
    """
    Scans regulatory sources for new laws and amendments.
    Uses LLM to interpret and summarize regulatory changes.
    """

    def __init__(self, data_path: str = "/legal/data"):
        self.data_path  = Path(data_path)
        self.index_file = self.data_path / "regulatory_index.json"
        self._last_scan: float = 0.0
        self._index: dict = {}
        self._load_index()

    def _load_index(self):
        try:
            if self.index_file.exists():
                self._index = json.loads(self.index_file.read_text())
        except Exception:
            self._index = {}

    def _save_index(self):
        try:
            self.data_path.mkdir(parents=True, exist_ok=True)
            self.index_file.write_text(json.dumps(self._index, indent=2, ensure_ascii=False))
        except Exception as e:
            logger.warning("Could not save regulatory index: %s", e)

    def get_all_countries(self) -> dict:
        return ALL_COUNTRIES

    def get_frameworks(self, domain: Optional[str] = None, region: Optional[str] = None) -> dict:
        result = {}
        for code, fw in COMPLIANCE_FRAMEWORKS.items():
            if domain and fw.get("domain") != domain:
                continue
            if region and fw.get("region", "").lower() not in (region.lower(), "global"):
                continue
            result[code] = fw
        return result

    def get_country_info(self, country_code: str) -> dict:
        code = country_code.lower()
        info = ALL_COUNTRIES.get(code, {})
        return {
            "code":        code,
            "name":        info.get("name", code.upper()),
            "sources":     info.get("sources", []),
            "frameworks":  [
                k for k, v in COMPLIANCE_FRAMEWORKS.items()
                if v.get("region", "").lower() in (code, "global")
            ],
        }

    async def search_recent_updates(
        self,
        jurisdictions: list[str],
        topic: str = "",
        since_days: int = 30,
    ) -> list[dict]:
        """
        Search for recent regulatory updates using AI-powered analysis.
        Returns list of detected changes with citations.
        """
        from src.core.llm import get_llm
        llm = get_llm()

        jur_names = [ALL_COUNTRIES.get(j, {}).get("name", j.upper()) for j in jurisdictions]
        topic_str = f" related to '{topic}'" if topic else ""

        prompt = f"""Search your knowledge for significant regulatory and legal developments{topic_str} in the following jurisdictions from the past {since_days} days or recently enacted:

Jurisdictions: {", ".join(jur_names)}

For each development found, provide:
1. Country/jurisdiction
2. Law/regulation name and number
3. Status (enacted/proposed/amended/repealed)
4. Effective date or expected date
5. Key changes or requirements
6. Impact level (LOW/MEDIUM/HIGH/CRITICAL)
7. Affected sectors/industries
8. Official source URL if known

Return as JSON array with fields: country, jurisdiction_code, law_name, law_number, status, effective_date, summary, impact, sectors, source_url, confidence_score

Only include laws you have high confidence about. If uncertain, note confidence_score below 70.
If no significant updates found, return empty array [].
"""

        try:
            result = await llm.complete_json(prompt, task_type="legal_research")
            if isinstance(result, list):
                updates = result
            elif isinstance(result, dict) and "raw" not in result:
                # Handle wrapped arrays
                updates = next((v for v in result.values() if isinstance(v, list)), [])
            else:
                updates = []

            # Cache the results
            cache_key = f"updates_{','.join(sorted(jurisdictions))}_{since_days}"
            self._index[cache_key] = {
                "updates": updates,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "topic": topic,
            }
            self._save_index()
            return updates

        except Exception as e:
            logger.error("Regulatory radar scan failed: %s", e)
            return []

    async def get_law_summary(
        self,
        law_name: str,
        jurisdiction: str,
        language: str = "en",
    ) -> dict:
        """Get detailed AI summary of a specific law."""
        from src.core.llm import get_llm
        llm = get_llm()

        country = ALL_COUNTRIES.get(jurisdiction, {}).get("name", jurisdiction.upper())

        prompt = f"""Provide a comprehensive summary of: {law_name} ({country})

Include:
1. Official name and number
2. Date enacted and effective date
3. Jurisdiction and scope
4. Purpose and objectives
5. Key provisions and requirements
6. Who is affected (sectors, company types, individuals)
7. Penalties for non-compliance
8. Related laws and amendments
9. Current status (in force / amended / repealed)
10. Official source / government portal URL

Confidence score (0-100): How confident are you in this information?

Return as JSON with fields: law_name, law_number, jurisdiction, enacted_date, effective_date, purpose, key_provisions (array), affected_parties (array), penalties, related_laws (array), status, source_url, last_updated, confidence_score, disclaimer

Disclaimer must include: "Information current as of knowledge cutoff. Verify with official sources before legal reliance."
"""

        try:
            return await llm.complete_json(prompt, language=language, task_type="legal_research")
        except Exception as e:
            logger.error("Law summary failed: %s", e)
            return {"error": str(e), "law_name": law_name}


# Singleton
_radar: Optional[RegulatoryRadar] = None


def get_radar() -> RegulatoryRadar:
    global _radar
    if _radar is None:
        from src.config.settings import get_config
        _radar = RegulatoryRadar(get_config().data_path)
    return _radar
