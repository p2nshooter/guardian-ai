# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""GPU suggestions (owner, 28 Oct 2026: "ada notif saran gpu mana yg tersedia"):
which GPU can take work now, best first, and what needs attention — hot, paused,
silent, all busy (with the slots the edition still allows), idle, none at all."""
import os
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))
os.environ.setdefault("ORCHESTRA_CONSOLE_PASSWORD", "console-test-password")
os.environ.setdefault("ORCHESTRA_WORKER_TOKEN", "worker-test-token")

from gpu_advisor import advise, UNLIMITED

NOW = 1_800_000_000.0
CFG = {"enabled": False, "up": 75, "down": 20, "min": 1, "cool": 60, "thermal": True,
       "warn": 72, "crit": 82, "kill": 90, "strat": "coolest_first"}


def gpu(i, load=10, temp=55, vram=24, status="active", seen=5, label=""):
    return {"id": f"W-GPU-{i:03d}", "worker_type": "gpu", "load_pct": load, "temp_c": temp, "gpu_vram_gb": vram,
            "status": status, "last_heartbeat": NOW - seen, "label": label, "model": "llama3.2"}


def codes(r):
    return [n["code"] for n in r["notices"]]


def test_the_free_gpu_is_named_with_its_facts_and_ranked_first():
    r = advise([gpu(1, load=60, temp=70), gpu(2, load=5, temp=48, label="RTX 4090"), gpu(3, load=20, temp=65)], CFG, 10, NOW)
    assert [g["id"] for g in r["best"]] == ["W-GPU-002", "W-GPU-003", "W-GPU-001"]
    free = next(n for n in r["notices"] if n["code"] == "gpu_available")
    assert free["worker_id"] == "W-GPU-002" and "RTX 4090" in free["title"]
    assert "5% load" in free["text"] and "48°C" in free["text"] and "24 GB VRAM" in free["text"]
    assert "1 more free" in free["text"]
    assert r["summary"]["slots_left"] == 7


def test_heat_paused_and_silent_gpus_are_flagged_and_left_out():
    r = advise([gpu(1, temp=75), gpu(2, temp=85), gpu(3, temp=91, status="paused"), gpu(4, seen=300), gpu(5, temp=50)],
               CFG, 10, NOW)
    assert [g["id"] for g in r["best"]] == ["W-GPU-005", "W-GPU-001"], "hot, paused and silent GPUs take no work"
    assert codes(r)[:2] == ["gpu_paused", "gpu_hot"], "critical first"
    assert {"gpu_warm", "gpu_offline", "gpu_available"} <= set(codes(r))
    hot = next(n for n in r["notices"] if n["code"] == "gpu_hot")
    assert "W-GPU-005" in hot["text"], "says where the next jobs go"
    assert len({n["id"] for n in r["notices"]}) == len(r["notices"]), "stable, unique ids"


def test_all_busy_says_what_to_do_within_the_edition():
    busy = [gpu(1, load=90), gpu(2, load=85)]
    assert "2 GPU slot(s) left" in next(n for n in advise(busy, CFG, 4, NOW)["notices"] if n["code"] == "all_busy")["text"]
    full = next(n for n in advise(busy, CFG, 2, NOW)["notices"] if n["code"] == "all_busy")["text"]
    assert "all 2 GPU slots" in full and "upgrade" in full
    auto = next(n for n in advise(busy, {**CFG, "enabled": True}, UNLIMITED, NOW)["notices"] if n["code"] == "all_busy")["text"]
    assert "Auto-Scale adds a GPU worker" in auto and "slot" not in auto
    assert "all_busy" not in codes(advise([gpu(1, load=50), gpu(2, load=40)], CFG, 4, NOW))


def test_idle_and_empty_pools():
    assert "gpu_idle" in codes(advise([gpu(1, load=2), gpu(2, load=3)], CFG, 10, NOW))
    assert "gpu_idle" not in codes(advise([gpu(1, load=2), gpu(2, load=3)], {**CFG, "enabled": True}, 10, NOW))
    r = advise([], CFG, 10, NOW)
    assert codes(r) == ["no_gpu"] and r["best"] == []


def test_the_console_endpoint_reads_real_workers():
    import pytest
    from fastapi.testclient import TestClient
    import database as db
    import enforcement
    import license as lic
    import main

    class V:
        state = lic.LicenseState(valid=True, reason="ok", package="orchestra_scale", max_nodes=50,
                                 features={"max_nodes": 50, "max_workers": 50, "gpu_workers": True},
                                 last_validated=time.time())
        def is_operational(self): return True
        def current_state(self): return self.state

    db.init_db()
    db.ex("DELETE FROM workers")
    enforcement._validator = V()
    try:
        c = TestClient(main.app)
        h = {"X-Console-Token": os.environ["ORCHESTRA_CONSOLE_PASSWORD"]}
        assert c.get("/api/gpu/advice").status_code == 401
        r = c.post("/api/workers/register", headers=h, json={"node_id": "n1", "type": "gpu", "provider_id": "ollama",
                                                              "model": "llama3.2", "vram_gb": 24, "worker_url": "http://g:7892"})
        assert r.status_code == 200, r.text
        d = c.get("/api/gpu/advice", headers=h).json()
        assert d["best"][0]["id"] == r.json()["worker_id"] and d["summary"]["slots_left"] == 49
        assert "gpu_available" in [n["code"] for n in d["notices"]]
    finally:
        enforcement._validator = None
