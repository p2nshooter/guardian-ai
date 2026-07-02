# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP Privacy Layer — PII / PHI / Financial redaction.

Native capability (covers what AXTO Vault does): before YP forwards any text
to a BYOK AI provider, sensitive values are replaced with stable placeholders,
and the original values are re-injected into the response — so the provider
never sees raw PII/PHI/financial data, while the client's app sees full text.

Deterministic, dependency-free regex engine (no external NLP model needed);
runs entirely on the client's own machine.
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field


def _luhn_ok(digits: str) -> bool:
    """Luhn checksum — real credit-card numbers pass; a random 16-digit ID
    (e.g. an Indonesian NIK) almost never does, so we can tell them apart."""
    if not digits.isdigit() or not (13 <= len(digits) <= 19):
        return False
    total, alt = 0, False
    for ch in reversed(digits):
        d = ord(ch) - 48
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0

# Order matters: most specific patterns first so e.g. an SSN isn't caught as a
# generic number. Each entry: (label, compiled regex).
_PATTERNS = [
    ("EMAIL",        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("CREDIT_CARD",  re.compile(r"\b(?:\d[ -]?){13,19}\b")),
    ("IBAN",         re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")),
    ("SSN",          re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("NIK",          re.compile(r"\b\d{16}\b")),                       # Indonesian national ID
    ("PHONE",        re.compile(r"\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d{3,4}[ -]?\d{3,4}\b")),
    ("IP",           re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("API_KEY",      re.compile(r"\b(?:sk|pk|rk|xai|gsk|AIza)[-_][A-Za-z0-9\-_]{16,}\b")),
    ("CRYPTO_WALLET",re.compile(r"\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[A-Za-z1-9]{33})\b")),
    ("DOB",          re.compile(r"\b(?:19|20)\d{2}-\d{2}-\d{2}\b")),
]


@dataclass
class RedactionResult:
    redacted: str
    mapping: dict = field(default_factory=dict)   # placeholder -> original
    count: int = 0


def redact(text: str) -> RedactionResult:
    if not text:
        return RedactionResult(redacted=text or "", mapping={}, count=0)
    mapping: dict = {}
    counters: dict = {}
    out = text
    for label, rx in _PATTERNS:
        def _sub(m):
            original = m.group(0)
            # skip trivially short "credit card"/"phone" false hits
            digits = re.sub(r"\D", "", original)
            if label == "CREDIT_CARD":
                # Only treat as a card if it passes the Luhn checksum — this lets
                # a bare 16-digit national ID (NIK) fall through to the NIK
                # pattern below instead of being mislabeled as a card. Both are
                # still redacted; this just makes the label honest/correct.
                if not _luhn_ok(digits):
                    return original
            if label == "PHONE" and len(digits) < 7:
                return original
            counters[label] = counters.get(label, 0) + 1
            ph = f"[YP_{label}_{counters[label]}]"
            mapping[ph] = original
            return ph
        out = rx.sub(_sub, out)
    return RedactionResult(redacted=out, mapping=mapping, count=len(mapping))


def reinject(text: str, mapping: dict) -> str:
    """Restore original values in a provider response."""
    if not text or not mapping:
        return text or ""
    out = text
    for ph, original in mapping.items():
        out = out.replace(ph, original)
    return out


def redact_messages(messages: list) -> tuple:
    """Redact every message's content; return (redacted_messages, merged_map)."""
    merged: dict = {}
    red_msgs = []
    for m in messages:
        content = m.get("content", "") if isinstance(m, dict) else str(m)
        r = redact(content)
        merged.update(r.mapping)
        nm = dict(m) if isinstance(m, dict) else {"role": "user", "content": content}
        nm["content"] = r.redacted
        red_msgs.append(nm)
    return red_msgs, merged
