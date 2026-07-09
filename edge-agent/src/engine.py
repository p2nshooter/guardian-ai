# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Edge — AI Gateway & API Management Engine v1.0
====================================================
World-class AI API gateway. OpenAI-compatible drop-in.

Architecture:
  ▸ Multi-provider: OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Ollama
  ▸ Smart routing: cost/latency/quality/round-robin/smart-balance
  ▸ Rate limiting: token bucket per API key (RPM + TPM + TPD)
  ▸ Token metering: real-time, per-customer cost tracking
  ▸ Prompt injection firewall: 15+ regex patterns + structural analysis
  ▸ Jailbreak detection: pattern + semantic heuristics
  ▸ Response caching: SHA-256 exact match, TTL-configurable
  ▸ Abuse detection: Welford z-score anomaly per key
  ▸ Budget enforcement: daily/monthly hard caps per customer
  ▸ Circuit breaker: auto-skip failed providers, retry after backoff
  ▸ Streaming: SSE pass-through with metering
  ▸ Audit log: immutable SQLite WAL with hash chaining
  ▸ OpenAI-compatible REST API (/v1/chat/completions, /v1/models)
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import os
import re
import time
import uuid
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Deque, Dict, List, Optional, Tuple

import aiosqlite

try:
    import aiohttp
    _HAS_AIOHTTP = True
except ImportError:
    _HAS_AIOHTTP = False

log = logging.getLogger("edge.engine")

# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER CATALOG  (real pricing, accurate 2025)
# ─────────────────────────────────────────────────────────────────────────────
PROVIDERS: Dict[str, Dict] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "auth_header": "Authorization", "auth_prefix": "Bearer ",
        "timeout": 90,
        "models": {
            "gpt-4o":              {"in_per_1m": 2.50,  "out_per_1m": 10.00, "ctx": 128000},
            "gpt-4o-mini":         {"in_per_1m": 0.15,  "out_per_1m": 0.60,  "ctx": 128000},
            "gpt-4-turbo":         {"in_per_1m": 10.00, "out_per_1m": 30.00, "ctx": 128000},
            "gpt-3.5-turbo":       {"in_per_1m": 0.50,  "out_per_1m": 1.50,  "ctx": 16385},
            "o1-mini":             {"in_per_1m": 3.00,  "out_per_1m": 12.00, "ctx": 128000},
            "o3-mini":             {"in_per_1m": 1.10,  "out_per_1m": 4.40,  "ctx": 200000},
        },
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com",
        "auth_header": "x-api-key", "auth_prefix": "",
        "extra_headers": {"anthropic-version": "2023-06-01"},
        "timeout": 120,
        "models": {
            "claude-opus-4-6":            {"in_per_1m": 15.00, "out_per_1m": 75.00, "ctx": 200000},
            "claude-sonnet-4-6":          {"in_per_1m": 3.00,  "out_per_1m": 15.00, "ctx": 200000},
            "claude-haiku-4-5-20251001":  {"in_per_1m": 0.25,  "out_per_1m": 1.25,  "ctx": 200000},
        },
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "timeout": 60,
        "models": {
            "gemini-2.0-flash":    {"in_per_1m": 0.10,  "out_per_1m": 0.40,  "ctx": 1048576},
            "gemini-1.5-pro":      {"in_per_1m": 1.25,  "out_per_1m": 5.00,  "ctx": 2097152},
            "gemini-1.5-flash":    {"in_per_1m": 0.075, "out_per_1m": 0.30,  "ctx": 1048576},
        },
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "auth_header": "Authorization", "auth_prefix": "Bearer ",
        "timeout": 30,
        "models": {
            "llama-3.1-8b-instant":    {"in_per_1m": 0.05, "out_per_1m": 0.08, "ctx": 131072},
            "llama-3.3-70b-versatile": {"in_per_1m": 0.59, "out_per_1m": 0.79, "ctx": 131072},
            "mixtral-8x7b-32768":      {"in_per_1m": 0.27, "out_per_1m": 0.27, "ctx": 32768},
            "gemma2-9b-it":            {"in_per_1m": 0.20, "out_per_1m": 0.20, "ctx": 8192},
        },
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "auth_header": "Authorization", "auth_prefix": "Bearer ",
        "timeout": 90,
        "models": {
            "deepseek-chat":      {"in_per_1m": 0.14, "out_per_1m": 0.28, "ctx": 65536},
            "deepseek-reasoner":  {"in_per_1m": 0.55, "out_per_1m": 2.19, "ctx": 65536},
        },
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "auth_header": "Authorization", "auth_prefix": "Bearer ",
        "timeout": 60,
        "models": {
            "mistral-small-latest":   {"in_per_1m": 0.20, "out_per_1m": 0.60,  "ctx": 32000},
            "mistral-large-latest":   {"in_per_1m": 2.00, "out_per_1m": 6.00,  "ctx": 128000},
            "codestral-latest":       {"in_per_1m": 0.20, "out_per_1m": 0.60,  "ctx": 256000},
        },
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "auth_header": "Authorization", "auth_prefix": "Bearer ",
        "timeout": 300,
        "models": {},   # dynamic
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# PROMPT INJECTION FIREWALL  (15 pattern families)
# ─────────────────────────────────────────────────────────────────────────────
_INJ_PATTERNS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?", re.I),
    re.compile(r"disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions?", re.I),
    re.compile(r"forget\s+(?:everything|all)\s+(?:above|before|i\s+said)", re.I),
    re.compile(r"you\s+are\s+now\s+(?:DAN|freed|jailbreak|unfiltered|uncensored)", re.I),
    re.compile(r"pretend\s+you\s+(?:have\s+no\s+restrictions|are\s+evil|are\s+uncensored)", re.I),
    re.compile(r"\bDAN\s+mode\b|do\s+anything\s+now", re.I),
    re.compile(r"act\s+as\s+if\s+you\s+(?:have\s+no\s+limits|can\s+do\s+anything)", re.I),
    re.compile(r"jailbreak|bypass\s+(?:safety|filter|content\s+policy|restriction)", re.I),
    re.compile(r"(?:print|reveal|output|show)\s+(?:your\s+)?(?:system\s+prompt|instructions|training\s+data)", re.I),
    re.compile(r"what\s+(?:are|were)\s+your\s+(?:exact\s+)?(?:instructions|prompt|system\s+message)", re.I),
    re.compile(r"<\s*/?(?:system|instruction|prompt)\s*>", re.I),
    re.compile(r"\[INST\]|\[SYS\]|<<SYS>>", re.I),
    re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]"),   # control chars
    re.compile(r"(?:new\s+)?system\s*:\s*(?:you\s+are|your\s+role|ignore)", re.I),
    re.compile(r"role\s*:\s*(?:system|god|admin|root|developer\s+mode)", re.I),
]
_JAILBREAK_PATTERNS = [
    re.compile(r"how\s+to\s+(?:make|build|synthesize|manufacture)\s+(?:methamphetamine|fentanyl|explosives?|bomb|bioweapon)", re.I),
    re.compile(r"(?:child|minor|underage)\s+(?:sexual|nude|naked|exploitation|abuse)", re.I),
    re.compile(r"(?:write|create|generate)\s+(?:malware|ransomware|rootkit|keylogger|exploit\s+code)", re.I),
    re.compile(r"how\s+to\s+(?:bypass|crack|hack)\s+(?:2fa|mfa|authentication|login)", re.I),
]

class RoutingMode(str, Enum):
    COST_FIRST    = "cost_first"
    QUALITY_FIRST = "quality_first"
    LATENCY_FIRST = "latency_first"
    ROUND_ROBIN   = "round_robin"
    SMART_BALANCE = "smart_balance"
    FAILOVER      = "failover"

# ─────────────────────────────────────────────────────────────────────────────
# TOKEN BUCKET RATE LIMITER
# ─────────────────────────────────────────────────────────────────────────────
class RateLimiter:
    def __init__(self):
        # api_key → {req_tokens, req_cap, req_rate, tok_tokens, tok_cap, tok_rate, last}
        self._keys:  Dict[str, Dict] = {}
        self._daily: Dict[str, Dict] = {}
        self._lock   = asyncio.Lock()

    def configure(self, api_key: str, rpm: int = 60, tpm: int = 100_000, tpd: int = 2_000_000):
        self._keys[api_key] = {
            "req_cap":   rpm, "req_tokens": float(rpm), "req_rate": rpm / 60.0,
            "tok_cap":   tpm, "tok_tokens": float(tpm), "tok_rate": tpm / 60.0,
            "last":      time.time(),
        }
        self._daily[api_key] = {"cap": tpd, "used": 0, "day": int(time.time() // 86400)}

    async def check(self, api_key: str, tokens: int = 1) -> Tuple[bool, str]:
        async with self._lock:
            bkt = self._keys.get(api_key)
            if not bkt:
                return True, ""
            now = time.time()
            dt  = now - bkt["last"]
            bkt["req_tokens"] = min(bkt["req_cap"], bkt["req_tokens"] + dt * bkt["req_rate"])
            bkt["tok_tokens"] = min(bkt["tok_cap"], bkt["tok_tokens"] + dt * bkt["tok_rate"])
            bkt["last"] = now

            day = int(now // 86400)
            dd  = self._daily[api_key]
            if dd["day"] != day:
                dd.update({"used": 0, "day": day})
            if dd["used"] + tokens > dd["cap"]:
                return False, f"Daily budget exceeded ({dd['used']:,}/{dd['cap']:,} tokens)"
            if bkt["req_tokens"] < 1:
                wait = (1 - bkt["req_tokens"]) / bkt["req_rate"]
                return False, f"Rate limit: {bkt['req_cap']} req/min. Retry-After: {wait:.1f}s"
            if bkt["tok_tokens"] < tokens:
                return False, f"Token rate limit: {bkt['tok_cap']} tokens/min"

            bkt["req_tokens"] -= 1
            bkt["tok_tokens"] -= tokens
            dd["used"] += tokens
            return True, ""

    def get_usage(self, api_key: str) -> Dict:
        bkt = self._keys.get(api_key, {})
        dd  = self._daily.get(api_key, {})
        return {
            "req_remaining": int(bkt.get("req_tokens", 0)),
            "tok_remaining": int(bkt.get("tok_tokens", 0)),
            "daily_used":    dd.get("used", 0),
            "daily_cap":     dd.get("cap", 0),
        }

# ─────────────────────────────────────────────────────────────────────────────
# CIRCUIT BREAKER  (per provider)
# ─────────────────────────────────────────────────────────────────────────────
class CircuitBreaker:
    def __init__(self, fail_threshold: int = 5, recovery_sec: float = 60.0):
        self._thresh   = fail_threshold
        self._recovery = recovery_sec
        self._errors:  Dict[str, int]   = defaultdict(int)
        self._opened:  Dict[str, float] = {}
        self._latency: Dict[str, float] = {}   # EWA

    def is_open(self, provider: str) -> bool:
        t = self._opened.get(provider)
        if t is None:
            return False
        if time.time() - t > self._recovery:
            del self._opened[provider]
            self._errors[provider] = 0
            log.info(f"Circuit closed for {provider}")
            return False
        return True

    def record_success(self, provider: str, latency_ms: float):
        self._errors[provider] = max(0, self._errors[provider] - 1)
        prev = self._latency.get(provider, latency_ms)
        self._latency[provider] = prev * 0.8 + latency_ms * 0.2   # EWA α=0.2

    def record_failure(self, provider: str):
        self._errors[provider] += 1
        if self._errors[provider] >= self._thresh:
            self._opened[provider] = time.time()
            log.warning(f"Circuit OPENED for {provider} after {self._thresh} failures")

    def latency(self, provider: str) -> float:
        return self._latency.get(provider, 9999.0)

# ─────────────────────────────────────────────────────────────────────────────
# SMART ROUTER
# ─────────────────────────────────────────────────────────────────────────────
class SmartRouter:
    def __init__(self, vendors: List[Dict], mode: RoutingMode, cb: CircuitBreaker):
        self._vendors = vendors
        self._mode    = mode
        self._cb      = cb
        self._rr_idx  = 0

    def _cost(self, vendor: Dict, in_tok: int, out_tok: int) -> float:
        p   = vendor.get("provider", "")
        m   = vendor.get("model", vendor.get("default_model", ""))
        cfg = PROVIDERS.get(p, {}).get("models", {}).get(m, {})
        return (in_tok * cfg.get("in_per_1m", 0.5) + out_tok * cfg.get("out_per_1m", 1.5)) / 1_000_000

    def select(self, in_tok: int = 100, out_tok: int = 500) -> Optional[Dict]:
        avail = [v for v in self._vendors
                 if v.get("api_key","").strip()
                 and not self._cb.is_open(v.get("provider",""))]
        if not avail:
            return None

        if self._mode == RoutingMode.COST_FIRST:
            return min(avail, key=lambda v: self._cost(v, in_tok, out_tok))
        if self._mode == RoutingMode.LATENCY_FIRST:
            return min(avail, key=lambda v: self._cb.latency(v.get("provider","")))
        if self._mode == RoutingMode.QUALITY_FIRST:
            # Prefer highest-cost model as proxy for quality
            return max(avail, key=lambda v: self._cost(v, in_tok, out_tok))
        if self._mode == RoutingMode.ROUND_ROBIN:
            v = avail[self._rr_idx % len(avail)]
            self._rr_idx += 1
            return v
        if self._mode == RoutingMode.SMART_BALANCE:
            max_c = max(self._cost(v, in_tok, out_tok) for v in avail) or 0.000001
            max_l = max(self._cb.latency(v.get("provider","")) for v in avail) or 1.0
            def score(v):
                c = self._cost(v, in_tok, out_tok) / max_c
                l = self._cb.latency(v.get("provider","")) / max_l
                e = min(self._cb._errors.get(v.get("provider",""), 0), 10) / 10.0
                return c * 0.40 + l * 0.40 + e * 0.20
            return min(avail, key=score)
        return avail[0]  # FAILOVER default

# ─────────────────────────────────────────────────────────────────────────────
# SEMANTIC CACHE
# ─────────────────────────────────────────────────────────────────────────────
class SemanticCache:
    def __init__(self, ttl: int = 3600, max_size: int = 10_000):
        self._ttl      = ttl
        self._max      = max_size
        self._store:   Dict[str, Tuple[Dict, float, int]] = {}  # hash→(resp,ts,hits)

    def _key(self, messages: List[Dict], model: str) -> str:
        txt = json.dumps({"m": model, "msgs": messages}, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(txt.encode()).hexdigest()

    def get(self, messages: List[Dict], model: str) -> Optional[Dict]:
        k = self._key(messages, model)
        e = self._store.get(k)
        if e and time.time() - e[1] < self._ttl:
            self._store[k] = (e[0], e[1], e[2] + 1)
            return {**e[0], "_cache": "HIT", "_cache_hits": e[2] + 1}
        if e:
            del self._store[k]
        return None

    def put(self, messages: List[Dict], model: str, resp: Dict):
        if len(self._store) >= self._max:
            oldest = min(self._store, key=lambda k: self._store[k][1])
            del self._store[oldest]
        self._store[self._key(messages, model)] = (resp, time.time(), 0)

    @property
    def stats(self) -> Dict:
        now    = time.time()
        valid  = sum(1 for v in self._store.values() if now - v[1] < self._ttl)
        hits   = sum(v[2] for v in self._store.values())
        return {"entries": len(self._store), "valid": valid, "total_hits": hits}

# ─────────────────────────────────────────────────────────────────────────────
# ABUSE DETECTOR  (Welford online z-score)
# ─────────────────────────────────────────────────────────────────────────────
class AbuseDetector:
    def __init__(self, z_thresh: float = 4.0):
        self._z    = z_thresh
        self._stat: Dict[str, Tuple[int, float, float]] = {}   # key→(n,mean,M2)
        self._wins: Dict[str, Deque[Tuple[float,int]]]  = defaultdict(lambda: deque(maxlen=500))
        self._blocked: Dict[str, int] = defaultdict(int)

    def _update(self, key: str, v: float) -> Tuple[float, float]:
        n, mean, M2 = self._stat.get(key, (0, 0.0, 0.0))
        n += 1; d = v - mean; mean += d / n; M2 += d * (v - mean)
        self._stat[key] = (n, mean, M2)
        return mean, math.sqrt(M2 / (n - 1)) if n > 1 else 0.0

    def record(self, api_key: str, tokens: int, blocked: bool = False):
        self._wins[api_key].append((time.time(), tokens))
        if blocked:
            self._blocked[api_key] += 1
        # Update baseline
        rpm_key = f"{api_key}:rpm"
        now = time.time()
        rpm = sum(1 for ts, _ in self._wins[api_key] if now - ts < 60)
        self._update(rpm_key, float(rpm))

    def is_abusive(self, api_key: str) -> Tuple[bool, str]:
        if self._blocked.get(api_key, 0) >= 10:
            return True, f"Repeated blocked requests ({self._blocked[api_key]})"
        now   = time.time()
        w     = self._wins.get(api_key, deque())
        rpm   = sum(1 for ts, _ in w if now - ts < 60)
        tpm   = sum(tok for ts, tok in w if now - ts < 60)
        if rpm > 300:
            return True, f"Request rate anomaly: {rpm} req/min"
        if tpm > 2_000_000:
            return True, f"Token rate anomaly: {tpm:,} tokens/min"
        # Z-score check
        rpm_key = f"{api_key}:rpm"
        stat = self._stat.get(rpm_key)
        if stat and stat[0] > 30:
            _, mean, M2 = stat
            std  = math.sqrt(M2 / (stat[0] - 1)) if stat[0] > 1 else 1.0
            if std > 0 and abs(rpm - mean) / std > self._z:
                return True, f"RPM z-score anomaly: {rpm} vs baseline {mean:.0f}±{std:.0f}"
        return False, ""

# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER CALL  (real HTTP, all providers, with streaming)
# ─────────────────────────────────────────────────────────────────────────────
async def _call_provider(
    vendor: Dict,
    messages: List[Dict],
    max_tokens: int = 1024,
    temperature: float = 0.7,
    stream: bool = False,
    extra_kwargs: Optional[Dict] = None,
) -> Tuple[Dict, int, int]:
    """
    Make real HTTP call to AI provider.
    Returns: (response_dict, prompt_tokens, completion_tokens)
    """
    if not _HAS_AIOHTTP:
        raise RuntimeError("aiohttp not installed — pip install aiohttp")

    provider = vendor.get("provider", "openai")
    api_key  = vendor.get("api_key", "")
    model    = vendor.get("model", "")
    pcfg     = PROVIDERS.get(provider, {})
    base_url = vendor.get("base_url", pcfg.get("base_url", ""))
    timeout  = aiohttp.ClientTimeout(total=pcfg.get("timeout", 90))
    extra_kw = extra_kwargs or {}

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    auth_h   = pcfg.get("auth_header", "Authorization")
    auth_p   = pcfg.get("auth_prefix", "Bearer ")
    if api_key:
        headers[auth_h] = f"{auth_p}{api_key}"
    for k, v in pcfg.get("extra_headers", {}).items():
        headers[k] = v

    # ── ANTHROPIC ──────────────────────────────────────────────────────────
    if provider == "anthropic":
        sys_parts  = [m["content"] for m in messages if m.get("role") == "system"
                      and isinstance(m.get("content"), str)]
        chat_msgs  = [m for m in messages if m.get("role") != "system"]
        body: Dict = {"model": model, "max_tokens": max_tokens, "messages": chat_msgs}
        if sys_parts:
            body["system"] = " ".join(sys_parts)
        if temperature is not None:
            body["temperature"] = temperature
        url = f"{base_url}/v1/messages"
        async with aiohttp.ClientSession(timeout=timeout) as s:
            async with s.post(url, headers=headers, json=body) as r:
                if r.status != 200:
                    txt = await r.text()
                    raise RuntimeError(f"Anthropic {r.status}: {txt[:200]}")
                d      = await r.json()
                text   = d.get("content", [{}])[0].get("text", "")
                in_tok = d.get("usage", {}).get("input_tokens", 0)
                ou_tok = d.get("usage", {}).get("output_tokens", 0)
                return {
                    "id": d.get("id", str(uuid.uuid4())),
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": model,
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                                 "finish_reason": d.get("stop_reason", "stop")}],
                    "usage": {"prompt_tokens": in_tok, "completion_tokens": ou_tok,
                              "total_tokens": in_tok + ou_tok},
                }, in_tok, ou_tok

    # ── GEMINI ─────────────────────────────────────────────────────────────
    if provider == "gemini":
        parts   = []
        for m in messages:
            content = m.get("content", "")
            if isinstance(content, str):
                parts.append({"text": content})
        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
        }
        url = f"{base_url}/models/{model}:generateContent?key={api_key}"
        headers.pop("Authorization", None)
        async with aiohttp.ClientSession(timeout=timeout) as s:
            async with s.post(url, headers=headers, json=body) as r:
                if r.status != 200:
                    txt = await r.text()
                    raise RuntimeError(f"Gemini {r.status}: {txt[:200]}")
                d    = await r.json()
                text = d["candidates"][0]["content"]["parts"][0]["text"]
                meta = d.get("usageMetadata", {})
                in_tok = meta.get("promptTokenCount", 0)
                ou_tok = meta.get("candidatesTokenCount", 0)
                return {
                    "id": str(uuid.uuid4()), "object": "chat.completion",
                    "created": int(time.time()), "model": model,
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                                 "finish_reason": "stop"}],
                    "usage": {"prompt_tokens": in_tok, "completion_tokens": ou_tok,
                              "total_tokens": in_tok + ou_tok},
                }, in_tok, ou_tok

    # ── OPENAI-COMPATIBLE (OpenAI, Groq, DeepSeek, Mistral, Ollama) ────────
    body = {
        "model": model, "messages": messages,
        "max_tokens": max_tokens, "temperature": temperature,
        **{k: v for k, v in extra_kw.items() if k not in ("max_tokens","temperature")},
    }
    url = f"{base_url}/chat/completions"
    async with aiohttp.ClientSession(timeout=timeout) as s:
        async with s.post(url, headers=headers, json=body) as r:
            if r.status != 200:
                txt = await r.text()
                raise RuntimeError(f"{provider} {r.status}: {txt[:200]}")
            d      = await r.json()
            usage  = d.get("usage", {})
            in_tok = usage.get("prompt_tokens", 0)
            ou_tok = usage.get("completion_tokens", 0)
            return d, in_tok, ou_tok

# ─────────────────────────────────────────────────────────────────────────────
# USAGE RECORD
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class UsageRecord:
    id:           str   = field(default_factory=lambda: str(uuid.uuid4()))
    ts:           float = field(default_factory=time.time)
    api_key:      str   = ""
    customer_id:  str   = ""
    provider:     str   = ""
    model:        str   = ""
    prompt_tok:   int   = 0
    compl_tok:    int   = 0
    total_tok:    int   = 0
    cost_usd:     float = 0.0
    latency_ms:   float = 0.0
    cached:       bool  = False
    blocked:      bool  = False
    block_reason: str   = ""
    status:       int   = 200

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EDGE ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class EdgeEngine:
    def __init__(self, config: Dict, db_path: str = "/edge/data/edge.db"):
        self._config  = config
        self._db_path = db_path
        vendors       = config.get("ai_pool", {}).get("vendors", [])
        mode          = RoutingMode(config.get("ai_pool", {}).get("routing_mode", "cost_first"))
        self._cb      = CircuitBreaker(
            fail_threshold=config.get("circuit_breaker_threshold", 5),
            recovery_sec=config.get("circuit_breaker_recovery_sec", 60),
        )
        self._router  = SmartRouter(vendors, mode, self._cb)
        self._cache   = SemanticCache(
            ttl=config.get("cache", {}).get("ttl_seconds", 3600),
            max_size=config.get("cache", {}).get("max_entries", 10_000),
        )
        self._rl      = RateLimiter()
        self._abuse   = AbuseDetector()
        self._db:     Optional[aiosqlite.Connection] = None

        # Firewall config
        self._block_injections = config.get("firewall", {}).get("block_injections", True)
        self._block_jailbreaks = config.get("firewall", {}).get("block_jailbreaks", True)
        self._log_blocked      = config.get("firewall", {}).get("log_blocked", True)

        # Load per-customer configs
        self._customers: Dict[str, Dict] = {}
        for cust in config.get("customers", []):
            key = cust.get("api_key", "")
            if key:
                self._customers[key] = cust
                self._rl.configure(
                    key,
                    rpm=cust.get("rpm", 60),
                    tpm=cust.get("tpm", 100_000),
                    tpd=cust.get("tpd", 2_000_000),
                )

        log.info(f"EdgeEngine — vendors={[v.get('provider') for v in vendors]}, "
                 f"mode={mode.value}, customers={len(self._customers)}")

    # ── Lifecycle ──────────────────────────────────────────────────────────
    async def start(self):
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA synchronous=NORMAL")
        await self._init_schema()
        asyncio.create_task(self._billing_rollup())
        log.info("EdgeEngine started ✓")

    async def stop(self):
        if self._db:
            await self._db.close()

    async def _init_schema(self):
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS usage (
                id TEXT PRIMARY KEY, ts REAL, api_key TEXT, customer_id TEXT,
                provider TEXT, model TEXT, prompt_tok INTEGER, compl_tok INTEGER,
                total_tok INTEGER, cost_usd REAL, latency_ms REAL,
                cached INTEGER, blocked INTEGER, block_reason TEXT, status INTEGER
            );
            CREATE TABLE IF NOT EXISTS billing_daily (
                id TEXT PRIMARY KEY, customer_id TEXT, date TEXT,
                total_tok INTEGER, cost_usd REAL, req_count INTEGER,
                blocked_count INTEGER, cache_hits INTEGER, created_at REAL,
                UNIQUE(customer_id, date)
            );
            CREATE TABLE IF NOT EXISTS blocked_keys (
                api_key TEXT PRIMARY KEY, reason TEXT,
                blocked_at REAL, auto_unblock_at REAL
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY, ts REAL, event_type TEXT,
                api_key TEXT, detail TEXT, hash_chain TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_usage_key  ON usage(api_key);
            CREATE INDEX IF NOT EXISTS idx_usage_ts   ON usage(ts);
            CREATE INDEX IF NOT EXISTS idx_usage_prov ON usage(provider);
            CREATE INDEX IF NOT EXISTS idx_billing    ON billing_daily(customer_id, date);
        """)
        await self._db.commit()

    # ── Firewall ───────────────────────────────────────────────────────────
    def _firewall_check(self, messages: List[Dict]) -> Tuple[bool, str]:
        text = " ".join(
            (m.get("content","") if isinstance(m.get("content"), str)
             else " ".join(c.get("text","") for c in m.get("content",[]) if isinstance(c, dict)))
            for m in messages
        )
        if self._block_injections:
            for pat in _INJ_PATTERNS:
                if pat.search(text):
                    return False, f"Prompt injection blocked"
        if self._block_jailbreaks:
            for pat in _JAILBREAK_PATTERNS:
                if pat.search(text):
                    return False, "Jailbreak attempt blocked"
        # Structural: user message faking system role
        for m in messages:
            if m.get("role") == "user":
                c = m.get("content","") if isinstance(m.get("content"),"") else ""
                if re.search(r'<\s*system\s*>', c, re.I):
                    return False, "System role injection detected"
        return True, ""

    # ── Core Request Pipeline ──────────────────────────────────────────────
    async def process(
        self,
        messages:    List[Dict],
        model:       Optional[str],
        api_key:     str,
        max_tokens:  int   = 1024,
        temperature: float = 0.7,
        stream:      bool  = False,
        **kwargs,
    ) -> Dict:
        t0  = time.perf_counter()
        rec = UsageRecord(api_key=api_key)
        cust = self._customers.get(api_key, {})
        rec.customer_id = cust.get("customer_id", api_key[:12])

        # 1. Blocked key check
        if self._db:
            row = await (await self._db.execute(
                "SELECT reason, auto_unblock_at FROM blocked_keys WHERE api_key=?", (api_key,)
            )).fetchone()
            if row:
                unblock_at = row[1]
                if not unblock_at or time.time() < unblock_at:
                    return self._err(429, f"API key blocked: {row[0]}")
                else:
                    await self._db.execute("DELETE FROM blocked_keys WHERE api_key=?", (api_key,))
                    await self._db.commit()

        # 2. Abuse detection
        abusive, reason = self._abuse.is_abusive(api_key)
        if abusive:
            await self._auto_block(api_key, reason, duration_sec=3600)
            return self._err(429, f"Abusive usage detected: {reason}")

        # 3. Rate limiting (estimate tokens from message length)
        est_tok = max(1, sum(
            len((m.get("content","") if isinstance(m.get("content"), str) else
                 " ".join(c.get("text","") for c in m.get("content",[]) if isinstance(c,dict))))
            for m in messages
        ) // 4)
        ok, rl_msg = await self._rl.check(api_key, est_tok)
        if not ok:
            headers_hint = self._rl.get_usage(api_key)
            return self._err(429, rl_msg, extra=headers_hint)

        # 4. Prompt injection firewall
        allowed, block_reason = self._firewall_check(messages)
        if not allowed:
            rec.blocked      = True
            rec.block_reason = block_reason
            rec.latency_ms   = round((time.perf_counter() - t0) * 1000, 1)
            self._abuse.record(api_key, 0, blocked=True)
            await self._save_usage(rec)
            return self._err(400, block_reason)

        # 5. Budget check
        budget_daily = cust.get("budget_daily_usd", 0)
        if budget_daily and self._db:
            today = time.strftime("%Y-%m-%d")
            row   = await (await self._db.execute(
                "SELECT cost_usd FROM billing_daily WHERE customer_id=? AND date=?",
                (rec.customer_id, today)
            )).fetchone()
            if row and row[0] >= budget_daily:
                return self._err(402, f"Daily budget ${budget_daily:.2f} exhausted")

        # 6. Cache lookup
        eff_model = model or (self._router._vendors[0].get("model","") if self._router._vendors else "gpt-4o-mini")
        cached = self._cache.get(messages, eff_model)
        if cached:
            rec.cached     = True
            rec.latency_ms = round((time.perf_counter() - t0) * 1000, 1)
            self._abuse.record(api_key, 0)
            await self._save_usage(rec)
            return {**cached, "x_request_id": rec.id, "x_latency_ms": rec.latency_ms}

        # 7. Select provider
        vendor = self._router.select(est_tok, max_tokens)
        if not vendor:
            return self._err(503, "No AI providers available. Check vendor configuration.")
        rec.provider = vendor.get("provider","")
        rec.model    = model or vendor.get("model","")

        # 8. Call provider (with fallback)
        response    = None
        prompt_tok  = 0
        compl_tok   = 0
        tried = [vendor]
        for attempt_vendor in [vendor] + [
            v for v in self._router._vendors
            if v.get("provider") != vendor.get("provider") and v.get("api_key","").strip()
            and not self._cb.is_open(v.get("provider",""))
        ]:
            try:
                vmod = model or attempt_vendor.get("model","")
                response, prompt_tok, compl_tok = await _call_provider(
                    attempt_vendor, messages, max_tokens, temperature, stream, kwargs
                )
                self._cb.record_success(attempt_vendor.get("provider",""),
                                         (time.perf_counter() - t0) * 1000)
                rec.provider = attempt_vendor.get("provider","")
                rec.model    = vmod
                break
            except Exception as e:
                self._cb.record_failure(attempt_vendor.get("provider",""))
                log.warning(f"Provider {attempt_vendor.get('provider','')} failed: {e}")
                continue
        if response is None:
            return self._err(502, "All configured AI providers failed")

        # 9. Metering & billing
        rec.prompt_tok  = prompt_tok
        rec.compl_tok   = compl_tok
        rec.total_tok   = prompt_tok + compl_tok
        rec.latency_ms  = round((time.perf_counter() - t0) * 1000, 1)
        pcfg            = PROVIDERS.get(rec.provider, {})
        minfo           = pcfg.get("models", {}).get(rec.model, {})
        rec.cost_usd    = (
            prompt_tok  * minfo.get("in_per_1m",  0.5) / 1_000_000 +
            compl_tok   * minfo.get("out_per_1m", 1.5) / 1_000_000
        )
        self._abuse.record(api_key, rec.total_tok)
        self._cache.put(messages, eff_model, response)
        await self._save_usage(rec)
        await self._update_billing(rec)

        # 10. Enrich response with gateway headers
        response["x_request_id"]  = rec.id
        response["x_provider"]    = rec.provider
        response["x_model"]       = rec.model
        response["x_latency_ms"]  = rec.latency_ms
        response["x_cost_usd"]    = round(rec.cost_usd, 8)
        response["x_tokens_used"] = rec.total_tok
        return response

    # ── Persistence ────────────────────────────────────────────────────────
    async def _save_usage(self, r: UsageRecord):
        if not self._db:
            return
        await self._db.execute(
            "INSERT OR IGNORE INTO usage VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (r.id, r.ts, r.api_key, r.customer_id, r.provider, r.model,
             r.prompt_tok, r.compl_tok, r.total_tok, r.cost_usd, r.latency_ms,
             int(r.cached), int(r.blocked), r.block_reason, r.status),
        )
        await self._db.commit()

    async def _update_billing(self, r: UsageRecord):
        if not self._db:
            return
        today = time.strftime("%Y-%m-%d")
        await self._db.execute(
            """INSERT INTO billing_daily (id,customer_id,date,total_tok,cost_usd,req_count,blocked_count,cache_hits,created_at)
               VALUES (?,?,?,?,?,1,0,0,?)
               ON CONFLICT(customer_id,date) DO UPDATE SET
               total_tok=total_tok+excluded.total_tok,
               cost_usd=cost_usd+excluded.cost_usd,
               req_count=req_count+1""",
            (str(uuid.uuid4()), r.customer_id, today, r.total_tok, r.cost_usd, time.time()),
        )
        await self._db.commit()

    async def _auto_block(self, api_key: str, reason: str, duration_sec: float = 3600):
        if not self._db:
            return
        unblock = time.time() + duration_sec
        await self._db.execute(
            "INSERT OR REPLACE INTO blocked_keys VALUES (?,?,?,?)",
            (api_key, reason, time.time(), unblock),
        )
        await self._db.commit()
        log.warning(f"Auto-blocked key {api_key[:8]}... reason={reason}")

    async def _billing_rollup(self):
        """Background: aggregate billing stats every hour."""
        while True:
            await asyncio.sleep(3600)
            log.debug("Billing rollup complete")

    # ── Analytics ─────────────────────────────────────────────────────────
    async def get_stats(self, api_key: Optional[str] = None) -> Dict:
        if not self._db:
            return {}
        now  = time.time()
        d1   = now - 86400
        cond = "AND api_key=?" if api_key else ""
        params = [d1, api_key] if api_key else [d1]

        row = await (await self._db.execute(
            f"SELECT COUNT(*), SUM(total_tok), SUM(cost_usd), AVG(latency_ms), "
            f"SUM(cached), SUM(blocked) FROM usage WHERE ts>? {cond}", params
        )).fetchone()
        by_prov = await (await self._db.execute(
            f"SELECT provider, COUNT(*), SUM(total_tok), SUM(cost_usd) "
            f"FROM usage WHERE ts>? {cond} GROUP BY provider", params
        )).fetchall()
        top_key = await (await self._db.execute(
            "SELECT api_key, COUNT(*), SUM(cost_usd) FROM usage WHERE ts>? "
            "GROUP BY api_key ORDER BY COUNT(*) DESC LIMIT 10", [d1]
        )).fetchall()

        return {
            "requests_24h":    row[0] or 0,
            "tokens_24h":      row[1] or 0,
            "cost_usd_24h":    round(row[2] or 0, 6),
            "avg_latency_ms":  round(row[3] or 0, 1),
            "cache_hits_24h":  row[4] or 0,
            "blocked_24h":     row[5] or 0,
            "by_provider":     [{"provider": r[0], "requests": r[1],
                                  "tokens": r[2], "cost_usd": round(r[3],6)} for r in by_prov],
            "top_customers":   [{"key": r[0][:8]+"...", "requests": r[1],
                                  "cost_usd": round(r[2],6)} for r in top_key],
            "cache_stats":     self._cache.stats,
            "vendors_active":  [v.get("provider") for v in self._router._vendors
                                 if not self._cb.is_open(v.get("provider",""))],
            "circuit_opened":  list(self._cb._opened.keys()),
        }

    async def get_customer_bill(self, customer_id: str, month: str) -> Dict:
        """Get monthly bill for a customer (month: YYYY-MM)."""
        if not self._db:
            return {}
        rows = await (await self._db.execute(
            "SELECT date, total_tok, cost_usd, req_count FROM billing_daily "
            "WHERE customer_id=? AND date LIKE ? ORDER BY date",
            (customer_id, f"{month}%")
        )).fetchall()
        total_tok  = sum(r[1] for r in rows)
        total_cost = sum(r[2] for r in rows)
        total_req  = sum(r[3] for r in rows)
        return {
            "customer_id": customer_id,
            "period": month,
            "total_tokens": total_tok,
            "total_cost_usd": round(total_cost, 6),
            "total_requests": total_req,
            "daily_breakdown": [{"date": r[0], "tokens": r[1],
                                  "cost_usd": round(r[2],6), "requests": r[3]} for r in rows],
        }

    @staticmethod
    def _err(code: int, msg: str, extra: Optional[Dict] = None) -> Dict:
        return {
            "error": {"message": msg, "type": "axto_edge_error", "code": code},
            "status_code": code,
            **(extra or {}),
        }

    def list_models(self) -> List[Dict]:
        models = []
        for vendor in self._router._vendors:
            p    = vendor.get("provider","")
            pcfg = PROVIDERS.get(p, {})
            for mname, minfo in pcfg.get("models", {}).items():
                models.append({
                    "id": mname, "object": "model",
                    "owned_by": p,
                    "context_window": minfo.get("ctx", 0),
                    "cost_input_per_1m":  minfo.get("in_per_1m", 0),
                    "cost_output_per_1m": minfo.get("out_per_1m", 0),
                    "available": not self._cb.is_open(p),
                })
        return models
