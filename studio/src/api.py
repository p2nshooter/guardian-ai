# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Studio Engine — API Server
Self-hosted on client's server. All data stays local.
License-enforced: validates against axto.io/api/license-validate every 30 min.

Endpoints:
  GET  /health          — Health check
  GET  /                — Studio dashboard (embedded HTML)
  GET  /api/status      — License + usage stats
  POST /api/credentials — CRUD AI/GPU credentials
  POST /api/chat        — AI chat completion (routes to client's provider)
  POST /api/sessions    — CRUD sessions
  GET  /api/usage       — Usage analytics
  WS   /ws/chat         — WebSocket streaming chat
"""
from __future__ import annotations
import asyncio, json, logging, os, time, uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import yaml
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from . import license as lic
from . import database as db
from . import core

log = logging.getLogger("studio.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")

# ── Config ────────────────────────────────────────────────────────────────────
CONFIG_PATH = os.environ.get("STUDIO_CONFIG", "/studio/config/studio.yml")


def load_config() -> dict:
    """Load studio.yml config file."""
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f) or {}
    return {}


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = load_config()
    studio_cfg = cfg.get("studio", {})
    license_key = studio_cfg.get("license_key", os.environ.get("STUDIO_LICENSE_KEY", ""))

    # Initialize database
    await db.init_db()

    # Validate license
    if license_key:
        state = await lic.validate_license(license_key)
        if state.valid:
            log.info(f"🧠 AXTO Studio Engine started — Plan: {state.plan} — License: {license_key[:12]}...")
            # Start heartbeat
            asyncio.create_task(lic.heartbeat_loop(license_key))
        else:
            log.error(f"❌ License invalid: {state.error}")
    else:
        log.warning("⚠️  No license key configured. Set license_key in studio.yml or STUDIO_LICENSE_KEY env var.")

    # Start daily cleanup scheduler
    asyncio.create_task(_cleanup_loop())

    yield


async def _cleanup_loop():
    """Run cleanup every 6 hours."""
    while True:
        await asyncio.sleep(6 * 3600)
        try:
            await db.cleanup_expired()
        except Exception as e:
            log.error(f"Cleanup error: {e}")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AXTO Studio Engine",
    description="Self-Hosted AI & GPU Pool Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_license():
    """Check license validity. Raises 403 if invalid."""
    if not lic.is_valid():
        raise HTTPException(status_code=403, detail="License invalid or expired. Visit axto.io/portal to renew.")


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    state = lic.get_state()
    return {
        "status": "healthy" if lic.is_valid() else "degraded",
        "product": "studio",
        "version": "1.0.0",
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at},
        "uptime": int(time.time()),
    }


# ═══════════════════════════════════════════════════════════════════════════
# STATUS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/status")
async def status():
    require_license()
    state = lic.get_state()
    conn = await db.get_db()
    try:
        cred_count = await conn.execute_fetchall("SELECT COUNT(*) as n FROM credentials")
        sess_count = await conn.execute_fetchall("SELECT COUNT(*) as n FROM sessions WHERE expires_at > datetime('now')")
        art_count = await conn.execute_fetchall("SELECT COUNT(*) as n FROM artifacts WHERE expires_at > datetime('now')")
        gpu_count = await conn.execute_fetchall("SELECT COUNT(*) as n FROM gpu_instances")
        usage_today = await conn.execute_fetchall(
            "SELECT COUNT(*) as requests, COALESCE(SUM(cost_usd),0) as cost FROM usage_log WHERE created_at >= date('now')"
        )
        usage_month = await conn.execute_fetchall(
            "SELECT COUNT(*) as requests, COALESCE(SUM(cost_usd),0) as cost FROM usage_log WHERE created_at >= date('now','start of month')"
        )
    finally:
        await conn.close()

    return {
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at, "machine_bound": state.machine_bound},
        "counts": {
            "credentials": cred_count[0][0] if cred_count else 0,
            "sessions": sess_count[0][0] if sess_count else 0,
            "artifacts": art_count[0][0] if art_count else 0,
            "gpu_instances": gpu_count[0][0] if gpu_count else 0,
        },
        "usage": {
            "today": {"requests": usage_today[0][0] if usage_today else 0, "cost": usage_today[0][1] if usage_today else 0},
            "month": {"requests": usage_month[0][0] if usage_month else 0, "cost": usage_month[0][1] if usage_month else 0},
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# CREDENTIALS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/credentials")
async def manage_credentials(request: Request):
    require_license()
    body = await request.json()
    action = body.get("action", "")
    conn = await db.get_db()

    try:
        if action == "add":
            provider = body.get("provider", "")
            api_key = body.get("api_key", "")
            category = body.get("category", "ai")
            label = body.get("label", provider)
            endpoint = body.get("endpoint", "")
            if not provider or not api_key:
                raise HTTPException(400, "provider and api_key required")

            cred_id = core.new_id()
            creds = json.dumps({"api_key": api_key, "endpoint": endpoint})
            await conn.execute(
                "INSERT INTO credentials (id, provider, category, label, credentials_enc, is_active, is_verified, created_at, updated_at) VALUES (?,?,?,?,?,1,0,datetime('now'),datetime('now'))",
                [cred_id, provider, category, label, creds],
            )
            await conn.commit()

            # Verify key
            verified = False
            try:
                if provider == "openai":
                    import httpx
                    async with httpx.AsyncClient(timeout=10) as c:
                        r = await c.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}"})
                        verified = r.is_success
                elif provider == "anthropic":
                    import httpx
                    async with httpx.AsyncClient(timeout=10) as c:
                        r = await c.post("https://api.anthropic.com/v1/messages",
                            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                            json={"model": "claude-3-5-haiku-20241022", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]})
                        verified = r.is_success
                else:
                    verified = True  # Can't verify all providers
            except Exception:
                pass

            if verified:
                await conn.execute("UPDATE credentials SET is_verified = 1 WHERE id = ?", [cred_id])
                await conn.commit()

            return {"ok": True, "id": cred_id, "verified": verified}

        elif action == "remove":
            cred_id = body.get("credential_id", "")
            await conn.execute("DELETE FROM credentials WHERE id = ?", [cred_id])
            await conn.commit()
            return {"ok": True}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id, provider, category, label, is_active, is_verified, total_requests, total_tokens, total_cost_usd, last_used, created_at FROM credentials ORDER BY category, provider"
            )
            return {"credentials": [dict(zip(["id","provider","category","label","is_active","is_verified","total_requests","total_tokens","total_cost_usd","last_used","created_at"], r)) for r in rows]}

        else:
            raise HTTPException(400, "Unknown action")
    finally:
        await conn.close()


# ═══════════════════════════════════════════════════════════════════════════
# CHAT (AI Studio)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    require_license()
    body = await request.json()
    credential_id = body.get("credential_id", "")
    model = body.get("model", "")
    messages = body.get("messages", [])
    settings = body.get("settings", {})
    session_id = body.get("session_id", "")

    if not credential_id or not messages:
        raise HTTPException(400, "credential_id and messages required")

    conn = await db.get_db()
    try:
        row = await conn.execute_fetchall("SELECT provider, credentials_enc FROM credentials WHERE id = ?", [credential_id])
        if not row:
            raise HTTPException(404, "Credential not found")
        provider = row[0][0]
        creds = json.loads(row[0][1])
    finally:
        await conn.close()

    # Route to provider
    result = await core.chat_completion(
        provider=provider,
        api_key=creds.get("api_key", ""),
        model=model,
        messages=messages,
        temperature=settings.get("temperature", 0.7),
        max_tokens=settings.get("max_tokens", 4096),
        endpoint=creds.get("endpoint", ""),
    )

    # Log usage
    conn = await db.get_db()
    try:
        usage = result.get("usage", {})
        await conn.execute(
            "INSERT INTO usage_log (id, session_id, studio_type, provider, model, input_tokens, output_tokens, latency_ms, cost_usd, status, error_msg, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))",
            [core.new_id(), session_id, "ai", provider, model or result.get("model", ""),
             usage.get("input_tokens", 0), usage.get("output_tokens", 0),
             result.get("latency_ms", 0), result.get("cost", 0),
             "error" if result.get("error") else "success", result.get("error", "")],
        )
        # Update credential stats
        await conn.execute(
            "UPDATE credentials SET total_requests = total_requests + 1, total_tokens = total_tokens + ?, total_cost_usd = total_cost_usd + ?, last_used = datetime('now') WHERE id = ?",
            [usage.get("input_tokens", 0) + usage.get("output_tokens", 0), result.get("cost", 0), credential_id],
        )
        await conn.commit()
    finally:
        await conn.close()

    if result.get("error"):
        return JSONResponse({"error": result["error"], "latency_ms": result.get("latency_ms", 0)}, status_code=502)

    return result


# ═══════════════════════════════════════════════════════════════════════════
# SESSIONS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/sessions")
async def manage_sessions(request: Request):
    require_license()
    body = await request.json()
    action = body.get("action", "")
    conn = await db.get_db()
    try:
        if action == "create":
            sid = core.new_id()
            await conn.execute(
                "INSERT INTO sessions (id, studio_type, title, provider, model, system_prompt, created_at, updated_at, expires_at) VALUES (?,?,?,?,?,?,datetime('now'),datetime('now'),datetime('now','+14 days'))",
                [sid, body.get("studio_type", "ai"), body.get("title", "Untitled"), body.get("provider", ""), body.get("model", ""), body.get("system_prompt", "")],
            )
            await conn.commit()
            return {"ok": True, "id": sid}
        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id, studio_type, title, provider, model, total_tokens, total_cost_usd, is_pinned, created_at, updated_at, expires_at FROM sessions WHERE expires_at > datetime('now') ORDER BY updated_at DESC LIMIT 50"
            )
            cols = ["id","studio_type","title","provider","model","total_tokens","total_cost_usd","is_pinned","created_at","updated_at","expires_at"]
            return {"sessions": [dict(zip(cols, r)) for r in rows]}
        elif action == "delete":
            sid = body.get("session_id", "")
            await conn.execute("DELETE FROM sessions WHERE id = ?", [sid])
            await conn.execute("DELETE FROM artifacts WHERE session_id = ?", [sid])
            await conn.commit()
            return {"ok": True}
        else:
            raise HTTPException(400, "Unknown action")
    finally:
        await conn.close()


# ═══════════════════════════════════════════════════════════════════════════
# GPU INSTANCES
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/gpu")
async def manage_gpu(request: Request):
    require_license()
    body = await request.json()
    action = body.get("action", "")
    conn = await db.get_db()
    try:
        if action == "health_check":
            instance_id = body.get("instance_id", "")
            rows = await conn.execute_fetchall("SELECT endpoint_url, credential_id FROM gpu_instances WHERE id = ?", [instance_id])
            if not rows:
                raise HTTPException(404, "GPU instance not found")
            endpoint_url = rows[0][0]
            cred_id = rows[0][1]
            api_key = ""
            if cred_id:
                cred_rows = await conn.execute_fetchall("SELECT credentials_enc FROM credentials WHERE id = ?", [cred_id])
                if cred_rows:
                    creds = json.loads(cred_rows[0][0])
                    api_key = creds.get("api_key", "")
            health = await core.check_gpu_health(endpoint_url, api_key)
            await conn.execute("UPDATE gpu_instances SET status = ?, last_health = datetime('now') WHERE id = ?", [health["status"], instance_id])
            await conn.commit()
            return health
        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id, instance_name, provider, gpu_type, gpu_count, vram_gb, endpoint_url, status, deployed_model, last_health FROM gpu_instances ORDER BY created_at DESC"
            )
            cols = ["id","instance_name","provider","gpu_type","gpu_count","vram_gb","endpoint_url","status","deployed_model","last_health"]
            return {"instances": [dict(zip(cols, r)) for r in rows]}
        else:
            raise HTTPException(400, "Unknown action")
    finally:
        await conn.close()


# ═══════════════════════════════════════════════════════════════════════════
# USAGE ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/usage")
async def usage_analytics():
    require_license()
    conn = await db.get_db()
    try:
        today = await conn.execute_fetchall(
            "SELECT provider, model, COUNT(*) as requests, SUM(input_tokens+output_tokens) as tokens, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now') GROUP BY provider, model ORDER BY cost DESC"
        )
        month = await conn.execute_fetchall(
            "SELECT provider, model, COUNT(*) as requests, SUM(input_tokens+output_tokens) as tokens, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now','start of month') GROUP BY provider, model ORDER BY cost DESC"
        )
        daily = await conn.execute_fetchall(
            "SELECT date(created_at) as day, COUNT(*) as requests, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now','-30 days') GROUP BY day ORDER BY day"
        )
    finally:
        await conn.close()

    return {
        "today": [dict(zip(["provider","model","requests","tokens","cost"], r)) for r in today],
        "month": [dict(zip(["provider","model","requests","tokens","cost"], r)) for r in month],
        "daily_30d": [dict(zip(["day","requests","cost"], r)) for r in daily],
    }


# ═══════════════════════════════════════════════════════════════════════════
# WEBSOCKET STREAMING CHAT
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    if not lic.is_valid():
        await websocket.send_json({"error": "License invalid"})
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_json()
            credential_id = data.get("credential_id", "")
            model = data.get("model", "")
            messages = data.get("messages", [])
            settings = data.get("settings", {})

            if not credential_id or not messages:
                await websocket.send_json({"error": "credential_id and messages required"})
                continue

            conn = await db.get_db()
            try:
                row = await conn.execute_fetchall("SELECT provider, credentials_enc FROM credentials WHERE id = ?", [credential_id])
                if not row:
                    await websocket.send_json({"error": "Credential not found"})
                    continue
                provider = row[0][0]
                creds = json.loads(row[0][1])
            finally:
                await conn.close()

            result = await core.chat_completion(
                provider=provider, api_key=creds.get("api_key", ""),
                model=model, messages=messages,
                temperature=settings.get("temperature", 0.7),
                max_tokens=settings.get("max_tokens", 4096),
                endpoint=creds.get("endpoint", ""),
            )
            await websocket.send_json(result)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════
# EMBEDDED DASHBOARD (served as HTML)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Main dashboard — serves enterprise portal HTML."""
    state = lic.get_state()
    if not state.valid:
        return HTMLResponse(_activation_html(), status_code=200)
    # Serve the enterprise dashboard HTML file
    html_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(html_path):
        with open(html_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard file missing</h1>", status_code=500)


def _activation_html() -> str:
    """License activation page."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AXTO Studio — Activation</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060914;color:#f1f5f9;font-family:'Inter',-apple-system,sans-serif;
     display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.wrap{max-width:480px;width:100%;text-align:center}
.icon{width:80px;height:80px;background:linear-gradient(135deg,#7c3aed,#6366f1);
      border-radius:22px;display:flex;align-items:center;justify-content:center;
      font-size:38px;margin:0 auto 28px;box-shadow:0 8px 32px rgba(124,58,237,.4)}
h1{font-size:30px;font-weight:900;letter-spacing:-1px;margin-bottom:8px}
h1 span{background:linear-gradient(135deg,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#64748b;font-size:14px;line-height:1.7;margin-bottom:36px}
.box{background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);
     border-radius:18px;padding:28px;text-align:left}
.box-title{font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:16px;text-transform:uppercase;letter-spacing:.5px}
.step{display:flex;gap:14px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(124,58,237,.1)}
.step:last-child{border-bottom:none;padding-bottom:0}
.step-num{width:24px;height:24px;border-radius:50%;background:rgba(124,58,237,.2);
           border:1px solid rgba(124,58,237,.4);display:flex;align-items:center;
           justify-content:center;font-size:11px;font-weight:800;color:#a78bfa;flex-shrink:0;margin-top:2px}
.step-text{font-size:13px;color:#94a3b8;line-height:1.6}
code{background:rgba(124,58,237,.12);padding:2px 7px;border-radius:5px;font-size:12px;color:#c4b5fd;font-family:monospace}
.cta{display:inline-block;margin-top:28px;padding:12px 28px;
     background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;
     border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;
     box-shadow:0 4px 20px rgba(124,58,237,.4)}
</style>
</head>
<body>
<div class="wrap">
  <div class="icon">🧠</div>
  <h1>AXTO <span>Studio</span></h1>
  <p class="sub">Self-Hosted AI &amp; GPU Pool Platform<br>License activation required to continue</p>
  <div class="box">
    <div class="box-title">How to Activate</div>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text">Purchase a Studio license at <a href="https://axto.io/register?pkg=studio_starter" style="color:#a78bfa">axto.io</a> — Starter, Pro, or Enterprise</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text">Edit <code>studio.yml</code> and set <code>license_key: YOUR_LEGL_LICENSE_KEY</code></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text">Restart the container: <code>docker compose restart</code></div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-text">Reload this page — your full enterprise dashboard will appear</div>
    </div>
  </div>
  <a href="https://axto.io/register?pkg=studio_starter" class="cta">Get Studio License →</a>
</div>
</body>
</html>"""
