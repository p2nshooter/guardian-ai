# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Studio — Core AI & GPU Routing Engine
Routes requests to client's own API keys. AXTO never sees prompts or responses.
All data stored locally on client's server.
"""
from __future__ import annotations
import json, logging, time, uuid
from typing import Any, Optional
import httpx

log = logging.getLogger("studio.core")


def new_id() -> str:
    return uuid.uuid4().hex[:16]


# ═══════════════════════════════════════════════════════════════════════════
# AI PROVIDER ROUTING
# ═══════════════════════════════════════════════════════════════════════════

OPENAI_COMPAT_PROVIDERS = {
    "openai":   "https://api.openai.com/v1",
    "groq":     "https://api.groq.com/openai/v1",
    "mistral":  "https://api.mistral.ai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "xai":      "https://api.x.ai/v1",
}

DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-4-20250514",
    "google": "gemini-2.5-flash",
    "groq": "llama-3.3-70b-versatile",
    "mistral": "mistral-large-latest",
    "deepseek": "deepseek-chat",
    "xai": "grok-3-mini",
    "cohere": "command-r-plus",
}

# Per-million-token pricing (input, output) in USD
TOKEN_PRICING = {
    "gpt-4o": (2.50, 10.00), "gpt-4o-mini": (0.15, 0.60), "gpt-4-turbo": (10.0, 30.0),
    "o1": (15.0, 60.0), "o1-mini": (3.0, 12.0),
    "claude-sonnet-4-20250514": (3.0, 15.0), "claude-3-5-haiku-20241022": (0.80, 4.0),
    "claude-opus-4-20250514": (15.0, 75.0),
    "gemini-2.5-pro": (1.25, 10.0), "gemini-2.5-flash": (0.15, 0.60),
    "llama-3.3-70b": (0.59, 0.79), "mixtral-8x7b": (0.24, 0.24),
    "mistral-large": (2.0, 6.0), "codestral": (0.3, 0.9),
    "deepseek-chat": (0.14, 0.28), "deepseek-reasoner": (0.55, 2.19),
    "grok-3": (3.0, 15.0), "grok-3-mini": (0.30, 0.50),
    "command-r-plus": (2.5, 10.0),
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    for key, (inp, out) in TOKEN_PRICING.items():
        if key in model:
            return (input_tokens * inp / 1_000_000) + (output_tokens * out / 1_000_000)
    return 0.0


async def chat_completion(
    provider: str,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 4096,
    endpoint: str = "",
) -> dict:
    """
    Route a chat completion to the specified provider using CLIENT'S API key.
    Returns: { content, usage: {input_tokens, output_tokens}, cost, model, latency_ms, error? }
    """
    start = time.time()
    model = model or DEFAULT_MODELS.get(provider, "")

    try:
        if provider == "anthropic":
            result = await _call_anthropic(api_key, model, messages, temperature, max_tokens)
        elif provider == "google":
            result = await _call_gemini(api_key, model, messages, temperature, max_tokens)
        elif provider in OPENAI_COMPAT_PROVIDERS or provider in ("ollama", "custom_ai"):
            base_url = endpoint or OPENAI_COMPAT_PROVIDERS.get(provider, "")
            if not base_url:
                return {"error": f"No endpoint for provider '{provider}'"}
            result = await _call_openai_compat(api_key, base_url, model, messages, temperature, max_tokens)
        elif provider == "cohere":
            result = await _call_cohere(api_key, model, messages, temperature, max_tokens)
        else:
            return {"error": f"Unsupported provider: {provider}"}
    except Exception as e:
        return {"error": str(e), "latency_ms": int((time.time() - start) * 1000)}

    latency = int((time.time() - start) * 1000)
    result["latency_ms"] = latency
    if "usage" in result:
        result["cost"] = estimate_cost(
            model, result["usage"].get("input_tokens", 0), result["usage"].get("output_tokens", 0)
        )
    return result


async def _call_openai_compat(api_key: str, base_url: str, model: str, messages: list, temp: float, max_tok: int) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": temp, "max_tokens": max_tok, "stream": False},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"API error {r.status_code}")}
        c = d.get("choices", [{}])[0]
        return {
            "content": c.get("message", {}).get("content", ""),
            "usage": {"input_tokens": d.get("usage", {}).get("prompt_tokens", 0), "output_tokens": d.get("usage", {}).get("completion_tokens", 0)},
            "model": d.get("model", model),
        }


async def _call_anthropic(api_key: str, model: str, messages: list, temp: float, max_tok: int) -> dict:
    system = ""
    chat_msgs = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            chat_msgs.append(m)
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
            json={"model": model, "max_tokens": max_tok, "temperature": temp, "system": system, "messages": chat_msgs},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"Anthropic error {r.status_code}")}
        return {
            "content": d.get("content", [{}])[0].get("text", ""),
            "usage": {"input_tokens": d.get("usage", {}).get("input_tokens", 0), "output_tokens": d.get("usage", {}).get("output_tokens", 0)},
            "model": model,
        }


async def _call_gemini(api_key: str, model: str, messages: list, temp: float, max_tok: int) -> dict:
    contents = []
    system_text = ""
    for m in messages:
        if m["role"] == "system":
            system_text = m["content"]
        else:
            contents.append({"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]})
    body: dict[str, Any] = {"contents": contents, "generationConfig": {"temperature": temp, "maxOutputTokens": max_tok}}
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json=body,
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"Gemini error {r.status_code}")}
        text = d.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        u = d.get("usageMetadata", {})
        return {
            "content": text,
            "usage": {"input_tokens": u.get("promptTokenCount", 0), "output_tokens": u.get("candidatesTokenCount", 0)},
            "model": model,
        }


async def _call_cohere(api_key: str, model: str, messages: list, temp: float, max_tok: int) -> dict:
    chat_history = []
    user_message = ""
    preamble = ""
    for m in messages:
        if m["role"] == "system":
            preamble = m["content"]
        elif m["role"] == "user":
            user_message = m["content"]
        else:
            chat_history.append({"role": "CHATBOT" if m["role"] == "assistant" else "USER", "message": m["content"]})
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            "https://api.cohere.com/v1/chat",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "message": user_message, "chat_history": chat_history, "preamble": preamble, "temperature": temp, "max_tokens": max_tok},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("message", f"Cohere error {r.status_code}")}
        meta = d.get("meta", {}).get("tokens", {})
        return {
            "content": d.get("text", ""),
            "usage": {"input_tokens": meta.get("input_tokens", 0), "output_tokens": meta.get("output_tokens", 0)},
            "model": model,
        }


# ═══════════════════════════════════════════════════════════════════════════
# GPU INSTANCE HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

async def check_gpu_health(endpoint_url: str, api_key: str = "") -> dict:
    """Check if a GPU inference endpoint is reachable and return model info."""
    if not endpoint_url:
        return {"status": "offline", "error": "No endpoint URL"}
    try:
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{endpoint_url.rstrip('/')}/v1/models", headers=headers)
            if r.is_success:
                data = r.json()
                models = [m.get("id", "") for m in data.get("data", [])]
                return {"status": "online", "models": models}
            return {"status": "error", "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}
