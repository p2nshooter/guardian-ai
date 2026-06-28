# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Guardian Antivirus — Malware Scanner REST API v1.1

Endpoints:
  GET    /health                — Health + license status (no auth)
  POST   /v1/scan/file          — Scan uploaded file
  POST   /v1/scan/path          — Scan file by path
  POST   /v1/scan/directory     — Scan entire directory recursively
  POST   /v1/scan/stream        — Scan raw bytes stream
  POST   /v1/quarantine         — Quarantine a file
  DELETE /v1/quarantine/{sha256}— Delete quarantined file
  POST   /v1/quarantine/restore — Restore quarantined file
  GET    /v1/quarantine         — List quarantined files
  POST   /v1/learn/hash         — Submit malware hash for learning
  POST   /v1/learn/sample       — Upload malware sample file
  POST   /v1/learn/feed         — Submit threat intel feed
  GET    /v1/learn/stats        — Learning engine statistics
  WS     /ws/events             — Real-time scan events
"""
from __future__ import annotations
import asyncio, hashlib, json, logging, math, os, tempfile, time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional, Set

import yaml
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, Depends, Header, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .license import LicenseValidator, LicenseState, machine_id
from .scanner import AntivirusScanner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("antivirus.api")

CONFIG_PATH = os.environ.get("ANTIVIRUS_CONFIG", "/guardian/config/guardian.yml")

_config:    Dict                       = {}
_scanner:   Optional[AntivirusScanner] = None
_lic_state: LicenseState               = LicenseState()
_validator: Optional[LicenseValidator] = None
_ws_clients: Set[WebSocket]            = set()


def _load() -> Dict:
    try:
        return yaml.safe_load(open(CONFIG_PATH)) or {}
    except FileNotFoundError:
        return {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _config, _scanner, _lic_state, _validator

    _config    = _load()
    _validator = LicenseValidator(_config.get("guardian", {}))
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

    gcfg     = _config.get("guardian", {})
    data_dir = gcfg.get("data_dir", os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
    Path(data_dir).mkdir(parents=True, exist_ok=True)

    _scanner = AntivirusScanner(
        clamd_host   = gcfg.get("clamd_host",   os.environ.get("CLAMD_HOST",   "127.0.0.1")),
        clamd_port   = int(gcfg.get("clamd_port",   os.environ.get("CLAMD_PORT",   "3310"))),
        clamd_socket = gcfg.get("clamd_socket", os.environ.get("CLAMD_SOCKET", "/var/run/clamav/clamd.ctl")),
        data_dir     = data_dir,
    )
    await _scanner.init()

    asyncio.create_task(_heartbeat())
    log.info("AXTO Guardian Antivirus API ready (port %s)", os.environ.get("AV_PORT", "8097"))
    yield

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


def _lic():
    """
    Per-request license enforcement gate.
    MUST be the FIRST call inside every protected endpoint handler.
    """
    if _lic_state.grace_expired:
        raise HTTPException(503, detail={
            "error":    "license_expired",
            "message":  (
                "Your AXTO Guardian Antivirus license has expired. "
                "Service is suspended until renewal."
            ),
            "renew_at": "https://axto.io/renew",
            "support":  "support@axto.io",
        })


def _auth(x: Optional[str] = Header(None, alias="X-Antivirus-Key")):
    k = _config.get("guardian", {}).get("api_key", "")
    if k and x != k:
        raise HTTPException(401, detail="Invalid or missing X-Antivirus-Key header")


def _warn() -> dict:
    w = _lic_state.warning_message()
    return {"_license_warning": w} if w else {}


app = FastAPI(
    title="AXTO Guardian Antivirus",
    version="1.1.0",
    description=(
        "Self-hosted malware scanner — ClamAV signature engine "
        "augmented with AI behavioral analysis. Zero cloud uploads."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────────────────
class ScanPathReq(BaseModel):
    path: str
    deep: bool = True

class ScanDirReq(BaseModel):
    path: str
    recursive: bool = True
    max_size_mb: int = 100

class QuarantineReq(BaseModel):
    path: str
    threat_name: str = ""
    confidence: float = 0.9

class RestoreReq(BaseModel):
    sha256: str

class LearnHashReq(BaseModel):
    sha256: str
    filename: str = ""
    threat_name: str = ""
    threat_type: str = ""
    confidence: float = 0.9
    metadata: Optional[dict] = None

class LearnFeedReq(BaseModel):
    feed_type: str
    values: List[str]
    threat_type: str = ""
    severity: str = "medium"
    feed_name: str = ""


# ── Health — NO auth, NO _lic() — always responds ─────────────────────────────
@app.get("/health")
async def health():
    clam_ok = await _scanner.clamav.check() if _scanner else False
    stats   = await _scanner.learning.get_stats() if _scanner else {}
    resp = {
        "status":           "ok",
        "product":          "axto-guardian-antivirus",
        "version":          "1.1.0",
        "license":          _lic_state.to_api_dict(),
        "clamav_connected": clam_ok,
        "timestamp":        time.time(),
        **stats,
    }
    if _lic_state.grace_expired:
        resp["status"] = "license_expired"
    elif not _lic_state.valid and _lic_state.grace_start:
        resp["status"] = "grace_period"
    return resp


# ── Scan endpoints ─────────────────────────────────────────────────────────────
@app.post("/v1/scan/file")
async def scan_file_upload(
    file: UploadFile = File(...),
    _: None = Depends(_auth),
):
    _lic()
    content = await file.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(413, "File too large — max 500 MB")
    with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = await _scanner.scan_file(tmp_path)
        await _broadcast({"type": "scan", "file": file.filename, "result": result.to_dict()})
        return {"ok": True, "filename": file.filename, **result.to_dict(), **_warn()}
    finally:
        os.unlink(tmp_path)


@app.post("/v1/scan/path")
async def scan_file_path(req: ScanPathReq, _: None = Depends(_auth)):
    _lic()
    result = await _scanner.scan_file(req.path, req.deep)
    await _broadcast({"type": "scan", "file": req.path, "result": result.to_dict()})
    return {"ok": True, **result.to_dict(), **_warn()}


@app.post("/v1/scan/directory")
async def scan_directory(req: ScanDirReq, _: None = Depends(_auth)):
    _lic()
    results = await _scanner.scan_directory(req.path, req.recursive, req.max_size_mb)
    threats = [r for r in results if r.get("result", {}).get("verdict") in ("malicious", "suspicious")]
    await _broadcast({"type": "dir_scan", "path": req.path,
                      "total": len(results), "threats": len(threats)})
    return {
        "ok": True,
        "total_files": len(results),
        "threats_found": len(threats),
        "results": results,
        **_warn(),
    }


@app.post("/v1/scan/stream")
async def scan_stream(file: UploadFile = File(...), _: None = Depends(_auth)):
    _lic()
    content = await file.read()
    result  = await _scanner.clamav.scan_stream(content)
    return {"ok": True, **result.to_dict(), **_warn()}


# ── Quarantine endpoints ───────────────────────────────────────────────────────
@app.post("/v1/quarantine")
async def quarantine_file(req: QuarantineReq, _: None = Depends(_auth)):
    _lic()
    result = await _scanner.quarantine(req.path, req.threat_name, req.confidence)
    if result.get("ok"):
        await _broadcast({"type": "quarantine", **result})
    return {**result, **_warn()}


@app.delete("/v1/quarantine/{sha256}")
async def delete_quarantined(sha256: str, _: None = Depends(_auth)):
    _lic()
    return {**await _scanner.delete_quarantined(sha256), **_warn()}


@app.post("/v1/quarantine/restore")
async def restore_quarantined(req: RestoreReq, _: None = Depends(_auth)):
    _lic()
    return {**await _scanner.restore_quarantined(req.sha256), **_warn()}


@app.get("/v1/quarantine")
async def list_quarantined(_: None = Depends(_auth)):
    _lic()
    import aiosqlite
    gcfg    = _config.get("guardian", {})
    db_path = gcfg.get("db_path", "/guardian/data/antivirus.db")
    items   = []
    try:
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM quarantine WHERE deleted=0 ORDER BY quarantined_at DESC"
            ) as cur:
                async for row in cur:
                    items.append(dict(row))
    except Exception:
        pass
    return {"ok": True, "items": items, **_warn()}


# ── Learning endpoints ─────────────────────────────────────────────────────────
@app.post("/v1/learn/hash")
async def learn_hash(req: LearnHashReq, _: None = Depends(_auth)):
    _lic()
    ok = await _scanner.learning.submit_sample(
        req.sha256, req.filename, 0, req.threat_name,
        req.threat_type, "api", 0, req.confidence, req.metadata,
    )
    _scanner.hashes.add_learned(req.sha256)
    await _broadcast({"type": "learn", "sha256": req.sha256[:12], "threat": req.threat_name})
    return {"ok": ok, "sha256": req.sha256, **_warn()}


@app.post("/v1/learn/sample")
async def learn_sample(
    file: UploadFile = File(...),
    threat_name: str = "",
    threat_type: str = "",
    _: None = Depends(_auth),
):
    _lic()
    content = await file.read()
    sha256  = hashlib.sha256(content).hexdigest()
    entropy = 0.0
    if content:
        freq  = [0] * 256
        chunk = content[:65536]
        for b in chunk:
            freq[b] += 1
        total   = len(chunk)
        entropy = -sum((c / total) * math.log2(c / total) for c in freq if c > 0)
    await _scanner.learning.submit_sample(
        sha256, file.filename or "", len(content),
        threat_name, threat_type, "sample_upload", entropy, 0.95,
    )
    _scanner.hashes.add_learned(sha256)
    await _broadcast({"type": "learn_sample", "sha256": sha256[:12],
                      "filename": file.filename, "size": len(content)})
    return {
        "ok": True, "sha256": sha256, "size": len(content),
        "entropy": round(entropy, 2),
        "message": "Sample learned — future scans will detect this file",
        **_warn(),
    }


@app.post("/v1/learn/feed")
async def learn_feed(req: LearnFeedReq, _: None = Depends(_auth)):
    _lic()
    if req.feed_type not in ("hash", "ip", "domain", "url"):
        raise HTTPException(400, "feed_type must be: hash | ip | domain | url")
    count = 0
    for val in req.values:
        v = val.strip()
        if v:
            await _scanner.learning.add_threat_feed(
                req.feed_type, v, req.threat_type, req.severity, "api", req.feed_name,
            )
            count += 1
    return {"ok": True, "imported": count, "feed_type": req.feed_type, **_warn()}


@app.get("/v1/learn/stats")
async def learn_stats(_: None = Depends(_auth)):
    _lic()
    stats = await _scanner.learning.get_stats()
    stats["clamav_available"] = getattr(_scanner.clamav, "_available", False)
    stats["known_hashes"]     = len(_scanner.hashes._hashes)
    stats["learned_hashes"]   = len(_scanner.hashes._learned)
    return {"ok": True, **stats, **_warn()}


# ── WebSocket ──────────────────────────────────────────────────────────────────
@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "scan" and msg.get("path"):
                    result = await _scanner.scan_file(msg["path"])
                    await websocket.send_json({
                        "type": "scan_result",
                        "path": msg["path"],
                        "result": result.to_dict(),
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)


async def _broadcast(event: dict):
    dead = set()
    for ws in _ws_clients:
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    _ws_clients -= dead

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_dashboard():
    import os
    html_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(html_path):
        with open(html_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard unavailable</h1>", status_code=500)
