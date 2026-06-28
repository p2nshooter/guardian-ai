# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — AIProxyEngine: BYOK multi-provider proxy with streaming."""
from __future__ import annotations
import json, time
from typing import Any, AsyncIterator, Dict, List, Optional
import httpx, structlog
from src.config.settings import get_config, AIVendorConfig

log = structlog.get_logger()

_URLS = {
    "openai":"https://api.openai.com","anthropic":"https://api.anthropic.com",
    "gemini":"https://generativelanguage.googleapis.com","groq":"https://api.groq.com/openai",
    "mistral":"https://api.mistral.ai","deepseek":"https://api.deepseek.com",
    "together":"https://api.together.xyz","perplexity":"https://api.perplexity.ai",
    "azure":"","ollama":"http://localhost:11434",
}
_AUTH = {
    "anthropic": lambda k: {"x-api-key":k,"anthropic-version":"2023-06-01"},
    "gemini":    lambda k: {},
    "azure":     lambda k: {"api-key":k},
}


class ProviderClient:
    def __init__(self, cfg: AIVendorConfig):
        self.provider      = cfg.provider.lower()
        self.api_key       = cfg.api_key or ""
        self.base_url      = cfg.base_url or _URLS.get(self.provider,"")
        self.default_model = cfg.default_model or ""
        self._client: Optional[httpx.AsyncClient] = None
        self.request_count = 0; self.error_count = 0; self.last_latency_ms = 0

    def client(self) -> httpx.AsyncClient:
        if not self._client:
            self._client = httpx.AsyncClient(timeout=120.0, follow_redirects=True)
        return self._client

    def headers(self) -> Dict:
        fn = _AUTH.get(self.provider)
        h  = fn(self.api_key) if fn else {"Authorization": f"Bearer {self.api_key}"}
        h["Content-Type"] = "application/json"
        return h

    async def post(self, path: str, body: Dict) -> Dict:
        t0  = time.monotonic()
        url = f"{self.base_url}{path}"
        if self.provider == "gemini": url += f"?key={self.api_key}"
        try:
            r = await self.client().post(url, json=body, headers=self.headers())
            r.raise_for_status()
            self.request_count += 1
            self.last_latency_ms = int((time.monotonic()-t0)*1000)
            return r.json()
        except httpx.HTTPStatusError as e:
            self.error_count += 1
            try:    d = e.response.json()
            except: d = e.response.text[:400]
            raise RuntimeError(f"{self.provider} {e.response.status_code}: {d}")
        except Exception as e:
            self.error_count += 1
            raise RuntimeError(f"{self.provider}: {e}")

    async def stream(self, path: str, body: Dict) -> AsyncIterator[str]:
        url = f"{self.base_url}{path}"
        if self.provider == "gemini": url += f"?key={self.api_key}&alt=sse"
        try:
            async with self.client().stream("POST", url, json=body, headers=self.headers(), timeout=180.0) as r:
                r.raise_for_status()
                self.request_count += 1
                async for line in r.aiter_lines():
                    if line: yield line
        except Exception as e:
            self.error_count += 1
            raise RuntimeError(f"{self.provider} stream: {e}")

    async def close(self):
        if self._client: await self._client.aclose()


class AIProxyEngine:
    def __init__(self, cfg):
        self.cfg = cfg
        self._vendors: List[ProviderClient] = []

    @property
    def provider_count(self) -> int:
        return len(self._vendors)

    async def startup(self):
        for v in self.cfg.ai_vendors:
            self._vendors.append(ProviderClient(v))
            log.info("edge_provider", provider=v.provider, model=v.default_model)
        if not self._vendors:
            log.warning("edge_no_providers")

    def list_providers(self) -> List[Dict]:
        return [{"provider":v.provider,"model":v.default_model,"request_count":v.request_count,
                 "error_count":v.error_count,"last_latency_ms":v.last_latency_ms,"has_key":bool(v.api_key)}
                for v in self._vendors]

    def _pick(self, plan=None) -> ProviderClient:
        if not self._vendors:
            raise RuntimeError("No AI providers configured in edge.yml ai_pool.vendors")
        return self._vendors[0]

    def _set_model(self, body: Dict, vendor: ProviderClient) -> Dict:
        if not body.get("model") and vendor.default_model:
            body["model"] = vendor.default_model
        return body

    async def forward(self, body: Dict, path: str, plan=None) -> Dict:
        v    = self._pick(plan)
        body = self._set_model(dict(body), v)
        if "/messages" in path and v.provider == "anthropic":
            if not body.get("max_tokens"): body["max_tokens"] = 4096
            r = await v.post("/v1/messages", body)
            return {"body": _anthropic_to_openai(r)}
        elif v.provider == "ollama":
            r = await v.post("/api/chat", {"model":body.get("model","llama3"),"messages":body.get("messages",[]),"stream":False})
            return {"body": _ollama_to_openai(r)}
        else:
            return {"body": await v.post("/v1/chat/completions", body)}

    async def forward_stream(self, body: Dict, path: str, plan=None) -> AsyncIterator[str]:
        v    = self._pick(plan)
        body = self._set_model(dict(body), v)
        body["stream"] = True
        if v.provider == "ollama":
            async for chunk in v.stream("/api/chat", {"model":body.get("model","llama3"),"messages":body.get("messages",[]),"stream":True}):
                try:
                    obj = json.loads(chunk); delta = obj.get("message",{}).get("content","")
                    if delta: yield f'data: {json.dumps({"choices":[{"delta":{"content":delta},"finish_reason":None}]})}'
                    if obj.get("done"): yield "data: [DONE]"
                except: pass
        else:
            async for line in v.stream("/v1/chat/completions", body):
                yield line

    async def test_provider(self, body: Dict) -> Dict:
        pname = body.get("provider","openai")
        v = next((x for x in self._vendors if x.provider==pname), None)
        if not v: return {"ok":False,"error":f"Provider '{pname}' not in edge.yml"}
        try:
            await v.post("/v1/chat/completions",{"model":v.default_model or "gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":5})
            return {"ok":True,"provider":pname,"latency_ms":v.last_latency_ms}
        except Exception as e: return {"ok":False,"error":str(e)}

    async def shutdown(self):
        for v in self._vendors: await v.close()


def _anthropic_to_openai(r: Dict) -> Dict:
    text = "".join(b.get("text","") for b in r.get("content",[]) if b.get("type")=="text")
    return {"id":r.get("id",""),"object":"chat.completion","model":r.get("model",""),
            "choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":r.get("stop_reason","stop")}],"usage":r.get("usage",{})}

def _ollama_to_openai(r: Dict) -> Dict:
    return {"id":f"ollama-{id(r)}","object":"chat.completion","model":r.get("model",""),
            "choices":[{"index":0,"message":r.get("message",{}),"finish_reason":"stop"}],
            "usage":{"prompt_tokens":r.get("prompt_eval_count",0),"completion_tokens":r.get("eval_count",0)}}
