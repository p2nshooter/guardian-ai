# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO AI Studio — Provider Routing Core
Routes to any AI provider using CLIENT's own API keys.
Supports: OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek,
          xAI Grok, Cohere, Together AI, Fireworks, Perplexity,
          Ollama (local), Any OpenAI-compatible endpoint, Orchestra
"""
from __future__ import annotations
import json, logging, time, uuid
from typing import Any, AsyncIterator
import httpx

log = logging.getLogger("ai_studio.core")

def new_id() -> str:
    return uuid.uuid4().hex[:16]

# ── Provider base URLs (OpenAI-compatible) ─────────────────────────────────
OPENAI_COMPAT = {
    "openai":      "https://api.openai.com/v1",
    "groq":        "https://api.groq.com/openai/v1",
    "mistral":     "https://api.mistral.ai/v1",
    "deepseek":    "https://api.deepseek.com/v1",
    "xai":         "https://api.x.ai/v1",
    "together":    "https://api.together.xyz/v1",
    "fireworks":   "https://api.fireworks.ai/inference/v1",
    "perplexity":  "https://api.perplexity.ai",
    "ollama":      "http://localhost:11434/v1",
    "lmstudio":    "http://localhost:1234/v1",
}

# ── Default models per provider ────────────────────────────────────────────
DEFAULT_MODELS = {
    "openai":     "gpt-4o-mini",
    "anthropic":  "claude-sonnet-4-20250514",
    "google":     "gemini-2.0-flash",
    "groq":       "llama-3.3-70b-versatile",
    "mistral":    "mistral-large-latest",
    "deepseek":   "deepseek-chat",
    "xai":        "grok-3-mini",
    "cohere":     "command-r-plus",
    "together":   "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "fireworks":  "accounts/fireworks/models/llama-v3p3-70b-instruct",
    "perplexity": "sonar-pro",
    "ollama":     "llama3.2",
    "lmstudio":   "local-model",
    "orchestra":  "auto",
    "custom":     "custom-model",
}

# ── Model catalog (for UI dropdowns) ───────────────────────────────────────
MODEL_CATALOG = {
    "openai": [
        {"id": "gpt-4o",              "name": "GPT-4o",            "ctx": 128000, "tier": "flagship"},
        {"id": "gpt-4o-mini",         "name": "GPT-4o Mini",       "ctx": 128000, "tier": "fast"},
        {"id": "o3",                  "name": "o3",                "ctx": 200000, "tier": "reasoning"},
        {"id": "o3-mini",             "name": "o3-mini",           "ctx": 200000, "tier": "reasoning"},
        {"id": "o4-mini",             "name": "o4-mini",           "ctx": 200000, "tier": "reasoning"},
        {"id": "gpt-4-turbo",         "name": "GPT-4 Turbo",       "ctx": 128000, "tier": "legacy"},
        {"id": "gpt-3.5-turbo",       "name": "GPT-3.5 Turbo",     "ctx": 16385,  "tier": "legacy"},
    ],
    "anthropic": [
        {"id": "claude-opus-4-20250514",    "name": "Claude Opus 4",    "ctx": 200000, "tier": "flagship"},
        {"id": "claude-sonnet-4-20250514",  "name": "Claude Sonnet 4",  "ctx": 200000, "tier": "balanced"},
        {"id": "claude-sonnet-4-5-20251001","name": "Claude Sonnet 4.5","ctx": 200000, "tier": "balanced"},
        {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "ctx": 200000, "tier": "fast"},
        {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "ctx": 200000, "tier": "fast"},
    ],
    "google": [
        {"id": "gemini-2.5-pro",       "name": "Gemini 2.5 Pro",    "ctx": 1048576, "tier": "flagship"},
        {"id": "gemini-2.5-flash",     "name": "Gemini 2.5 Flash",  "ctx": 1048576, "tier": "fast"},
        {"id": "gemini-2.0-flash",     "name": "Gemini 2.0 Flash",  "ctx": 1048576, "tier": "fast"},
        {"id": "gemini-1.5-pro",       "name": "Gemini 1.5 Pro",    "ctx": 2097152, "tier": "legacy"},
    ],
    "groq": [
        {"id": "llama-3.3-70b-versatile",  "name": "Llama 3.3 70B",     "ctx": 128000, "tier": "flagship"},
        {"id": "llama-3.1-8b-instant",     "name": "Llama 3.1 8B",      "ctx": 128000, "tier": "fast"},
        {"id": "mixtral-8x7b-32768",        "name": "Mixtral 8x7B",      "ctx": 32768,  "tier": "balanced"},
        {"id": "gemma2-9b-it",             "name": "Gemma 2 9B",         "ctx": 8192,   "tier": "fast"},
        {"id": "qwen-qwq-32b",             "name": "QwQ-32B",            "ctx": 131072, "tier": "reasoning"},
    ],
    "mistral": [
        {"id": "mistral-large-latest",    "name": "Mistral Large",     "ctx": 131072, "tier": "flagship"},
        {"id": "mistral-medium-latest",   "name": "Mistral Medium",    "ctx": 131072, "tier": "balanced"},
        {"id": "mistral-small-latest",    "name": "Mistral Small",     "ctx": 131072, "tier": "fast"},
        {"id": "codestral-latest",        "name": "Codestral",         "ctx": 262144, "tier": "code"},
    ],
    "deepseek": [
        {"id": "deepseek-chat",      "name": "DeepSeek V3",           "ctx": 65536,  "tier": "flagship"},
        {"id": "deepseek-reasoner",  "name": "DeepSeek R1 (Reasoning)","ctx": 65536, "tier": "reasoning"},
    ],
    "xai": [
        {"id": "grok-3",       "name": "Grok 3",       "ctx": 131072, "tier": "flagship"},
        {"id": "grok-3-mini",  "name": "Grok 3 Mini",  "ctx": 131072, "tier": "fast"},
        {"id": "grok-2-1212",  "name": "Grok 2",       "ctx": 131072, "tier": "legacy"},
    ],
    "cohere": [
        {"id": "command-r-plus",  "name": "Command R+",  "ctx": 128000, "tier": "flagship"},
        {"id": "command-r",       "name": "Command R",   "ctx": 128000, "tier": "balanced"},
        {"id": "command-a-03-2025","name":"Command A",   "ctx": 256000, "tier": "flagship"},
    ],
    "together": [
        {"id": "meta-llama/Llama-3.3-70B-Instruct-Turbo", "name": "Llama 3.3 70B Turbo", "ctx": 131072, "tier": "flagship"},
        {"id": "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo", "name": "Llama 3.2 11B Vision", "ctx": 131072, "tier": "vision"},
        {"id": "Qwen/QwQ-32B-Preview", "name": "QwQ 32B", "ctx": 32768, "tier": "reasoning"},
        {"id": "mistralai/Mixtral-8x22B-Instruct-v0.1", "name": "Mixtral 8x22B", "ctx": 65536, "tier": "large"},
    ],
    "perplexity": [
        {"id": "sonar-pro",    "name": "Sonar Pro (Web Search)", "ctx": 127072, "tier": "flagship"},
        {"id": "sonar",        "name": "Sonar (Web Search)",     "ctx": 127072, "tier": "fast"},
        {"id": "sonar-reasoning","name": "Sonar Reasoning",      "ctx": 127072, "tier": "reasoning"},
    ],
    "ollama": [
        {"id": "llama3.2",      "name": "Llama 3.2 (Local)",    "ctx": 8192,  "tier": "local"},
        {"id": "llama3.1:70b",  "name": "Llama 3.1 70B (Local)","ctx": 32768, "tier": "local"},
        {"id": "qwen2.5-coder", "name": "Qwen2.5 Coder (Local)","ctx": 32768, "tier": "local"},
        {"id": "mistral",       "name": "Mistral (Local)",       "ctx": 8192,  "tier": "local"},
        {"id": "phi4",          "name": "Phi-4 (Local)",         "ctx": 16384, "tier": "local"},
        {"id": "deepseek-r1",   "name": "DeepSeek R1 (Local)",   "ctx": 65536, "tier": "local"},
    ],
}

# ── Token pricing (USD per 1M tokens: input, output) ───────────────────────
TOKEN_PRICING: dict[str, tuple[float, float]] = {
    # OpenAI
    "gpt-4o":          (2.50, 10.00), "gpt-4o-mini":    (0.15,  0.60),
    "o3":             (10.00, 40.00), "o3-mini":        (1.10,  4.40),
    "o4-mini":         (1.10,  4.40), "gpt-4-turbo":   (10.00, 30.00),
    "gpt-3.5-turbo":   (0.50,  1.50),
    # Anthropic
    "claude-opus-4":  (15.00, 75.00), "claude-sonnet-4": (3.00, 15.00),
    "claude-haiku-4":  (0.80,  4.00), "claude-3-5-haiku":(0.80,  4.00),
    # Google
    "gemini-2.5-pro":  (1.25, 10.00), "gemini-2.5-flash":(0.15,  0.60),
    "gemini-2.0-flash":(0.10,  0.40), "gemini-1.5-pro":  (1.25,  5.00),
    # Groq (fast inference, low cost)
    "llama-3.3-70b":   (0.59,  0.79), "llama-3.1-8b":    (0.05,  0.08),
    "mixtral-8x7b":    (0.24,  0.24), "gemma2-9b":        (0.20,  0.20),
    "qwen-qwq-32b":    (0.29,  0.39),
    # Mistral
    "mistral-large":   (2.00,  6.00), "mistral-medium":  (0.40,  2.00),
    "mistral-small":   (0.10,  0.30), "codestral":        (0.30,  0.90),
    # DeepSeek
    "deepseek-chat":   (0.14,  0.28), "deepseek-reasoner":(0.55,  2.19),
    # xAI
    "grok-3":          (3.00, 15.00), "grok-3-mini":      (0.30,  0.50),
    # Cohere
    "command-r-plus":  (2.50, 10.00), "command-r":        (0.15,  0.60),
    "command-a":       (2.50, 10.00),
    # Together
    "llama-3.3-70b-turbo": (0.88, 0.88),
    # Perplexity
    "sonar-pro":       (3.00, 15.00), "sonar":            (1.00,  1.00),
}

def estimate_cost(model: str, in_tok: int, out_tok: int) -> float:
    for key, (inp, out) in TOKEN_PRICING.items():
        if key in model.lower():
            return (in_tok * inp / 1_000_000) + (out_tok * out / 1_000_000)
    return 0.0

# ── Main chat completion router ─────────────────────────────────────────────
async def chat_completion(
    provider: str,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 4096,
    endpoint: str = "",
    stream: bool = False,
) -> dict:
    """
    Route to any provider using client's API key.
    Returns: {content, usage:{input_tokens,output_tokens}, cost, model, latency_ms, error?}
    """
    t0 = time.time()
    model = model or DEFAULT_MODELS.get(provider, "")

    try:
        if provider == "anthropic":
            result = await _anthropic(api_key, model, messages, temperature, max_tokens)
        elif provider == "google":
            result = await _gemini(api_key, model, messages, temperature, max_tokens)
        elif provider == "cohere":
            result = await _cohere(api_key, model, messages, temperature, max_tokens)
        elif provider in OPENAI_COMPAT or provider in ("custom", "orchestra", "lmstudio"):
            base = endpoint or OPENAI_COMPAT.get(provider, "")
            if not base:
                return {"error": f"No endpoint configured for '{provider}'. Set a custom endpoint URL."}
            result = await _openai_compat(api_key, base, model, messages, temperature, max_tokens)
        else:
            return {"error": f"Unknown provider '{provider}'. Supported: {', '.join(list(OPENAI_COMPAT.keys()) + ['anthropic','google','cohere'])}"}
    except httpx.TimeoutException:
        return {"error": "Request timed out (120s). Try a shorter prompt or increase timeout.", "latency_ms": 120000}
    except httpx.ConnectError as e:
        return {"error": f"Cannot connect to {provider}: {e}. Check endpoint URL and network.", "latency_ms": 0}
    except Exception as e:
        return {"error": str(e), "latency_ms": int((time.time() - t0) * 1000)}

    result["latency_ms"] = int((time.time() - t0) * 1000)
    u = result.get("usage", {})
    result["cost"] = estimate_cost(model, u.get("input_tokens", 0), u.get("output_tokens", 0))
    return result


async def _openai_compat(api_key: str, base: str, model: str, msgs: list, temp: float, max_tok: int) -> dict:
    hdrs = {"Content-Type": "application/json"}
    if api_key:
        hdrs["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(f"{base.rstrip('/')}/chat/completions",
            headers=hdrs,
            json={"model": model, "messages": msgs, "temperature": temp, "max_tokens": max_tok, "stream": False})
        d = r.json()
        if not r.is_success:
            err = d.get("error", {})
            return {"error": err.get("message", f"HTTP {r.status_code}: {r.text[:200]}") if isinstance(err, dict) else str(err)}
        ch = d.get("choices", [{}])[0]
        usage = d.get("usage", {})
        return {
            "content": ch.get("message", {}).get("content", ""),
            "usage": {"input_tokens": usage.get("prompt_tokens", 0), "output_tokens": usage.get("completion_tokens", 0)},
            "model": d.get("model", model),
        }


async def _anthropic(api_key: str, model: str, msgs: list, temp: float, max_tok: int) -> dict:
    system = ""
    chat = []
    for m in msgs:
        if m["role"] == "system":
            system = m["content"]
        else:
            chat.append({"role": m["role"], "content": m["content"]})
    body: dict[str, Any] = {"model": model, "max_tokens": max_tok, "temperature": temp, "messages": chat}
    if system:
        body["system"] = system
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
            json=body)
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"Anthropic error {r.status_code}")}
        return {
            "content": d.get("content", [{}])[0].get("text", ""),
            "usage": {"input_tokens": d.get("usage", {}).get("input_tokens", 0), "output_tokens": d.get("usage", {}).get("output_tokens", 0)},
            "model": model,
        }


async def _gemini(api_key: str, model: str, msgs: list, temp: float, max_tok: int) -> dict:
    contents = []
    system_text = ""
    for m in msgs:
        if m["role"] == "system":
            system_text = m["content"]
        else:
            contents.append({"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]})
    body: dict[str, Any] = {"contents": contents, "generationConfig": {"temperature": temp, "maxOutputTokens": max_tok}}
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"}, json=body)
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


async def _cohere(api_key: str, model: str, msgs: list, temp: float, max_tok: int) -> dict:
    chat_history = []
    user_msg = ""
    preamble = ""
    for m in msgs:
        if m["role"] == "system":
            preamble = m["content"]
        elif m["role"] == "user":
            if user_msg:
                chat_history.append({"role": "USER", "message": user_msg})
            user_msg = m["content"]
        else:
            chat_history.append({"role": "CHATBOT", "message": m["content"]})
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post("https://api.cohere.com/v1/chat",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "message": user_msg, "chat_history": chat_history,
                  "preamble": preamble, "temperature": temp, "max_tokens": max_tok})
        d = r.json()
        if not r.is_success:
            return {"error": d.get("message", f"Cohere error {r.status_code}")}
        meta = d.get("meta", {}).get("tokens", {})
        return {
            "content": d.get("text", ""),
            "usage": {"input_tokens": meta.get("input_tokens", 0), "output_tokens": meta.get("output_tokens", 0)},
            "model": model,
        }


# ── Key verification ────────────────────────────────────────────────────────
async def verify_key(provider: str, api_key: str, endpoint: str = "") -> bool:
    """Quick key verification — try a minimal request."""
    try:
        result = await chat_completion(
            provider=provider, api_key=api_key,
            model=DEFAULT_MODELS.get(provider, ""),
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=1, endpoint=endpoint,
        )
        return "error" not in result
    except Exception:
        return False


# ── Provider display info ───────────────────────────────────────────────────
PROVIDER_INFO = {
    "openai":     {"name": "OpenAI",        "icon": "openai",     "color": "#10a37f", "requires_key": True},
    "anthropic":  {"name": "Anthropic",     "icon": "anthropic",  "color": "#d4a853", "requires_key": True},
    "google":     {"name": "Google Gemini", "icon": "google",     "color": "#4285f4", "requires_key": True},
    "groq":       {"name": "Groq",          "icon": "groq",       "color": "#f55036", "requires_key": True},
    "mistral":    {"name": "Mistral AI",    "icon": "mistral",    "color": "#ff6b35", "requires_key": True},
    "deepseek":   {"name": "DeepSeek",      "icon": "deepseek",   "color": "#4d6bfe", "requires_key": True},
    "xai":        {"name": "xAI Grok",      "icon": "xai",        "color": "#1da1f2", "requires_key": True},
    "cohere":     {"name": "Cohere",        "icon": "cohere",     "color": "#39594d", "requires_key": True},
    "together":   {"name": "Together AI",   "icon": "together",   "color": "#6e3cff", "requires_key": True},
    "fireworks":  {"name": "Fireworks AI",  "icon": "fireworks",  "color": "#ff4500", "requires_key": True},
    "perplexity": {"name": "Perplexity",    "icon": "perplexity", "color": "#20b2aa", "requires_key": True},
    "ollama":     {"name": "Ollama (Local)","icon": "ollama",     "color": "#ffffff", "requires_key": False},
    "lmstudio":   {"name": "LM Studio",     "icon": "lmstudio",   "color": "#a78bfa", "requires_key": False},
    "orchestra":  {"name": "Orchestra",     "icon": "orchestra",  "color": "#7c3aed", "requires_key": False},
    "custom":     {"name": "Custom API",    "icon": "custom",     "color": "#64748b", "requires_key": False},
}
