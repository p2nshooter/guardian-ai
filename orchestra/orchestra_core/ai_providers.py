"""
AXTO Orchestra — AI eXecution & Tools Orchestration | AI Provider Adapters
Unified interface for all AI providers.
Supports: OpenAI, Anthropic, Google Gemini, Groq, Together AI,
          Mistral AI, Cohere, DeepSeek, Perplexity, Ollama (local), Custom/OpenAI-compatible.
"""
import json
import time
import logging
import urllib.request
import urllib.error
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger("orchestra.providers")

# ── Provider Registry ─────────────────────────────────────────────────────────
# 9 cloud vendors + local + custom (satisfies ≥6 vendor requirement)

PROVIDER_CONFIGS = {
    "openai": {
        "name":        "OpenAI",
        "base_url":    "https://api.openai.com/v1",
        "models":      ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini", "gpt-3.5-turbo"],
        "auth_type":   "bearer",
        "icon":        "🤖",
        "description": "Industry-leading GPT and o1 reasoning models.",
        "cost_tier":   "medium",
    },
    "anthropic": {
        "name":        "Anthropic",
        "base_url":    "https://api.anthropic.com/v1",
        "models":      ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
        "auth_type":   "anthropic",
        "icon":        "🧠",
        "description": "Claude — precise, safe, and context-rich reasoning.",
        "cost_tier":   "medium",
    },
    "gemini": {
        "name":        "Google Gemini",
        "base_url":    "https://generativelanguage.googleapis.com/v1beta",
        "models":      ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
        "auth_type":   "query_key",
        "icon":        "✨",
        "description": "Google multimodal foundation models.",
        "cost_tier":   "low",
    },
    "groq": {
        "name":        "Groq",
        "base_url":    "https://api.groq.com/openai/v1",
        "models":      ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
        "auth_type":   "bearer",
        "icon":        "⚡",
        "description": "Ultra-fast inference on dedicated LPU hardware.",
        "cost_tier":   "very_low",
    },
    "together": {
        "name":        "Together AI",
        "base_url":    "https://api.together.xyz/v1",
        "models":      [
            "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            "meta-llama/Llama-3.1-8B-Instruct-Turbo",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "Qwen/Qwen2.5-72B-Instruct-Turbo",
        ],
        "auth_type":   "bearer",
        "icon":        "🔗",
        "description": "Open-source model hosting at scale.",
        "cost_tier":   "low",
    },
    "mistral": {
        "name":        "Mistral AI",
        "base_url":    "https://api.mistral.ai/v1",
        "models":      ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "open-mixtral-8x22b"],
        "auth_type":   "bearer",
        "icon":        "🌬️",
        "description": "Sovereign European AI with strong coding capabilities.",
        "cost_tier":   "low",
    },
    "cohere": {
        "name":        "Cohere",
        "base_url":    "https://api.cohere.com/v2",
        "models":      ["command-r-plus-08-2024", "command-r-08-2024", "command-light"],
        "auth_type":   "bearer",
        "icon":        "🧬",
        "description": "Enterprise RAG and retrieval-augmented generation specialist.",
        "cost_tier":   "medium",
    },
    "deepseek": {
        "name":        "DeepSeek",
        "base_url":    "https://api.deepseek.com/v1",
        "models":      ["deepseek-chat", "deepseek-reasoner"],
        "auth_type":   "bearer",
        "icon":        "🔍",
        "description": "High-capability reasoning at breakthrough cost efficiency.",
        "cost_tier":   "very_low",
    },
    "perplexity": {
        "name":        "Perplexity AI",
        "base_url":    "https://api.perplexity.ai",
        "models":      ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-huge-128k-online"],
        "auth_type":   "bearer",
        "icon":        "🔭",
        "description": "Real-time web-grounded inference for current-knowledge tasks.",
        "cost_tier":   "low",
    },
    "ollama": {
        "name":        "Ollama (Local)",
        "base_url":    "http://localhost:11434",
        "models":      [],   # Dynamically fetched
        "auth_type":   "none",
        "icon":        "🏠",
        "description": "On-premise inference — zero data egress, zero API cost.",
        "cost_tier":   "free",
    },
    "custom": {
        "name":        "Custom (OpenAI-compatible)",
        "base_url":    "",
        "models":      [],
        "auth_type":   "bearer",
        "icon":        "⚙️",
        "description": "Any OpenAI-compatible endpoint (vLLM, LM Studio, LocalAI, etc.).",
        "cost_tier":   "unknown",
    },
}

# Cost ordering for smart routing (cheapest first)
COST_TIER_ORDER = ["free", "very_low", "low", "medium", "high", "unknown"]

# Runtime provider state
_provider_stats: dict = {}


def get_provider_info(provider_id: str) -> dict:
    base  = PROVIDER_CONFIGS.get(provider_id, PROVIDER_CONFIGS["custom"]).copy()
    stats = _provider_stats.get(provider_id, {})
    base.update({
        "online":       stats.get("online", None),
        "latency_ms":   stats.get("latency_ms", None),
        "error_count":  stats.get("error_count", 0),
        "last_checked": stats.get("last_checked", None),
    })
    return base


def list_all_providers() -> list:
    """Return all registered providers with current runtime status."""
    return [get_provider_info(pid) for pid in PROVIDER_CONFIGS]


def _update_stats(provider_id: str, online: bool, latency_ms=None, error: bool = False):
    if provider_id not in _provider_stats:
        _provider_stats[provider_id] = {"error_count": 0}
    stats = _provider_stats[provider_id]
    stats["online"]       = online
    stats["last_checked"] = datetime.now(timezone.utc).isoformat()
    if latency_ms is not None:
        stats["latency_ms"] = round(latency_ms, 1)
    if error:
        stats["error_count"] = stats.get("error_count", 0) + 1
    else:
        stats["error_count"] = 0


# ── Transport Helpers ─────────────────────────────────────────────────────────

def _call_openai_compat(base_url: str, api_key: str, payload: dict, timeout: int = 120) -> dict:
    t0   = time.time()
    data = json.dumps(payload).encode()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    req = urllib.request.Request(f"{base_url}/chat/completions", data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result  = json.loads(resp.read())
            latency = (time.time() - t0) * 1000
            return {"ok": True, "data": result, "latency_ms": latency}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ok": False, "error": f"HTTP {e.code}: {body[:200]}", "status_code": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _call_anthropic(api_key: str, payload: dict, timeout: int = 120) -> dict:
    t0   = time.time()
    data = json.dumps(payload).encode()
    headers = {
        "x-api-key":         api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type":      "application/json",
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data, headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result  = json.loads(resp.read())
            latency = (time.time() - t0) * 1000
            return {"ok": True, "data": result, "latency_ms": latency}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ok": False, "error": f"HTTP {e.code}: {body[:200]}", "status_code": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _call_gemini(api_key: str, model: str, payload: dict, timeout: int = 120) -> dict:
    t0   = time.time()
    url  = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result  = json.loads(resp.read())
            latency = (time.time() - t0) * 1000
            return {"ok": True, "data": result, "latency_ms": latency}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ok": False, "error": f"HTTP {e.code}: {body[:200]}", "status_code": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _call_cohere(api_key: str, payload: dict, timeout: int = 120) -> dict:
    t0   = time.time()
    data = json.dumps(payload).encode()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    req = urllib.request.Request(
        "https://api.cohere.com/v2/chat",
        data=data, headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result  = json.loads(resp.read())
            latency = (time.time() - t0) * 1000
            return {"ok": True, "data": result, "latency_ms": latency}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"ok": False, "error": f"HTTP {e.code}: {body[:200]}", "status_code": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _call_ollama(base_url: str, payload: dict, timeout: int = 300) -> dict:
    t0   = time.time()
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result  = json.loads(resp.read())
            latency = (time.time() - t0) * 1000
            return {"ok": True, "data": result, "latency_ms": latency}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def get_ollama_models(base_url: str = "http://localhost:11434") -> list:
    try:
        req = urllib.request.Request(f"{base_url.rstrip('/')}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


# ── Unified Dispatch ──────────────────────────────────────────────────────────

def dispatch(
    provider_id: str,
    api_key:     str,
    model:       str,
    messages:    list,
    max_tokens:  int   = 2048,
    temperature: float = 0.7,
    base_url:    str   = "",
    timeout:     int   = 120,
) -> dict:
    """
    Dispatch a chat completion to the appropriate provider.
    Returns: {ok, content, input_tokens, output_tokens, model_used, latency_ms, provider, error?}
    """
    try:
        result = None

        if provider_id == "anthropic":
            payload = {"model": model, "max_tokens": max_tokens, "messages": messages}
            result  = _call_anthropic(api_key, payload, timeout)
            if result["ok"]:
                data    = result["data"]
                content = data.get("content", [{}])[0].get("text", "")
                usage   = data.get("usage", {})
                return {"ok": True, "content": content,
                        "input_tokens": usage.get("input_tokens", 0),
                        "output_tokens": usage.get("output_tokens", 0),
                        "model_used": model, "latency_ms": result.get("latency_ms", 0), "provider": provider_id}

        elif provider_id == "gemini":
            gemini_messages = [
                {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
                for m in messages
            ]
            payload = {"contents": gemini_messages,
                       "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
            result = _call_gemini(api_key, model, payload, timeout)
            if result["ok"]:
                data     = result["data"]
                content  = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                metadata = data.get("usageMetadata", {})
                return {"ok": True, "content": content,
                        "input_tokens": metadata.get("promptTokenCount", 0),
                        "output_tokens": metadata.get("candidatesTokenCount", 0),
                        "model_used": model, "latency_ms": result.get("latency_ms", 0), "provider": provider_id}

        elif provider_id == "ollama":
            ollama_url = base_url or api_key
            payload = {"model": model, "messages": messages, "stream": False}
            result  = _call_ollama(ollama_url, payload, timeout)
            if result["ok"]:
                data    = result["data"]
                content = data.get("message", {}).get("content", "")
                return {"ok": True, "content": content,
                        "input_tokens": data.get("prompt_eval_count", 0),
                        "output_tokens": data.get("eval_count", 0),
                        "model_used": model, "latency_ms": result.get("latency_ms", 0), "provider": provider_id}

        elif provider_id == "cohere":
            cohere_messages = [
                {"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]}
                for m in messages
            ]
            payload = {"model": model, "messages": cohere_messages}
            result  = _call_cohere(api_key, payload, timeout)
            if result["ok"]:
                data    = result["data"]
                content = data.get("message", {}).get("content", [{}])[0].get("text", "")
                usage   = data.get("usage", {})
                return {"ok": True, "content": content,
                        "input_tokens": usage.get("billed_units", {}).get("input_tokens", 0),
                        "output_tokens": usage.get("billed_units", {}).get("output_tokens", 0),
                        "model_used": model, "latency_ms": result.get("latency_ms", 0), "provider": provider_id}

        else:
            # OpenAI-compatible: openai, groq, together, mistral, deepseek, perplexity, custom
            effective_base = base_url or PROVIDER_CONFIGS.get(provider_id, {}).get("base_url", "")
            payload = {"model": model, "messages": messages,
                       "max_tokens": max_tokens, "temperature": temperature}
            result = _call_openai_compat(effective_base, api_key, payload, timeout)
            if result["ok"]:
                data    = result["data"]
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                usage   = data.get("usage", {})
                return {"ok": True, "content": content,
                        "input_tokens": usage.get("prompt_tokens", 0),
                        "output_tokens": usage.get("completion_tokens", 0),
                        "model_used": model, "latency_ms": result.get("latency_ms", 0), "provider": provider_id}

        error_msg = result.get("error", "Unknown error") if result else "No result"
        _update_stats(provider_id, False, error=True)
        return {"ok": False, "error": error_msg, "provider": provider_id}

    except Exception as e:
        logger.exception(f"Dispatch error for provider '{provider_id}': {e}")
        _update_stats(provider_id, False, error=True)
        return {"ok": False, "error": str(e), "provider": provider_id}


# ── Cost-Optimized Auto-Dispatch ──────────────────────────────────────────────

def dispatch_cheapest_first(
    available_providers: list,   # [{provider_id, api_key, model, base_url?}]
    messages:            list,
    max_tokens:          int   = 2048,
    temperature:         float = 0.7,
    timeout:             int   = 120,
) -> dict:
    """
    Try configured providers in ascending cost order (cheapest first).
    Falls back to the next on failure. Includes full audit trail.
    """
    def cost_rank(p: dict) -> int:
        pid  = p.get("provider_id", "custom")
        tier = PROVIDER_CONFIGS.get(pid, {}).get("cost_tier", "unknown")
        try:
            return COST_TIER_ORDER.index(tier)
        except ValueError:
            return 999

    sorted_providers = sorted(available_providers, key=cost_rank)
    errors = []

    for p in sorted_providers:
        pid      = p.get("provider_id", "custom")
        api_key  = p.get("api_key", "")
        model    = p.get("model", "")
        base_url = p.get("base_url", "")

        if not api_key or not model:
            continue

        result = dispatch(pid, api_key, model, messages, max_tokens, temperature, base_url, timeout)
        if result.get("ok"):
            result["routed_via"]      = pid
            result["cost_tier"]       = PROVIDER_CONFIGS.get(pid, {}).get("cost_tier", "unknown")
            result["fallback_count"]  = len(errors)
            result["attempted_order"] = [p2.get("provider_id") for p2 in sorted_providers]
            _update_stats(pid, True, result.get("latency_ms"))
            return result

        errors.append({"provider": pid, "error": result.get("error", "unknown")})
        _update_stats(pid, False, error=True)
        logger.warning(f"cost_first: '{pid}' failed ({result.get('error')}) — trying next")

    return {"ok": False, "error": "All providers exhausted", "errors": errors}
