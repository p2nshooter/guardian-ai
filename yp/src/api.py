# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Yusron Power (YP) — unified API server.

One FastAPI app exposing every native capability as a REAL, working feature,
and — critically — wiring them together so they reinforce each other:

  • /ai/complete  → gateway meters the call + rate-limits it, redaction runs
                    before any provider call, and a redaction spike raises a
                    SOC signal; provider failures raise a SOC signal too.
  • /security/scan→ real scanner; a malicious verdict raises a SOC malware
                    signal and persists a finding.
  • /soc/ingest   → correlation engine turns raw events into alerts.
  • /compliance/evaluate → folds YP's OWN runtime truth (redaction active,
                    audit trail populated, SOC monitoring, asset inventory)
                    into the control evaluation, so the report reflects reality.
  • /ot/assets    → real classification + risk scoring; high risk raises a SOC
                    signal.
  • /status       → one aggregate view of the whole interconnected system.

All gated behind a single YP license. All state on the client's own machine.
"""
from __future__ import annotations
import json
import time
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from src import __version__
from src.config import get_config
from src.license import LicenseManager
from src.scheduler import ProviderScheduler
from src.database import YPDatabase
from src.redaction import redact, reinject, redact_messages
from src import legal as legal_mod
from src import security as sec_mod
from src import compliance as comp_mod
from src import ot as ot_mod
from src.soc import SOCEngine
from src.gateway import Gateway
from src.guide import GUIDE_MD

log = structlog.get_logger("yp.api")

STATE: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_config()
    STATE["cfg"] = cfg

    db = YPDatabase(cfg.data_dir)
    await db.connect()
    STATE["db"] = db

    lic = LicenseManager(cfg.license_key, cfg.license_validate_url, cfg.data_dir)
    STATE["license"] = lic
    st = await lic.validate()
    if not st.lifetime:
        await lic.start_heartbeat()
    log.info("yp_license", mode="lifetime" if st.lifetime else "networked",
             operational=st.is_operational(), reason=st.reason)

    STATE["scheduler"] = ProviderScheduler(cfg.ai_providers, cfg.routing_strategy)
    STATE["soc"] = SOCEngine(db)
    STATE["gateway"] = Gateway(cfg.gateway_rate_per_minute)

    # BYO threat intel: fold client-supplied bad hashes into the scanner set.
    for h in (cfg.bad_hashes or []):
        sec_mod.add_bad_hash(h)

    # Optional periodic SOC correlation sweep (catches slow-burn patterns even
    # without fresh ingest). Off unless soc_sweep_interval_s > 0.
    STATE["_sweep_task"] = None
    if cfg.soc_sweep_interval_s and cfg.soc_sweep_interval_s > 0:
        import asyncio
        async def _sweep_loop():
            while True:
                await asyncio.sleep(cfg.soc_sweep_interval_s)
                try:
                    await STATE["soc"].sweep()
                except Exception as e:
                    log.warning("soc_sweep_failed", error=str(e))
        STATE["_sweep_task"] = asyncio.create_task(_sweep_loop())

    await db.log_event("core", "startup",
                       summary=f"YP {__version__} up; providers={len(cfg.ai_providers)}")
    yield

    if STATE.get("_sweep_task"):
        STATE["_sweep_task"].cancel()
    if STATE.get("scheduler"):
        await STATE["scheduler"].close()
    if STATE.get("license"):
        await STATE["license"].close()
    if STATE.get("db"):
        await STATE["db"].close()


app = FastAPI(title="Yusron Power", version=__version__, lifespan=lifespan)


def _require_operational():
    lic: LicenseManager = STATE.get("license")
    if not lic or not lic.state.is_operational():
        raise HTTPException(status_code=402, detail={
            "error": "license_not_operational",
            "license": lic.state.to_api_dict() if lic else None,
            "hint": "Yusron Power is invite-only. Contact hello@axto.io."})


def _client_key(req: Request) -> str:
    return req.headers.get("X-YP-Key") or "default"


# ── Models ───────────────────────────────────────────────────────────────────
class CompleteReq(BaseModel):
    messages: list
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    redact: Optional[bool] = None


class RedactReq(BaseModel):
    text: str


class LegalResearchReq(BaseModel):
    prompt_key: str
    text: str
    jurisdiction: Optional[str] = None
    model: Optional[str] = None


class ScanReq(BaseModel):
    content: str                       # text/base64 content to scan
    target: Optional[str] = None
    is_base64: Optional[bool] = False


class SocIngestReq(BaseModel):
    module: str
    kind: str
    source: Optional[str] = ""
    severity: Optional[str] = "info"
    summary: Optional[str] = ""
    meta: Optional[dict] = None


class ComplianceReq(BaseModel):
    framework: str
    facts: Optional[dict] = None


class AssetReq(BaseModel):
    name: str
    ip: Optional[str] = ""
    asset_type: Optional[str] = "unknown"
    protocol: Optional[str] = None
    port: Optional[int] = None
    vendor: Optional[str] = ""
    exposed: Optional[bool] = False
    authenticated: Optional[bool] = False


# ── Health / guide (never gated) ─────────────────────────────────────────────
@app.get("/health")
async def health():
    lic: LicenseManager = STATE.get("license")
    cfg = STATE.get("cfg")
    return {
        "product": "yp", "name": "Yusron Power", "version": __version__, "status": "ok",
        "license": lic.state.to_api_dict() if lic else None,
        "modules": {
            "provider_scaling": True, "privacy": True, "security": cfg.enable_security,
            "gateway": cfg.enable_gateway, "soc": cfg.enable_soc,
            "compliance": cfg.enable_compliance, "ot": cfg.enable_ot, "legal": cfg.enable_legal,
        },
        "providers_configured": len(cfg.ai_providers or []),
        "gpu_endpoints_configured": len(cfg.gpu_endpoints or []),
    }


@app.get("/guide")
async def guide():
    return PlainTextResponse(GUIDE_MD, media_type="text/markdown")


@app.get("/")
async def root():
    return {"product": "Yusron Power", "version": __version__, "guide": "/guide", "health": "/health"}


# ── AI provider-scaling (metered + rate-limited + SOC-wired) ─────────────────
@app.post("/ai/complete")
async def ai_complete(req: CompleteReq, request: Request):
    _require_operational()
    cfg = STATE["cfg"]; sch = STATE["scheduler"]; db = STATE["db"]
    gw = STATE["gateway"]; soc = STATE["soc"]
    key_id = _client_key(request)

    allowed, info = gw.check(key_id)
    if not allowed:
        raise HTTPException(status_code=429, detail={"error": "rate_limited", **info})

    do_redact = cfg.redact_before_forward if req.redact is None else req.redact
    mapping: dict = {}
    messages = req.messages
    if do_redact:
        messages, mapping = redact_messages(req.messages)

    t0 = time.time()
    result = await sch.complete(messages, model=req.model,
                                temperature=req.temperature, max_tokens=req.max_tokens)
    latency = time.time() - t0

    if result.get("ok") and mapping:
        result["content"] = reinject(result.get("content", ""), mapping)

    gw.record_usage(key_id, redactions=len(mapping))
    await db.log_job(provider=result.get("provider", ""), model=result.get("model", ""),
                     latency_s=latency, ok=bool(result.get("ok")), redactions=len(mapping))

    # Interconnection: a big redaction burst is a data-exposure signal for SOC.
    if len(mapping) >= cfg.high_redaction_threshold:
        await soc.ingest("privacy", "high_redaction", source=key_id, severity="warning",
                         summary=f"{len(mapping)} sensitive values redacted in one call",
                         meta={"count": len(mapping)})
    # A provider failure is an operational signal for SOC.
    if not result.get("ok"):
        await soc.ingest("scheduler", "provider_error", source=result.get("provider", ""),
                         severity="warning", summary=result.get("error", "provider failed"))
        raise HTTPException(status_code=502, detail=result)

    result["redactions_applied"] = len(mapping)
    result["gateway"] = info
    return result


@app.get("/ai/providers")
async def ai_providers():
    _require_operational()
    return {"strategy": STATE["cfg"].routing_strategy, "providers": STATE["scheduler"].stats()}


# ── Privacy ──────────────────────────────────────────────────────────────────
@app.post("/privacy/redact")
async def privacy_redact(req: RedactReq):
    _require_operational()
    r = redact(req.text)
    return {"original": req.text, "redacted": r.redacted,
            "replacements": r.mapping, "redaction_count": r.count}


# ── Security / Antivirus (real scanner, SOC-wired) ───────────────────────────
@app.post("/security/scan")
async def security_scan(req: ScanReq):
    _require_operational()
    db = STATE["db"]; soc = STATE["soc"]
    import base64 as _b64
    if req.is_base64:
        try:
            data = _b64.b64decode(req.content)
        except Exception:
            raise HTTPException(status_code=400, detail={"error": "invalid_base64"})
        res = sec_mod.scan_bytes(data, target=req.target or "<b64>")
    else:
        res = sec_mod.scan_text(req.content, target=req.target or "<text>")

    await db.add_finding(res.target, res.verdict, res.score,
                         json.dumps(res.signatures), res.sha256, res.quarantined)
    alerts = []
    if res.verdict == sec_mod.VERDICT_MALICIOUS:
        out = await soc.ingest("security", "malware_detected", source=res.target,
                               severity="critical",
                               summary=f"malicious content: {', '.join(res.signatures)}",
                               meta={"sha256": res.sha256, "score": res.score})
        alerts = out.get("alerts_raised", [])
    return {"finding": res.to_dict(), "alerts_raised": alerts}


@app.get("/security/eicar-test")
async def security_eicar_test():
    """Scan the industry-standard EICAR test artifact to prove the scanner works."""
    _require_operational()
    res = sec_mod.scan_bytes(sec_mod.make_eicar_test_bytes(), target="<eicar-test>")
    return {"note": "EICAR is a harmless industry-standard AV test file.",
            "detected": res.verdict == sec_mod.VERDICT_MALICIOUS, "finding": res.to_dict()}


@app.get("/security/findings")
async def security_findings(limit: int = 100, verdict: Optional[str] = None):
    _require_operational()
    return {"findings": await STATE["db"].recent_findings(limit=limit, verdict=verdict)}


# ── SOC (correlation engine) ─────────────────────────────────────────────────
@app.post("/soc/ingest")
async def soc_ingest(req: SocIngestReq):
    _require_operational()
    out = await STATE["soc"].ingest(req.module, req.kind, source=req.source or "",
                                    severity=req.severity or "info",
                                    summary=req.summary or "", meta=req.meta)
    return out


@app.get("/soc/alerts")
async def soc_alerts(limit: int = 100, status: Optional[str] = None):
    _require_operational()
    return {"alerts": await STATE["db"].recent_alerts(limit=limit, status=status)}


@app.post("/soc/alerts/{alert_id}/{action}")
async def soc_alert_action(alert_id: str, action: str):
    _require_operational()
    if action not in ("acknowledge", "close", "reopen"):
        raise HTTPException(status_code=400, detail={"error": "bad_action"})
    new_status = {"acknowledge": "acknowledged", "close": "closed", "reopen": "open"}[action]
    ok = await STATE["db"].set_alert_status(alert_id, new_status)
    if not ok:
        raise HTTPException(status_code=404, detail={"error": "alert_not_found"})
    return {"ok": True, "alert_id": alert_id, "status": new_status}


@app.get("/soc/events")
async def soc_events(limit: int = 100, module: Optional[str] = None):
    _require_operational()
    return {"events": await STATE["db"].recent_events(limit=limit, module=module)}


@app.get("/soc/rules")
async def soc_rules():
    _require_operational()
    return {"rules": STATE["soc"].rules()}


# ── Compliance (real controls engine, evidence-backed) ───────────────────────
async def _runtime_evidence() -> dict:
    db = STATE["db"]; cfg = STATE["cfg"]
    job = await db.job_summary()
    events = await db.recent_events(limit=1)
    assets = await db.list_assets(limit=1)
    return {
        "redaction_active": bool(cfg.redact_before_forward),
        "audit_events": job.get("total_jobs", 0) + (1 if events else 0),
        "soc_active": bool(cfg.enable_soc),
        "assets_inventoried": 1 if assets else 0,
    }


@app.get("/compliance/frameworks")
async def compliance_frameworks():
    _require_operational()
    return {"frameworks": comp_mod.list_frameworks()}


@app.post("/compliance/evaluate")
async def compliance_evaluate(req: ComplianceReq):
    _require_operational()
    ev = await _runtime_evidence()
    report = comp_mod.evaluate(req.framework, req.facts or {}, runtime_evidence=ev)
    if "error" in report:
        raise HTTPException(status_code=400, detail=report)
    await STATE["db"].log_event("compliance", "evaluation",
                                summary=f"{report['framework']} → {report['compliance_pct']}%")
    report["evidence_used"] = ev
    return report


# ── OT / IoT (real asset inventory, SOC-wired) ───────────────────────────────
@app.post("/ot/assets")
async def ot_add_asset(req: AssetReq):
    _require_operational()
    db = STATE["db"]; soc = STATE["soc"]
    c = ot_mod.classify(req.name, req.ip or "", req.asset_type or "unknown",
                        req.protocol, req.port, req.vendor or "",
                        bool(req.exposed), bool(req.authenticated))
    aid = await db.add_asset(c["name"], c["ip"], c["asset_type"], c["protocol"],
                             c["vendor"], c["risk_score"], c["exposed"],
                             meta_json=json.dumps({"role": c["role"], "band": c["risk_band"]}))
    if c["risk_score"] >= 80:
        await soc.ingest("ot", "high_risk_asset", source=c["ip"], severity="high",
                         summary=f"{c['name']} ({c['protocol_label']}) risk={c['risk_score']}",
                         meta={"asset_id": aid})
    return {"asset_id": aid, "classification": c}


@app.get("/ot/assets")
async def ot_list_assets(limit: int = 500):
    _require_operational()
    assets = await STATE["db"].list_assets(limit=limit)
    return {"count": len(assets), "protocols": list(ot_mod.PROTOCOLS.keys()), "assets": assets}


# ── Legal intelligence ───────────────────────────────────────────────────────
@app.get("/legal/sources")
async def legal_sources(jurisdiction: Optional[str] = None, kind: Optional[str] = None):
    _require_operational()
    return {"jurisdictions": legal_mod.jurisdictions(),
            "prompts": list(legal_mod.PROMPTS.keys()),
            "disclaimer": legal_mod.DISCLAIMER,
            "sources": legal_mod.sources_for(jurisdiction, kind)}


@app.post("/legal/research")
async def legal_research(req: LegalResearchReq):
    _require_operational()
    prompt = legal_mod.PROMPTS.get(req.prompt_key)
    if not prompt:
        raise HTTPException(status_code=400, detail={
            "error": "unknown_prompt_key", "available": list(legal_mod.PROMPTS.keys())})
    sch = STATE["scheduler"]; db = STATE["db"]
    messages = [
        {"role": "system", "content": prompt + "\n\n" + legal_mod.DISCLAIMER},
        {"role": "user", "content":
            (f"Jurisdiction: {req.jurisdiction}\n\n" if req.jurisdiction else "") + req.text},
    ]
    red_msgs, mapping = redact_messages(messages)
    result = await sch.complete(red_msgs, model=req.model)
    if result.get("ok") and mapping:
        result["content"] = reinject(result.get("content", ""), mapping)
    await db.log_event("legal", "research", summary=f"prompt={req.prompt_key}")
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result)
    result["disclaimer"] = legal_mod.DISCLAIMER
    return result


# ── Unified status — the interconnected dashboard ────────────────────────────
@app.get("/status")
async def status():
    _require_operational()
    db = STATE["db"]; cfg = STATE["cfg"]
    jobs = await db.job_summary()
    open_alerts = await db.recent_alerts(limit=1000, status="open")
    mal = await db.recent_findings(limit=1000, verdict="malicious")
    assets = await db.list_assets(limit=1000)
    high_risk = [a for a in assets if a.get("risk_score", 0) >= 60]
    return {
        "product": "Yusron Power", "version": __version__,
        "license": STATE["license"].state.to_api_dict(),
        "ai": {"strategy": cfg.routing_strategy, "providers": STATE["scheduler"].stats(),
               **jobs},
        "gateway": {"keys": STATE["gateway"].usage()},
        "security": {"malicious_findings": len(mal)},
        "soc": {"open_alerts": len(open_alerts),
                "alerts_preview": open_alerts[:5]},
        "ot": {"assets": len(assets), "high_risk": len(high_risk)},
    }
