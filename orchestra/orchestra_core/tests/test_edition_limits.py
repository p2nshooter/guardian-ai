# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""Edition limits in Orchestra (AXTO-APPS-BLUEPRINT §3, BLUEPRINT-V4 §29 A4).

The signed licence carries the edition: Starter = 10 workers without autoscaling,
federation or cost analytics; Professional = 50 workers; Enterprise = unlimited.
These tests drive the real FastAPI app with a stand-in licence validator and
check that the API enforces exactly that — with 402/403 answers, never a 500.
Run: cd orchestra/orchestra_core && python -m pytest tests
"""
import os
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="orch-test-")
os.environ["ORCHESTRA_CONSOLE_PASSWORD"] = "console-test-password"
os.environ["ORCHESTRA_WORKER_TOKEN"] = "worker-test-token"

import pytest
from fastapi.testclient import TestClient

import database as db
import enforcement
import license as lic
import main

CONSOLE = {"X-Console-Token": "console-test-password"}
STARTER = {"package": "orchestra_core", "max_nodes": 10, "max_workers": 10, "gpu_workers": True,
           "autoscaler": False, "federation": False, "cost_analytics": False, "edition": "starter"}
PRO = {"package": "orchestra_scale", "max_nodes": 50, "max_workers": 50, "gpu_workers": True, "autoscaler": True,
       "federation": True, "cost_analytics": True, "edition": "professional"}
ENTERPRISE = {"package": "orchestra_unlimited", "max_nodes": -1, "max_workers": -1, "gpu_workers": True,
              "autoscaler": True, "federation": True, "cost_analytics": True}


class FakeValidator:
    def __init__(self, ent, valid=True):
        f = {k: v for k, v in ent.items() if k != "package"}
        self.state = lic.LicenseState(valid=valid, reason="ok" if valid else "revoked", package=ent.get("package", ""),
                                      max_nodes=ent.get("max_nodes", 1), features=f, last_validated=time.time())
        self.valid = valid

    def is_operational(self):
        return self.valid

    def current_state(self):
        return self.state


@pytest.fixture()
def client():
    db.init_db()
    db.ex("DELETE FROM workers")
    yield TestClient(main.app)
    enforcement._validator = None


def use(ent, valid=True):
    enforcement._validator = FakeValidator(ent, valid)


def register(client, wtype="cpu", n=1):
    return [client.post("/api/workers/register", headers=CONSOLE,
                        json={"node_id": "node-1", "type": wtype, "provider_id": "groq", "model": f"m{i}"})
            for i in range(n)]


def test_starter_stops_at_ten_workers(client):
    use(STARTER)
    assert all(r.status_code == 200 for r in register(client, n=10))
    r = register(client)[0]
    assert r.status_code == 402
    assert r.json()["category"] == "WORKER_LIMIT"
    assert "10/10" in r.json()["error"]
    assert r.json()["manage_url"].startswith("https://axto.io/")


def test_removing_a_worker_frees_its_slot(client):
    use(STARTER)
    ids = [r.json()["worker_id"] for r in register(client, n=10)]
    assert client.delete(f"/api/workers/{ids[0]}", headers=CONSOLE).json()["ok"] is True
    assert register(client)[0].status_code == 200


def test_professional_allows_fifty_and_enterprise_has_no_limit(client):
    use(PRO)
    assert all(r.status_code == 200 for r in register(client, n=50))
    assert register(client)[0].status_code == 402
    use(ENTERPRISE)
    assert register(client)[0].status_code == 200


def test_gpu_workers_have_their_own_count(client):
    use(STARTER)
    assert all(r.status_code == 200 for r in register(client, "gpu", n=10))
    assert register(client, "gpu")[0].status_code == 402
    assert register(client, "cpu")[0].status_code == 200


def test_starter_has_no_autoscaling_or_cost_analytics(client):
    use(STARTER)
    for method, path, body in [("post", "/api/autoscaler/toggle", {"enabled": True}),
                               ("post", "/api/autoscaler/settings", {"threshold": 5}),
                               ("post", "/api/autoscaler/scale-up", {"type": "cpu"}),
                               ("post", "/api/autoscaler/scale-down", {}),
                               ("get", "/api/cost/summary", None)]:
        r = getattr(client, method)(path, headers=CONSOLE, **({"json": body} if body is not None else {}))
        assert r.status_code == 402, (path, r.status_code, r.text)
        assert r.json()["category"] == "FEATURE_NOT_LICENSED"
    s = client.get("/api/autoscaler/status", headers=CONSOLE)
    assert s.status_code == 200 and s.json()["licensed"] is False


def test_professional_has_autoscaling_and_cost_analytics(client):
    use(PRO)
    assert client.get("/api/cost/summary", headers=CONSOLE).status_code == 200
    assert client.post("/api/autoscaler/settings", headers=CONSOLE, json={"threshold": 5}).status_code == 200
    assert client.get("/api/autoscaler/status", headers=CONSOLE).json()["licensed"] is True


def test_autoscaler_never_spawns_beyond_the_edition(client, monkeypatch):
    use(STARTER | {"autoscaler": True})          # switch on, but only 10 workers
    db.set_setting("autoscale_enabled", "true")
    db.set_setting("autoscale_max_cpu", "100")
    db.set_setting("autoscale_threshold", "0")
    register(client, n=10)
    monkeypatch.setattr(db, "get_queue_snapshot", lambda: {"depth": 99, "running": 0})
    spawned = []
    a = main.get_autoscaler()
    monkeypatch.setattr(a, "_spawn_worker", lambda t="cpu": spawned.append(t) or True)
    a._last_scale_up = 0
    a._tick()
    assert spawned == [], "already at the edition's 10 workers"
    use(STARTER)                                  # autoscaling not in the edition
    db.ex("DELETE FROM workers")
    a._last_scale_up = 0
    a._tick()
    assert spawned == []
    use(PRO)
    a._last_scale_up = 0
    a._tick()
    assert spawned == ["cpu"]


def test_inactive_licence_answers_403_not_500(client):
    use(STARTER, valid=False)
    r = register(client)[0]
    assert r.status_code == 403
    assert r.json()["manage_url"].startswith("https://axto.io/")
    assert client.get("/api/cost/summary", headers=CONSOLE).status_code == 403


def test_unknown_worker_type_is_refused(client):
    use(ENTERPRISE)
    r = register(client, "tpu")[0]
    assert r.status_code == 400 and r.json()["category"] == "BAD_WORKER_TYPE"


def test_worker_list_carries_the_type_the_console_counts(client):
    use(STARTER)
    register(client, "cpu", n=2)
    register(client, "gpu")
    types = sorted(w["type"] for w in client.get("/api/workers", headers=CONSOLE).json()["workers"])
    assert types == ["cpu", "cpu", "gpu"]
