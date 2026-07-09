# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Worker Manager (Production v2)
SQLite-backed worker registry. Replaces JSON file storage.
"""
from __future__ import annotations
import logging, time, uuid
from typing import Optional, List, Dict
import database as db

logger = logging.getLogger("orchestra.workers")

def register_worker(node_id, worker_type, provider_id, model,
                    concurrency=5, timeout_sec=60, retry_count=3,
                    priority="normal", gpu_vram_gb=None, label="", base_url="",
                    worker_url="") -> dict:
    workers = db.get_active_workers()
    cpu_count = sum(1 for w in workers if w.get("worker_type")=="cpu")
    gpu_count = sum(1 for w in workers if w.get("worker_type")=="gpu")
    prefix  = "W-GPU" if worker_type=="gpu" else "W"
    num     = gpu_count+1 if worker_type=="gpu" else cpu_count+1
    wid     = f"{prefix}-{num:03d}"
    while db.q1("SELECT id FROM workers WHERE id=?", (wid,)):
        num += 1; wid = f"{prefix}-{num:03d}"
    db.upsert_worker({
        "id": wid, "node_id": node_id, "worker_type": worker_type,
        "provider_id": provider_id, "model": model, "concurrency": concurrency,
        "timeout_sec": timeout_sec, "retry_count": retry_count, "priority": priority,
        "gpu_vram_gb": gpu_vram_gb or 0, "base_url": base_url, "worker_url": worker_url,
        "label": label or f"{model} on {node_id}", "status": "active",
    })
    logger.info(f"Worker registered: {wid} ({worker_type}, {provider_id}/{model})")
    return {"ok": True, "worker_id": wid, "worker": db.q1("SELECT * FROM workers WHERE id=?", (wid,))}

def update_worker_heartbeat(worker_id, load_pct=0, tasks_active=0) -> bool:
    return db.heartbeat_worker(worker_id, load_pct, tasks_active)

def remove_worker(worker_id: str) -> bool:
    return db.remove_worker(worker_id)

def update_worker_stats(worker_id, latency_ms, success) -> None:
    db.update_worker_stats(worker_id, latency_ms, success)

def get_all_workers(check_heartbeat=True) -> List[dict]:
    if check_heartbeat:
        return db.get_active_workers()
    return db.q("SELECT * FROM workers ORDER BY worker_type,load_pct")

def get_worker(worker_id) -> Optional[dict]:
    return db.q1("SELECT * FROM workers WHERE id=?", (worker_id,))

def register_node(name, endpoint, node_type="cpu", max_workers=10, region="", tags=None) -> dict:
    nid = f"node-{uuid.uuid4().hex[:8]}"
    db.upsert_node({"id": nid, "name": name, "endpoint": endpoint, "node_type": node_type,
                    "max_workers": max_workers, "region": region, "cluster_id": "",
                    "tags": __import__("json").dumps(tags or [])})
    logger.info(f"Node registered: {nid} ({name} @ {endpoint})")
    return {"ok": True, "node_id": nid, "node": db.q1("SELECT * FROM nodes WHERE id=?", (nid,))}

def update_node_heartbeat(node_id, cpu_pct=0, mem_pct=0, throughput=0) -> bool:
    return db.heartbeat_node(node_id, cpu_pct=cpu_pct, mem_pct=mem_pct, throughput_rps=throughput)

def get_all_nodes(check_heartbeat=True) -> List[dict]:
    return db.get_nodes()

def remove_node(node_id) -> bool:
    return db.ex("DELETE FROM nodes WHERE id=?", (node_id,)) > 0
