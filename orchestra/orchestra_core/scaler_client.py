# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — how Core asks the scaler (scaler_service.py) to add or remove worker
containers, and which GPU a new worker should take (REQUESTS 136, BLUEPRINT-V4 §31.F G4).

Smart placement: a new GPU worker goes to the GPU with the most room — free VRAM first,
then low utilisation, then low temperature — skipping GPUs at the critical temperature,
throttled or with full memory, and spreading over GPUs that already carry scaled
workers. Without per-GPU telemetry the worker gets every GPU (Docker decides).
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Optional
from urllib.parse import urlparse


class ScalerError(Exception):
    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


def url() -> str:
    return os.environ.get("ORCHESTRA_SCALER_URL", "").rstrip("/")


def available() -> bool:
    return bool(url())


def _call(method: str, path: str, body: Optional[dict] = None, timeout: float = 20) -> dict:
    if not url():
        raise ScalerError("The scaling service (orchestra-scaler) is not configured — update Orchestra with "
                          "AXTO Setup to add it", 503)
    req = urllib.request.Request(
        url() + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json",
                 "X-Orchestra-Worker-Token": os.environ.get("ORCHESTRA_WORKER_TOKEN", "")})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read() or b"{}").get("detail") or str(e)
        except ValueError:
            detail = str(e)
        raise ScalerError(str(detail), e.code)
    except (urllib.error.URLError, OSError) as e:
        raise ScalerError(f"The scaling service (orchestra-scaler) is not answering: {e}", 503)


def health() -> dict:
    try:
        return {"configured": available(), **_call("GET", "/health", timeout=8)}
    except ScalerError as e:
        return {"configured": available(), "ok": False, "docker": False, "error": str(e), "images": {}, "running": 0}


def listed() -> list:
    return _call("GET", "/workers").get("workers", [])


def spawn(kind: str, gpu_index: Optional[int] = None) -> dict:
    return _call("POST", "/workers", {"kind": kind, "gpu_index": gpu_index}, timeout=60)


def stop(name: str) -> dict:
    return _call("DELETE", f"/workers/{name}", timeout=100)


def kind_for(worker: dict) -> str:
    """The worker image of a GPU worker's brand (or cpu)."""
    if (worker.get("worker_type") or worker.get("type")) == "cpu":
        return "cpu"
    return "gpu-amd" if (worker.get("backend") or "") == "rocm" or worker.get("vendor") == "amd" else "gpu"


def container_of(worker: dict) -> str:
    """The container name of a worker the scaler started ("" for workers AXTO Setup started)."""
    host = urlparse(worker.get("worker_url") or "").hostname or ""
    return host if host.startswith("orchestra-scaled-") else ""


def is_scaled(worker: dict) -> bool:
    return bool(container_of(worker)) or str(worker.get("node_id") or "").startswith("scaled-")


def pick_gpu(workers: list, kind: str, scaled: Optional[list] = None, crit: float = 82) -> Optional[int]:
    """Index of the GPU with the most room for one more worker of this brand, or None."""
    want = "amd" if kind == "gpu-amd" else "nvidia"
    per_index: dict = {}
    for w in workers:
        if w.get("worker_type") != "gpu" or w.get("status") not in ("active", None):
            continue
        try:
            gpus = json.loads(w.get("gpus_json") or "[]") if isinstance(w.get("gpus_json"), str) else (w.get("gpus") or [])
        except ValueError:
            gpus = []
        for g in gpus:
            if not isinstance(g, dict) or g.get("index") is None or (g.get("vendor") or want) != want:
                continue
            per_index.setdefault(int(g["index"]), g)
    if not per_index:
        return None
    load = {}
    for s in scaled or []:
        if str(s.get("gpu", "")).isdigit() and s.get("kind") == kind:
            load[int(s["gpu"])] = load.get(int(s["gpu"]), 0) + 1

    def room(i: int, g: dict) -> tuple:
        total, used = g.get("vram_total_gb"), g.get("vram_used_gb")
        free = (total - used) if total is not None and used is not None else (total or 0)
        return (-load.get(i, 0), free, -(g.get("util_pct") or 0), -(g.get("temp_c") or 50))

    ok = {i: g for i, g in per_index.items()
          if not g.get("throttled") and (g.get("temp_c") is None or g["temp_c"] < crit)
          and not (g.get("vram_total_gb") and g.get("vram_used_gb") is not None
                   and g["vram_used_gb"] >= 0.9 * g["vram_total_gb"])}
    if not ok:
        return None
    return max(ok, key=lambda i: room(i, ok[i]))
