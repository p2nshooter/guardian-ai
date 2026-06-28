# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO AI Studio — FastAPI Server
Self-hosted AI workspace. All data stays on client's server.
Supports 14+ AI providers via client's own API keys.

Endpoints:
  GET  /                      → Dashboard UI
  GET  /health                → Health + license status
  GET  /api/status            → Full stats
  POST /api/credentials       → Manage API keys {action: add|remove|list|verify}
  GET  /api/models            → Model catalog
  POST /api/chat              → Single chat completion
  WS   /ws/chat               → Streaming chat (WebSocket)
  POST /api/sessions          → Manage sessions {action: create|list|get|update|delete|pin}
  POST /api/prompts           → Manage prompt library {action: add|list|use|delete|favorite}
  POST /api/batch             → Batch processing {action: create|status|list|cancel}
  POST /api/compare           → Multi-model comparison
  GET  /api/usage             → Usage analytics
  GET  /api/providers         → Provider info + model catalog
"""
from __future__ import annotations
import asyncio, json, logging, os, time
from contextlib import asynccontextmanager

import yaml
from . import crypto
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from . import license as lic
from . import database as db
from . import core

log = logging.getLogger("ai_studio.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")

CONFIG_PATH = os.environ.get("AI_STUDIO_CONFIG", "/ai-studio/config/ai-studio.yml")
DASHBOARD_HTML = os.path.join(os.path.dirname(__file__), "dashboard.html")
ACTIVATION_HTML = os.path.join(os.path.dirname(__file__), "activation.html")

def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f) or {}
    return {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = load_config()
    key = cfg.get("ai_studio", {}).get("license_key", os.environ.get("AI_STUDIO_LICENSE_KEY", ""))
    await db.init_db()
    if key:
        state = await lic.validate_license(key)
        if state.valid:
            log.info(f"🧠 AI Studio ready — Plan: {state.plan}")
            asyncio.create_task(lic.heartbeat_loop(key))
        else:
            log.warning(f"⚠ License invalid: {state.error}")
    else:
        log.warning("⚠ No license key. Set ai_studio.license_key in ai-studio.yml")
    asyncio.create_task(_cleanup_loop())
    yield

async def _cleanup_loop():
    while True:
        await asyncio.sleep(6 * 3600)
        try:
            await db.cleanup_expired()
        except Exception as e:
            log.error(f"Cleanup error: {e}")

app = FastAPI(title="AXTO AI Studio", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def _check_license():
    if not lic.is_valid():
        raise HTTPException(403, "License invalid or expired. Visit axto.io/portal to renew.")

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    state = lic.get_state()
    if not state.valid:
        if os.path.exists(ACTIVATION_HTML):
            with open(ACTIVATION_HTML, encoding="utf-8") as f:
                return HTMLResponse(f.read())
        return HTMLResponse(_activation_fallback())
    if os.path.exists(DASHBOARD_HTML):
        with open(DASHBOARD_HTML, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard file missing</h1>", 500)

def _activation_fallback() -> str:
    return """<!DOCTYPE html><html><head><title>AXTO AI Studio — Activation</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#04080f;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}</style></head>
<body><div style="text-align:center;padding:32px"><h1 style="font-size:28px;margin-bottom:12px">🧠 AXTO AI Studio</h1>
<p style="color:#64748b;margin-bottom:24px">License activation required</p>
<p style="color:#64748b;font-size:14px">Set <code style="background:rgba(255,255,255,.1);padding:2px 8px;border-radius:4px">license_key</code> in ai-studio.yml and restart.</p>
<a href="https://axto.io" style="color:#818cf8">Get license →</a></div></body></html>"""

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    state = lic.get_state()
    return {
        "status": "healthy" if lic.is_valid() else "degraded",
        "product": "ai-studio", "version": "2.0.0",
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at},
        "uptime": int(time.time()),
    }

# ─────────────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def status():
    _check_license()
    state = lic.get_state()
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("""
            SELECT
              (SELECT COUNT(*) FROM credentials WHERE is_active=1) as creds,
              (SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')) as sessions,
              (SELECT COUNT(*) FROM prompts) as prompts,
              (SELECT COUNT(*) FROM batch_jobs WHERE status='running') as batches_running,
              (SELECT COUNT(*) FROM batch_jobs WHERE status='done' AND updated_at >= date('now','-7 days')) as batches_done,
              (SELECT COALESCE(SUM(cost_usd),0) FROM usage_log WHERE created_at >= date('now')) as cost_today,
              (SELECT COALESCE(SUM(cost_usd),0) FROM usage_log WHERE created_at >= date('now','start of month')) as cost_month,
              (SELECT COUNT(*) FROM usage_log WHERE created_at >= date('now')) as req_today,
              (SELECT COUNT(*) FROM usage_log WHERE created_at >= date('now','start of month')) as req_month
        """)
        r = dict(zip(["creds","sessions","prompts","batches_running","batches_done","cost_today","cost_month","req_today","req_month"], rows[0])) if rows else {}
    finally:
        await conn.close()
    return {
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at},
        "counts": {"credentials": r.get("creds", 0), "sessions": r.get("sessions", 0), "prompts": r.get("prompts", 0)},
        "batches": {"running": r.get("batches_running", 0), "done_week": r.get("batches_done", 0)},
        "usage": {
            "today":  {"requests": r.get("req_today", 0),  "cost": round(r.get("cost_today", 0), 6)},
            "month":  {"requests": r.get("req_month", 0),  "cost": round(r.get("cost_month", 0), 6)},
        },
    }

# ─────────────────────────────────────────────────────────────────────────────
# PROVIDERS & MODELS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/providers")
async def get_providers():
    return {"providers": core.PROVIDER_INFO, "models": core.MODEL_CATALOG}

# ─────────────────────────────────────────────────────────────────────────────
# CREDENTIALS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/credentials")
async def credentials(request: Request):
    _check_license()
    body = await request.json()
    action = body.get("action", "")
    conn = await db.get_db()
    try:
        if action == "add":
            provider = body.get("provider", "")
            api_key  = body.get("api_key", "")
            label    = body.get("label", "") or provider
            endpoint = body.get("endpoint", "")
            if not provider:
                raise HTTPException(400, "provider required")
            cred_id = core.new_id()
            enc = crypto.encrypt_credential({"api_key": api_key, "endpoint": endpoint})
            await conn.execute(
                "INSERT INTO credentials (id,provider,label,endpoint,api_key_enc,is_active,is_verified,created_at,updated_at) VALUES (?,?,?,?,?,1,0,datetime('now'),datetime('now'))",
                [cred_id, provider, label, endpoint, enc])
            await conn.commit()
            # Verify key
            verified = False
            needs_key = core.PROVIDER_INFO.get(provider, {}).get("requires_key", True)
            if needs_key and api_key:
                try:
                    verified = await core.verify_key(provider, api_key, endpoint)
                except Exception:
                    pass
            elif not needs_key:
                verified = True  # Ollama/local — just mark verified
            if verified:
                await conn.execute("UPDATE credentials SET is_verified=1 WHERE id=?", [cred_id])
                await conn.commit()
            return {"ok": True, "id": cred_id, "verified": verified}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,provider,label,endpoint,is_active,is_verified,total_req,total_tokens,total_cost,last_used,created_at FROM credentials ORDER BY created_at DESC")
            cols = ["id","provider","label","endpoint","is_active","is_verified","total_req","total_tokens","total_cost","last_used","created_at"]
            return {"credentials": [dict(zip(cols, r)) for r in rows]}

        elif action == "remove":
            cid = body.get("id", "")
            await conn.execute("DELETE FROM credentials WHERE id=?", [cid])
            await conn.commit()
            return {"ok": True}

        elif action == "verify":
            cid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint FROM credentials WHERE id=?", [cid])
            if not rows:
                raise HTTPException(404, "Credential not found")
            provider, enc, endpoint = rows[0]
            creds = crypto.decrypt_credential(enc)
            verified = await core.verify_key(provider, creds.get("api_key", ""), creds.get("endpoint", "") or endpoint)
            await conn.execute("UPDATE credentials SET is_verified=? WHERE id=?", [1 if verified else 0, cid])
            await conn.commit()
            return {"ok": True, "verified": verified}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: Request):
    _check_license()
    body = await request.json()
    cred_id  = body.get("credential_id", "")
    model    = body.get("model", "")
    messages = body.get("messages", [])
    settings = body.get("settings", {})
    session_id = body.get("session_id")

    if not messages:
        raise HTTPException(400, "messages required")

    conn = await db.get_db()
    try:
        if cred_id:
            rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint FROM credentials WHERE id=?", [cred_id])
            if not rows:
                raise HTTPException(404, "Credential not found")
            provider, enc, ep_url_db = rows[0]
            creds = crypto.decrypt_credential(enc)
            ep_url = creds.get("endpoint", "") or ep_url_db or ""
        else:
            provider = body.get("provider", "")
            creds = {"api_key": body.get("api_key", ""), "endpoint": body.get("endpoint", "")}
        if not provider:
            raise HTTPException(400, "credential_id or provider required")
    finally:
        await conn.close()

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
        u = result.get("usage", {})
        await conn.execute(
            "INSERT INTO usage_log (id,session_id,credential_id,provider,model,input_tokens,output_tokens,latency_ms,cost_usd,status,error_msg,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))",
            [core.new_id(), session_id, cred_id, provider, model or result.get("model",""),
             u.get("input_tokens",0), u.get("output_tokens",0),
             result.get("latency_ms",0), result.get("cost",0),
             "error" if result.get("error") else "success", result.get("error","")],
        )
        if cred_id:
            await conn.execute(
                "UPDATE credentials SET total_req=total_req+1, total_tokens=total_tokens+?, total_cost=total_cost+?, last_used=datetime('now'), updated_at=datetime('now') WHERE id=?",
                [u.get("input_tokens",0)+u.get("output_tokens",0), result.get("cost",0), cred_id],
            )
        await conn.commit()
        # Update session
        if session_id and not result.get("error"):
            await conn.execute(
                "UPDATE sessions SET total_tokens=total_tokens+?, total_cost=total_cost+?, updated_at=datetime('now') WHERE id=?",
                [u.get("input_tokens",0)+u.get("output_tokens",0), result.get("cost",0), session_id],
            )
            await conn.commit()
    finally:
        await conn.close()

    if result.get("error"):
        return JSONResponse({"error": result["error"], "latency_ms": result.get("latency_ms",0)}, 502)
    return result

# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET STREAMING CHAT
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket):
    await ws.accept()
    if not lic.is_valid():
        await ws.send_json({"type": "error", "error": "License invalid or expired."})
        await ws.close()
        return
    try:
        while True:
            data = await ws.receive_json()
            cred_id  = data.get("credential_id", "")
            model    = data.get("model", "")
            messages = data.get("messages", [])
            settings = data.get("settings", {})

            if not messages:
                await ws.send_json({"type": "error", "error": "messages required"})
                continue

            conn = await db.get_db()
            try:
                if cred_id:
                    rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint FROM credentials WHERE id=?", [cred_id])
                    if not rows:
                        await ws.send_json({"type": "error", "error": "Credential not found"})
                        continue
                    provider, enc, ep_url_db = rows[0]
                    creds = crypto.decrypt_credential(enc)
                    ep_url = creds.get("endpoint", "") or ep_url_db or ""
                else:
                    provider = data.get("provider", "")
                    creds = {"api_key": data.get("api_key",""), "endpoint": data.get("endpoint","")}
            finally:
                await conn.close()

            await ws.send_json({"type": "start"})
            result = await core.chat_completion(
                provider=provider, api_key=creds.get("api_key",""),
                model=model, messages=messages,
                temperature=settings.get("temperature", 0.7),
                max_tokens=settings.get("max_tokens", 4096),
                endpoint=creds.get("endpoint",""),
            )
            if result.get("error"):
                await ws.send_json({"type": "error", "error": result["error"]})
            else:
                await ws.send_json({"type": "done", **result})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass

# ─────────────────────────────────────────────────────────────────────────────
# SESSIONS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/sessions")
async def sessions(request: Request):
    _check_license()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "create":
            sid = core.new_id()
            await conn.execute(
                "INSERT INTO sessions (id,title,credential_id,provider,model,system_prompt,messages,temperature,max_tokens,folder,tags,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'),datetime('now','+30 days'))",
                [sid, body.get("title","New Chat"), body.get("credential_id",""), body.get("provider",""), body.get("model",""),
                 body.get("system_prompt",""), "[]", body.get("temperature",0.7), body.get("max_tokens",4096),
                 body.get("folder",""), json.dumps(body.get("tags",[]))])
            await conn.commit()
            return {"ok": True, "id": sid}

        elif action == "list":
            folder = body.get("folder", "")
            q = "SELECT id,title,provider,model,total_tokens,total_cost,is_pinned,folder,tags,created_at,updated_at FROM sessions WHERE expires_at > datetime('now')"
            params = []
            if folder:
                q += " AND folder=?"; params.append(folder)
            q += " ORDER BY is_pinned DESC, updated_at DESC LIMIT 100"
            rows = await conn.execute_fetchall(q, params)
            cols = ["id","title","provider","model","total_tokens","total_cost","is_pinned","folder","tags","created_at","updated_at"]
            return {"sessions": [dict(zip(cols, r)) for r in rows]}

        elif action == "get":
            sid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT * FROM sessions WHERE id=?", [sid])
            if not rows:
                raise HTTPException(404, "Session not found")
            cols = [d[1] for d in await (await conn.execute("PRAGMA table_info(sessions)")).fetchall()]
            return dict(zip(cols, rows[0]))

        elif action == "update":
            sid = body.get("id", "")
            fields = {k: v for k, v in body.items() if k in ("title","messages","system_prompt","model","provider","credential_id","temperature","max_tokens","folder","tags","is_pinned","total_tokens","total_cost")}
            if not fields:
                return {"ok": True}
            set_clause = ", ".join(f"{k}=?" for k in fields)
            await conn.execute(f"UPDATE sessions SET {set_clause}, updated_at=datetime('now') WHERE id=?", list(fields.values()) + [sid])
            await conn.commit()
            return {"ok": True}

        elif action == "delete":
            sid = body.get("id", "")
            await conn.execute("DELETE FROM sessions WHERE id=?", [sid])
            await conn.commit()
            return {"ok": True}

        elif action == "pin":
            sid  = body.get("id", "")
            pinned = body.get("pinned", True)
            await conn.execute("UPDATE sessions SET is_pinned=? WHERE id=?", [1 if pinned else 0, sid])
            await conn.commit()
            return {"ok": True}

        elif action == "folders":
            rows = await conn.execute_fetchall("SELECT DISTINCT folder FROM sessions WHERE folder != '' ORDER BY folder")
            return {"folders": [r[0] for r in rows]}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# PROMPT LIBRARY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/prompts")
async def prompts(request: Request):
    _check_license()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "add":
            pid = core.new_id()
            await conn.execute(
                "INSERT INTO prompts (id,title,content,category,tags,created_at,updated_at) VALUES (?,?,?,?,?,datetime('now'),datetime('now'))",
                [pid, body.get("title",""), body.get("content",""), body.get("category","general"), json.dumps(body.get("tags",[]))])
            await conn.commit()
            return {"ok": True, "id": pid}

        elif action == "list":
            cat = body.get("category", "")
            q = "SELECT id,title,category,tags,use_count,is_favorite,created_at FROM prompts"
            params = []
            if cat:
                q += " WHERE category=?"; params.append(cat)
            q += " ORDER BY is_favorite DESC, use_count DESC, updated_at DESC"
            rows = await conn.execute_fetchall(q, params)
            cols = ["id","title","category","tags","use_count","is_favorite","created_at"]
            return {"prompts": [dict(zip(cols, r)) for r in rows]}

        elif action == "get":
            pid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT * FROM prompts WHERE id=?", [pid])
            if not rows:
                raise HTTPException(404, "Prompt not found")
            # Increment use count then re-fetch for accurate count
            await conn.execute("UPDATE prompts SET use_count=use_count+1, updated_at=datetime('now') WHERE id=?", [pid])
            await conn.commit()
            rows = await conn.execute_fetchall("SELECT * FROM prompts WHERE id=?", [pid])
            cols = ["id","title","content","category","tags","use_count","is_favorite","created_at","updated_at"]
            return dict(zip(cols, rows[0]))

        elif action == "favorite":
            pid = body.get("id", "")
            fav = body.get("favorite", True)
            await conn.execute("UPDATE prompts SET is_favorite=? WHERE id=?", [1 if fav else 0, pid])
            await conn.commit()
            return {"ok": True}

        elif action == "delete":
            pid = body.get("id", "")
            await conn.execute("DELETE FROM prompts WHERE id=?", [pid])
            await conn.commit()
            return {"ok": True}

        elif action == "categories":
            rows = await conn.execute_fetchall("SELECT DISTINCT category FROM prompts ORDER BY category")
            return {"categories": [r[0] for r in rows]}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# BATCH PROCESSING
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/batch")
async def batch(request: Request):
    _check_license()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "create":
            inputs = body.get("inputs", [])
            if not inputs:
                raise HTTPException(400, "inputs required")
            cred_id  = body.get("credential_id", "")
            provider = body.get("provider", "")
            if cred_id:
                rows = await conn.execute_fetchall("SELECT provider FROM credentials WHERE id=?", [cred_id])
                if rows:
                    provider = rows[0][0]
            bid = core.new_id()
            await conn.execute(
                "INSERT INTO batch_jobs (id,title,credential_id,provider,model,system_prompt,inputs,results,status,total_items,done_items,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
                [bid, body.get("title","Batch Job"), cred_id, provider,
                 body.get("model",""), body.get("system_prompt",""),
                 json.dumps(inputs), json.dumps([]), "pending", len(inputs), 0])
            await conn.commit()
            # Start background job
            asyncio.create_task(_run_batch(bid))
            return {"ok": True, "id": bid, "total": len(inputs)}

        elif action == "status":
            bid = body.get("id", "")
            rows = await conn.execute_fetchall(
                "SELECT id,title,provider,model,status,total_items,done_items,total_tokens,total_cost,error_msg,created_at,updated_at,completed_at FROM batch_jobs WHERE id=?", [bid])
            if not rows:
                raise HTTPException(404, "Batch job not found")
            cols = ["id","title","provider","model","status","total_items","done_items","total_tokens","total_cost","error_msg","created_at","updated_at","completed_at"]
            return dict(zip(cols, rows[0]))

        elif action == "results":
            bid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT results FROM batch_jobs WHERE id=?", [bid])
            if not rows:
                raise HTTPException(404, "Batch job not found")
            return {"results": json.loads(rows[0][0])}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,title,provider,model,status,total_items,done_items,total_cost,created_at,updated_at FROM batch_jobs ORDER BY created_at DESC LIMIT 50")
            cols = ["id","title","provider","model","status","total_items","done_items","total_cost","created_at","updated_at"]
            return {"jobs": [dict(zip(cols, r)) for r in rows]}

        elif action == "cancel":
            bid = body.get("id", "")
            await conn.execute("UPDATE batch_jobs SET status='cancelled', updated_at=datetime('now') WHERE id=? AND status IN ('pending','running')", [bid])
            await conn.commit()
            return {"ok": True}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

async def _run_batch(bid: str):
    """Background task to run batch job."""
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall(
            "SELECT credential_id, provider, model, system_prompt, inputs FROM batch_jobs WHERE id=?", [bid])
        if not rows:
            return
        cred_id, provider, model, sys_prompt, inputs_json = rows[0]
        inputs = json.loads(inputs_json)

        # Get credentials
        api_key = ""
        endpoint = ""
        if cred_id:
            cred_rows = await conn.execute_fetchall("SELECT api_key_enc FROM credentials WHERE id=?", [cred_id])
            if cred_rows:
                creds = crypto.decrypt_credential(cred_rows[0][0])
                api_key  = creds.get("api_key", "")
                endpoint = creds.get("endpoint", "")

        await conn.execute("UPDATE batch_jobs SET status='running', updated_at=datetime('now') WHERE id=?", [bid])
        await conn.commit()

        results = []
        total_tokens = 0
        total_cost   = 0.0

        for i, inp in enumerate(inputs):
            # Check if cancelled
            check = await conn.execute_fetchall("SELECT status FROM batch_jobs WHERE id=?", [bid])
            if check and check[0][0] == "cancelled":
                return

            text = inp if isinstance(inp, str) else inp.get("prompt", str(inp))
            messages = []
            if sys_prompt:
                messages.append({"role": "system", "content": sys_prompt})
            messages.append({"role": "user", "content": text})

            result = await core.chat_completion(
                provider=provider, api_key=api_key, model=model,
                messages=messages, endpoint=endpoint,
            )

            u = result.get("usage", {})
            total_tokens += u.get("input_tokens", 0) + u.get("output_tokens", 0)
            total_cost   += result.get("cost", 0)

            results.append({
                "index": i,
                "input": text,
                "output": result.get("content", ""),
                "error": result.get("error", ""),
                "tokens": u.get("input_tokens", 0) + u.get("output_tokens", 0),
                "cost": result.get("cost", 0),
                "latency_ms": result.get("latency_ms", 0),
            })

            await conn.execute(
                "UPDATE batch_jobs SET done_items=?, results=?, total_tokens=?, total_cost=?, updated_at=datetime('now') WHERE id=?",
                [i + 1, json.dumps(results), total_tokens, total_cost, bid])
            await conn.commit()
            await asyncio.sleep(0.1)  # Small delay to avoid rate limits

        await conn.execute(
            "UPDATE batch_jobs SET status='done', done_items=?, results=?, total_tokens=?, total_cost=?, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?",
            [len(inputs), json.dumps(results), total_tokens, total_cost, bid])
        await conn.commit()
    except Exception as e:
        log.error(f"Batch {bid} error: {e}")
        try:
            await conn.execute("UPDATE batch_jobs SET status='failed', error_msg=?, updated_at=datetime('now') WHERE id=?", [str(e), bid])
            await conn.commit()
        except Exception:
            pass
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# MODEL COMPARE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/compare")
async def compare(request: Request):
    _check_license()
    body    = await request.json()
    prompt  = body.get("prompt", "")
    sys_p   = body.get("system_prompt", "")
    targets = body.get("targets", [])  # [{credential_id, model, label}]

    if not prompt or not targets:
        raise HTTPException(400, "prompt and targets required")
    if len(targets) > 6:
        raise HTTPException(400, "Max 6 models for comparison")

    conn = await db.get_db()
    try:
        # Gather all credentials
        tasks = []
        for t in targets:
            cid = t.get("credential_id", "")
            if cid:
                rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint FROM credentials WHERE id=?", [cid])
                if rows:
                    provider, enc, ep_url_db = rows[0]
                    creds = crypto.decrypt_credential(enc)
                    ep_url = creds.get("endpoint", "") or ep_url_db or ""
                    t["_provider"] = provider
                    t["_api_key"]  = creds.get("api_key","")
                    t["_endpoint"] = creds.get("endpoint","")
    finally:
        await conn.close()

    messages = []
    if sys_p:
        messages.append({"role": "system", "content": sys_p})
    messages.append({"role": "user", "content": prompt})

    # Run all in parallel
    async def run_one(t: dict):
        result = await core.chat_completion(
            provider=t.get("_provider",""),
            api_key=t.get("_api_key",""),
            model=t.get("model",""),
            messages=messages,
            endpoint=t.get("_endpoint",""),
        )
        return {
            "label":      t.get("label", f"{t.get('_provider','')} / {t.get('model','')}"),
            "provider":   t.get("_provider",""),
            "model":      t.get("model",""),
            "content":    result.get("content",""),
            "error":      result.get("error",""),
            "latency_ms": result.get("latency_ms",0),
            "cost":       result.get("cost",0),
            "usage":      result.get("usage",{}),
        }

    results = await asyncio.gather(*[run_one(t) for t in targets], return_exceptions=True)
    cleaned = []
    for r in results:
        if isinstance(r, Exception):
            cleaned.append({"error": str(r)})
        else:
            cleaned.append(r)

    # Save to DB
    conn = await db.get_db()
    try:
        cid = core.new_id()
        await conn.execute(
            "INSERT INTO compare_runs (id,prompt,system_prompt,results,created_at,expires_at) VALUES (?,?,?,?,datetime('now'),datetime('now','+30 days'))",
            [cid, prompt, sys_p, json.dumps(cleaned)])
        await conn.commit()
    finally:
        await conn.close()

    return {"id": core.new_id(), "results": cleaned}

# ─────────────────────────────────────────────────────────────────────────────
# USAGE ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/usage")
async def usage():
    _check_license()
    conn = await db.get_db()
    try:
        today = await conn.execute_fetchall(
            "SELECT provider, model, COUNT(*) as req, SUM(input_tokens+output_tokens) as tokens, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now') AND status='success' GROUP BY provider, model ORDER BY cost DESC")
        month = await conn.execute_fetchall(
            "SELECT provider, model, COUNT(*) as req, SUM(input_tokens+output_tokens) as tokens, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now','start of month') AND status='success' GROUP BY provider, model ORDER BY cost DESC")
        daily = await conn.execute_fetchall(
            "SELECT date(created_at) as day, COUNT(*) as req, SUM(cost_usd) as cost, SUM(input_tokens+output_tokens) as tokens FROM usage_log WHERE created_at >= date('now','-30 days') AND status='success' GROUP BY day ORDER BY day")
        errors = await conn.execute_fetchall(
            "SELECT provider, COUNT(*) as n FROM usage_log WHERE status='error' AND created_at >= date('now','-7 days') GROUP BY provider ORDER BY n DESC")
    finally:
        await conn.close()

    def to_dict(rows, cols):
        return [dict(zip(cols, r)) for r in rows]

    return {
        "today":    to_dict(today,  ["provider","model","requests","tokens","cost"]),
        "month":    to_dict(month,  ["provider","model","requests","tokens","cost"]),
        "daily_30d":to_dict(daily,  ["day","requests","cost","tokens"]),
        "errors_7d":to_dict(errors, ["provider","count"]),
    }
