"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Autoscaler (Production)
Monitors queue depth and spins up / shuts down workers on demand.

Scale-UP  trigger:  queue depth > autoscale_threshold setting
Scale-DOWN trigger:  worker idle_since > idle_worker_timeout setting

How it works:
  - Runs as a background thread polling every POLL_INTERVAL seconds
  - When queue depth exceeds threshold, calls AUTOSCALE_SPAWN_URL to provision
    a new worker (configurable webhook/API call to your infra)
  - When a worker has been idle past timeout, calls /drain + deregister
  - All thresholds are read live from DB settings (hot-reloadable)
  - Respects license limits (max_cpu / max_gpu from enforcement module)

Spawn integration options (set AUTOSCALE_SPAWN_TYPE env var):
  docker   — run docker container (same node)
  webhook  — POST to external URL (Kubernetes HPA, Nomad, ECS, etc.)
  noop     — just log (testing / managed externally)
"""
from __future__ import annotations

import json, logging, os, subprocess, threading, time, urllib.request, urllib.error
from typing import Dict, List, Optional

import database as db

logger = logging.getLogger("orchestra.autoscaler")

POLL_INTERVAL     = int(os.environ.get("AUTOSCALE_POLL_INTERVAL",  "15"))   # seconds
SPAWN_TYPE        = os.environ.get("AUTOSCALE_SPAWN_TYPE",         "noop")  # docker|webhook|noop
WEBHOOK_URL       = os.environ.get("AUTOSCALE_WEBHOOK_URL",        "")
WEBHOOK_TOKEN     = os.environ.get("AUTOSCALE_WEBHOOK_TOKEN",      "")
ORCHESTRA_URL     = os.environ.get("ORCHESTRA_CORE_URL",           "http://orchestra-core:8080")
CONSOLE_TOKEN     = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD",   "orchestra-console")
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
        if not enabled:
            return

        threshold  = int(db.get_setting("autoscale_threshold", "20"))
        max_cpu    = int(db.get_setting("autoscale_max_cpu", "10"))
        max_gpu    = int(db.get_setting("autoscale_max_gpu", "4"))
        idle_to    = int(db.get_setting("idle_worker_timeout", "300"))
        now        = time.time()

        snapshot   = db.get_queue_snapshot()
        queue_depth = snapshot.get("depth", 0)
        running     = snapshot.get("running", 0)
        workers     = db.get_active_workers()
        cpu_workers = [w for w in workers if w.get("worker_type") == "cpu"]
        gpu_workers = [w for w in workers if w.get("worker_type") == "gpu"]

        # ── Scale UP ─────────────────────────────────────────────────────────
        if (queue_depth > threshold
                and now - self._last_scale_up > SCALE_COOLDOWN):
            if len(cpu_workers) < max_cpu:
                logger.info(f"↑ Scale UP: queue={queue_depth} > threshold={threshold}, "
                            f"cpu_workers={len(cpu_workers)}/{max_cpu}")
                success = self._spawn_worker("cpu")
                if success:
                    self._last_scale_up = now
                    db.record_metric("autoscale_up", 1, {"type": "cpu"})

        # ── Scale DOWN (idle workers) ─────────────────────────────────────────
        if now - self._last_scale_down > SCALE_COOLDOWN:
            idle = db.get_idle_workers(idle_threshold_sec=idle_to)
            for worker in idle:
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
        if SPAWN_TYPE == "docker":
            return self._spawn_docker(worker_type)
        elif SPAWN_TYPE == "webhook":
            return self._spawn_webhook(worker_type)
        else:
            logger.info(f"[noop] Would spawn {worker_type} worker")
            return True

    def _spawn_docker(self, worker_type: str) -> bool:
        image  = WORKER_CPU_IMAGE if worker_type == "cpu" else WORKER_GPU_IMAGE
        port   = self._find_free_port(7891, 7990)
        env    = {
            "ORCHESTRA_CORE_URL":          ORCHESTRA_URL,
            "ORCHESTRA_CONSOLE_PASSWORD":  CONSOLE_TOKEN,
            "WORKER_PORT":                 str(port),
            "NODE_ID":                     f"autoscale-{int(time.time())}",
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
        endpoint  = worker.get("base_url", "")

        # Mark draining in DB
        db.ex("UPDATE workers SET status='draining' WHERE id=?", (worker_id,))

        # Ask worker to deregister
        if endpoint:
            try:
                req = urllib.request.Request(
                    f"{endpoint}/shutdown",
                    data=b"{}",
                    headers={"Content-Type": "application/json"},
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
            "scale_cooldown":     SCALE_COOLDOWN,
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
