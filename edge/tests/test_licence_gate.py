# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""AXTO Edge can be downloaded by anyone but used only with an official licence
(owner, 28 Oct 2026): without one, every route except the activation page, /activate, /health and /support is refused — the customer gateway and the usage WebSocket included."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
_tmp = tempfile.mkdtemp(prefix="edge-test-")
for _v in ("DATA_DIR", "EDGE_DATA_DIR"):
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


from src.core import EdgeCore
from src.license import LicenseState


@pytest.fixture()
def core():
    c = EdgeCore.get()
    saved = c.license_info
    yield c
    c.license_info = saved


def test_every_route_is_locked_without_a_licence(core):
    c = TestClient(api.app, raise_server_exceptions=False)
    for state in (None, LicenseState(valid=False, reason="no_license_key"), LicenseState(valid=False, reason="expired"),
                  LicenseState(valid=False, reason="server_unreachable_no_verified_cache")):
        core.license_info = state
        checked = 0
        for method, path in _routes():
            if path in api.OPEN_PATHS:
                continue
            r = c.request(method, path, json={})
            assert r.status_code == 403, f"{method} {path} answered {r.status_code} without a licence"
            assert r.json()["detail"]["error"] == "license_inactive"
            checked += 1
        assert checked >= 40


def test_the_live_socket_needs_a_licence(core):
    from starlette.websockets import WebSocketDisconnect
    c = TestClient(api.app, raise_server_exceptions=False)
    core.license_info = LicenseState(valid=False, reason="no_license_key")
    with pytest.raises(WebSocketDisconnect) as e:
        with c.websocket_connect("/ws/usage") as ws:
            ws.receive_text()
    assert e.value.code == 4403


def test_a_valid_licence_or_verified_grace_opens_the_routes(core):
    c = TestClient(api.app, raise_server_exceptions=False)
    for reason in ("", "lifetime_offline", "offline_grace"):
        core.license_info = LicenseState(valid=True, reason=reason)
        assert c.get("/edge/plans").status_code != 403
