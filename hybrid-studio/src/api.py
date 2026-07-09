# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Hybrid Studio — FastAPI Server
Self-hosted pipeline automation: AI text + GPU image + Voice + Sound + Translation.

Endpoints:
  GET  /                  → Dashboard UI
  GET  /health            → Health + license
  POST /api/workflows     → {action: create|list|get|update|delete|duplicate}
  POST /api/run           → Execute pipeline {workflow_id, inputs}
  GET  /api/runs          → Run history
  POST /api/connections   → {action: add|list|remove|verify}
  POST /api/templates     → {action: list|use|save}
  GET  /api/node-types    → All node type definitions
  WS   /ws/pipeline       → Real-time run progress
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

log = logging.getLogger("hybrid_studio.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")

CONFIG_PATH     = os.environ.get("HYBRID_STUDIO_CONFIG", "/hybrid-studio/config/hybrid-studio.yml")
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
    key = cfg.get("hybrid_studio", {}).get("license_key", os.environ.get("HYBRID_STUDIO_LICENSE_KEY", ""))
    await db.init_db()
    if key:
        state = await lic.validate_license(key)
        if state.valid:
            log.info(f"⚡ Hybrid Studio ready — Plan: {state.plan}")
            asyncio.create_task(lic.heartbeat_loop(key))
        else:
            log.warning(f"⚠ License invalid: {state.error}")
    else:
        log.warning("⚠ No license key configured")
    asyncio.create_task(_cleanup_loop())
    yield

async def _cleanup_loop():
    while True:
        await asyncio.sleep(6 * 3600)
        try:
            await db.cleanup_old_runs()
        except Exception as e:
            log.error(f"Cleanup error: {e}")

app = FastAPI(title="AXTO Hybrid Studio", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def _chk():
    if not lic.is_valid():
        raise HTTPException(403, "License invalid or expired. Visit axto.io/portal to renew.")

# ── Dashboard ─────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def root():
    state = lic.get_state()
    if not state.valid:
        if os.path.exists(ACTIVATION_HTML):
            with open(ACTIVATION_HTML, encoding="utf-8") as f:
                return HTMLResponse(f.read())
        return HTMLResponse("<h1>Hybrid Studio — License Required</h1>")
    if os.path.exists(DASHBOARD_HTML):
        with open(DASHBOARD_HTML, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Dashboard file missing</h1>", 500)

@app.get("/health")
async def health():
    state = lic.get_state()
    return {"status": "healthy" if lic.is_valid() else "degraded",
            "product": "hybrid-studio", "version": "2.0.0",
            "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at}}

# ── Status ────────────────────────────────────────────────────────────
@app.get("/api/status")
async def status():
    _chk()
    state = lic.get_state()
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("""
            SELECT
              (SELECT COUNT(*) FROM workflows WHERE is_active=1) as workflows,
              (SELECT COUNT(*) FROM runs WHERE status='running') as running,
              (SELECT COUNT(*) FROM runs WHERE status='done' AND created_at >= date('now')) as runs_today,
              (SELECT COUNT(*) FROM connections WHERE is_active=1) as connections,
              (SELECT COALESCE(SUM(cost_usd),0) FROM runs WHERE created_at >= date('now')) as cost_today,
              (SELECT COALESCE(SUM(cost_usd),0) FROM runs WHERE created_at >= date('now','start of month')) as cost_month
        """)
        r = dict(zip(["workflows","running","runs_today","connections","cost_today","cost_month"], rows[0])) if rows else {}
    finally:
        await conn.close()
    return {
        "license": {"valid": state.valid, "plan": state.plan, "expires_at": state.expires_at},
        "counts": {"workflows": r.get("workflows",0), "connections": r.get("connections",0)},
        "runs": {"active": r.get("running",0), "today": r.get("runs_today",0)},
        "cost": {"today": round(r.get("cost_today",0), 6), "month": round(r.get("cost_month",0), 6)},
    }

# ── Node types ────────────────────────────────────────────────────────
@app.get("/api/node-types")
async def node_types():
    return {"node_types": core.NODE_TYPES}

# ── Workflows ─────────────────────────────────────────────────────────
@app.post("/api/workflows")
async def workflows(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "create":
            wid = core.new_id()
            await conn.execute(
                "INSERT INTO workflows (id,title,description,nodes,edges,variables,tags,category,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
                [wid, body.get("title","New Pipeline"), body.get("description",""),
                 json.dumps(body.get("nodes",[])), json.dumps(body.get("edges",[])),
                 json.dumps(body.get("variables",{})), json.dumps(body.get("tags",[])),
                 body.get("category","general")])
            await conn.commit()
            return {"ok": True, "id": wid}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,title,description,category,tags,run_count,last_run,is_template,created_at,updated_at FROM workflows WHERE is_active=1 ORDER BY updated_at DESC LIMIT 100")
            cols = ["id","title","description","category","tags","run_count","last_run","is_template","created_at","updated_at"]
            return {"workflows": [dict(zip(cols, r)) for r in rows]}

        elif action == "get":
            wid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT * FROM workflows WHERE id=?", [wid])
            if not rows:
                raise HTTPException(404, "Workflow not found")
            cols = [d[1] for d in await (await conn.execute("PRAGMA table_info(workflows)")).fetchall()]
            return dict(zip(cols, rows[0]))

        elif action == "update":
            wid = body.get("id", "")
            fields = {k: (json.dumps(v) if isinstance(v,(list,dict)) else v)
                      for k, v in body.items()
                      if k in ("title","description","nodes","edges","variables","tags","category")}
            if not fields:
                return {"ok": True}
            set_clause = ", ".join(f"{k}=?" for k in fields)
            await conn.execute(f"UPDATE workflows SET {set_clause}, updated_at=datetime('now') WHERE id=?",
                               list(fields.values()) + [wid])
            await conn.commit()
            return {"ok": True}

        elif action == "delete":
            wid = body.get("id", "")
            await conn.execute("UPDATE workflows SET is_active=0 WHERE id=?", [wid])
            await conn.commit()
            return {"ok": True}

        elif action == "duplicate":
            wid = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT title,description,nodes,edges,variables,tags,category FROM workflows WHERE id=?", [wid])
            if not rows:
                raise HTTPException(404, "Workflow not found")
            t,d,n,e,v,tg,cat = rows[0]
            new_id = core.new_id()
            await conn.execute(
                "INSERT INTO workflows (id,title,description,nodes,edges,variables,tags,category,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
                [new_id, f"Copy of {t}", d, n, e, v, tg, cat])
            await conn.commit()
            return {"ok": True, "id": new_id}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ── Run pipeline ──────────────────────────────────────────────────────
@app.post("/api/run")
async def run_pipeline(request: Request):
    _chk()
    body        = await request.json()
    workflow_id = body.get("workflow_id", "")
    inputs      = body.get("inputs", {})
    if not workflow_id:
        raise HTTPException(400, "workflow_id required")

    conn = await db.get_db()
    try:
        # Get workflow
        rows = await conn.execute_fetchall("SELECT nodes, edges, variables FROM workflows WHERE id=?", [workflow_id])
        if not rows:
            raise HTTPException(404, "Workflow not found")
        nodes_json, edges_json, vars_json = rows[0]
        workflow = {
            "nodes":     json.loads(nodes_json or "[]"),
            "edges":     json.loads(edges_json or "[]"),
            "variables": json.loads(vars_json  or "{}"),
        }

        # Get all connections as credentials dict
        conn_rows = await conn.execute_fetchall(
            "SELECT service, credentials FROM connections WHERE is_active=1")
        connections = {}
        for service, creds_json in conn_rows:
            try:
                connections[service] = crypto.decrypt_credential(creds_json)
            except Exception:
                pass

        # Create run record
        run_id = core.new_id()
        await conn.execute(
            "INSERT INTO runs (id,workflow_id,status,trigger,inputs,started_at,created_at) VALUES (?,?,?,?,?,datetime('now'),datetime('now'))",
            [run_id, workflow_id, "running", body.get("trigger","manual"), json.dumps(inputs)])
        await conn.commit()
    finally:
        await conn.close()

    # Execute asynchronously
    asyncio.create_task(_execute_run(run_id, workflow_id, workflow, connections, inputs))
    return {"ok": True, "run_id": run_id, "status": "running"}

async def _execute_run(run_id: str, workflow_id: str, workflow: dict, connections: dict, inputs: dict):
    conn = await db.get_db()
    try:
        executor = core.PipelineExecutor(workflow, connections)
        result   = await executor.run(inputs)
        outputs  = result.get("outputs", {})
        logs     = result.get("node_logs", [])
        total_cost = 0.0

        await conn.execute(
            "UPDATE runs SET status='done', outputs=?, node_logs=?, finished_at=datetime('now'), cost_usd=? WHERE id=?",
            [json.dumps(outputs), json.dumps(logs), total_cost, run_id])
        await conn.execute(
            "UPDATE workflows SET run_count=run_count+1, last_run=datetime('now'), updated_at=datetime('now') WHERE id=?",
            [workflow_id])
        await conn.commit()
    except Exception as e:
        log.error(f"Run {run_id} failed: {e}")
        try:
            await conn.execute(
                "UPDATE runs SET status='failed', error_msg=?, finished_at=datetime('now') WHERE id=?",
                [str(e), run_id])
            await conn.commit()
        except Exception:
            pass
    finally:
        await conn.close()

# ── Run history ───────────────────────────────────────────────────────
@app.get("/api/runs")
async def get_runs(workflow_id: str = "", limit: int = 50):
    _chk()
    conn = await db.get_db()
    try:
        if workflow_id:
            rows = await conn.execute_fetchall(
                "SELECT id,workflow_id,status,trigger,cost_usd,started_at,finished_at,error_msg FROM runs WHERE workflow_id=? ORDER BY created_at DESC LIMIT ?",
                [workflow_id, limit])
        else:
            rows = await conn.execute_fetchall(
                "SELECT id,workflow_id,status,trigger,cost_usd,started_at,finished_at,error_msg FROM runs ORDER BY created_at DESC LIMIT ?",
                [limit])
        cols = ["id","workflow_id","status","trigger","cost_usd","started_at","finished_at","error_msg"]
        return {"runs": [dict(zip(cols, r)) for r in rows]}
    finally:
        await conn.close()

@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    _chk()
    conn = await db.get_db()
    try:
        rows = await conn.execute_fetchall("SELECT * FROM runs WHERE id=?", [run_id])
        if not rows:
            raise HTTPException(404, "Run not found")
        cols = [d[1] for d in await (await conn.execute("PRAGMA table_info(runs)")).fetchall()]
        return dict(zip(cols, rows[0]))
    finally:
        await conn.close()

# ── Connections (API credentials) ─────────────────────────────────────
@app.post("/api/connections")
async def connections(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "add":
            cid     = core.new_id()
            service = body.get("service", "")
            label   = body.get("label", "") or service
            creds   = crypto.encrypt_credential({"api_key": body.get("api_key",""), "endpoint_url": body.get("endpoint_url","")})
            await conn.execute(
                "INSERT INTO connections (id,service,label,credentials,is_active,is_verified,created_at) VALUES (?,?,?,?,1,0,datetime('now'))",
                [cid, service, label, creds])
            await conn.commit()
            return {"ok": True, "id": cid}

        elif action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,service,label,is_active,is_verified,last_used,created_at FROM connections ORDER BY created_at DESC")
            cols = ["id","service","label","is_active","is_verified","last_used","created_at"]
            return {"connections": [dict(zip(cols, r)) for r in rows]}

        elif action == "remove":
            await conn.execute("DELETE FROM connections WHERE id=?", [body.get("id","")])
            await conn.commit()
            return {"ok": True}

        elif action == "verify":
            cid  = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT service, credentials FROM connections WHERE id=?", [cid])
            if not rows:
                raise HTTPException(404, "Connection not found")
            service, creds_json = rows[0]
            creds = crypto.decrypt_credential(creds_json)
            # Simple check: verify key is non-empty
            verified = bool(creds.get("api_key") or creds.get("endpoint_url"))
            await conn.execute("UPDATE connections SET is_verified=?, last_used=datetime('now') WHERE id=?", [1 if verified else 0, cid])
            await conn.commit()
            return {"ok": True, "verified": verified}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ── Templates ─────────────────────────────────────────────────────────
@app.post("/api/templates")
async def templates(request: Request):
    _chk()
    body   = await request.json()
    action = body.get("action", "")
    conn   = await db.get_db()
    try:
        if action == "list":
            rows = await conn.execute_fetchall(
                "SELECT id,title,description,category,tags,run_count FROM workflows WHERE is_template=1 AND is_active=1 ORDER BY run_count DESC")
            cols = ["id","title","description","category","tags","run_count"]
            return {"templates": [dict(zip(cols,r)) for r in rows]}

        elif action == "use":
            tid  = body.get("id", "")
            rows = await conn.execute_fetchall("SELECT title,description,nodes,edges,variables,tags,category FROM workflows WHERE id=?", [tid])
            if not rows:
                raise HTTPException(404, "Template not found")
            t,d,n,e,v,tg,cat = rows[0]
            new_id = core.new_id()
            await conn.execute(
                "INSERT INTO workflows (id,title,description,nodes,edges,variables,tags,category,is_template,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,datetime('now'),datetime('now'))",
                [new_id, f"{t} (Copy)", d, n, e, v, tg, cat])
            await conn.execute("UPDATE workflows SET run_count=run_count+1 WHERE id=?", [tid])
            await conn.commit()
            return {"ok": True, "id": new_id}

        elif action == "save":
            wid = body.get("workflow_id", "")
            await conn.execute("UPDATE workflows SET is_template=1 WHERE id=?", [wid])
            await conn.commit()
            return {"ok": True}

        else:
            raise HTTPException(400, f"Unknown action: {action}")
    finally:
        await conn.close()

# ── WebSocket — live pipeline progress ────────────────────────────────
@app.websocket("/ws/pipeline")
async def ws_pipeline(ws: WebSocket):
    await ws.accept()
    if not lic.is_valid():
        await ws.send_json({"type": "error", "error": "License invalid."})
        await ws.close()
        return
    try:
        while True:
            data = await ws.receive_json()
            run_id = data.get("run_id", "")
            if not run_id:
                await ws.send_json({"type": "error", "error": "run_id required"})
                continue

            # Poll run status and stream updates
            for _ in range(120):  # max 4 min
                conn = await db.get_db()
                try:
                    rows = await conn.execute_fetchall(
                        "SELECT status, node_logs, outputs, error_msg FROM runs WHERE id=?", [run_id])
                finally:
                    await conn.close()

                if not rows:
                    await ws.send_json({"type": "error", "error": "Run not found"})
                    break

                status, logs_json, outputs_json, error = rows[0]
                logs = json.loads(logs_json or "[]")

                await ws.send_json({
                    "type": "progress",
                    "run_id": run_id,
                    "status": status,
                    "nodes_done": len(logs),
                    "node_logs": logs[-3:],  # last 3 node logs
                })

                if status in ("done", "failed", "cancelled"):
                    await ws.send_json({
                        "type": "done" if status == "done" else "error",
                        "run_id": run_id,
                        "status": status,
                        "outputs": json.loads(outputs_json or "{}"),
                        "error": error or "",
                        "node_logs": logs,
                    })
                    break
                await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass
