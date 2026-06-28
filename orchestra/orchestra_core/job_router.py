# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Job Router (Production v2)
SQLite-backed, circuit breaker, semantic cache, quality retry, SLA, webhooks.
"""
from __future__ import annotations
import concurrent.futures, json, logging, threading, time, urllib.request, uuid
from typing import Optional, List
import ai_providers, credential_vault, database as db, routing_engine, worker_manager
from semantic_router import get_classifier, get_inj_detector, get_quality_scorer, get_cache_keygen

logger          = logging.getLogger("orchestra.router")
MAX_POOL        = int(__import__("os").environ.get("ROUTER_MAX_THREADS","64"))
_executor       = concurrent.futures.ThreadPoolExecutor(max_workers=MAX_POOL, thread_name_prefix="job")
_paused         = False
_active_jobs    = {}
_active_lock    = threading.Lock()

def _maintenance_loop():
    while True:
        try:
            exp = db.cancel_expired_jobs()
            if exp: logger.info(f"Expired {exp} jobs")
            db.cache_evict_expired(); db.prune_metrics()
            s = db.get_performance_stats(hours=1)
            db.record_metric("throughput_rps", s["throughput_rps"])
            db.record_metric("error_rate",     s["error_rate"])
        except Exception as e: logger.debug(f"Maint error: {e}")
        time.sleep(60)

threading.Thread(target=_maintenance_loop, daemon=True, name="maint").start()

def enqueue(task_type, messages, model=None, provider_id=None, max_tokens=2048,
            temperature=0.7, priority="normal", caller_id="", metadata=None,
            callback_url="", sla_ms=0) -> dict:
    rl = db.check_rate_limit(caller_id, max_tokens)
    if not rl["ok"]:
        return {"ok": False, "error": f"Rate limit: {rl.get('reason')}"}
    snap = db.get_queue_snapshot()
    max_q = int(db.get_setting("max_queue_size","50000"))
    if snap["depth"] + snap["running"] >= max_q:
        return {"ok": False, "error": "Queue full"}
    inj = get_inj_detector().check(messages)
    if inj:
        db.audit(caller_id or "anon","injection_blocked",detail=inj.get("type",""),result="blocked")
        return {"ok": False, "error": f"Injection detected: {inj.get('type')}", "injection": inj}
    cat, conf = get_classifier().classify(messages, task_type)
    cache_key = ""
    if db.get_setting("semantic_cache_enabled","true") == "true" and temperature <= 0.3:
        cache_key = get_cache_keygen().make_key(messages, model or "", max_tokens, temperature)
        if cache_key:
            cached = db.cache_get(cache_key)
            if cached:
                return {"ok": True, "job_id": "cached", "status": "done",
                        "result": cached["result"], "from_cache": True,
                        "cache_hits": cached.get("hit_count",1)}
    job_id = f"J-{uuid.uuid4().hex[:10].upper()}"
    db.enqueue_job(job_id=job_id, task_type=task_type, messages=messages,
                   model=model or "", provider_id=provider_id or "",
                   max_tokens=max_tokens, temperature=temperature, priority=priority,
                   caller_id=caller_id, metadata=metadata, callback_url=callback_url,
                   sla_ms=sla_ms, cache_key=cache_key, semantic_category=cat)
    if not _paused:
        f = _executor.submit(_process_job, job_id)
        with _active_lock: _active_jobs[job_id] = f
        f.add_done_callback(lambda ft: _active_jobs.pop(job_id, None))
    logger.info(f"Enqueued {job_id} cat={cat}({conf:.0%}) prio={priority}")
    db.record_metric("jobs_enqueued",1,{"category":cat,"priority":priority})
    return {"ok": True, "job_id": job_id, "status": "queued",
            "semantic_category": cat}

def _process_job(job_id: str) -> None:
    wid = f"thread-{threading.get_ident()}"
    job = db.dequeue_job(wid)
    if not job or job["id"] != job_id: return
    try: _dispatch(job)
    except Exception as e:
        logger.exception(f"Job {job_id} fatal: {e}")
        db.finish_job(job_id, error=str(e))

def _dispatch_to_gpu_worker(worker: dict, job: dict) -> dict:
    """
    POST a GPU-capable task directly to the GPU worker's FastAPI /run endpoint.
    Used for: image generation, transcription, embedding — tasks that require
    local GPU hardware and cannot be routed through cloud provider APIs.
    """
    worker_url = (worker.get("worker_url") or "").rstrip("/")
    if not worker_url:
        return {"ok": False, "error": "GPU worker has no worker_url registered. "
                "Set WORKER_SELF_URL env var on the GPU worker container."}

    task_type = job.get("task_type", "chat")
    meta      = job.get("metadata") or {}
    model     = job.get("model") or worker.get("model", "llama3.2")

    payload: dict = {
        "task_type":   task_type,
        "model":       model,
        "max_tokens":  job.get("max_tokens", 2048),
        "temperature": job.get("temperature", 0.7),
    }

    if task_type in ("chat", "local_inference"):
        payload["messages"] = job.get("messages") or []

    elif task_type == "embedding":
        texts = meta.get("texts")
        if not texts:
            texts = [m.get("content", "") for m in (job.get("messages") or [])
                     if isinstance(m.get("content"), str)]
        payload["texts"] = texts

    elif task_type == "transcribe":
        payload["audio_base64"] = meta.get("audio_base64", "")
        payload["language"]     = meta.get("language", "auto")

    elif task_type == "image":
        msgs   = job.get("messages") or []
        prompt = meta.get("prompt") or (msgs[-1].get("content", "") if msgs else "")
        payload["prompt"]  = prompt
        payload["size"]    = meta.get("size", "1024x1024")
        payload["quality"] = meta.get("quality", "standard")
        payload["n"]       = int(meta.get("n", 1))

    t0 = time.time()
    try:
        data = json.dumps(payload).encode()
        req  = urllib.request.Request(
            f"{worker_url}/run", data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=300) as r:
            result = json.loads(r.read())
        result.setdefault("latency_ms", int((time.time() - t0) * 1000))
        result.setdefault("provider", "gpu_worker")
        result.setdefault("model_used", model)
        return result
    except Exception as e:
        return {"ok": False, "error": f"GPU worker dispatch to {worker_url}/run failed: {e}"}


# GPU-specific task types that must go to a GPU worker's /run endpoint
_GPU_NATIVE_TASKS = frozenset({"image", "transcribe", "embedding"})


def _dispatch(job: dict) -> None:
    job_id = job["id"]; cat = job.get("semantic_category","default"); t0 = time.time()
    workers = db.get_active_workers()
    worker  = routing_engine.select_worker(
        workers, task_type=job["task_type"],
        gpu_required=job["task_type"] in ("image","transcribe"),
        messages=job["messages"], sla_ms=job.get("sla_ms",0),
        semantic_category=cat, caller_id=job.get("caller_id",""))
    if not worker:
        time.sleep(5); db.retry_job(job_id)
        if not _paused: _executor.submit(_process_job, job_id)
        return

    # ── GPU worker: dispatch native GPU tasks (image/transcribe/embedding/chat)
    # directly to the worker's own FastAPI /run endpoint so it can use local
    # hardware (SDXL, Whisper, Ollama). cloud_provider API dispatch is bypassed.
    if worker.get("worker_type") == "gpu" and (
            job["task_type"] in _GPU_NATIVE_TASKS
            or (job["task_type"] in ("chat", "local_inference") and worker.get("worker_url"))
    ):
        result  = _dispatch_to_gpu_worker(worker, job)
        latency = int((time.time() - t0) * 1000)
        db.update_worker_stats(worker["id"], latency, result.get("ok", False))
        if result.get("ok"):
            content  = result.get("content") or json.dumps({
                k: v for k, v in result.items()
                if k not in ("ok", "latency_ms", "provider", "model_used")
            })
            in_tok   = result.get("input_tokens", 0)
            out_tok  = result.get("output_tokens", 0)
            db.finish_job(job_id, result=content, input_tokens=in_tok, output_tokens=out_tok,
                          cost_usd=0.0, latency_ms=latency,
                          model_used=result.get("model_used", worker.get("model", "")),
                          provider_used="gpu_worker")
        else:
            err = result.get("error", "GPU worker error")
            if db.retry_job(job_id):
                if not _paused: _executor.submit(_process_job, job_id)
            else:
                db.finish_job(job_id, error=err, latency_ms=latency,
                              model_used="", provider_used="gpu_worker")
        return

    # ── Cloud/CPU workers: dispatch via ai_providers ─────────────────────────
    pid  = worker.get("provider_id") or job.get("provider_id","openai")
    mdl  = worker.get("model")       or job.get("model","gpt-4o-mini")
    burl = worker.get("base_url","")
    if db.circuit_check(pid) == "open":
        db.retry_job(job_id)
        if not _paused: _executor.submit(_process_job, job_id)
        return
    api_key = credential_vault.get_key(pid)
    if not api_key:
        db.finish_job(job_id, error=f"No API key for '{pid}'"); return
    if job.get("sla_ms",0) > 0:
        elapsed = (time.time() - (job.get("queued_at") or time.time())) * 1000
        if elapsed > job["sla_ms"]:
            db.finish_job(job_id, error=f"SLA exceeded ({elapsed:.0f}ms)"); return
    result = ai_providers.dispatch(provider_id=pid, api_key=api_key, model=mdl,
                                    messages=job["messages"], max_tokens=job["max_tokens"],
                                    temperature=job["temperature"], base_url=burl)
    latency = int((time.time()-t0)*1000)
    if not result["ok"]:
        err = result.get("error","Provider error")
        db.circuit_record_failure(pid, err)
        db.update_worker_stats(worker["id"], latency, False)
        if db.retry_job(job_id):
            if not _paused: _executor.submit(_process_job, job_id)
        else:
            db.finish_job(job_id, error=err, latency_ms=latency, model_used=mdl, provider_used=pid)
        return
    db.circuit_record_success(pid)
    content  = result.get("content","")
    in_tok   = result.get("input_tokens",0)
    out_tok  = result.get("output_tokens",0)
    cost_usd = routing_engine.get_cost_estimate(pid, mdl, in_tok+out_tok)
    q_score  = 0.0
    if db.get_setting("quality_retry_enabled","true") == "true" and content:
        prompt_txt = " ".join(m.get("content","") for m in job["messages"] if isinstance(m.get("content"),str))
        q_threshold = float(db.get_setting("quality_retry_threshold","0.30"))
        q_score = get_quality_scorer().score(prompt_txt, content, cat)
        if get_quality_scorer().needs_retry(q_score, q_threshold):
            up = get_quality_scorer().upgrade_category(cat)
            if up:
                up_pid, up_mdl = up
                up_key = credential_vault.get_key(up_pid)
                if up_key and (up_pid != pid or up_mdl != mdl):
                    r2 = ai_providers.dispatch(provider_id=up_pid, api_key=up_key, model=up_mdl,
                                               messages=job["messages"], max_tokens=job["max_tokens"],
                                               temperature=job["temperature"])
                    if r2["ok"]:
                        content = r2.get("content",content)
                        in_tok  = r2.get("input_tokens",in_tok); out_tok = r2.get("output_tokens",out_tok)
                        cost_usd += routing_engine.get_cost_estimate(up_pid, up_mdl, in_tok+out_tok)
                        mdl = up_mdl; pid = up_pid; q_score = 1.0
    db.update_worker_stats(worker["id"], latency, True)
    if job.get("cache_key") and content:
        db.cache_set(job["cache_key"], content, mdl, in_tok, out_tok,
                     int(db.get_setting("cache_ttl_sec","3600")))
    db.finish_job(job_id, result=content, input_tokens=in_tok, output_tokens=out_tok,
                  cost_usd=cost_usd, latency_ms=latency, model_used=mdl, provider_used=pid,
                  quality_score=q_score)
    db.record_metric("job_latency_ms", latency, {"provider":pid,"category":cat})
    db.record_metric("job_cost_usd",   cost_usd, {"provider":pid})
    logger.info(f"Done {job_id} {pid}/{mdl} {out_tok}tok {latency}ms ${cost_usd:.5f} q={q_score:.2f}")
    if job.get("callback_url"):
        try:
            payload = json.dumps({"job_id":job_id,"status":"done","result":content,
                                  "cost_usd":cost_usd,"latency_ms":latency}).encode()
            req = urllib.request.Request(job["callback_url"], data=payload,
                                         headers={"Content-Type":"application/json"})
            urllib.request.urlopen(req, timeout=10)
        except Exception as e: logger.warning(f"Webhook fail: {e}")

def pause_queue():
    global _paused; _paused = True; logger.info("Queue paused")

def resume_queue():
    global _paused; _paused = False
    rows = db.q("SELECT id FROM jobs WHERE status='queued' ORDER BY priority_score DESC LIMIT 100")
    for r in rows:
        f = _executor.submit(_process_job, r["id"])
        with _active_lock: _active_jobs[r["id"]] = f
    logger.info(f"Queue resumed, resubmitted {len(rows)} jobs")

def get_queue() -> List[dict]:
    return db.q("SELECT id,task_type,priority,status,semantic_category,queued_at,caller_id "
                "FROM jobs WHERE status IN ('queued','running') ORDER BY priority_score DESC LIMIT 200")

def get_history(limit=50) -> List[dict]:
    return db.q("SELECT id,task_type,priority,status,model_used,provider_used,cost_usd,"
                "latency_ms,quality_score,semantic_category,done_at,error "
                "FROM jobs WHERE status IN ('done','error','timeout','cancelled') "
                "ORDER BY done_at DESC LIMIT ?", (limit,))

def get_job(job_id: str):
    return db.get_job(job_id)

def cancel_job(job_id: str) -> bool:
    return db.ex("UPDATE jobs SET status='cancelled' WHERE id=? AND status='queued'", (job_id,)) > 0

def get_queue_stats() -> dict:
    snap = db.get_queue_snapshot(); perf = db.get_performance_stats(24); cost = db.get_cost_summary()
    with _active_lock: af = len(_active_jobs)
    return {"queued": snap["depth"], "running": snap["running"], "active_threads": af,
            "done_24h": snap["done_24h"], "error_24h": snap["error_24h"], "paused": _paused,
            "avg_latency_ms": perf["avg_latency_ms"], "p95_latency_ms": perf["p95_lat_ms"],
            "error_rate": perf["error_rate"], "cost_today_usd": cost["today_usd"]}

def get_cost_summary() -> dict:
    return db.get_cost_summary()
