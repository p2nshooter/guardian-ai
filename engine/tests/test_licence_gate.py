# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""AXTO Guardian can be downloaded by anyone but used only with an official licence
(owner, 28 Oct 2026). Without one a browser gets the activation page and every API
call and WebSocket — agents included — is refused; only health and activation stay
open. Activation keeps a key only when the signed licence check says it is valid."""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
_TMP = tempfile.mkdtemp(prefix="guardian-test-")
# Modules create their folders at import; point every one at a temp dir so the test
# runs as an ordinary user (CI) and never touches /guardian.
for _var, _sub in (("DATA_DIR", "data"), ("GUARDIAN_DATA_DIR", "data"), ("GUARDIAN_CERTS_DIR", "certs"),
                   ("GUARDIAN_CONFIG", "config/guardian.yml"), ("SIEM_CEF_FILE", "logs/guardian.cef"),
                   ("SIEM_JSON_FILE", "logs/guardian.jsonl")):
    os.environ.setdefault(_var, os.path.join(_TMP, _sub))
os.makedirs(os.environ["DATA_DIR"], exist_ok=True)

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from src import api
from src.core import GuardianCore
from src.license import LicenseState


def _routes():
    for r in api.app.routes:
        if isinstance(r, APIRoute):
            for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
                path = r.path
                for p in r.param_convertors:
                    path = path.replace("{" + p + "}", "x1")
                yield m, path


def _open(path):
    return any(path.startswith(p) for p in api.ACTIVATION_BYPASS_PATHS)


@pytest.fixture()
def core():
    c = GuardianCore.get()
    saved = (c.license_validator._info, c.license_validator._key)
    yield c
    c.license_validator._info, c.license_validator._key = saved


def set_state(core, **kw):
    core.license_validator._info = LicenseState(**kw)


def test_every_api_route_is_locked_without_a_licence(core):
    c = TestClient(api.app, raise_server_exceptions=False)
    for state in (None, dict(valid=False, reason="no_license_key"), dict(valid=False, reason="expired"),
                  dict(valid=False, reason="server_unreachable_no_verified_cache")):
        if state is None:
            core.license_validator._info = None          # not validated yet
        else:
            set_state(core, **state)
        checked = 0
        for method, path in _routes():
            if _open(path):
                continue
            r = c.request(method, path, json={}, headers={"accept": "application/json"})
            assert r.status_code == 403, f"{method} {path} answered {r.status_code} without a licence"
            assert r.json()["detail"]["error"] == "license_inactive"
            checked += 1
        assert checked >= 80
    # A browser gets the activation page instead.
    page = c.get("/", headers={"accept": "text/html"})
    assert page.status_code == 200 and 'name="axto-product" content="guardian"' in page.text


def test_websockets_need_a_licence(core):
    c = TestClient(api.app, raise_server_exceptions=False)
    set_state(core, valid=False, reason="no_license_key")
    for path in ("/ws/events/s1", "/support/ws/s1"):
        with pytest.raises(WebSocketDisconnect) as e:
            with c.websocket_connect(path) as ws:
                ws.receive_text()
        assert e.value.code == 4403, path


def test_a_valid_licence_or_verified_grace_opens_the_api(core):
    c = TestClient(api.app, raise_server_exceptions=False)
    for reason in ("", "lifetime_offline", "offline_grace"):
        set_state(core, valid=True, reason=reason, package="aegis")
        r = c.get("/response/status", headers={"accept": "application/json"})
        assert r.status_code == 200, r.text


def test_the_licence_state_follows_the_validator(core):
    """A revocation seen by the heartbeat locks at once (no copy frozen at startup)."""
    set_state(core, valid=True, reason="")
    assert core.license_info.valid
    set_state(core, valid=False, reason="revoked")
    assert core.license_info.reason == "revoked"
    c = TestClient(api.app, raise_server_exceptions=False)
    assert c.get("/response/status", headers={"accept": "application/json"}).status_code == 403


def test_activation_keeps_a_key_only_when_the_signed_check_says_valid(core, monkeypatch):
    calls = []

    async def fake_validate(force=False):
        calls.append(core.license_validator._key)
        ok = core.license_validator._key == "GUARD-GOOD-KEY"
        core.license_validator._info = LicenseState(valid=ok, reason="" if ok else "invalid",
                                                    package="aegis" if ok else "", message="" if ok else "Unknown key")
        return core.license_validator._info

    monkeypatch.setattr(core.license_validator, "validate", fake_validate)
    core.license_validator._key = ""
    c = TestClient(api.app, raise_server_exceptions=False)
    bad = c.post("/api/license/activate", json={"license_key": "guard-bad-key"}).json()
    assert bad["valid"] is False and bad["reason"] == "invalid"
    assert core.license_validator._key == "" and not os.path.exists(os.path.join(os.environ["DATA_DIR"], "license.key"))
    good = c.post("/api/license/activate", json={"license_key": "guard-good-key"}).json()
    assert good["valid"] is True and good["package"] == "aegis"
    assert open(os.path.join(os.environ["DATA_DIR"], "license.key")).read() == "GUARD-GOOD-KEY"
    assert c.get("/response/status", headers={"accept": "application/json"}).status_code == 200
