# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration | FastAPI Engine
Complete REST API for Guardian Core + Node Agent.

New endpoints in v2:
  /monitor/ueba/     — UEBA stats, anomaly summary, false positive marking
  /monitor/dns/      — DNS monitor stats, analyze domain
  /monitor/deception/— Deception status, check canary token
  /incidents/        — Incident lifecycle CRUD + playbook status
  /threat-intel/     — IP/domain/hash enrichment, IOC lookup
  /compliance/       — Framework reports, on-demand scan trigger
"""
from __future__ import annotations
import asyncio
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import structlog
from src.core import GuardianCore
from src.node import get_node
import src.reporter as reporter

log = structlog.get_logger()
app = FastAPI(title="AXTO Guardian — AI eXecution & Tools Orchestration", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup(): await GuardianCore.get().startup()

@app.on_event("shutdown")
async def shutdown(): await GuardianCore.get().shutdown()

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    c = GuardianCore.get(); node = get_node()
    return {
        "status":       "ok",
        "version":      "2.0.0",
        "license":      c.license_info.package if c.license_info else "unknown",
        "ai_vendors":   c.ai_pool.vendor_count,
        "feed_stats":   c.detector.feed_stats,
        "scan_mode":    node.scan_mode if node else "unknown",
        "scan_enabled": node.is_scanning_enabled if node else False,
        "monitors": {
            "ueba":       c.ueba.get_stats(),
            "dns":        c.dns_monitor.get_stats(),
            "deception":  c.deception.get_status(),
            "incidents":  c.incident_mgr.get_stats(),
            "threat_intel": c.threat_intel.get_stats(),
            "compliance": c.compliance.get_summary(),
        }
    }

# ── Request models ────────────────────────────────────────────────────────────
class FileScanRequest(BaseModel):
    file_path: str

class IPScanRequest(BaseModel):
    ip: str; port: Optional[int] = None

class DomainScanRequest(BaseModel):
    domain: str

class BehaviorScanRequest(BaseModel):
    process_name: str; pid: Optional[int] = None
    actions: List[Dict[str, Any]] = []

class NodeRegisterRequest(BaseModel):
    node_id: str; node_name: str; hostname: str; os_type: str

class NodeHeartbeatRequest(BaseModel):
    node_id: str; status: str; timestamp: float

class NodeAlertRequest(BaseModel):
    node_id: str; node_name: str; alert_type: str
    data: dict; timestamp: float

class ScanModeRequest(BaseModel):
    mode: str

_nodes: Dict[str, dict] = {}

# ── Scan endpoints ────────────────────────────────────────────────────────────
@app.post("/scan/file")
async def scan_file(req: FileScanRequest):
    return (await GuardianCore.get().detector.scan_file(req.file_path)).to_dict()

@app.post("/scan/ip")
async def scan_ip(req: IPScanRequest):
    return (await GuardianCore.get().detector.scan_network(req.ip, req.port)).to_dict()

@app.post("/scan/domain")
async def scan_domain(req: DomainScanRequest):
    return (await GuardianCore.get().detector.scan_domain(req.domain)).to_dict()

@app.post("/scan/behavior")
async def scan_behavior(req: BehaviorScanRequest):
    return (await GuardianCore.get().detector.scan_behavior(
        req.process_name, req.actions)).to_dict()

@app.get("/scan/mode")
async def get_scan_mode():
    node = get_node()
    if not node: return {"mode": "unknown", "scan_enabled": False}
    return node.get_scan_status()

@app.post("/scan/mode")
async def set_scan_mode(req: ScanModeRequest):
    node = get_node()
    if not node: return {"ok": False, "error": "Node not running"}
    return node.set_scan_mode(req.mode)

@app.post("/scan/trigger")
async def trigger_scan():
    node = get_node()
    if not node: return {"ok": False, "error": "Node not running"}
    return node.trigger_scan()

@app.get("/scan/status")
async def scan_status():
    node = get_node()
    if not node: return {"ok": False, "error": "Node not running"}
    return node.get_scan_status()

# ── Feed endpoints ────────────────────────────────────────────────────────────
@app.get("/feed/status")
async def feed_status():
    c = GuardianCore.get()
    return {"collector": c.collector.stats, "detector": c.detector.feed_stats}

@app.post("/feed/refresh")
async def feed_refresh(bg: BackgroundTasks):
    bg.add_task(GuardianCore.get().collector.update)
    return {"status": "refresh_triggered"}

# ── Node management ───────────────────────────────────────────────────────────
@app.post("/node/register")
async def register_node(req: NodeRegisterRequest):
    _nodes[req.node_id] = req.dict()
    GuardianCore.get().update_node_count(len(_nodes))
    return {"status": "registered", "total_nodes": len(_nodes)}

@app.post("/node/heartbeat")
async def node_heartbeat(req: NodeHeartbeatRequest):
    if req.node_id in _nodes: _nodes[req.node_id]["last_seen"] = req.timestamp
    return {"status": "ok"}

@app.post("/node/alert")
async def node_alert(req: NodeAlertRequest):
    log.warning(f"🚨 Alert from {req.node_name}", alert_type=req.alert_type, data=req.data)
    c   = GuardianCore.get()
    res = req.data.get("result", {})
    # Ingest into incident manager
    if res.get("verdict") in ("malicious","suspicious"):
        asyncio.create_task(c.incident_mgr.ingest_alert(
            source=req.alert_type,
            event_type=req.alert_type,
            target=(req.data.get("file") or req.data.get("ip") or req.data.get("domain") or ""),
            verdict=res.get("verdict","suspicious"),
            confidence=res.get("confidence",0.8),
            threat_type=res.get("threat_type","unknown"),
            indicators=res.get("indicators",[]),
            node_id=req.node_id,
            raw=req.data,
        ))
    cfg = c._cfg
    if cfg.license_validate_url and cfg.license_key:
        dashboard_url = cfg.license_validate_url.replace("/api/license-validate","")
        asyncio.create_task(reporter.report_alert(
            dashboard_url, cfg.license_key,
            node_id=req.node_id, node_name=req.node_name,
            alert_type=req.alert_type,
            verdict=res.get("verdict","malicious"),
            confidence=res.get("confidence",1.0),
            threat_type=res.get("threat_type"),
            indicators=res.get("indicators",[]),
            method=res.get("method",""),
            target=(req.data.get("file") or req.data.get("ip") or req.data.get("domain") or ""),
            target_hash=res.get("target_hash",""),
            raw_data=req.data,
        ))
    return {"status": "received"}

@app.get("/node/list")
async def list_nodes():
    return {"nodes": list(_nodes.values()), "count": len(_nodes)}

# ── License Wizard — redirect to activation page if no valid license ──────────
ACTIVATION_BYPASS_PATHS = {"/health", "/api/license/activate", "/api/license/status",
                            "/license/info", "/favicon.ico", "/static"}

@app.middleware("http")
async def license_wizard_middleware(request: Request, call_next):
    """If no valid license key is set, redirect all web requests to /activate."""
    path = request.url.path
    # Always allow API health + activation endpoints + static assets
    if any(path.startswith(p) for p in ACTIVATION_BYPASS_PATHS):
        return await call_next(request)
    # Check if license is configured
    c = GuardianCore.get()
    if c.license_info is None or not c.license_info.valid:
        # Only redirect browser requests (not API calls from agents)
        accept = request.headers.get("accept", "")
        if "text/html" in accept or path in ("/", "/activate"):
            import os
            html_path = os.path.join(os.path.dirname(__file__), "activation.html")
            if os.path.exists(html_path):
                html = open(html_path).read()
                # Inject product meta tag
                html = html.replace('</head>', '<meta name="axto-product" content="guardian"></head>', 1)
                from fastapi.responses import HTMLResponse
                return HTMLResponse(html)
    return await call_next(request)

# ── License activate endpoint (called by wizard) ─────────────────────────────
@app.post("/api/license/activate")
async def license_activate(request: Request):
    """Receives license key from first-run wizard, validates and saves it."""
    import json, os, httpx
    body = await request.json()
    key = (body.get("license_key") or "").strip().upper()
    if not key:
        return {"valid": False, "error": "No license key provided"}

    cfg = GuardianCore.get()._cfg
    validate_url = cfg.license_validate_url or "https://axto.io/api/license-validate"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            import socket as _sock, uuid as _uuid
            try:
                mid_path = "/etc/machine-id"
                machine_id = open(mid_path).read().strip() if os.path.exists(mid_path) else str(_uuid.uuid4())
            except Exception:
                machine_id = str(_uuid.uuid4())

            resp = await client.post(validate_url, json={
                "license_key": key,
                "machine_id":  machine_id,
                "product":     "guardian",
                "hostname":    _sock.gethostname(),
            })
            data = resp.json()

        if data.get("valid"):
            # Save license key to persistent file so it survives restarts
            data_dir = os.environ.get("DATA_DIR", "/guardian/data")
            os.makedirs(data_dir, exist_ok=True)
            with open(os.path.join(data_dir, "license.key"), "w") as f:
                f.write(key)
            # Also update in-memory config
            cfg.license_key = key
            # Force re-validate on next request
            core = GuardianCore.get()
            core.license_info = None
            await core._validator.validate(force=True)
            return {**data, "machine_id": machine_id[:16]}
        else:
            return {"valid": False, **data}

    except Exception as e:
        return {"valid": False, "error": str(e), "reason": "network_error"}

@app.get("/api/license/status")
async def license_status():
    c = GuardianCore.get()
    if not c.license_info:
        return {"valid": False, "reason": "not_validated"}
    return {"valid": c.license_info.valid, "reason": c.license_info.reason,
            "product": c.license_info.product, "package": c.license_info.package}

# ── License ───────────────────────────────────────────────────────────────────
@app.get("/license/info")
async def license_info():
    c = GuardianCore.get()
    if not c.license_info: return {"valid": False}
    return {"valid": c.license_info.valid, "package": c.license_info.package,
            "features": c.license_info.features, "max_nodes": c.license_info.max_nodes,
            "expires_at": c.license_info.expires_at}

# ── Response endpoints ────────────────────────────────────────────────────────
class QuarantineReq(BaseModel):
    file_path: str; threat_type: str = "manual"; confidence: float = 1.0

class BlockIPReq(BaseModel):
    ip: str; reason: str = "manual_block"; direction: str = "both"

class KillProcReq(BaseModel):
    pid: int; process_name: str = ""; reason: str = "manual_kill"

@app.post("/response/quarantine")
async def quarantine_file(req: QuarantineReq):
    return GuardianCore.get().response.quarantine_file(req.file_path, req.threat_type, req.confidence)

@app.post("/response/block-ip")
async def block_ip(req: BlockIPReq):
    return GuardianCore.get().response.block_ip(req.ip, req.reason, req.direction)

@app.delete("/response/block-ip/{ip}")
async def unblock_ip(ip: str):
    return GuardianCore.get().response.unblock_ip(ip)

@app.post("/response/kill-process")
async def kill_process(req: KillProcReq):
    return GuardianCore.get().response.kill_process(req.pid, req.process_name, req.reason)

@app.get("/response/status")
async def response_status():
    r = GuardianCore.get().response
    return {"blocked_ips": r.blocked_ips, "action_log": r.action_log[-50:],
            "action_count": len(r.action_log)}

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/analytics/stats")
async def analytics_stats(hours: int = 24):
    from src.database import get_db as _get_db
    db = await _get_db(); return await db.get_stats(hours=hours)

@app.get("/analytics/history")
async def scan_history(limit: int = 100, verdict: str = "", node_id: str = ""):
    from src.database import get_db as _get_db
    db = await _get_db()
    return {"events": await db.get_scan_history(limit=limit, verdict=verdict, node_id=node_id)}

@app.get("/analytics/risk")
async def host_risk():
    from src.database import get_db as _get_db
    db = await _get_db(); return {"hosts": await db.get_risk_scores()}

@app.get("/analytics/quarantine")
async def quarantine_log():
    from src.database import get_db as _get_db
    db = await _get_db(); return {"quarantine": await db.get_quarantine_log()}

# ── UEBA endpoints ────────────────────────────────────────────────────────────
@app.get("/monitor/ueba/stats")
async def ueba_stats():
    return GuardianCore.get().ueba.get_stats()

@app.get("/monitor/ueba/anomalies")
async def ueba_anomalies():
    return {"anomalies": GuardianCore.get().ueba.get_anomaly_summary()}

class UEBAFPRequest(BaseModel):
    entity_id: str

@app.post("/monitor/ueba/false-positive")
async def ueba_false_positive(req: UEBAFPRequest):
    GuardianCore.get().ueba.mark_false_positive(req.entity_id)
    return {"ok": True, "entity": req.entity_id}

class LoginObserveReq(BaseModel):
    username: str; source_ip: str = ""; success: bool = True

@app.post("/monitor/ueba/observe-login")
async def ueba_observe_login(req: LoginObserveReq):
    result = GuardianCore.get().ueba.observe_login(req.username, req.source_ip, req.success)
    return {"anomaly": result}

# ── DNS Monitor endpoints ─────────────────────────────────────────────────────
@app.get("/monitor/dns/stats")
async def dns_stats():
    return GuardianCore.get().dns_monitor.get_stats()

class DNSAnalyzeReq(BaseModel):
    domain: str; src_process: str = ""

@app.post("/monitor/dns/analyze")
async def dns_analyze(req: DNSAnalyzeReq):
    result = await GuardianCore.get().dns_monitor.analyze_domain(req.domain, req.src_process)
    return {"result": result}

# ── Deception endpoints ───────────────────────────────────────────────────────
@app.get("/monitor/deception/status")
async def deception_status():
    return GuardianCore.get().deception.get_status()

class CanaryCheckReq(BaseModel):
    token: str

@app.post("/monitor/deception/check-canary")
async def check_canary(req: CanaryCheckReq):
    is_canary = GuardianCore.get().deception.check_canary_token(req.token)
    if is_canary:
        asyncio.create_task(GuardianCore.get().incident_mgr.ingest_alert(
            source="deception", event_type="canary_token_used",
            target=req.token[:16]+"...", verdict="malicious", confidence=0.99,
            threat_type="deception_triggered", indicators=[f"canary:{req.token[:16]}"],
        ))
    return {"is_canary": is_canary, "action": "alert_triggered" if is_canary else "ok"}

# ── Incident Manager endpoints ────────────────────────────────────────────────
@app.get("/incidents/")
async def list_incidents(status: str = "", severity: str = "", limit: int = 100):
    return {"incidents": GuardianCore.get().incident_mgr.list_incidents(status, severity, limit),
            "stats": GuardianCore.get().incident_mgr.get_stats()}

@app.get("/incidents/{inc_id}")
async def get_incident(inc_id: str):
    inc = GuardianCore.get().incident_mgr.get_incident(inc_id)
    if not inc: raise HTTPException(404, "Incident not found")
    return inc.to_dict()

class IncidentUpdateReq(BaseModel):
    status: Optional[str] = None; assigned_to: Optional[str] = None
    notes: Optional[str] = None; false_positive: Optional[bool] = None

@app.patch("/incidents/{inc_id}")
async def update_incident(inc_id: str, req: IncidentUpdateReq):
    result = GuardianCore.get().incident_mgr.update_incident(
        inc_id, status=req.status, assigned_to=req.assigned_to,
        notes=req.notes, false_positive=req.false_positive)
    if not result: raise HTTPException(404, "Incident not found")
    return result

class IngestAlertReq(BaseModel):
    source: str; event_type: str; target: str
    verdict: str; confidence: float; threat_type: str
    indicators: List[str] = []; node_id: str = ""

@app.post("/incidents/ingest")
async def ingest_alert(req: IngestAlertReq):
    inc = await GuardianCore.get().incident_mgr.ingest_alert(
        source=req.source, event_type=req.event_type, target=req.target,
        verdict=req.verdict, confidence=req.confidence, threat_type=req.threat_type,
        indicators=req.indicators, node_id=req.node_id)
    return {"incident": inc.to_dict() if inc else None}

# ── Threat Intelligence endpoints ─────────────────────────────────────────────
@app.get("/threat-intel/stats")
async def ti_stats():
    return GuardianCore.get().threat_intel.get_stats()

@app.get("/threat-intel/ip/{ip}")
async def enrich_ip(ip: str):
    return await GuardianCore.get().threat_intel.enrich_ip(ip)

@app.get("/threat-intel/domain/{domain}")
async def enrich_domain(domain: str):
    return await GuardianCore.get().threat_intel.enrich_domain(domain)

@app.get("/threat-intel/hash/{file_hash}")
async def enrich_hash(file_hash: str):
    return await GuardianCore.get().threat_intel.enrich_hash(file_hash)

@app.get("/threat-intel/cve/{cve_id}")
async def get_cve(cve_id: str):
    result = await GuardianCore.get().threat_intel.get_cve(cve_id)
    if not result: raise HTTPException(404, "CVE not found")
    return result

class IOCCheckReq(BaseModel):
    value: str; ioc_type: str = ""

@app.post("/threat-intel/check")
async def check_ioc(req: IOCCheckReq):
    is_malicious = GuardianCore.get().threat_intel.check_ioc(req.value, req.ioc_type)
    return {"value": req.value, "malicious": is_malicious}

# ── Compliance endpoints ───────────────────────────────────────────────────────
@app.get("/compliance/summary")
async def compliance_summary():
    return GuardianCore.get().compliance.get_summary()

@app.get("/compliance/{framework}")
async def compliance_report(framework: str):
    report = GuardianCore.get().compliance.get_report(framework)
    if not report: raise HTTPException(404, f"No report for framework '{framework}'")
    return report

@app.post("/compliance/run")
async def run_compliance(bg: BackgroundTasks):
    bg.add_task(GuardianCore.get().compliance.run_all)
    return {"status": "compliance_scan_started"}

@app.post("/compliance/{framework}/run")
async def run_framework_compliance(framework: str, bg: BackgroundTasks):
    bg.add_task(GuardianCore.get().compliance.run_framework, framework)
    return {"status": f"compliance_scan_started", "framework": framework}

# ═══════════════════════════════════════════════════════════════════════════════
# DEEP HEALTH API
# ═══════════════════════════════════════════════════════════════════════════════

from src.health import (
    run_full_diagnostic, run_component_diagnostic, run_autofix,
    get_watchdog, ALL_CHECKS,
)

@app.get("/health/deep")
async def deep_health():
    """Full diagnostic of every component. Returns status + cause + fix for each."""
    result = await run_full_diagnostic()
    return result.to_dict()

@app.get("/health/{component}")
async def component_health(component: str):
    """Diagnostic for a single component."""
    if component not in ALL_CHECKS:
        raise HTTPException(404, f"Unknown component: {component}. "
                            f"Available: {list(ALL_CHECKS.keys())}")
    result = await run_component_diagnostic(component)
    return result.to_dict()

@app.post("/health/{component}/autofix")
async def autofix_component(component: str):
    """Attempt auto-fix for a component (if auto_fixable=true)."""
    result = await run_autofix(component)
    return result

@app.get("/health/watchdog/status")
async def watchdog_status():
    """Current watchdog state and last health snapshot."""
    wd = get_watchdog()
    last = wd.last_health
    return {
        "running": wd._running,
        "interval_sec": wd._interval,
        "last_health": last.to_dict() if last else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RUNBOOK API
# ═══════════════════════════════════════════════════════════════════════════════

from src.runbook import (get_runbook, search_runbooks, get_runbook_for_error, list_all)

@app.get("/runbook/")
async def list_runbooks(component: str = ""):
    """List all available runbooks."""
    return {"runbooks": list_all(component), "total": len(list_all(component))}

@app.get("/runbook/{code}")
async def get_runbook_detail(code: str):
    """Get full runbook for a specific error code."""
    rb = get_runbook(code)
    if not rb:
        raise HTTPException(404, f"Runbook {code} not found. "
                            f"Try GET /runbook/ for full list.")
    return rb.to_dict()

@app.get("/runbook/search/{query}")
async def search_runbook(query: str, component: str = ""):
    """Search runbooks by keyword."""
    results = search_runbooks(query, component)
    return {"results": [rb.to_dict() for rb in results], "count": len(results)}

class ErrorDiagnoseReq(BaseModel):
    error_message: str

@app.post("/runbook/for-error")
async def runbook_for_error(req: ErrorDiagnoseReq):
    """Paste an error message, get matching runbooks."""
    rbs = get_runbook_for_error(req.error_message)
    return {"runbooks": [rb.to_dict() for rb in rbs], "count": len(rbs)}


# ═══════════════════════════════════════════════════════════════════════════════
# AI SUPPORT BOT API
# ═══════════════════════════════════════════════════════════════════════════════

from src.support_bot import get_guardian_bot

class AskRequest(BaseModel):
    question:   str
    session_id: str = "default"

class DiagnoseRequest(BaseModel):
    error_message: str
    session_id:    str = "default"

@app.post("/support/ask")
async def support_ask(req: AskRequest):
    """Ask the AI support bot a question. Gets live system context automatically."""
    return await get_guardian_bot().ask(req.question, req.session_id)

@app.post("/support/diagnose")
async def support_diagnose(req: DiagnoseRequest):
    """Paste an error message, get AI-powered diagnosis with fix steps."""
    return await get_guardian_bot().diagnose(req.error_message, req.session_id)

@app.get("/support/history")
async def support_history(session_id: str = "default", limit: int = 20):
    """Get conversation history for a session."""
    return {"history": get_guardian_bot().get_history(session_id, limit)}

@app.delete("/support/history/{session_id}")
async def clear_support_history(session_id: str):
    """Clear conversation history for a session."""
    get_guardian_bot().clear_session(session_id)
    return {"ok": True}

@app.websocket("/support/ws/{session_id}")
async def support_ws(websocket: WebSocket, session_id: str):
    """WebSocket for real-time streaming support chat."""
    await websocket.accept()
    bot = get_guardian_bot()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg  = json.loads(data)
                question = msg.get("question", data)
            except Exception:
                question = data

            await websocket.send_text(json.dumps({"type": "start"}))

            async for chunk in bot.stream_ask(question, session_id):
                await websocket.send_text(json.dumps({"type": "chunk", "text": chunk}))

            await websocket.send_text(json.dumps({"type": "done"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass

# ── Support UI static serving ─────────────────────────────────────────────────
from fastapi.responses import HTMLResponse
from pathlib import Path as _Path

@app.get("/support/ui", response_class=HTMLResponse)
async def support_ui():
    """Serve the embedded AI Support Bot UI."""
    ui_file = _Path(__file__).parent / "support_ui.html"
    if ui_file.exists():
        return HTMLResponse(ui_file.read_text())
    return HTMLResponse("<h1>Support UI not found</h1>")

# ═══════════════════════════════════════════════════════════════════════════════
# TIER 2 ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

import uuid as _uuid
from src.websocket_hub import get_hub
from src.multitenant import get_tenant_manager, resolve_tenant_from_request, MULTITENANT
from src.alerting import get_alerting
from src.siem_forwarder import get_siem
from src.threat_hunting import get_threat_hunter
from src.pdf_reports import (generate_compliance_report, generate_incident_report,
                               generate_executive_summary, list_reports)
from src.monitor.ml_anomaly import get_ml_engine
from fastapi.responses import FileResponse


# ── Real-time WebSocket ────────────────────────────────────────────────────────
@app.websocket("/ws/events/{session_id}")
async def ws_events(websocket: WebSocket, session_id: str, request: Request = None):
    """Real-time event stream. Connect once, receive all alerts pushed immediately."""
    tenant_id = "default"
    client = await get_hub().connect(websocket, session_id, tenant_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                # Handle ping/subscribe messages
                msg = json.loads(data) if data.startswith("{") else {}
                if msg.get("type") == "subscribe":
                    client.subscriptions = set(msg.get("events", []))
                elif msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    break
    except Exception:
        pass
    finally:
        await get_hub().disconnect(session_id)

@app.get("/ws/stats")
async def ws_stats():
    return get_hub().get_stats()


# ── Multi-tenant ──────────────────────────────────────────────────────────────
class TenantCreateReq(BaseModel):
    tenant_id:  str
    name:       str = ""
    plan:       str = "professional"

class SuperadminAuthReq(BaseModel):
    key: str

@app.get("/tenants/")
async def list_tenants(request: Request):
    mgr = get_tenant_manager()
    # Require superadmin key for listing all tenants
    auth_key = request.headers.get("X-Superadmin-Key", "")
    if MULTITENANT and not mgr.authenticate_superadmin(auth_key):
        raise HTTPException(403, "Superadmin key required for multi-tenant operations")
    return {"tenants": mgr.list_tenants(), "multitenant_enabled": MULTITENANT}

@app.post("/tenants/")
async def create_tenant(req: TenantCreateReq, request: Request):
    mgr = get_tenant_manager()
    auth_key = request.headers.get("X-Superadmin-Key", "")
    if MULTITENANT and not mgr.authenticate_superadmin(auth_key):
        raise HTTPException(403, "Superadmin key required")
    tenant = mgr.create_tenant(req.tenant_id, req.name, req.plan)
    return {"ok": True, "tenant": tenant.to_dict()}

@app.get("/tenants/aggregate")
async def tenant_aggregate(request: Request):
    """MSSP view: aggregate stats across all tenants. Tier 2: uses PostgreSQL."""
    mgr = get_tenant_manager()
    auth_key = request.headers.get("X-Superadmin-Key", "")
    if MULTITENANT and not mgr.authenticate_superadmin(auth_key):
        raise HTTPException(403, "Superadmin key required")
    return await mgr.get_aggregate_stats_async()


# ── Alerting ──────────────────────────────────────────────────────────────────
@app.get("/alerting/stats")
async def alerting_stats():
    return get_alerting().get_stats()

@app.post("/alerting/test/{channel}")
async def alerting_test(channel: str):
    """Send test alert to verify channel configuration."""
    result = get_alerting().test_channel(channel)
    return {"channel": channel, "result": result}

class ManualAlertReq(BaseModel):
    title:    str
    body:     str
    severity: str = "medium"

@app.post("/alerting/send")
async def manual_alert(req: ManualAlertReq):
    result = await get_alerting().send_alert(req.title, req.body, req.severity)
    return result


# ── SIEM Forwarder ────────────────────────────────────────────────────────────
@app.get("/siem/stats")
async def siem_stats():
    return get_siem().get_stats()

@app.post("/siem/test")
async def siem_test():
    """Send test event to SIEM to verify connectivity."""
    await get_siem().forward("guardian.test", {
        "message": "SIEM connectivity test from AXTO Guardian",
        "verdict": "clean", "confidence": 1.0,
    }, severity="info")
    return {"ok": True, "message": "Test event queued for SIEM"}

@app.get("/siem/stream")
async def siem_stream_info():
    """
    Tier 2: Redis Stream metadata.
    Consumers can XREAD from guardian:siem_stream to get all SIEM events.
    Compatible with Logstash redis input, Filebeat redis module, custom ETL.
    """
    info = await get_siem().get_stream_info()
    if not info.get("available"):
        return {
            "available": False,
            "reason":    info.get("reason", "Redis not configured"),
            "how_to_enable": "Set GUARDIAN_DB_MODE=distributed and GUARDIAN_REDIS_URL",
        }
    return info


# ── Threat Hunting ────────────────────────────────────────────────────────────
class HuntQueryReq(BaseModel):
    sql:    str
    params: list = []

class IOCSweepReq(BaseModel):
    iocs: List[str]

class TimelineReq(BaseModel):
    host_or_ip: str
    hours:      int = 24

@app.post("/hunt/query")
async def hunt_query(req: HuntQueryReq):
    """Run custom SQL query against Guardian DB (SELECT only)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, get_threat_hunter().run_query, req.sql, tuple(req.params)
    )

@app.get("/hunt/templates")
async def hunt_templates():
    return {"templates": get_threat_hunter().list_templates()}

@app.post("/hunt/run/{template_id}")
async def hunt_run_template(template_id: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, get_threat_hunter().run_template, template_id
    )

@app.post("/hunt/ioc-sweep")
async def hunt_ioc_sweep(req: IOCSweepReq):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, get_threat_hunter().run_ioc_sweep, req.iocs
    )

@app.post("/hunt/timeline")
async def hunt_timeline(req: TimelineReq):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, get_threat_hunter().build_timeline, req.host_or_ip, req.hours
    )

@app.get("/hunt/stats")
async def hunt_stats():
    return get_threat_hunter().get_stats()


# ── Reports / PDF ─────────────────────────────────────────────────────────────
@app.post("/reports/compliance/{framework}")
async def gen_compliance_report(framework: str):
    path = await generate_compliance_report(framework)
    if not path:
        raise HTTPException(500, "Report generation failed")
    return {"ok": True, "path": str(path), "filename": path.name}

@app.post("/reports/incident/{incident_id}")
async def gen_incident_report(incident_id: str):
    path = await generate_incident_report(incident_id)
    if not path:
        raise HTTPException(404, "Incident not found")
    return {"ok": True, "path": str(path), "filename": path.name}

@app.post("/reports/executive")
async def gen_executive_report():
    path = await generate_executive_summary()
    if not path:
        raise HTTPException(500, "Report generation failed")
    return {"ok": True, "path": str(path), "filename": path.name}

@app.get("/reports/")
async def list_report_files():
    return {"reports": list_reports()}

@app.get("/reports/download/{filename}")
async def download_report(filename: str):
    from src.pdf_reports import REPORTS_DIR
    path = REPORTS_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Report not found")
    return FileResponse(str(path), media_type="text/html",
                        filename=filename)


# ── ML Anomaly ────────────────────────────────────────────────────────────────
@app.get("/ml/stats")
async def ml_stats():
    return get_ml_engine().get_stats()

class MLScoreReq(BaseModel):
    entity_type: str    # process | network | login
    entity_id:   str
    features:    Dict[str, float]

@app.post("/ml/score")
async def ml_score(req: MLScoreReq):
    """Get ML anomaly score for an entity observation."""
    engine = get_ml_engine()
    if req.entity_type == "process":
        score, method = engine.score_process(
            req.entity_id,
            req.features.get("cpu_pct", 0),
            req.features.get("mem_mb", 0),
            req.features.get("net_bytes", 0),
            req.features.get("file_ops", 0),
        )
    elif req.entity_type == "network":
        score, method = engine.score_network(
            req.entity_id,
            req.features.get("bytes_out", 0),
            req.features.get("connections", 0),
            req.features.get("hour", 0),
        )
    elif req.entity_type == "login":
        score, method = engine.score_login(
            req.entity_id,
            req.features.get("hour", 0),
            req.features.get("failed", 0),
            req.features.get("day_of_week", 0),
        )
    else:
        raise HTTPException(400, "entity_type must be: process | network | login")
    return {
        "entity": req.entity_id, "type": req.entity_type,
        "anomaly_score": score, "method": method,
        "is_anomaly": score > 0.6,
        "verdict": "suspicious" if score > 0.75 else ("warning" if score > 0.6 else "normal"),
    }


# ═════════════════════════════════════════════════════════════════════════════
# TIER 2 — ATTACK GRAPH ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

class AttackGraphReq(BaseModel):
    incident_id: str = ""
    limit:       int = 200


@app.post("/attack-graph/build/{incident_id}")
async def build_attack_graph(incident_id: str):
    """Build attack graph from an existing incident."""
    c = GuardianCore.get()
    inc = c.incident_mgr.get_incident(incident_id)
    if not inc:
        raise HTTPException(404, f"Incident {incident_id} not found")
    from src.attack_graph import get_attack_graph
    graph = await get_attack_graph().build_from_incident(inc.to_dict())
    return graph


@app.get("/attack-graph/{incident_id}")
async def get_attack_graph_api(incident_id: str):
    """Get attack graph for an incident (nodes + edges for visualization)."""
    from src.attack_graph import get_attack_graph
    graph = await get_attack_graph().get_graph(incident_id)
    return graph


@app.get("/attack-graph/")
async def list_attack_graphs():
    """Get full attack graph (all incidents)."""
    from src.attack_graph import get_attack_graph
    graph = await get_attack_graph().get_graph()
    return graph


# ═════════════════════════════════════════════════════════════════════════════
# TIER 2 — SEMANTIC SEARCH ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

class SemanticSearchReq(BaseModel):
    query:   str
    top_k:   int = 10


@app.post("/hunt/semantic")
async def semantic_hunt(req: SemanticSearchReq):
    """
    Semantic threat hunting — query in natural language.
    Searches IOC, MITRE techniques, incident descriptions using vector similarity.
    """
    if not req.query.strip():
        raise HTTPException(400, "query cannot be empty")
    from src.attack_graph import get_semantic_search
    searcher = get_semantic_search()
    results  = await searcher.search(req.query, top_k=req.top_k)
    return results


@app.post("/hunt/semantic/index-incidents")
async def index_all_incidents():
    """Re-index all incidents into semantic search index."""
    c = GuardianCore.get()
    from src.attack_graph import get_semantic_search
    searcher = get_semantic_search()
    incidents = c.incident_mgr.list_incidents(limit=1000)
    count = 0
    for inc in incidents:
        await searcher.index_incident(inc)
        count += 1
    return {"indexed": count}


# ═════════════════════════════════════════════════════════════════════════════
# TIER 2 — DISTRIBUTED DB STATUS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/db/status")
async def db_status():
    """Show current database mode (sqlite vs distributed) and connection status."""
    from src.database_distributed import get_db_mode, get_distributed_db, get_redis
    mode = get_db_mode()
    pg_ok = False
    redis_ok = False
    if mode == "distributed":
        pg = await get_distributed_db()
        pg_ok = pg is not None and pg.is_connected()
        redis = await get_redis()
        redis_ok = redis is not None and redis.is_connected()
    return {
        "mode":           mode,
        "postgres_ok":    pg_ok,
        "redis_ok":       redis_ok,
        "tier":           2 if mode == "distributed" else 1,
        "description":    "PostgreSQL + Redis" if mode == "distributed" else "SQLite (single-node)",
    }


# ═════════════════════════════════════════════════════════════════════════════
# TIER 2 — eBPF STATUS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/monitor/ebpf/stats")
async def ebpf_stats():
    """eBPF kernel monitor stats (Tier 2 only)."""
    c = GuardianCore.get()
    return c.ebpf.get_stats()


# ═════════════════════════════════════════════════════════════════════════════
# TIER 2 — INTERACTIVE REMEDIATION WIZARD
# ═════════════════════════════════════════════════════════════════════════════

class RemediationWizardReq(BaseModel):
    incident_id: str
    step:        str = "start"   # start | confirm_isolate | confirm_eradicate | confirm_recover
    context:     dict = {}


@app.post("/remediation/wizard/{incident_id}")
async def remediation_wizard(incident_id: str, req: RemediationWizardReq):
    """
    Interactive step-by-step remediation wizard for an incident.
    Guides analyst through: Contain → Eradicate → Recover → Lessons Learned.
    """
    c = GuardianCore.get()
    inc = c.incident_mgr.get_incident(incident_id)
    if not inc:
        raise HTTPException(404, f"Incident {incident_id} not found")

    inc_dict = inc.to_dict()
    step     = req.step

    # Step definitions per incident status
    if step == "start":
        return {
            "incident_id": incident_id,
            "current_step": "start",
            "incident_summary": {
                "title":    inc_dict.get("title",""),
                "severity": inc_dict.get("severity",""),
                "status":   inc_dict.get("status",""),
                "threat":   inc_dict.get("threat_type",""),
                "target":   inc_dict.get("target",""),
            },
            "next_steps": [
                {"step": "contain",    "label": "🔒 Contain Threat",
                 "description": "Isolate affected host, block malicious IP/process"},
                {"step": "eradicate",  "label": "🗑️  Eradicate",
                 "description": "Remove malware, clean persistence mechanisms"},
                {"step": "recover",    "label": "♻️  Recover",
                 "description": "Restore services, verify clean state"},
                {"step": "postmortem", "label": "📋 Lessons Learned",
                 "description": "Document findings, update detection rules"},
            ],
            "ai_recommendation": _wizard_ai_recommendation(inc_dict),
        }

    if step == "contain":
        actions_taken = []
        # Auto-execute containment playbook
        if inc_dict.get("status") == "open":
            c.incident_mgr.update_incident(incident_id, status="contained")
            actions_taken.append("Status → contained")
        return {
            "incident_id":  incident_id,
            "step":         "contain",
            "actions_taken":actions_taken,
            "manual_steps": _containment_steps(inc_dict),
            "next_step":    "eradicate",
        }

    if step == "eradicate":
        c.incident_mgr.update_incident(incident_id, status="eradicating")
        return {
            "incident_id":  incident_id,
            "step":         "eradicate",
            "manual_steps": _eradication_steps(inc_dict),
            "next_step":    "recover",
        }

    if step == "recover":
        c.incident_mgr.update_incident(incident_id, status="recovering")
        return {
            "incident_id":  incident_id,
            "step":         "recover",
            "manual_steps": _recovery_steps(inc_dict),
            "next_step":    "postmortem",
        }

    if step == "postmortem":
        c.incident_mgr.update_incident(incident_id, status="closed",
                                       notes=req.context.get("notes",""))
        return {
            "incident_id":  incident_id,
            "step":         "postmortem",
            "closed":       True,
            "template": {
                "what_happened": inc_dict.get("title",""),
                "root_cause":    inc_dict.get("threat_type",""),
                "timeline":      [e.get("description","") for e in inc_dict.get("events",[])[:10]],
                "improvements":  _postmortem_improvements(inc_dict),
            },
        }

    raise HTTPException(400, f"Unknown step: {step}")


def _wizard_ai_recommendation(inc: dict) -> str:
    threat = inc.get("threat_type","").lower()
    sev    = inc.get("severity","").lower()
    if "ransomware" in threat:
        return "⚠️ CRITICAL: Immediately isolate all affected hosts from network. Do NOT restart. Preserve memory dump for forensics."
    if "data_exfil" in threat or "exfiltration" in threat:
        return "🔴 Block outbound connections from affected host immediately. Preserve network logs for forensics."
    if "brute" in threat:
        return "Lock compromised accounts. Enable MFA. Review all successful logins in last 72h."
    if sev == "critical":
        return "Escalate immediately. Isolate affected systems. Engage incident response team."
    return "Follow standard containment → eradication → recovery workflow."


def _containment_steps(inc: dict) -> list:
    threat = inc.get("threat_type","").lower()
    steps = [f"1. Verify alert: confirm {inc.get('target','')} is compromised"]
    if "ransomware" in threat:
        steps += [
            "2. Immediately disconnect host from network (unplug cable / disable WiFi)",
            "3. Snapshot VM if possible (for forensics)",
            "4. Block all outbound traffic from host IP at firewall",
        ]
    else:
        steps += [
            "2. Block malicious IP/domain at perimeter firewall",
            "3. Kill identified malicious process",
            "4. Quarantine affected files",
        ]
    steps.append("5. Notify security team and management")
    return steps


def _eradication_steps(inc: dict) -> list:
    return [
        "1. Remove malware files identified in indicators",
        "2. Clean registry persistence keys (Windows) or cron jobs (Linux)",
        "3. Reset compromised account passwords",
        "4. Revoke any stolen API keys / tokens",
        "5. Patch the vulnerability exploited (check CVE if available)",
        "6. Run full antivirus scan on affected host",
    ]


def _recovery_steps(inc: dict) -> list:
    return [
        "1. Restore from clean backup (pre-incident)",
        "2. Verify system integrity (checksums, AIDE, Tripwire)",
        "3. Re-enable affected services gradually",
        "4. Monitor closely for 72h post-recovery",
        "5. Update threat feeds and detection signatures",
    ]


def _postmortem_improvements(inc: dict) -> list:
    return [
        "Update detection rules based on observed IOCs",
        "Review and tighten network segmentation",
        "Enable additional monitoring on affected asset type",
        "Schedule security awareness training if user-triggered",
        "Document IOCs for threat intelligence sharing",
    ]
