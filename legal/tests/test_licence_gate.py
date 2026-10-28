# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""AXTO Legal can be downloaded by anyone but used only with an official licence
(owner, 28 Oct 2026): without one, every route except /health and the licence status is refused with 402."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
_tmp = tempfile.mkdtemp(prefix="legal-test-")
for _v in ("DATA_DIR", "LEGAL_DATA_DIR"):
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


from src.license import LicenseState


def _open(path):
    return path.startswith(api._OPEN_PATHS)


@pytest.fixture()
def client(monkeypatch):
    return TestClient(api.app, raise_server_exceptions=False)


def test_every_route_is_locked_without_a_licence(client, monkeypatch):
    for state in (None, LicenseState(valid=False, status="no_key"), LicenseState(valid=False, status="expired"),
                  LicenseState(valid=False, status="revoked")):
        monkeypatch.setattr(api, "_license_state", state)
        checked = 0
        for method, path in _routes():
            if _open(path):
                continue
            r = client.request(method, path, json={})
            assert r.status_code == 402, f"{method} {path} answered {r.status_code} without a licence"
            assert r.json()["error"] == "licence_required"
            checked += 1
        assert checked >= 18
        assert client.get("/").status_code == 402


def test_a_valid_licence_opens_the_routes(client, monkeypatch):
    monkeypatch.setattr(api, "_license_state", LicenseState(valid=True, status="active", plan="enterprise"))
    assert client.get("/").status_code != 402
