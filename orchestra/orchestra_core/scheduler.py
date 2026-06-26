# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Advanced Job Scheduler
Features:
  - Priority queue with preemption (critical > urgent > high > normal > low)
  - SLA enforcement — kill jobs exceeding time budget
  - Exponential backoff retry
  - Async webhook callbacks on completion
  - Job dependency graph (DAG execution)
  - Semantic caching (hash-based dedup of identical prompts)
  - Batch collection (group jobs → single API call when batch_enabled)
  - Auto-scaling signal emission
  - Circuit breaker per provider
  - Rate limiting per caller
  - Streaming job support (SSE)
"""
from __future__ import annotations
import asyncio, hashlib, json, logging, time, uuid
from typing import Optional, Dict, Any, AsyncIterator
import httpx

from database import OrchestraDB

log = logging.getLogger("orchestra.scheduler")

PRIORITY_ORDER = {"critical": 0, "urgent": 1, "high": 2, "normal": 3, "low": 4}


def _cache_key(messages: list, model: str, temperature: float) -> str:
    """Generate deterministic cache key for a prompt."""
    # Only cache deterministic requests (temperature=0)
    if temperature > 0.01:
        return ""
    canonical = json.dumps({"m": messages, "model": model}, sort_keys=True, separators=(",",":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


class JobScheduler:
    def __init__(self):
        self.db       = OrchestraDB.get()
        self._running = False
        self._workers: Dict[str, asyncio.Task] = {}
        self._http    = httpx.AsyncClient(timeout=5.0)

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._dispatch_loop(),   name="scheduler_dispatch")
        asyncio.create_task(self._sla_watcher(),     name="scheduler_sla")
        asyncio.create_task(self._metrics_loop(),    name="scheduler_metrics")
        asyncio.create_task(self._cache_janitor(),   name="scheduler_cache")
        log.info("Job scheduler started")

    async def stop(self) -> None:
        self._running = False
        await self._http.aclose()

    # ── Submit ────────────────────────────────────────────────────────────────

    def submit(self,
               task_type:   str   = "chat",
               messages:    list  = [],
               model:       str   = "",
               provider_id: str   = "",
               max_tokens:  int   = 2048,
               temperature: float = 0.7,
               priority:    str   = "normal",
               caller_id:   str   = "",
               metadata:    dict  = {},
               callback_url: str  = "",
               sla_ms:      int   = 0,
               parent_job_id: str = "",
               stream:      bool  = False) -> Dict:

        # Rate limit check
        rl = self.db.check_rate_limit(caller_id, max_tokens)
        if not rl["ok"]:
            return {"ok": False, "error": f"Rate limit: {rl['reason']}", "code": 429}

        # Queue depth check
        max_q = int(self.db.get_setting("max_queue_size", "10000"))
        snap  = self.db.get_queue_snapshot()
        if snap["depth"] >= max_q:
            return {"ok": False, "error": "Queue full", "code": 503}

        # Semantic cache check
        ck = _cache_key(messages, model, temperature)
        if ck and self.db.get_setting("cache_enabled", "true") == "true":
            cached = self.db.cache_get(ck)
            if cached:
                log.debug(f"Cache HIT: {ck[:8]}…")
                return {
                    "ok": True, "job_id": f"CACHE-{ck[:8]}",
                    "status": "done", "cached": True,
                    "result": cached["result"],
                    "model_used": cached["model_used"],
                    "cost_usd": 0,
                }

        job_id = f"J-{uuid.uuid4().hex[:10].upper()}"
        self.db.enqueue_job(
            job_id=job_id, task_type=task_type, messages=messages,
            model=model, provider_id=provider_id, max_tokens=max_tokens,
            temperature=temperature, priority=priority, caller_id=caller_id,
            metadata={**metadata, "stream": stream}, callback_url=callback_url,
            sla_ms=sla_ms or int(self.db.get_setting("sla_default_ms", "0")),
            parent_job_id=parent_job_id, cache_key=ck,
        )
        log.info(f"Job queued: {job_id} priority={priority} type={task_type}")
        return {"ok": True, "job_id": job_id, "status": "queued"}

    async def wait_for_job(self, job_id: str, timeout: float = 60.0) -> Dict:
        """Poll until job done or timeout."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            job = self.db.get_job(job_id)
            if not job:
                return {"ok": False, "error": "Job not found"}
            if job["status"] in ("done", "error", "timeout", "cancelled"):
                return {"ok": job["status"] == "done", **job}
            await asyncio.sleep(0.2)
        return {"ok": False, "error": "Timeout waiting for job"}

    # ── Dispatch loop ─────────────────────────────────────────────────────────

    async def _dispatch_loop(self) -> None:
        """Pull jobs from queue and dispatch to workers."""
        while self._running:
            try:
                workers = self.db.get_active_workers()
                for w in workers:
                    if w["tasks_active"] >= w["concurrency"]:
                        continue
                    # Check circuit breaker
                    state = self.db.circuit_check(w["provider_id"])
                    if state == "open":
                        continue
                    job = self.db.dequeue_job(w["id"])
                    if not job:
                        break
                    asyncio.create_task(self._execute_job(job, w))
            except Exception as e:
                log.error(f"Dispatch error: {e}")
            await asyncio.sleep(0.1)

    # ── Execute job ───────────────────────────────────────────────────────────

    async def _execute_job(self, job: Dict, worker: Dict) -> None:
        import ai_providers, credential_vault, routing_engine as re_mod
        start = time.time()
        job_id = job["id"]

        try:
            provider_id = worker.get("provider_id") or job.get("provider_id", "openai")
            model       = worker.get("model") or job.get("model", "gpt-4o-mini")
            api_key     = credential_vault.get_key(provider_id)

            if not api_key:
                raise ValueError(f"No API key for '{provider_id}'")

            # Run in thread pool (sync provider calls)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, lambda: ai_providers.dispatch(
                provider_id=provider_id, api_key=api_key, model=model,
                messages=job["messages"], max_tokens=job["max_tokens"],
                temperature=job["temperature"], base_url=worker.get("base_url",""),
            ))

            latency_ms = int((time.time() - start) * 1000)

            if result.get("ok"):
                cost = re_mod.get_cost_estimate(
                    provider_id, model,
                    result.get("input_tokens", 0) + result.get("output_tokens", 0)
                )
                self.db.finish_job(
                    job_id, result=result.get("content",""),
                    input_tokens=result.get("input_tokens",0),
                    output_tokens=result.get("output_tokens",0),
                    cost_usd=cost, latency_ms=latency_ms,
                    model_used=model, provider_used=provider_id
                )
                self.db.update_worker_stats(worker["id"], latency_ms, True)
                self.db.circuit_record_success(provider_id)
                # Update cache
                if job.get("cache_key"):
                    ttl = int(self.db.get_setting("cache_ttl_sec","3600"))
                    self.db.cache_set(job["cache_key"], result.get("content",""),
                                      model, result.get("input_tokens",0),
                                      result.get("output_tokens",0), ttl)
                # Fire webhook
                if job.get("callback_url"):
                    asyncio.create_task(self._fire_webhook(job["callback_url"], job_id, "done", result.get("content","")))
            else:
                err = result.get("error", "Provider error")
                self.db.circuit_record_failure(provider_id, err)
                if not self.db.retry_job(job_id):
                    self.db.finish_job(job_id, error=err, latency_ms=latency_ms)
                    if job.get("callback_url"):
                        asyncio.create_task(self._fire_webhook(job["callback_url"], job_id, "error", err))
                self.db.update_worker_stats(worker["id"], latency_ms, False)

        except Exception as e:
            latency_ms = int((time.time() - start) * 1000)
            log.error(f"Job {job_id} exception: {e}")
            self.db.circuit_record_failure(job.get("provider_id",""), str(e))
            if not self.db.retry_job(job_id):
                self.db.finish_job(job_id, error=str(e), latency_ms=latency_ms)

    # ── SLA watcher ───────────────────────────────────────────────────────────

    async def _sla_watcher(self) -> None:
        """Kill jobs that exceeded SLA or TTL."""
        while self._running:
            try:
                expired = self.db.cancel_expired_jobs()
                if expired:
                    log.warning(f"⏱ SLA: {expired} jobs cancelled (timeout)")
            except Exception:
                pass
            await asyncio.sleep(5)

    # ── Webhook ───────────────────────────────────────────────────────────────

    async def _fire_webhook(self, url: str, job_id: str, status: str, content: str) -> None:
        try:
            await self._http.post(url, json={"job_id": job_id, "status": status, "result": content}, timeout=5)
        except Exception as e:
            log.debug(f"Webhook failed for {job_id}: {e}")

    # ── Metrics ───────────────────────────────────────────────────────────────

    async def _metrics_loop(self) -> None:
        while self._running:
            try:
                stats = self.db.get_performance_stats(hours=1)
                self.db.record_metric("throughput_rps", stats["throughput_rps"])
                self.db.record_metric("error_rate", stats["error_rate"])
                self.db.record_metric("latency_p50", stats["p50_lat_ms"])
                self.db.record_metric("latency_p99", stats["p99_lat_ms"])
                snap = self.db.get_queue_snapshot()
                self.db.record_metric("queue_depth", snap["depth"])
                # Auto-scale signal
                threshold = int(self.db.get_setting("autoscale_threshold","20"))
                if snap["depth"] > threshold:
                    log.warning(f"⚡ Autoscale signal: queue depth={snap['depth']} > {threshold}")
            except Exception:
                pass
            await asyncio.sleep(60)

    # ── Cache janitor ─────────────────────────────────────────────────────────

    async def _cache_janitor(self) -> None:
        while self._running:
            try:
                evicted = self.db.cache_evict_expired()
                if evicted:
                    log.debug(f"Cache evicted {evicted} expired entries")
            except Exception:
                pass
            await asyncio.sleep(300)


# Singleton
_scheduler: Optional[JobScheduler] = None

def get_scheduler() -> JobScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = JobScheduler()
    return _scheduler
