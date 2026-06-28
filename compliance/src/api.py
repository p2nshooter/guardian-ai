# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Compliance — Automated Audit Platform REST API v1.1"""
from __future__ import annotations
import asyncio, logging, os, time, yaml, json
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from .engine import ComplianceEngine
from .license import LicenseValidator, LicenseState, machine_id
from .engine import Framework, ControlStatus, RiskLevel

log = logging.getLogger("compliance.api")
CONFIG_PATH = os.environ.get("COMPLIANCE_CONFIG", "/compliance/config/compliance.yml")
_config: Dict = {}
_engine: Optional[ComplianceEngine] = None
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

def _mid() -> str:
    try:
        return open("/etc/machine-id").read().strip()
    except Exception:
        import hashlib, socket
        return hashlib.sha256(socket.gethostname().encode()).hexdigest()[:32]

async def _validate(cfg: Dict) -> bool:
    key = cfg.get("compliance", {}).get("license_key", "")
    url = cfg.get("compliance", {}).get("license_validate_url", "https://axto.io/api/license-validate")
    if not key or "XXXX" in key:
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json={"license_key": key, "machine_id": _mid(), "product": "compliance"})
            return r.json().get("valid", False)
    except Exception:
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _config, _engine, _license_valid, _grace_start
    _config   = _load()
    _validator = LicenseValidator(_config.get("compliance", {}))
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
    ccfg = _config.get("compliance", {})
    _engine = ComplianceEngine(ccfg, db_path=ccfg.get("db_path", "/compliance/data/compliance.db"))
    await _engine.start()
    asyncio.create_task(_heartbeat())
    if ccfg.get("run_on_startup", True):
        asyncio.create_task(_initial_assessment())
    log.info("AXTO Compliance API ready ✓ (port %s)", os.environ.get("COMPLIANCE_PORT", "8093"))
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

async def _initial_assessment():
    await asyncio.sleep(5)
    if _engine:
        for fw in _engine._frameworks:
            try:
                await _engine.run_assessment(fw)
            except Exception as e:
                log.error("Initial assessment %s failed: %s", fw.value, e)

# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AXTO Compliance — Automated Audit Platform",
    version="1.1.0",
    description=(
        "Continuous automated compliance monitoring for SOC 2, ISO 27001, "
        "PCI-DSS, HIPAA, GDPR, PDPA, and NIST CSF. Self-hosted — your data "
        "never leaves your infrastructure."
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
            "product":    "axto-compliance",
            "message":    "Your AXTO license has expired. All operations are suspended.",
            "renew_url":  "https://axto.io/renew",
            "support":    "support@axto.io",
        })

def _lic_warn() -> dict:
    """Returns expiry warning dict to merge into responses, or empty dict."""
    w = _lic_state.warning_message()
    return {{"_license_warning": w}} if w else {{}}

def _auth(x: Optional[str] = Header(None, alias="X-Compliance-Key")):
    k = _config.get("compliance", {}).get("api_key", "")
    if k and x != k:
        raise HTTPException(401, detail="Invalid or missing X-Compliance-Key header")

def _engine_ok() -> ComplianceEngine:
    if not _engine:
        raise HTTPException(503, detail="Engine initializing, retry in a few seconds")
    return _engine

# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class RiskItemPatch(BaseModel):
    status:      Optional[str] = Field(None, description="open | in_progress | accepted | resolved")
    assignee:    Optional[str] = None
    notes:       Optional[str] = None
    target_date: Optional[str] = None   # ISO 8601 date string

class EvidenceUpload(BaseModel):
    control_id:  str
    framework:   str
    description: str
    content:     str  = Field(..., description="Evidence text content (policy doc excerpt, screenshot URL, etc.)")

class ExclusionReq(BaseModel):
    control_id:   str
    framework:    str
    reason:       str
    approved_by:  str

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH & STATUS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Status"])
async def health():
    """Service health check — used by Docker / load-balancer probes."""
    _status = "ok"
    if _lic_state.grace_expired:
        _status = "license_expired"
    elif not _lic_state.valid and _lic_state.grace_start:
        _status = "grace_period"
    _warn = _lic_state.warning_message()
    return {
        "status":        _status,
        "product":       "axto-compliance",
        "version":       "1.1.0",
        "license":       _lic_state.to_api_dict(),
        "engine_ready":  _engine is not None,
        "timestamp":     time.time(),
        **({"_license_warning": _warn} if _warn else {}),
    }

@app.get("/v1/summary", tags=["Dashboard"])
async def summary(_ = Depends(_auth)):
    """
    Compliance summary across all enabled frameworks.

    Returns overall score, risk posture, framework-by-framework breakdown,
    open risk item count, and last assessment timestamps.
    """
    _lic()
    return await _engine_ok().get_summary()

# ─────────────────────────────────────────────────────────────────────────────
# FRAMEWORKS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/frameworks", tags=["Frameworks"])
async def list_frameworks():
    """
    List all supported compliance frameworks.

    No authentication required — useful for framework discovery
    before configuring your compliance.yml.
    """
    descriptions = {
        "soc2":      "SOC 2 Type II — Service Organization Controls (AICPA)",
        "iso27001":  "ISO/IEC 27001:2022 — Information Security Management",
        "pci_dss":   "PCI-DSS v4.0 — Payment Card Industry Data Security",
        "hipaa":     "HIPAA — Health Insurance Portability and Accountability",
        "gdpr":      "GDPR — General Data Protection Regulation (EU)",
        "pdpa":      "PDPA — Personal Data Protection Act (Thailand)",
        "nist_csf":  "NIST CSF 2.0 — Cybersecurity Framework",
    }
    configured = _config.get("compliance", {}).get("frameworks", [])
    return {
        "all_frameworks": [
            {"id": f.value, "name": descriptions.get(f.value, f.value),
             "enabled": f.value in configured}
            for f in Framework
        ],
        "enabled": configured,
    }

# ─────────────────────────────────────────────────────────────────────────────
# ASSESSMENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/assess/{framework}", tags=["Assessments"])
async def run_assessment(framework: str, _ = Depends(_auth)):
    """
    Run a compliance assessment for the specified framework.

    Automatically checks all controls: TLS configuration, HTTP security
    headers, open/closed ports, file permissions, process presence,
    environment variables, and endpoint response validation.

    Returns score (0-100), risk level, pass/fail/partial breakdown,
    high-priority gaps, and a recommended remediation summary.

    Assessment runs synchronously — typically completes in 10-30 seconds
    depending on the number of controls and endpoint response times.
    """
    _lic()
    e = _engine_ok()
    try:
        fw = Framework(framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework '{framework}'. Valid: {[f.value for f in Framework]}")
    result = await e.run_assessment(fw)
    return {
        "id":           result.id,
        "framework":    result.framework.value,
        "score":        result.overall_score,
        "risk_level":   result.risk_level.value,
        "pass_count":   result.pass_count,
        "fail_count":   result.fail_count,
        "partial_count":result.partial_count,
        "manual_count": result.manual_count,
        "total_controls": result.pass_count + result.fail_count + result.partial_count + result.manual_count,
        "high_gaps":    [g for g in result.gaps if g.get("severity") == "high"][:20],
        "all_gaps":     result.gaps,
        "summary":      result.summary,
        "completed_at": result.completed_at,
    }

@app.post("/v1/assess-all", tags=["Assessments"])
async def run_all_assessments(background_tasks: BackgroundTasks, _ = Depends(_auth)):
    """
    Queue assessments for all enabled frameworks.

    Runs in the background — returns immediately.
    Poll /v1/summary for updated scores once complete.
    """
    _lic()
    e = _engine_ok()
    background_tasks.add_task(_run_all, e)
    return {
        "queued":     True,
        "frameworks": [f.value for f in e._frameworks],
        "message":    "All assessments queued. Check /v1/summary for results.",
    }

async def _run_all(engine: ComplianceEngine):
    for fw in engine._frameworks:
        try:
            await engine.run_assessment(fw)
        except Exception as ex:
            log.error("Background assessment %s failed: %s", fw.value, ex)

@app.get("/v1/assessments/{framework}/history", tags=["Assessments"])
async def assessment_history(framework: str, limit: int = 30, _ = Depends(_auth)):
    """
    Assessment score history for a framework.

    Returns the last N assessment scores and timestamps —
    ideal for charting compliance score trends over time.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    try:
        Framework(framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework: {framework}")
    rows = await (await e._db.execute(
        "SELECT id, framework, overall_score, risk_level, pass_count, fail_count, "
        "partial_count, manual_count, completed_at "
        "FROM assessment_results WHERE framework=? ORDER BY completed_at DESC LIMIT ?",
        (framework, min(limit, 500))
    )).fetchall()
    cols = ["id","framework","score","risk_level","pass","fail","partial","manual","completed_at"]
    return {"history": [dict(zip(cols, r)) for r in rows], "framework": framework}

# ─────────────────────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/report/{framework}", tags=["Reports"])
async def full_report(framework: str, _ = Depends(_auth)):
    """
    Full compliance report for a framework.

    Returns the complete last assessment: all controls with status,
    evidence collected, gaps identified, and remediation guidance.
    Suitable for exporting or presenting to auditors.
    """
    _lic()
    e = _engine_ok()
    try:
        fw = Framework(framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework: {framework}")
    return await e.generate_report(fw)

@app.get("/v1/report/{framework}/executive", tags=["Reports"])
async def executive_summary(framework: str, _ = Depends(_auth)):
    """
    Executive-friendly compliance summary.

    Condensed view: overall score, risk rating, top 5 critical gaps,
    and a plain-language readiness summary — suitable for board reporting.
    """
    _lic()
    e = _engine_ok()
    try:
        fw = Framework(framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework: {framework}")
    full = await e.generate_report(fw)
    critical_gaps = [g for g in full.get("gaps", []) if g.get("severity") == "high"][:5]
    return {
        "framework":     framework,
        "score":         full.get("overall_score", 0),
        "risk_level":    full.get("risk_level", "unknown"),
        "pass_rate_pct": round(
            full.get("pass_count", 0) / max(
                full.get("pass_count",0) + full.get("fail_count",0) + full.get("partial_count",0), 1
            ) * 100, 1
        ),
        "top_critical_gaps": critical_gaps,
        "readiness_summary": full.get("summary", ""),
        "last_assessed":     full.get("completed_at"),
    }

# ─────────────────────────────────────────────────────────────────────────────
# CONTROLS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/controls/{framework}", tags=["Controls"])
async def list_controls(
    framework: str,
    status:    Optional[str] = None,
    limit:     int           = 500,
    _ = Depends(_auth),
):
    """
    List all controls for a framework with their current status.

    status filter: pass | fail | partial | manual | not_checked
    Results ordered by score ascending (lowest scores = highest priority).
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    try:
        Framework(framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework: {framework}")
    cond = "WHERE framework=?"; params: list = [framework]
    if status:
        cond += " AND status=?"; params.append(status)
    params.append(min(limit, 2000))
    rows = await (await e._db.execute(
        f"SELECT control_id,status,score,gaps,remediation,checked_at "
        f"FROM control_results {cond} ORDER BY score ASC LIMIT ?", params
    )).fetchall()
    return {
        "controls": [{
            "id":          r[0],
            "status":      r[1],
            "score":       r[2],
            "gaps":        json.loads(r[3] or "[]"),
            "remediation": r[4],
            "checked_at":  r[5],
        } for r in rows],
        "framework": framework,
        "total":     len(rows),
    }

@app.get("/v1/controls/{framework}/{control_id}", tags=["Controls"])
async def get_control(framework: str, control_id: str, _ = Depends(_auth)):
    """Detailed result for a single control including full evidence and remediation steps."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    row = await (await e._db.execute(
        "SELECT control_id,status,score,gaps,remediation,checked_at "
        "FROM control_results WHERE framework=? AND control_id=? "
        "ORDER BY checked_at DESC LIMIT 1",
        (framework, control_id)
    )).fetchone()
    if not row:
        raise HTTPException(404, f"Control {control_id} not found for framework {framework}. Run an assessment first.")
    return {
        "id":          row[0],
        "framework":   framework,
        "status":      row[1],
        "score":       row[2],
        "gaps":        json.loads(row[3] or "[]"),
        "remediation": row[4],
        "checked_at":  row[5],
    }

# ─────────────────────────────────────────────────────────────────────────────
# RISK ITEMS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/v1/risk-items", tags=["Risk Management"])
async def risk_items(
    status:     str           = "open",
    risk_level: Optional[str] = None,
    framework:  Optional[str] = None,
    limit:      int           = 100,
    _ = Depends(_auth),
):
    """
    Risk register — all identified compliance gaps as trackable risk items.

    status: open | in_progress | accepted | resolved
    risk_level: critical | high | medium | low
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = ["status=?"]; params: list = [status]
    if risk_level: cond.append("risk_level=?"); params.append(risk_level)
    if framework:  cond.append("framework=?");  params.append(framework)
    params.append(min(limit, 2000))
    rows = await (await e._db.execute(
        f"SELECT id,title,description,risk_level,framework,control_id,remediation,"
        f"status,created_at,resolved_at FROM risk_items "
        f"WHERE {' AND '.join(cond)} ORDER BY created_at DESC LIMIT ?", params
    )).fetchall()
    cols = ["id","title","description","risk_level","framework","control_id",
            "remediation","status","created_at","resolved_at"]
    return {"risk_items": [dict(zip(cols, r)) for r in rows], "total": len(rows)}

@app.patch("/v1/risk-items/{item_id}", tags=["Risk Management"])
async def patch_risk_item(item_id: str, req: RiskItemPatch, _ = Depends(_auth)):
    """
    Update a risk item's status, assignee, notes, or target remediation date.

    Use status='accepted' to formally accept a risk (records approval).
    Use status='resolved' to close a risk item after remediation.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    exists = await (await e._db.execute(
        "SELECT id FROM risk_items WHERE id=?", (item_id,)
    )).fetchone()
    if not exists:
        raise HTTPException(404, f"Risk item {item_id} not found")
    sets = []; params = []
    if req.status      is not None: sets.append("status=?");      params.append(req.status)
    if req.assignee    is not None: sets.append("assignee=?");     params.append(req.assignee)
    if req.notes       is not None: sets.append("notes=?");        params.append(req.notes)
    if req.target_date is not None: sets.append("target_date=?");  params.append(req.target_date)
    if req.status == "resolved":
        sets.append("resolved_at=?"); params.append(time.time())
    if not sets:
        raise HTTPException(400, "No fields provided to update")
    params.append(item_id)
    await e._db.execute(f"UPDATE risk_items SET {','.join(sets)} WHERE id=?", params)
    await e._db.commit()
    return {"updated": True, "item_id": item_id}

@app.get("/v1/risk-items/stats", tags=["Risk Management"])
async def risk_stats(_ = Depends(_auth)):
    """Risk register statistics: counts by status and level."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    by_status = await (await e._db.execute(
        "SELECT status, COUNT(*) FROM risk_items GROUP BY status"
    )).fetchall()
    by_level = await (await e._db.execute(
        "SELECT risk_level, COUNT(*) FROM risk_items WHERE status='open' GROUP BY risk_level"
    )).fetchall()
    return {
        "by_status": {r[0]: r[1] for r in by_status},
        "open_by_level": {r[0]: r[1] for r in by_level},
    }

# ─────────────────────────────────────────────────────────────────────────────
# EVIDENCE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/evidence", tags=["Evidence"])
async def upload_evidence(req: EvidenceUpload, _ = Depends(_auth)):
    """
    Upload manual evidence for a control.

    Use this for controls that cannot be automatically verified —
    e.g., policy documents, training completion records, vendor attestations.
    Evidence is stored in the compliance database and included in reports.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    try:
        Framework(req.framework)
    except ValueError:
        raise HTTPException(400, f"Unknown framework: {req.framework}")
    ev_id = f"ev-{int(time.time())}-{req.control_id}"
    await e._db.execute(
        "INSERT OR REPLACE INTO evidence (id, control_id, framework, description, content, uploaded_at) "
        "VALUES (?,?,?,?,?,?)",
        (ev_id, req.control_id, req.framework, req.description, req.content, time.time())
    )
    await e._db.commit()
    return {
        "uploaded":    True,
        "evidence_id": ev_id,
        "control_id":  req.control_id,
        "framework":   req.framework,
    }

@app.get("/v1/evidence/{framework}/{control_id}", tags=["Evidence"])
async def get_evidence(framework: str, control_id: str, _ = Depends(_auth)):
    """List all evidence uploaded for a specific control."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    rows = await (await e._db.execute(
        "SELECT id, description, uploaded_at FROM evidence "
        "WHERE framework=? AND control_id=? ORDER BY uploaded_at DESC",
        (framework, control_id)
    )).fetchall()
    return {
        "evidence":   [{"id": r[0], "description": r[1], "uploaded_at": r[2]} for r in rows],
        "control_id": control_id,
        "framework":  framework,
    }

# ─────────────────────────────────────────────────────────────────────────────
# EXCLUSIONS (Control exceptions)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/v1/exclusions", tags=["Exclusions"])
async def add_exclusion(req: ExclusionReq, _ = Depends(_auth)):
    """
    Exclude a control from future assessments (with approval tracking).

    Use for controls that are formally accepted as exceptions or are
    compensated by alternative controls. All exclusions require a reason
    and approver name for audit trail purposes.
    """
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    ex_id = f"exc-{int(time.time())}-{req.control_id}"
    await e._db.execute(
        "INSERT OR REPLACE INTO exclusions (id, control_id, framework, reason, approved_by, created_at) "
        "VALUES (?,?,?,?,?,?)",
        (ex_id, req.control_id, req.framework, req.reason, req.approved_by, time.time())
    )
    await e._db.commit()
    return {"added": True, "exclusion_id": ex_id, "control_id": req.control_id}

@app.get("/v1/exclusions", tags=["Exclusions"])
async def list_exclusions(framework: Optional[str] = None, _ = Depends(_auth)):
    """List all active control exclusions."""
    _lic()
    e = _engine_ok()
    if not e._db:
        raise HTTPException(503)
    cond = "WHERE 1=1"; params: list = []
    if framework: cond += " AND framework=?"; params.append(framework)
    rows = await (await e._db.execute(
        f"SELECT id, control_id, framework, reason, approved_by, created_at "
        f"FROM exclusions {cond} ORDER BY created_at DESC", params
    )).fetchall()
    cols = ["id","control_id","framework","reason","approved_by","created_at"]
    return {"exclusions": [dict(zip(cols, r)) for r in rows], "total": len(rows)}


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_dashboard():
    import os
    html_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(html_path):
        with open(html_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard unavailable</h1>", status_code=500)
