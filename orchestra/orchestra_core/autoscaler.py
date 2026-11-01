# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Autoscaler (Production)
Monitors queue depth and spins up / shuts down workers on demand.

Scale-UP  trigger:  queue depth > autoscale_threshold setting (CPU), or the
                    average GPU load above the console's "up" % (GPU)
Scale-DOWN trigger:  worker idle_since > idle_worker_timeout setting, or the
                    average GPU load below the console's "down" % — never
                    below the console's minimum GPU workers
Cooldown, load thresholds and the minimum come from autoscale_config.py.

How it works:
  - Runs as a background thread polling every POLL_INTERVAL seconds
  - When queue depth exceeds threshold, calls AUTOSCALE_SPAWN_URL to provision
    a new worker (configurable webhook/API call to your infra)
  - When a worker has been idle past timeout, calls /drain + deregister
  - All thresholds are read live from DB settings (hot-reloadable)
  - Respects license limits (max_cpu / max_gpu from enforcement module)

Spawn integration options (AUTOSCALE_SPAWN_TYPE; default: scaler when
ORCHESTRA_SCALER_URL is set, else noop):
  scaler   — the orchestra-scaler service starts/stops AXTO worker containers on this
             computer, one GPU each, on the GPU with the most room (REQUESTS 136 G4)
  docker   — legacy: run docker here (needs the docker CLI and socket in this container)
  webhook  — POST to external URL (Kubernetes HPA, Nomad, ECS, etc.)
  noop     — nothing is started (managed externally); no scale event is recorded
Scale-down only ever stops workers the scaler started; the workers AXTO Setup started are
the base the minimum counts on. With no GPU worker and GPU jobs waiting, a GPU worker is
started from zero when its image is installed.
"""
from __future__ import annotations

import json, logging, os, subprocess, threading, time, urllib.request, urllib.error
from typing import Dict, List, Optional

import autoscale_config
import database as db
import enforcement
import scaler_client

logger = logging.getLogger("orchestra.autoscaler")

POLL_INTERVAL     = int(os.environ.get("AUTOSCALE_POLL_INTERVAL",  "15"))   # seconds
SPAWN_TYPE        = os.environ.get("AUTOSCALE_SPAWN_TYPE") or ("scaler" if os.environ.get("ORCHESTRA_SCALER_URL") else "noop")
GPU_JOB_TYPES     = ("image", "transcribe", "embedding")   # job_router._GPU_NATIVE_TASKS
WEBHOOK_URL       = os.environ.get("AUTOSCALE_WEBHOOK_URL",        "")
WEBHOOK_TOKEN     = os.environ.get("AUTOSCALE_WEBHOOK_TOKEN",      "")
ORCHESTRA_URL     = os.environ.get("ORCHESTRA_CORE_URL",           "http://orchestra-core:8080")
CONSOLE_TOKEN     = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD",   "")
WORKER_CPU_IMAGE  = os.environ.get("AUTOSCALE_CPU_IMAGE",  "axto/orchestra-worker-cpu:latest")
WORKER_GPU_IMAGE  = os.environ.get("AUTOSCALE_GPU_IMAGE",  "axto/orchestra-worker-gpu:latest")
SCALE_COOLDOWN    = int(os.environ.get("AUTOSCALE_COOLDOWN", "60"))  # min seconds between scale events


class Autoscaler:
    def __init__(self):
        self._running       = False
        self._thread: Optional[threading.Thread] = None
        self._last_scale_up   = 0.0
        self._last_scale_down = 0.0
        self._spawned_containers: List[str] = []  # container IDs we launched

    def start(self) -> None:
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True, name="autoscaler")
        self._thread.start()
        logger.info(f"Autoscaler started (poll={POLL_INTERVAL}s, spawn={SPAWN_TYPE})")

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    # ── Main loop ─────────────────────────────────────────────────────────────

    def _loop(self) -> None:
        while self._running:
            try:
                self._tick()
            except Exception as e:
                logger.error(f"Autoscaler tick error: {e}")
            time.sleep(POLL_INTERVAL)

    def _tick(self) -> None:
        enabled   = db.get_setting("autoscale_enabled", "false").lower() == "true"
        # Autoscaling is an edition feature (Starter: off) — the switch alone is not enough.
        if not enabled or not enforcement.has_feature("autoscaler"):
            return

        threshold  = int(db.get_setting("autoscale_threshold", "20"))
        max_cpu    = int(db.get_setting("autoscale_max_cpu", "10"))
        max_gpu    = int(db.get_setting("autoscale_max_gpu", "4"))
        idle_to    = int(db.get_setting("idle_worker_timeout", "300"))
        cfg        = autoscale_config.get_config()
        cooldown   = cfg["cool"]
        now        = time.time()

        snapshot   = db.get_queue_snapshot()
        queue_depth = snapshot.get("depth", 0)
        running     = snapshot.get("running", 0)
        workers     = db.get_active_workers()
        cpu_workers = [w for w in workers if w.get("worker_type") == "cpu"]
        gpu_workers = [w for w in workers if w.get("worker_type") == "gpu"]
        gpu_live    = [w for w in gpu_workers if w.get("status") == "active"]
        # Busy = our task slots or the GPU's own utilisation, whichever is higher (G1 telemetry).
        gpu_load    = (sum(max(w.get("load_pct") or 0, w.get("util_pct") or 0) for w in gpu_live) / len(gpu_live)) if gpu_live else 0
        gpu_waiting = (db.q1("SELECT COUNT(*) AS n FROM jobs WHERE status='queued' AND task_type IN (?,?,?)",
                             GPU_JOB_TYPES) or {}).get("n", 0) if not gpu_live else 0

        # ── Scale UP ─────────────────────────────────────────────────────────
        if now - self._last_scale_up > cooldown:
            # Never beyond the edition's worker limit, whatever autoscale_max_* says.
            if (queue_depth > threshold
                    and len(cpu_workers) < min(max_cpu, enforcement.worker_limit("cpu"))):
                logger.info(f"↑ Scale UP: queue={queue_depth} > threshold={threshold}, "
                            f"cpu_workers={len(cpu_workers)}/{max_cpu}")
                if self._spawn_worker("cpu"):
                    self._last_scale_up = now
                    db.record_metric("autoscale_up", 1, {"type": "cpu"})
            elif (((gpu_live and gpu_load > cfg["up"]) or (not gpu_live and gpu_waiting > 0))
                    and enforcement.has_feature("gpu_workers")
                    and len(gpu_workers) < min(max_gpu, enforcement.worker_limit("gpu"))):
                why = (f"GPU load {gpu_load:.0f}% > {cfg['up']}%" if gpu_live
                       else f"{gpu_waiting} GPU job(s) waiting and no GPU worker (scale from zero)")
                logger.info(f"↑ Scale UP: {why}, gpu_workers={len(gpu_workers)}/{max_gpu}")
                if self._spawn_worker("gpu"):
                    self._last_scale_up = now
                    db.record_metric("autoscale_up", 1, {"type": "gpu", "from_zero": not gpu_live})

        # ── Scale DOWN (idle workers; GPUs never below the console's minimum) ──
        if now - self._last_scale_down > cooldown:
            idle = db.get_idle_workers(idle_threshold_sec=idle_to)
            if gpu_live and gpu_load < cfg["down"]:
                # Low GPU load: an idle GPU may go before its idle timeout.
                idle += [w for w in db.get_idle_workers(idle_threshold_sec=0)
                         if w.get("worker_type") == "gpu" and w not in idle]
            for worker in idle:
                if worker.get("worker_type") == "gpu" and len(gpu_workers) <= cfg["min"]:
                    continue
                if SPAWN_TYPE == "scaler" and not scaler_client.is_scaled(worker):
                    continue   # AXTO Setup's base workers stay; only scaled ones are stopped
                logger.info(f"↓ Scale DOWN: worker {worker['id']} idle >{idle_to}s")
                self._drain_worker(worker)
                self._last_scale_down = now
                db.record_metric("autoscale_down", 1, {"worker_id": worker["id"]})
                break  # one at a time, re-check next tick

        # ── Record metrics ────────────────────────────────────────────────────
        db.record_metric("queue_depth",  queue_depth)
        db.record_metric("cpu_workers",  len(cpu_workers))
        db.record_metric("gpu_workers",  len(gpu_workers))
        db.record_metric("jobs_running", running)

    # ── Spawn worker ──────────────────────────────────────────────────────────

    def _spawn_worker(self, worker_type: str = "cpu") -> bool:
        if SPAWN_TYPE == "scaler":
            return self._spawn_scaler(worker_type)
        if SPAWN_TYPE == "docker":
            return self._spawn_docker(worker_type)
        elif SPAWN_TYPE == "webhook":
            return self._spawn_webhook(worker_type)
        else:
            logger.info(f"[noop] Would spawn {worker_type} worker (nothing started)")
            return False

    def _spawn_scaler(self, worker_type: str) -> bool:
        """One more worker through orchestra-scaler, a GPU worker on the GPU with the most room."""
        workers = db.get_active_workers()
        if worker_type == "cpu":
            kind, index = "cpu", None
        else:
            gpus = [w for w in workers if w.get("worker_type") == "gpu"]
            kind = scaler_client.kind_for(gpus[0]) if gpus else db.get_setting("gpu_worker_kind", "") or ""
            try:
                h = scaler_client.health()
                if not kind:
                    images = h.get("images") or {}
                    kind = "gpu" if images.get("gpu") else "gpu-amd" if images.get("gpu-amd") else "gpu"
                scaled = scaler_client.listed()
            except scaler_client.ScalerError:
                scaled = []
            index = scaler_client.pick_gpu(workers, kind, scaled, autoscale_config.get_config()["crit"])
        try:
            r = scaler_client.spawn(kind, index)
            self._spawned_containers.append(r.get("name", ""))
            logger.info(f"Scaler started {r.get('name')} ({kind}, GPU {index if index is not None else 'all'})")
            return True
        except scaler_client.ScalerError as e:
            logger.warning(f"Scaler could not start a {kind} worker: {e}")
            db.record_metric("autoscale_failed", 1, {"type": worker_type, "error": str(e)[:200]})
            return False

    def _spawn_docker(self, worker_type: str) -> bool:
        image  = WORKER_CPU_IMAGE if worker_type == "cpu" else WORKER_GPU_IMAGE
        port   = self._find_free_port(7891, 7990)
        env    = {
            "ORCHESTRA_CORE_URL":          ORCHESTRA_URL,
            "ORCHESTRA_CONSOLE_PASSWORD":  CONSOLE_TOKEN,
            "WORKER_PORT":                 str(port),
            "NODE_ID":                     f"autoscale-{int(time.time())}",
            # GPU workers need WORKER_SELF_URL so orchestra-core can POST tasks to /run.
            # --network=host is used, so localhost:{port} is reachable from orchestra-core.
            "WORKER_SELF_URL":             f"http://localhost:{port}",
        }
        cmd = ["docker", "run", "-d", "--rm", "--network=host"]
        for k, v in env.items():
            cmd += ["-e", f"{k}={v}"]
        if worker_type == "gpu":
            cmd += ["--gpus", "all"]
        cmd.append(image)
        try:
            out = subprocess.check_output(cmd, timeout=30, stderr=subprocess.STDOUT)
            cid = out.decode().strip()
            self._spawned_containers.append(cid)
            logger.info(f"Docker {worker_type} worker spawned: {cid[:12]}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Docker spawn failed: {e.output.decode()[:200]}")
            return False

    def _spawn_webhook(self, worker_type: str) -> bool:
        if not WEBHOOK_URL:
            logger.warning("AUTOSCALE_WEBHOOK_URL not set")
            return False
        payload = json.dumps({"action": "spawn", "worker_type": worker_type,
                              "orchestra_url": ORCHESTRA_URL}).encode()
        headers = {"Content-Type": "application/json"}
        if WEBHOOK_TOKEN:
            headers["Authorization"] = f"Bearer {WEBHOOK_TOKEN}"
        try:
            req = urllib.request.Request(WEBHOOK_URL, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r:
                resp = json.loads(r.read())
                logger.info(f"Webhook spawn OK: {resp}")
                return True
        except Exception as e:
            logger.error(f"Webhook spawn failed: {e}")
            return False

    # ── Drain worker ──────────────────────────────────────────────────────────

    def _drain_worker(self, worker: dict) -> None:
        """Gracefully deregister an idle worker."""
        worker_id = worker.get("id", "")
        # Use worker_url (own FastAPI endpoint) for shutdown, not base_url (Ollama).
        # Fall back to base_url for CPU workers that don't have worker_url.
        endpoint  = worker.get("worker_url") or worker.get("base_url", "")

        # Mark draining in DB
        db.ex("UPDATE workers SET status='draining' WHERE id=?", (worker_id,))

        # A worker the scaler started: stop its container (SIGTERM — running jobs finish).
        name = scaler_client.container_of(worker)
        if SPAWN_TYPE == "scaler" and name:
            try:
                scaler_client.stop(name)
                db.remove_worker(worker_id)
                logger.info(f"Worker {worker_id} ({name}) stopped by the scaler")
                return
            except scaler_client.ScalerError as e:
                logger.warning(f"Scaler could not stop {name}: {e}")

        # Ask worker to deregister
        if endpoint:
            try:
                req = urllib.request.Request(
                    f"{endpoint}/shutdown",
                    data=b"{}",
                    headers={"Content-Type": "application/json",
                             "X-Orchestra-Worker-Token": os.environ.get("ORCHESTRA_WORKER_TOKEN", "")},
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=5)
            except Exception:
                pass  # Worker may already be gone

        # Remove from DB
        db.remove_worker(worker_id)
        logger.info(f"Worker {worker_id} drained and removed")

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _find_free_port(start: int, end: int) -> int:
        import socket
        for port in range(start, end):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(("0.0.0.0", port))
                    return port
                except OSError:
                    continue
        return start

    def get_status(self) -> dict:
        return {
            "enabled":            db.get_setting("autoscale_enabled", "false") == "true",
            "spawn_type":         SPAWN_TYPE,
            "spawned_containers": len(self._spawned_containers),
            "poll_interval":      POLL_INTERVAL,
            "scale_cooldown":     autoscale_config.get_config()["cool"],
            "last_scale_up":      self._last_scale_up,
            "last_scale_down":    self._last_scale_down,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_autoscaler: Optional[Autoscaler] = None


def get_autoscaler() -> Autoscaler:
    global _autoscaler
    if _autoscaler is None:
        _autoscaler = Autoscaler()
    return _autoscaler
