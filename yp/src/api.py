# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Yusron Power (YP) — unified API server.

One FastAPI app exposing every native capability: AI provider-scaling, the
privacy layer, legal intelligence, and status surfaces for the security / SOC /
compliance / OT / gateway modules — all gated behind a single YP license.
"""
from __future__ import annotations
import json
import time
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

from src import __version__
from src.config import get_config
from src.license import LicenseManager
from src.scheduler import ProviderScheduler
from src.database import YPDatabase
from src.redaction import redact, reinject, redact_messages
from src import legal as legal_mod
from src.guide import GUIDE_MD

log = structlog.get_logger("yp.api")

# ── Shared runtime state ─────────────────────────────────────────────────────
STATE: dict = {"license": None, "scheduler": None, "db": None, "cfg": None}


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
    if st.lifetime:
        log.info("yp_license", mode="lifetime_disconnected", operational=True)
    else:
        log.info("yp_license", valid=st.valid, reason=st.reason,
                 operational=st.is_operational())
        await lic.start_heartbeat()

    STATE["scheduler"] = ProviderScheduler(cfg.ai_providers, cfg.routing_strategy)

    await db.log_event("core", "startup",
                       summary=f"YP {__version__} started; providers={len(cfg.ai_providers)}")
    yield

    sch = STATE.get("scheduler")
    if sch:
        await sch.close()
    if STATE.get("license"):
        await STATE["license"].close()
    if STATE.get("db"):
        await STATE["db"].close()


app = FastAPI(title="Yusron Power", version=__version__, lifespan=lifespan)


# ── License gate ─────────────────────────────────────────────────────────────
def _require_operational():
    lic: LicenseManager = STATE.get("license")
    if not lic or not lic.state.is_operational():
        raise HTTPException(
            status_code=402,
            detail={"error": "license_not_operational",
                    "license": lic.state.to_api_dict() if lic else None,
                    "hint": "Yusron Power is invite-only. Contact hallo@axto.io."},
        )


# ── Models ───────────────────────────────────────────────────────────────────
class CompleteReq(BaseModel):
    messages: list
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    redact: Optional[bool] = None       # override cfg.redact_before_forward


class RedactReq(BaseModel):
    text: str


class LegalResearchReq(BaseModel):
    prompt_key: str
    text: str
    jurisdiction: Optional[str] = None
    model: Optional[str] = None


# ── Health / status (no license gate — must always answer) ───────────────────
@app.get("/health")
async def health():
    lic: LicenseManager = STATE.get("license")
    cfg = STATE.get("cfg")
    return {
        "product": "yp",
        "name": "Yusron Power",
        "version": __version__,
        "status": "ok",
        "license": lic.state.to_api_dict() if lic else None,
        "modules": {
            "security":   getattr(cfg, "enable_security", False),
            "privacy":    getattr(cfg, "enable_privacy", False),
            "gateway":    getattr(cfg, "enable_gateway", False),
            "soc":        getattr(cfg, "enable_soc", False),
            "compliance": getattr(cfg, "enable_compliance", False),
            "ot":         getattr(cfg, "enable_ot", False),
            "legal":      getattr(cfg, "enable_legal", False),
            "provider_scaling": True,
        },
        "providers_configured": len(getattr(cfg, "ai_providers", []) or []),
        "gpu_endpoints_configured": len(getattr(cfg, "gpu_endpoints", []) or []),
    }


@app.get("/guide")
async def guide():
    return PlainTextResponse(GUIDE_MD, media_type="text/markdown")


# ── AI provider-scaling ──────────────────────────────────────────────────────
@app.post("/ai/complete")
async def ai_complete(req: CompleteReq):
    _require_operational()
    cfg = STATE["cfg"]
    sch: ProviderScheduler = STATE["scheduler"]
    db: YPDatabase = STATE["db"]

    do_redact = cfg.redact_before_forward if req.redact is None else req.redact
    mapping: dict = {}
    messages = req.messages
    if do_redact:
        messages, mapping = redact_messages(req.messages)

    t0 = time.time()
    result = await sch.complete(
        messages, model=req.model,
        temperature=req.temperature, max_tokens=req.max_tokens,
    )
    latency = time.time() - t0

    if result.get("ok") and mapping:
        result["content"] = reinject(result.get("content", ""), mapping)

    await db.log_job(
        provider=result.get("provider", ""), model=result.get("model", ""),
        latency_s=latency, ok=bool(result.get("ok")), redactions=len(mapping),
    )
    await db.log_event(
        "scheduler", "ai_complete",
        summary=f"provider={result.get('provider')} ok={result.get('ok')} redactions={len(mapping)}",
        severity="info" if result.get("ok") else "warning",
    )
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result)
    result["redactions_applied"] = len(mapping)
    return result


@app.get("/ai/providers")
async def ai_providers():
    _require_operational()
    sch: ProviderScheduler = STATE["scheduler"]
    return {"strategy": STATE["cfg"].routing_strategy, "providers": sch.stats()}


# ── Privacy layer ────────────────────────────────────────────────────────────
@app.post("/privacy/redact")
async def privacy_redact(req: RedactReq):
    _require_operational()
    r = redact(req.text)
    return {"original": req.text, "redacted": r.redacted,
            "replacements": r.mapping, "redaction_count": r.count}


# ── Legal intelligence ───────────────────────────────────────────────────────
@app.get("/legal/sources")
async def legal_sources(jurisdiction: Optional[str] = None, kind: Optional[str] = None):
    _require_operational()
    return {
        "jurisdictions": legal_mod.jurisdictions(),
        "prompts": list(legal_mod.PROMPTS.keys()),
        "disclaimer": legal_mod.DISCLAIMER,
        "sources": legal_mod.sources_for(jurisdiction, kind),
    }


@app.post("/legal/research")
async def legal_research(req: LegalResearchReq):
    _require_operational()
    prompt = legal_mod.PROMPTS.get(req.prompt_key)
    if not prompt:
        raise HTTPException(status_code=400, detail={
            "error": "unknown_prompt_key", "available": list(legal_mod.PROMPTS.keys())})
    sch: ProviderScheduler = STATE["scheduler"]
    db: YPDatabase = STATE["db"]
    messages = [
        {"role": "system", "content": prompt + "\n\n" + legal_mod.DISCLAIMER},
        {"role": "user", "content":
            (f"Jurisdiction: {req.jurisdiction}\n\n" if req.jurisdiction else "") + req.text},
    ]
    # Redact before sending to any provider.
    red_msgs, mapping = redact_messages(messages)
    result = await sch.complete(red_msgs, model=req.model)
    if result.get("ok") and mapping:
        result["content"] = reinject(result.get("content", ""), mapping)
    await db.log_event("legal", "research",
                       summary=f"prompt={req.prompt_key} provider={result.get('provider')}")
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result)
    result["disclaimer"] = legal_mod.DISCLAIMER
    return result


# ── Module status surfaces (unified local audit-backed) ──────────────────────
@app.get("/security/status")
async def security_status():
    _require_operational()
    cfg = STATE["cfg"]
    return {"module": "security", "enabled": cfg.enable_security,
            "posture": "monitoring", "detail": "Endpoint & AV threat monitoring active (BYO scan targets)."}


@app.get("/soc/events")
async def soc_events(limit: int = 100):
    _require_operational()
    db: YPDatabase = STATE["db"]
    return {"module": "soc", "events": await db.recent_events(limit=limit)}


@app.get("/compliance/frameworks")
async def compliance_frameworks():
    _require_operational()
    return {"module": "compliance", "frameworks": [
        {"id": "gdpr", "name": "GDPR"}, {"id": "hipaa", "name": "HIPAA"},
        {"id": "soc2", "name": "SOC 2"}, {"id": "iso27001", "name": "ISO 27001"},
        {"id": "pci_dss", "name": "PCI-DSS"}, {"id": "fedramp", "name": "FedRAMP"},
    ]}


@app.get("/ot/assets")
async def ot_assets():
    _require_operational()
    cfg = STATE["cfg"]
    return {"module": "ot", "enabled": cfg.enable_ot, "assets": [],
            "detail": "OT/IoT passive asset discovery — configure network ranges in yp.yml."}


@app.get("/gateway/usage")
async def gateway_usage():
    _require_operational()
    db: YPDatabase = STATE["db"]
    return {"module": "gateway", "usage": await db.job_summary()}


@app.get("/db/events")
async def db_events(limit: int = 100, module: Optional[str] = None):
    _require_operational()
    db: YPDatabase = STATE["db"]
    return {"events": await db.recent_events(limit=limit, module=module)}


@app.get("/")
async def root():
    return {"product": "Yusron Power", "version": __version__,
            "guide": "/guide", "health": "/health"}
