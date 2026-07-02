# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP Legal Intelligence — expanded global legal-research module.

Goes beyond AXTO Legal's scope: a curated registry of OPEN, publicly-accessible
legal data sources and APIs across major jurisdictions, plus a richer prompt
library for contract analysis, statute lookup, case research, and compliance
drafting. All lookups run from the CLIENT's own machine using the CLIENT's own
network; YP ships the routing and prompts, not the client's queries or keys.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

import httpx
import structlog

log = structlog.get_logger("yp.legal")


@dataclass
class LegalSource:
    id: str
    name: str
    jurisdiction: str          # ISO-ish region label
    kind: str                  # statute | caselaw | regulation | treaty | gazette
    url: str                   # public browse/base URL
    api: Optional[str] = None  # public API base, if any (no key required)
    notes: str = ""


# Curated open/public legal data sources worldwide. These are all publicly
# accessible reference points; YP never scrapes behind paywalls or auth.
LEGAL_SOURCES: list[LegalSource] = [
    # ── United States ────────────────────────────────────────────────────────
    LegalSource("us_govinfo", "GovInfo (US GPO)", "US", "statute",
                "https://www.govinfo.gov", "https://api.govinfo.gov",
                "US federal statutes, CFR, Federal Register (public API key from api.data.gov)."),
    LegalSource("us_courtlistener", "CourtListener", "US", "caselaw",
                "https://www.courtlistener.com", "https://www.courtlistener.com/api/rest/v4",
                "Free US case law & PACER metadata (Free Law Project)."),
    LegalSource("us_ecfr", "eCFR", "US", "regulation",
                "https://www.ecfr.gov", "https://www.ecfr.gov/api",
                "Electronic Code of Federal Regulations, open API."),
    LegalSource("us_congress", "Congress.gov API", "US", "statute",
                "https://www.congress.gov", "https://api.congress.gov/v3",
                "Bills, laws, members (public key from api.data.gov)."),
    # ── European Union ───────────────────────────────────────────────────────
    LegalSource("eu_eurlex", "EUR-Lex", "EU", "statute",
                "https://eur-lex.europa.eu", "https://eur-lex.europa.eu/eurlex-ws",
                "EU treaties, directives, regulations, case law (CELLAR SPARQL/REST)."),
    LegalSource("eu_curia", "CURIA (CJEU)", "EU", "caselaw",
                "https://curia.europa.eu", None,
                "Court of Justice of the European Union case law."),
    # ── United Kingdom ───────────────────────────────────────────────────────
    LegalSource("uk_legislation", "legislation.gov.uk", "UK", "statute",
                "https://www.legislation.gov.uk", "https://www.legislation.gov.uk",
                "UK primary/secondary legislation, open data (Atom/XML by URL)."),
    LegalSource("uk_bailii", "BAILII", "UK", "caselaw",
                "https://www.bailii.org", None,
                "British & Irish case law and legislation."),
    # ── Indonesia ────────────────────────────────────────────────────────────
    LegalSource("id_bpk", "JDIH BPK (Peraturan)", "ID", "statute",
                "https://peraturan.bpk.go.id", None,
                "Indonesian laws & regulations database (Undang-Undang, PP, Perpres)."),
    LegalSource("id_mahkamah", "Mahkamah Agung Putusan", "ID", "caselaw",
                "https://putusan3.mahkamahagung.go.id", None,
                "Indonesian Supreme Court decisions directory."),
    # ── International ────────────────────────────────────────────────────────
    LegalSource("un_treaties", "UN Treaty Collection", "INTL", "treaty",
                "https://treaties.un.org", None,
                "United Nations treaties & international agreements."),
    LegalSource("wipo_lex", "WIPO Lex", "INTL", "statute",
                "https://www.wipo.int/wipolex", None,
                "IP laws & treaties across member states."),
    LegalSource("worldlii", "WorldLII", "INTL", "caselaw",
                "http://www.worldlii.org", None,
                "World Legal Information Institute — multi-jurisdiction free law."),
    LegalSource("oecd_ilibrary", "OECD iLibrary (Law/Policy)", "INTL", "regulation",
                "https://www.oecd-ilibrary.org", None,
                "OECD legal instruments & policy frameworks."),
]

# Richer prompt library — each returns a system+task template the scheduler
# can send to the client's best AI provider.
PROMPTS = {
    "contract_review": (
        "You are a senior contracts attorney. Review the following agreement and "
        "produce: (1) a plain-language summary, (2) a risk table (clause, risk, "
        "severity, suggested edit), (3) missing standard protections, (4) "
        "governing-law and dispute-resolution assessment, (5) a redline of the 3 "
        "most important changes. Be precise and cite clause numbers."
    ),
    "statute_lookup": (
        "You are a legal research assistant. Given a legal question and a "
        "jurisdiction, identify the controlling statutes/regulations, quote the "
        "operative language, explain how it applies, and note any recent "
        "amendments or pending changes. Flag where a licensed local attorney is "
        "required. Always state your jurisdiction assumptions."
    ),
    "case_research": (
        "You are a litigation research assistant. Given a fact pattern and "
        "jurisdiction, identify the leading cases, summarize each holding, explain "
        "how the facts map to precedent, and give a reasoned prediction with "
        "confidence level. Distinguish binding from persuasive authority."
    ),
    "compliance_draft": (
        "You are a compliance officer. Draft a compliance memo for the given "
        "framework (GDPR, HIPAA, SOC2, ISO27001, PCI-DSS, or local equivalent) "
        "covering: applicable obligations, current gaps, remediation steps with "
        "owners and deadlines, and evidence to collect for audit."
    ),
    "privacy_policy": (
        "You are a privacy counsel. Draft or review a privacy policy for the "
        "described product, mapping each data flow to a lawful basis, retention "
        "period, and data-subject right, aligned to the named jurisdiction(s)."
    ),
}

DISCLAIMER = (
    "YP Legal Intelligence provides research assistance and drafting support. "
    "It is NOT legal advice and does not create an attorney-client relationship. "
    "Always have a licensed attorney in the relevant jurisdiction review outputs "
    "before relying on them."
)


def sources_for(jurisdiction: Optional[str] = None, kind: Optional[str] = None) -> list:
    out = LEGAL_SOURCES
    if jurisdiction:
        j = jurisdiction.upper()
        out = [s for s in out if s.jurisdiction == j]
    if kind:
        out = [s for s in out if s.kind == kind]
    return [s.__dict__ for s in out]


def jurisdictions() -> list:
    return sorted({s.jurisdiction for s in LEGAL_SOURCES})
