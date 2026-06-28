# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Vault — FastAPI Engine (v1.1 — FIXED)

Fixes from assessment:
  ✅ Rate limiting — token-bucket per-minute, returns 429 with Retry-After
  ✅ Daily request limit — checked against license.max_requests_daily
  ✅ SSE streaming — stream:true properly proxied with token re-injection
  ✅ Audit export CSV/JSON — /vault/audit/export
  ✅ Compliance report generator — /vault/compliance/{framework}
  ✅ Slack/webhook/SIEM alerts — configured in vault.yml alerting:
  ✅ Dashboard HTML UI — /vault/dashboard (full stats + audit UI)
  ✅ WebSocket audit stream — per-subscriber queues (no stealing)
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
import structlog

from src.core import VaultCore
from src.license import LicenseValidator

log = structlog.get_logger()

app = FastAPI(
    title="AXTO Vault — AI Privacy Layer",
    version="1.1.0",
    docs_url="/docs",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await VaultCore.get().startup()


@app.on_event("shutdown")
async def on_shutdown():
    await VaultCore.get().shutdown()


# ── Rate limit + license guard (shared middleware) ────────────────────────────
async def _guard(core: VaultCore):
    """Check rate limit and daily request limit. Raise 429 or 402 if exceeded."""
    # 1. Rate limiting (per-minute token bucket)
    allowed = await core.rate_limiter.acquire()
    if not allowed:
        rpm = core.rate_limiter._rpm
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {rpm} requests/minute. Slow down or upgrade your plan.",
            headers={"Retry-After": "60", "X-RateLimit-Limit": str(rpm)},
        )

    # 2. Daily request limit (from license)
    ok, used, max_daily = core.check_daily_limit()
    if not ok:
        raise HTTPException(
            status_code=429,
            detail=f"Daily request limit reached ({used}/{max_daily}). "
                   f"Resets at midnight UTC. Upgrade at axto.io/portal.",
            headers={"X-Vault-Requests-Used": str(used),
                     "X-Vault-Requests-Limit": str(max_daily)},
        )

    # 3. License validity
    if core.license_info and not core.license_info.valid:
        raise HTTPException(
            status_code=402,
            detail="Vault license invalid or expired. Activate at http://localhost:8080",
        )


# ── Activation wizard (first-run) ─────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def root():
    core = VaultCore.get()
    if core.license_info and core.license_info.valid:
        return HTMLResponse(content=_redirect_html("/vault/dashboard"), status_code=200)
    with open("/vault/src/activation.html") as f:
        return HTMLResponse(content=f.read())


@app.post("/activate")
async def activate(req: Request):
    body = await req.json()
    key  = (body.get("license_key") or "").strip().upper()
    if not key.startswith("VAULT-"):
        raise HTTPException(400, "Invalid license key format. Key must start with VAULT-")
    core = VaultCore.get()
    info = await core.license_validator.validate(force=True, key_override=key)
    if not info.valid:
        raise HTTPException(403, info.reason or "Invalid license key")
    (core.cfg.data_dir / "license.key").write_text(key)
    core.license_info = info
    return {
        "ok": True,
        "product": info.product,
        "package": info.package,
        "expires_at": info.expires_at,
        "max_requests_daily": info.max_requests_daily,
    }


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    core = VaultCore.get()
    ok, used, max_d = core.check_daily_limit()
    return {
        "status":   "ok",
        "version":  "1.1.0",
        "product":  "vault",
        "license":  core.license_info.package if core.license_info else "unlicensed",
        "valid":    core.license_info.valid    if core.license_info else False,
        "uptime_s": core.uptime_seconds(),
        "stats": {
            "requests_today":   core.stats.requests_today,
            "redactions_today": core.stats.redactions_today,
            "tokens_protected": core.stats.tokens_protected,
            "providers_active": core.proxy.provider_count,
            "policies_active":  core.policy_mgr.active_count,
            "rate_limit_rpm":   core.rate_limiter._rpm or None,
            "daily_limit": {
                "used":     used,
                "max":      max_d,
                "unlimited":max_d == -1,
            },
        },
        "redactor": {
            "pii_patterns":       core.redactor.pii_count,
            "phi_patterns":       core.redactor.phi_count,
            "financial_patterns": core.redactor.financial_count,
        },
        "alerting": {
            "slack":   bool(core.cfg.slack_webhook_url),
            "webhook": bool(core.cfg.alert_webhook_url),
            "siem":    bool(core.cfg.siem_url),
        },
    }


# ── Request models ─────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role:    str
    content: Any

class ChatCompletionRequest(BaseModel):
    model:       str
    messages:    List[ChatMessage]
    stream:      Optional[bool]  = False
    temperature: Optional[float] = None
    max_tokens:  Optional[int]   = None
    top_p:       Optional[float] = None
    project_id:  Optional[str]   = None

class AnthropicMessageRequest(BaseModel):
    model:      str
    messages:   List[ChatMessage]
    max_tokens: Optional[int]  = 1024
    stream:     Optional[bool] = False
    system:     Optional[str]  = None
    project_id: Optional[str]  = None


# ── Core proxy handler ────────────────────────────────────────────────────────
async def _handle_proxy(req: Request, endpoint_type: str) -> Response:
    core   = VaultCore.get()
    await _guard(core)

    t0     = time.monotonic()
    req_id = str(uuid.uuid4())[:8]

    try:
        body = await req.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")

    project_id = body.pop("project_id", None) or req.headers.get("X-Vault-Project", "default")
    policy     = core.policy_mgr.get_policy(project_id)
    streaming  = bool(body.get("stream", False))

    # Redact
    messages   = body.get("messages", [])
    system_msg = body.get("system", "")
    redacted_messages, session = core.redactor.redact_messages(messages, policy)
    body["messages"] = redacted_messages
    if system_msg:
        redacted_system, _ = core.redactor.redact_text(system_msg, session)
        body["system"] = redacted_system

    redaction_count = len(session.replacements)
    core.stats.record_request(redaction_count)

    # ── Streaming path ────────────────────────────────────────────────────────
    if streaming:
        return await _handle_streaming(
            body, endpoint_type, policy, session,
            req_id, project_id, redaction_count, t0, core
        )

    # ── Standard path ─────────────────────────────────────────────────────────
    try:
        ai_response = await core.proxy.forward(body, endpoint_type, policy)
    except Exception as e:
        log.error("vault_proxy_error", req_id=req_id, error=str(e))
        raise HTTPException(502, f"AI provider error: {str(e)}")

    response_body = ai_response["body"]
    reinjected    = core.redactor.reinject(response_body, session)
    elapsed_ms    = int((time.monotonic() - t0) * 1000)

    await core.audit.log_request(
        req_id=req_id, project_id=project_id,
        endpoint=endpoint_type, model=body.get("model", ""),
        redaction_count=redaction_count,
        replacements=session.replacements,
        elapsed_ms=elapsed_ms,
        policy_name=policy.name,
    )

    return Response(
        content=json.dumps(reinjected),
        media_type="application/json",
        headers={
            "X-Vault-Request-ID":  req_id,
            "X-Vault-Redactions":  str(redaction_count),
            "X-Vault-Latency-Ms":  str(elapsed_ms),
            "X-Vault-Project":     project_id,
        },
    )


async def _handle_streaming(
    body: dict, endpoint_type: str, policy, session,
    req_id: str, project_id: str, redaction_count: int,
    t0: float, core: VaultCore
) -> StreamingResponse:
    """
    SSE streaming: forward stream from AI provider, re-inject tokens on the fly.
    Vault buffers each chunk, applies re-injection, then yields to client.
    """
    body["stream"] = True

    async def generate():
        try:
            async for chunk in core.proxy.forward_stream(body, endpoint_type, policy):
                # chunk is a raw SSE line like "data: {...}"
                if chunk.startswith("data: "):
                    data_str = chunk[6:].strip()
                    if data_str == "[DONE]":
                        yield "data: [DONE]\n\n"
                        continue
                    try:
                        data    = json.loads(data_str)
                        # Re-inject tokens in delta content
                        reinjected = core.redactor.reinject(data, session)
                        yield f"data: {json.dumps(reinjected)}\n\n"
                    except json.JSONDecodeError:
                        yield f"{chunk}\n"
                else:
                    yield f"{chunk}\n"
        except Exception as e:
            log.error("vault_stream_error", req_id=req_id, error=str(e))
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        finally:
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            # Log after stream ends
            asyncio.create_task(core.audit.log_request(
                req_id=req_id, project_id=project_id,
                endpoint=f"{endpoint_type}:stream", model=body.get("model", ""),
                redaction_count=redaction_count,
                replacements=session.replacements,
                elapsed_ms=elapsed_ms,
                policy_name=policy.name,
            ))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "X-Vault-Request-ID": req_id,
            "X-Vault-Redactions": str(redaction_count),
            "X-Vault-Project":    project_id,
            "Cache-Control":      "no-cache",
            "Connection":         "keep-alive",
        },
    )


# ── OpenAI-compatible proxy ────────────────────────────────────────────────────
@app.post("/v1/chat/completions")
async def chat_completions(req: Request):
    return await _handle_proxy(req, endpoint_type="openai_chat")


@app.post("/v1/messages")
async def anthropic_messages(req: Request):
    return await _handle_proxy(req, endpoint_type="anthropic_messages")


@app.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def openai_passthrough(path: str, req: Request):
    if path == "chat/completions":
        return await _handle_proxy(req, endpoint_type="openai_chat")
    return await VaultCore.get().proxy.passthrough(req, f"/v1/{path}")


# ── Policy management ─────────────────────────────────────────────────────────
class PolicyCreate(BaseModel):
    name:                   str
    description:            Optional[str] = ""
    redact_pii:             bool = True
    redact_phi:             bool = True
    redact_financial:       bool = True
    redact_custom_patterns: List[str] = []
    whitelist_domains:      List[str] = []
    ai_provider:            Optional[str] = None
    ai_model:               Optional[str] = None

@app.get("/vault/policies")
async def list_policies():
    return VaultCore.get().policy_mgr.list_policies()

@app.post("/vault/policies")
async def create_policy(body: PolicyCreate):
    return VaultCore.get().policy_mgr.create_policy(body.dict())

@app.get("/vault/policies/{policy_id}")
async def get_policy(policy_id: str):
    p = VaultCore.get().policy_mgr.get_by_id(policy_id)
    if not p: raise HTTPException(404, "Policy not found")
    return p

@app.put("/vault/policies/{policy_id}")
async def update_policy(policy_id: str, body: PolicyCreate):
    return VaultCore.get().policy_mgr.update_policy(policy_id, body.dict())

@app.delete("/vault/policies/{policy_id}")
async def delete_policy(policy_id: str):
    VaultCore.get().policy_mgr.delete_policy(policy_id)
    return {"ok": True}


# ── Audit log ─────────────────────────────────────────────────────────────────
@app.get("/vault/audit")
async def audit_log(
    project_id:            Optional[str] = None,
    limit:                 int = 100,
    offset:                int = 0,
    high_sensitivity_only: bool = False,
    since:                 Optional[str] = None,
):
    return await VaultCore.get().audit.get_logs(
        project_id=project_id, limit=limit, offset=offset,
        high_sensitivity_only=high_sensitivity_only, since=since,
    )

@app.get("/vault/audit/{req_id}/redactions")
async def audit_redactions(req_id: str):
    return await VaultCore.get().audit.get_redactions(req_id)

@app.get("/vault/audit/export")
async def audit_export(
    format:     str = "json",    # "json" | "csv"
    project_id: Optional[str] = None,
    since:      Optional[str] = None,
    limit:      int = 10000,
):
    """
    Download audit log as JSON or CSV.
    JSON format is SIEM-compatible (Splunk, Elastic, Datadog).
    """
    audit = VaultCore.get().audit
    if format == "csv":
        content  = await audit.export_csv(project_id=project_id, since=since, limit=limit)
        filename = f"vault-audit-export.csv"
        media    = "text/csv"
    else:
        content  = await audit.export_json(project_id=project_id, since=since, limit=limit)
        filename = f"vault-audit-export.json"
        media    = "application/json"

    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Statistics ────────────────────────────────────────────────────────────────
@app.get("/vault/stats")
async def stats():
    return await VaultCore.get().audit.get_stats()

@app.get("/vault/stats/timeline")
async def stats_timeline(days: int = 7):
    return await VaultCore.get().audit.get_timeline(days=days)


# ── Compliance Reports ────────────────────────────────────────────────────────
@app.get("/vault/compliance/{framework}")
async def compliance_report(
    framework:   str,
    period_days: int = 90,
    format:      str = "json",   # "json" | "text"
):
    """
    Generate compliance evidence report.
    Supported frameworks: hipaa, gdpr, soc2, pci_dss, iso27001
    """
    supported = {"hipaa", "gdpr", "soc2", "pci_dss", "iso27001"}
    if framework.lower() not in supported:
        raise HTTPException(400, f"Unsupported framework: {framework}. Use one of: {', '.join(sorted(supported))}")

    report = await VaultCore.get().audit.generate_compliance_report(
        framework=framework, period_days=period_days
    )

    if format == "text":
        return Response(
            content=_compliance_report_text(report),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="vault-{framework}-report.txt"'},
        )
    return report

@app.get("/vault/compliance")
async def compliance_list():
    """List available compliance frameworks."""
    return {
        "frameworks": [
            {"id": "hipaa",    "name": "HIPAA",     "desc": "Health Insurance Portability and Accountability Act"},
            {"id": "gdpr",     "name": "GDPR",      "desc": "General Data Protection Regulation (EU)"},
            {"id": "soc2",     "name": "SOC 2",     "desc": "Service Organization Control 2"},
            {"id": "pci_dss",  "name": "PCI-DSS",   "desc": "Payment Card Industry Data Security Standard"},
            {"id": "iso27001", "name": "ISO 27001",  "desc": "Information Security Management Systems"},
        ],
        "usage": "GET /vault/compliance/{framework}?period_days=90&format=json",
    }


# ── Test redaction ────────────────────────────────────────────────────────────
class TestRedactRequest(BaseModel):
    text:       str
    project_id: Optional[str] = "default"

@app.post("/vault/test")
async def test_redact(body: TestRedactRequest):
    core    = VaultCore.get()
    policy  = core.policy_mgr.get_policy(body.project_id)
    redacted, session = core.redactor.redact_text(body.text, None, policy=policy)
    return {
        "original":        body.text,
        "redacted":        redacted,
        "replacements":    session.replacements,
        "redaction_count": len(session.replacements),
        "categories":      session.categories,
        "high_sensitivity":bool(set(session.categories.keys()) & {
            "SSN","CREDIT_CARD","IBAN","MRN","ICD_CODE","API_KEY","CRYPTO_WALLET","PASSPORT"
        }),
    }


# ── Providers ─────────────────────────────────────────────────────────────────
@app.get("/vault/providers")
async def list_providers():
    return VaultCore.get().proxy.list_providers()

@app.post("/vault/providers/test")
async def test_provider(req: Request):
    body = await req.json()
    return await VaultCore.get().proxy.test_provider(body)


# ── Dashboard HTML UI ─────────────────────────────────────────────────────────
@app.get("/vault/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Full web dashboard for Vault — stats, audit log, policies, compliance."""
    with open("/vault/src/dashboard.html") as f:
        return HTMLResponse(content=f.read())


# ── Support UI ────────────────────────────────────────────────────────────────
@app.get("/support", response_class=HTMLResponse)
async def support():
    with open("/vault/src/support_ui.html") as f:
        return HTMLResponse(content=f.read())


# ── WebSocket: real-time audit stream ─────────────────────────────────────────
@app.websocket("/ws/audit")
async def ws_audit(ws: WebSocket):
    """
    Each client gets its own subscription queue.
    No event stealing between subscribers.
    """
    await ws.accept()
    core  = VaultCore.get()
    sub_q = await core.audit.subscribe()
    try:
        while True:
            try:
                event = await asyncio.wait_for(sub_q.get(), timeout=30.0)
                await ws.send_json(event)
            except asyncio.TimeoutError:
                # Send heartbeat so client knows connection is alive
                await ws.send_json({"type": "heartbeat", "ts": _now_iso()})
    except WebSocketDisconnect:
        pass
    finally:
        await core.audit.unsubscribe(sub_q)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _redirect_html(url: str) -> str:
    return f"""<!DOCTYPE html><html><head>
<meta http-equiv="refresh" content="0;url={url}">
<title>AXTO Vault</title>
</head><body style="background:#0a0f1e;color:#e2e8f0;font-family:sans-serif;padding:40px">
<p>Loading Vault dashboard...</p>
<script>window.location.href="{url}"</script>
</body></html>"""


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _compliance_report_text(report: dict) -> str:
    """Format compliance report as readable text for download."""
    lines = [
        f"{'='*60}",
        f"  AXTO VAULT — {report['framework']} COMPLIANCE REPORT",
        f"{'='*60}",
        f"Generated:    {report['generated_at']}",
        f"Period:       Last {report['period_days']} days",
        f"Product:      {report['product']}",
        f"",
        f"{'─'*60}",
        f"  SUMMARY",
        f"{'─'*60}",
        f"Total Requests:           {report['summary']['total_requests']:,}",
        f"Total Redactions:         {report['summary']['total_redactions']:,}",
        f"High-Sensitivity Events:  {report['summary']['high_sensitivity_events']:,}",
        f"Avg Latency (ms):         {report['summary']['avg_latency_ms']}",
        f"",
        f"{'─'*60}",
        f"  CONTROLS ({report['controls_met']}/{report['controls_total']} MET)",
        f"{'─'*60}",
    ]
    for ctrl in report.get("controls", []):
        status_icon = "✅" if ctrl["status"] == "met" else "ℹ️ "
        lines.append(f"{status_icon} [{ctrl['id']}] {ctrl['name']}")
        lines.append(f"   {ctrl['evidence']}")
        lines.append("")
    lines += [
        f"{'─'*60}",
        f"  TOP DATA CATEGORIES DETECTED",
        f"{'─'*60}",
    ]
    for cat in report["summary"]["top_data_categories"]:
        lines.append(f"  {cat['category']}: {cat['count']:,} occurrences")
    lines += [
        "",
        f"{'='*60}",
        f"  AXTO Platform — AI Privacy Layer",
        f"  https://axto.io | hallo@axto.io",
        f"{'='*60}",
    ]
    return "\n".join(lines)
