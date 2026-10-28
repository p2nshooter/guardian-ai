# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""The Orchestra console (BLUEPRINT-V4 §29): its sign-in really checks the
password, and its script parses — one duplicate `let` at the top of the single
<script> stops the whole console in every browser."""
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))
os.environ.setdefault("ORCHESTRA_CONSOLE_PASSWORD", "console-test-password")
os.environ.setdefault("ORCHESTRA_WORKER_TOKEN", "worker-test-token")

from fastapi.testclient import TestClient

import main

CONSOLE_HTML = os.path.join(os.path.dirname(HERE), "console", "index.html")


def test_sign_in_check_needs_the_console_password():
    c = TestClient(main.app)
    assert c.get("/api/console/session").status_code == 401
    assert c.get("/api/console/session", headers={"X-Console-Token": "wrong"}).status_code == 401
    ok = c.get("/api/console/session", headers={"X-Console-Token": os.environ["ORCHESTRA_CONSOLE_PASSWORD"]})
    assert ok.status_code == 200 and ok.json() == {"ok": True}


def test_console_signs_in_with_the_checked_endpoint():
    html = open(CONSOLE_HTML, encoding="utf-8").read()
    login = html[html.index("async function doLogin"):html.index("function doLogout")]
    assert "/api/console/session" in login and "/api/license/status" not in login


def test_console_script_has_no_duplicate_top_level_names():
    html = open(CONSOLE_HTML, encoding="utf-8").read()
    for script in re.findall(r"<script>(.*?)</script>", html, re.S):
        names = re.findall(r"^(?:let|const|var)\s+([A-Za-z_$][\w$]*)", script, re.M)
        names += re.findall(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", script, re.M)
        dupes = sorted({n for n in names if names.count(n) > 1})
        assert not dupes, f"declared twice at the top of the console script: {dupes}"
