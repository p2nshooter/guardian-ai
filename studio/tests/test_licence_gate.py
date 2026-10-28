# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""AXTO Studio can be downloaded by anyone but used only with an official licence
(owner, 28 Oct 2026): without one, every route except /health and the dashboard page is refused, the chat WebSocket included; verified offline grace ends after four hours."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
_tmp = tempfile.mkdtemp(prefix="studio-test-")
for _v in ("DATA_DIR", "STUDIO_DATA_DIR"):
    os.environ.setdefault(_v, _tmp)

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from src import api


def _routes():
    for r in api.app.routes:
        if isinstance(r, APIRoute):
            for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
                path = r.path
                for p in r.param_convertors:
                    path = path.replace("{" + p + "}", "x1")
                yield m, path


from src import license as lic


@pytest.fixture()
def client(monkeypatch):
    saved = lic._state
    yield TestClient(api.app, raise_server_exceptions=False)
    lic._state = saved


def test_every_route_is_locked_without_a_licence(client):
    for error in ("no_license_key", "expired", "server_unreachable_no_verified_cache"):
        lic._state = lic.LicenseState(valid=False, error=error)
        checked = 0
        for method, path in _routes():
            if path in ("/health", "/"):
                continue
            r = client.request(method, path, json={})
            assert r.status_code == 403, f"{method} {path} answered {r.status_code} without a licence"
            checked += 1
        assert checked >= 6


def test_the_chat_socket_needs_a_licence(client):
    lic._state = lic.LicenseState(valid=False, error="no_license_key")
    with client.websocket_connect("/ws/chat") as ws:
        assert ws.receive_json() == {"error": "License invalid"}


def test_grace_ends_after_four_hours(client):
    import time
    lic._state = lic.LicenseState(valid=True, grace_active=True, last_success=time.time() - lic.GRACE_SECONDS - 5)
    assert client.get("/api/status").status_code == 403
    lic._state = lic.LicenseState(valid=True, grace_active=True, last_success=time.time() - 60)
    assert client.get("/api/status").status_code != 403
