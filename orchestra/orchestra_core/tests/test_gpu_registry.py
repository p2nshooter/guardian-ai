"""What GPU workers tell Orchestra Core, and what Core keeps (REQUESTS 136, BLUEPRINT-V4 §31.F G1):
brand, card, backend, driver and capabilities at registration; live per-GPU telemetry with every
heartbeat; the same worker keeps its row across restarts; a worker Core lost registers again;
an upgraded database gets the new columns; the GPU suggestions read the new data."""
import os
import sqlite3
import subprocess
import sys
import tempfile
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))
os.environ.setdefault("ORCHESTRA_CONSOLE_PASSWORD", "console-test-password")
os.environ.setdefault("ORCHESTRA_WORKER_TOKEN", "worker-test-token")

import pytest
from fastapi.testclient import TestClient

import database as db
import enforcement
import main
from gpu_advisor import advise
from test_console_api import CONSOLE, PRO, FakeValidator

WORKER = {"X-Orchestra-Worker-Token": os.environ["ORCHESTRA_WORKER_TOKEN"]}
REG = {"node_id": "gpu-node-1", "type": "gpu", "provider_id": "ollama", "model": "llama3.2",
       "worker_url": "http://orchestra-worker-gpu-1:7892", "gpu_vram_gb": 40,
       "vendor": "nvidia", "gpu_name": "NVIDIA GeForce RTX 4090 ×2", "backend": "cuda", "gpu_count": 2,
       "driver": "560.35.03", "capabilities": ["chat", "cuda_inference", "large_models"],
       "usable": True, "wsl": False, "access_note": "", "worker_version": "2.1.0"}
HB = {"load_pct": 50, "tasks_active": 1, "temp_c": 64.0, "util_pct": 45.0, "vram_used_gb": 18.5,
      "vram_total_gb": 40.0, "power_w": 312.6, "throttled": False, "gpu_count": 2,
      "gpus": [{"index": 0, "name": "NVIDIA GeForce RTX 4090", "temp_c": 64.0, "util_pct": 87.0},
               {"index": 1, "name": "NVIDIA RTX A4000", "temp_c": 41.0, "util_pct": 3.0}]}


@pytest.fixture()
def client():
    db.init_db()
    for t in ("workers", "metrics"):
        db.ex(f"DELETE FROM {t}")
    enforcement._validator = FakeValidator(PRO)
    yield TestClient(main.app)
    enforcement._validator = None


def _workers(client):
    return client.get("/api/workers", headers=CONSOLE).json()["workers"]


def test_registration_keeps_brand_card_backend_driver_and_capabilities(client):
    r = client.post("/api/workers/register", headers=CONSOLE, json=REG).json()
    w = next(x for x in _workers(client) if x["id"] == r["worker_id"])
    assert w["vendor"] == "nvidia" and w["gpu_name"] == "NVIDIA GeForce RTX 4090 ×2"
    assert w["backend"] == "cuda" and w["gpu_count"] == 2 and w["driver"] == "560.35.03"
    assert w["capabilities"] == ["chat", "cuda_inference", "large_models"]
    assert w["usable"] is True and w["wsl"] is False and w["worker_version"] == "2.1.0"
    assert w["telemetry"] is False                      # nothing measured yet


def test_the_same_worker_keeps_its_row_after_a_restart(client):
    first = client.post("/api/workers/register", headers=CONSOLE, json=REG).json()["worker_id"]
    again = client.post("/api/workers/register", headers=CONSOLE, json={**REG, "gpu_count": 1}).json()
    assert again["worker_id"] == first and again["reused"] is True
    assert len(_workers(client)) == 1 and _workers(client)[0]["gpu_count"] == 1
    other = client.post("/api/workers/register", headers=CONSOLE,
                        json={**REG, "worker_url": "http://orchestra-worker-gpu-2:7892"}).json()["worker_id"]
    assert other != first and len(_workers(client)) == 2


def test_heartbeat_stores_live_telemetry_of_every_gpu(client):
    wid = client.post("/api/workers/register", headers=CONSOLE, json=REG).json()["worker_id"]
    r = client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER, json=HB).json()
    assert r == {"ok": True, "status": "active"}
    w = _workers(client)[0]
    assert w["telemetry"] is True and w["temp_c"] == 64.0 and w["util_pct"] == 45.0
    assert w["vram_used_gb"] == 18.5 and w["vram_gb"] == 40.0 and w["power_w"] == 312.6
    assert [g["name"] for g in w["gpus"]] == ["NVIDIA GeForce RTX 4090", "NVIDIA RTX A4000"]
    # A sensor that stops reporting shows as no data, not as the last value.
    client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER,
                json={**HB, "temp_c": None, "util_pct": None, "vram_used_gb": None, "gpus": []})
    w = _workers(client)[0]
    assert w["temp_c"] is None and w["util_pct"] is None and w["gpus"] == []


def test_a_throttle_is_recorded_once(client):
    wid = client.post("/api/workers/register", headers=CONSOLE, json=REG).json()["worker_id"]
    for _ in range(3):
        client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER, json={**HB, "throttled": True})
    assert _workers(client)[0]["throttled"] is True
    assert db.q1("SELECT COUNT(*) AS n FROM metrics WHERE metric='gpu_throttled'")["n"] == 1


def test_an_old_worker_heartbeat_still_works(client):
    wid = client.post("/api/workers/register", headers=CONSOLE, json={k: REG[k] for k in
                      ("node_id", "type", "provider_id", "model", "worker_url", "gpu_vram_gb")}).json()["worker_id"]
    assert client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER,
                       json={"load_pct": 10, "tasks_active": 0, "temp_c": 50}).json()["ok"] is True
    w = _workers(client)[0]
    assert w["temp_c"] == 50 and w["vendor"] == "" and w["usable"] is True


def test_a_worker_core_does_not_know_is_asked_to_register_again(client):
    r = client.post("/api/workers/W-GPU-404/heartbeat", headers=WORKER, json=HB).json()
    assert r == {"ok": False, "reregister": True}
    assert client.post("/api/workers/W-GPU-404/heartbeat", json=HB).status_code == 401


def test_suggestions_use_real_utilisation_free_vram_and_say_why_a_gpu_is_unusable():
    now = 1_800_000_000.0
    cfg = {"enabled": False, "up": 75, "down": 20, "min": 1, "cool": 60, "thermal": True,
           "warn": 72, "crit": 82, "kill": 90, "strat": "coolest_first"}
    base = {"worker_type": "gpu", "status": "active", "last_heartbeat": now - 5, "model": "llama3.2",
            "telemetry_at": now - 5, "usable": 1}
    busy_elsewhere = {**base, "id": "W-GPU-001", "load_pct": 0, "util_pct": 96, "temp_c": 60, "gpu_vram_gb": 24,
                      "vram_total_gb": 24, "vram_used_gb": 23, "gpu_name": "NVIDIA GeForce RTX 4090"}
    free = {**base, "id": "W-GPU-002", "load_pct": 0, "util_pct": 2, "temp_c": 45, "gpu_vram_gb": 16,
            "vram_total_gb": 16, "vram_used_gb": 1, "gpu_name": "NVIDIA RTX A4000"}
    blocked = {**base, "id": "W-GPU-003", "load_pct": 0, "temp_c": None, "telemetry_at": None, "usable": 0,
               "access_note": "AMD Radeon RX 7900 XTX: needs /dev/kfd and /dev/dri in the container (compose profile gpu-amd)"}
    silent = {**base, "id": "W-GPU-004", "load_pct": 0, "temp_c": None, "telemetry_at": None, "gpu_vram_gb": 8}
    r = advise([busy_elsewhere, free, blocked, silent], cfg, 10, now)
    # A GPU kept at 96 % by another program is not "free", even with no Orchestra job on it.
    assert r["best"][0]["id"] == "W-GPU-002" and "W-GPU-003" not in [g["id"] for g in r["best"]]
    assert "NVIDIA RTX A4000" in r["best"][0]["facts"] and "15/16 GB VRAM free" in r["best"][0]["facts"]
    codes = {(n["code"], n["worker_id"]) for n in r["notices"]}
    assert ("vram_full", "W-GPU-001") in codes
    assert ("gpu_not_usable", "W-GPU-003") in codes and ("gpu_no_telemetry", "W-GPU-004") in codes
    note = next(n for n in r["notices"] if n["code"] == "gpu_not_usable")
    assert "gpu-amd" in note["text"] and "CPU" in note["text"]


OLD_V6 = """
CREATE TABLE _schema_version (version INTEGER NOT NULL, applied_at REAL DEFAULT 0);
INSERT INTO _schema_version(version) VALUES (6);
CREATE TABLE workers (
    id TEXT PRIMARY KEY, node_id TEXT NOT NULL DEFAULT '', worker_type TEXT NOT NULL DEFAULT 'cpu',
    provider_id TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', concurrency INTEGER DEFAULT 5,
    timeout_sec INTEGER DEFAULT 60, retry_count INTEGER DEFAULT 3, priority TEXT DEFAULT 'normal',
    gpu_vram_gb REAL DEFAULT 0, base_url TEXT DEFAULT '', worker_url TEXT DEFAULT '', label TEXT DEFAULT '',
    status TEXT DEFAULT 'active', load_pct INTEGER DEFAULT 0, tasks_active INTEGER DEFAULT 0,
    tasks_total INTEGER DEFAULT 0, tasks_done INTEGER DEFAULT 0, tasks_error INTEGER DEFAULT 0,
    avg_latency_ms REAL DEFAULT 0, error_rate REAL DEFAULT 0, circuit_state TEXT DEFAULT 'closed',
    circuit_open_at REAL DEFAULT NULL, idle_since REAL DEFAULT NULL, temp_c REAL DEFAULT NULL,
    last_heartbeat REAL NOT NULL DEFAULT 0, registered_at REAL NOT NULL DEFAULT 0);
INSERT INTO workers(id, node_id, worker_type, model, worker_url) VALUES ('W-GPU-001', 'gpu-node-1', 'gpu', 'llama3.2', 'http://g:7892');
"""


def test_an_existing_v6_database_gets_the_new_columns_and_keeps_its_workers(tmp_path):
    con = sqlite3.connect(tmp_path / "orchestra.db")
    con.executescript(OLD_V6)
    con.commit(); con.close()
    code = textwrap.dedent("""
        import database as db
        db.init_db()
        cols = {r["name"] for r in db.q("PRAGMA table_info(workers)")}
        missing = [c for c, _ in db.WORKER_GPU_COLUMNS if c not in cols]
        w = db.q1("SELECT * FROM workers WHERE id='W-GPU-001'")
        print(missing, w["model"], w["vendor"] == "", w["usable"], db.q1("SELECT MAX(version) AS v FROM _schema_version")["v"])
    """)
    out = subprocess.run([sys.executable, "-c", code], cwd=os.path.dirname(HERE), capture_output=True, text=True,
                         env={**os.environ, "DATA_DIR": str(tmp_path)}, timeout=60)
    assert out.returncode == 0, out.stderr
    assert out.stdout.strip() == "[] llama3.2 True 1 7"


def test_a_gpu_with_full_memory_is_never_the_suggested_one():
    now = 1_800_000_000.0
    cfg = {"enabled": False, "up": 75, "min": 1, "cool": 60, "thermal": True, "warn": 72, "crit": 82, "kill": 90,
           "strat": "coolest_first"}
    base = {"worker_type": "gpu", "status": "active", "last_heartbeat": now - 5, "telemetry_at": now - 5, "usable": 1}
    full = {**base, "id": "W-GPU-001", "load_pct": 0, "util_pct": 0, "temp_c": 35, "vram_total_gb": 16, "vram_used_gb": 15.5}
    warm = {**base, "id": "W-GPU-002", "load_pct": 20, "util_pct": 25, "temp_c": 66, "vram_total_gb": 24, "vram_used_gb": 4}
    r = advise([full, warm], cfg, 10, now)
    assert [g["id"] for g in r["best"]] == ["W-GPU-002", "W-GPU-001"]
    free = next(n for n in r["notices"] if n["code"] == "gpu_available")
    assert free["worker_id"] == "W-GPU-002" and "more free" not in free["text"]
