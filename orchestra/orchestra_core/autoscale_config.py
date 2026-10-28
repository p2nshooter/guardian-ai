# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — Auto-Scale & thermal rules (the console's Auto-Scale page).

One JSON setting holds what the console saves (PUT /api/autoscale/config):
  up / down   avg load (%) that adds / removes a GPU worker      (autoscaler.py)
  min         GPU workers never scaled below this
  cool        seconds between two scale events
  thermal     reroute jobs away from hot GPUs                     (routing_engine.py)
  warn        °C — the GPU gets fewer new jobs
  crit        °C — no new jobs while a cooler worker is available
  kill        °C — the worker is paused until it is back below `crit`
  strat       where rerouted GPU jobs go: coolest_first | load_balanced |
              vram_available | round_robin
The on/off switch stays in the `autoscale_enabled` setting the autoscaler reads.
"""
from __future__ import annotations

import itertools, json, logging, os
from typing import List, Optional

import database as db

logger = logging.getLogger("orchestra.autoscale_config")

CONFIG_KEY = "autoscale_console_config"
DEFAULT_CONFIG = {
    "enabled": False, "up": 75, "down": 20, "min": 1,
    "cool": max(30, int(os.environ.get("AUTOSCALE_COOLDOWN", "60"))),
    "thermal": True, "warn": 72, "crit": 82, "kill": 90, "strat": "coolest_first",
}
RANGES = {"up": (30, 95), "down": (5, 50), "min": (0, 1000), "cool": (30, 86400),
          "warn": (50, 85), "crit": (60, 92), "kill": (85, 100)}
STRATEGIES = ("coolest_first", "load_balanced", "vram_available", "round_robin")
WARM_PENALTY = 25.0          # score points a GPU above `warn` loses in routing

_rr = itertools.count()


def get_config() -> dict:
    try:
        saved = json.loads(db.get_setting(CONFIG_KEY, "") or "{}")
    except (TypeError, ValueError):
        saved = {}
    cfg = {**DEFAULT_CONFIG, **{k: v for k, v in (saved or {}).items() if k in DEFAULT_CONFIG}}
    cfg["enabled"] = db.get_setting("autoscale_enabled", "false").lower() == "true"
    return cfg


def save_config(body: dict) -> dict:
    """Validate and store the console's rules. Raises ValueError with a message for people."""
    cfg = get_config()
    for k, (lo, hi) in RANGES.items():
        if k in body and body[k] is not None:
            try:
                cfg[k] = max(lo, min(hi, int(body[k])))
            except (TypeError, ValueError):
                raise ValueError(f"'{k}' must be a whole number")
    for k in ("enabled", "thermal"):
        if k in body:
            cfg[k] = bool(body[k])
    if "strat" in body:
        if body["strat"] not in STRATEGIES:
            raise ValueError(f"Unknown thermal strategy '{body['strat']}' ({', '.join(STRATEGIES)})")
        cfg["strat"] = body["strat"]
    if cfg["down"] >= cfg["up"]:
        raise ValueError("The scale-down load must be lower than the scale-up load")
    if not cfg["warn"] < cfg["crit"] < cfg["kill"]:
        raise ValueError("Temperatures must rise: warning < critical < emergency shutdown")
    db.set_setting(CONFIG_KEY, json.dumps({k: v for k, v in cfg.items() if k != "enabled"}))
    db.set_setting("autoscale_enabled", "true" if cfg["enabled"] else "false")
    return cfg


def heartbeat_status(previous: Optional[str], temp_c: Optional[float], cfg: Optional[dict] = None) -> str:
    """Status a GPU worker gets from its heartbeat: paused at `kill`, resumed below `crit`."""
    cfg = cfg or get_config()
    if not cfg["thermal"] or temp_c is None:
        return "active"
    if temp_c >= cfg["kill"]:
        return "paused"
    if previous == "paused" and temp_c >= cfg["crit"]:
        return "paused"
    return "active"


def _temp(w: dict) -> float:
    t = w.get("temp_c")
    return float(t) if t is not None else 0.0


def thermal_route(candidates: List[dict], gpu_required: bool = False, cfg: Optional[dict] = None):
    """Thermal rerouting for the routing engine.

    Returns (candidates, chosen): GPUs at or above `crit` are dropped while any
    other worker remains; when that happened to a GPU job and cooler GPUs are
    left, `chosen` is the one the thermal strategy picks, otherwise None
    (normal scoring decides among the remaining workers)."""
    cfg = cfg or get_config()
    if not cfg["thermal"]:
        return candidates, None
    hot = [w for w in candidates if w.get("worker_type") == "gpu" and _temp(w) >= cfg["crit"]]
    if not hot or len(hot) == len(candidates):
        return candidates, None
    rest = [w for w in candidates if w not in hot]
    db.record_metric("thermal_reroute", len(hot), {"from": [w.get("id") for w in hot]})
    gpus = [w for w in rest if w.get("worker_type") == "gpu"]
    if not gpu_required or not gpus:
        return rest, None
    strat = cfg["strat"]
    if strat == "load_balanced":
        chosen = min(gpus, key=lambda w: w.get("load_pct") or 0)
    elif strat == "vram_available":
        chosen = max(gpus, key=lambda w: w.get("gpu_vram_gb") or 0)
    elif strat == "round_robin":
        chosen = gpus[next(_rr) % len(gpus)]
    else:
        chosen = min(gpus, key=_temp)
    logger.info(f"Thermal reroute: {[w.get('id') for w in hot]} ≥ {cfg['crit']}°C → {chosen.get('id')} ({strat})")
    return rest, chosen


def warm_penalty(worker: dict, cfg: Optional[dict] = None) -> float:
    cfg = cfg or get_config()
    if cfg["thermal"] and worker.get("worker_type") == "gpu" and _temp(worker) >= cfg["warn"]:
        return WARM_PENALTY
    return 0.0
