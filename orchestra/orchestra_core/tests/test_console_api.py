# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""The API behind the Orchestra console's pages (BLUEPRINT-V4 §29): Local Chat and
the Multi-AI tester (/api/chat/direct), manual scaling (/api/workers/scale), the
Auto-Scale & thermal rules (/api/autoscale/config), GPU temperature in the worker
heartbeat, thermal rerouting and GPU detection on a node. Before §29 the console
called these paths and none of them existed."""
import io
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
from fastapi.testclient import TestClient

import ai_providers
import autoscale_config
import credential_vault
import database as db
import enforcement
import license as lic
import main
import routing_engine

CONSOLE = {"X-Console-Token": os.environ["ORCHESTRA_CONSOLE_PASSWORD"]}
WORKER = {"X-Orchestra-Worker-Token": os.environ["ORCHESTRA_WORKER_TOKEN"]}
STARTER = {"max_nodes": 10, "max_workers": 10, "gpu_workers": True, "autoscaler": False,
           "federation": False, "cost_analytics": False}
PRO = {"max_nodes": 50, "max_workers": 50, "gpu_workers": True, "autoscaler": True,
       "federation": True, "cost_analytics": True}


class FakeValidator:
    def __init__(self, features):
        self.state = lic.LicenseState(valid=True, reason="ok", package="orchestra_test",
                                      max_nodes=features["max_nodes"], features=features, last_validated=time.time())

    def is_operational(self):
        return True

    def current_state(self):
        return self.state


@pytest.fixture()
def client():
    db.init_db()
    for t in ("workers", "metrics", "cost_events"):
        db.ex(f"DELETE FROM {t}")
    db.set_setting(autoscale_config.CONFIG_KEY, "")
    db.set_setting("autoscale_enabled", "false")
    enforcement._validator = FakeValidator(PRO)
    yield TestClient(main.app)
    enforcement._validator = None


def use(features):
    enforcement._validator = FakeValidator(features)


def gpu(client, n=1, **extra):
    """n more GPU workers, each at its own address (the same address is the same worker)."""
    ids = []
    for _ in range(n):
        taken = {w["worker_url"] for w in db.q("SELECT worker_url FROM workers")}
        i = next(i for i in range(10_000) if f"http://gpu-{i}:7892" not in taken)
        r = client.post("/api/workers/register", headers=CONSOLE, json={
            "node_id": "node-gpu", "type": "gpu", "provider_id": "ollama", "model": "llama3.2",
            "worker_url": f"http://gpu-{i}:7892", "vram_gb": 24, **extra})
        assert r.status_code == 200, r.text
        ids.append(r.json()["worker_id"])
    return ids


# ── Local Chat / Multi-AI tester ─────────────────────────────────────────────

def test_direct_chat_uses_the_vault_key_and_lands_in_the_cost_tracker(client, monkeypatch):
    calls = []
    monkeypatch.setattr(credential_vault, "get_key", lambda pid: "sk-test" if pid == "openai" else None)

    def fake_dispatch(pid, key, model, messages, max_tokens, temperature, base_url, timeout):
        calls.append((pid, key, model, messages))
        return {"ok": True, "content": "Hello!", "input_tokens": 900, "output_tokens": 100,
                "latency_ms": 12, "model_used": model}

    monkeypatch.setattr(ai_providers, "dispatch", fake_dispatch)
    r = client.post("/api/chat/direct", headers=CONSOLE, json={
        "provider": "openai", "model": "gpt-4o-mini",
        "messages": [{"role": "system", "content": "Be brief"}, {"role": "user", "content": "Hi"}]})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["content"] == "Hello!" and d["input_tokens"] == 900 and d["output_tokens"] == 100
    assert calls[0][:3] == ("openai", "sk-test", "gpt-4o-mini")
    assert d["cost_usd"] == pytest.approx(routing_engine.get_cost_estimate("openai", "gpt-4o-mini", 1000))
    spent = db.q1("SELECT provider_id, model, cost_usd, caller_id FROM cost_events")
    assert spent == {"provider_id": "openai", "model": "gpt-4o-mini", "cost_usd": pytest.approx(d["cost_usd"]),
                     "caller_id": "console"}


def test_direct_chat_explains_what_is_missing(client, monkeypatch):
    monkeypatch.setattr(credential_vault, "get_key", lambda pid: None)
    monkeypatch.setattr(ai_providers, "dispatch", lambda *a, **k: {"ok": False, "error": "HTTP 401"})
    ok_msgs = [{"role": "user", "content": "Hi"}]
    r = client.post("/api/chat/direct", headers=CONSOLE, json={"provider": "openai", "messages": ok_msgs})
    assert r.status_code == 400 and "Credential Vault" in r.json()["detail"]
    r = client.post("/api/chat/direct", headers=CONSOLE, json={"provider": "nope", "messages": ok_msgs})
    assert r.status_code == 400
    r = client.post("/api/chat/direct", headers=CONSOLE,
                    json={"provider": "ollama", "messages": [{"role": "tool", "content": "x"}]})
    assert r.status_code == 400
    r = client.post("/api/chat/direct", headers=CONSOLE, json={"provider": "ollama", "messages": ok_msgs})
    assert r.status_code == 502 and "HTTP 401" in r.json()["detail"]
    assert client.post("/api/chat/direct", json={"provider": "ollama", "messages": ok_msgs}).status_code == 401


# ── Manual scaling ────────────────────────────────────────────────────────────

def test_manual_scale_clones_the_template_within_the_edition(client):
    use(STARTER)
    first = gpu(client)[0]
    r = client.post("/api/workers/scale", headers=CONSOLE, json={"action": "add", "template_worker_id": first})
    assert r.status_code == 200, r.text
    clone = r.json()["worker"]
    assert clone["worker_type"] == "gpu" and clone["model"] == "llama3.2" and clone["worker_url"] == "http://gpu-0:7892"
    gpu(client, 8)                                              # 10 GPU workers now
    r = client.post("/api/workers/scale", headers=CONSOLE, json={"action": "add", "template_worker_id": first})
    assert r.status_code == 402 and r.json()["category"] == "WORKER_LIMIT"
    r = client.post("/api/workers/scale", headers=CONSOLE, json={"action": "remove"})
    assert r.status_code == 200 and r.json()["ok"] is True
    assert len(client.get("/api/workers", headers=CONSOLE).json()["workers"]) == 9
    assert client.post("/api/workers/scale", headers=CONSOLE,
                       json={"action": "add", "template_worker_id": "W-NONE"}).status_code == 404


# ── Auto-Scale & thermal rules ────────────────────────────────────────────────

def test_autoscale_rules_are_saved_and_validated(client):
    d = client.get("/api/autoscale/config", headers=CONSOLE).json()
    assert d["up"] == 75 and d["crit"] == 82 and d["licensed"] is True and d["scale_events_24h"] == 0
    body = {"enabled": True, "up": 80, "down": 15, "min": 2, "cool": 90, "thermal": True,
            "warn": 70, "crit": 80, "kill": 88, "strat": "load_balanced"}
    r = client.put("/api/autoscale/config", headers=CONSOLE, json=body)
    assert r.status_code == 200, r.text
    d = client.get("/api/autoscale/config", headers=CONSOLE).json()
    assert {k: d[k] for k in body} == body
    assert db.get_setting("autoscale_enabled") == "true"
    bad = client.put("/api/autoscale/config", headers=CONSOLE, json={**body, "crit": 92, "kill": 90})
    assert bad.status_code == 400 and "warning < critical" in bad.json()["detail"]
    assert client.put("/api/autoscale/config", headers=CONSOLE, json={**body, "strat": "x"}).status_code == 400
    assert client.put("/api/autoscale/config", headers=CONSOLE, json={**body, "up": 40, "down": 45}).status_code == 400
    clamped = client.put("/api/autoscale/config", headers=CONSOLE, json={**body, "cool": 5}).json()
    assert clamped["cool"] == 30                                  # out-of-range values are brought into range


def test_starter_keeps_thermal_rules_but_cannot_switch_autoscaling_on(client):
    use(STARTER)
    assert client.get("/api/autoscale/config", headers=CONSOLE).json()["licensed"] is False
    r = client.put("/api/autoscale/config", headers=CONSOLE, json={"enabled": True})
    assert r.status_code == 402 and r.json()["category"] == "FEATURE_NOT_LICENSED"
    r = client.put("/api/autoscale/config", headers=CONSOLE, json={"enabled": False, "crit": 78})
    assert r.status_code == 200 and r.json()["crit"] == 78


# ── GPU temperature: heartbeat, pause, rerouting ──────────────────────────────

def beat(client, wid, temp):
    r = client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER, json={"load_pct": 10, "tasks_active": 1, "temp_c": temp})
    assert r.status_code == 200, r.text
    return r.json()["status"]


def test_a_gpu_at_the_shutdown_temperature_is_paused_until_it_cools(client):
    wid = gpu(client)[0]
    assert beat(client, wid, 70) == "active"
    assert beat(client, wid, 91) == "paused"                     # ≥ kill (90)
    assert beat(client, wid, 85) == "paused"                     # still ≥ crit (82)
    assert beat(client, wid, 75) == "active"                     # back below crit
    w = next(w for w in client.get("/api/workers", headers=CONSOLE).json()["workers"] if w["id"] == wid)
    assert w["temp_c"] == 75 and w["type"] == "gpu" and w["vram_gb"] == 24
    assert client.get("/api/autoscale/config", headers=CONSOLE).json()["thermal_pauses_24h"] == 1


def test_jobs_go_to_the_coolest_gpu_when_one_is_hot(client):
    hot, cool, warm = gpu(client, 3)
    beat(client, hot, 86)
    beat(client, cool, 55)
    beat(client, warm, 74)
    workers = db.get_active_workers()
    chosen = routing_engine.select_worker(workers, task_type="image", gpu_required=True)
    assert chosen["id"] == cool
    assert client.get("/api/autoscale/config", headers=CONSOLE).json()["thermal_reroutes_24h"] == 1
    client.put("/api/autoscale/config", headers=CONSOLE, json={"thermal": False})
    assert routing_engine.select_worker(workers, task_type="image", gpu_required=True) is not None


def test_a_warm_gpu_ranks_after_a_cool_one_but_stays_usable(client):
    warm, cool = gpu(client, 2)
    beat(client, warm, 75)                                       # ≥ warn (72), < crit
    beat(client, cool, 50)
    workers = db.get_active_workers()
    assert routing_engine.select_worker(workers, task_type="image", gpu_required=True)["id"] == cool
    only_warm = [w for w in workers if w["id"] == warm]
    assert routing_engine.select_worker(only_warm, task_type="image", gpu_required=True)["id"] == warm


# ── Autoscaler on GPU load ────────────────────────────────────────────────────

def test_autoscaler_adds_a_gpu_above_the_load_and_keeps_the_minimum(client, monkeypatch):
    client.put("/api/autoscale/config", headers=CONSOLE, json={"enabled": True, "up": 60, "down": 20, "min": 1})
    a = main.get_autoscaler()
    spawned = []
    monkeypatch.setattr(a, "_spawn_worker", lambda t="cpu": spawned.append(t) or True)
    monkeypatch.setattr(db, "get_queue_snapshot", lambda: {"depth": 0, "running": 0})
    drained = []
    monkeypatch.setattr(a, "_drain_worker", lambda w: drained.append(w["id"]))
    (wid,) = gpu(client)
    client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER, json={"load_pct": 90, "tasks_active": 4})
    a._last_scale_up = a._last_scale_down = 0
    a._tick()
    assert spawned == ["gpu"]
    client.post(f"/api/workers/{wid}/heartbeat", headers=WORKER, json={"load_pct": 0, "tasks_active": 0})
    a._last_scale_up = a._last_scale_down = 0
    a._tick()
    assert drained == [], "the only GPU worker is the minimum"


# ── GPU detection on a node ───────────────────────────────────────────────────

def test_detect_gpu_asks_the_nodes_gpu_worker(client, monkeypatch):
    gpu(client)
    import urllib.request

    def fake_urlopen(url, timeout=0):
        assert url == "http://gpu-0:7892/gpu/status"
        body = {"gpu": {"vendor": "nvidia", "driver": "560.35",
                        "gpus": [{"name": "NVIDIA RTX 4090", "vram_gb": 24.0, "driver": "560.35"}]}}
        return io.BytesIO(json.dumps(body).encode())

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    d = client.post("/api/nodes/node-gpu/detect_gpu", headers=CONSOLE).json()
    assert d["gpus"] == [{"name": "NVIDIA RTX 4090", "vendor": "nvidia", "vram_gb": 24.0, "driver": "560.35"}]
    d = client.post("/api/nodes/node-cpu/detect_gpu", headers=CONSOLE).json()
    assert d["gpus"] == [] and "orchestra-worker-gpu" in d["note"]


def test_every_api_path_the_console_calls_exists():
    html = open(os.path.join(os.path.dirname(HERE), "console", "index.html"), encoding="utf-8").read()
    import re
    calls = set(re.findall(r"api\('(GET|POST|PUT|DELETE)','(/[^'?]*)", html))
    calls |= {("GET", p) for p in re.findall(r"fetch\('(/api/[^'?]+)", html)}
    routes = [(m, r.path) for r in main.app.routes for m in getattr(r, "methods", ())]

    def served(method, path):
        for m, rp in routes:
            pattern = "^" + re.sub(r"\{[^}]+\}", "[^/]+", rp) + "$"
            # A path the console builds ('/api/nodes/'+id+'/detect_gpu') is checked by its prefix.
            if m == method and (re.match(pattern, path) or (path.endswith("/") and rp.startswith(path))):
                return True
        return False

    missing = sorted(f"{m} {p}" for m, p in calls if not served(m, p))
    assert not missing, f"the console calls paths Orchestra Core does not serve: {missing}"
