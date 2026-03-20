"""
Guardian Engine — Central AI Pool Manager
Client-configurable pool of AI providers for threat analysis.
Supports 9+ vendors with cost-optimized routing (cheapest first, auto-fallback).
"""
from __future__ import annotations
import asyncio
import json
import time
import urllib.request
import urllib.error
from typing import Optional, List
import structlog
from src.config.settings import AIVendorConfig

log = structlog.get_logger()

# ── Supported Vendors & Cost Tiers ────────────────────────────────────────────

SUPPORTED_VENDORS = {
    "openai":     {"name": "OpenAI",        "cost_tier": "medium",   "default_model": "gpt-4o-mini",                    "base_url": "https://api.openai.com/v1"},
    "anthropic":  {"name": "Anthropic",     "cost_tier": "medium",   "default_model": "claude-haiku-4-5-20251001",      "base_url": "https://api.anthropic.com/v1"},
    "gemini":     {"name": "Gemini",        "cost_tier": "low",      "default_model": "gemini-2.0-flash",               "base_url": ""},
    "groq":       {"name": "Groq",          "cost_tier": "very_low", "default_model": "llama-3.1-8b-instant",           "base_url": "https://api.groq.com/openai/v1"},
    "together":   {"name": "Together AI",   "cost_tier": "low",      "default_model": "meta-llama/Llama-3.1-8B-Instruct-Turbo", "base_url": "https://api.together.xyz/v1"},
    "mistral":    {"name": "Mistral AI",    "cost_tier": "low",      "default_model": "mistral-small-latest",           "base_url": "https://api.mistral.ai/v1"},
    "cohere":     {"name": "Cohere",        "cost_tier": "medium",   "default_model": "command-r-08-2024",              "base_url": ""},
    "deepseek":   {"name": "DeepSeek",      "cost_tier": "very_low", "default_model": "deepseek-chat",                  "base_url": "https://api.deepseek.com/v1"},
    "perplexity": {"name": "Perplexity AI", "cost_tier": "low",      "default_model": "llama-3.1-sonar-small-128k-online", "base_url": "https://api.perplexity.ai"},
    "ollama":     {"name": "Ollama",        "cost_tier": "free",     "default_model": "llama3",                         "base_url": "http://localhost:11434"},
    "custom":     {"name": "Custom",        "cost_tier": "unknown",  "default_model": "",                               "base_url": ""},
}

COST_TIER_ORDER = ["free", "very_low", "low", "medium", "high", "unknown"]


def _cost_rank(provider: str) -> int:
    tier = SUPPORTED_VENDORS.get(provider, {}).get("cost_tier", "unknown")
    try:
        return COST_TIER_ORDER.index(tier)
    except ValueError:
        return 999


# ── Response Model ────────────────────────────────────────────────────────────

class AIResponse:
    def __init__(self, text: str, vendor: str, model: str = "", latency_ms: float = 0.0):
        self.text       = text
        self.vendor     = vendor
        self.model      = model
        self.latency_ms = latency_ms
        self.error: Optional[str] = None

    @classmethod
    def err(cls, vendor: str, error: str) -> "AIResponse":
        r = cls("", vendor)
        r.error = error
        return r


# ── Per-Provider Adapter ──────────────────────────────────────────────────────

class AIProvider:
    def __init__(self, cfg: AIVendorConfig):
        self.cfg      = cfg
        self.provider = cfg.provider
        self.model    = cfg.model or SUPPORTED_VENDORS.get(cfg.provider, {}).get("default_model", "")
        self.base_url = getattr(cfg, "base_url", "") or SUPPORTED_VENDORS.get(cfg.provider, {}).get("base_url", "")
        self.cost_rank = _cost_rank(cfg.provider)

    async def complete(self, prompt: str, system: str = "") -> AIResponse:
        try:
            p = self.provider
            if p == "openai":        return await self._openai(prompt, system)
            elif p == "anthropic":   return await self._anthropic(prompt, system)
            elif p == "gemini":      return await self._gemini(prompt, system)
            elif p == "cohere":      return await self._cohere(prompt, system)
            elif p == "ollama":      return await self._ollama(prompt, system)
            else:                    return await self._compat(prompt, system)
        except Exception as e:
            return AIResponse.err(self.provider, str(e))

    async def _openai(self, prompt: str, system: str) -> AIResponse:
        import openai
        t0   = time.time()
        c    = openai.AsyncOpenAI(api_key=self.cfg.api_key)
        msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        r    = await c.chat.completions.create(model=self.model, messages=msgs, max_tokens=1024, temperature=0.1)
        return AIResponse(r.choices[0].message.content or "", "openai", self.model, (time.time() - t0) * 1000)

    async def _anthropic(self, prompt: str, system: str) -> AIResponse:
        import anthropic
        t0 = time.time()
        c  = anthropic.AsyncAnthropic(api_key=self.cfg.api_key)
        kw = {"model": self.model, "max_tokens": 1024, "messages": [{"role": "user", "content": prompt}]}
        if system:
            kw["system"] = system
        r = await c.messages.create(**kw)
        return AIResponse(r.content[0].text if r.content else "", "anthropic", self.model, (time.time() - t0) * 1000)

    async def _gemini(self, prompt: str, system: str) -> AIResponse:
        import google.generativeai as genai
        t0 = time.time()
        genai.configure(api_key=self.cfg.api_key)
        mdl = genai.GenerativeModel(model_name=self.model, system_instruction=system or None)
        r   = await asyncio.to_thread(mdl.generate_content, prompt)
        return AIResponse(r.text or "", "gemini", self.model, (time.time() - t0) * 1000)

    async def _cohere(self, prompt: str, system: str) -> AIResponse:
        import httpx
        t0      = time.time()
        messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        payload = {"model": self.model, "messages": messages}
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                "https://api.cohere.com/v2/chat",
                json=payload,
                headers={"Authorization": f"Bearer {self.cfg.api_key}", "Content-Type": "application/json"},
            )
        d       = r.json()
        content = d.get("message", {}).get("content", [{}])[0].get("text", "")
        return AIResponse(content, "cohere", self.model, (time.time() - t0) * 1000)

    async def _ollama(self, prompt: str, system: str) -> AIResponse:
        import httpx
        t0   = time.time()
        base = self.base_url or "http://localhost:11434"
        async with httpx.AsyncClient(timeout=120.0) as c:
            r = await c.post(
                f"{base.rstrip('/')}/api/generate",
                json={"model": self.model, "prompt": f"{system}\n\n{prompt}" if system else prompt, "stream": False},
            )
        return AIResponse(r.json().get("response", ""), "ollama", self.model, (time.time() - t0) * 1000)

    async def _compat(self, prompt: str, system: str) -> AIResponse:
        """OpenAI-compatible endpoint: groq, together, mistral, deepseek, perplexity, custom."""
        import openai
        t0   = time.time()
        base = self.base_url or SUPPORTED_VENDORS.get(self.provider, {}).get("base_url", "")
        c    = openai.AsyncOpenAI(api_key=self.cfg.api_key, base_url=base)
        msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        r    = await c.chat.completions.create(model=self.model, messages=msgs, max_tokens=1024, temperature=0.1)
        return AIResponse(r.choices[0].message.content or "", self.provider, self.model, (time.time() - t0) * 1000)


# ── Pool Manager ──────────────────────────────────────────────────────────────

class AIPoolManager:
    def __init__(self):
        self._providers: List[AIProvider] = []
        self._idx = 0

    def initialize(self, vendors: List[AIVendorConfig]):
        self._providers = [AIProvider(v) for v in vendors]
        # Sort by cost tier (cheapest first) for default routing
        self._providers.sort(key=lambda p: p.cost_rank)
        log.info(
            "AI Pool: initialized",
            vendors=[v.provider for v in vendors],
            routing="cost_first (cheapest → most expensive)",
        )

    @property
    def vendor_count(self) -> int:
        return len(self._providers)

    @property
    def supported_vendors(self) -> list:
        return list(SUPPORTED_VENDORS.keys())

    async def complete(
        self,
        prompt:   str,
        system:   str = "",
        strategy: str = "cost_first",  # cost_first | round_robin | quality_first
    ) -> AIResponse:
        """Execute completion with automatic failover through the provider pool."""
        if not self._providers:
            return AIResponse.err("none", "No AI vendors configured. Register at least one vendor API key.")

        if strategy == "round_robin":
            ordered = list(self._providers)  # Will iterate round-robin
            start   = self._idx % len(ordered)
            ordered = ordered[start:] + ordered[:start]
            self._idx += 1
        elif strategy == "quality_first":
            # Quality inversely correlates with cost for most models
            ordered = sorted(self._providers, key=lambda p: p.cost_rank, reverse=True)
        else:
            # cost_first — already sorted cheapest-first in initialize()
            ordered = self._providers

        tried: set = set()
        for provider in ordered:
            if id(provider) in tried:
                continue
            tried.add(id(provider))
            resp = await provider.complete(prompt, system)
            if not resp.error:
                log.debug("AI Pool: request served",
                          vendor=resp.vendor, model=resp.model, latency_ms=round(resp.latency_ms, 1))
                return resp
            log.warning("AI Pool: provider failed, trying next",
                        vendor=provider.provider, error=resp.error)

        return AIResponse.err("pool", "all_vendors_failed")

    async def analyze_threat(self, content: str, context: str = "") -> dict:
        """Analyze content for security threats using the cheapest available AI."""
        system = (
            "You are Guardian AI, a cybersecurity threat analysis engine. "
            "Respond ONLY in valid JSON with this exact schema: "
            '{"verdict":"clean|suspicious|malicious","confidence":0.0,"threat_type":null,"indicators":[],"reasoning":""}'
        )
        prompt = f"Analyze for threats:\n\n{content}"
        if context:
            prompt += f"\n\nContext: {context}"

        resp = await self.complete(prompt, system, strategy="cost_first")
        if resp.error:
            return {"verdict": "unknown", "confidence": 0.0, "reasoning": resp.error, "indicators": []}
        try:
            return json.loads(resp.text)
        except json.JSONDecodeError:
            return {"verdict": "unknown", "confidence": 0.0, "reasoning": resp.text[:500], "indicators": []}

    async def classify_file(self, file_info: dict) -> dict:
        """Classify a file as clean/suspicious/malicious using the cheapest available AI."""
        system = (
            "You are a malware analyst. Given file metadata and content samples, "
            "classify the file. Respond ONLY in JSON: "
            '{"verdict":"clean|suspicious|malicious","confidence":0.0,"malware_family":null,"reasoning":""}'
        )
        prompt = f"Classify this file:\n{json.dumps(file_info, indent=2)}"
        resp   = await self.complete(prompt, system, strategy="cost_first")
        if resp.error:
            return {"verdict": "unknown", "confidence": 0.0, "reasoning": resp.error}
        try:
            return json.loads(resp.text)
        except json.JSONDecodeError:
            return {"verdict": "unknown", "confidence": 0.0, "reasoning": resp.text[:500]}
