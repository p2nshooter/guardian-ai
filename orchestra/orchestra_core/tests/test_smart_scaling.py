"""Smart scaling (REQUESTS 136, BLUEPRINT-V4 §31.F G4): a new GPU worker takes the GPU with the
most room; Auto-Scale starts real containers through orchestra-scaler, starts a GPU worker from
zero when GPU jobs wait, and only ever stops the workers it started."""
import json
import os
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))
os.environ.setdefault("ORCHESTRA_CONSOLE_PASSWORD", "console-test-password")
os.environ.setdefault("ORCHESTRA_WORKER_TOKEN", "worker-test-token")

import pytest

import autoscaler
import database as db
import enforcement
import scaler_client
from test_console_api import PRO, FakeValidator


def gpu_worker(gpus, **kw):
    return {"worker_type": "gpu", "status": "active", "backend": "cuda", "gpus_json": json.dumps(gpus), **kw}


def test_the_gpu_with_the_most_room_takes_the_next_worker():
    w = gpu_worker([
        {"index": 0, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 20, "util_pct": 90, "temp_c": 70},
        {"index": 1, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 2, "util_pct": 5, "temp_c": 45},
        {"index": 2, "vendor": "nvidia", "vram_total_gb": 16, "vram_used_gb": 1, "util_pct": 0, "temp_c": 40},
    ])
    assert scaler_client.pick_gpu([w], "gpu") == 1          # most free VRAM wins
    # Spread: GPU 1 already carries a scaled worker, so GPU 2 is next.
    assert scaler_client.pick_gpu([w], "gpu", [{"kind": "gpu", "gpu": "1"}]) == 2


def test_hot_throttled_or_full_gpus_are_skipped():
    w = gpu_worker([
        {"index": 0, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 1, "temp_c": 88},
        {"index": 1, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 1, "throttled": True},
        {"index": 2, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 23},
    ])
    assert scaler_client.pick_gpu([w], "gpu", crit=82) is None
    assert scaler_client.pick_gpu([gpu_worker([])], "gpu") is None     # no telemetry: Docker decides


def test_brand_and_container_helpers():
    assert scaler_client.kind_for({"worker_type": "gpu", "backend": "rocm"}) == "gpu-amd"
    assert scaler_client.kind_for({"worker_type": "gpu", "backend": "cuda"}) == "gpu"
    assert scaler_client.kind_for({"worker_type": "cpu"}) == "cpu"
    amd = gpu_worker([{"index": 0, "vendor": "amd", "vram_total_gb": 24, "vram_used_gb": 0}], backend="rocm")
    assert scaler_client.pick_gpu([amd], "gpu-amd") == 0 and scaler_client.pick_gpu([amd], "gpu") is None
    assert scaler_client.container_of({"worker_url": "http://orchestra-scaled-gpu-1-a1b2c3:7892"}) == "orchestra-scaled-gpu-1-a1b2c3"
    assert scaler_client.container_of({"worker_url": "http://orchestra-worker-gpu-1:7892"}) == ""


@pytest.fixture()
def scaler(monkeypatch):
    db.init_db()
    for t in ("workers", "jobs", "metrics"):
        db.ex(f"DELETE FROM {t}")
    enforcement._validator = FakeValidator(PRO)
    db.set_setting("autoscale_enabled", "true")
    # Defaults, whatever earlier tests saved: CPU scales on a queue of 20+, at most 4 GPU workers.
    for k, v in {"autoscale_threshold": "20", "autoscale_max_cpu": "10", "autoscale_max_gpu": "4",
                 "idle_worker_timeout": "300", "gpu_worker_kind": "", "autoscale_console_config": ""}.items():
        db.set_setting(k, v)
    calls = []
    monkeypatch.setattr(autoscaler, "SPAWN_TYPE", "scaler")
    monkeypatch.setattr(scaler_client, "health", lambda: {"ok": True, "docker": True, "images": {"gpu": True, "gpu-amd": False}})
    monkeypatch.setattr(scaler_client, "listed", lambda: [])
    monkeypatch.setattr(scaler_client, "spawn", lambda kind, idx=None: calls.append(("spawn", kind, idx)) or {"name": f"orchestra-scaled-{kind}-x-abc123"})
    monkeypatch.setattr(scaler_client, "stop", lambda name: calls.append(("stop", name)) or {"ok": True})
    a = autoscaler.Autoscaler()
    yield a, calls
    enforcement._validator = None


def _worker(wid, url, load=0, idle_for=0, node="gpu-node-1", gpus=None):
    db.upsert_worker({"id": wid, "node_id": node, "worker_type": "gpu", "provider_id": "ollama", "model": "llama3.2",
                      "concurrency": 2, "timeout_sec": 300, "retry_count": 3, "priority": "high", "gpu_vram_gb": 24,
                      "base_url": "", "worker_url": url, "label": wid, "status": "active", "backend": "cuda", "vendor": "nvidia"})
    db.heartbeat_worker(wid, load, 0 if idle_for else 1, 50.0, "active",
                        {"util_pct": load, "vram_used_gb": 1, "vram_total_gb": 24, "gpus": gpus or []})
    if idle_for:
        db.ex("UPDATE workers SET idle_since=? WHERE id=?", (time.time() - idle_for, wid))


def test_a_gpu_worker_starts_from_zero_when_gpu_jobs_wait(scaler):
    a, calls = scaler
    db.set_setting("gpu_worker_kind", "gpu")
    db.ex("INSERT INTO jobs(id, task_type, status) VALUES('J1', 'transcribe', 'queued')")
    a._tick()
    assert calls and calls[0][:2] == ("spawn", "gpu")
    m = db.q1("SELECT labels FROM metrics WHERE metric='autoscale_up'")
    assert m and json.loads(m["labels"])["from_zero"] is True


def test_busy_gpus_get_a_worker_on_the_freest_gpu(scaler):
    a, calls = scaler
    _worker("W-GPU-001", "http://orchestra-worker-gpu-1:7892", load=95, gpus=[
        {"index": 0, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 22, "util_pct": 95, "temp_c": 70},
        {"index": 1, "vendor": "nvidia", "vram_total_gb": 24, "vram_used_gb": 3, "util_pct": 10, "temp_c": 50}])
    a._tick()
    assert calls == [("spawn", "gpu", 1)]


def test_scale_down_stops_only_scaled_workers(scaler):
    a, calls = scaler
    _worker("W-GPU-001", "http://orchestra-worker-gpu-1:7892", idle_for=3600)                       # AXTO Setup's
    _worker("W-GPU-002", "http://orchestra-scaled-gpu-1-abc123:7892", idle_for=3600, node="scaled-x")  # scaled
    a._tick()
    assert ("stop", "orchestra-scaled-gpu-1-abc123") in calls
    assert db.q1("SELECT id FROM workers WHERE id='W-GPU-002'") is None
    assert db.q1("SELECT id FROM workers WHERE id='W-GPU-001'") is not None


def test_noop_starts_nothing_and_records_no_scale_event(monkeypatch):
    monkeypatch.setattr(autoscaler, "SPAWN_TYPE", "noop")
    assert autoscaler.Autoscaler()._spawn_worker("gpu") is False


def test_the_gpu_cap_is_set_on_the_auto_scale_page():
    from fastapi.testclient import TestClient
    import main
    from test_console_api import CONSOLE
    db.init_db()
    enforcement._validator = FakeValidator(PRO)
    try:
        c = TestClient(main.app)
        r = c.put("/api/autoscale/config", headers=CONSOLE, json={"max_gpu": 6, "min": 0})
        assert r.status_code == 200 and r.json()["max_gpu"] == 6 and r.json()["min"] == 0
        assert c.get("/api/autoscale/config", headers=CONSOLE).json()["max_gpu"] == 6
        assert db.get_setting("autoscale_max_gpu") == "6"
        assert c.put("/api/autoscale/config", headers=CONSOLE, json={"max_gpu": 99}).status_code == 400
    finally:
        enforcement._validator = None
