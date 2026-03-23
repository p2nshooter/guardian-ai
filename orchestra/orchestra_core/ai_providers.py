"""
AXTO Orchestra — AI Provider Adapters v3.0
Unified interface for all AI providers.

Supports 15 providers:
  Cloud  : OpenAI, Anthropic, Google Gemini, Groq, Together AI,
           Mistral AI, Cohere, DeepSeek, Perplexity, xAI (Grok),
           Fireworks AI, Azure OpenAI, Cerebras, Sambanova
  Local  : Ollama (OpenAI-compatible endpoint)
  Custom : Any OpenAI-compatible endpoint (vLLM, LM Studio, LocalAI)

Features added v3.0:
  - Tool/function calling (OpenAI, Anthropic, Gemini, Groq, Mistral, Together, Ollama)
  - Vision/multimodal (OpenAI, Anthropic, Gemini, Together, xAI, Sambanova)
  - JSON mode / structured output
  - Circuit breaker (auto-opens after 5 failures, resets after 2 min)
  - Latency-aware smart routing
  - Per-provider success/error stats
  - Azure OpenAI support (deployment-based routing)
"""
import json
import os
import time
import logging
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger("orchestra.providers")

# ── Provider Registry ─────────────────────────────────────────────────────────

PROVIDER_CONFIGS: Dict[str, Dict] = {
    "openai": {
        "name": "OpenAI", "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini", "o3-mini", "gpt-4.1", "gpt-4.1-mini"],
        "auth_type": "bearer", "icon": "🤖", "cost_tier": "medium",
        "description": "GPT-4o, o1/o3 reasoning models.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming", "embeddings"],
    },
    "anthropic": {
        "name": "Anthropic", "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
        "auth_type": "anthropic", "icon": "🧠", "cost_tier": "medium",
        "description": "Claude — precise, long-context, safe reasoning.",
        "supports": ["chat", "tools", "vision", "streaming"],
    },
    "gemini": {
        "name": "Google Gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-pro-preview-03-25"],
        "auth_type": "query_key", "icon": "✨", "cost_tier": "low",
        "description": "Google multimodal models with massive context.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "groq": {
        "name": "Groq", "base_url": "https://api.groq.com/openai/v1",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b", "qwen-qwq-32b"],
        "auth_type": "bearer", "icon": "⚡", "cost_tier": "very_low",
        "description": "Ultra-fast LPU inference — lowest latency available.",
        "supports": ["chat", "tools", "json_mode", "streaming"],
    },
    "together": {
        "name": "Together AI", "base_url": "https://api.together.xyz/v1",
        "models": ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Llama-3.1-8B-Instruct-Turbo", "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1", "Qwen/Qwen2.5-72B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1"],
        "auth_type": "bearer", "icon": "🔗", "cost_tier": "low",
        "description": "200+ open-source models — vision support included.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "mistral": {
        "name": "Mistral AI", "base_url": "https://api.mistral.ai/v1",
        "models": ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "open-mixtral-8x22b", "pixtral-large-latest", "mistral-medium-latest"],
        "auth_type": "bearer", "icon": "🌬️", "cost_tier": "low",
        "description": "Sovereign EU AI — coding & multilingual specialist.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "cohere": {
        "name": "Cohere", "base_url": "https://api.cohere.com/v2",
        "models": ["command-r-plus-08-2024", "command-r-08-2024", "command-a-03-2025", "command-light"],
        "auth_type": "bearer", "icon": "🧬", "cost_tier": "medium",
        "description": "Enterprise RAG & retrieval-augmented generation.",
        "supports": ["chat", "tools", "streaming"],
    },
    "deepseek": {
        "name": "DeepSeek", "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "auth_type": "bearer", "icon": "🔍", "cost_tier": "very_low",
        "description": "High-capability reasoning at breakthrough cost.",
        "supports": ["chat", "tools", "json_mode", "streaming"],
    },
    "perplexity": {
        "name": "Perplexity AI", "base_url": "https://api.perplexity.ai",
        "models": ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-reasoning", "r1-1776"],
        "auth_type": "bearer", "icon": "🔭", "cost_tier": "low",
        "description": "Real-time web-grounded inference.",
        "supports": ["chat", "streaming"],
    },
    "xai": {
        "name": "xAI (Grok)", "base_url": "https://api.x.ai/v1",
        "models": ["grok-3", "grok-3-fast", "grok-3-mini", "grok-3-mini-fast", "grok-2-vision-1212"],
        "auth_type": "bearer", "icon": "🚀", "cost_tier": "medium",
        "description": "Grok — real-time data, long context, vision.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "fireworks": {
        "name": "Fireworks AI", "base_url": "https://api.fireworks.ai/inference/v1",
        "models": ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/llama-v3p1-405b-instruct", "accounts/fireworks/models/mixtral-8x22b-instruct", "accounts/fireworks/models/qwen2p5-72b-instruct", "accounts/fireworks/models/deepseek-r1"],
        "auth_type": "bearer", "icon": "🔥", "cost_tier": "low",
        "description": "Fast serverless inference — 150+ open-source models.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "azure_openai": {
        "name": "Azure OpenAI", "base_url": "",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"],
        "auth_type": "azure", "icon": "☁️", "cost_tier": "medium",
        "description": "OpenAI via Azure — enterprise compliance & VNet.",
        "supports": ["chat", "tools", "vision", "json_mode", "streaming"],
    },
    "cerebras": {
        "name": "Cerebras", "base_url": "https://api.cerebras.ai/v1",
        "models": ["llama3.1-8b", "llama3.1-70b", "llama-3.3-70b", "deepseek-r1-distill-llama-70b", "qwen-3-32b"],
        "auth_type": "bearer", "icon": "🧪", "cost_tier": "very_low",
        "description": "CS-3 wafer-scale chips — 2,000+ tokens/sec throughput.",
        "supports": ["chat", "tools", "json_mode", "streaming"],
    },
    "sambanova": {
        "name": "SambaNova", "base_url": "https://api.sambanova.ai/v1",
        "models": ["Meta-Llama-3.3-70B-Instruct", "Meta-Llama-3.1-405B-Instruct", "Meta-Llama-3.2-11B-Vision-Instruct", "DeepSeek-R1-Distill-Llama-70B", "QwQ-32B"],
        "auth_type": "bearer", "icon": "⚙️", "cost_tier": "low",
        "description": "RDU chips — fast 405B inference & vision models.",
        "supports": ["chat", "vision", "streaming"],
    },
    "ollama": {
        "name": "Ollama (Local)", "base_url": "http://localhost:11434",
        "models": [],
        "auth_type": "none", "icon": "🏠", "cost_tier": "free",
        "description": "On-premise inference — zero data egress, zero API cost.",
        "supports": ["chat", "tools", "vision", "streaming"],
    },
    "custom": {
        "name": "Custom (OpenAI-compatible)", "base_url": "",
        "models": [],
        "auth_type": "bearer", "icon": "🔧", "cost_tier": "unknown",
        "description": "Any OpenAI-compatible endpoint (vLLM, LM Studio, LocalAI, llama.cpp).",
        "supports": ["chat", "streaming"],
    },
}

COST_TIER_ORDER = ["free", "very_low", "low", "medium", "high", "unknown"]

LATENCY_BASELINE: Dict[str, int] = {
    "groq": 200, "cerebras": 250, "fireworks": 300, "deepseek": 400,
    "together": 400, "sambanova": 400, "ollama": 500, "mistral": 600,
    "gemini": 700, "openai": 800, "anthropic": 900, "cohere": 900,
    "perplexity": 900, "xai": 800, "azure_openai": 800, "custom": 1000,
}

_circuit: Dict[str, Dict] = {}
_provider_stats: Dict[str, Dict] = {}
CIRCUIT_FAIL_THRESHOLD = 5
CIRCUIT_RESET_SEC = 120


# ── Circuit Breaker ───────────────────────────────────────────────────────────

def _circuit_ok(pid: str) -> bool:
    s = _circuit.get(pid, {})
    if not s or not s.get("open"):
        return True
    if time.time() - s.get("opened_at", 0) > CIRCUIT_RESET_SEC:
        _circuit[pid] = {"failures": 0, "open": False}
        return True
    return False

def _circuit_fail(pid: str):
    if pid not in _circuit:
        _circuit[pid] = {"failures": 0, "open": False}
    _circuit[pid]["failures"] = _circuit[pid].get("failures", 0) + 1
    if _circuit[pid]["failures"] >= CIRCUIT_FAIL_THRESHOLD:
        _circuit[pid].update({"open": True, "opened_at": time.time()})
        logger.warning(f"Circuit OPEN: {pid}")

def _circuit_ok_record(pid: str):
    _circuit[pid] = {"failures": 0, "open": False}

def _update_stats(pid: str, online: bool, latency_ms=None, error: bool = False):
    if pid not in _provider_stats:
        _provider_stats[pid] = {"error_count": 0, "success_count": 0}
    s = _provider_stats[pid]
    s["online"] = online
    s["last_checked"] = datetime.now(timezone.utc).isoformat()
    if latency_ms is not None:
        prev = s.get("latency_ms", latency_ms)
        s["latency_ms"] = round(prev * 0.7 + latency_ms * 0.3, 1)
    if error:
        s["error_count"] = s.get("error_count", 0) + 1
        _circuit_fail(pid)
    else:
        s["success_count"] = s.get("success_count", 0) + 1
        _circuit_ok_record(pid)

def get_provider_info(pid: str) -> dict:
    base = PROVIDER_CONFIGS.get(pid, PROVIDER_CONFIGS["custom"]).copy()
    base.update({
        **_provider_stats.get(pid, {}),
        "circuit_open": _circuit.get(pid, {}).get("open", False),
    })
    return base

def list_all_providers() -> list:
    return [get_provider_info(pid) for pid in PROVIDER_CONFIGS]


# ── Transport ─────────────────────────────────────────────────────────────────

def _post(url: str, data: bytes, headers: dict, timeout: int) -> dict:
    t0  = time.time()
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return {"ok": True, "data": json.loads(r.read()), "latency_ms": (time.time()-t0)*1000}
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        return {"ok": False, "error": f"HTTP {e.code}: {body[:300]}", "status_code": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _openai_compat(base_url: str, api_key: str, payload: dict, timeout: int, extra: dict = None) -> dict:
    h = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return _post(f"{base_url.rstrip('/')}/chat/completions", json.dumps(payload).encode(), h, timeout)

def _anthropic_call(api_key: str, payload: dict, timeout: int) -> dict:
    h = {"x-api-key": api_key, "anthropic-version": "2023-06-01",
         "anthropic-beta": "tools-2024-04-04", "Content-Type": "application/json"}
    return _post("https://api.anthropic.com/v1/messages", json.dumps(payload).encode(), h, timeout)

def _gemini_call(api_key: str, model: str, payload: dict, timeout: int) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    return _post(url, json.dumps(payload).encode(), {"Content-Type": "application/json"}, timeout)

def _cohere_call(api_key: str, payload: dict, timeout: int) -> dict:
    h = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    return _post("https://api.cohere.com/v2/chat", json.dumps(payload).encode(), h, timeout)

def _ollama_call(base_url: str, payload: dict, timeout: int) -> dict:
    return _post(f"{base_url.rstrip('/')}/api/chat", json.dumps(payload).encode(),
                 {"Content-Type": "application/json"}, timeout)

def _azure_call(endpoint: str, api_key: str, deployment: str, payload: dict, timeout: int) -> dict:
    url = f"{endpoint.rstrip('/')}/openai/deployments/{deployment}/chat/completions?api-version=2024-12-01-preview"
    h   = {"api-key": api_key, "Content-Type": "application/json"}
    return _post(url, json.dumps(payload).encode(), h, timeout)


# ── Message Converters ────────────────────────────────────────────────────────

def _to_gemini_messages(msgs: list) -> list:
    result = []
    for m in msgs:
        role    = "user" if m["role"] in ("user", "system") else "model"
        content = m.get("content", "")
        if isinstance(content, list):
            parts = []
            for p in content:
                if p.get("type") == "text":
                    parts.append({"text": p["text"]})
                elif p.get("type") == "image_url":
                    url = p["image_url"].get("url", "")
                    if url.startswith("data:"):
                        mime, b64 = url.split(",", 1)
                        parts.append({"inlineData": {"mimeType": mime.split(":")[1].split(";")[0], "data": b64}})
                    else:
                        parts.append({"fileData": {"fileUri": url}})
            result.append({"role": role, "parts": parts})
        else:
            result.append({"role": role, "parts": [{"text": str(content)}]})
    return result

def _anthropic_tools(tools: list) -> list:
    return [{"name": t["function"]["name"], "description": t["function"].get("description",""),
             "input_schema": t["function"].get("parameters", {"type":"object","properties":{}})}
            for t in tools if t.get("type") == "function"]

def _extract_tools(data: dict, pid: str) -> Optional[list]:
    if pid in ("openai","groq","together","mistral","deepseek","xai","fireworks",
               "azure_openai","cerebras","custom"):
        tc = data.get("choices",[{}])[0].get("message",{}).get("tool_calls")
        return tc
    elif pid == "anthropic":
        calls = [c for c in data.get("content",[]) if c.get("type")=="tool_use"]
        return [{"id":c["id"],"type":"function","function":{"name":c["name"],"arguments":json.dumps(c["input"])}} for c in calls] or None
    elif pid == "gemini":
        parts = data.get("candidates",[{}])[0].get("content",{}).get("parts",[])
        calls = [p for p in parts if "functionCall" in p]
        return [{"id":f"call_{i}","type":"function","function":{"name":c["functionCall"]["name"],"arguments":json.dumps(c["functionCall"].get("args",{}))}} for i,c in enumerate(calls)] or None
    return None

def get_ollama_models(base_url: str = "http://localhost:11434") -> list:
    try:
        with urllib.request.urlopen(f"{base_url.rstrip('/')}/api/tags", timeout=5) as r:
            return [m["name"] for m in json.loads(r.read()).get("models",[])]
    except Exception:
        return []


# ── Dispatch ──────────────────────────────────────────────────────────────────

def dispatch(
    provider_id:  str,
    api_key:      str,
    model:        str,
    messages:     list,
    max_tokens:   int            = 2048,
    temperature:  float          = 0.7,
    base_url:     str            = "",
    timeout:      int            = 120,
    tools:        Optional[list] = None,
    tool_choice:  Optional[str]  = None,
    json_mode:    bool           = False,
    system:       Optional[str]  = None,
) -> dict:
    if not _circuit_ok(provider_id):
        return {"ok": False, "error": f"Circuit open for {provider_id}", "provider": provider_id}

    try:
        if system and not any(m.get("role")=="system" for m in messages):
            messages = [{"role":"system","content":system}] + messages

        # ── Anthropic ─────────────────────────────────────────────────────────
        if provider_id == "anthropic":
            sys_msg   = next((m["content"] for m in messages if m["role"]=="system"), None)
            user_msgs = [m for m in messages if m["role"]!="system"]
            p: Dict[str,Any] = {"model":model, "max_tokens":max_tokens, "messages":user_msgs}
            if sys_msg:
                p["system"] = sys_msg
            if tools:
                p["tools"] = _anthropic_tools(tools)
                p["tool_choice"] = {"type":"auto"}
            if json_mode:
                p["system"] = (p.get("system","") + "\nRespond with valid JSON only.")
            r = _anthropic_call(api_key, p, timeout)
            if r["ok"]:
                d = r["data"]
                content = " ".join(c.get("text","") for c in d.get("content",[]) if c.get("type")=="text")
                u = d.get("usage",{})
                return {"ok":True,"content":content,"input_tokens":u.get("input_tokens",0),
                        "output_tokens":u.get("output_tokens",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id,
                        "tool_calls":_extract_tools(d, provider_id)}

        # ── Gemini ────────────────────────────────────────────────────────────
        elif provider_id == "gemini":
            sys_parts = [m["content"] for m in messages if m["role"]=="system"]
            p = {"contents": _to_gemini_messages([m for m in messages if m["role"]!="system"]),
                 "generationConfig": {"maxOutputTokens":max_tokens,"temperature":temperature}}
            if sys_parts:
                p["systemInstruction"] = {"parts":[{"text":" ".join(sys_parts)}]}
            if json_mode:
                p["generationConfig"]["responseMimeType"] = "application/json"
            if tools:
                fn_decls = [{"name":t["function"]["name"],"description":t["function"].get("description",""),
                             "parameters":t["function"].get("parameters",{})} for t in tools if t.get("type")=="function"]
                p["tools"] = [{"functionDeclarations": fn_decls}]
            r = _gemini_call(api_key, model, p, timeout)
            if r["ok"]:
                d = r["data"]
                candidates = d.get("candidates",[{}])
                parts = candidates[0].get("content",{}).get("parts",[]) if candidates else []
                content = "".join(pt.get("text","") for pt in parts if "text" in pt)
                meta = d.get("usageMetadata",{})
                return {"ok":True,"content":content,"input_tokens":meta.get("promptTokenCount",0),
                        "output_tokens":meta.get("candidatesTokenCount",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id,
                        "tool_calls":_extract_tools(d, provider_id)}

        # ── Ollama ────────────────────────────────────────────────────────────
        elif provider_id == "ollama":
            url = base_url or api_key or "http://localhost:11434"
            p = {"model":model,"messages":messages,"stream":False,
                 "options":{"temperature":temperature,"num_predict":max_tokens}}
            if tools:
                p["tools"] = tools
            if json_mode:
                p["format"] = "json"
            r = _ollama_call(url, p, timeout)
            if r["ok"]:
                d   = r["data"]
                msg = d.get("message",{})
                return {"ok":True,"content":msg.get("content",""),
                        "input_tokens":d.get("prompt_eval_count",0),
                        "output_tokens":d.get("eval_count",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id,
                        "tool_calls":msg.get("tool_calls")}

        # ── Cohere ────────────────────────────────────────────────────────────
        elif provider_id == "cohere":
            sys_parts = [m["content"] for m in messages if m["role"]=="system"]
            msgs2 = [{"role":"user" if m["role"]=="user" else "assistant","content":m["content"]}
                     for m in messages if m["role"]!="system"]
            p = {"model":model,"messages":msgs2}
            if sys_parts:
                p["preamble"] = " ".join(sys_parts)
            r = _cohere_call(api_key, p, timeout)
            if r["ok"]:
                d = r["data"]
                content = d.get("message",{}).get("content",[{}])[0].get("text","")
                u = d.get("usage",{}).get("billed_units",{})
                return {"ok":True,"content":content,"input_tokens":u.get("input_tokens",0),
                        "output_tokens":u.get("output_tokens",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id}

        # ── Azure OpenAI ──────────────────────────────────────────────────────
        elif provider_id == "azure_openai":
            endpoint = base_url or os.environ.get("AZURE_OPENAI_ENDPOINT","")
            p = {"messages":messages,"max_tokens":max_tokens,"temperature":temperature}
            if tools:
                p["tools"] = tools
                p["tool_choice"] = tool_choice or "auto"
            if json_mode:
                p["response_format"] = {"type":"json_object"}
            r = _azure_call(endpoint, api_key, model, p, timeout)
            if r["ok"]:
                d = r["data"]
                content = d.get("choices",[{}])[0].get("message",{}).get("content","") or ""
                u = d.get("usage",{})
                return {"ok":True,"content":content,"input_tokens":u.get("prompt_tokens",0),
                        "output_tokens":u.get("completion_tokens",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id,
                        "tool_calls":_extract_tools(d,"openai")}

        # ── All OpenAI-compatible providers ──────────────────────────────────
        else:
            eff_base = base_url or PROVIDER_CONFIGS.get(provider_id,{}).get("base_url","")
            p = {"model":model,"messages":messages,"max_tokens":max_tokens,"temperature":temperature}
            if tools and provider_id not in ("perplexity","sambanova"):
                p["tools"] = tools
                p["tool_choice"] = tool_choice or "auto"
            if json_mode and provider_id not in ("perplexity",):
                p["response_format"] = {"type":"json_object"}
            r = _openai_compat(eff_base, api_key, p, timeout)
            if r["ok"]:
                d = r["data"]
                content = d.get("choices",[{}])[0].get("message",{}).get("content","") or ""
                u = d.get("usage",{})
                return {"ok":True,"content":content,"input_tokens":u.get("prompt_tokens",0),
                        "output_tokens":u.get("completion_tokens",0),"model_used":model,
                        "latency_ms":r["latency_ms"],"provider":provider_id,
                        "tool_calls":_extract_tools(d, provider_id)}

        err = r.get("error","unknown") if "r" in dir() else "dispatch failed"
        _update_stats(provider_id, False, error=True)
        return {"ok":False,"error":err,"provider":provider_id}

    except Exception as e:
        logger.exception(f"Dispatch error {provider_id}: {e}")
        _update_stats(provider_id, False, error=True)
        return {"ok":False,"error":str(e),"provider":provider_id}


# ── Smart Routing ─────────────────────────────────────────────────────────────

def dispatch_cheapest_first(
    available_providers: list,
    messages:            list,
    max_tokens:          int   = 2048,
    temperature:         float = 0.7,
    timeout:             int   = 120,
    tools:               Optional[list] = None,
    json_mode:           bool  = False,
    strategy:            str   = "cost_first",
) -> dict:
    def rank(p: dict) -> float:
        pid   = p.get("provider_id","custom")
        tier  = PROVIDER_CONFIGS.get(pid,{}).get("cost_tier","unknown")
        stats = _provider_stats.get(pid,{})
        lat   = stats.get("latency_ms", LATENCY_BASELINE.get(pid,1000))
        err   = stats.get("error_count",0)
        if _circuit.get(pid,{}).get("open"):
            return 99999
        if strategy == "cost_first":
            return (COST_TIER_ORDER.index(tier) if tier in COST_TIER_ORDER else 999)*100 + err*10
        elif strategy == "speed_first":
            return lat + err*500
        elif strategy == "quality_first":
            return {"openai":1,"anthropic":2,"gemini":3,"together":4,"mistral":5,"groq":6}.get(pid,10)*100 + err*50
        else:  # smart
            cr = COST_TIER_ORDER.index(tier) if tier in COST_TIER_ORDER else 999
            return cr*50 + lat*0.1 + err*100 - stats.get("success_count",0)*2

    errors = []
    for p in sorted(available_providers, key=rank):
        pid, key, mdl, burl = (p.get("provider_id","custom"), p.get("api_key",""),
                                p.get("model",""), p.get("base_url",""))
        if not key or not mdl or _circuit.get(pid,{}).get("open"):
            continue
        r = dispatch(pid, key, mdl, messages, max_tokens, temperature, burl, timeout, tools=tools, json_mode=json_mode)
        if r.get("ok"):
            r.update({"routed_via":pid,"cost_tier":PROVIDER_CONFIGS.get(pid,{}).get("cost_tier","?"),
                      "fallback_count":len(errors),"strategy":strategy})
            _update_stats(pid, True, r.get("latency_ms"))
            return r
        errors.append({"provider":pid,"error":r.get("error","unknown")})
        _update_stats(pid, False, error=True)
        logger.warning(f"{strategy}: {pid} failed — next")

    return {"ok":False,"error":"All providers exhausted","errors":errors}


def ping_provider(pid: str, api_key: str, model: str="", base_url: str="") -> dict:
    test_model = model or (PROVIDER_CONFIGS.get(pid,{}).get("models",[""]) or [""])[0]
    r = dispatch(pid, api_key, test_model, [{"role":"user","content":"Hi"}],
                 max_tokens=5, temperature=0, base_url=base_url, timeout=15)
    _update_stats(pid, r.get("ok"), r.get("latency_ms"), error=not r.get("ok"))
    return r
