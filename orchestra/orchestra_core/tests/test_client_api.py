# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""The client API (client_api.py): apps call Orchestra like OpenAI — /v1/models and
/v1/chat/completions with a client key made in the console. The request goes through
the queue and the router to a worker; the answer comes back in the OpenAI format with
usage, the job id and the cost. Keys are hashed, limited, budgeted and revocable."""
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
os.environ.setdefault("ORCHESTRA_CLIENT_TIMEOUT", "20")

import pytest
from fastapi.testclient import TestClient

import ai_providers
import client_api
import credential_vault
import database as db
import enforcement
import license as lic
import main

CONSOLE = {"X-Console-Token": os.environ["ORCHESTRA_CONSOLE_PASSWORD"]}
PRO = {"max_nodes": 50, "max_workers": 50, "gpu_workers": True, "autoscaler": True,
       "federation": True, "cost_analytics": True}


class FakeValidator:
    def __init__(self, valid=True):
        self.valid = valid
        self.state = lic.LicenseState(valid=valid, reason="ok" if valid else "expired", package="orchestra_test",
                                      max_nodes=50, features=PRO, last_validated=time.time())

    def is_operational(self):
        return self.valid

    def current_state(self):
        return self.state


CALLS = []


def fake_dispatch(provider_id, api_key, model, messages, max_tokens=2048, temperature=0.7, base_url="", timeout=120):
    CALLS.append({"provider": provider_id, "model": model, "messages": messages, "key": api_key})
    if model == "broken-model":
        return {"ok": False, "error": "upstream 500"}
    return {"ok": True, "content": f"answer from {provider_id}/{model}", "input_tokens": 12,
            "output_tokens": 30, "latency_ms": 5, "model_used": model}


@pytest.fixture()
def client(monkeypatch):
    db.init_db()
    for t in ("workers", "metrics", "cost_events", "jobs", "client_keys", "rate_limits", "job_cache", "circuit_events"):
        db.ex(f"DELETE FROM {t}")
    db.set_setting("quality_retry_enabled", "false")
    db.set_setting("routing_mode", "smart_balance")
    enforcement._validator = FakeValidator()
    CALLS.clear()
    monkeypatch.setattr(ai_providers, "dispatch", fake_dispatch)
    monkeypatch.setattr(credential_vault, "get_key", lambda pid: f"vault-key-{pid}" if pid in ("openai", "groq") else None)
    c = TestClient(main.app)
    for provider, model in (("openai", "gpt-4o-mini"), ("groq", "llama-3.3-70b")):
        r = c.post("/api/workers/register", headers=CONSOLE,
                   json={"node_id": "node-1", "type": "cpu", "provider_id": provider, "model": model})
        assert r.status_code == 200, r.text
    yield c
    enforcement._validator = None


def new_key(c, **body):
    r = c.post("/api/client-keys", headers=CONSOLE, json={"name": "CRM app", **body})
    assert r.status_code == 200, r.text
    return r.json()


def bearer(secret):
    return {"Authorization": f"Bearer {secret}"}


def chat(c, secret, **body):
    return c.post("/v1/chat/completions", headers=bearer(secret),
                  json={"messages": [{"role": "user", "content": "Summarise our refund policy."}], **body})


def test_a_key_is_shown_once_and_stored_only_as_a_hash(client):
    made = new_key(client)
    secret = made["secret"]
    assert secret.startswith("orch_") and len(secret) > 40
    row = db.q1("SELECT * FROM client_keys WHERE id=?", (made["key"]["id"],))
    assert secret not in json.dumps(row) and row["key_hash"] != secret and len(row["key_hash"]) == 64
    listed = client.get("/api/client-keys", headers=CONSOLE).json()["keys"]
    assert [k["id"] for k in listed] == [made["key"]["id"]]
    assert secret not in json.dumps(listed) and listed[0]["prefix"] == secret[:12]
    # Managing keys needs the console password.
    assert client.get("/api/client-keys").status_code == 401
    assert client.post("/api/client-keys", json={"name": "x"}).status_code == 401
    assert client.post("/api/client-keys", headers=CONSOLE, json={"name": ""}).status_code == 400
    assert any(a["action"] == "client_key.create" for a in db.get_audit_log(20))


def test_chat_completion_goes_through_the_router_and_answers_like_openai(client):
    secret = new_key(client)["secret"]
    r = chat(client, secret, model="openai/gpt-4o-mini", max_tokens=200)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["object"] == "chat.completion" and body["id"].startswith("chatcmpl-J-")
    assert body["choices"][0]["message"] == {"role": "assistant", "content": "answer from openai/gpt-4o-mini"}
    assert body["choices"][0]["finish_reason"] == "stop"
    assert body["usage"] == {"prompt_tokens": 12, "completion_tokens": 30, "total_tokens": 42}
    assert body["model"] == "openai/gpt-4o-mini"
    assert r.headers["X-Orchestra-Job-Id"] == body["orchestra"]["job_id"]
    # The provider key came from the vault, never from the client.
    assert CALLS[-1]["key"] == "vault-key-openai"
    job = db.get_job(body["orchestra"]["job_id"])
    assert job["caller_id"].startswith("key:") and job["status"] == "done"


def test_model_choice_auto_and_the_key_model_list(client):
    secret = new_key(client)["secret"]
    models = client.get("/v1/models", headers=bearer(secret)).json()
    ids = [m["id"] for m in models["data"]]
    assert models["object"] == "list" and ids[0] == "auto"
    assert set(ids[1:]) == {"openai/gpt-4o-mini", "groq/llama-3.3-70b"}

    # A bare model name works too, and only that model's worker takes the job.
    for _ in range(3):
        assert chat(client, secret, model="llama-3.3-70b").json()["model"] == "groq/llama-3.3-70b"
    assert {c["provider"] for c in CALLS} == {"groq"}
    assert chat(client, secret).status_code == 200  # auto

    r = chat(client, secret, model="gpt-9")
    assert r.status_code == 404 and r.json()["error"]["code"] == "no_worker"

    limited = new_key(client, name="Support bot", models=["groq/llama-3.3-70b"])["secret"]
    assert [m["id"] for m in client.get("/v1/models", headers=bearer(limited)).json()["data"]] == ["auto", "groq/llama-3.3-70b"]
    r = chat(client, limited, model="openai/gpt-4o-mini")
    assert r.status_code == 403 and r.json()["error"]["code"] == "model_not_allowed"
    CALLS.clear()
    for _ in range(3):
        assert chat(client, limited).json()["model"] == "groq/llama-3.3-70b"
    assert {c["provider"] for c in CALLS} == {"groq"}, "auto stays inside the key's models"


def test_stream_sends_the_answer_as_server_sent_events(client):
    secret = new_key(client)["secret"]
    r = chat(client, secret, model="openai/gpt-4o-mini", stream=True)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    events = [l[6:] for l in r.text.split("\n") if l.startswith("data: ")]
    assert events[-1] == "[DONE]"
    first, last = json.loads(events[0]), json.loads(events[1])
    assert first["object"] == "chat.completion.chunk"
    assert first["choices"][0]["delta"]["content"] == "answer from openai/gpt-4o-mini"
    assert last["choices"][0]["finish_reason"] == "stop" and last["usage"]["total_tokens"] == 42


def test_bad_keys_bad_requests_and_what_is_not_supported(client):
    secret = new_key(client)["secret"]
    for headers in ({}, bearer("sk-not-ours"), bearer("orch_wrong"), {"Authorization": "Bearer " + CONSOLE["X-Console-Token"]}):
        r = client.post("/v1/chat/completions", headers=headers, json={"messages": [{"role": "user", "content": "hi"}]})
        assert r.status_code == 401 and r.json()["error"]["type"] == "authentication_error"
    assert client.get("/v1/models").status_code == 401
    # x-api-key works like Authorization.
    assert client.get("/v1/models", headers={"x-api-key": secret}).status_code == 200

    def bad(code, **body):
        r = client.post("/v1/chat/completions", headers=bearer(secret), json=body)
        assert r.status_code == 400, r.text
        assert r.json()["error"]["code"] == code
    bad("invalid_messages", messages=[])
    bad("invalid_messages", messages=[{"role": "tool", "content": "x"}])
    bad("invalid_messages", messages=[{"role": "user", "content": [{"type": "image_url", "image_url": {"url": "x"}}]}])
    bad("tools_not_supported", messages=[{"role": "user", "content": "x"}], tools=[{"type": "function"}])
    bad("unsupported_n", messages=[{"role": "user", "content": "x"}], n=2)
    # Text parts and the developer role are read as plain text and a system message.
    r = client.post("/v1/chat/completions", headers=bearer(secret), json={"model": "openai/gpt-4o-mini", "messages": [
        {"role": "developer", "content": "Be brief."}, {"role": "user", "content": [{"type": "text", "text": "Hello"}]}]})
    assert r.status_code == 200
    assert CALLS[-1]["messages"] == [{"role": "system", "content": "Be brief."}, {"role": "user", "content": "Hello"}]


def test_a_failing_worker_is_reported_not_hidden(client):
    client.post("/api/workers/register", headers=CONSOLE,
                json={"node_id": "node-1", "type": "cpu", "provider_id": "openai", "model": "broken-model"})
    secret = new_key(client)["secret"]
    r = chat(client, secret, model="openai/broken-model")
    assert r.status_code == 502 and r.json()["error"]["code"] == "upstream_error"
    assert "upstream 500" in r.json()["error"]["message"]


def test_limits_budget_and_revocation(client):
    made = new_key(client, rpm_limit=2)
    secret, key_id = made["secret"], made["key"]["id"]
    assert made["key"]["rpm_limit"] == 2
    assert chat(client, secret, model="openai/gpt-4o-mini").status_code == 200
    assert chat(client, secret, model="openai/gpt-4o-mini").status_code == 200
    r = chat(client, secret, model="openai/gpt-4o-mini")
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limit_exceeded"

    # Monthly budget: spend this month on this key (paid providers) is checked before each request.
    r = client.patch(f"/api/client-keys/{key_id}", headers=CONSOLE, json={"rpm_limit": 100, "monthly_usd_limit": 0.5})
    assert r.status_code == 200 and r.json()["key"]["monthly_usd_limit"] == 0.5
    before = client_api.month_spend(key_id)  # the two answers above cost a little already
    db.ex("INSERT INTO cost_events(provider_id,model,cost_usd,caller_id) VALUES('openai','gpt-4o-mini',0.6,?)",
          (client_api.caller_id(key_id),))
    db.ex("INSERT INTO cost_events(provider_id,model,cost_usd,caller_id,ts) VALUES('openai','gpt-4o-mini',9,?,?)",
          (client_api.caller_id(key_id), client_api._month_start() - 10))  # last month does not count
    assert client_api.month_spend(key_id) == pytest.approx(before + 0.6)
    r = chat(client, secret, model="openai/gpt-4o-mini")
    assert r.status_code == 429 and r.json()["error"]["code"] == "budget_exceeded"
    listed = client.get("/api/client-keys", headers=CONSOLE).json()["keys"][0]
    assert listed["spend_month_usd"] == pytest.approx(before + 0.6) and listed["requests_month"] >= 2

    assert client.patch(f"/api/client-keys/{key_id}", headers=CONSOLE, json={"rpm_limit": -1}).status_code == 400
    assert client.delete(f"/api/client-keys/{key_id}", headers=CONSOLE).status_code == 200
    assert chat(client, secret, model="openai/gpt-4o-mini").status_code == 401
    assert client.delete(f"/api/client-keys/{key_id}", headers=CONSOLE).status_code == 404
    assert client.get("/api/client-keys", headers=CONSOLE).json()["keys"][0]["revoked"] is True


def test_no_licence_no_answers(client):
    secret = new_key(client)["secret"]
    enforcement._validator = FakeValidator(valid=False)
    r = chat(client, secret, model="openai/gpt-4o-mini")
    assert r.status_code == 403 and r.json()["error"]["code"] == "licence_inactive"
    assert client.get("/v1/models", headers=bearer(secret)).status_code == 403
    assert client.post("/api/client-keys", headers=CONSOLE, json={"name": "x"}).status_code == 403
    assert not CALLS


def test_no_worker_at_all_says_so(client):
    db.ex("DELETE FROM workers")
    secret = new_key(client)["secret"]
    r = chat(client, secret)
    assert r.status_code == 503 and r.json()["error"]["code"] == "no_worker"
