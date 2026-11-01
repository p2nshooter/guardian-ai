# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""The GPU worker itself (REQUESTS 136, BLUEPRINT-V4 §31.F G1): what it tells
Orchestra Core, that it registers again when Core lost it, and that only Core
may run jobs on it or shut it down."""
import os
import sys
import tempfile
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-worker-test-"))

import pytest
from fastapi.testclient import TestClient

from orchestra_worker import worker_gpu as wg

TELEMETRY = [{"index": 0, "vendor": "nvidia", "name": "NVIDIA GeForce RTX 4090", "util_pct": 87.0, "temp_c": 64.0,
              "vram_used_gb": 18.0, "vram_total_gb": 24.0, "power_w": 312.6, "power_limit_w": 450.0, "fan_pct": 61.0,
              "throttled": False, "throttle_reasons": [], "uuid": "GPU-a", "source": "nvidia-smi"},
             {"index": 1, "vendor": "nvidia", "name": "NVIDIA RTX A4000", "util_pct": 3.0, "temp_c": 41.0,
              "vram_used_gb": 0.5, "vram_total_gb": 16.0, "power_w": None, "power_limit_w": None, "fan_pct": None,
              "throttled": False, "throttle_reasons": [], "uuid": "GPU-b", "source": "nvidia-smi"}]


@pytest.fixture()
def gpu_box(monkeypatch):
    info = {"available": True, "backend": "cuda", "vendor": "nvidia", "vendor_label": "NVIDIA",
            "name": "NVIDIA GeForce RTX 4090 ×2", "vram_gb": 40.0, "driver": "560.35.03", "count": 2,
            "gpus": [], "found": [], "sources": ["nvidia-smi"], "wsl": False, "access_note": ""}
    monkeypatch.setattr(wg, "GPU_INFO", info)
    monkeypatch.setattr(wg.gpu_telemetry, "collect", lambda run, drm_root="/sys/class/drm": TELEMETRY)
    wg._telemetry_cache["at"] = 0.0
    yield info
    wg._telemetry_cache["at"] = 0.0


def test_registration_says_what_the_worker_really_has(gpu_box):
    p = wg._register_payload()
    assert p["vendor"] == "nvidia" and p["gpu_name"] == "NVIDIA GeForce RTX 4090 ×2"
    assert p["backend"] == "cuda" and p["gpu_count"] == 2 and p["driver"] == "560.35.03"
    assert p["usable"] is True and p["wsl"] is False and p["worker_version"] == wg.app.version
    assert {"chat", "embedding", "transcription", "cuda_inference", "large_models"} <= set(p["capabilities"])


def test_heartbeat_carries_live_telemetry_of_every_gpu(gpu_box):
    hb = wg._heartbeat_payload()
    assert hb["temp_c"] == 64.0                      # the hottest GPU decides heat protection
    assert hb["util_pct"] == 45.0 and hb["gpu_count"] == 2
    assert hb["vram_used_gb"] == 18.5 and hb["vram_total_gb"] == 40.0 and hb["power_w"] == 312.6
    assert [g["name"] for g in hb["gpus"]] == ["NVIDIA GeForce RTX 4090", "NVIDIA RTX A4000"]
    assert "uuid" not in hb["gpus"][0]               # only what the console shows travels


def test_thermal_view_without_telemetry_is_unknown_not_healthy(gpu_box, monkeypatch):
    monkeypatch.setattr(wg.gpu_telemetry, "collect", lambda run, drm_root="/sys/class/drm": [])
    wg._telemetry_cache["at"] = 0.0
    t = wg._gpu_thermal()
    assert t["temperature_c"] is None and t["health"] == "unknown" and t["temperature_status"] == "NO TELEMETRY"


def test_a_cpu_fallback_keeps_transcription():
    info = dict(wg.GPU_INFO, available=False, backend="cpu", vram_gb=0)
    old = wg.GPU_INFO
    wg.GPU_INFO = info
    try:
        caps = wg._capabilities()
    finally:
        wg.GPU_INFO = old
    assert "transcription" in caps and "stable_diffusion" not in caps


def test_registers_again_when_core_no_longer_knows_the_worker(gpu_box, monkeypatch):
    calls = []
    monkeypatch.setattr(wg, "_worker_id", "W-GPU-007")
    monkeypatch.setattr(wg, "register", lambda: calls.append("register"))
    monkeypatch.setattr(wg, "_orch_post", lambda path, body, timeout=10: {"ok": False, "reregister": True})
    wg.heartbeat_once()
    assert calls == ["register"]

    def gone(path, body, timeout=10):
        raise urllib.error.HTTPError(path, 404, "gone", {}, None)
    monkeypatch.setattr(wg, "_orch_post", gone)
    wg.heartbeat_once()
    assert calls == ["register", "register"]
    monkeypatch.setattr(wg, "_orch_post", lambda path, body, timeout=10: {"ok": True, "status": "active"})
    wg.heartbeat_once()
    assert calls == ["register", "register"]


def test_only_orchestra_core_may_run_jobs_or_shut_the_worker_down(gpu_box, monkeypatch):
    monkeypatch.setattr(wg, "WORKER_TOKEN", "core-secret")
    killed = []
    monkeypatch.setattr(wg.threading, "Timer", lambda delay, fn: type("T", (), {"start": lambda self: killed.append(delay)})())
    monkeypatch.setattr(wg, "deregister", lambda: None)
    client = TestClient(wg.app)
    job = {"task_type": "nothing"}
    assert client.post("/run", json=job).status_code == 401
    assert client.post("/run", json=job, headers={"X-Orchestra-Worker-Token": "wrong"}).status_code == 401
    ok = client.post("/run", json=job, headers={"X-Orchestra-Worker-Token": "core-secret"})
    assert ok.status_code == 200 and ok.json()["ok"] is False and "Unknown GPU task" in ok.json()["error"]
    assert client.post("/shutdown").status_code == 401 and killed == []
    r = client.post("/shutdown", headers={"X-Orchestra-Worker-Token": "core-secret"})
    assert r.status_code == 200 and killed == [0.5]
    monkeypatch.setattr(wg, "_running", True)
    # The container health check stays open.
    assert client.get("/health").status_code == 200
