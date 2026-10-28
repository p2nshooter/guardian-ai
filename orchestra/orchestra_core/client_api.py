# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — client API (OpenAI-compatible).

Applications call Orchestra the way they call OpenAI:

    POST /v1/chat/completions   Authorization: Bearer orch_…
    GET  /v1/models

Orchestra puts the request in its queue and routes it to a worker — a GPU worker
(Ollama on your own cards), a CPU worker, or a cloud provider with the key from the
Credential Vault — by the console's routing rules, then answers in the OpenAI format.
Any OpenAI SDK works by changing its base URL to http://<orchestra-host>:8080/v1.

Client keys are made in the console (Client API page), shown once and stored only as
a SHA-256 hash. Each key has its own requests/minute and tokens/minute limits, an
optional monthly spend limit (USD — paid providers only; local GPU work costs
nothing) and an optional list of models it may use.

What it does not do (said here and on the console page, so nobody is promised more):
text messages only (no images or audio in a message), no tool/function calling, and
`stream: true` sends the whole answer as one chunk once the worker has finished.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

import database as db
import enforcement
import job_router

router = APIRouter()

KEY_PREFIX = "orch_"
WAIT_SECONDS = int(os.environ.get("ORCHESTRA_CLIENT_TIMEOUT", "300"))
MAX_TOKENS_CAP = 32768
MAX_CHARS = 400_000
DEFAULT_RPM, DEFAULT_TPM = 60, 100_000


# ── Keys ──────────────────────────────────────────────────────────────────────

def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def caller_id(key_id: str) -> str:
    """The caller every job and cost event of this key is filed under."""
    return f"key:{key_id}"


def _month_start(now: Optional[float] = None) -> float:
    d = datetime.fromtimestamp(now or time.time(), tz=timezone.utc)
    return datetime(d.year, d.month, 1, tzinfo=timezone.utc).timestamp()


def month_spend(key_id: str) -> float:
    row = db.q1("SELECT COALESCE(SUM(cost_usd),0) AS t FROM cost_events WHERE caller_id=? AND ts>=?",
                (caller_id(key_id), _month_start()))
    return round(float((row or {}).get("t") or 0), 6)


def _clean_models(models) -> list:
    if not isinstance(models, list):
        return []
    out = []
    for m in models:
        m = str(m).strip()
        if m and m != "auto" and len(m) <= 200 and m not in out:
            out.append(m)
    return out[:100]


def _limits(body: dict) -> dict:
    def num(name, default, lo, hi, cast=int):
        try:
            v = cast(body.get(name, default))
        except (TypeError, ValueError):
            raise ValueError(f"{name} must be a number")
        if v < lo or v > hi:
            raise ValueError(f"{name} must be between {lo} and {hi}")
        return v
    return {"rpm_limit": num("rpm_limit", DEFAULT_RPM, 0, 100_000),
            "tpm_limit": num("tpm_limit", DEFAULT_TPM, 0, 100_000_000),
            "monthly_usd_limit": num("monthly_usd_limit", 0, 0, 1_000_000, float)}


def create_key(body: dict) -> tuple[dict, str]:
    """A new client key. Returns (the key's record, the secret — shown once)."""
    name = str(body.get("name") or "").strip()[:80]
    if not name:
        raise ValueError("name is required (e.g. the app that will use the key)")
    lim = _limits(body)
    key_id = f"ck_{uuid.uuid4().hex[:12]}"
    secret = KEY_PREFIX + secrets.token_urlsafe(32)
    db.ex("INSERT INTO client_keys(id,name,key_hash,prefix,models,monthly_usd_limit) VALUES(?,?,?,?,?,?)",
          (key_id, name, _hash(secret), secret[:12], json.dumps(_clean_models(body.get("models"))),
           lim["monthly_usd_limit"]))
    db.ex("INSERT INTO rate_limits(caller_id,rpm_limit,tpm_limit) VALUES(?,?,?) "
          "ON CONFLICT(caller_id) DO UPDATE SET rpm_limit=excluded.rpm_limit,tpm_limit=excluded.tpm_limit",
          (caller_id(key_id), lim["rpm_limit"], lim["tpm_limit"]))
    return get_key(key_id), secret


def update_key(key_id: str, body: dict) -> Optional[dict]:
    row = db.q1("SELECT * FROM client_keys WHERE id=? AND revoked_at IS NULL", (key_id,))
    if not row:
        return None
    current = get_key(key_id)
    lim = _limits({**current, **body})
    name = str(body.get("name", row["name"]) or "").strip()[:80] or row["name"]
    models = _clean_models(body["models"]) if "models" in body else json.loads(row["models"] or "[]")
    db.ex("UPDATE client_keys SET name=?,models=?,monthly_usd_limit=? WHERE id=?",
          (name, json.dumps(models), lim["monthly_usd_limit"], key_id))
    db.ex("INSERT INTO rate_limits(caller_id,rpm_limit,tpm_limit) VALUES(?,?,?) "
          "ON CONFLICT(caller_id) DO UPDATE SET rpm_limit=excluded.rpm_limit,tpm_limit=excluded.tpm_limit",
          (caller_id(key_id), lim["rpm_limit"], lim["tpm_limit"]))
    return get_key(key_id)


def revoke_key(key_id: str) -> bool:
    return db.ex("UPDATE client_keys SET revoked_at=((julianday('now') - 2440587.5) * 86400.0) "
                 "WHERE id=? AND revoked_at IS NULL", (key_id,)) > 0


def get_key(key_id: str) -> Optional[dict]:
    row = db.q1("SELECT * FROM client_keys WHERE id=?", (key_id,))
    if not row:
        return None
    rl = db.q1("SELECT rpm_limit,tpm_limit FROM rate_limits WHERE caller_id=?", (caller_id(key_id),)) or {}
    jobs = db.q1("SELECT COUNT(*) AS n FROM jobs WHERE caller_id=? AND queued_at>=?",
                 (caller_id(key_id), _month_start())) or {}
    return {"id": row["id"], "name": row["name"], "prefix": row["prefix"],
            "models": json.loads(row["models"] or "[]"),
            "rpm_limit": rl.get("rpm_limit", DEFAULT_RPM), "tpm_limit": rl.get("tpm_limit", DEFAULT_TPM),
            "monthly_usd_limit": row["monthly_usd_limit"], "spend_month_usd": month_spend(row["id"]),
            "requests_month": int(jobs.get("n") or 0),
            "created_at": row["created_at"], "last_used_at": row["last_used_at"],
            "revoked": row["revoked_at"] is not None}


def list_keys() -> list:
    return [get_key(r["id"]) for r in db.q("SELECT id FROM client_keys ORDER BY created_at DESC")]


def authenticate(request: Request) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    secret = auth[7:].strip() if auth[:7].lower() == "bearer " else request.headers.get("x-api-key", "").strip()
    if not secret.startswith(KEY_PREFIX) or len(secret) > 200:
        return None
    row = db.q1("SELECT * FROM client_keys WHERE key_hash=? AND revoked_at IS NULL", (_hash(secret),))
    if row:
        db.ex("UPDATE client_keys SET last_used_at=((julianday('now') - 2440587.5) * 86400.0) WHERE id=?",
              (row["id"],))
        row["models"] = json.loads(row["models"] or "[]")
    return row


# ── Models and routing ───────────────────────────────────────────────────────

def model_id(worker: dict) -> str:
    return f"{worker.get('provider_id') or 'worker'}/{worker.get('model') or 'default'}"


def serves(worker: dict, allow: list) -> bool:
    """Whether a worker may take a job limited to these model ids ("provider/model" or "model")."""
    return not allow or model_id(worker) in allow or (worker.get("model") or "") in allow


def _active_workers() -> list:
    return [w for w in db.get_active_workers() if w.get("status") == "active"]


def available_models(allow: list) -> list:
    seen, out = set(), []
    for w in _active_workers():
        mid = model_id(w)
        if mid not in seen and serves(w, allow):
            seen.add(mid)
            out.append({"id": mid, "object": "model", "created": int(w.get("registered_at") or 0),
                        "owned_by": w.get("provider_id") or "orchestra",
                        "orchestra": {"worker_type": w.get("worker_type"), "workers": 1}})
        elif mid in seen:
            next(m for m in out if m["id"] == mid)["orchestra"]["workers"] += 1
    return out


# ── OpenAI-shaped answers ────────────────────────────────────────────────────

def _err(status: int, message: str, kind: str, code: str, param: Optional[str] = None) -> JSONResponse:
    return JSONResponse(status_code=status,
                        content={"error": {"message": message, "type": kind, "param": param, "code": code}})


def _messages(raw) -> list:
    if not isinstance(raw, list) or not raw:
        raise ValueError("messages must be a non-empty list")
    if len(raw) > 500:
        raise ValueError("at most 500 messages per request")
    out = []
    for m in raw:
        if not isinstance(m, dict):
            raise ValueError("each message must be an object with role and content")
        role = m.get("role")
        if role == "developer":
            role = "system"
        if role not in ("system", "user", "assistant"):
            raise ValueError(f"role '{role}' is not supported — Orchestra takes system, user and assistant "
                             "messages (no tool or function calls)")
        content = m.get("content")
        if isinstance(content, list):
            parts = []
            for p in content:
                if not isinstance(p, dict) or p.get("type") != "text":
                    raise ValueError("only text content is supported (no images or audio in a message)")
                parts.append(str(p.get("text") or ""))
            content = "\n".join(parts)
        if not isinstance(content, str):
            raise ValueError("message content must be text")
        out.append({"role": role, "content": content})
    if sum(len(m["content"]) for m in out) > MAX_CHARS:
        raise ValueError(f"the conversation is too long (at most {MAX_CHARS:,} characters)")
    return out


def _completion(job: dict, requested: str, created: int) -> dict:
    content = job.get("result") or ""
    used = f"{job.get('provider_used') or 'orchestra'}/{job.get('model_used') or requested}"
    pt, ct = int(job.get("input_tokens") or 0), int(job.get("output_tokens") or 0)
    return {
        "id": f"chatcmpl-{job['id']}", "object": "chat.completion", "created": created, "model": used,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": pt, "completion_tokens": ct, "total_tokens": pt + ct},
        "orchestra": {"job_id": job["id"], "provider": job.get("provider_used") or "",
                      "cost_usd": float(job.get("cost_usd") or 0), "latency_ms": int(job.get("latency_ms") or 0),
                      "from_cache": bool(job.get("from_cache"))},
    }


def _stream(body: dict):
    choice = body["choices"][0]
    base = {"id": body["id"], "object": "chat.completion.chunk", "created": body["created"], "model": body["model"]}
    first = {**base, "choices": [{"index": 0, "delta": {"role": "assistant", "content": choice["message"]["content"]},
                                  "finish_reason": None}]}
    last = {**base, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}], "usage": body["usage"]}

    def gen():
        yield f"data: {json.dumps(first)}\n\n"
        yield f"data: {json.dumps(last)}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"X-Orchestra-Job-Id": body["orchestra"]["job_id"]})


# ── Endpoints ────────────────────────────────────────────────────────────────

def _unauthorized() -> JSONResponse:
    return _err(401, "Missing or invalid Orchestra client key. Make one in the console → Client API and send it as "
                     "'Authorization: Bearer orch_…'.", "authentication_error", "invalid_api_key")


def _licence_problem() -> Optional[JSONResponse]:
    try:
        enforcement.require_active()
    except enforcement.EnforcementError as e:
        return _err(403, f"Orchestra's licence is not active ({e.detail or e.category}). Manage it at "
                         f"{enforcement.MANAGE_URL}", "permission_error", "licence_inactive")
    return None


@router.get("/v1/models")
async def models(request: Request):
    key = authenticate(request)
    if not key:
        return _unauthorized()
    if (bad := _licence_problem()):
        return bad
    data = [{"id": "auto", "object": "model", "created": 0, "owned_by": "orchestra",
             "orchestra": {"note": "Orchestra picks the worker by the console's routing rules"}}]
    return {"object": "list", "data": data + available_models(key["models"])}


@router.post("/v1/chat/completions")
async def chat_completions(request: Request):
    key = authenticate(request)
    if not key:
        return _unauthorized()
    if (bad := _licence_problem()):
        return bad
    try:
        body = await request.json()
    except Exception:
        return _err(400, "The body must be JSON.", "invalid_request_error", "invalid_json")
    if not isinstance(body, dict):
        return _err(400, "The body must be a JSON object.", "invalid_request_error", "invalid_json")
    try:
        messages = _messages(body.get("messages"))
    except ValueError as e:
        return _err(400, str(e), "invalid_request_error", "invalid_messages", "messages")
    if int(body.get("n") or 1) != 1:
        return _err(400, "n must be 1.", "invalid_request_error", "unsupported_n", "n")
    if body.get("tools") or body.get("functions"):
        return _err(400, "Tool and function calling are not supported by Orchestra's client API.",
                    "invalid_request_error", "tools_not_supported", "tools")
    try:
        max_tokens = int(body.get("max_completion_tokens") or body.get("max_tokens") or 2048)
        temperature = float(body.get("temperature") if body.get("temperature") is not None else 0.7)
    except (TypeError, ValueError):
        return _err(400, "max_tokens and temperature must be numbers.", "invalid_request_error", "invalid_number")
    max_tokens = max(1, min(max_tokens, MAX_TOKENS_CAP))
    temperature = max(0.0, min(temperature, 2.0))

    requested = str(body.get("model") or "auto").strip()
    allowed = key["models"]
    if requested in ("", "auto", "orchestra"):
        requested, allow = "auto", allowed
    else:
        if allowed and requested not in allowed:
            return _err(403, f"This key may not use the model '{requested}'.", "permission_error",
                        "model_not_allowed", "model")
        allow = [requested]
    if not any(serves(w, allow) for w in _active_workers()):
        what = "any of this key's models" if requested == "auto" and allow else (
            "any model" if requested == "auto" else f"the model '{requested}'")
        return _err(503 if requested == "auto" else 404,
                    f"No active Orchestra worker serves {what}. Add or start a worker in the console (Workers).",
                    "invalid_request_error" if requested != "auto" else "server_error", "no_worker", "model")

    limit = float(key.get("monthly_usd_limit") or 0)
    if limit > 0 and month_spend(key["id"]) >= limit:
        return _err(429, f"This key has used its monthly budget (US${limit:.2f}). Raise it in the console → Client API "
                         "or wait for the next month.", "rate_limit_error", "budget_exceeded")

    created = int(time.time())
    queued = job_router.enqueue(
        task_type="chat", messages=messages, model="" if requested == "auto" else requested,
        max_tokens=max_tokens, temperature=temperature, priority="normal", caller_id=caller_id(key["id"]),
        metadata={"route": {"allow": allow}, "client_key": key["id"], "user": str(body.get("user") or "")[:200]})
    if not queued.get("ok"):
        msg = str(queued.get("error") or "Orchestra could not queue the request.")
        if msg.startswith("Rate limit"):
            return _err(429, f"{msg} — this key's per-minute limit. Change it in the console → Client API.",
                        "rate_limit_error", "rate_limit_exceeded")
        if queued.get("injection"):
            return _err(400, msg, "invalid_request_error", "prompt_injection_blocked", "messages")
        return _err(503, msg, "server_error", "queue_unavailable")

    if queued.get("from_cache"):
        job = {"id": f"cache-{uuid.uuid4().hex[:10]}", "result": queued.get("result") or "", "from_cache": True,
               "provider_used": "cache", "model_used": requested}
    else:
        job_id = queued["job_id"]
        deadline = time.time() + WAIT_SECONDS
        job = None
        while time.time() < deadline:
            job = db.get_job(job_id)
            if job and job.get("status") in ("done", "error", "timeout", "cancelled"):
                break
            await asyncio.sleep(0.2)
        else:
            return _err(504, f"The worker did not answer within {WAIT_SECONDS} s (job {job_id}).",
                        "server_error", "timeout")
        if job.get("status") != "done":
            return _err(502, f"The worker could not answer: {job.get('error') or job.get('status')} (job {job_id}).",
                        "server_error", "upstream_error")
    out = _completion(job, requested, created)
    if body.get("stream"):
        return _stream(out)
    return JSONResponse(out, headers={"X-Orchestra-Job-Id": out["orchestra"]["job_id"]})
