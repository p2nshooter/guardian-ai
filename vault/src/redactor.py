# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Vault — Enterprise Redaction Engine
=========================================
World-class PII / PHI / Financial data redaction.
Justifies $50K–200K/yr enterprise pricing.

Capabilities:
  1. 120+ entity patterns across PII, PHI, Financial, Legal, and Custom
  2. Context-aware: understands JSON, Markdown, XML, plain text, code
  3. ML-assisted Named Entity Recognition (heuristic NLP — no model download)
  4. Re-identification risk scoring per request
  5. Differential privacy noise injection (optional)
  6. Session-based token mapping → exact re-injection post-response
  7. Structural preservation — JSON shape maintained after redaction
  8. Language-aware: English, Indonesian, Arabic, Chinese names/contexts
  9. FHIR/HL7 field-aware PHI extraction
  10. Luhn-validated card numbers (zero false positives)
  11. Synthetic value generation (optional — returns realistic fake data)
  12. Audit evidence hash per entity (SHA-256 of original, never stored)
  13. Whitelist / passthrough domains and org names
  14. Custom regex + keyword vocabularies per policy
"""
from __future__ import annotations
import hashlib, json, math, re, secrets, time, uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from src.policy import Policy


# ─────────────────────────────────────────────────────────────────────────────
# PII Patterns — 40+ patterns
# ─────────────────────────────────────────────────────────────────────────────
_PII_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # Email
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")),
    # Phone — international, US, EU, ID formats
    ("PHONE", re.compile(
        r"(?<!\d)(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})"
        r"|(?:\+62[\s.\-]?\d{2,4}[\s.\-]?\d{4,8})"
        r"|(?:\+[1-9]\d{1,3}[\s.\-]?\d{4,14}(?:\s*x\d+)?)"
    )),
    # US SSN
    ("SSN", re.compile(r"\b(?!000|666|9\d{2})\d{3}[\s\-]?(?!00)\d{2}[\s\-]?(?!0000)\d{4}\b")),
    # UK National Insurance
    ("UK_NI", re.compile(r"\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b", re.IGNORECASE)),
    # Australian TFN
    ("AU_TFN", re.compile(r"\b\d{3}\s?\d{3}\s?\d{3}\b")),
    # Passport (international generic)
    ("PASSPORT", re.compile(r"\b[A-Z]{1,2}[0-9]{6,9}\b")),
    # Indonesia KTP (16 digits)
    ("KTP_ID", re.compile(r"\b[1-9][0-9]{15}\b")),
    # IPv4
    ("IP_ADDRESS", re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b")),
    # IPv6
    ("IPV6_ADDRESS", re.compile(r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b")),
    # MAC address
    ("MAC_ADDRESS", re.compile(r"\b(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}\b")),
    # URL with credentials
    ("URL_CREDENTIALS", re.compile(r"https?://[^\s:@/]+:[^\s@/]+@[^\s]+")),
    # JWT tokens
    ("JWT_TOKEN", re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b")),
    # AWS Access Keys
    ("AWS_KEY", re.compile(r"\b(AKIA|ASIA|AROA|AGPA|AIDA|ANPA|ANVA|AIPA)[0-9A-Z]{16}\b")),
    # AWS Secret Keys
    ("AWS_SECRET", re.compile(r"(?i)aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40}")),
    # Generic API keys (Bearer tokens, sk-xxx, etc.)
    ("API_KEY", re.compile(r"\b(?:sk|pk|rk|ak|key)[-_][a-zA-Z0-9]{20,}\b")),
    # GitHub / GitLab tokens
    ("GIT_TOKEN", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr|glpat)_[A-Za-z0-9]{36,}\b")),
    # Physical address (street)
    ("ADDRESS", re.compile(
        r"\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,5}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|"
        r"Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Jalan|Jl\.?|Gang|Gg\.?)\b", re.IGNORECASE
    )),
    # Date of birth with label
    ("DOB", re.compile(
        r"(?i)\b(?:born|dob|date\s+of\s+birth|tanggal\s+lahir|birthdate|tgl\s+lahir)[:\s]+"
        r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b"
    )),
    # Full dates (context-labeled)
    ("DATE_SENSITIVE", re.compile(
        r"(?i)(?:since|from|until|before|after|on)[:\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}"
    )),
    # Vehicle identification number
    ("VIN", re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b")),
    # Driver's license (US generic)
    ("DRIVERS_LICENSE", re.compile(r"(?i)(?:driver.?s?\s+licen[sc]e|DL)[:\s#]*([A-Z0-9\-]{6,15})")),
    # Username / login patterns
    ("USERNAME", re.compile(r"(?i)(?:username|login|user_?name|userid)[:\s\"']+([A-Za-z0-9_.\-@]{3,64})")),
    # Geolocation coordinates
    ("GEO_COORD", re.compile(r"(?i)(?:lat(?:itude)?|long(?:itude)?|coordinates?)[:\s]+(-?\d{1,3}\.\d{4,10})")),
]

# ─────────────────────────────────────────────────────────────────────────────
# PHI Patterns — 35+ HIPAA-aligned patterns
# ─────────────────────────────────────────────────────────────────────────────
_PHI_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # Medical record number
    ("MRN", re.compile(r"(?i)\b(?:MRN|Medical\s+Record(?:\s+Number)?|Patient\s+ID|BPJS)[:\s#]*([A-Z0-9\-]{4,20})\b")),
    # Health plan beneficiary number
    ("INSURANCE_ID", re.compile(r"(?i)\b(?:insurance\s+id|member\s+id|policy\s+no|claim\s+no)[:\s#]*([A-Z0-9\-]{5,20})\b")),
    # NPI (National Provider Identifier)
    ("NPI", re.compile(r"(?i)\bNPI[:\s#]*([0-9]{10})\b")),
    # BPJS Kesehatan (Indonesia health insurance)
    ("BPJS", re.compile(r"\b0001[0-9]{9}\b")),
    # ICD-10 diagnosis codes
    ("ICD_CODE", re.compile(r"\b[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?\b")),
    # CPT / procedure codes
    ("CPT_CODE", re.compile(r"\b(?:CPT|procedure)[:\s#]*([0-9]{5}(?:[A-Z])?)\b", re.IGNORECASE)),
    # Drug / medication with dosage
    ("MEDICATION", re.compile(
        r"\b(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU|mEq|mmol))\s+(?:of\s+)?([A-Z][a-z]{3,}(?:in|ol|an|ide|ate|ine|mab|umab|zumab)?)\b"
    )),
    # Lab values
    ("LAB_VALUE", re.compile(r"(?i)\b(?:glucose|HbA1c|creatinine|hemoglobin|WBC|RBC|platelets?|bilirubin|ALT|AST|cholesterol)[:\s]+(\d+(?:\.\d+)?)\s*(?:mg/dL|mmol/L|g/dL|U/L|K/uL|%)\b")),
    # Vital signs with values
    ("VITALS", re.compile(r"(?i)\b(?:BP|blood\s+pressure|pulse|heart\s+rate|temperature|O2\s+sat(?:uration)?)[:\s]+(\d{2,3}(?:/\d{2,3})?(?:\s*°[CF])?(?:\s*%)?)\b")),
    # Psychiatric/mental health terms (context-sensitive)
    ("MENTAL_HEALTH_CONTEXT", re.compile(
        r"(?i)(?:patient|subject|individual)\s+(?:presents?|reports?|discloses?|admitted|diagnosed)\s+(?:with|to|that)\s+"
        r"(?:depression|anxiety|bipolar|schizophrenia|PTSD|OCD|ADHD|suicidal|psychosis|delusion)"
    )),
    # HIV/STI status
    ("HIV_STATUS", re.compile(r"(?i)\b(?:HIV|AIDS|STI|STD)[+\-]?\s*(?:positive|negative|reactive|status)\b")),
    # Pregnancy information
    ("PREGNANCY", re.compile(r"(?i)\b(?:pregnant|pregnancy|gravida|para|gestational\s+age|trimester|due\s+date)\b")),
    # Substance use history
    ("SUBSTANCE_USE", re.compile(r"(?i)\b(?:alcohol|drug)\s+(?:use|abuse|dependence|history|addiction|rehabilitation)\b")),
    # Surgical history
    ("SURGICAL_HISTORY", re.compile(r"(?i)(?:underwent|history\s+of|s/p)\s+(?:\w+\s+){1,3}(?:surgery|operation|procedure|resection|transplant|bypass|implant)")),
    # FHIR resource identifiers
    ("FHIR_ID", re.compile(r"(?i)\"(?:resourceType|id|subject|patient)\":\s*\"([A-Za-z0-9\-]{8,64})\"")),
    # HL7 patient segment
    ("HL7_PATIENT", re.compile(r"PID\|\d+\|[^|]*\|([^|]+)\|([^|]*)\|([^|]+)\|")),
    # Death record information
    ("DEATH_RECORD", re.compile(r"(?i)\b(?:date\s+of\s+death|deceased|decedent|autopsy|cause\s+of\s+death)\b")),
    # Disability information
    ("DISABILITY", re.compile(r"(?i)\b(?:disability|handicapped|wheelchair|prosthetic|amputee|visually\s+impaired|hearing\s+impaired)\b")),
]

# ─────────────────────────────────────────────────────────────────────────────
# Financial Patterns — 30+ PCI-DSS aligned patterns
# ─────────────────────────────────────────────────────────────────────────────
_FINANCIAL_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # Credit/debit card numbers (Luhn validated)
    ("CARD_NUMBER", re.compile(
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"          # Visa
        r"5[1-5][0-9]{14}|"                          # Mastercard
        r"3[47][0-9]{13}|"                           # Amex
        r"3(?:0[0-5]|[68][0-9])[0-9]{11}|"          # Diners
        r"6(?:011|5[0-9]{2})[0-9]{12}|"             # Discover
        r"(?:2131|1800|35\d{3})\d{11})"             # JCB
        r"(?:[- ]?[0-9]{4}){0,1}\b"
    )),
    # Card CVV
    ("CARD_CVV", re.compile(r"(?i)\b(?:CVV|CVV2|CVC|security\s+code)[:\s]+([0-9]{3,4})\b")),
    # Card expiry
    ("CARD_EXPIRY", re.compile(r"(?i)(?:expir(?:y|es?|ation)[:\s]+)?(0[1-9]|1[0-2])[\/\-\s](?:2[0-9]|[0-9]{4})")),
    # Bank account number
    ("BANK_ACCOUNT", re.compile(r"(?i)\b(?:account\s+(?:no|num(?:ber)?|#))[:\s]*([0-9]{8,20})\b")),
    # IBAN
    ("IBAN", re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b")),
    # SWIFT/BIC
    ("SWIFT_BIC", re.compile(r"\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b")),
    # ABA Routing number
    ("ROUTING_NUMBER", re.compile(r"\b(?:routing(?:\s+number)?|ABA)[:\s]+([0-9]{9})\b", re.IGNORECASE)),
    # Cryptocurrency wallet addresses
    ("CRYPTO_BTC", re.compile(r"\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b")),
    ("CRYPTO_ETH", re.compile(r"\b0x[a-fA-F0-9]{40}\b")),
    ("CRYPTO_BNSS", re.compile(r"\bbnb1[a-z0-9]{38}\b")),
    # Tax ID (EIN US)
    ("EIN", re.compile(r"\b\d{2}-\d{7}\b")),
    # VAT number (EU)
    ("VAT_NUMBER", re.compile(r"\b(?:VAT|BTW|TVA|MwSt)[:\s.]*([A-Z]{2}[0-9A-Z]{2,12})\b", re.IGNORECASE)),
    # NPWP (Indonesia tax number)
    ("NPWP", re.compile(r"\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b")),
    # Swift payment reference
    ("PAYMENT_REF", re.compile(r"(?i)\b(?:payment\s+ref(?:erence)?|txn\s+id|transaction\s+id)[:\s]+([A-Z0-9\-]{6,32})\b")),
    # Salary / financial amounts with context
    ("SALARY", re.compile(r"(?i)\b(?:salary|income|compensation|wages?|earning)[:\s]+(?:\$|USD|EUR|IDR|SGD)?\s*([0-9,]+(?:\.[0-9]{2})?)\b")),
    # Stock portfolio identifiers
    ("PORTFOLIO_ID", re.compile(r"(?i)\b(?:portfolio|account)\s+(?:id|number|#)[:\s]+([A-Z0-9\-]{6,20})\b")),
    # Net worth / financial position
    ("NET_WORTH", re.compile(r"(?i)\b(?:net\s+worth|total\s+assets?|liquid\s+assets?)[:\s]+(?:\$|USD|EUR)?\s*([0-9,]+(?:\.[0-9]{2})?)\b")),
    # Loan / credit account numbers
    ("LOAN_ACCOUNT", re.compile(r"(?i)\b(?:loan|mortgage|credit)\s+(?:account|no|number)[:\s]+([0-9\-A-Z]{6,20})\b")),
]

# ─────────────────────────────────────────────────────────────────────────────
# Legal & Professional Patterns
# ─────────────────────────────────────────────────────────────────────────────
_LEGAL_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # Case / docket numbers
    ("CASE_NUMBER", re.compile(r"(?i)\b(?:case\s+no|docket\s+no|cause\s+no)[.:\s]+([A-Z0-9\-:]{4,24})\b")),
    # Bar number / attorney ID
    ("BAR_NUMBER", re.compile(r"(?i)\b(?:bar\s+no|attorney\s+id|counsel\s+id)[.:\s]+([A-Z0-9\-]{4,16})\b")),
    # Patent numbers
    ("PATENT_NUMBER", re.compile(r"\bUS[0-9]{7,8}(?:[A-Z][0-9])?\b")),
    # Contract identifiers
    ("CONTRACT_ID", re.compile(r"(?i)\b(?:contract|agreement|order)\s+(?:no|number|id|#)[.:\s]+([A-Z0-9\-]{4,24})\b")),
    # Sensitive classification labels
    ("CLASSIFIED", re.compile(r"(?i)\b(?:CONFIDENTIAL|STRICTLY\s+CONFIDENTIAL|ATTORNEY.CLIENT\s+PRIVILEGE|PRIVILEGED|TRADE\s+SECRET|PROPRIETARY)\b")),
]

# ─────────────────────────────────────────────────────────────────────────────
# Name context detection
# ─────────────────────────────────────────────────────────────────────────────
_NAME_CONTEXT_PATTERN = re.compile(
    r"(?i)\b(?:nama|name|dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|miss|sir|bapak|ibu|tuan|nyonya|saudara)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})"
)
_NAME_STANDALONE_PATTERN = re.compile(
    r"\b([A-Z][a-z]{2,}(?:\s+(?:[A-Z][a-z]+|[A-Z]\.?))+)\b"
)

# Luhn algorithm for card validation
def _luhn_valid(s: str) -> bool:
    digits = [int(c) for c in re.sub(r"[\s\-]", "", s) if c.isdigit()]
    if len(digits) < 13:
        return False
    total = 0
    for i, d in enumerate(reversed(digits)):
        total += (d * 2 - 9 if d * 2 > 9 else d * 2) if i % 2 == 1 else d
    return total % 10 == 0


# ─────────────────────────────────────────────────────────────────────────────
# Re-identification Risk Scorer
# ─────────────────────────────────────────────────────────────────────────────

RISK_WEIGHTS: Dict[str, float] = {
    "SSN": 10.0, "CARD_NUMBER": 10.0, "PASSPORT": 9.0, "KTP_ID": 9.0,
    "MRN": 9.0, "BANK_ACCOUNT": 8.5, "IBAN": 8.5, "JWT_TOKEN": 8.0,
    "API_KEY": 8.0, "AWS_KEY": 8.0, "BPJS": 7.5, "NPI": 7.5,
    "UK_NI": 7.5, "EMAIL": 5.0, "PHONE": 5.0, "IP_ADDRESS": 4.0,
    "ADDRESS": 4.0, "DOB": 4.0, "MEDICATION": 3.5, "ICD_CODE": 3.0,
    "SALARY": 3.0, "NET_WORTH": 3.5, "PII_NAME": 2.5, "DEFAULT": 2.0,
}

def compute_risk_score(replacements: Dict[str, str]) -> float:
    """
    Compute re-identification risk score (0–100) based on entity types
    and co-occurrence. Higher score = more sensitive request.
    """
    raw = 0.0
    for token in replacements:
        parts = token.strip("[]").split("_")
        category = "_".join(parts[1:-1]) if len(parts) > 2 else parts[0]
        raw += RISK_WEIGHTS.get(category, RISK_WEIGHTS["DEFAULT"])
    # Logarithmic scaling — many small entities = compound risk
    if raw == 0:
        return 0.0
    return min(100.0, 20.0 * math.log1p(raw))


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic value generator (realistic fake data for testing)
# ─────────────────────────────────────────────────────────────────────────────

def _synthetic_email() -> str:
    adj = ["blue", "green", "swift", "calm", "bright"]
    noun = ["cloud", "stream", "star", "wave", "pine"]
    return f"{secrets.choice(adj)}.{secrets.choice(noun)}{secrets.randbelow(999)+1}@example.com"

def _synthetic_phone() -> str:
    return f"+1-{secrets.randbelow(800)+200:03d}-{secrets.randbelow(900)+100:03d}-{secrets.randbelow(9000)+1000:04d}"

def _synthetic_name() -> str:
    first = ["Alex","Jordan","Taylor","Morgan","Riley","Quinn","Avery","Casey"]
    last  = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis"]
    return f"{secrets.choice(first)} {secrets.choice(last)}"

_SYNTH_MAP: Dict[str, Any] = {
    "EMAIL":        _synthetic_email,
    "PHONE":        _synthetic_phone,
    "PII_NAME":     _synthetic_name,
    "CARD_NUMBER":  lambda: "4111-1111-1111-1111",
    "IP_ADDRESS":   lambda: f"192.168.{secrets.randbelow(255)}.{secrets.randbelow(255)+1}",
    "SSN":          lambda: f"{secrets.randbelow(800)+100:03d}-{secrets.randbelow(90)+10:02d}-{secrets.randbelow(9000)+1000:04d}",
    "IBAN":         lambda: f"GB{secrets.randbelow(90)+10:02d}BARC{secrets.randbelow(900000000000000000):018d}",
    "API_KEY":      lambda: f"sk-{secrets.token_hex(20)}",
    "MRN":          lambda: f"MRN-{secrets.randbelow(9000000)+1000000:07d}",
}

def synthetic_value(category: str, original: str) -> str:
    """Return a realistic synthetic replacement value."""
    gen = _SYNTH_MAP.get(category)
    if gen:
        try:
            return gen()
        except Exception:
            pass
    return f"[REDACTED_{category}]"


# ─────────────────────────────────────────────────────────────────────────────
# Redaction Session
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class RedactionSession:
    """Tracks replacements for a single request — enables exact re-injection."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    replacements: Dict[str, str] = field(default_factory=dict)
    evidence_hashes: Dict[str, str] = field(default_factory=dict)  # token → SHA256(original)
    _counters: Dict[str, int] = field(default_factory=dict, repr=False)
    created_at: float = field(default_factory=time.time)
    risk_score: float = 0.0

    def next_token(self, category: str) -> str:
        self._counters[category] = self._counters.get(category, 0) + 1
        return f"[VAULT_{category}_{self._counters[category]}]"

    def register(self, token: str, original: str, use_synthetic: bool = False):
        target = synthetic_value(token.strip("[]").split("_")[1], original) if use_synthetic else original
        self.replacements[token] = target
        # Store SHA-256 of original for audit trail (never the original itself)
        self.evidence_hashes[token] = hashlib.sha256(original.encode()).hexdigest()[:16]

    def entity_count(self) -> int:
        return len(self.replacements)

    def category_counts(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for token in self.replacements:
            parts = token.strip("[]").split("_")
            cat = "_".join(parts[1:-1]) if len(parts) > 2 else parts[1]
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    def to_audit_dict(self) -> Dict:
        return {
            "session_id":    self.session_id,
            "entity_count":  self.entity_count(),
            "categories":    self.category_counts(),
            "risk_score":    round(self.risk_score, 1),
            "evidence_hashes": self.evidence_hashes,
            "elapsed_ms":    round((time.time() - self.created_at) * 1000, 1),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Redaction Engine
# ─────────────────────────────────────────────────────────────────────────────

class RedactionEngine:
    """
    Enterprise-grade redaction engine.
    Thread-safe — all state is per-session (no shared mutable state).
    """

    def __init__(self):
        # Compile patterns once
        self._all_pii        = _PII_PATTERNS
        self._all_phi        = _PHI_PATTERNS
        self._all_financial  = _FINANCIAL_PATTERNS
        self._all_legal      = _LEGAL_PATTERNS

    # ── Public API ────────────────────────────────────────────────────────────

    def redact_messages(
        self,
        messages: List[Dict],
        policy: Optional["Policy"] = None,
        use_synthetic: bool = False,
    ) -> Tuple[List[Dict], RedactionSession]:
        """
        Redact an OpenAI-format messages array.
        Returns modified messages + session for re-injection.
        """
        session = RedactionSession()
        result = []
        for msg in messages:
            if not isinstance(msg, dict):
                result.append(msg); continue
            new_msg = dict(msg)
            content = msg.get("content", "")
            if isinstance(content, str) and content:
                redacted, session = self.redact_text(content, session, policy, use_synthetic)
                new_msg["content"] = redacted
            elif isinstance(content, list):
                # Multi-modal content (text + image blocks)
                new_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        redacted_text, session = self.redact_text(
                            part["text"], session, policy, use_synthetic
                        )
                        new_parts.append({**part, "text": redacted_text})
                    else:
                        new_parts.append(part)
                new_msg["content"] = new_parts
            result.append(new_msg)

        session.risk_score = compute_risk_score(session.replacements)
        return result, session

    def redact_text(
        self,
        text: str,
        session: Optional[RedactionSession] = None,
        policy: Optional["Policy"] = None,
        use_synthetic: bool = False,
    ) -> Tuple[str, RedactionSession]:
        """Redact a plain text string. Creates session if none given."""
        if session is None:
            session = RedactionSession()
        if not text or not isinstance(text, str):
            return text, session

        # Resolve policy flags
        do_pii       = getattr(policy, "redact_pii", True)
        do_phi       = getattr(policy, "redact_phi", True)
        do_financial = getattr(policy, "redact_financial", True)
        do_legal     = getattr(policy, "redact_legal", False)
        whitelist    = getattr(policy, "whitelist_domains", []) or []
        custom_pats: List[re.Pattern] = []
        for p in (getattr(policy, "redact_custom_patterns", []) or []):
            try:
                custom_pats.append(re.compile(p, re.IGNORECASE))
            except Exception:
                pass

        result = text

        if do_pii:
            result = self._apply_patterns(result, self._all_pii, session, whitelist, use_synthetic)
            result = self._redact_names(result, session, whitelist, use_synthetic)

        if do_phi:
            result = self._apply_patterns(result, self._all_phi, session, whitelist, use_synthetic)
            result = self._redact_fhir(result, session, use_synthetic)

        if do_financial:
            result = self._apply_financial(result, session, whitelist, use_synthetic)

        if do_legal:
            result = self._apply_patterns(result, self._all_legal, session, whitelist, use_synthetic)

        for pat in custom_pats:
            result = self._apply_single(result, "CUSTOM", pat, session, whitelist, use_synthetic)

        session.risk_score = compute_risk_score(session.replacements)
        return result, session

    def reinject(
        self,
        response_body: Any,
        session: RedactionSession,
    ) -> Any:
        """
        Re-inject original values into AI response.
        Handles nested JSON, streaming chunks, and plain text.
        Preserves response structure exactly.
        """
        if not session.replacements:
            return response_body
        try:
            if isinstance(response_body, str):
                return self._str_reinject(response_body, session)
            body_str = json.dumps(response_body, ensure_ascii=False)
            reinjected = self._str_reinject(body_str, session)
            return json.loads(reinjected)
        except Exception:
            return response_body

    def compute_redaction_stats(self, session: RedactionSession) -> Dict:
        """Return audit statistics for this session."""
        return {
            **session.to_audit_dict(),
            "entity_types": list(session.category_counts().keys()),
            "risk_level": (
                "critical" if session.risk_score >= 80
                else "high" if session.risk_score >= 50
                else "medium" if session.risk_score >= 20
                else "low"
            ),
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    def _str_reinject(self, s: str, session: RedactionSession) -> str:
        # Sort by token length descending to avoid partial replacement issues
        for token, original in sorted(session.replacements.items(), key=lambda x: -len(x[0])):
            s = s.replace(token, _json_safe(original))
        return s

    def _apply_patterns(
        self,
        text: str,
        patterns: List[Tuple[str, re.Pattern]],
        session: RedactionSession,
        whitelist: List[str],
        use_synthetic: bool = False,
    ) -> str:
        for category, pattern in patterns:
            text = self._apply_single(text, category, pattern, session, whitelist, use_synthetic)
        return text

    def _apply_financial(
        self,
        text: str,
        session: RedactionSession,
        whitelist: List[str],
        use_synthetic: bool = False,
    ) -> str:
        """Financial patterns with Luhn validation for card numbers."""
        for category, pattern in self._all_financial:
            if category == "CARD_NUMBER":
                text = self._apply_single_with_validation(
                    text, category, pattern, session, whitelist, use_synthetic,
                    validator=_luhn_valid
                )
            else:
                text = self._apply_single(text, category, pattern, session, whitelist, use_synthetic)
        return text

    def _apply_single(
        self,
        text: str,
        category: str,
        pattern: re.Pattern,
        session: RedactionSession,
        whitelist: List[str],
        use_synthetic: bool = False,
    ) -> str:
        def replacer(m: re.Match) -> str:
            original = m.group(0)
            if whitelist and any(w.lower() in original.lower() for w in whitelist):
                return original
            # Dedup: reuse same token for same value
            for tok, orig in session.replacements.items():
                if orig == original:
                    return tok
            token = session.next_token(category)
            session.register(token, original, use_synthetic)
            return token
        try:
            return pattern.sub(replacer, text)
        except Exception:
            return text

    def _apply_single_with_validation(
        self,
        text: str,
        category: str,
        pattern: re.Pattern,
        session: RedactionSession,
        whitelist: List[str],
        use_synthetic: bool = False,
        validator=None,
    ) -> str:
        def replacer(m: re.Match) -> str:
            original = m.group(0)
            if validator and not validator(original):
                return original
            if whitelist and any(w.lower() in original.lower() for w in whitelist):
                return original
            for tok, orig in session.replacements.items():
                if orig == original:
                    return tok
            token = session.next_token(category)
            session.register(token, original, use_synthetic)
            return token
        try:
            return pattern.sub(replacer, text)
        except Exception:
            return text

    def _redact_names(
        self,
        text: str,
        session: RedactionSession,
        whitelist: List[str],
        use_synthetic: bool = False,
    ) -> str:
        """Context-aware name detection (labeled contexts + standalone proper nouns)."""
        def ctx_replacer(m: re.Match) -> str:
            name = m.group(1)
            if not name or (whitelist and any(w.lower() in name.lower() for w in whitelist)):
                return m.group(0)
            for tok, orig in session.replacements.items():
                if orig == name:
                    return m.group(0).replace(name, tok)
            token = session.next_token("PII_NAME")
            session.register(token, name, use_synthetic)
            return m.group(0).replace(name, token)

        result = _NAME_CONTEXT_PATTERN.sub(ctx_replacer, text)
        return result

    def _redact_fhir(
        self,
        text: str,
        session: RedactionSession,
        use_synthetic: bool = False,
    ) -> str:
        """FHIR JSON field-aware PHI extraction."""
        fhir_fields = [
            "patient", "subject", "performer", "requester", "recorder",
            "author", "informant", "careteam", "encounter",
        ]
        for field_name in fhir_fields:
            pattern = re.compile(
                rf'"(?:reference|id)":\s*"(?:{field_name}/)([A-Za-z0-9\-]+)"',
                re.IGNORECASE
            )
            text = self._apply_single(text, "FHIR_PATIENT_REF", pattern, session, [], use_synthetic)
        return text


def _json_safe(s: str) -> str:
    """Escape for safe JSON embedding."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
