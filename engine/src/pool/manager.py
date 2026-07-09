# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Guardian Engine — Central AI Pool Manager
Client-configurable pool — 15 providers, cost-optimized routing, auto-failover.
Mirrors Orchestra's provider list so clients can use the same API keys everywhere.
"""
from __future__ import annotations
import asyncio, json, time, urllib.request, urllib.error
from typing import Optional, List
import structlog
from src.config.settings import AIVendorConfig

log = structlog.get_logger()

# ── Supported Vendors ─────────────────────────────────────────────────────────
SUPPORTED_VENDORS: dict = {
    "openai":      {"name":"OpenAI",         "cost_tier":"medium",   "default_model":"gpt-4o-mini",                          "base_url":"https://api.openai.com/v1"},
    "anthropic":   {"name":"Anthropic",      "cost_tier":"medium",   "default_model":"claude-haiku-4-5-20251001",            "base_url":"https://api.anthropic.com/v1"},
    "gemini":      {"name":"Gemini",         "cost_tier":"low",      "default_model":"gemini-2.0-flash",                     "base_url":""},
    "groq":        {"name":"Groq",           "cost_tier":"very_low", "default_model":"llama-3.1-8b-instant",                 "base_url":"https://api.groq.com/openai/v1"},
    "together":    {"name":"Together AI",    "cost_tier":"low",      "default_model":"meta-llama/Llama-3.1-8B-Instruct-Turbo","base_url":"https://api.together.xyz/v1"},
    "mistral":     {"name":"Mistral AI",     "cost_tier":"low",      "default_model":"mistral-small-latest",                 "base_url":"https://api.mistral.ai/v1"},
    "cohere":      {"name":"Cohere",         "cost_tier":"medium",   "default_model":"command-r-08-2024",                    "base_url":"https://api.cohere.com/v2"},
    "deepseek":    {"name":"DeepSeek",       "cost_tier":"very_low", "default_model":"deepseek-chat",                        "base_url":"https://api.deepseek.com/v1"},
    "perplexity":  {"name":"Perplexity AI",  "cost_tier":"low",      "default_model":"sonar",                                "base_url":"https://api.perplexity.ai"},
    "xai":         {"name":"xAI (Grok)",     "cost_tier":"medium",   "default_model":"grok-3-mini",                          "base_url":"https://api.x.ai/v1"},
    "fireworks":   {"name":"Fireworks AI",   "cost_tier":"low",      "default_model":"accounts/fireworks/models/llama-v3p3-70b-instruct", "base_url":"https://api.fireworks.ai/inference/v1"},
    "azure_openai":{"name":"Azure OpenAI",   "cost_tier":"medium",   "default_model":"gpt-4o-mini",                          "base_url":""},
    "cerebras":    {"name":"Cerebras",       "cost_tier":"very_low", "default_model":"llama-3.3-70b",                        "base_url":"https://api.cerebras.ai/v1"},
    "sambanova":   {"name":"SambaNova",      "cost_tier":"low",      "default_model":"Meta-Llama-3.3-70B-Instruct",          "base_url":"https://api.sambanova.ai/v1"},
    "ollama":      {"name":"Ollama (Local)", "cost_tier":"free",     "default_model":"llama3.2",                             "base_url":"http://localhost:11434"},
    "custom":      {"name":"Custom",         "cost_tier":"unknown",  "default_model":"",                                     "base_url":""},
}

COST_TIER_ORDER = ["free","very_low","low","medium","high","unknown"]

def _cost_rank(provider: str) -> int:
    tier = SUPPORTED_VENDORS.get(provider, {}).get("cost_tier","unknown")
    try:    return COST_TIER_ORDER.index(tier)
    except: return 999


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


class AIProvider:
    def __init__(self, cfg: AIVendorConfig):
        self.cfg       = cfg
        self.provider  = cfg.provider
        self.model     = cfg.model or SUPPORTED_VENDORS.get(cfg.provider, {}).get("default_model", "")
        self.base_url  = getattr(cfg, "base_url", "") or SUPPORTED_VENDORS.get(cfg.provider, {}).get("base_url", "")
        self.cost_rank = _cost_rank(cfg.provider)

    async def complete(self, prompt: str, system: str = "") -> AIResponse:
        try:
            p = self.provider
            if   p == "openai":     return await self._openai(prompt, system)
            elif p == "anthropic":  return await self._anthropic(prompt, system)
            elif p == "gemini":     return await self._gemini(prompt, system)
            elif p == "cohere":     return await self._cohere(prompt, system)
            elif p == "ollama":     return await self._ollama(prompt, system)
            else:                   return await self._compat(prompt, system)
        except Exception as e:
            return AIResponse.err(self.provider, str(e))

    async def _openai(self, prompt: str, system: str) -> AIResponse:
        import openai
        t0   = time.time()
        c    = openai.AsyncOpenAI(api_key=self.cfg.api_key)
        msgs = ([{"role":"system","content":system}] if system else []) + [{"role":"user","content":prompt}]
        r    = await c.chat.completions.create(model=self.model, messages=msgs, max_tokens=1024, temperature=0.1)
        return AIResponse(r.choices[0].message.content or "", "openai", self.model, (time.time()-t0)*1000)

    async def _anthropic(self, prompt: str, system: str) -> AIResponse:
        import anthropic
        t0 = time.time()
        c  = anthropic.AsyncAnthropic(api_key=self.cfg.api_key)
        kw: dict = {"model":self.model,"max_tokens":1024,"messages":[{"role":"user","content":prompt}]}
        if system: kw["system"] = system
        r = await c.messages.create(**kw)
        return AIResponse(r.content[0].text if r.content else "", "anthropic", self.model, (time.time()-t0)*1000)

    async def _gemini(self, prompt: str, system: str) -> AIResponse:
        import google.generativeai as genai
        t0 = time.time()
        genai.configure(api_key=self.cfg.api_key)
        mdl = genai.GenerativeModel(model_name=self.model, system_instruction=system or None)
        r   = await asyncio.to_thread(mdl.generate_content, prompt)
        return AIResponse(r.text or "", "gemini", self.model, (time.time()-t0)*1000)

    async def _cohere(self, prompt: str, system: str) -> AIResponse:
        import httpx
        t0 = time.time()
        msgs = ([{"role":"system","content":system}] if system else []) + [{"role":"user","content":prompt}]
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post("https://api.cohere.com/v2/chat",
                json={"model":self.model,"messages":msgs},
                headers={"Authorization":f"Bearer {self.cfg.api_key}","Content-Type":"application/json"})
        d = r.json()
        text = d.get("message",{}).get("content",[{}])[0].get("text","")
        return AIResponse(text, "cohere", self.model, (time.time()-t0)*1000)

    async def _ollama(self, prompt: str, system: str) -> AIResponse:
        import httpx
        t0   = time.time()
        base = self.base_url or "http://localhost:11434"
        async with httpx.AsyncClient(timeout=120.0) as c:
            r = await c.post(f"{base.rstrip('/')}/api/generate",
                json={"model":self.model,"prompt":f"{system}\n\n{prompt}" if system else prompt,"stream":False})
        return AIResponse(r.json().get("response",""), "ollama", self.model, (time.time()-t0)*1000)

    async def _compat(self, prompt: str, system: str) -> AIResponse:
        """OpenAI-compatible: groq, together, mistral, deepseek, perplexity, xai,
           fireworks, azure_openai, cerebras, sambanova, custom."""
        import openai
        t0   = time.time()
        base = self.base_url or SUPPORTED_VENDORS.get(self.provider, {}).get("base_url","")
        kw: dict = {"api_key": self.cfg.api_key}
        if base: kw["base_url"] = base
        c    = openai.AsyncOpenAI(**kw)
        msgs = ([{"role":"system","content":system}] if system else []) + [{"role":"user","content":prompt}]
        r    = await c.chat.completions.create(model=self.model, messages=msgs, max_tokens=1024, temperature=0.1)
        return AIResponse(r.choices[0].message.content or "", self.provider, self.model, (time.time()-t0)*1000)


class AIPoolManager:
    def __init__(self):
        self._providers: List[AIProvider] = []
        self._idx = 0
        self._circuit: dict = {}          # provider → {fails, open_until}
        CIRCUIT_THRESHOLD = 5

    def initialize(self, vendors: List[AIVendorConfig]) -> None:
        self._providers = [AIProvider(v) for v in vendors]
        self._providers.sort(key=lambda p: p.cost_rank)
        log.info("AI Pool initialized",
                 vendors=[v.provider for v in vendors],
                 routing="cost_first")

    @property
    def vendor_count(self) -> int:
        return len(self._providers)

    @property
    def supported_vendors(self) -> list:
        return list(SUPPORTED_VENDORS.keys())

    def _circuit_ok(self, provider: str) -> bool:
        c = self._circuit.get(provider, {})
        if c.get("open_until", 0) > time.time():
            return False
        return True

    def _record_fail(self, provider: str) -> None:
        c = self._circuit.setdefault(provider, {"fails": 0, "open_until": 0})
        c["fails"] += 1
        if c["fails"] >= 5:
            c["open_until"] = time.time() + 60   # 60s cooldown
            log.warning(f"Circuit opened for {provider}")

    def _record_ok(self, provider: str) -> None:
        self._circuit.pop(provider, None)

    async def complete(self, prompt: str, system: str = "",
                       strategy: str = "cost_first") -> AIResponse:
        if not self._providers:
            return AIResponse.err("none", "No AI vendors configured.")

        if strategy == "round_robin":
            start = self._idx % len(self._providers)
            self._idx += 1
            ordered = self._providers[start:] + self._providers[:start]
        elif strategy == "quality_first":
            ordered = sorted(self._providers, key=lambda p: p.cost_rank, reverse=True)
        else:
            ordered = self._providers   # already sorted cheapest-first

        for provider in ordered:
            if not self._circuit_ok(provider.provider):
                continue
            resp = await provider.complete(prompt, system)
            if not resp.error:
                self._record_ok(provider.provider)
                log.debug("AI Pool: served", vendor=resp.vendor,
                          latency_ms=round(resp.latency_ms, 1))
                return resp
            log.warning("AI Pool: provider failed, trying next",
                        vendor=provider.provider, error=resp.error)
            self._record_fail(provider.provider)

        return AIResponse.err("pool", "all_vendors_failed")

    async def analyze_threat(self, content: str, context: str = "") -> dict:
        system = (
            "You are Guardian AI, a cybersecurity threat analysis engine. "
            "Respond ONLY in valid JSON with this exact schema: "
            '{"verdict":"clean|suspicious|malicious","confidence":0.0,'
            '"threat_type":null,"indicators":[],"reasoning":""}'
        )
        prompt = f"Analyze for threats:\n\n{content}"
        if context:
            prompt += f"\n\nContext: {context}"
        resp = await self.complete(prompt, system, strategy="cost_first")
        if resp.error:
            return {"verdict":"unknown","confidence":0.0,"reasoning":resp.error,"indicators":[]}
        try:
            return json.loads(resp.text)
        except json.JSONDecodeError:
            return {"verdict":"unknown","confidence":0.0,"reasoning":resp.text[:500],"indicators":[]}

    async def classify_file(self, file_info: dict) -> dict:
        system = (
            "You are a malware analyst. Classify this file. "
            'Respond ONLY in JSON: {"verdict":"clean|suspicious|malicious","confidence":0.0,'
            '"malware_family":null,"reasoning":""}'
        )
        resp = await self.complete(f"Classify:\n{json.dumps(file_info, indent=2)}", system)
        if resp.error:
            return {"verdict":"unknown","confidence":0.0,"reasoning":resp.error}
        try:
            return json.loads(resp.text)
        except json.JSONDecodeError:
            return {"verdict":"unknown","confidence":0.0,"reasoning":resp.text[:500]}
