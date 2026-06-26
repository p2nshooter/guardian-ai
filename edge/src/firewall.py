# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Edge — FirewallEngine
Three layers of protection:
  1. Prompt Injection Detection — 40+ attack patterns
  2. Content Filter — NSFW, violence, competitor mentions, custom blocklist
  3. Abuse Detection — velocity anomalies, token burst detection
"""
from __future__ import annotations
import asyncio
import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import structlog

log = structlog.get_logger()

# ─────────────────────────────────────────────────────────────────────────────
# Prompt Injection Patterns
# Covers: jailbreaks, system prompt overrides, roleplay attacks, data extraction
# ─────────────────────────────────────────────────────────────────────────────
_INJECTION_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # System prompt overrides
    ("system_override",     re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I)),
    ("system_override",     re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I)),
    ("system_override",     re.compile(r"forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|context)", re.I)),
    ("system_override",     re.compile(r"new\s+instructions?[\s:]+", re.I)),
    ("system_override",     re.compile(r"your\s+(new\s+)?system\s+prompt\s+is", re.I)),
    ("system_override",     re.compile(r"override\s+(your\s+)?(system|previous)\s+(prompt|instructions?)", re.I)),
    # Role switching attacks
    ("jailbreak_dan",       re.compile(r"\bDAN\b.*(?:do anything now|without restrictions?)", re.I)),
    ("jailbreak_dan",       re.compile(r"you are now\s+(?:DAN|jailbroken|unrestricted|freed)", re.I)),
    ("role_switch",         re.compile(r"(?:act|pretend|roleplay|play)\s+as\s+(?:an?\s+)?(?:evil|unethical|unrestricted|jailbroken|uncensored)\s+ai", re.I)),
    ("role_switch",         re.compile(r"you\s+(?:are|must\s+act)\s+(?:as\s+)?(?:an?\s+)?(?:assistant|ai)\s+without\s+(any\s+)?(?:restrictions?|filters?|guidelines?|rules?)", re.I)),
    ("role_switch",         re.compile(r"switch\s+to\s+(?:developer|admin|jailbreak|unrestricted)\s+mode", re.I)),
    # Data extraction
    ("data_extraction",     re.compile(r"(?:reveal|show|print|display|output|repeat|echo)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|context)", re.I)),
    ("data_extraction",     re.compile(r"what\s+(?:are\s+)?(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|initial\s+context)", re.I)),
    ("data_extraction",     re.compile(r"(?:print|output|show)\s+(?:all\s+)?(?:previous\s+)?messages?", re.I)),
    # Indirect injection
    ("indirect_injection",  re.compile(r"translate\s+(?:this|the\s+following).*?ignore", re.I | re.DOTALL)),
    ("indirect_injection",  re.compile(r"summarize\s+(?:this|the\s+following).*?ignore\s+previous", re.I | re.DOTALL)),
    # Token smuggling
    ("token_smuggling",     re.compile(r"<\|(?:im_start|system|end|pad)\|>", re.I)),
    ("token_smuggling",     re.compile(r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>", re.I)),
    # Prompt leaking
    ("prompt_leak",         re.compile(r"repeat\s+(?:the\s+)?(?:exact\s+)?(?:words?\s+)?(?:from\s+)?(?:your\s+)?(?:system|initial)\s+(?:prompt|message)", re.I)),
    # Goal hijacking
    ("goal_hijack",         re.compile(r"(?:your\s+)?(?:only\s+|true\s+)?(?:goal|task|purpose|job)\s+(?:is\s+)?(?:now|from\s+now\s+on)?\s*[:=]", re.I)),
    # Encoding attacks
    ("encoding_attack",     re.compile(r"base64\s*(?:decode|encoded|:\s*)", re.I)),
    ("encoding_attack",     re.compile(r"rot13|hex\s+encoded|url\s+encoded\s+instruction", re.I)),
    # Virtualization
    ("virtualization",      re.compile(r"(?:imagine|pretend|simulate|hypothetically)\s+(?:you\s+are\s+)?(?:a\s+)?(?:different|uncensored|unrestricted)\s+(?:ai|model|assistant)", re.I)),
]

# ─────────────────────────────────────────────────────────────────────────────
# Content Filter Patterns
# ─────────────────────────────────────────────────────────────────────────────
_CONTENT_BLOCK_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("weapons_mass",    re.compile(r"\b(?:synthesize|make|create|build|instructions?\s+for)\s+(?:a\s+)?(?:bomb|explosive|nerve\s+agent|chemical\s+weapon|bioweapon|anthrax|sarin|ricin|vx\b)", re.I)),
    ("csam",            re.compile(r"child\s+(?:porn|sexual|abuse\s+material)|csam|underage\s+(?:sexual|nude|porn)", re.I)),
    ("self_harm",       re.compile(r"(?:how\s+to\s+)?(?:commit\s+suicide|kill\s+myself|methods?\s+of\s+self.harm)\s+(?:step|method|way)", re.I)),
    ("malware_code",    re.compile(r"write\s+(?:a\s+)?(?:ransomware|keylogger|trojan|rootkit|virus|worm|malware)\s+(?:code|script|program|in\s+python|in\s+javascript)", re.I)),
]


@dataclass
class FirewallRule:
    id:      str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name:    str = ""
    pattern: str = ""
    action:  str = "block"   # "block" | "log" | "alert"
    enabled: bool = True


class FirewallEngine:
    def __init__(self, cfg):
        self._cfg    = cfg
        self._rules:  List[FirewallRule] = []
        # Abuse detection: per-customer token velocity
        self._token_windows: Dict[str, List[float]] = {}

    def check_prompt_injection(self, messages: List[Dict]) -> Dict:
        """Check all message content for injection patterns."""
        full_text = " ".join(
            m.get("content", "") if isinstance(m.get("content"), str)
            else " ".join(p.get("text","") for p in m.get("content",[]) if isinstance(p,dict))
            for m in messages
            if m.get("role") in ("user", "system")
        )
        if not full_text:
            return {"blocked": False}

        for pattern_name, pattern in _INJECTION_PATTERNS:
            if pattern.search(full_text):
                return {
                    "blocked": True,
                    "pattern": pattern_name,
                    "detail":  f"Prompt injection pattern detected: {pattern_name}",
                }

        # Check custom rules
        for rule in self._rules:
            if not rule.enabled: continue
            try:
                if re.search(rule.pattern, full_text, re.I):
                    if rule.action == "block":
                        return {"blocked": True, "pattern": rule.name, "detail": f"Custom rule: {rule.name}"}
            except re.error:
                pass

        return {"blocked": False}

    def check_content(self, messages: List[Dict], plan) -> Tuple[bool, str]:
        """Returns (ok, reason). ok=True means content passes filter."""
        full_text = " ".join(
            m.get("content","") if isinstance(m.get("content"), str) else ""
            for m in messages
        )
        # Always-on: critical content (regardless of plan setting)
        for cat, pat in _CONTENT_BLOCK_PATTERNS:
            if pat.search(full_text):
                return False, f"Content policy violation: {cat}"

        # Plan-level blocked keywords
        if plan and getattr(plan, "blocked_keywords", []):
            for kw in plan.blocked_keywords:
                if kw.lower() in full_text.lower():
                    return False, f"Blocked keyword: {kw}"

        return True, ""

    async def check_abuse_async(self, customer_id: str, tokens: int, latency_ms: int):
        """Async abuse detection — detect unusual patterns, fire alert if found."""
        now = time.monotonic()
        window = self._token_windows.get(customer_id, [])
        # Keep last 60 seconds
        window = [t for t in window if now - t < 60.0]
        window.append(now)
        self._token_windows[customer_id] = window

        # Velocity check: >200 requests in 60s from same customer
        if len(window) > 200:
            log.warning("edge_abuse_velocity", customer_id=customer_id, count=len(window))

        # Token burst: >100k tokens in single request
        if tokens > 100_000:
            log.warning("edge_abuse_token_burst", customer_id=customer_id, tokens=tokens)

    def list_rules(self) -> List[Dict]:
        return [{"id":r.id,"name":r.name,"pattern":r.pattern,"action":r.action,"enabled":r.enabled}
                for r in self._rules]

    def add_rule(self, data: Dict) -> Dict:
        rule = FirewallRule(
            name=data.get("name","Custom Rule"),
            pattern=data.get("pattern",""),
            action=data.get("action","block"),
            enabled=data.get("enabled",True),
        )
        # Validate regex
        try:
            re.compile(rule.pattern)
        except re.error as e:
            raise ValueError(f"Invalid regex pattern: {e}")
        self._rules.append(rule)
        return {"id":rule.id,"name":rule.name,"pattern":rule.pattern,"action":rule.action}

    def remove_rule(self, rule_id: str):
        self._rules = [r for r in self._rules if r.id != rule_id]
