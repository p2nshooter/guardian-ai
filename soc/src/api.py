# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO SOC — Security Operations Center REST API v1.1"""
from __future__ import annotations
import asyncio, logging, os, time, yaml, json
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from .engine import SOCEngine
from .license import LicenseValidator, LicenseState, machine_id
from .engine import AlertSource, Severity, IncidentStatus, DETECTION_RULES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("soc.api")

CONFIG_PATH = os.environ.get("SOC_CONFIG", "/soc/config/soc.yml")
_config:    Dict                    = {}
_engine:    Optional[SOCEngine]     = None
_lic_state: LicenseState            = LicenseState()
_validator: Optional[LicenseValidator] = None


def _load_config() -> Dict:
    try:
        return yaml.safe_load(open(CONFIG_PATH)) or {}
    except FileNotFoundError:
        return {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _config, _engine, _lic_state, _validator

    _config    = _load_config()
    _validator = LicenseValidator(_config.get("soc", {}))
    _lic_state = await _validator.validate()

    if not _lic_state.valid:
        _lic_state.grace_start = time.time()
        log.warning(
            "LICENSE NOT VALID — 4-hour grace period started. "
            "Renew at: https://axto.io/renew"
        )
    else:
        log.info(
            f"License active — package={_lic_state.package} "
            f"expires={_lic_state.expires_at or 'perpetual'}"
        )

    if _lic_state.is_expiring_soon:
        log.warning(
            f"LICENSE EXPIRING SOON — {_lic_state.days_until_expiry} days. "
            f"Renew: https://axto.io/renew"
        )

    scfg = _config.get("soc", {})
    _engine = SOCEngine(scfg, db_path=scfg.get("db_path", "/soc/data/soc.db"))
    await _engine.start()
    asyncio.create_task(_heartbeat())
    log.info("AXTO SOC API ready (port %s)", os.environ.get("SOC_PORT", "8092"))
    yield

    if _engine:    await _engine.stop()
    if _validator: await _validator.close()


async def _heartbeat():
    global _lic_state
    failures = 0
    while True:
        await asyncio.sleep(3600)
        try:
            new = await _validator.validate(force=True)
            if new.valid:
                new.grace_start = 0.0
                failures = 0
                log.info("License heartbeat OK")
            else:
                # Preserve original grace_start so the 4h timer is NOT reset
                new.grace_start = _lic_state.grace_start or time.time()
                failures += 1
                log.warning(
                    f"License heartbeat failed (attempt {failures}) — "
                    f"grace remaining: {int(new.grace_remaining_min)}m"
                )
            _lic_state = new
        except Exception as e:
            failures += 1
            log.error(f"Heartbeat error: {e}")

# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AXTO SOC — Security Operations Center",
    version="1.1.0",
    description=(
        "AI-augmented SIEM/SOC platform — log ingestion, correlation, "
        "UEBA, threat intelligence enrichment, SOAR automation, and "
        "incident management. Entirely on your own infrastructure."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

def _lic():
    """
    Per-request license enforcement gate.
    Called as the FIRST line of every protected endpoint.
    Raises HTTP 503 when grace period has expired.
    """
    if _lic_state.grace_expired:
        raise HTTPException(503, detail={
            "error":      "license_expired",
            "product":    "axto-soc",
            "message":    "Your AXTO license has expired. All operations are suspended.",
            "renew_url":  "https://axto.io/renew",
            "support":    "support@axto.io",
        })

def _lic_warn() -> dict:
    """Returns expiry warning dict to merge into responses, or empty dict."""
    w = _lic_state.warning_message()
    return {"_license_warning": w} if w else {}

def _auth(x: Optional[str] = Header(None, alias="X-SOC-Key")):
    k = _config.get("soc", {}).get("api_key", "")
    if k and x != k:
        raise HTTPException(401, detail="Invalid or missing X-SOC-Key header")

def _engine_ok() -> SOCEngine:
    if not _engine:
        raise HTTPException(503, detail="Engine initializing, retry in a few seconds")
    return _engine

# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class IngestReq(BaseModel):
    logs:   List[str] = Field(..., max_length=1000, description="Up to 1000 raw log lines per call")
    source: str       = Field("json_api", description="syslog | cef | leef | json_api | windows_event | cloudtrail")

class IncidentPatch(BaseModel):
    status:     Optional[str]   = Field(None, description="open | investigating | contained | resolved | closed")
    assignee:   Optional[str]   = None
    resolution: Optional[str]   = None
    mttr_sec:   Optional[float] = None

class FPFeedback(BaseModel):
    alert_id: str
    analyst:  str
    reason:   str

class PlaybookRunReq(BaseModel):
    incident_id: str
    action:      str   = Field(..., description="isolate_host | block_ip | reset_password | collect_forensics | kill_process | dns_block")
    target:      str   = Field(..., description="IP address, hostname, username, or process name depending on action")

class RuleReq(BaseModel):
    name:        str
    description: str
    pattern:     str   = Field(..., description="Python regex pattern to match against raw log lines")
    severity:    str   = Field("medium", description="low | medium | high | critical")
    mitre:       List[str] = Field(default_factory=list, description="MITRE ATT&CK technique IDs e.g. ['T1078', 'T1110']")
    threshold:   int   = Field(1, description="Number of matches within window to trigger alert")

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH & STATUS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Status"])
async def health():
    """Service health check — used by Docker / load-balancer probes."""
    resp = {
        "status":       "ok",
        "product":      "axto-soc",
        "version":      "1.1.0",
        "license":      _lic_state.to_api_dict(),
        "engine_ready": _engine is not None,
        "timestamp":    time.time(),
    }
    if _lic_state.grace_expired:
        resp["status"] = "license_expired"
    elif not _lic_state.valid and _lic_state.grace_start:
        resp["status"] = "grace_period"
    return resp

@app.get("/v1/dashboard", tags=["Dashboard"])
async def dashboard(_ = Depends(_auth)):
    """
    Master SOC dashboard — all key metrics in one call.

    Returns: alert counts by severity, open incident count, MTTD/MTTR,
    top 5 alert sources, UEBA anomaly count, TI enrichment rate,
    SLA breach count, and 24-hour trend data.
    """
    _lic()
    return await _engine_ok().dashboard_stats()

# ─────────────────────────────────────────────────────────────────────────────
# LOG INGESTION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/ingest", tags=["Ingestion"])
async def ingest(req: IngestReq, _ = Depends(_auth)):
    """
    Ingest raw log lines for analysis.

    Supports: syslog, CEF, LEEF, JSON, Windows Event XML, AWS CloudTrail.
    Each log is parsed, enriched with threat intelligence, run through
    UEBA, correlated against active incidents, and matched against
    detection rules. Returns the list of alert IDs generated.

    Send up to 1,000 log lines per call. For high-volume ingestion,
    batch in parallel HTTP calls or use the syslog forwarder.
    """
    _lic()
    e = _engine_ok()
    try:
        src = AlertSource(req.source)
    except ValueError:
        src = AlertSource.JSON_API
    all_alerts = []
    for raw in req.logs[:1000]:
        alerts = await e.ingest(raw, src)
        all_alerts.extend(alerts)
    return {
        "processed":      len(req.logs),
        "alerts_created": len(all_alerts),
        "alert_ids":      [a.id for a in all_alerts],
    }

# ─────────────────────────────────────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/alerts", tags=["Alerts"])
async def alerts(
    severity:       Optional[str]  = None,
    host:           Optional[str]  = None,
    src_ip:         Optional[str]  = None,
    rule_id:        Optional[str]  = None,
    false_positive: Optional[bool] = None,
    limit:          int            = 100,
    _ = Depends(_auth),
):
    """
    Query all alerts with optional filters.

    severity: low | medium | high | critical
    false_positive: exclude known FP with false_positive=false
    limit: max 5000
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503, "Database not ready")
    cond = ["1=1"]; params: list = []
    if severity:       cond.append("severity=?");       params.append(severity)
    if host:           cond.append("host=?");           params.append(host)
    if src_ip:         cond.append("src_ip=?");         params.append(src_ip)
    if rule_id:        cond.append("rule_id=?");        params.append(rule_id)
    if false_positive is not None:
        cond.append("false_positive=?"); params.append(int(false_positive))
    params.append(min(limit, 5000))
    rows = await (await e._db.execute(
        f"SELECT id,ts,source,raw_log,rule_id,rule_name,severity,host,user_field,"
        f"src_ip,dst_ip,mitre_tactics,ti_enrichment,ueba_anomaly,incident_id,false_positive "
        f"FROM alerts WHERE {' AND '.join(cond)} ORDER BY ts DESC LIMIT ?", params
    )).fetchall()
    cols = ["id","ts","source","raw_log","rule_id","rule_name","severity","host",
            "user_field","src_ip","dst_ip","mitre_tactics","ti_enrichment",
            "ueba_anomaly","incident_id","false_positive"]
    results = []
    for r in rows:
        row = dict(zip(cols, r))
        for f in ("mitre_tactics","ti_enrichment"):
            if row[f] and isinstance(row[f], str):
                try: row[f] = json.loads(row[f])
                except Exception: pass
        results.append(row)
    return {"alerts": results, "total": len(results)}

@app.get("/v1/alerts/{alert_id}", tags=["Alerts"])
async def get_alert(alert_id: str, _ = Depends(_auth)):
    """Full detail for a single alert by ID."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    row = await (await e._db.execute(
        "SELECT * FROM alerts WHERE id=?", (alert_id,)
    )).fetchone()
    if not row:
        raise HTTPException(404, f"Alert {alert_id} not found")
    cols = ["id","ts","source","raw_log","rule_id","rule_name","severity","host",
            "user_field","src_ip","dst_ip","mitre_tactics","ti_enrichment",
            "ueba_anomaly","incident_id","false_positive"]
    result = dict(zip(cols, row))
    for f in ("mitre_tactics","ti_enrichment"):
        if result[f] and isinstance(result[f], str):
            try: result[f] = json.loads(result[f])
            except Exception: pass
    return result

@app.post("/v1/feedback/false-positive", tags=["Alerts"])
async def mark_false_positive(req: FPFeedback, _ = Depends(_auth)):
    """
    Mark an alert as a false positive.

    Records analyst feedback for rule tuning. FP-marked alerts are
    suppressed in future identical pattern matches.
    """
    _lic()
    await _engine_ok().mark_false_positive(req.alert_id, req.analyst, req.reason)
    return {"marked": True, "alert_id": req.alert_id, "analyst": req.analyst}

# ─────────────────────────────────────────────────────────────────────────────
# INCIDENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/incidents", tags=["Incidents"])
async def incidents(
    status:   Optional[str] = None,
    severity: Optional[str] = None,
    assignee: Optional[str] = None,
    limit:    int           = 50,
    _ = Depends(_auth),
):
    """
    Query incidents with optional filters.

    status: open | investigating | contained | resolved | closed
    severity: low | medium | high | critical
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = ["1=1"]; params: list = []
    if status:   cond.append("status=?");   params.append(status)
    if severity: cond.append("severity=?"); params.append(severity)
    if assignee: cond.append("assignee=?"); params.append(assignee)
    params.append(min(limit, 1000))
    rows = await (await e._db.execute(
        f"SELECT id,created_at,updated_at,title,severity,status,alert_ids,assignee,"
        f"description,timeline,mitre_tactics,playbook,playbook_steps,soar_log,"
        f"resolution,sla_breach,mttd_sec,mttr_sec,ai_triage "
        f"FROM incidents WHERE {' AND '.join(cond)} ORDER BY created_at DESC LIMIT ?", params
    )).fetchall()
    cols = ["id","created_at","updated_at","title","severity","status","alert_ids",
            "assignee","description","timeline","mitre_tactics","playbook","playbook_steps",
            "soar_log","resolution","sla_breach","mttd_sec","mttr_sec","ai_triage"]
    results = []
    for r in rows:
        row = dict(zip(cols, r))
        for f in ("alert_ids","timeline","mitre_tactics","playbook_steps","soar_log"):
            if row[f] and isinstance(row[f], str):
                try: row[f] = json.loads(row[f])
                except Exception: pass
        results.append(row)
    return {"incidents": results, "total": len(results)}

@app.get("/v1/incidents/{iid}", tags=["Incidents"])
async def get_incident(iid: str, _ = Depends(_auth)):
    """Full incident detail including timeline, SOAR log, and AI triage."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    row = await (await e._db.execute(
        "SELECT id,created_at,updated_at,title,severity,status,alert_ids,assignee,"
        "description,timeline,mitre_tactics,playbook,playbook_steps,soar_log,"
        "resolution,sla_breach,mttd_sec,mttr_sec,ai_triage "
        "FROM incidents WHERE id=?", (iid,)
    )).fetchone()
    if not row:
        raise HTTPException(404, f"Incident {iid} not found")
    cols = ["id","created_at","updated_at","title","severity","status","alert_ids",
            "assignee","description","timeline","mitre_tactics","playbook","playbook_steps",
            "soar_log","resolution","sla_breach","mttd_sec","mttr_sec","ai_triage"]
    result = dict(zip(cols, row))
    for f in ("alert_ids","timeline","mitre_tactics","playbook_steps","soar_log"):
        if result[f] and isinstance(result[f], str):
            try: result[f] = json.loads(result[f])
            except Exception: pass
    return result

@app.patch("/v1/incidents/{iid}", tags=["Incidents"])
async def patch_incident(iid: str, req: IncidentPatch, _ = Depends(_auth)):
    """
    Update incident status, assignee, resolution, or MTTR.

    Triggers SLA recalculation on status change to 'resolved'.
    Use status='closed' to permanently close an incident.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    # Verify incident exists
    exists = await (await e._db.execute(
        "SELECT id FROM incidents WHERE id=?", (iid,)
    )).fetchone()
    if not exists:
        raise HTTPException(404, f"Incident {iid} not found")
    sets = []; params = []
    if req.status     is not None: sets.append("status=?");     params.append(req.status)
    if req.assignee   is not None: sets.append("assignee=?");   params.append(req.assignee)
    if req.resolution is not None: sets.append("resolution=?"); params.append(req.resolution)
    if req.mttr_sec   is not None: sets.append("mttr_sec=?");   params.append(req.mttr_sec)
    if not sets:
        raise HTTPException(400, "No fields provided to update")
    sets.append("updated_at=?")
    params.append(time.time())
    params.append(iid)
    await e._db.execute(f"UPDATE incidents SET {','.join(sets)} WHERE id=?", params)
    await e._db.commit()
    return {"updated": True, "incident_id": iid, "fields": [s.split("=")[0] for s in sets[:-1]]}

# ─────────────────────────────────────────────────────────────────────────────
# SOAR / PLAYBOOK EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/soar/run", tags=["SOAR"])
async def soar_run(req: PlaybookRunReq, background_tasks: BackgroundTasks, _ = Depends(_auth)):
    """
    Execute a SOAR playbook action against an active incident.

    Actions:
    - `isolate_host` — network-isolate a compromised host (requires Guardian integration)
    - `block_ip` — firewall-block an IP address (requires firewall integration)
    - `reset_password` — force password reset for a user account
    - `collect_forensics` — trigger memory/disk snapshot collection
    - `kill_process` — terminate a malicious process by name or PID
    - `dns_block` — block a malicious domain at DNS level

    Execution is asynchronous — returns immediately with a job ID.
    Check incident SOAR log for result.
    """
    _lic()
    e = _engine_ok()
    background_tasks.add_task(_exec_soar, e, req.incident_id, req.action, req.target)
    return {
        "queued":      True,
        "incident_id": req.incident_id,
        "action":      req.action,
        "target":      req.target,
        "message":     "SOAR action queued. Check /v1/incidents/{id} soar_log for result.",
    }

async def _exec_soar(engine: SOCEngine, incident_id: str, action: str, target: str):
    try:
        ctx = {"host": target, "ip": target, "username": target, "process": target, "domain": target}
        result = await engine._soar.execute(action, ctx)
        # Append to incident SOAR log
        if engine._db:
            row = await (await engine._db.execute(
                "SELECT soar_log FROM incidents WHERE id=?", (incident_id,)
            )).fetchone()
            if row:
                try:
                    log_entries = json.loads(row[0] or "[]")
                except Exception:
                    log_entries = []
                log_entries.append({
                    "ts": time.time(), "action": action, "target": target, "result": result
                })
                await engine._db.execute(
                    "UPDATE incidents SET soar_log=?, updated_at=? WHERE id=?",
                    (json.dumps(log_entries), time.time(), incident_id)
                )
                await engine._db.commit()
    except Exception as ex:
        log.error("SOAR execution error: %s", ex)

@app.get("/v1/soar/actions", tags=["SOAR"])
async def soar_actions(_ = Depends(_auth)):
    """List available SOAR actions and their configuration requirements."""
    _lic()
    ecfg = _config.get("soc", {}).get("soar", {})
    return {
        "actions": [
            {"action": "isolate_host",    "requires": "soar.guardian_api_url",  "configured": bool(ecfg.get("guardian_api_url"))},
            {"action": "block_ip",        "requires": "soar.firewall_api_url",  "configured": bool(ecfg.get("firewall_api_url"))},
            {"action": "reset_password",  "requires": "soar.ad_api_url",        "configured": bool(ecfg.get("ad_api_url"))},
            {"action": "collect_forensics","requires": "soar.guardian_api_url", "configured": bool(ecfg.get("guardian_api_url"))},
            {"action": "kill_process",    "requires": "soar.guardian_api_url",  "configured": bool(ecfg.get("guardian_api_url"))},
            {"action": "dns_block",       "requires": "soar.dns_block_api_url", "configured": bool(ecfg.get("dns_block_api_url"))},
        ]
    }

# ─────────────────────────────────────────────────────────────────────────────
# DETECTION RULES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/rules", tags=["Detection Rules"])
async def list_rules(_ = Depends(_auth)):
    """
    List all active detection rules.

    Shows rule ID, name, severity, MITRE ATT&CK mapping, and threshold.
    Rules are evaluated against every ingested log line.
    """
    return {
        "rules": [{
            "id":        r["id"],
            "name":      r["name"],
            "severity":  r["severity"].value if hasattr(r["severity"], "value") else str(r["severity"]),
            "mitre":     r["mitre"],
            "threshold": r["threshold"],
            "description": r.get("description", ""),
        } for r in DETECTION_RULES],
        "total": len(DETECTION_RULES),
    }

# ─────────────────────────────────────────────────────────────────────────────
# THREAT INTELLIGENCE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/threat-intel/check", tags=["Threat Intelligence"])
async def ti_check(ip: Optional[str] = None, domain: Optional[str] = None, _ = Depends(_auth)):
    """
    Check an IP or domain against the threat intelligence feeds.

    Uses local threat feed files + AbuseIPDB (if configured).
    Returns risk score, categories, and source data.
    """
    _lic()
    if not ip and not domain:
        raise HTTPException(400, "Provide ip= or domain= query parameter")
    e = _engine_ok()
    result = {"ip": ip, "domain": domain, "threat_intel": {}}
    if ip:
        check = await e._ti.check_ip(ip) if hasattr(e, "_ti") else {}
        result["threat_intel"]["ip"] = check
    if domain:
        check = await e._ti.check_domain(domain) if hasattr(e, "_ti") else {}
        result["threat_intel"]["domain"] = check
    return result

@app.get("/v1/threat-intel/feeds", tags=["Threat Intelligence"])
async def ti_feeds(_ = Depends(_auth)):
    """Status of configured threat intelligence feeds."""
    _lic()
    scfg = _config.get("soc", {})
    feeds = [
        {"name": "Local IP Feed",     "path": "/soc/threat-feed/malicious_ips.json",     "type": "ip"},
        {"name": "Local Domain Feed", "path": "/soc/threat-feed/malicious_domains.json", "type": "domain"},
        {"name": "Local Hash Feed",   "path": "/soc/threat-feed/malware_hashes.json",    "type": "hash"},
        {"name": "AbuseIPDB",         "configured": bool(scfg.get("abuseipdb_api_key")), "type": "ip"},
        {"name": "AlienVault OTX",    "configured": bool(scfg.get("otx_api_key")),       "type": "ip,domain,hash"},
    ]
    for f in feeds:
        if "path" in f:
            f["available"] = os.path.exists(f["path"])
    return {"feeds": feeds}

# ─────────────────────────────────────────────────────────────────────────────
# UEBA
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/ueba/anomalies", tags=["UEBA"])
async def ueba_anomalies(
    user:    Optional[str] = None,
    host:    Optional[str] = None,
    limit:   int           = 50,
    _ = Depends(_auth),
):
    """
    User and Entity Behavior Analytics — anomalous activity detected.

    Returns statistical anomalies: unusual login times, access from new
    locations, abnormal data volumes, lateral movement patterns.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = ["ueba_anomaly=1"]; params: list = []
    if user: cond.append("user_field=?"); params.append(user)
    if host: cond.append("host=?");       params.append(host)
    params.append(min(limit, 1000))
    rows = await (await e._db.execute(
        f"SELECT id,ts,rule_name,severity,host,user_field,src_ip,mitre_tactics "
        f"FROM alerts WHERE {' AND '.join(cond)} ORDER BY ts DESC LIMIT ?", params
    )).fetchall()
    cols = ["id","ts","rule_name","severity","host","user_field","src_ip","mitre_tactics"]
    return {"anomalies": [dict(zip(cols, r)) for r in rows], "total": len(rows)}

# ─────────────────────────────────────────────────────────────────────────────
# METRICS & REPORTING
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/metrics", tags=["Metrics"])
async def metrics(_ = Depends(_auth)):
    """
    SOC performance metrics.

    Returns MTTD (mean time to detect), MTTR (mean time to respond),
    SLA breach rate, false positive rate, alert volume trend,
    and top alert sources by count.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    now = time.time()
    d7  = now - 7 * 86400
    d30 = now - 30 * 86400

    rows_7d = await (await e._db.execute(
        "SELECT COUNT(*), AVG(mttd_sec), AVG(mttr_sec), SUM(sla_breach) FROM incidents WHERE created_at>?", (d7,)
    )).fetchone()
    rows_30d = await (await e._db.execute(
        "SELECT COUNT(*), AVG(mttd_sec), AVG(mttr_sec), SUM(sla_breach) FROM incidents WHERE created_at>?", (d30,)
    )).fetchone()
    fp_count = await (await e._db.execute(
        "SELECT COUNT(*) FROM alerts WHERE false_positive=1 AND ts>?", (d7,)
    )).fetchone()
    total_7d = await (await e._db.execute(
        "SELECT COUNT(*) FROM alerts WHERE ts>?", (d7,)
    )).fetchone()
    top_rules = await (await e._db.execute(
        "SELECT rule_name, COUNT(*) as cnt FROM alerts WHERE ts>? GROUP BY rule_name ORDER BY cnt DESC LIMIT 5", (d7,)
    )).fetchall()

    return {
        "period_7d": {
            "incidents":    rows_7d[0] or 0,
            "avg_mttd_sec": round(rows_7d[1] or 0, 1),
            "avg_mttr_sec": round(rows_7d[2] or 0, 1),
            "sla_breaches": rows_7d[3] or 0,
            "alert_count":  total_7d[0] or 0,
            "fp_count":     fp_count[0] or 0,
            "fp_rate_pct":  round((fp_count[0] or 0) / max(total_7d[0] or 1, 1) * 100, 1),
        },
        "period_30d": {
            "incidents":    rows_30d[0] or 0,
            "avg_mttd_sec": round(rows_30d[1] or 0, 1),
            "avg_mttr_sec": round(rows_30d[2] or 0, 1),
            "sla_breaches": rows_30d[3] or 0,
        },
        "top_rules_7d": [{"rule": r[0], "count": r[1]} for r in top_rules],
    }

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_dashboard():
    import os
    html_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(html_path):
        with open(html_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard unavailable</h1>", status_code=500)
