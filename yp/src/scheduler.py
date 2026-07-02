# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP AI Provider-Scaling Scheduler
================================================================
The flagship capability. YP holds a pool of the CLIENT's own AI providers
(BYOK) and, for each job, routes to the best one according to the configured
strategy — while continuously scoring every provider on live success rate and
latency so the pool self-optimizes ("scales to the best in the job").

Strategies:
  • quality      — highest rolling score (success-rate × speed), the default.
  • cost         — cheapest configured provider that is currently healthy.
  • weighted     — random pick biased by each provider's configured weight.
  • round_robin  — even spread across healthy providers.

A provider that fails repeatedly is temporarily "cooled down" (circuit
breaker) and skipped until it recovers, so one dead key never stalls the pool.
Everything is BYO: YP never holds an AXTO key or calls an AXTO-run endpoint.
"""
from __future__ import annotations
import asyncio, random, time
from dataclasses import dataclass, field
from typing import Optional

import httpx
import structlog

log = structlog.get_logger("yp.scheduler")

# Per-provider default cost hint (USD per 1K output tokens) used only for the
# "cost" strategy when the client hasn't supplied their own. Rough public
# list pricing; the client can override per provider in yp.yml.
_COST_HINT = {
    "openai": 0.60, "anthropic": 0.80, "google": 0.30, "groq": 0.10,
    "mistral": 0.40, "deepseek": 0.14, "xai": 0.50, "cohere": 0.60,
    "ollama": 0.0, "custom": 0.0,
}

# OpenAI-compatible chat endpoints per provider (client keys, client calls).
_PROVIDER_BASE = {
    "openai":    "https://api.openai.com/v1",
    "groq":      "https://api.groq.com/openai/v1",
    "mistral":   "https://api.mistral.ai/v1",
    "deepseek":  "https://api.deepseek.com/v1",
    "xai":       "https://api.x.ai/v1",
    "together":  "https://api.together.xyz/v1",
}


@dataclass
class ProviderStat:
    name: str
    provider: str
    calls: int = 0
    ok: int = 0
    err: int = 0
    total_latency: float = 0.0
    cooldown_until: float = 0.0
    rr_cursor: int = 0

    @property
    def avg_latency(self) -> float:
        return (self.total_latency / self.ok) if self.ok else 999.0

    @property
    def success_rate(self) -> float:
        return (self.ok / self.calls) if self.calls else 1.0

    @property
    def score(self) -> float:
        # Higher is better: reward success, penalize latency. New providers
        # start optimistic (rate=1, latency small) so they get real traffic.
        base = self.success_rate * 100.0
        speed = 1.0 / (1.0 + self.avg_latency)
        return base * (0.5 + 0.5 * speed)

    def healthy(self) -> bool:
        return time.time() >= self.cooldown_until


class ProviderScheduler:
    def __init__(self, providers: list, strategy: str = "quality"):
        # providers: list of AIProviderConfig-like objects (name, provider,
        # api_key, base_url, default_model, weight, enabled).
        self._providers = [p for p in providers if getattr(p, "enabled", True)]
        self._strategy = strategy
        self._stats = {
            p.name: ProviderStat(name=p.name, provider=p.provider)
            for p in self._providers
        }
        self._rr = 0
        self._client = httpx.AsyncClient(timeout=120.0, verify=True)

    def _by_name(self, name: str):
        for p in self._providers:
            if p.name == name:
                return p
        return None

    def _healthy(self) -> list:
        return [p for p in self._providers if self._stats[p.name].healthy()]

    def _pick(self) -> Optional[object]:
        pool = self._healthy()
        if not pool:
            # everyone cooling down — take the one closest to recovery
            if not self._providers:
                return None
            return min(self._providers, key=lambda p: self._stats[p.name].cooldown_until)

        if self._strategy == "round_robin":
            self._rr = (self._rr + 1) % len(pool)
            return pool[self._rr]

        if self._strategy == "cost":
            def cost_of(p):
                return getattr(p, "max_usd_per_day", 0) or _COST_HINT.get(p.provider, 0.5)
            return min(pool, key=cost_of)

        if self._strategy == "weighted":
            weights = [max(0.01, getattr(p, "weight", 1.0)) for p in pool]
            return random.choices(pool, weights=weights, k=1)[0]

        # "quality" (default): best live score
        return max(pool, key=lambda p: self._stats[p.name].score)

    def _base_url(self, p) -> str:
        if getattr(p, "base_url", None):
            return p.base_url.rstrip("/")
        return _PROVIDER_BASE.get(p.provider, "https://api.openai.com/v1")

    async def _call_one(self, p, messages: list, model: Optional[str], **kw) -> dict:
        """One OpenAI-compatible chat completion against a single provider."""
        st = self._stats[p.name]
        url = f"{self._base_url(p)}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if getattr(p, "api_key", None):
            headers["Authorization"] = f"Bearer {p.api_key}"
        body = {
            "model": model or getattr(p, "default_model", None) or "gpt-4o-mini",
            "messages": messages,
        }
        for k in ("temperature", "max_tokens", "top_p"):
            if k in kw and kw[k] is not None:
                body[k] = kw[k]

        t0 = time.time()
        st.calls += 1
        try:
            r = await self._client.post(url, json=body, headers=headers)
            r.raise_for_status()
            dt = time.time() - t0
            st.ok += 1
            st.total_latency += dt
            data = r.json()
            content = ""
            try:
                content = data["choices"][0]["message"]["content"]
            except Exception:
                content = ""
            return {
                "ok": True, "provider": p.name, "model": body["model"],
                "latency_s": round(dt, 3), "content": content, "raw": data,
            }
        except Exception as e:
            st.err += 1
            # Circuit breaker: cool a failing provider for 60s so the pool
            # routes around it instead of retrying a dead key every request.
            st.cooldown_until = time.time() + 60
            log.warning("provider_failed", provider=p.name, error=str(e))
            return {"ok": False, "provider": p.name, "error": str(e)}

    async def complete(self, messages: list, model: Optional[str] = None,
                       max_attempts: int = 3, **kw) -> dict:
        """
        Route one job through the pool, failing over to the next-best provider
        up to max_attempts times. Returns the first successful result, or the
        last error if all healthy providers fail.
        """
        if not self._providers:
            return {"ok": False, "error": "no_providers_configured",
                    "hint": "Add BYOK ai_providers in yp.yml"}
        tried = set()
        last = {"ok": False, "error": "no_attempt"}
        for _ in range(min(max_attempts, len(self._providers))):
            p = self._pick()
            if p is None or p.name in tried:
                # find any untried provider
                remaining = [q for q in self._providers if q.name not in tried]
                if not remaining:
                    break
                p = remaining[0]
            tried.add(p.name)
            last = await self._call_one(p, messages, model, **kw)
            if last.get("ok"):
                return last
        return last

    def stats(self) -> list:
        out = []
        for p in self._providers:
            s = self._stats[p.name]
            out.append({
                "name": p.name, "provider": p.provider,
                "calls": s.calls, "ok": s.ok, "err": s.err,
                "success_rate": round(s.success_rate, 3),
                "avg_latency_s": round(s.avg_latency, 3) if s.ok else None,
                "score": round(s.score, 1),
                "healthy": s.healthy(),
            })
        # best first
        return sorted(out, key=lambda x: x["score"], reverse=True)

    async def close(self):
        await self._client.aclose()
