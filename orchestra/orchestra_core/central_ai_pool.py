# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Central AI Pool
Unified client-configurable pool of AI providers.
- Clients input their own API keys (never stored in plaintext)
- Supports 9+ vendors: OpenAI, Anthropic, Gemini, Groq, Together AI,
  Mistral, Cohere, DeepSeek, Perplexity, Ollama, Custom
- Auto-routes to cheapest available provider first
- Falls back through the pool on failure
- Per-job cost tracking and monthly quota enforcement
"""
import json
import logging
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional

from credential_vault import store_key, get_key, delete_key, list_providers, test_connection
from ai_providers import (
    PROVIDER_CONFIGS,
    COST_TIER_ORDER,
    dispatch,
    dispatch_cheapest_first,
    list_all_providers,
)

logger = logging.getLogger("orchestra.ai_pool")

DATA_DIR      = Path(os.environ.get("DATA_DIR", "./data"))
USAGE_PATH    = DATA_DIR / "ai_pool_usage.json"
POOL_CFG_PATH = DATA_DIR / "ai_pool_config.json"

# ── Pool Configuration ────────────────────────────────────────────────────────

DEFAULT_POOL_CONFIG = {
    "routing_strategy": "cost_first",   # cost_first | quality_first | smart_balance | manual
    "monthly_budget_usd": 0,            # 0 = unlimited
    "daily_budget_usd":   0,
    "preferred_providers": [],          # Explicit priority order (manual mode)
    "excluded_providers":  [],          # Never use these
    "require_local_when_available": False,
}

_pool_config_cache: Optional[dict] = None


def load_pool_config() -> dict:
    global _pool_config_cache
    if _pool_config_cache:
        return _pool_config_cache
    if POOL_CFG_PATH.exists():
        try:
            _pool_config_cache = json.loads(POOL_CFG_PATH.read_text())
            return _pool_config_cache
        except Exception:
            pass
    return DEFAULT_POOL_CONFIG.copy()


def save_pool_config(cfg: dict) -> None:
    global _pool_config_cache
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    POOL_CFG_PATH.write_text(json.dumps(cfg, indent=2))
    _pool_config_cache = cfg


# ── Provider Registration ─────────────────────────────────────────────────────

def register_provider(
    provider_id: str,
    api_key:     str,
    model:       str,
    label:       str = "",
    base_url:    str = "",
) -> dict:
    """
    Register a provider API key into the encrypted vault.
    Clients call this to add their own credentials.
    The raw key is never stored on disk — only AES-256-GCM ciphertext.
    """
    if provider_id not in PROVIDER_CONFIGS and provider_id != "custom":
        return {"ok": False, "error": f"Unknown provider '{provider_id}'. Supported: {list(PROVIDER_CONFIGS.keys())}"}

    result = store_key(provider_id, api_key, label=label or provider_id)
    if not result.get("ok"):
        return result

    # Persist model and optional base_url in pool config
    cfg = load_pool_config()
    if "providers" not in cfg:
        cfg["providers"] = {}
    cfg["providers"][provider_id] = {
        "model":    model,
        "base_url": base_url,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "label":    label or provider_id,
    }
    save_pool_config(cfg)

    logger.info(f"AI Pool: registered provider '{provider_id}' (model={model})")
    return {"ok": True, "provider": provider_id, "model": model, "hint": result.get("hint")}


def remove_provider(provider_id: str) -> dict:
    """Remove a provider from the pool."""
    deleted = delete_key(provider_id)
    cfg     = load_pool_config()
    if "providers" in cfg and provider_id in cfg["providers"]:
        del cfg["providers"][provider_id]
        save_pool_config(cfg)
    return {"ok": deleted, "provider": provider_id}


def get_pool_status() -> dict:
    """Return current pool status: configured providers, routing strategy, usage."""
    cfg       = load_pool_config()
    vault_ids = {p["id"] for p in list_providers()}
    providers = cfg.get("providers", {})

    pool = []
    for pid, meta in providers.items():
        in_vault = pid in vault_ids
        info     = PROVIDER_CONFIGS.get(pid, {})
        pool.append({
            "provider_id":   pid,
            "name":          info.get("name", pid),
            "icon":          info.get("icon", "⚙️"),
            "cost_tier":     info.get("cost_tier", "unknown"),
            "model":         meta.get("model", ""),
            "label":         meta.get("label", pid),
            "key_stored":    in_vault,
            "added_at":      meta.get("added_at", ""),
        })

    # Sort by cost tier
    pool.sort(key=lambda p: COST_TIER_ORDER.index(p["cost_tier"])
              if p["cost_tier"] in COST_TIER_ORDER else 999)

    usage = _get_period_usage()
    return {
        "pool":              pool,
        "routing_strategy":  cfg.get("routing_strategy", "cost_first"),
        "monthly_budget":    cfg.get("monthly_budget_usd", 0),
        "daily_budget":      cfg.get("daily_budget_usd", 0),
        "usage_today_usd":   round(usage["today"], 6),
        "usage_month_usd":   round(usage["month"], 6),
        "supported_vendors": list(PROVIDER_CONFIGS.keys()),
    }


def test_provider(provider_id: str) -> dict:
    """Test connectivity and validity of a stored provider key."""
    return test_connection(provider_id)


# ── Inference ─────────────────────────────────────────────────────────────────

def pool_complete(
    messages:    list,
    max_tokens:  int   = 2048,
    temperature: float = 0.7,
    strategy:    str   = "",   # Override pool routing_strategy
    timeout:     int   = 120,
) -> dict:
    """
    Execute a completion using the configured provider pool.
    Routing strategy:
      - cost_first:      Try cheapest available provider first; auto-fallback
      - quality_first:   Use highest-quality available provider
      - smart_balance:   Balance cost, latency, and load
      - manual:          Use preferred_providers order from config
    """
    cfg      = load_pool_config()
    strategy = strategy or cfg.get("routing_strategy", "cost_first")
    excluded = set(cfg.get("excluded_providers", []))
    prefs    = cfg.get("preferred_providers", [])
    providers_meta = cfg.get("providers", {})

    # Build pool list from vault + config
    pool = []
    for pid, meta in providers_meta.items():
        if pid in excluded:
            continue
        api_key = get_key(pid)
        if not api_key:
            continue
        pool.append({
            "provider_id": pid,
            "api_key":     api_key,
            "model":       meta.get("model", ""),
            "base_url":    meta.get("base_url", ""),
        })

    if not pool:
        return {"ok": False, "error": "No providers configured. Register at least one API key."}

    # ── Budget guard ──────────────────────────────────────────────────────────
    budget_check = _check_budget(cfg)
    if not budget_check["ok"]:
        return {"ok": False, "error": budget_check["reason"]}

    # ── Route by strategy ─────────────────────────────────────────────────────
    if strategy == "manual" and prefs:
        ordered = sorted(pool, key=lambda p: prefs.index(p["provider_id"])
                         if p["provider_id"] in prefs else 999)
    elif strategy == "quality_first":
        from routing_engine import MODEL_QUALITY_TIER  # FIX: was incorrectly imported from ai_providers
        ordered = sorted(pool,
                         key=lambda p: MODEL_QUALITY_TIER.get(p["model"], 5),
                         reverse=True)
    else:
        # cost_first or smart_balance — cheapest first
        ordered = pool  # dispatch_cheapest_first handles sorting

    if strategy in ("cost_first", "smart_balance"):
        result = dispatch_cheapest_first(
            ordered, messages, max_tokens=max_tokens,
            temperature=temperature, timeout=timeout,
        )
    else:
        # Try ordered providers sequentially
        result  = {"ok": False, "error": "No providers tried"}
        errors  = []
        for p in ordered:
            r = dispatch(
                p["provider_id"], p["api_key"], p["model"],
                messages, max_tokens, temperature, p["base_url"], timeout,
            )
            if r.get("ok"):
                r["routed_via"]     = p["provider_id"]
                r["fallback_count"] = len(errors)
                result = r
                break
            errors.append({"provider": p["provider_id"], "error": r.get("error")})
        if not result.get("ok"):
            result["errors"] = errors

    # ── Track usage ───────────────────────────────────────────────────────────
    if result.get("ok"):
        _record_usage(
            provider_id=result.get("routed_via", "unknown"),
            model=result.get("model_used", ""),
            input_tokens=result.get("input_tokens", 0),
            output_tokens=result.get("output_tokens", 0),
        )

    return result


# ── Usage Tracking ────────────────────────────────────────────────────────────

def _load_usage() -> dict:
    if USAGE_PATH.exists():
        try:
            return json.loads(USAGE_PATH.read_text())
        except Exception:
            pass
    return {"records": []}


def _save_usage(usage: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    USAGE_PATH.write_text(json.dumps(usage, indent=2))


def _record_usage(provider_id: str, model: str, input_tokens: int, output_tokens: int) -> None:
    from routing_engine import get_cost_estimate
    cost  = get_cost_estimate(provider_id, model, input_tokens + output_tokens)
    usage = _load_usage()
    usage["records"].append({
        "ts":            datetime.now(timezone.utc).isoformat(),
        "provider":      provider_id,
        "model":         model,
        "input_tokens":  input_tokens,
        "output_tokens": output_tokens,
        "cost_usd":      cost,
    })
    # Prune older than 90 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    usage["records"] = [r for r in usage["records"] if r.get("ts", "") >= cutoff]
    _save_usage(usage)


def _get_period_usage() -> dict:
    usage = _load_usage()
    now   = datetime.now(timezone.utc)
    today = now.date().isoformat()
    month = now.strftime("%Y-%m")

    today_cost = sum(r["cost_usd"] for r in usage["records"] if r.get("ts", "").startswith(today))
    month_cost = sum(r["cost_usd"] for r in usage["records"] if r.get("ts", "").startswith(month))
    return {"today": today_cost, "month": month_cost}


def _check_budget(cfg: dict) -> dict:
    daily_limit   = cfg.get("daily_budget_usd", 0)
    monthly_limit = cfg.get("monthly_budget_usd", 0)
    usage         = _get_period_usage()

    if daily_limit > 0 and usage["today"] >= daily_limit:
        return {"ok": False, "reason": f"Daily AI budget exhausted (${daily_limit:.2f}). Resets at midnight UTC."}
    if monthly_limit > 0 and usage["month"] >= monthly_limit:
        return {"ok": False, "reason": f"Monthly AI budget exhausted (${monthly_limit:.2f}). Resets next month."}
    return {"ok": True}


def get_usage_report() -> dict:
    """Return aggregated usage and cost report."""
    usage = _load_usage()
    by_provider: dict = {}
    for r in usage["records"]:
        pid = r.get("provider", "unknown")
        if pid not in by_provider:
            by_provider[pid] = {"calls": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
        by_provider[pid]["calls"]         += 1
        by_provider[pid]["input_tokens"]  += r.get("input_tokens", 0)
        by_provider[pid]["output_tokens"] += r.get("output_tokens", 0)
        by_provider[pid]["cost_usd"]      += r.get("cost_usd", 0.0)

    period = _get_period_usage()
    return {
        "by_provider":       by_provider,
        "usage_today_usd":   round(period["today"], 6),
        "usage_month_usd":   round(period["month"], 6),
        "total_records":     len(usage["records"]),
    }
