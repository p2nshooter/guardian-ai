# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""AXTO Sentinel can be downloaded by anyone but used only with an official licence
(owner, 28 Oct 2026). Every route except /health and the dashboard page answers 403
until a licence validates; there is no free window after a (re)start."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("SENTINEL_CONFIG", os.path.join(tempfile.mkdtemp(prefix="sentinel-test-"), "missing.yml"))

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from src import api
from src.license import LicenseState


def _routes():
    for r in api.app.routes:
        if isinstance(r, APIRoute):
            for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
                path = r.path
                for p in r.param_convertors:
                    path = path.replace("{" + p + "}", "x1")
                yield m, path


def _call(c, method, path):
    return c.request(method, path, json={}, headers={"X-Sentinel-Key": "k"})


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(api, "_config", {"sentinel": {"api_key": "k"}})
    monkeypatch.setattr(api, "_engine", None)
    return TestClient(api.app, raise_server_exceptions=False)


def test_every_route_is_locked_without_a_licence(client, monkeypatch):
    for reason in ("no_license_key", "invalid", "expired", "server_unreachable_no_verified_cache", "product_mismatch"):
        monkeypatch.setattr(api, "_lic_state", LicenseState(valid=False, reason=reason))
        checked = 0
        for method, path in _routes():
            r = _call(client, method, path)
            if path in api.OPEN_PATHS:
                assert r.status_code != 403, f"{method} {path} must stay open"
                continue
            assert r.status_code == 403, f"{method} {path} answered {r.status_code} without a licence ({reason})"
            body = r.json()["detail"]
            assert body["error"] == "license_inactive" and body["reason"] == reason
            checked += 1
        assert checked >= 14
    assert client.get("/health").json()["status"] == "locked"


def test_a_valid_licence_or_verified_grace_opens_the_routes(client, monkeypatch):
    for reason in ("", "lifetime_offline", "offline_grace"):
        monkeypatch.setattr(api, "_lic_state", LicenseState(valid=True, reason=reason))
        r = _call(client, "GET", "/v1/dashboard")
        assert r.status_code != 403, "past the licence gate, the engine answers"
    assert client.get("/health").json()["status"] == "grace_period"


def test_no_free_window_after_start_or_restart(monkeypatch):
    """The real validator with no key: locked at once, and still locked after a restart."""
    class Stub:
        async def check(self): return False
        async def get_stats(self): return {}

    class Dummy:
        _frameworks = []
        _running = False
        clamav = learning = Stub()
        def __init__(self, *a, **k): pass
        async def start(self): pass
        async def init(self): pass
        async def stop(self): pass
    monkeypatch.setattr(api, "SentinelEngine", Dummy)
    async def no_heartbeat(): pass
    monkeypatch.setattr(api, "_heartbeat", no_heartbeat)
    
    for _ in range(2):  # start, then restart
        with TestClient(api.app, raise_server_exceptions=False) as c:
            assert api._lic_state.valid is False and api._lic_state.reason == "no_license_key"
            assert api._lic_state.grace_start == 0
            assert c.get("/v1/dashboard").status_code == 403
            assert c.get("/health").json()["status"] == "locked"
