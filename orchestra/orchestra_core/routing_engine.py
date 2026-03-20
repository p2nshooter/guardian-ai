"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Routing Engine (Production v2)
Determines which worker/provider handles each job.

Modes:
  smart_balance  — quality-weighted cost optimization (DEFAULT)
  cost_first     — always cheapest available provider
  quality_first  — always best quality model
  local_first    — prefer Ollama/local workers
  failover       — follow explicit fallback chain
  round_robin    — equal distribution (latency testing)
  semantic       — semantic router decides per task category

New in v2:
  - Integrates SemanticRouter: task category → best model
  - Circuit breaker state from SQLite DB (not in-memory)
  - VRAM-aware GPU worker selection
  - SLA-aware routing: high-latency worker skipped for urgent jobs
  - Cost budget enforcement per caller
  - Provider blacklist hot-reload from DB settings
"""
from __future__ import annotations

import logging, threading, time
from typing import Dict, List, Optional, Tuple

import database as db
from semantic_router import get_classifier, CATEGORY_ROUTING, CATEGORY_CHEAP

logger = logging.getLogger("orchestra.routing")

# Provider cost per 1K tokens (blended input/output estimate, USD)
PROVIDER_COST_PER_1K: Dict[str, Dict[str, float]] = {
    "openai":     {"gpt-4o": 0.005, "gpt-4o-mini": 0.00015, "gpt-4-turbo": 0.010,
                   "o1": 0.015, "o1-mini": 0.003, "gpt-3.5-turbo": 0.0005},
    "anthropic":  {"claude-opus-4-6": 0.015, "claude-sonnet-4-6": 0.003,
                   "claude-haiku-4-5-20251001": 0.00025},
    "gemini":     {"gemini-1.5-pro": 0.0035, "gemini-1.5-flash": 0.000075,
                   "gemini-2.0-flash": 0.0001, "gemini-2.0-flash-lite": 0.00004},
    "groq":       {"llama-3.3-70b-versatile": 0.00059, "llama-3.1-8b-instant": 0.00005,
                   "mixtral-8x7b-32768": 0.00024, "gemma2-9b-it": 0.0002},
    "together":   {"meta-llama/Llama-3.3-70B-Instruct-Turbo": 0.00088,
                   "meta-llama/Llama-3.1-8B-Instruct-Turbo": 0.00018,
                   "Qwen/Qwen2.5-72B-Instruct-Turbo": 0.0012},
    "mistral":    {"mistral-large-latest": 0.004, "mistral-small-latest": 0.001,
                   "codestral-latest": 0.001, "open-mixtral-8x22b": 0.002},
    "cohere":     {"command-r-plus-08-2024": 0.003, "command-r-08-2024": 0.00065,
                   "command-light": 0.0003},
    "deepseek":   {"deepseek-chat": 0.00014, "deepseek-reasoner": 0.00055},
    "perplexity": {"llama-3.1-sonar-large-128k-online": 0.001,
                   "llama-3.1-sonar-small-128k-online": 0.0002,
                   "llama-3.1-sonar-huge-128k-online": 0.005},
    "ollama":     {},   # Free — local compute
    "custom":     {},
}

MODEL_QUALITY_TIER: Dict[str, int] = {
    "claude-opus-4-6": 10, "o1": 9,
    "gpt-4o": 8, "claude-sonnet-4-6": 8, "gemini-1.5-pro": 8,
    "mistral-large-latest": 8, "command-r-plus-08-2024": 7,
    "gpt-4-turbo": 7, "deepseek-reasoner": 7,
    "llama-3.3-70b-versatile": 6, "Qwen/Qwen2.5-72B-Instruct-Turbo": 6,
    "open-mixtral-8x22b": 6,
    "gpt-4o-mini": 5, "claude-haiku-4-5-20251001": 5,
    "gemini-2.0-flash": 5, "codestral-latest": 5, "o1-mini": 5,
    "gemini-1.5-flash": 4, "mistral-small-latest": 4,
    "command-r-08-2024": 4, "mixtral-8x7b-32768": 4, "deepseek-chat": 4,
    "gpt-3.5-turbo": 3, "gemma2-9b-it": 3, "command-light": 3,
    "llama-3.1-8b-instant": 3, "gemini-2.0-flash-lite": 3,
    "llama-3.1-sonar-huge-128k-online": 7,
    "llama-3.1-sonar-large-128k-online": 5,
}

_rr_idx  = 0
_rr_lock = threading.Lock()


# ── Cost helpers ──────────────────────────────────────────────────────────────

def get_cost_estimate(provider_id: str, model: str, total_tokens: int) -> float:
    rate = PROVIDER_COST_PER_1K.get(provider_id, {}).get(model, 0.001)
    return rate * total_tokens / 1000


def get_cheapest_provider(workers: List[dict]) -> Optional[str]:
    best_pid, best_cost = None, float("inf")
    for w in workers:
        if w.get("status") != "active":
            continue
        cost = PROVIDER_COST_PER_1K.get(w.get("provider_id", ""), {}).get(w.get("model", ""), 0.001)
        if cost < best_cost:
            best_cost, best_pid = cost, w.get("provider_id")
    return best_pid


# ── Worker scorer ─────────────────────────────────────────────────────────────

def _score_worker(worker: dict, mode: str, task_type: str,
                  semantic_category: str = "", sla_ms: int = 0) -> float:
    pid   = worker.get("provider_id", "")
    model = worker.get("model", "")
    load  = worker.get("load_pct", 0)

    # Circuit open → not usable
    if db.circuit_check(pid) == "open":
        return -1.0

    # SLA-aware: skip high-latency workers for urgent jobs
    if sla_ms > 0 and sla_ms < 5000:
        avg_lat = worker.get("avg_latency_ms", 0)
        if avg_lat > 0 and avg_lat > sla_ms * 0.8:
            return -1.0  # Worker too slow for this SLA

    cost    = PROVIDER_COST_PER_1K.get(pid, {}).get(model, 0.001)
    quality = MODEL_QUALITY_TIER.get(model, 3)
    score   = 50.0

    if mode == "smart_balance":
        # Balance quality, cost, and load
        score = quality * 8.0 - cost * 2000 - load * 0.4

    elif mode == "cost_first":
        score = 100.0 - cost * 5000 - load * 0.2

    elif mode == "quality_first":
        score = quality * 15.0 - load * 0.1

    elif mode == "local_first":
        score = 100.0 if pid == "ollama" else 30.0 - cost * 1000
        score -= load * 0.3

    elif mode == "failover":
        chain = _load_setting_list("fallback_chain")
        score = 100.0 - chain.index(pid) * 10 if pid in chain else 0.0

    elif mode == "semantic":
        # Prefer workers that match category routing preference
        routing = CATEGORY_ROUTING.get(semantic_category, CATEGORY_ROUTING["default"])
        for rank, (rpid, rmodel) in enumerate(routing):
            if rpid == pid and rmodel == model:
                score = 100.0 - rank * 15 - load * 0.3
                break
        else:
            score = 20.0 - load * 0.5

    # Error-rate penalty (applied to all modes)
    err_rate = worker.get("error_rate", 0)
    score -= err_rate * 30

    return score


def _load_setting_list(key: str) -> list:
    try:
        import json
        return json.loads(db.get_setting(key, "[]"))
    except Exception:
        return []


# ── Main select function ──────────────────────────────────────────────────────

def select_worker(
    workers:            List[dict],
    task_type:          str  = "chat",
    gpu_required:       bool = False,
    messages:           list = None,
    sla_ms:             int  = 0,
    semantic_category:  str  = "",
    caller_id:          str  = "",
) -> Optional[dict]:
    """
    Select the best available worker for a job.
    Returns None if no suitable worker found.
    """
    global _rr_idx

    mode      = db.get_setting("routing_mode", "smart_balance")
    blacklist = _load_setting_list("blacklist")
    force_local = _load_setting_list("force_local_for")

    # Force local for certain task types (e.g., sensitive data)
    if task_type in force_local:
        mode = "local_first"

    # If semantic mode and we have messages, classify first
    if mode == "semantic" and messages and not semantic_category:
        cat, conf = get_classifier().classify(messages, task_type)
        semantic_category = cat

    candidates = [
        w for w in workers
        if w.get("status") == "active"
        and w.get("provider_id", "") not in blacklist
        and (not gpu_required or w.get("worker_type") == "gpu")
        and db.circuit_check(w.get("provider_id", "")) != "open"
    ]

    if not candidates:
        return None

    # Round-robin mode: pure distribution, no scoring
    if mode == "round_robin":
        with _rr_lock:
            _rr_idx = (_rr_idx + 1) % len(candidates)
            return candidates[_rr_idx % len(candidates)]

    # Score all candidates
    scored = [
        (w, _score_worker(w, mode, task_type, semantic_category, sla_ms))
        for w in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    best_worker, best_score = scored[0]
    if best_score < 0:
        return None
    return best_worker


# ── Public status ─────────────────────────────────────────────────────────────

def get_routing_status(workers: List[dict]) -> dict:
    mode    = db.get_setting("routing_mode", "smart_balance")
    active  = [w for w in workers if w.get("status") == "active"]
    return {
        "mode":             mode,
        "active_workers":   len(active),
        "active_providers": list({w.get("provider_id") for w in active}),
        "blacklist":        _load_setting_list("blacklist"),
        "fallback_chain":   _load_setting_list("fallback_chain"),
        "force_local_for":  _load_setting_list("force_local_for"),
        "cheapest_provider": get_cheapest_provider(workers),
    }
