# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Sentinel — IoT/OT Security REST API v1.1"""
from __future__ import annotations
import asyncio, logging, os, time, yaml, json
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from .engine import SentinelEngine
from .license import LicenseValidator, LicenseState, machine_id
from .engine import DeviceType, Protocol

log = logging.getLogger("sentinel.api")
CONFIG_PATH = os.environ.get("SENTINEL_CONFIG", "/sentinel/config/sentinel.yml")
_config: Dict = {}
_engine: Optional[SentinelEngine] = None
_license_valid = False
_grace_start   = 0.0
_lic_state:  LicenseState = LicenseState()
_validator:  Optional[LicenseValidator] = None

# ─────────────────────────────────────────────────────────────────────────────

def _load() -> Dict:
    try:
        return yaml.safe_load(open(CONFIG_PATH)) or {}
    except FileNotFoundError:
        return {}

async def _validate(cfg: Dict) -> bool:
    key = cfg.get("sentinel", {}).get("license_key", "")
    url = cfg.get("sentinel", {}).get("license_validate_url", "https://axto.io/api/license-validate")
    if not key or "XXXX" in key:
        return False
    try:
        import hashlib, socket
        mid = (open("/etc/machine-id").read().strip()
               if os.path.exists("/etc/machine-id")
               else hashlib.sha256(socket.gethostname().encode()).hexdigest()[:32])
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json={"license_key": key, "machine_id": mid, "product": "sentinel"})
            return r.json().get("valid", False)
    except Exception:
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _config, _engine, _license_valid, _grace_start
    _config   = _load()
    _validator = LicenseValidator(_config.get("sentinel", {}))
    _lic_state = await _validator.validate()
    _license_valid = _lic_state.valid

    if not _lic_state.valid:
        _lic_state.grace_start = time.time()
        _grace_start = time.time()
        log.warning("LICENSE NOT VALID — 4-hour grace period started. Renew: https://axto.io/renew")
    else:
        log.info(f"License active — package={_lic_state.package} expires={_lic_state.expires_at or 'perpetual'}")

    if _lic_state.is_expiring_soon:
        log.warning(f"LICENSE EXPIRING SOON — {_lic_state.days_until_expiry} days remaining. Renew: https://axto.io/renew")
    scfg = _config.get("sentinel", {})
    _engine = SentinelEngine(
        {**scfg, "ai_pool": _config.get("ai_pool", {})},
        db_path=scfg.get("db_path", "/sentinel/data/sentinel.db"),
    )
    await _engine.start()
    # Heartbeat license re-check
    asyncio.create_task(_heartbeat())
    log.info("AXTO Sentinel API ready ✓ (port %s)", os.environ.get("SENTINEL_PORT", "8095"))
    yield
    if _engine:
        await _engine.stop()
    if _validator:
        await _validator.close()

async def _heartbeat():
    global _license_valid, _lic_state
    failures = 0
    while True:
        await asyncio.sleep(3600)
        try:
            _lic_state = await _validator.validate(force=True)
            _license_valid = _lic_state.valid
            if _lic_state.valid:
                _lic_state.grace_start = 0.0
                failures = 0
                if _lic_state.is_expiring_soon:
                    log.warning(f"LICENSE EXPIRING IN {_lic_state.days_until_expiry} DAYS — Renew: https://axto.io/renew")
            else:
                if not _lic_state.grace_start:
                    _lic_state.grace_start = time.time()
                failures += 1
        except Exception as ex:
            failures += 1
            log.error(f"License heartbeat error (attempt {failures}): {ex}")

# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AXTO Sentinel — IoT/OT Security",
    version="1.1.0",
    description="World-class ICS/OT/IoT asset visibility, anomaly detection, and threat response.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

def _lic():
    if not _license_valid and _grace_start and time.time() - _grace_start > 14400:
        raise HTTPException(503, detail="License expired. Please renew at https://axto.io/renew")

def _auth(x: Optional[str] = Header(None, alias="X-Sentinel-Key")):
    k = _config.get("sentinel", {}).get("api_key", "")
    if k and x != k:
        raise HTTPException(401, detail="Invalid or missing X-Sentinel-Key header")

def _engine_ok():
    if not _engine:
        raise HTTPException(503, detail="Engine initializing, please retry in a few seconds")
    return _engine

# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class IngestLogReq(BaseModel):
    logs:      List[str]
    source_ip: str = ""

class AuthorizeReq(BaseModel):
    ip: str

class AcknowledgeReq(BaseModel):
    alert_id: str
    analyst:  str
    note:     str = ""

class ScanReq(BaseModel):
    subnets: Optional[List[str]] = None   # override subnets; None = use config

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH & STATUS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Status"])
async def health():
    """Service health check — used by Docker / load-balancer probes."""
    status = "ok"
    if _lic_state.grace_expired:
        status = "license_expired"
    elif not _lic_state.valid and _lic_state.grace_start:
        status = "grace_period"
    warn = _lic_state.warning_message()
    return {
        "status":    status,
        "product":   "axto-sentinel",
        "version":   "1.1.0",
        "license":   _lic_state.to_api_dict(),
        **({ "_license_warning": warn } if warn else {}),
        "engine_running":  _engine is not None and _engine._running,
        "timestamp":       time.time(),
    }

@app.get("/v1/status", tags=["Status"])
async def status(_: None = Depends(_auth)):
    """Detailed engine status: active scans, device count, alert backlog."""
    _lic()
    e = _engine_ok()
    return await e.get_dashboard()

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/dashboard", tags=["Dashboard"])
async def dashboard(_ = Depends(_auth)):
    """
    Master dashboard — all key metrics in one call.

    Returns device counts, alert distribution by severity, compliance scores,
    firmware anomalies, top-5 risky devices, and real-time engine state.
    """
    _lic()
    return await _engine_ok().get_dashboard()

# ─────────────────────────────────────────────────────────────────────────────
# DEVICE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/devices", tags=["Devices"])
async def devices(device_type: Optional[str] = None, _ = Depends(_auth)):
    """
    List all discovered devices in the asset inventory.

    Filter by `device_type`: plc | hmi | rtu | scada_server | ip_camera |
    iot_gateway | industrial_router | industrial_switch | sensor | unknown
    """
    _lic()
    e = _engine_ok()
    devs = await e.get_devices(device_type)
    return {"devices": devs, "total": len(devs)}

@app.get("/v1/devices/{ip}", tags=["Devices"])
async def get_device(ip: str, _ = Depends(_auth)):
    """Get detailed profile of a single device by IP address."""
    _lic()
    e = _engine_ok()
    dev = e._devices.get(ip)
    if not dev:
        raise HTTPException(404, f"Device {ip} not found in inventory")
    from dataclasses import asdict
    return asdict(dev)

@app.get("/v1/devices/{ip}/alerts", tags=["Devices"])
async def device_alerts(ip: str, limit: int = 50, _ = Depends(_auth)):
    """All alerts for a specific device, newest first."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    rows = await (await e._db.execute(
        "SELECT id,ts,rule_name,severity,description,mitre_ics,acknowledged "
        "FROM alerts WHERE device_ip=? ORDER BY ts DESC LIMIT ?",
        (ip, min(limit, 5000))
    )).fetchall()
    cols = ["id", "ts", "rule_name", "severity", "description", "mitre_ics", "acknowledged"]
    return {"alerts": [dict(zip(cols, r)) for r in rows], "device_ip": ip}

@app.post("/v1/devices/authorize", tags=["Devices"])
async def authorize_device(req: AuthorizeReq, _ = Depends(_auth)):
    """
    Mark a device as authorized — suppresses 'Unknown Device' alerts for this IP.
    Add the IP to `authorized_devices` in sentinel.yml to persist across restarts.
    """
    _lic()
    ok = await _engine_ok().authorize_device(req.ip)
    if not ok:
        raise HTTPException(404, f"Device {req.ip} not in inventory. Run a discovery scan first.")
    return {"authorized": True, "ip": req.ip}

# ─────────────────────────────────────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/alerts", tags=["Alerts"])
async def alerts(
    severity:     Optional[str]  = None,
    acknowledged: Optional[bool] = None,
    device_ip:    Optional[str]  = None,
    limit:        int             = 100,
    _ = Depends(_auth),
):
    """
    Query all alerts with optional filters.

    severity: low | medium | high | critical
    acknowledged: true | false
    device_ip: filter to a specific device
    limit: max 5000
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = ["1=1"]; params: list = []
    if severity:     cond.append("severity=?");     params.append(severity)
    if acknowledged is not None: cond.append("acknowledged=?"); params.append(int(acknowledged))
    if device_ip:    cond.append("device_ip=?");    params.append(device_ip)
    params.append(min(limit, 5000))
    rows = await (await e._db.execute(
        f"SELECT id,ts,rule_id,rule_name,severity,device_ip,description,mitre_ics,"
        f"evidence,acknowledged FROM alerts WHERE {' AND '.join(cond)} ORDER BY ts DESC LIMIT ?",
        params
    )).fetchall()
    cols = ["id", "ts", "rule_id", "rule_name", "severity", "device_ip",
            "description", "mitre_ics", "evidence", "acknowledged"]
    return {"alerts": [dict(zip(cols, r)) for r in rows], "total": len(rows)}

@app.post("/v1/alerts/{alert_id}/acknowledge", tags=["Alerts"])
async def acknowledge(alert_id: str, req: AcknowledgeReq, _ = Depends(_auth)):
    """Acknowledge an alert — removes it from the active queue."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    if alert_id != req.alert_id:
        raise HTTPException(400, "alert_id mismatch between URL and body")
    await e._db.execute(
        "UPDATE alerts SET acknowledged=1 WHERE id=?", (alert_id,)
    )
    await e._db.commit()
    return {"acknowledged": True, "alert_id": alert_id, "analyst": req.analyst}

# ─────────────────────────────────────────────────────────────────────────────
# DISCOVERY / SCANNING
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/scan", tags=["Discovery"])
async def trigger_scan(req: ScanReq, background_tasks: BackgroundTasks, _ = Depends(_auth)):
    """
    Trigger an on-demand discovery scan.

    Runs in the background — returns immediately with a job token.
    Poll /v1/dashboard for updated device counts once complete.

    If `subnets` is omitted, scans the subnets defined in sentinel.yml.
    """
    _lic()
    e = _engine_ok()
    subnets = req.subnets or _config.get("sentinel", {}).get("scan_subnets", [])
    if not subnets:
        raise HTTPException(400, "No subnets configured. Provide subnets in request or sentinel.yml.")
    background_tasks.add_task(_run_scan, e, subnets)
    return {"queued": True, "subnets": subnets, "message": "Scan started in background. Check /v1/dashboard for results."}

async def _run_scan(engine: SentinelEngine, subnets: List[str]):
    for subnet in subnets:
        try:
            await engine._scanner.scan_subnet(subnet)
        except Exception as ex:
            log.error("Background scan error for %s: %s", subnet, ex)

# ─────────────────────────────────────────────────────────────────────────────
# NETWORK TOPOLOGY
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/topology", tags=["Discovery"])
async def topology(_ = Depends(_auth)):
    """
    Network topology map — devices grouped by type and subnet.

    Returns a graph-ready payload with nodes (devices) and links (communication
    relationships detected via protocol analysis).
    """
    _lic()
    e = _engine_ok()
    nodes = []
    for ip, dev in e._devices.items():
        from dataclasses import asdict
        d = asdict(dev)
        nodes.append({
            "id":          ip,
            "ip":          ip,
            "hostname":    dev.hostname,
            "vendor":      dev.vendor,
            "product":     dev.product,
            "type":        dev.device_type.value if hasattr(dev.device_type, "value") else str(dev.device_type),
            "protocols":   dev.protocols,
            "authorized":  dev.authorized,
            "risk_score":  d.get("risk_score", 0),
            "cves":        dev.known_cves[:3],
            "last_seen":   dev.last_seen,
        })
    return {
        "nodes": nodes,
        "total_devices": len(nodes),
        "subnets": _config.get("sentinel", {}).get("scan_subnets", []),
    }

# ─────────────────────────────────────────────────────────────────────────────
# FIRMWARE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/firmware", tags=["Firmware"])
async def firmware_inventory(anomaly_only: bool = False, _ = Depends(_auth)):
    """
    Firmware inventory — all tracked firmware hashes and versions.

    anomaly_only=true returns only devices where firmware changed unexpectedly.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = "WHERE anomaly=1" if anomaly_only else ""
    rows = await (await e._db.execute(
        f"SELECT device_ip,firmware_hash,firmware_version,vendor,first_seen,last_seen,anomaly "
        f"FROM firmware_inventory {cond} ORDER BY last_seen DESC"
    )).fetchall()
    cols = ["device_ip", "firmware_hash", "firmware_version", "vendor", "first_seen", "last_seen", "anomaly"]
    return {"firmware": [dict(zip(cols, r)) for r in rows], "total": len(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# COMPLIANCE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/compliance/{standard}", tags=["Compliance"])
async def compliance_report(standard: str, _ = Depends(_auth)):
    """
    OT compliance report for the requested standard.

    Available standards: iec62443 | nerc_cip | nist_sp800_82
    """
    _lic()
    e = _engine_ok()
    try:
        std = ComplianceStandard(standard)
    except ValueError:
        raise HTTPException(400, f"Unknown standard. Valid: {[s.value for s in ComplianceStandard]}")
    return await e.get_compliance_report(std)

# ─────────────────────────────────────────────────────────────────────────────
# REGISTER READINGS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/register-readings", tags=["OT Polling"])
async def register_readings(
    device_ip:    Optional[str] = None,
    anomaly_only: bool          = False,
    limit:        int           = 500,
    _ = Depends(_auth),
):
    """
    Modbus / OT register readings with anomaly flags.

    anomaly_only=true returns only readings that exceeded baseline thresholds.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = ["1=1"]; params: list = []
    if device_ip:    cond.append("device_ip=?"); params.append(device_ip)
    if anomaly_only: cond.append("anomaly=1")
    params.append(min(limit, 10000))
    rows = await (await e._db.execute(
        f"SELECT ts,device_ip,address,protocol,value,anomaly FROM register_readings "
        f"WHERE {' AND '.join(cond)} ORDER BY ts DESC LIMIT ?", params
    )).fetchall()
    cols = ["ts", "device_ip", "address", "protocol", "value", "anomaly"]
    return {"readings": [dict(zip(cols, r)) for r in rows], "total": len(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# LOG INGESTION (External SIEM push)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/ingest", tags=["Ingestion"])
async def ingest(req: IngestLogReq, _ = Depends(_auth)):
    """
    Push raw syslog / event logs into Sentinel for analysis.

    Sentinel parses, correlates, and creates alerts from the submitted logs.
    Returns the list of alert IDs generated from this batch.
    """
    _lic()
    e = _engine_ok()
    all_ids = []
    for raw in req.logs[:1000]:
        ids = await e.ingest_log(raw, req.source_ip)
        all_ids.extend(ids)
    return {
        "processed":      len(req.logs),
        "alerts_created": len(all_ids),
        "alert_ids":      all_ids,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ROOT DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_dashboard():
    """Enterprise client portal — served as embedded HTML."""
    html_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(html_path):
        with open(html_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard unavailable</h1>", status_code=500)
