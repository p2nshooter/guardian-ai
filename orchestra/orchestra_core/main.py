# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration — Main API
FastAPI engine: job routing, worker management, AI provider orchestration.
Serves local console UI at /console (localhost:8080)
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import enforcement
import security_hardening
import credential_vault
import ai_providers
import worker_manager
import job_router
import routing_engine
import database as db
from autoscaler import get_autoscaler
from semantic_router import get_classifier, get_inj_detector

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
)
logger = logging.getLogger("orchestra.main")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="AXTO Orchestra — AI eXecution & Tools Orchestration", version="2.0.0", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

CONSOLE_PASSWORD = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "orchestra-console")
CONSOLE_DIR      = Path(__file__).parent / "console"


# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    db.init_db()
    logger.info("=" * 60)
    logger.info("  AXTO Orchestra — AI eXecution & Tools Orchestration v2.0.0 — Starting up")
    logger.info("=" * 60)

    # Security hardening
    hw = security_hardening.run_all()
    logger.info(f"Hardening: {hw['checks_passed']}/{hw['checks_total']} passed")
    if hw.get("critical_failure"):
        logger.critical("CRITICAL HARDENING FAILURE — shutting down")
        raise SystemExit(1)

    # License enforcement
    state = enforcement.run_enforcement()
    logger.info(f"License: {state['status']} | Tier: {state.get('tier','?')} | ID: {state.get('license_id','TRIAL')}")
    if state["status"] != "ACTIVE":
        logger.warning(f"WARNING: {state.get('error')} — operating in degraded mode")

    logger.info(f"Unit ID: {enforcement.get_unit_id()}")
    logger.info(f"Console: http://0.0.0.0:8080/console")
    get_autoscaler().start()
    logger.info("AXTO Orchestra — AI eXecution & Tools Orchestration ready ✓")


@app.on_event("shutdown")
async def shutdown():
    """Graceful shutdown — flush in-flight jobs to history before exit."""
    logger.info("AXTO Orchestra — AI eXecution & Tools Orchestration shutting down...")
    # Pause queue so no new jobs are dispatched
    job_router.pause_queue()
    # Give active threads up to 10s to finish
    import time as _time
    deadline = _time.time() + 10
    while job_router.get_queue_stats().get("active_threads", 0) > 0 and _time.time() < deadline:
        _time.sleep(0.2)
    active = job_router.get_queue_stats().get("active_threads", 0)
    if active:
        logger.warning(f"Shutdown: {active} job(s) still running — forcing exit")
    else:
        logger.info("Shutdown: all active jobs completed cleanly")
    logger.info("AXTO Orchestra — AI eXecution & Tools Orchestration shutdown complete")


# ── Auth ─────────────────────────────────────────────────────────────────────

async def require_console(request: Request):
    token = (
        request.headers.get("X-Console-Token")
        or request.cookies.get("console_token")
        or request.query_params.get("token")
    )
    if not token or token != CONSOLE_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized — invalid console token")
    return token


async def require_worker_auth(request: Request):
    token = (
        request.headers.get("X-Orchestra-Worker-Token")
        or request.headers.get("Authorization", "").replace("Bearer ", "")
    )
    if not token:
        raise HTTPException(status_code=401, detail="Worker authentication required")
    return token


# ── Console UI ────────────────────────────────────────────────────────────────

@app.get("/console", response_class=HTMLResponse)
async def serve_console():
    console_html = CONSOLE_DIR / "index.html"
    if console_html.exists():
        return HTMLResponse(console_html.read_text())
    return HTMLResponse("<h1>Orchestra Console</h1><p>Console UI not found.</p>")


# ── License Wizard middleware — redirect to activation if no license ──────────
ORCH_BYPASS = {"/health", "/api/license/activate", "/api/license/status", "/favicon.ico"}

@app.middleware("http")
async def orch_license_wizard(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(p) for p in ORCH_BYPASS):
        return await call_next(request)
    state = enforcement.get_enforcement_state()
    if state.get("status") != "ACTIVE":
        accept = request.headers.get("accept", "")
        if "text/html" in accept or path in ("/", "/console", "/activate"):
            import os
            # Try console dir first, then package dir
            for loc in [CONSOLE_DIR / "activation.html",
                        Path(__file__).parent / "activation.html"]:
                if loc.exists():
                    html = loc.read_text()
                    html = html.replace('</head>', '<meta name="axto-product" content="orchestra"></head>', 1)
                    return HTMLResponse(html)
    return await call_next(request)


# ── License activate endpoint ─────────────────────────────────────────────────
@app.post("/api/license/activate")
async def orch_license_activate(request: Request):
    import os, httpx, socket as _sock, uuid as _uuid
    body = await request.json()
    key = (body.get("license_key") or "").strip().upper()
    if not key:
        return JSONResponse({"valid": False, "error": "No license key"}, status_code=400)

    validate_url = os.environ.get("AXTO_LICENSE_SERVER", "https://axto.io/api/license-validate")
    try:
        mid_path = "/etc/machine-id"
        machine_id = open(mid_path).read().strip() if os.path.exists(mid_path) else str(_uuid.uuid4())
    except Exception:
        machine_id = str(_uuid.uuid4())

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(validate_url, json={
                "license_key": key,
                "machine_id":  machine_id,
                "product":     "orchestra",
                "hostname":    _sock.gethostname(),
            })
            data = resp.json()

        if data.get("valid"):
            data_dir = os.environ.get("DATA_DIR", "./data")
            os.makedirs(data_dir, exist_ok=True)
            with open(os.path.join(data_dir, "license.key"), "w") as f:
                f.write(key)
            # Update enforcement state
            enforcement._enforcement_state = {"status": "ACTIVE", "license_id": key[:12]}
            return {**data, "machine_id": machine_id[:16]}
        return {"valid": False, **data}
    except Exception as e:
        return JSONResponse({"valid": False, "error": str(e), "reason": "network_error"}, status_code=503)

@app.get("/")
async def root():
    return {"service": "AXTO Orchestra — AI eXecution & Tools Orchestration", "version": "2.0.0", "console": "http://localhost:8080/console"}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    state    = enforcement.get_enforcement_state()
    hw       = security_hardening.run_all()
    workers  = worker_manager.get_all_workers()
    q_stats  = job_router.get_queue_stats()
    return {
        "status":         "ok" if state.get("status") == "ACTIVE" else "degraded",
        "orchestra_core": "running",
        "license_status": state.get("status"),
        "tier":           state.get("tier"),
        "workers_online": sum(1 for w in workers if w.get("status") == "active"),
        "queue_depth":    q_stats.get("queued", 0),
        "hardening":      {"passed": hw["checks_passed"], "total": hw["checks_total"]},
        "checked_at":     datetime.now(timezone.utc).isoformat(),
    }


@app.get("/status")
async def status(_=Depends(require_console)):
    state   = enforcement.get_enforcement_state()
    hw      = security_hardening.run_all()
    workers = worker_manager.get_all_workers()
    nodes   = worker_manager.get_all_nodes()
    q_stats = job_router.get_queue_stats()
    cost    = job_router.get_cost_summary()
    routing = routing_engine.get_routing_status(workers)

    return {
        "license":  state,
        "hardening": hw,
        "workers":  {"list": workers, "total": len(workers), "online": sum(1 for w in workers if w.get("status") == "active")},
        "nodes":    {"list": nodes, "total": len(nodes), "online": sum(1 for n in nodes if n.get("status") == "online")},
        "queue":    q_stats,
        "cost":     cost,
        "routing":  routing,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


# ── License ───────────────────────────────────────────────────────────────────

@app.get("/api/license/status")
async def license_status():
    state = enforcement.get_enforcement_state()
    return {
        "status":       state.get("status"),
        "tier":         state.get("tier"),
        "license_id":   state.get("license_id"),
        "license_mode": state.get("license_mode"),
        "client_name":  state.get("client_name"),
        "wl_name":      state.get("wl_name"),
        "expires_at":   state.get("expires_at"),
        "cpu_workers":  state.get("cpu_workers"),
        "gpu_workers":  state.get("gpu_workers"),
        "max_nodes":    state.get("max_nodes"),
        "features":     state.get("features", []),
        "unit_id":      state.get("unit_id"),
        "error":        state.get("error") if state.get("status") != "ACTIVE" else None,
    }


@app.get("/api/license/unit_id")
async def get_unit_id():
    return {"unit_id": enforcement.get_unit_id()}


class InstallLicenseRequest(BaseModel):
    artifact: str


@app.post("/api/license/install")
async def install_license(req: InstallLicenseRequest, _=Depends(require_console)):
    result = enforcement.install_license(req.artifact)
    if not result["ok"]:
        return JSONResponse(status_code=400, content={"error": result.get("error")})
    return {"ok": True, "status": result["state"].get("status"), "tier": result["state"].get("tier")}


# ── Credential Vault ─────────────────────────────────────────────────────────

class StoreKeyRequest(BaseModel):
    provider_id: str
    api_key:     str
    label:       str = ""


@app.get("/api/vault/providers")
async def vault_list(_=Depends(require_console)):
    return {"providers": credential_vault.list_providers()}


@app.post("/api/vault/store")
async def vault_store(req: StoreKeyRequest, _=Depends(require_console)):
    result = credential_vault.store_key(req.provider_id, req.api_key, req.label)
    if not result["ok"]:
        return JSONResponse(status_code=400, content=result)
    return result


@app.delete("/api/vault/{provider_id}")
async def vault_delete(provider_id: str, _=Depends(require_console)):
    ok = credential_vault.delete_key(provider_id)
    return {"ok": ok}


@app.post("/api/vault/test/{provider_id}")
async def vault_test(provider_id: str, _=Depends(require_console)):
    result = credential_vault.test_connection(provider_id)
    return result


# ── Workers ───────────────────────────────────────────────────────────────────

class RegisterWorkerRequest(BaseModel):
    node_id:     str
    type:        str    # cpu | gpu
    provider_id: str
    model:       str
    concurrency: int   = 5
    timeout_sec: int   = 60
    retry_count: int   = 3
    priority:    str   = "normal"
    gpu_vram_gb: Optional[int] = None
    label:       str   = ""
    base_url:    str   = ""
    worker_url:  str   = ""   # GPU worker's own FastAPI endpoint (e.g. http://gpu-node:7892)


@app.get("/api/workers")
async def list_workers(_=Depends(require_console)):
    return {"workers": worker_manager.get_all_workers()}


@app.post("/api/workers/register")
async def register_worker(req: RegisterWorkerRequest, _=Depends(require_console)):
    enforcement.require_active()
    state = enforcement.get_enforcement_state()

    # Enforce worker limits
    workers    = worker_manager.get_all_workers()
    cpu_count  = sum(1 for w in workers if w.get("type") == "cpu" and w.get("status") == "active")
    gpu_count  = sum(1 for w in workers if w.get("type") == "gpu" and w.get("status") == "active")

    if req.type == "cpu" and cpu_count >= state.get("cpu_workers", 2):
        raise HTTPException(400, f"CPU worker limit reached ({state.get('cpu_workers',2)} max for your license tier)")
    if req.type == "gpu" and gpu_count >= state.get("gpu_workers", 0):
        raise HTTPException(400, f"GPU worker limit reached ({state.get('gpu_workers',0)} max for your license tier)")

    result = worker_manager.register_worker(
        node_id=req.node_id, worker_type=req.type, provider_id=req.provider_id,
        model=req.model, concurrency=req.concurrency, timeout_sec=req.timeout_sec,
        retry_count=req.retry_count, priority=req.priority, gpu_vram_gb=req.gpu_vram_gb,
        label=req.label, base_url=req.base_url, worker_url=req.worker_url,
    )
    return result


@app.delete("/api/workers/{worker_id}")
async def remove_worker(worker_id: str, _=Depends(require_console)):
    ok = worker_manager.remove_worker(worker_id)
    return {"ok": ok}


@app.post("/api/workers/{worker_id}/heartbeat")
async def worker_heartbeat(worker_id: str, request: Request, _=Depends(require_worker_auth)):
    body = await request.json()
    ok   = worker_manager.update_worker_heartbeat(
        worker_id,
        load_pct=body.get("load_pct", 0),
        tasks_active=body.get("tasks_active", 0),
    )
    return {"ok": ok}


# ── Nodes ─────────────────────────────────────────────────────────────────────

class RegisterNodeRequest(BaseModel):
    name:        str
    endpoint:    str
    type:        str  = "cpu"
    max_workers: int  = 10
    region:      str  = ""
    tags:        List[str] = []


@app.get("/api/nodes")
async def list_nodes(_=Depends(require_console)):
    return {"nodes": worker_manager.get_all_nodes()}


@app.post("/api/nodes/register")
async def register_node(req: RegisterNodeRequest, _=Depends(require_console)):
    enforcement.require_active()
    state = enforcement.get_enforcement_state()
    nodes = worker_manager.get_all_nodes()
    active_nodes = sum(1 for n in nodes if n.get("status") == "online")
    if active_nodes >= state.get("max_nodes", 50):
        raise HTTPException(400, f"Node limit reached ({state.get('max_nodes',50)} max for your license tier)")
    result = worker_manager.register_node(
        name=req.name, endpoint=req.endpoint, node_type=req.type,
        max_workers=req.max_workers, region=req.region, tags=req.tags,
    )
    return result


@app.delete("/api/nodes/{node_id}")
async def remove_node(node_id: str, _=Depends(require_console)):
    ok = worker_manager.remove_node(node_id)
    return {"ok": ok}


@app.post("/api/nodes/{node_id}/heartbeat")
async def node_heartbeat(node_id: str, request: Request, _=Depends(require_worker_auth)):
    body = await request.json()
    ok   = worker_manager.update_node_heartbeat(
        node_id,
        cpu_pct=body.get("cpu_pct", 0),
        mem_pct=body.get("mem_pct", 0),
        throughput=body.get("throughput", 0),
    )
    return {"ok": ok}


# ── Jobs / Task Queue ─────────────────────────────────────────────────────────

class SubmitJobRequest(BaseModel):
    task_type:   str   = "chat"
    messages:    list
    model:       Optional[str]  = None
    provider_id: Optional[str]  = None
    max_tokens:  int   = 2048
    temperature: float = 0.7
    priority:    str   = "normal"
    caller_id:   str   = ""
    metadata:    dict  = {}


@app.post("/api/jobs/submit")
async def submit_job(req: SubmitJobRequest, _=Depends(require_console)):
    enforcement.require_active()
    result = job_router.enqueue(
        task_type=req.task_type, messages=req.messages,
        model=req.model, provider_id=req.provider_id,
        max_tokens=req.max_tokens, temperature=req.temperature,
        priority=req.priority, caller_id=req.caller_id, metadata=req.metadata,
    )
    return result


@app.get("/api/jobs/queue")
async def get_queue(_=Depends(require_console)):
    return {"jobs": job_router.get_queue(), "stats": job_router.get_queue_stats()}


@app.get("/api/jobs/history")
async def get_history(limit: int = 50, _=Depends(require_console)):
    return {"jobs": job_router.get_history(limit)}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, _=Depends(require_console)):
    job = job_router.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.delete("/api/jobs/{job_id}")
async def cancel_job(job_id: str, _=Depends(require_console)):
    ok = job_router.cancel_job(job_id)
    return {"ok": ok}


@app.post("/api/jobs/queue/pause")
async def pause_queue(_=Depends(require_console)):
    job_router.pause_queue()
    return {"ok": True, "paused": True}


@app.post("/api/jobs/queue/resume")
async def resume_queue(_=Depends(require_console)):
    job_router.resume_queue()
    return {"ok": True, "paused": False}


# ── Routing Rules ─────────────────────────────────────────────────────────────

@app.get("/api/routing/rules")
async def get_routing_rules(_=Depends(require_console)):
    return routing_engine.load_rules()


@app.put("/api/routing/rules")
async def update_routing_rules(request: Request, _=Depends(require_console)):
    body = await request.json()
    routing_engine.save_rules(body)
    return {"ok": True}


@app.get("/api/routing/status")
async def get_routing_status(_=Depends(require_console)):
    workers = worker_manager.get_all_workers()
    return routing_engine.get_routing_status(workers)


# ── Cost ──────────────────────────────────────────────────────────────────────

@app.get("/api/cost/summary")
async def cost_summary(_=Depends(require_console)):
    return job_router.get_cost_summary()


# ── Provider Info ─────────────────────────────────────────────────────────────

@app.get("/api/providers/catalog")
async def providers_catalog(_=Depends(require_console)):
    return {"providers": ai_providers.PROVIDER_CONFIGS}


@app.get("/api/providers/{provider_id}/ollama-models")
async def ollama_models(provider_id: str, base_url: str = "http://localhost:11434", _=Depends(require_console)):
    models = ai_providers.get_ollama_models(base_url)
    return {"models": models}


# ── Brand ─────────────────────────────────────────────────────────────────────

_DEFAULT_BRAND = {
    "name": "AXTO Orchestra — AI eXecution & Tools Orchestration", "logo_url": "", "primary_color": "#6366F1",
    "accent_color": "#818CF8", "domain": "axto.ai",
    "tagline": "AI eXecution & Tools Orchestration — Orchestra", "support_email": "hallo@axto.io",
    "hide_powered_by": False, "is_wl": False,
}

@app.get("/api/brand")
async def get_brand():
    state    = enforcement.get_enforcement_state()
    branding = state.get("branding")
    if branding and isinstance(branding, dict):
        return {**_DEFAULT_BRAND, **branding, "is_wl": True}
    return _DEFAULT_BRAND


# ── Autoscaler ─────────────────────────────────────────────────────────────────

@app.get("/api/autoscaler/status")
async def autoscaler_status(_=Depends(require_console)):
    return get_autoscaler().get_status()


@app.post("/api/autoscaler/toggle")
async def autoscaler_toggle(request: Request, _=Depends(require_console)):
    body = await request.json()
    enabled = body.get("enabled", False)
    db.set_setting("autoscale_enabled", "true" if enabled else "false")
    if enabled:
        get_autoscaler().start()
    return {"ok": True, "autoscale_enabled": enabled}


@app.post("/api/autoscaler/settings")
async def autoscaler_settings(request: Request, _=Depends(require_console)):
    """Update autoscaler thresholds (hot-reloadable, takes effect immediately)."""
    body = await request.json()
    if "threshold" in body:
        db.set_setting("autoscale_threshold", str(body["threshold"]))
    if "max_cpu" in body:
        db.set_setting("autoscale_max_cpu", str(body["max_cpu"]))
    if "max_gpu" in body:
        db.set_setting("autoscale_max_gpu", str(body["max_gpu"]))
    if "idle_timeout" in body:
        db.set_setting("idle_worker_timeout", str(body["idle_timeout"]))
    return {"ok": True, "settings": {
        "threshold": int(db.get_setting("autoscale_threshold", "20")),
        "max_cpu": int(db.get_setting("autoscale_max_cpu", "10")),
        "max_gpu": int(db.get_setting("autoscale_max_gpu", "4")),
        "idle_timeout": int(db.get_setting("idle_worker_timeout", "300")),
    }}


@app.post("/api/autoscaler/scale-up")
async def manual_scale_up(request: Request, _=Depends(require_console)):
    """Manually spawn a new worker (respects license limits)."""
    enforcement.require_active()
    body = await request.json()
    worker_type = body.get("type", "cpu")

    state = enforcement.get_enforcement_state()
    workers = worker_manager.get_all_workers()
    cpu_count = sum(1 for w in workers if w.get("worker_type") == "cpu" and w.get("status") == "active")
    gpu_count = sum(1 for w in workers if w.get("worker_type") == "gpu" and w.get("status") == "active")

    if worker_type == "cpu" and cpu_count >= state.get("cpu_workers", 2):
        raise HTTPException(400, f"CPU worker limit reached ({cpu_count}/{state.get('cpu_workers',2)} for your license tier). Upgrade your plan for more workers.")
    if worker_type == "gpu" and gpu_count >= state.get("gpu_workers", 0):
        raise HTTPException(400, f"GPU worker limit reached ({gpu_count}/{state.get('gpu_workers',0)} for your license tier). Upgrade your plan for GPU workers.")

    autoscaler = get_autoscaler()
    success = autoscaler._spawn_worker(worker_type)
    return {"ok": success, "type": worker_type, "current": {"cpu": cpu_count, "gpu": gpu_count},
            "limits": {"max_cpu": state.get("cpu_workers", 2), "max_gpu": state.get("gpu_workers", 0)}}


@app.post("/api/autoscaler/scale-down")
async def manual_scale_down(request: Request, _=Depends(require_console)):
    """Manually drain and remove an idle worker."""
    body = await request.json()
    worker_id = body.get("worker_id", "")

    if not worker_id:
        # Find the most idle worker to drain
        idle = db.get_idle_workers(idle_threshold_sec=0)
        if not idle:
            raise HTTPException(400, "No idle workers to scale down")
        worker_id = idle[0]["id"]

    worker = worker_manager.get_worker(worker_id)
    if not worker:
        raise HTTPException(404, f"Worker {worker_id} not found")

    autoscaler = get_autoscaler()
    autoscaler._drain_worker(worker)
    return {"ok": True, "drained": worker_id}


# ── Semantic Router ────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    messages:  list
    task_type: str = "chat"


@app.post("/api/semantic/classify")
async def classify_task(req: ClassifyRequest, _=Depends(require_console)):
    cat, conf = get_classifier().classify(req.messages, req.task_type)
    inj       = get_inj_detector().check(req.messages)
    return {"category": cat, "confidence": conf, "injection": inj}


@app.get("/api/semantic/categories")
async def semantic_categories(_=Depends(require_console)):
    from semantic_router import CATEGORY_ROUTING, CATEGORY_CHEAP
    return {"categories": list(CATEGORY_ROUTING.keys()),
            "routing": CATEGORY_ROUTING,
            "cheap_options": CATEGORY_CHEAP}


# ── Performance & Audit ────────────────────────────────────────────────────────

@app.get("/api/performance")
async def performance_stats(hours: int = 24, _=Depends(require_console)):
    return db.get_performance_stats(hours)


@app.get("/api/audit")
async def audit_log(limit: int = 100, _=Depends(require_console)):
    return {"log": db.get_audit_log(limit)}


@app.get("/api/metrics")
async def get_metrics(metric: str = "throughput_rps", hours: int = 24,
                      _=Depends(require_console)):
    since = __import__("time").time() - hours * 3600
    rows  = db.q("SELECT ts,value,labels FROM metrics WHERE metric=? AND ts>? "
                 "ORDER BY ts DESC LIMIT 500",
                 (metric, since))
    return {"metric": metric, "data": rows}

# ═══════════════════════════════════════════════════════════════════════════════
# DEEP HEALTH API
# ═══════════════════════════════════════════════════════════════════════════════

from health import run_full_diagnostic as _orch_health_full, run_autofix as _orch_autofix, ALL_CHECKS as _ORCH_CHECKS

@app.get("/health/deep")
async def deep_health(_=Depends(require_console)):
    """Full Orchestra diagnostic. Status + cause + fix per component."""
    import asyncio
    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _orch_health_full)
    return result.to_dict()

@app.get("/health/{component}")
async def component_health(component: str, _=Depends(require_console)):
    if component not in _ORCH_CHECKS:
        raise HTTPException(404, f"Unknown: {component}. Available: {list(_ORCH_CHECKS.keys())}")
    import asyncio
    result = await asyncio.get_event_loop().run_in_executor(None, _ORCH_CHECKS[component])
    return result.to_dict()

@app.post("/health/{component}/autofix")
async def autofix(component: str, _=Depends(require_console)):
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, _orch_autofix, component)


# ═══════════════════════════════════════════════════════════════════════════════
# RUNBOOK API
# ═══════════════════════════════════════════════════════════════════════════════

from runbook import (get_runbook as _get_rb, search_runbooks as _srb,
                     get_runbook_for_error as _rb_err, list_all as _rb_list)

@app.get("/runbook/")
async def list_runbooks(component: str = ""):
    return {"runbooks": _rb_list(component), "total": len(_rb_list(component))}

@app.get("/runbook/{code}")
async def get_runbook_ep(code: str):
    rb = _get_rb(code)
    if not rb: raise HTTPException(404, f"Runbook {code} not found")
    return rb.to_dict()

@app.get("/runbook/search/{query}")
async def search_rb(query: str, component: str = ""):
    results = _srb(query, component)
    return {"results": [r.to_dict() for r in results], "count": len(results)}


# ═══════════════════════════════════════════════════════════════════════════════
# AI SUPPORT BOT
# ═══════════════════════════════════════════════════════════════════════════════

from support_bot import get_orchestra_bot
import json as _json

class AskReq(BaseModel):
    question:   str
    session_id: str = "default"

class DiagnoseReq(BaseModel):
    error_message: str
    session_id:    str = "default"

@app.post("/support/ask")
async def orch_support_ask(req: AskReq, _=Depends(require_console)):
    return await get_orchestra_bot().ask(req.question, req.session_id)

@app.post("/support/diagnose")
async def orch_support_diagnose(req: DiagnoseReq, _=Depends(require_console)):
    return await get_orchestra_bot().diagnose(req.error_message, req.session_id)

@app.get("/support/history")
async def orch_support_history(session_id: str = "default", _=Depends(require_console)):
    return {"history": get_orchestra_bot().get_history(session_id)}

@app.websocket("/support/ws/{session_id}")
async def orch_support_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    bot = get_orchestra_bot()
    try:
        while True:
            data     = await websocket.receive_text()
            question = _json.loads(data).get("question", data) if data.startswith("{") else data
            await websocket.send_text(_json.dumps({"type": "start"}))
            async for chunk in bot.stream_ask(question, session_id):
                await websocket.send_text(_json.dumps({"type": "chunk", "text": chunk}))
            await websocket.send_text(_json.dumps({"type": "done"}))
    except WebSocketDisconnect:
        pass

@app.get("/support/ui", response_class=HTMLResponse)
async def orchestra_support_ui():
    """Serve the embedded AI Support Bot UI."""
    from fastapi.responses import HTMLResponse
    from pathlib import Path as _P
    ui_file = _P(__file__).parent / "console" / "support.html"
    if ui_file.exists():
        return HTMLResponse(ui_file.read_text())
    return HTMLResponse("<h1>Support UI not found</h1>")
