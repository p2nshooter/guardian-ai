# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — GPU advisor (the console's GPU suggestions and notifications).

Owner, 28 Oct 2026: "ada notif saran gpu mana yg tersedia". From the workers'
heartbeats (load, temperature, VRAM, status) and the console's Auto-Scale rules it
answers two questions at a glance:

  best      the GPUs that can take work now, best first — the same order the
            thermal strategy and the router prefer (cool, idle, room in VRAM)
  notices   what needs attention, each with a stable id so the console shows a
            new one once: a GPU is free, a GPU is warm / hot / paused, a worker
            stopped answering, every GPU is busy (with the slots the edition still
            allows), GPUs are idle, or there is no GPU worker at all.

Read-only: it suggests; the router, the thermal rules and the autoscaler act.
"""
from __future__ import annotations

import time
from typing import List, Optional

HEARTBEAT_STALE_S = 90        # same window as database.get_active_workers()
TELEMETRY_STALE_S = 120       # same window as main._worker_view()
VRAM_FULL = 0.9               # share of VRAM in use that counts as full
FREE_LOAD = 30                # % load under which a GPU counts as free
IDLE_LOAD = 10                # % load under which a GPU counts as idle
UNLIMITED = 1_000_000


def _f(v, default=0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _name(w: dict) -> str:
    label = (w.get("label") or "").strip()
    return f"{label} ({w.get('id')})" if label and label != w.get("id") else str(w.get("id"))


def _load(w: dict) -> float:
    """How busy the GPU really is: our task slots, or the GPU's own utilisation when
    something else (another app, a game) keeps it busy — whichever is higher."""
    return max(_f(w.get("load_pct")), _f(w.get("util_pct")))


def _vram_total(w: dict) -> float:
    return _f(w.get("vram_total_gb")) or _f(w.get("gpu_vram_gb"))


def _vram_free(w: dict) -> float:
    total = _vram_total(w)
    return max(0.0, total - _f(w.get("vram_used_gb"))) if total else 0.0


def _vram_full(w: dict) -> bool:
    return bool(_vram_total(w)) and w.get("vram_used_gb") is not None and _f(w.get("vram_used_gb")) >= VRAM_FULL * _vram_total(w)


def _telemetry(w: dict, now: float) -> bool:
    return bool(w.get("telemetry_at")) and now - _f(w.get("telemetry_at")) < TELEMETRY_STALE_S


def _facts(w: dict) -> str:
    parts = []
    if w.get("gpu_name"):
        parts.append(str(w.get("gpu_name")))
    parts.append(f"{int(_f(w.get('load_pct')))}% load")
    if w.get("util_pct") is not None:
        parts.append(f"{int(_f(w.get('util_pct')))}% GPU")
    if w.get("temp_c") is not None:
        parts.append(f"{int(_f(w.get('temp_c')))}°C")
    if _vram_total(w) > 0:
        parts.append(f"{_vram_free(w):g}/{_vram_total(w):g} GB VRAM free" if w.get("vram_used_gb") is not None
                     else f"{_vram_total(w):g} GB VRAM")
    if w.get("model"):
        parts.append(str(w.get("model")))
    return " · ".join(parts)


def _score(w: dict, cfg: dict) -> float:
    """Higher is better: idle, cool, room in memory. Mirrors the thermal strategies."""
    load, temp = _load(w), _f(w.get("temp_c"), 50.0)
    vram = _vram_free(w) if w.get("vram_used_gb") is not None else _vram_total(w)
    strat = cfg.get("strat", "coolest_first")
    if _vram_full(w):
        return -1000 + (100 - load)          # a GPU whose memory is full cannot load the next model: last
    if strat == "load_balanced":
        return 100 - load
    if strat == "vram_available":
        return vram * 2 - load * 0.5
    return (100 - temp) + (100 - load) * 0.5 + min(vram, 80) * 0.25    # coolest_first / round_robin


def advise(workers: List[dict], cfg: dict, gpu_limit: int, now: Optional[float] = None) -> dict:
    now = now or time.time()
    gpus = [w for w in workers if w.get("worker_type") == "gpu"]
    live, offline = [], []
    for w in gpus:
        stale = now - _f(w.get("last_heartbeat"), now) > HEARTBEAT_STALE_S
        (offline if stale or w.get("status") == "offline" else live).append(w)
    warn, crit = cfg.get("warn", 72), cfg.get("crit", 82)
    thermal = cfg.get("thermal", True)

    usable = [w for w in live if w.get("status") == "active" and w.get("usable", 1) not in (0, False)
              and not (thermal and _f(w.get("temp_c")) >= crit)]
    best = sorted(usable, key=lambda w: _score(w, cfg), reverse=True)
    notices: List[dict] = []

    def note(level, code, title, text, worker=None):
        notices.append({"id": f"{code}:{worker.get('id') if worker else '-'}", "level": level, "code": code,
                        "title": title, "text": text, "worker_id": worker.get("id") if worker else None})

    if not gpus:
        note("info", "no_gpu", "No GPU worker yet",
             "Add one in GPU Pool (+ Add GPU Worker) or tick the GPU worker in AXTO Setup; NVIDIA, AMD, Intel and Apple cards are detected.")
    free = [w for w in best if _load(w) < FREE_LOAD and not _vram_full(w)]
    if free:
        top = free[0]
        note("info", "gpu_available", f"GPU available: {_name(top)}",
             f"{_facts(top)} — the best GPU for the next job"
             + (f"; {len(free) - 1} more free" if len(free) > 1 else "") + ".", top)
    for w in live:
        t = w.get("temp_c")
        if w.get("status") == "paused":
            note("crit", "gpu_paused", f"{_name(w)} paused for heat",
                 f"{int(_f(t))}°C reached the emergency limit ({cfg.get('kill', 90)}°C); it resumes below {crit}°C. "
                 + (f"Jobs go to {_name(best[0])}." if best else "No other GPU can take jobs — check cooling."), w)
        elif thermal and t is not None and _f(t) >= crit:
            note("crit", "gpu_hot", f"{_name(w)} is hot ({int(_f(t))}°C)",
                 f"Above the critical {crit}°C: no new jobs while a cooler GPU is free"
                 + (f" — next jobs go to {_name(best[0])}." if best else "."), w)
        elif thermal and t is not None and _f(t) >= warn:
            note("warn", "gpu_warm", f"{_name(w)} is warm ({int(_f(t))}°C)",
                 f"Above the warning {warn}°C: it gets fewer new jobs until it cools.", w)
        if w.get("usable", 1) in (0, False):
            note("warn", "gpu_not_usable", f"{_name(w)} cannot use its GPU",
                 (w.get("access_note") or "The worker found no GPU it can use in its container") + ". It runs on the CPU until this is fixed.", w)
        elif t is None:
            note("info", "gpu_no_telemetry", f"No temperature from {_name(w)}",
                 ("No temperature in the last heartbeats" if _telemetry(w, now) else
                  "No temperature, utilisation or VRAM data in the last heartbeats")
                 + ", so heat protection cannot act on this GPU. The vendor tool (nvidia-smi, rocm-smi) or the "
                 "driver's hwmon sensors are missing in the worker container.", w)
        if w.get("throttled"):
            note("warn", "gpu_throttled", f"{_name(w)} is being throttled",
                 "The GPU lowers its clocks (power or heat limit), so jobs run slower. Check cooling and the power limit.", w)
        if _vram_full(w):
            note("warn", "vram_full", f"{_name(w)} VRAM almost full",
                 f"{_f(w.get('vram_used_gb')):g} of {_vram_total(w):g} GB in use: larger models will not load. "
                 "Use a smaller or quantised model, or send big jobs to a GPU with more free memory.", w)
    for w in offline:
        note("warn", "gpu_offline", f"{_name(w)} is not answering",
             f"No heartbeat for over {HEARTBEAT_STALE_S} s. Its jobs go to other workers; check the worker container.", w)

    used, limit = len([w for w in gpus if w.get("status") != "offline"]), int(gpu_limit or 0)
    slots_left = None if limit >= UNLIMITED else max(0, limit - used)
    if live and not free:
        avg = sum(_load(w) for w in live) / len(live)
        if avg >= cfg.get("up", 75):
            if slots_left == 0:
                text = f"Average GPU load {int(avg)}% and all {limit} GPU slots of your edition are in use — upgrade for more GPU workers, or swap a slow card for a faster one."
            elif cfg.get("enabled"):
                text = f"Average GPU load {int(avg)}%. Auto-Scale adds a GPU worker (cooldown {cfg.get('cool', 60)} s)" + (f"; {slots_left} GPU slot(s) left in your edition." if slots_left is not None else ".")
            else:
                text = f"Average GPU load {int(avg)}%. Add a GPU worker in GPU Pool or turn on Auto-Scale" + (f" — {slots_left} GPU slot(s) left in your edition." if slots_left is not None else ".")
            note("warn", "all_busy", "Every GPU is busy", text)
    idle = [w for w in usable if _load(w) < IDLE_LOAD]
    if len(idle) >= 2 and len(idle) == len(usable) and not cfg.get("enabled"):
        note("info", "gpu_idle", f"{len(idle)} GPUs idle",
             f"All under {IDLE_LOAD}% load — you can remove one in GPU Pool, or turn on Auto-Scale to scale down to the minimum ({cfg.get('min', 1)}).")

    order = {"crit": 0, "warn": 1, "info": 2}
    notices.sort(key=lambda n: (order[n["level"]], n["code"] != "gpu_paused"))   # a paused GPU first
    return {
        "best": [{"id": w.get("id"), "name": _name(w), "facts": _facts(w), "load_pct": _f(w.get("load_pct")),
                  "util_pct": w.get("util_pct"), "temp_c": w.get("temp_c"), "vram_gb": _vram_total(w),
                  "vram_free_gb": _vram_free(w) if w.get("vram_used_gb") is not None else None,
                  "gpu_name": w.get("gpu_name") or "", "vendor": w.get("vendor") or "", "model": w.get("model") or ""}
                 for w in best],
        "notices": notices,
        "summary": {"gpus": len(gpus), "live": len(live), "usable": len(usable), "offline": len(offline),
                    "slots_used": used, "slots_limit": None if limit >= UNLIMITED else limit, "slots_left": slots_left,
                    "strategy": cfg.get("strat", "coolest_first")},
    }
