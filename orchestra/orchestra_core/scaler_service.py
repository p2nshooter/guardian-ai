# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — Scaler: the one part that talks to Docker (REQUESTS 136, BLUEPRINT-V4 §31.F G4).

Orchestra Core asks it, over the internal network and with the worker token, to start
or stop worker containers; it never touches anything else:

  GET    /health                 alive, Docker reachable, which worker images are installed
  GET    /workers                the worker containers it started (label io.axto.orchestra.scaled)
  POST   /workers                {"kind": "cpu" | "gpu" | "gpu-amd", "gpu_index": 0 | null}
  DELETE /workers/{name}         stop one it started (the worker drains: running jobs finish)

Rules it enforces whatever it is asked:
  - only the AXTO worker images (axto/orchestra-worker-cpu, -gpu, -gpu-amd), and only
    when they are already installed on this computer (no pulls from anywhere);
  - only containers carrying its own label can be stopped;
  - the containers join this Orchestra's own network and data volume, found by inspecting
    the scaler's own container — no secrets in their configuration (workers read the
    token from the shared data volume, read-only);
  - one GPU per container when a GPU index is given (NVIDIA: device request; AMD: its
    render node), auto-removed when stopped, at most SCALER_MAX at a time.

Run from the orchestra-core image:  python scaler_service.py   (compose service orchestra-scaler)
Same on Windows (Docker Desktop) and Linux: both expose /var/run/docker.sock to Linux containers.
"""
from __future__ import annotations

import hmac
import http.client
import json
import logging
import os
import re
import secrets
import socket
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).parent))
try:
    import settings as _settings
    _settings.apply(generate=False)   # the worker token from orchestra.yml / the data volume
except Exception:
    pass

from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger("orchestra.scaler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")

DOCKER_SOCK = os.environ.get("DOCKER_SOCK", "/var/run/docker.sock")
SCALER_PORT = int(os.environ.get("SCALER_PORT", "7899"))
SCALER_MAX = int(os.environ.get("SCALER_MAX", "16"))
LABEL = "io.axto.orchestra.scaled"
IMAGES = {
    "cpu": "axto/orchestra-worker-cpu:latest",
    "gpu": "axto/orchestra-worker-gpu:latest",
    "gpu-amd": "axto/orchestra-worker-gpu-amd:latest",
}
WORKER_PORT = {"cpu": 7891, "gpu": 7892, "gpu-amd": 7892}


class DockerError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


class _UnixConnection(http.client.HTTPConnection):
    def __init__(self, path: str, timeout: float = 30):
        super().__init__("localhost", timeout=timeout)
        self._path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self._path)


class Docker:
    """The few Docker Engine API calls the scaler needs, over the local socket."""

    def __init__(self, sock: str = DOCKER_SOCK):
        self.sock = sock

    def call(self, method: str, path: str, body: Optional[dict] = None, timeout: float = 30):
        conn = _UnixConnection(self.sock, timeout=timeout)
        try:
            data = json.dumps(body).encode() if body is not None else None
            conn.request(method, "/v1.41" + path, body=data,
                         headers={"Content-Type": "application/json"} if data else {})
            r = conn.getresponse()
            raw = r.read()
            payload = json.loads(raw) if raw and raw[:1] in (b"{", b"[") else raw.decode("utf-8", "replace")
            if r.status >= 400:
                msg = payload.get("message") if isinstance(payload, dict) else str(payload)
                raise DockerError(r.status, msg or f"HTTP {r.status}")
            return payload
        finally:
            conn.close()

    def image_installed(self, ref: str) -> bool:
        try:
            self.call("GET", f"/images/{quote(ref, safe='')}/json")
            return True
        except DockerError as e:
            if e.status == 404:
                return False
            raise

    def scaled(self) -> list[dict]:
        flt = quote(json.dumps({"label": [LABEL]}), safe="")
        return self.call("GET", f"/containers/json?all=1&filters={flt}")

    def inspect(self, ref: str) -> dict:
        return self.call("GET", f"/containers/{quote(ref, safe='')}/json")


def own_context(docker: Docker) -> dict:
    """This Orchestra's network and volumes, read from the scaler's own container."""
    ctx = {"network": os.environ.get("SCALER_NETWORK", ""), "data": os.environ.get("SCALER_DATA_VOLUME", ""),
           "models": os.environ.get("SCALER_MODELS_VOLUME", ""), "project": os.environ.get("SCALER_PROJECT", "")}
    try:
        me = docker.inspect(socket.gethostname())
        nets = list((me.get("NetworkSettings") or {}).get("Networks") or {})
        ctx["network"] = ctx["network"] or (nets[0] if nets else "")
        for m in me.get("Mounts") or []:
            if m.get("Destination") == "/app/data" and m.get("Name"):
                ctx["data"] = ctx["data"] or m["Name"]
        labels = (me.get("Config") or {}).get("Labels") or {}
        ctx["project"] = ctx["project"] or labels.get("com.docker.compose.project", "")
    except Exception as e:
        logger.warning(f"could not inspect the scaler's own container ({e}); using SCALER_* settings")
    if ctx["data"] and not ctx["models"]:
        ctx["models"] = re.sub(r"orchestra-data$", "orchestra-models", ctx["data"])
    return ctx


def container_spec(kind: str, name: str, ctx: dict, gpu_index: Optional[int] = None) -> dict:
    """Create-container body for one worker. Nothing secret goes in it."""
    port = WORKER_PORT[kind]
    env = [
        "ORCHESTRA_CORE_URL=http://orchestra-core:8080",
        f"WORKER_PORT={port}",
        f"NODE_ID=scaled-{name}",
        f"WORKER_SELF_URL=http://{name}:{port}",
        f"WORKER_LABEL={'CPU' if kind == 'cpu' else 'GPU'} worker (scaled{'' if gpu_index is None else f', GPU {gpu_index}'})",
        "HF_HOME=/app/models",
        f"OLLAMA_BASE_URL={os.environ.get('OLLAMA_BASE_URL', 'http://host.docker.internal:11434')}",
    ]
    binds = []
    if ctx.get("data"):
        binds.append(f"{ctx['data']}:/app/data:ro")
    if kind != "cpu" and ctx.get("models"):
        binds.append(f"{ctx['models']}:/app/models")
    host = {
        "AutoRemove": True,
        "RestartPolicy": {"Name": "no"},
        "Binds": binds,
        "ExtraHosts": ["host.docker.internal:host-gateway"],
        "LogConfig": {"Type": "json-file", "Config": {"max-size": "10m", "max-file": "3"}},
    }
    if ctx.get("network"):
        host["NetworkMode"] = ctx["network"]
    if kind == "gpu":
        req = {"Driver": "nvidia", "Capabilities": [["gpu"]]}
        if gpu_index is None:
            req["Count"] = -1
        else:
            req["DeviceIDs"] = [str(gpu_index)]
        host["DeviceRequests"] = [req]
    elif kind == "gpu-amd":
        render = "/dev/dri" if gpu_index is None else f"/dev/dri/renderD{128 + gpu_index}"
        host["Devices"] = [{"PathOnHost": p, "PathInContainer": p, "CgroupPermissions": "rwm"}
                           for p in ("/dev/kfd", render)]
        host["GroupAdd"] = ["video"]
    labels = {LABEL: "1", "io.axto.orchestra.kind": kind,
              "io.axto.orchestra.gpu": "all" if gpu_index is None else str(gpu_index)}
    if ctx.get("project"):
        labels["io.axto.orchestra.project"] = ctx["project"]
    return {"Image": IMAGES[kind], "Env": env, "Labels": labels, "HostConfig": host,
            "ExposedPorts": {f"{port}/tcp": {}}}


def _view(c: dict) -> dict:
    labels = c.get("Labels") or {}
    names = c.get("Names") or []
    return {"name": names[0].lstrip("/") if names else c.get("Id", "")[:12], "id": c.get("Id", "")[:12],
            "kind": labels.get("io.axto.orchestra.kind", ""), "gpu": labels.get("io.axto.orchestra.gpu", ""),
            "state": c.get("State", ""), "status": c.get("Status", "")}


# ── HTTP API ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Orchestra Scaler", version="1.0.0", docs_url=None, redoc_url=None)
docker = Docker()


def _require_core(request: Request):
    token = os.environ.get("ORCHESTRA_WORKER_TOKEN", "")
    got = request.headers.get("X-Orchestra-Worker-Token", "")
    if not token or not got or not hmac.compare_digest(got, token):
        raise HTTPException(401, "Orchestra Core worker token required")


class SpawnReq(BaseModel):
    kind: str
    gpu_index: Optional[int] = None


@app.get("/health")
def health():
    try:
        installed = {k: docker.image_installed(v) for k, v in IMAGES.items()}
        return {"ok": True, "docker": True, "images": installed, "max": SCALER_MAX,
                "running": len([c for c in docker.scaled() if c.get("State") == "running"])}
    except Exception as e:
        return {"ok": True, "docker": False, "error": str(e), "images": {}, "max": SCALER_MAX, "running": 0}


@app.get("/workers", dependencies=[Depends(_require_core)])
def list_workers():
    return {"workers": [_view(c) for c in docker.scaled()]}


@app.post("/workers", dependencies=[Depends(_require_core)], status_code=201)
def spawn(req: SpawnReq):
    if req.kind not in IMAGES:
        raise HTTPException(400, f"kind must be one of {', '.join(IMAGES)}")
    if req.gpu_index is not None and (req.kind == "cpu" or not 0 <= req.gpu_index < 64):
        raise HTTPException(400, "gpu_index is for GPU workers, 0–63")
    try:
        running = [c for c in docker.scaled() if c.get("State") in ("running", "created", "restarting")]
        if len(running) >= SCALER_MAX:
            raise HTTPException(409, f"already {len(running)} scaled workers (SCALER_MAX {SCALER_MAX})")
        if not docker.image_installed(IMAGES[req.kind]):
            raise HTTPException(409, f"{IMAGES[req.kind]} is not installed on this computer — "
                                     "add it with AXTO Setup (Update), then scale again")
        name = f"orchestra-scaled-{req.kind}-{'all' if req.gpu_index is None else req.gpu_index}-{secrets.token_hex(3)}"
        spec = container_spec(req.kind, name, own_context(docker), req.gpu_index)
        created = docker.call("POST", f"/containers/create?name={name}", spec)
        docker.call("POST", f"/containers/{created['Id']}/start")
        logger.info(f"started {name} ({IMAGES[req.kind]}, GPU {req.gpu_index if req.gpu_index is not None else 'all'})")
        return {"name": name, "id": created["Id"][:12], "kind": req.kind, "gpu_index": req.gpu_index}
    except DockerError as e:
        raise HTTPException(502, f"Docker refused: {e}")


@app.delete("/workers/{name}", dependencies=[Depends(_require_core)])
def stop(name: str):
    if not re.fullmatch(r"orchestra-scaled-[a-z-]+-(all|\d+)-[0-9a-f]{6}", name):
        raise HTTPException(400, "not a scaled worker name")
    try:
        c = docker.inspect(name)
    except DockerError as e:
        if e.status == 404:
            return {"ok": True, "gone": True}
        raise HTTPException(502, f"Docker refused: {e}")
    if ((c.get("Config") or {}).get("Labels") or {}).get(LABEL) != "1":
        raise HTTPException(403, "only workers the scaler started can be stopped")
    try:
        # SIGTERM: the worker stops taking jobs and waits for running ones (up to 60 s).
        docker.call("POST", f"/containers/{quote(name)}/stop?t=70", timeout=90)
    except DockerError as e:
        if e.status not in (304, 404):
            raise HTTPException(502, f"Docker refused: {e}")
    logger.info(f"stopped {name}")
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SCALER_PORT, log_level="info")
