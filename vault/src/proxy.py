# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Vault — AIProxyEngine (v1.1) — See full docstring in api.py"""
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
    def __init__(self, cfg):
        self.cfg=cfg; self.provider=cfg.provider.lower(); self.api_key=cfg.api_key or ""
        self.base_url=cfg.base_url or _URLS.get(self.provider,""); self.default_model=cfg.default_model or ""
        self._client=None; self.request_count=0; self.error_count=0; self.last_latency_ms=0

    def client(self):
        if not self._client: self._client=httpx.AsyncClient(timeout=120.0,follow_redirects=True)
        return self._client

    def headers(self):
        fn=_AUTH.get(self.provider); h=fn(self.api_key) if fn else {"Authorization":f"Bearer {self.api_key}"}
        h["Content-Type"]="application/json"; return h

    async def post(self, path, body):
        t0=time.monotonic(); url=f"{self.base_url}{path}"
        if self.provider=="gemini": url+=f"?key={self.api_key}"
        try:
            r=await self.client().post(url,json=body,headers=self.headers()); r.raise_for_status()
            self.request_count+=1; self.last_latency_ms=int((time.monotonic()-t0)*1000); return r.json()
        except httpx.HTTPStatusError as e:
            self.error_count+=1
            try: d=e.response.json()
            except: d=e.response.text[:500]
            raise RuntimeError(f"{self.provider} {e.response.status_code}: {d}")
        except Exception as e: self.error_count+=1; raise RuntimeError(f"{self.provider}: {e}")

    async def stream(self, path, body) -> AsyncIterator[str]:
        url=f"{self.base_url}{path}"
        if self.provider=="gemini": url+=f"?key={self.api_key}&alt=sse"
        try:
            async with self.client().stream("POST",url,json=body,headers=self.headers(),timeout=180.0) as r:
                r.raise_for_status(); self.request_count+=1
                async for line in r.aiter_lines():
                    if line: yield line
        except httpx.HTTPStatusError as e:
            self.error_count+=1; raise RuntimeError(f"{self.provider} stream {e.response.status_code}")
        except Exception as e: self.error_count+=1; raise RuntimeError(f"{self.provider} stream: {e}")

    async def close(self):
        if self._client: await self._client.aclose()

class AIProxyEngine:
    def __init__(self, cfg): self.cfg=cfg; self._vendors: List[ProviderClient]=[]

    @property
    def provider_count(self): return len(self._vendors)

    async def startup(self):
        for v in self.cfg.ai_vendors:
            self._vendors.append(ProviderClient(v))
            log.info("vault_provider", provider=v.provider, model=v.default_model or "default")
        if not self._vendors: log.warning("vault_no_providers")

    def list_providers(self):
        return [{"provider":v.provider,"model":v.default_model,"base_url":v.base_url if v.provider=="ollama" else None,
                 "request_count":v.request_count,"error_count":v.error_count,"last_latency_ms":v.last_latency_ms,"has_key":bool(v.api_key)}
                for v in self._vendors]

    def _pick(self, policy=None):
        if policy and policy.ai_provider:
            for v in self._vendors:
                if v.provider==policy.ai_provider: return v
        if not self._vendors: raise RuntimeError("No AI providers configured in vault.yml")
        return self._vendors[0]

    def _model(self, body, vendor, policy=None):
        if policy and policy.ai_model: body["model"]=policy.ai_model
        elif not body.get("model") and vendor.default_model: body["model"]=vendor.default_model
        return body

    async def forward(self, body, endpoint_type, policy=None):
        v=self._pick(policy); body=self._model(dict(body),v,policy)
        if endpoint_type=="anthropic_messages": r=await self._anthropic(v,body)
        elif v.provider=="gemini":              r=await self._gemini(v,body)
        elif v.provider=="ollama":              r=await self._ollama(v,body)
        else:                                   r=await v.post("/v1/chat/completions",body)
        return {"body":r,"provider":v.provider}

    async def forward_stream(self, body, endpoint_type, policy=None) -> AsyncIterator[str]:
        v=self._pick(policy); body=self._model(dict(body),v,policy); body["stream"]=True
        if endpoint_type=="anthropic_messages":
            async for line in v.stream("/v1/messages",body): yield line
        elif v.provider=="ollama":
            async for chunk in v.stream("/api/chat",{"model":body.get("model","llama3"),"messages":body.get("messages",[]),"stream":True}):
                try:
                    obj=json.loads(chunk); delta=obj.get("message",{}).get("content",""); done=obj.get("done",False)
                    if delta: yield f'data: {json.dumps({"choices":[{"delta":{"content":delta},"finish_reason":None}]})}'
                    if done:  yield "data: [DONE]"
                except: pass
        elif v.provider=="gemini":
            r=await self._gemini(v,body); yield f'data: {json.dumps(r)}'; yield "data: [DONE]"
        else:
            async for line in v.stream("/v1/chat/completions",body): yield line

    async def _anthropic(self, v, body):
        if not body.get("max_tokens"): body["max_tokens"]=4096
        r=await v.post("/v1/messages",body)
        content="".join(b.get("text","") for b in r.get("content",[]) if b.get("type")=="text")
        return {"id":r.get("id",""),"object":"chat.completion","model":r.get("model",""),
                "choices":[{"index":0,"message":{"role":"assistant","content":content},"finish_reason":r.get("stop_reason","stop")}],"usage":r.get("usage",{})}

    async def _gemini(self, v, body):
        model=body.get("model","gemini-2.0-flash")
        contents=[{"role":"user" if m["role"]=="user" else "model","parts":[{"text":m.get("content","")}]} for m in body.get("messages",[])]
        r=await v.post(f"/v1beta/models/{model}:generateContent",{"contents":contents,"generationConfig":{"maxOutputTokens":body.get("max_tokens",4096),"temperature":body.get("temperature",0.7)}})
        text="".join(p.get("text","") for c in r.get("candidates",[]) for p in c.get("content",{}).get("parts",[]))
        return {"id":f"gemini-{id(r)}","object":"chat.completion","model":model,"choices":[{"index":0,"message":{"role":"assistant","content":text},"finish_reason":"stop"}],"usage":r.get("usageMetadata",{})}

    async def _ollama(self, v, body):
        r=await v.post("/api/chat",{"model":body.get("model","llama3"),"messages":body.get("messages",[]),"stream":False})
        return {"id":f"ollama-{id(r)}","object":"chat.completion","model":r.get("model",""),"choices":[{"index":0,"message":r.get("message",{}),"finish_reason":"stop"}],"usage":{"prompt_tokens":r.get("prompt_eval_count",0),"completion_tokens":r.get("eval_count",0)}}

    async def passthrough(self, req, path):
        v=self._pick()
        try: body=await req.json()
        except: body={}
        return await v.post(path,body)

    async def test_provider(self, body):
        pname=body.get("provider","openai"); v=next((x for x in self._vendors if x.provider==pname),None)
        if not v: return {"ok":False,"error":f"Provider '{pname}' not in vault.yml"}
        try:
            await v.post("/v1/chat/completions",{"model":v.default_model or "gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":5})
            return {"ok":True,"provider":pname,"latency_ms":v.last_latency_ms}
        except Exception as e: return {"ok":False,"error":str(e)}

    async def shutdown(self):
        for v in self._vendors: await v.close()
