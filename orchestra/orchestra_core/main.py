# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration — Main API
FastAPI engine: job routing, worker management, AI provider orchestration.
Serves local console UI at /console (localhost:8080)
"""
import os
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import settings
_CFG = settings.apply()   # env ← orchestra.yml ← generated secrets; before the imports below

import hmac
import enforcement
import security_hardening
import credential_vault
import ai_providers
import worker_manager
import job_router
import routing_engine
import database as db
import autoscale_config
import client_api
import gpu_advisor
import scaler_client
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

CONSOLE_PASSWORD = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "")
WORKER_TOKEN     = os.environ.get("ORCHESTRA_WORKER_TOKEN", "")
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

    # License enforcement (signed, online; 4h verified offline grace)
    state = await enforcement.start()
    logger.info(f"License: {state['status']} | Tier: {state.get('tier','-')} | ID: {state.get('license_id','-')}")
    if state["status"] != "ACTIVE":
        logger.warning(f"LOCKED: {state.get('error')} — open http://localhost:8088 to activate")

    # BYOK vendor keys from orchestra.yml → encrypted credential vault
    for provider, api_key, _model in settings.vendor_keys(_CFG):
        try:
            if credential_vault.get_key(provider) != api_key:
                credential_vault.store_key(provider, api_key, "orchestra.yml")
                logger.info(f"Vendor key for '{provider}' imported from orchestra.yml")
        except Exception as e:
            logger.warning(f"Could not import vendor key for '{provider}': {e}")

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


# ── Licence / edition errors → clear answers, never a 500 ─────────────────────
# 402: the edition does not include it (upgrade); 403: the licence is not active.
_ENFORCEMENT_STATUS = {"FEATURE_NOT_LICENSED": 402, "WORKER_LIMIT": 402, "NODE_LIMIT": 402, "BAD_WORKER_TYPE": 400}


@app.exception_handler(enforcement.EnforcementError)
async def _enforcement_error(request: Request, exc: enforcement.EnforcementError):
    return JSONResponse(status_code=_ENFORCEMENT_STATUS.get(exc.category, 403),
                        content={"error": exc.detail or exc.category, "category": exc.category,
                                 "manage_url": enforcement.MANAGE_URL})


# ── Auth ─────────────────────────────────────────────────────────────────────

async def require_console(request: Request):
    token = (
        request.headers.get("X-Console-Token")
        or request.cookies.get("console_token")
        or request.query_params.get("token")
    )
    if not token or not CONSOLE_PASSWORD or not hmac.compare_digest(str(token), CONSOLE_PASSWORD):
        raise HTTPException(status_code=401, detail="Unauthorized — invalid console token")
    return token


async def require_worker_auth(request: Request):
    token = (
        request.headers.get("X-Orchestra-Worker-Token")
        or request.headers.get("Authorization", "").replace("Bearer ", "")
    )
    if not token or not WORKER_TOKEN or not hmac.compare_digest(str(token), WORKER_TOKEN):
        raise HTTPException(status_code=401, detail="Worker authentication required")
    return token


# ── Console UI ────────────────────────────────────────────────────────────────

@app.get("/console", response_class=HTMLResponse)
async def serve_console():
    console_html = CONSOLE_DIR / "index.html"
    if console_html.exists():
        return HTMLResponse(console_html.read_text())
    return HTMLResponse("<h1>Orchestra Console</h1><p>Console UI not found.</p>")


@app.get("/api/console/session")
async def console_session(_=Depends(require_console)):
    """The console's sign-in check: 200 only with the right console password
    (/api/license/status stays open for the activation page, so it cannot be the check)."""
    return {"ok": True}


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
    try:
        body = await request.json()
    except Exception:
        body = {}
    result = await enforcement.activate(body.get("license_key") or "")
    if not result["ok"]:
        return JSONResponse({"valid": False, "error": result.get("error"), "reason": result.get("reason"),
                             "machine_id": (result.get("unit_id") or "")[:16]}, status_code=400)
    state = result["state"]
    return {"valid": True, "status": "active", "tier": state.get("tier"), "expires_at": state.get("expires_at"),
            "machine_id": state.get("unit_id", "")[:16]}

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
    gpu_vram_gb: Optional[float] = None
    vram_gb:     Optional[float] = None   # the console's name for gpu_vram_gb
    label:       str   = ""
    base_url:    str   = ""
    worker_url:  str   = ""   # GPU worker's own FastAPI endpoint (e.g. http://gpu-node:7892)
    # What a GPU worker reports about itself (REQUESTS 136, BLUEPRINT-V4 §31.F G1)
    vendor:         Optional[str]  = None
    gpu_name:       Optional[str]  = None
    backend:        Optional[str]  = None
    gpu_count:      Optional[int]  = None
    driver:         Optional[str]  = None
    capabilities:   Optional[List[str]] = None
    usable:         Optional[bool] = None
    wsl:            Optional[bool] = None
    access_note:    Optional[str]  = None
    worker_version: Optional[str]  = None


TELEMETRY_STALE_S = 120   # four heartbeats


def _worker_view(w: dict, now: Optional[float] = None) -> dict:
    """A worker row as the console reads it: `type`, `vram_gb`, lists instead of JSON text,
    and `telemetry` = live GPU data arrived within the last few heartbeats."""
    now = now or time.time()
    def _json(v, default):
        try:
            return json.loads(v) if isinstance(v, str) and v else default
        except ValueError:
            return default
    return {**w, "type": w.get("worker_type"),
            "vram_gb": w.get("vram_total_gb") or w.get("gpu_vram_gb"),
            "capabilities": _json(w.get("capabilities"), []), "gpus": _json(w.get("gpus_json"), []),
            "usable": bool(w.get("usable", 1)), "wsl": bool(w.get("wsl")), "throttled": bool(w.get("throttled")),
            "telemetry": bool(w.get("telemetry_at")) and now - float(w.get("telemetry_at") or 0) < TELEMETRY_STALE_S}


@app.get("/api/workers")
async def list_workers(_=Depends(require_console)):
    # The console reads `type` (cpu/gpu) and `vram_gb`; the table columns are worker_type and gpu_vram_gb.
    return {"workers": [_worker_view(w) for w in worker_manager.get_all_workers()]}


@app.post("/api/workers/register")
async def register_worker(req: RegisterWorkerRequest, _=Depends(require_console)):
    # Edition worker limit (Starter 10, Professional 50, Enterprise unlimited).
    enforcement.check_worker_slot(req.type, worker_manager.get_all_workers())

    result = worker_manager.register_worker(
        node_id=req.node_id, worker_type=req.type, provider_id=req.provider_id,
        model=req.model, concurrency=req.concurrency, timeout_sec=req.timeout_sec,
        retry_count=req.retry_count, priority=req.priority, gpu_vram_gb=req.gpu_vram_gb or req.vram_gb,
        label=req.label, base_url=req.base_url, worker_url=req.worker_url,
        meta={k: getattr(req, k) for k in ("vendor", "gpu_name", "backend", "gpu_count", "driver", "capabilities",
                                            "usable", "wsl", "access_note", "worker_version")},
        reuse_by_url=True,
    )
    if req.type == "gpu" and req.usable is not False and (req.backend or req.vendor):
        # Remembered so Auto-Scale can start this brand's worker again from zero.
        db.set_setting("gpu_worker_kind", scaler_client.kind_for({"worker_type": "gpu", "backend": req.backend, "vendor": req.vendor}))
    return result


@app.delete("/api/workers/{worker_id}")
async def remove_worker(worker_id: str, _=Depends(require_console)):
    w = worker_manager.get_worker(worker_id)
    note = ""
    if w and scaler_client.container_of(w):
        # A scaled worker: stop its container too, so it does not keep running unseen.
        try:
            scaler_client.stop(scaler_client.container_of(w))
        except scaler_client.ScalerError as e:
            raise HTTPException(e.status or 502, str(e))
    elif w and w.get("worker_url"):
        note = "This worker was started by AXTO Setup; it registers again with its next heartbeat. Stop it with AXTO Setup (or untick the GPU worker) to remove it for good."
    ok = worker_manager.remove_worker(worker_id)
    return {"ok": ok, **({"note": note} if note else {})}


class ScaleWorkersRequest(BaseModel):
    action:             str            # add | remove
    template_worker_id: str = ""       # add: a worker of the kind to add (its brand / CPU)
    kind:               str = ""       # add: cpu | gpu | gpu-amd (instead of a template)
    gpu_index:          Optional[int] = None   # add: pin to this GPU (default: the GPU with the most room)
    worker_id:          str = ""       # remove: this one (default: the most idle scaled worker)
    type:               str = "gpu"


@app.get("/api/scaler")
async def scaler_status(_=Depends(require_console)):
    """The scaling service: reachable, which worker images are installed, the workers it runs."""
    h = scaler_client.health()
    try:
        h["workers"] = scaler_client.listed() if h.get("docker") else []
    except scaler_client.ScalerError:
        h["workers"] = []
    return h


@app.delete("/api/scaler/workers/{name}")
async def scaler_stop(name: str, _=Depends(require_console)):
    """Stop a container the scaler started — also one that never managed to register."""
    try:
        scaler_client.stop(name)
    except scaler_client.ScalerError as e:
        raise HTTPException(e.status or 502, str(e))
    gone = [w["id"] for w in worker_manager.get_all_workers(check_heartbeat=False) if scaler_client.container_of(w) == name]
    for wid in gone:
        worker_manager.remove_worker(wid)
    db.record_metric("autoscale_down", 1, {"container": name, "manual": True})
    return {"ok": True, "removed_workers": gone}


@app.post("/api/workers/scale")
async def scale_workers(req: ScaleWorkersRequest, _=Depends(require_console)):
    """Manual scale from the console: a real worker container more or less (orchestra-scaler).
    Adding counts against the edition's worker limit like any registration."""
    if req.action == "add":
        tmpl = worker_manager.get_worker(req.template_worker_id) if req.template_worker_id else None
        if req.template_worker_id and not tmpl:
            raise HTTPException(404, "Template worker not found — pick one in the Scale rules")
        kind = req.kind or (scaler_client.kind_for(tmpl) if tmpl else "")
        if kind not in ("cpu", "gpu", "gpu-amd"):
            raise HTTPException(400, "Say which worker to add: kind cpu, gpu or gpu-amd, or a template worker")
        wtype = "cpu" if kind == "cpu" else "gpu"
        enforcement.check_worker_slot(wtype, worker_manager.get_all_workers())
        index = req.gpu_index
        if wtype == "gpu" and index is None:
            try:
                scaled = scaler_client.listed()
            except scaler_client.ScalerError:
                scaled = []
            index = scaler_client.pick_gpu(worker_manager.get_all_workers(), kind, scaled,
                                           autoscale_config.get_config()["crit"])
        try:
            r = scaler_client.spawn(kind, index)
        except scaler_client.ScalerError as e:
            raise HTTPException(e.status or 502, str(e))
        db.record_metric("autoscale_up", 1, {"type": wtype, "manual": True, "container": r.get("name")})
        return {"ok": True, "spawned": r.get("name"), "kind": kind, "gpu_index": index,
                "note": "The new worker registers itself within a few seconds."}
    if req.action == "remove":
        if req.worker_id:
            target = worker_manager.get_worker(req.worker_id)
            if target and not scaler_client.container_of(target):
                raise HTTPException(409, "This worker was started by AXTO Setup, not by scaling — stop it with AXTO "
                                         "Setup (or untick the GPU worker). Scaling removes only the workers it added.")
        else:
            live = [w for w in worker_manager.get_all_workers()
                    if w.get("worker_type") == req.type and w.get("status") != "offline" and scaler_client.container_of(w)]
            target = min(live, key=lambda w: (w.get("tasks_active") or 0, w.get("load_pct") or 0), default=None)
        if not target:
            raise HTTPException(404, f"No scaled {req.type.upper()} worker to remove")
        try:
            scaler_client.stop(scaler_client.container_of(target))
        except scaler_client.ScalerError as e:
            raise HTTPException(e.status or 502, str(e))
        worker_manager.remove_worker(target["id"])
        db.record_metric("autoscale_down", 1, {"worker_id": target["id"], "manual": True})
        return {"ok": True, "removed": target["id"]}
    raise HTTPException(400, "action must be 'add' or 'remove'")


@app.post("/api/workers/{worker_id}/heartbeat")
async def worker_heartbeat(worker_id: str, request: Request, _=Depends(require_worker_auth)):
    body = await request.json()
    temp = body.get("temp_c")
    temp = float(temp) if isinstance(temp, (int, float)) else None
    prev = worker_manager.get_worker(worker_id) or {}
    status = autoscale_config.heartbeat_status(prev.get("status"), temp)
    if status == "paused" and prev.get("status") != "paused":
        logger.critical(f"🔥 {worker_id} paused at {temp}°C (thermal emergency) — resumes below the critical temperature")
        db.record_metric("thermal_pause", 1, {"worker_id": worker_id, "temp_c": temp})
    if not prev:
        # Unknown id (removed in the console, restored backup): the worker registers again.
        return {"ok": False, "reregister": True}
    telemetry = None
    if any(k in body for k in ("util_pct", "vram_used_gb", "gpus")):
        def _n(v):
            return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None
        gpus = body.get("gpus") if isinstance(body.get("gpus"), list) else []
        telemetry = {"util_pct": _n(body.get("util_pct")), "vram_used_gb": _n(body.get("vram_used_gb")),
                     "vram_total_gb": _n(body.get("vram_total_gb")), "power_w": _n(body.get("power_w")),
                     "throttled": bool(body.get("throttled")), "gpus": [g for g in gpus if isinstance(g, dict)][:16]}
        if telemetry["throttled"] and not prev.get("throttled"):
            db.record_metric("gpu_throttled", 1, {"worker_id": worker_id})
    ok = db.heartbeat_worker(worker_id, body.get("load_pct", 0), body.get("tasks_active", 0), temp, status, telemetry)
    return {"ok": ok, "status": status}


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
        raise enforcement.EnforcementError(
            "NODE_LIMIT", f"Node limit reached ({active_nodes}/{state.get('max_nodes', 50)} for your edition). "
                          f"Remove a node or upgrade at {enforcement.MANAGE_URL}")
    result = worker_manager.register_node(
        name=req.name, endpoint=req.endpoint, node_type=req.type,
        max_workers=req.max_workers, region=req.region, tags=req.tags,
    )
    return result


@app.delete("/api/nodes/{node_id}")
async def remove_node(node_id: str, _=Depends(require_console)):
    ok = worker_manager.remove_node(node_id)
    return {"ok": ok}


@app.post("/api/nodes/{node_id}/detect_gpu")
async def detect_node_gpu(node_id: str, _=Depends(require_console)):
    """GPUs on a node, as its GPU worker reports them (GET <worker_url>/gpu/status)."""
    import json, urllib.request
    urls = {w.get("worker_url") for w in worker_manager.get_all_workers()
            if w.get("node_id") == node_id and w.get("worker_type") == "gpu" and w.get("worker_url")}
    gpus, errors = [], []
    for url in sorted(u for u in urls if u):
        try:
            with urllib.request.urlopen(f"{url.rstrip('/')}/gpu/status", timeout=8) as r:
                info = json.loads(r.read()).get("gpu") or {}
        except Exception as e:
            errors.append(f"{url}: {e}")
            continue
        for g in info.get("gpus") or ([info] if info.get("name") else []):
            gpus.append({"name": g.get("name", ""), "vendor": g.get("vendor") or info.get("vendor", ""),
                         "vram_gb": g.get("vram_gb", 0), "driver": g.get("driver") or info.get("driver", "")})
    note = "" if urls else "No GPU worker runs on this node yet — start orchestra-worker-gpu there (AXTO Setup: tick GPU worker)."
    return {"node_id": node_id, "gpus": gpus, "errors": errors, "note": note}


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
    enforcement.require_feature("cost_analytics")
    return job_router.get_cost_summary()


# ── Provider Info ─────────────────────────────────────────────────────────────

class DirectChatRequest(BaseModel):
    provider:    str
    model:       str = ""
    messages:    List[dict]
    temperature: float = 0.7
    max_tokens:  int   = 1024


@app.post("/api/chat/direct")
async def chat_direct(req: DirectChatRequest, _=Depends(require_console)):
    """Local Chat and the Multi-AI tester: one call to one provider with the key in the
    Credential Vault (BYOK — the request goes from this server to the provider, nowhere else)."""
    enforcement.require_active()
    pid = req.provider.strip().lower()
    if pid not in ai_providers.PROVIDER_CONFIGS and pid != "ollama":
        raise HTTPException(400, f"Unknown provider '{req.provider}'")
    msgs = [{"role": m.get("role"), "content": m.get("content")} for m in req.messages[-100:]]
    if not msgs or any(m["role"] not in ("system", "user", "assistant") or not isinstance(m["content"], str)
                       for m in msgs):
        raise HTTPException(400, "messages must be a list of {role: system|user|assistant, content: text}")
    if sum(len(m["content"]) for m in msgs) > 400_000:
        raise HTTPException(413, "Conversation too long — start a new chat")
    model = req.model or (ai_providers.PROVIDER_CONFIGS.get(pid, {}).get("models") or [""])[0]
    key, base_url = credential_vault.get_key(pid) or "", ""
    if pid == "ollama":
        base_url = key or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    elif not key:
        raise HTTPException(400, f"No API key for {pid} in the Credential Vault — add it there first")
    r = await asyncio.to_thread(ai_providers.dispatch, pid, key, model, msgs,
                                max(1, min(req.max_tokens, 8192)), max(0.0, min(req.temperature, 2.0)),
                                base_url, 120)
    if not r.get("ok"):
        raise HTTPException(502, f"{pid}: {r.get('error') or 'no answer'}")
    in_tok, out_tok = r.get("input_tokens", 0), r.get("output_tokens", 0)
    cost = routing_engine.get_cost_estimate(pid, model, in_tok + out_tok)
    db.record_cost_event(pid, model, in_tok, out_tok, cost, caller_id="console")
    return {"content": r.get("content", ""), "input_tokens": in_tok, "output_tokens": out_tok,
            "cost_usd": cost, "latency_ms": r.get("latency_ms"), "model_used": r.get("model_used", model),
            "provider": pid}


# ── Client API keys (console → Client API) ──────────────────────────────────
# Apps call /v1/chat/completions and /v1/models (client_api.py) with these keys.

app.include_router(client_api.router)


@app.get("/api/client-keys")
async def client_keys_list(_=Depends(require_console)):
    return {"keys": client_api.list_keys(), "base_path": "/v1"}


@app.post("/api/client-keys")
async def client_keys_create(request: Request, _=Depends(require_console)):
    enforcement.require_active()
    try:
        key, secret = client_api.create_key(await request.json())
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.audit("console", "client_key.create", key["id"], key["name"])
    return {"key": key, "secret": secret, "note": "Shown once — Orchestra keeps only its hash."}


@app.patch("/api/client-keys/{key_id}")
async def client_keys_update(key_id: str, request: Request, _=Depends(require_console)):
    try:
        key = client_api.update_key(key_id, await request.json())
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not key:
        raise HTTPException(404, "No active key with that id")
    db.audit("console", "client_key.update", key_id)
    return {"key": key}


@app.delete("/api/client-keys/{key_id}")
async def client_keys_revoke(key_id: str, _=Depends(require_console)):
    if not client_api.revoke_key(key_id):
        raise HTTPException(404, "No active key with that id")
    db.audit("console", "client_key.revoke", key_id)
    return {"ok": True}


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
    "tagline": "AI eXecution & Tools Orchestration — Orchestra", "support_email": "hello@axto.io",
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

@app.get("/api/autoscale/config")
async def autoscale_config_get(_=Depends(require_console)):
    """The console's Auto-Scale page: saved rules plus what happened in the last 24 h."""
    return {**autoscale_config.get_config(),
            "max_gpu": int(db.get_setting("autoscale_max_gpu", "4")),
            "licensed": enforcement.has_feature("autoscaler"),
            "scale_events_24h": db.count_metrics(["autoscale_up", "autoscale_down"]),
            "thermal_reroutes_24h": db.count_metrics(["thermal_reroute"]),
            "thermal_pauses_24h": db.count_metrics(["thermal_pause"])}


@app.put("/api/autoscale/config")
async def autoscale_config_put(request: Request, _=Depends(require_console)):
    body = await request.json()
    # Thermal rules work in every edition; switching automatic scaling on needs the Autoscaling feature.
    if body.get("enabled"):
        enforcement.require_feature("autoscaler")
    try:
        cfg = autoscale_config.save_config({k: v for k, v in body.items() if k != "max_gpu"})
    except ValueError as e:
        raise HTTPException(400, str(e))
    if "max_gpu" in body:
        # One place for the GPU cap: the Auto-Scale page (REQUESTS 136 G4).
        try:
            mg = int(body["max_gpu"])
        except (TypeError, ValueError):
            raise HTTPException(400, "max_gpu must be a whole number")
        if not 0 <= mg <= 64:
            raise HTTPException(400, "max_gpu must be 0–64")
        db.set_setting("autoscale_max_gpu", str(mg))
    cfg["max_gpu"] = int(db.get_setting("autoscale_max_gpu", "4"))
    if cfg["enabled"]:
        a = get_autoscaler()
        if not a._running:
            a.start()
    return {"ok": True, **cfg}


@app.get("/api/gpu/advice")
async def gpu_advice(_=Depends(require_console)):
    """GPU suggestions for the console: the GPUs free now (best first) and what needs
    attention (hot, paused, offline, all busy with the slots left, idle)."""
    return gpu_advisor.advise(worker_manager.get_all_workers(check_heartbeat=False),
                              autoscale_config.get_config(), enforcement.worker_limit("gpu"))


@app.get("/api/autoscaler/status")
async def autoscaler_status(_=Depends(require_console)):
    return {**get_autoscaler().get_status(), "licensed": enforcement.has_feature("autoscaler")}


@app.post("/api/autoscaler/toggle")
async def autoscaler_toggle(request: Request, _=Depends(require_console)):
    enforcement.require_feature("autoscaler")
    body = await request.json()
    enabled = body.get("enabled", False)
    db.set_setting("autoscale_enabled", "true" if enabled else "false")
    if enabled:
        get_autoscaler().start()
    return {"ok": True, "autoscale_enabled": enabled}


@app.post("/api/autoscaler/settings")
async def autoscaler_settings(request: Request, _=Depends(require_console)):
    """Update autoscaler thresholds (hot-reloadable, takes effect immediately)."""
    enforcement.require_feature("autoscaler")
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
    """Manually spawn a new worker (respects the edition's worker limit)."""
    enforcement.require_feature("autoscaler")
    body = await request.json()
    worker_type = body.get("type", "cpu")

    workers = worker_manager.get_all_workers()
    enforcement.check_worker_slot(worker_type, workers)
    counts = enforcement.worker_counts(workers)

    autoscaler = get_autoscaler()
    success = autoscaler._spawn_worker(worker_type)
    return {"ok": success, "type": worker_type, "current": counts,
            "limits": {"max_cpu": enforcement.worker_limit("cpu"), "max_gpu": enforcement.worker_limit("gpu")}}


@app.post("/api/autoscaler/scale-down")
async def manual_scale_down(request: Request, _=Depends(require_console)):
    """Manually drain and remove an idle worker."""
    enforcement.require_feature("autoscaler")
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
