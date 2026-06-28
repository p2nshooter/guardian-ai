# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO GPU Studio — FastAPI Server
Self-hosted creative AI workspace. All data stays on client's server.

Endpoints:
  GET  /                → Dashboard UI
  GET  /health          → Health + license status
  GET  /api/status      → Full stats
  POST /api/endpoints   → Manage GPU endpoints {action: add|list|remove|verify}
  GET  /api/providers   → Provider + model catalog
  POST /api/generate    → Single generation job
  POST /api/jobs        → Job management {action: get|list|delete|favorite|tag}
  POST /api/batch       → Batch generation
  POST /api/gallery     → Gallery {action: list|delete|favorite|tag|folders}
  POST /api/presets     → Style presets {action: add|list|use|delete}
  GET  /api/usage       → Usage analytics
  WS   /ws/generate     → WebSocket generation with progress
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

log = logging.getLogger("gpu_studio.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")

CONFIG_PATH     = os.environ.get("GPU_STUDIO_CONFIG", "/gpu-studio/config/gpu-studio.yml")
DASHBOARD_HTML  = os.path.join(os.path.dirname(__file__), "dashboard.html")
ACTIVATION_HTML = os.path.join(os.path.dirname(__file__), "activation.html")

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f) or {}
    return {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = load_config()
    key = cfg.get("gpu_studio", {}).get("license_key", os.environ.get("GPU_STUDIO_LICENSE_KEY", ""))
    await db.init_db()
    if key:
        state = await lic.validate_license(key)
        if state.valid:
            log.info(f"🎨 GPU Studio ready — Plan: {state.plan}")
            asyncio.create_task(lic.heartbeat_loop(key))
        else:
            log.warning(f"⚠ License invalid: {state.error}")
    else:
        log.warning("⚠ No license key. Set gpu_studio.license_key in gpu-studio.yml")
    asyncio.create_task(_cleanup_loop())
    yield

async def _cleanup_loop():
    while True:
        await asyncio.sleep(6 * 3600)
        try:
            await db.cleanup_expired()
        except Exception as e:
            log.error(f"Cleanup error: {e}")

app = FastAPI(title="AXTO GPU Studio", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def _chk():
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
        return HTMLResponse("<h1>GPU Studio — License Required</h1>", 200)
    if os.path.exists(DASHBOARD_HTML):
        with open(DASHBOARD_HTML, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard file missing</h1>", 500)

@app.get("/health")
async def health():
    state = lic.get_state()
    return {"status": "healthy" if lic.is_valid() else "degraded",
            "product": "gpu-studio", "version": "2.0.0",
            "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at}}

# ─────────────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def status():
    _chk()
    state = lic.get_state()
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("""
            SELECT
              (SELECT COUNT(*) FROM endpoints WHERE is_active=1) as endpoints,
              (SELECT COUNT(*) FROM jobs WHERE expires_at > datetime('now')) as jobs,
              (SELECT COUNT(*) FROM gallery WHERE expires_at > datetime('now')) as gallery,
              (SELECT COUNT(*) FROM presets) as presets,
              (SELECT COALESCE(SUM(cost_usd),0) FROM usage_log WHERE created_at >= date('now')) as cost_today,
              (SELECT COALESCE(SUM(cost_usd),0) FROM usage_log WHERE created_at >= date('now','start of month')) as cost_month,
              (SELECT COUNT(*) FROM usage_log WHERE created_at >= date('now') AND status='success') as gen_today
        """)
        r = dict(zip(["endpoints","jobs","gallery","presets","cost_today","cost_month","gen_today"], rows[0])) if rows else {}
    finally:
        await conn.close()
    return {
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at},
        "counts": {"endpoints": r.get("endpoints",0), "jobs": r.get("jobs",0), "gallery": r.get("gallery",0), "presets": r.get("presets",0)},
        "usage": {
            "today": {"generations": r.get("gen_today",0), "cost": round(r.get("cost_today",0), 6)},
            "month": {"cost": round(r.get("cost_month",0), 6)},
        },
    }

@app.get("/api/providers")
async def get_providers():
    return {"providers": core.PROVIDER_INFO, "models": core.MODEL_CATALOG}

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/endpoints")
async def endpoints(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "add":
            provider     = body.get("provider", "")
            label        = body.get("label", "") or provider
            endpoint_url = body.get("endpoint_url", "")
            api_key      = body.get("api_key", "")
            gpu_type     = body.get("gpu_type", "")
            vram_gb      = body.get("vram_gb", 0)
            if not provider:
                raise HTTPException(400, "provider required")
            eid = core.new_id()
            enc = crypto.encrypt_credential({"api_key": api_key, "endpoint_url": endpoint_url})
            await conn.execute(
                "INSERT INTO endpoints (id,label,provider,endpoint_url,api_key_enc,gpu_type,vram_gb,is_active,is_verified,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,0,'unknown',datetime('now'),datetime('now'))",
                [eid, label, provider, endpoint_url, enc, gpu_type, vram_gb])
            await conn.commit()
            # Health check
            health = await core.check_endpoint_health(provider, endpoint_url, api_key)
            status = health.get("status", "unknown")
            is_verified = 1 if status in ("online", "configured") else 0
            await conn.execute("UPDATE endpoints SET status=?, is_verified=?, last_health=datetime('now') WHERE id=?", [status, is_verified, eid])
            await conn.commit()
            return {"ok": True, "id": eid, "status": status, "verified": bool(is_verified)}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,label,provider,endpoint_url,gpu_type,vram_gb,models,is_active,is_verified,total_jobs,total_cost,status,last_health,created_at FROM endpoints ORDER BY created_at DESC")
            cols = ["id","label","provider","endpoint_url","gpu_type","vram_gb","models","is_active","is_verified","total_jobs","total_cost","status","last_health","created_at"]
            return {"endpoints": [dict(zip(cols, r)) for r in rows]}

        elif action == "remove":
            eid = body.get("id", "")
            await conn.execute("DELETE FROM endpoints WHERE id=?", [eid])
            await conn.commit()
            return {"ok": True}

        elif action == "verify":
            eid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint_url FROM endpoints WHERE id=?", [eid])
            if not rows:
                raise HTTPException(404, "Endpoint not found")
            provider, enc, ep_url = rows[0]
            creds = crypto.decrypt_credential(enc)
            health = await core.check_endpoint_health(provider, ep_url or creds.get("endpoint_url",""), creds.get("api_key",""))
            status = health.get("status", "unknown")
            await conn.execute("UPDATE endpoints SET status=?, last_health=datetime('now'), is_verified=? WHERE id=?", [status, 1 if status in ("online","configured") else 0, eid])
            await conn.commit()
            return {"ok": True, "status": status, "info": health.get("info", {})}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/generate")
async def generate(request: Request):
    _chk()
    body = await request.json()
    eid  = body.get("endpoint_id", "")
    prompt  = body.get("prompt", "")
    neg     = body.get("negative_prompt", "")
    job_type= body.get("job_type", "txt2img")
    model   = body.get("model", "")
    params  = body.get("params", {})
    title   = body.get("title", prompt[:60] or "Generation")
    folder  = body.get("folder", "")
    tags    = body.get("tags", [])

    if not prompt:
        raise HTTPException(400, "prompt required")
    if not eid:
        raise HTTPException(400, "endpoint_id required")

    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint_url FROM endpoints WHERE id=?", [eid])
        if not rows:
            raise HTTPException(404, "Endpoint not found")
        provider, enc, ep_url = rows[0]
        creds = crypto.decrypt_credential(enc)
    finally:
        await conn.close()

    # Create pending job
    conn = await db.get_db()
    try:
        jid = core.new_id()
        await conn.execute(
            "INSERT INTO jobs (id,endpoint_id,job_type,title,prompt,negative_prompt,model,params,status,width,height,steps,folder,tags,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'),datetime('now','+30 days'))",
            [jid, eid, job_type, title, prompt, neg, model, json.dumps(params), "running",
             params.get("width",1024), params.get("height",1024), params.get("steps",20),
             folder, json.dumps(tags)])
        await conn.commit()
    finally:
        await conn.close()

    # Run generation
    result = await core.generate(
        provider=provider, api_key=creds.get("api_key",""),
        model=model, job_type=job_type,
        prompt=prompt, negative_prompt=neg, params=params,
        endpoint_url=ep_url or creds.get("endpoint_url",""),
    )

    # Update job
    conn = await db.get_db()
    try:
        images = result.get("images", [])
        video_url = result.get("video_url")
        status = "error" if result.get("error") else "done"
        result_data = json.dumps({"images": images, "video_url": video_url})

        await conn.execute(
            "UPDATE jobs SET status=?, result_urls=?, result_data=?, error_msg=?, latency_ms=?, cost_usd=?, seed=?, updated_at=datetime('now') WHERE id=?",
            [status, json.dumps([i.get("url","") for i in images]),
             result_data, result.get("error",""),
             result.get("latency_ms",0), result.get("cost",0),
             params.get("seed"), jid])

        if status == "done":
            # Add to gallery
            for i, img in enumerate(images):
                gid = core.new_id()
                await conn.execute(
                    "INSERT INTO gallery (id,job_id,image_url,prompt,model,params,width,height,seed,folder,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now','+30 days'))",
                    [gid, jid, img.get("url",""), prompt, model, json.dumps(params),
                     params.get("width",1024), params.get("height",1024), params.get("seed"), folder])
            # Update endpoint stats
            await conn.execute("UPDATE endpoints SET total_jobs=total_jobs+1, total_cost=total_cost+?, last_used=datetime('now'), updated_at=datetime('now') WHERE id=?",
                               [result.get("cost",0), eid])

        await conn.execute("INSERT INTO usage_log (id,job_id,endpoint_id,job_type,model,latency_ms,cost_usd,status,error_msg,created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
                           [core.new_id(), jid, eid, job_type, model, result.get("latency_ms",0), result.get("cost",0), status, result.get("error","")])
        await conn.commit()
    finally:
        await conn.close()

    if result.get("error"):
        return JSONResponse({"error": result["error"], "job_id": jid, "latency_ms": result.get("latency_ms",0)}, 502)
    return {
        "job_id": jid, "images": images, "video_url": result.get("video_url"),
        "cost": result.get("cost",0), "latency_ms": result.get("latency_ms",0), "model": model,
    }

# ─────────────────────────────────────────────────────────────────────────────
# JOBS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs")
async def jobs(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "list":
            folder   = body.get("folder", "")
            job_type = body.get("job_type", "")
            limit    = min(body.get("limit", 50), 200)
            q = "SELECT id,job_type,title,prompt,model,status,result_urls,latency_ms,cost_usd,width,height,is_favorite,folder,created_at FROM jobs WHERE expires_at > datetime('now') AND status='done'"
            params = []
            if folder: q += " AND folder=?"; params.append(folder)
            if job_type: q += " AND job_type=?"; params.append(job_type)
            q += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            rows = await conn.execute_fetchall(q, params)
            cols = ["id","job_type","title","prompt","model","status","result_urls","latency_ms","cost_usd","width","height","is_favorite","folder","created_at"]
            return {"jobs": [dict(zip(cols, r)) for r in rows]}

        elif action == "get":
            jid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT * FROM jobs WHERE id=?", [jid])
            if not rows:
                raise HTTPException(404, "Job not found")
            cols = [d[1] for d in await (await conn.execute("PRAGMA table_info(jobs)")).fetchall()]
            return dict(zip(cols, rows[0]))

        elif action == "favorite":
            jid = body.get("id", "")
            fav = body.get("favorite", True)
            await conn.execute("UPDATE jobs SET is_favorite=? WHERE id=?", [1 if fav else 0, jid])
            await conn.commit()
            return {"ok": True}

        elif action == "delete":
            jid = body.get("id", "")
            await conn.execute("DELETE FROM jobs WHERE id=?", [jid])
            await conn.execute("DELETE FROM gallery WHERE job_id=?", [jid])
            await conn.commit()
            return {"ok": True}

        elif action == "folders":
            rows = await conn.execute_fetchall("SELECT DISTINCT folder FROM jobs WHERE folder != '' ORDER BY folder")
            return {"folders": [r[0] for r in rows]}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# BATCH GENERATION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/batch")
async def batch_gen(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "create":
            prompts = body.get("prompts", [])
            if not prompts:
                raise HTTPException(400, "prompts required")
            eid = body.get("endpoint_id", "")
            if not eid:
                raise HTTPException(400, "endpoint_id required")
            bid = core.new_id()
            await conn.execute(
                "INSERT INTO batch_jobs (id,title,endpoint_id,job_type,model,base_params,prompts,results,status,total_items,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
                [bid, body.get("title","Batch"), eid, body.get("job_type","txt2img"),
                 body.get("model",""), json.dumps(body.get("base_params",{})),
                 json.dumps(prompts), "[]", "pending", len(prompts)])
            await conn.commit()
            asyncio.create_task(_run_batch(bid))
            return {"ok": True, "id": bid, "total": len(prompts)}

        elif action == "status":
            bid = body.get("id","")
            rows = await conn.execute_fetchall("SELECT id,title,status,total_items,done_items,total_cost,error_msg,created_at,completed_at FROM batch_jobs WHERE id=?", [bid])
            if not rows:
                raise HTTPException(404, "Batch not found")
            cols = ["id","title","status","total_items","done_items","total_cost","error_msg","created_at","completed_at"]
            return dict(zip(cols, rows[0]))

        elif action == "results":
            bid = body.get("id","")
            rows = await conn.execute_fetchall("SELECT results FROM batch_jobs WHERE id=?", [bid])
            if not rows:
                raise HTTPException(404, "Batch not found")
            return {"results": json.loads(rows[0][0])}

        elif action == "list":
            rows = await conn.execute_fetchall("SELECT id,title,status,total_items,done_items,total_cost,created_at FROM batch_jobs ORDER BY created_at DESC LIMIT 50")
            cols = ["id","title","status","total_items","done_items","total_cost","created_at"]
            return {"jobs": [dict(zip(cols, r)) for r in rows]}

        elif action == "cancel":
            bid = body.get("id","")
            await conn.execute("UPDATE batch_jobs SET status='cancelled' WHERE id=? AND status IN ('pending','running')", [bid])
            await conn.commit()
            return {"ok": True}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

async def _run_batch(bid: str):
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("SELECT endpoint_id, job_type, model, base_params, prompts FROM batch_jobs WHERE id=?", [bid])
        if not rows:
            return
        eid, job_type, model, base_params_json, prompts_json = rows[0]
        base_params = json.loads(base_params_json)
        prompts = json.loads(prompts_json)

        ep_rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint_url FROM endpoints WHERE id=?", [eid])
        if not ep_rows:
            return
        provider, enc, ep_url = ep_rows[0]
        creds = crypto.decrypt_credential(enc)

        await conn.execute("UPDATE batch_jobs SET status='running', updated_at=datetime('now') WHERE id=?", [bid])
        await conn.commit()

        results = []
        total_cost = 0.0

        for i, p in enumerate(prompts):
            check = await conn.execute_fetchall("SELECT status FROM batch_jobs WHERE id=?", [bid])
            if check and check[0][0] == "cancelled":
                return

            prompt = p if isinstance(p, str) else p.get("prompt","")
            neg    = p.get("negative_prompt","") if isinstance(p, dict) else ""
            params = {**base_params, **(p.get("params",{}) if isinstance(p, dict) else {})}

            result = await core.generate(
                provider=provider, api_key=creds.get("api_key",""),
                model=model, job_type=job_type,
                prompt=prompt, negative_prompt=neg, params=params,
                endpoint_url=ep_url or creds.get("endpoint_url",""),
            )
            total_cost += result.get("cost",0)
            results.append({
                "index": i, "prompt": prompt,
                "images": result.get("images",[]),
                "video_url": result.get("video_url"),
                "error": result.get("error",""),
                "cost": result.get("cost",0), "latency_ms": result.get("latency_ms",0),
            })

            await conn.execute("UPDATE batch_jobs SET done_items=?, results=?, total_cost=?, updated_at=datetime('now') WHERE id=?",
                               [i+1, json.dumps(results), total_cost, bid])
            await conn.commit()
            await asyncio.sleep(0.2)

        await conn.execute("UPDATE batch_jobs SET status='done', results=?, total_cost=?, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?",
                           [json.dumps(results), total_cost, bid])
        await conn.commit()
    except Exception as e:
        log.error(f"Batch {bid} error: {e}")
        try:
            await conn.execute("UPDATE batch_jobs SET status='failed', error_msg=? WHERE id=?", [str(e), bid])
            await conn.commit()
        except Exception:
            pass
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# GALLERY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/gallery")
async def gallery(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action","")
    conn   = await db.get_db()
    try:
        if action == "list":
            folder   = body.get("folder","")
            fav_only = body.get("favorites_only", False)
            limit    = min(body.get("limit",60), 300)
            q = "SELECT id,job_id,image_url,prompt,model,width,height,seed,folder,tags,is_favorite,created_at FROM gallery WHERE expires_at > datetime('now')"
            params = []
            if folder: q += " AND folder=?"; params.append(folder)
            if fav_only: q += " AND is_favorite=1"
            q += " ORDER BY created_at DESC LIMIT ?"; params.append(limit)
            rows = await conn.execute_fetchall(q, params)
            cols = ["id","job_id","image_url","prompt","model","width","height","seed","folder","tags","is_favorite","created_at"]
            return {"images": [dict(zip(cols,r)) for r in rows]}

        elif action == "favorite":
            gid = body.get("id","")
            fav = body.get("favorite",True)
            await conn.execute("UPDATE gallery SET is_favorite=? WHERE id=?", [1 if fav else 0, gid])
            await conn.commit()
            return {"ok": True}

        elif action == "delete":
            gid = body.get("id","")
            await conn.execute("DELETE FROM gallery WHERE id=?", [gid])
            await conn.commit()
            return {"ok": True}

        elif action == "folders":
            rows = await conn.execute_fetchall("SELECT DISTINCT folder FROM gallery WHERE folder!='' ORDER BY folder")
            return {"folders": [r[0] for r in rows]}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# PRESETS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/presets")
async def presets(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action","")
    conn   = await db.get_db()
    try:
        if action == "add":
            pid = core.new_id()
            await conn.execute(
                "INSERT INTO presets (id,title,job_type,model,prompt_prefix,prompt_suffix,negative_prompt,params,category,created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
                [pid, body.get("title",""), body.get("job_type","txt2img"), body.get("model",""),
                 body.get("prompt_prefix",""), body.get("prompt_suffix",""),
                 body.get("negative_prompt",""), json.dumps(body.get("params",{})),
                 body.get("category","style")])
            await conn.commit()
            return {"ok": True, "id": pid}

        elif action == "list":
            cat = body.get("category","")
            q = "SELECT id,title,job_type,model,prompt_prefix,prompt_suffix,negative_prompt,params,category,use_count,is_favorite FROM presets"
            params = []
            if cat: q += " WHERE category=?"; params.append(cat)
            q += " ORDER BY is_favorite DESC, use_count DESC"
            rows = await conn.execute_fetchall(q, params)
            cols = ["id","title","job_type","model","prompt_prefix","prompt_suffix","negative_prompt","params","category","use_count","is_favorite"]
            return {"presets": [dict(zip(cols,r)) for r in rows]}

        elif action == "use":
            pid = body.get("id","")
            await conn.execute("UPDATE presets SET use_count=use_count+1 WHERE id=?", [pid])
            await conn.commit()
            rows = await conn.execute_fetchall("SELECT * FROM presets WHERE id=?", [pid])
            if not rows:
                raise HTTPException(404, "Preset not found")
            cols = ["id","title","job_type","model","prompt_prefix","prompt_suffix","negative_prompt","params","category","use_count","is_favorite","created_at"]
            return dict(zip(cols, rows[0]))

        elif action == "delete":
            await conn.execute("DELETE FROM presets WHERE id=?", [body.get("id","")])
            await conn.commit()
            return {"ok": True}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# USAGE ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/usage")
async def usage():
    _chk()
    conn = await db.get_db()
    try:
        today = await conn.execute_fetchall("SELECT job_type, model, COUNT(*) as n, SUM(latency_ms) as ms, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now') AND status='success' GROUP BY job_type, model ORDER BY cost DESC")
        month = await conn.execute_fetchall("SELECT job_type, model, COUNT(*) as n, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now','start of month') AND status='success' GROUP BY job_type, model ORDER BY cost DESC")
        daily = await conn.execute_fetchall("SELECT date(created_at) as day, COUNT(*) as n, SUM(cost_usd) as cost FROM usage_log WHERE created_at >= date('now','-30 days') AND status='success' GROUP BY day ORDER BY day")
    finally:
        await conn.close()

    def to_d(rows, cols):
        return [dict(zip(cols, r)) for r in rows]

    return {
        "today":    to_d(today, ["job_type","model","generations","avg_latency_ms","cost"]),
        "month":    to_d(month, ["job_type","model","generations","cost"]),
        "daily_30d":to_d(daily, ["day","generations","cost"]),
    }

# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET — Live generation progress
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/generate")
async def ws_generate(ws: WebSocket):
    await ws.accept()
    if not lic.is_valid():
        await ws.send_json({"type": "error", "error": "License invalid."})
        await ws.close()
        return
    try:
        while True:
            data = await ws.receive_json()
            eid     = data.get("endpoint_id","")
            prompt  = data.get("prompt","")
            model   = data.get("model","")
            job_type= data.get("job_type","txt2img")
            params  = data.get("params",{})
            neg     = data.get("negative_prompt","")
            if not prompt or not eid:
                await ws.send_json({"type":"error","error":"endpoint_id and prompt required"})
                continue

            conn = await db.get_db()
            try:
                rows = await conn.execute_fetchall("SELECT provider, api_key_enc, endpoint_url FROM endpoints WHERE id=?", [eid])
                if not rows:
                    await ws.send_json({"type":"error","error":"Endpoint not found"})
                    continue
                provider, enc, ep_url = rows[0]
                creds = crypto.decrypt_credential(enc)
            finally:
                await conn.close()

            await ws.send_json({"type":"start","job_type":job_type,"model":model})
            result = await core.generate(
                provider=provider, api_key=creds.get("api_key",""),
                model=model, job_type=job_type,
                prompt=prompt, negative_prompt=neg, params=params,
                endpoint_url=ep_url or creds.get("endpoint_url",""),
            )
            if result.get("error"):
                await ws.send_json({"type":"error","error":result["error"]})
            else:
                await ws.send_json({"type":"done","images":result.get("images",[]),"video_url":result.get("video_url"),"cost":result.get("cost",0),"latency_ms":result.get("latency_ms",0)})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type":"error","error":str(e)})
        except Exception:
            pass
