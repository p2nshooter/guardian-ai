# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Orchestra Worker GPU — Production v2
GPU-accelerated inference worker: local LLM (Ollama/vLLM), image generation (SDXL/DALL-E),
audio transcription (Whisper), embedding generation.

On-demand idle behaviour:
  - Reports idle flag when tasks_active == 0
  - IDLE_SHUTDOWN_SEC > 0 → auto-deregister + exit after N idle seconds

GPU detection (gpu_inventory.py): every brand on the PCI bus, exact models and VRAM
from the vendor tools, and — what decides — whether this container really has the
device (/dev/nvidia*, /dev/kfd + /dev/dri, /dev/dri) with a compute driver. PyTorch
fills in VRAM the tools do not report. Live per-GPU telemetry (gpu_telemetry.py)
goes to Orchestra Core with every heartbeat: utilisation, temperature, VRAM used,
power, fan and real throttling (REQUESTS 136, BLUEPRINT-V4 §31.F G1).

Capabilities:
  every worker   chat, local_inference, embedding, transcription (CPU when no GPU)
  GPU ≥ 8 GB     + local Stable Diffusion XL (CUDA, ROCm or Intel XPU builds of PyTorch)
  GPU ≥ 24 GB    + large_models
"""
import base64, hmac, json, logging, os, re, signal, sys, threading, time, urllib.error, urllib.request
from pathlib import Path
from typing import Optional
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from orchestra_worker import gpu_inventory, gpu_telemetry

# ── Config ────────────────────────────────────────────────────────────────────
ORCHESTRA_URL     = os.environ.get("ORCHESTRA_CORE_URL",         "http://orchestra-core:8080")
# Tokens: environment → orchestra.yml → secrets the core generated in the
# shared data volume (see orchestra_core/settings.py). No built-in defaults.
sys.path.insert(0, str(Path(__file__).parent.parent / "orchestra_core"))
try:
    import settings as _settings
    _settings.apply(generate=False)
except Exception:
    pass
WORKER_TOKEN      = os.environ.get("ORCHESTRA_WORKER_TOKEN",     "")
CONSOLE_TOKEN     = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "")
WORKER_PORT       = int(os.environ.get("WORKER_PORT",            "7892"))
NODE_ID           = os.environ.get("NODE_ID",                    "default-node")
CONCURRENCY       = int(os.environ.get("WORKER_CONCURRENCY",     "2"))
WORKER_LABEL      = os.environ.get("WORKER_LABEL",               "GPU Worker")
OLLAMA_URL        = os.environ.get("OLLAMA_BASE_URL",            "http://localhost:11434")
VLLM_URL          = os.environ.get("VLLM_BASE_URL",              "")
DEFAULT_MODEL     = os.environ.get("WORKER_MODEL",               "llama3.2")
HB_INTERVAL       = int(os.environ.get("WORKER_HEARTBEAT_INTERVAL", "30"))
IDLE_SHUTDOWN_SEC = int(os.environ.get("WORKER_IDLE_SHUTDOWN",   "0"))   # 0 = stay alive
OPENAI_KEY        = os.environ.get("OPENAI_API_KEY",             "")
SD_MODEL          = os.environ.get("SD_MODEL",                   "stabilityai/stable-diffusion-xl-base-1.0")
# Self URL: Orchestra Core uses this to POST GPU tasks directly to this worker's /run endpoint.
# Set to the address reachable from the orchestra-core container (e.g. http://orchestra-worker-gpu:7892).
WORKER_SELF_URL   = os.environ.get("WORKER_SELF_URL",            f"http://localhost:{WORKER_PORT}")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("worker.gpu")

# ── GPU Detection ─────────────────────────────────────────────────────────────
_TORCH_DEVICE: Optional[str] = None
_TORCH_CHECKED = False


def _torch_device() -> Optional[str]:
    """The PyTorch device of this image: "cuda" (NVIDIA, and AMD on ROCm builds), "xpu" (Intel), "mps" or None."""
    global _TORCH_DEVICE, _TORCH_CHECKED
    if _TORCH_CHECKED:
        return _TORCH_DEVICE
    _TORCH_CHECKED = True
    try:
        import torch  # type: ignore
        if torch.cuda.is_available():
            _TORCH_DEVICE = "cuda"
        elif hasattr(torch, "xpu") and torch.xpu.is_available():
            _TORCH_DEVICE = "xpu"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            _TORCH_DEVICE = "mps"
    except Exception:
        _TORCH_DEVICE = None
    return _TORCH_DEVICE


def _torch_vram_gb() -> float:
    try:
        import torch  # type: ignore
        if _torch_device() == "cuda":
            return round(sum(torch.cuda.get_device_properties(i).total_memory for i in range(torch.cuda.device_count())) / 1024 ** 3, 1)
        if _torch_device() == "xpu":
            return round(sum(torch.xpu.get_device_properties(i).total_memory for i in range(torch.xpu.device_count())) / 1024 ** 3, 1)
    except Exception:
        pass
    return 0.0


def _detect_gpu() -> dict:
    """Every GPU of every brand, the ones this container can use first (gpu_inventory.py).
    Found but not usable GPUs stay in `found` with the reason, so the console can say
    exactly what to change; only usable ones make this a GPU worker."""
    inv = gpu_inventory.inventory()
    usable = [g for g in inv["gpus"] if g.get("usable")]
    blocked = [g for g in inv["gpus"] if not g.get("usable")]
    access = inv.get("access", {})
    if usable:
        p = usable[0]
        vram = round(sum(g["vram_gb"] for g in usable), 1) or _torch_vram_gb()
        return {"available": True, "backend": p["backend"], "vendor": p["vendor"],
                "vendor_label": p["vendor_label"], "gpus": usable, "found": inv["gpus"],
                "vram_gb": vram, "name": p["name"] + (f" ×{len(usable)}" if len(usable) > 1 else ""),
                "driver": p.get("driver", "") or p.get("kernel_driver", ""), "count": len(usable),
                "sources": inv["sources"], "wsl": bool(access.get("wsl")),
                "access_note": "; ".join(f"{g['name']}: {g['access_note']}" for g in blocked if g.get("access_note"))}

    try:
        import torch  # type: ignore
        if torch.cuda.is_available():
            gpus = []
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                gpus.append({"name": props.name,
                              "vram_gb": round(props.total_memory / 1e9, 1),
                              "driver": f"torch-{torch.__version__}"})
            total = sum(g["vram_gb"] for g in gpus)
            return {"available": True, "backend": "cuda", "vendor": "nvidia", "vendor_label": "NVIDIA",
                    "gpus": gpus, "vram_gb": total,
                    "name": gpus[0]["name"], "driver": f"torch-{torch.__version__}",
                    "count": len(gpus), "sources": ["torch"]}
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return {"available": True, "backend": "mps", "vendor": "apple", "vendor_label": "Apple",
                    "gpus": [{"name": "Apple Silicon GPU", "vram_gb": 0, "driver": "mps"}],
                    "vram_gb": 0, "name": "Apple Silicon GPU", "driver": "mps", "count": 1,
                    "sources": ["torch"]}
    except ImportError:
        pass

    try:
        cpu_name = open("/proc/cpuinfo").read()
        m = re.search(r"model name\s*:\s*(.+)", cpu_name)
        cpu = m.group(1).strip() if m else "CPU"
        cores = cpu_name.count("processor")
    except Exception:
        cpu, cores = "CPU", 1
    return {"available": False, "backend": "cpu", "vendor": "cpu", "vendor_label": "CPU",
            "name": f"CPU fallback ({cpu}, {cores} threads)",
            "vram_gb": 0, "driver": "", "gpus": [], "found": inv["gpus"], "count": 0, "sources": inv["sources"],
            "wsl": bool(access.get("wsl")),
            "access_note": "; ".join(f"{g['name']}: {g['access_note']}" for g in blocked if g.get("access_note"))
                           or ("WSL 2 GPU (/dev/dxg) present but no NVIDIA GPU passed through" if access.get("wsl") else "")}

GPU_INFO = _detect_gpu()


def _capabilities() -> list:
    vram    = GPU_INFO.get("vram_gb", 0) or 0
    backend = GPU_INFO.get("backend", "cpu")
    avail   = GPU_INFO.get("available", False)

    # Chat and embeddings run on Ollama/vLLM; transcription falls back to the CPU.
    caps = ["chat", "local_inference", "embedding", "transcription"]

    # Local Stable Diffusion needs a PyTorch GPU device and ≥ 8 GB; DALL-E needs an OpenAI key.
    if avail and vram >= 8 and _torch_device() in ("cuda", "xpu"):
        caps += ["image_generation", "stable_diffusion"]
    elif _get_api_key("openai") or OPENAI_KEY:
        caps += ["image_generation"]

    if avail and backend in ("cuda", "rocm", "xpu", "metal", "mps"):
        caps += [f"{'mps' if backend == 'metal' else backend}_inference"]
        if vram >= 24:
            caps += ["large_models"]  # 70B+ models

    return list(dict.fromkeys(caps))  # deduplicate

# ── State ─────────────────────────────────────────────────────────────────────
_worker_id    = "";  _registered = False;  _running = True
_tasks_active = 0;   _tasks_total = 0;     _tasks_errors = 0
_avg_latency  = 0.0; _idle_since  = time.time()
_semaphore    = threading.Semaphore(CONCURRENCY)
_lock         = threading.Lock()

app = FastAPI(title="Orchestra Worker GPU", version="2.1.0",
              docs_url=None, redoc_url=None)
# No CORS: only Orchestra Core calls this worker, server to server.


def _require_core(request: Request):
    """/run and /shutdown answer Orchestra Core only: the same worker token as the heartbeat."""
    if not WORKER_TOKEN:
        return
    token = request.headers.get("X-Orchestra-Worker-Token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or not hmac.compare_digest(str(token), WORKER_TOKEN):
        raise HTTPException(status_code=401, detail="Orchestra Core worker token required")


# ── Telemetry (cached a few seconds: /health, heartbeats and /gpu/status share it) ──
_TELEMETRY_TTL = 5.0
_telemetry_cache: dict = {"at": 0.0, "rows": [], "summary": gpu_telemetry.summary([])}


def _telemetry() -> tuple[list, dict]:
    now = time.time()
    if now - _telemetry_cache["at"] > _TELEMETRY_TTL:
        try:
            rows = gpu_telemetry.collect(gpu_inventory._run) if GPU_INFO.get("available") else []
        except Exception as e:
            logger.debug(f"telemetry failed: {e}")
            rows = []
        _telemetry_cache.update(at=now, rows=rows, summary=gpu_telemetry.summary(rows))
    return _telemetry_cache["rows"], _telemetry_cache["summary"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def _headers():
    return {"X-Console-Token": CONSOLE_TOKEN, "X-Orchestra-Worker-Token": WORKER_TOKEN,
            "Content-Type": "application/json"}

def _orch_post(path, body, timeout=10):
    req = urllib.request.Request(ORCHESTRA_URL+path, data=json.dumps(body).encode(),
                                  headers=_headers())
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def _orch_delete(path, timeout=10):
    req = urllib.request.Request(ORCHESTRA_URL+path, headers=_headers(), method="DELETE")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def _get_api_key(provider_id: str) -> str:
    sys.path.insert(0, str(Path(__file__).parent.parent/"orchestra_core"))
    try:
        import credential_vault
        key = credential_vault.get_key(provider_id)
        if key: return key
    except Exception: pass
    return os.environ.get(f"{provider_id.upper()}_API_KEY", "")

# ── Registration ──────────────────────────────────────────────────────────────
def _register_payload() -> dict:
    """What Orchestra Core stores about this worker: identity, every usable GPU and what it can do."""
    return {
        "node_id": NODE_ID, "type": "gpu",
        "provider_id": "ollama", "model": DEFAULT_MODEL,
        "concurrency": CONCURRENCY, "timeout_sec": 300,
        "priority": "high", "gpu_vram_gb": GPU_INFO.get("vram_gb", 0),
        "label": WORKER_LABEL, "base_url": OLLAMA_URL,
        "worker_url": WORKER_SELF_URL,   # self endpoint for GPU task dispatch
        "vendor": GPU_INFO.get("vendor", "cpu"), "gpu_name": GPU_INFO.get("name", ""),
        "backend": GPU_INFO.get("backend", "cpu"), "gpu_count": GPU_INFO.get("count", 0),
        "driver": GPU_INFO.get("driver", ""), "capabilities": _capabilities(),
        "usable": bool(GPU_INFO.get("available")), "wsl": bool(GPU_INFO.get("wsl")),
        "access_note": GPU_INFO.get("access_note", ""), "worker_version": app.version,
    }


def register():
    global _worker_id, _registered
    while _running and not _registered:
        try:
            r = _orch_post("/api/workers/register", _register_payload())
            _worker_id = r.get("worker_id", "W-GPU-001"); _registered = True
            logger.info(f"GPU Worker registered: {_worker_id} | {GPU_INFO['name']} "
                        f"{GPU_INFO['vram_gb']}GB | caps={_capabilities()} | url={WORKER_SELF_URL}")
        except Exception as e:
            logger.warning(f"GPU register fail, retry 15s: {e}"); time.sleep(15)

def deregister():
    if not _worker_id: return
    try: _orch_delete(f"/api/workers/{_worker_id}")
    except Exception: pass

def _heartbeat_payload() -> dict:
    with _lock: active = _tasks_active
    rows, summ = _telemetry()
    return {
        "load_pct": min(int((active/max(CONCURRENCY,1))*100), 100),   # task slots in use
        "tasks_active": active,
        # temp_c (the hottest GPU) drives thermal rerouting in Orchestra Core (console → Auto-Scale).
        "temp_c": summ["temp_c"], "util_pct": summ["util_pct"],
        "vram_used_gb": summ["vram_used_gb"], "vram_total_gb": summ["vram_total_gb"],
        "power_w": summ["power_w"], "throttled": summ["throttled"], "gpu_count": summ["gpu_count"],
        "gpus": [{k: r.get(k) for k in ("index", "vendor", "name", "util_pct", "temp_c", "vram_used_gb",
                                         "vram_total_gb", "power_w", "fan_pct", "throttled", "throttle_reasons")}
                 for r in rows][:16],
    }


def heartbeat_once():
    """One heartbeat with live telemetry; registers again when Orchestra Core lost this worker."""
    global _idle_since, _registered
    if not _worker_id: return
    body = _heartbeat_payload()
    try:
        r = _orch_post(f"/api/workers/{_worker_id}/heartbeat", body)
        if r.get("ok") is False:
            # Orchestra Core no longer knows this worker (removed, restored backup): register again.
            logger.warning(f"Orchestra Core does not know {_worker_id} — registering again")
            _registered = False; register()
    except urllib.error.HTTPError as e:
        if e.code in (404, 410):
            _registered = False; register()
        elif e.code == 401:
            logger.warning("Heartbeat refused (401): ORCHESTRA_WORKER_TOKEN differs from Orchestra Core's")
    except Exception: pass
    if body["tasks_active"] == 0:
        if _idle_since == 0: _idle_since = time.time()
    else:
        _idle_since = 0


def heartbeat_loop():
    while _running:
        time.sleep(HB_INTERVAL)
        heartbeat_once()

def idle_shutdown_loop():
    if IDLE_SHUTDOWN_SEC <= 0: return
    while _running:
        time.sleep(30)
        with _lock: active = _tasks_active
        if active == 0 and _idle_since > 0:
            if time.time() - _idle_since >= IDLE_SHUTDOWN_SEC:
                logger.info(f"GPU idle {IDLE_SHUTDOWN_SEC}s — shutting down")
                deregister()
                os.kill(os.getpid(), __import__("signal").SIGTERM)
                return

# ── Task handlers ─────────────────────────────────────────────────────────────

def _handle_local_inference(messages: list, model: str = DEFAULT_MODEL,
                             max_tokens: int = 2048, temperature: float = 0.7) -> dict:
    """Local LLM via Ollama or vLLM."""
    t0 = time.time()
    # Try vLLM first (better performance, OpenAI-compatible)
    if VLLM_URL:
        try:
            data = json.dumps({"model": model, "messages": messages, "max_tokens": max_tokens,
                               "temperature": temperature}).encode()
            req  = urllib.request.Request(f"{VLLM_URL}/v1/chat/completions", data=data,
                                          headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as r:
                res  = json.loads(r.read()); lat = (time.time()-t0)*1000
                usage = res.get("usage", {})
                return {"ok": True, "content": res["choices"][0]["message"]["content"],
                        "input_tokens": usage.get("prompt_tokens", 0),
                        "output_tokens": usage.get("completion_tokens", 0),
                        "latency_ms": lat, "model_used": model,
                        "provider": "vllm", "gpu_used": GPU_INFO["available"]}
        except Exception as e:
            logger.debug(f"vLLM failed, fallback to Ollama: {e}")
    # Ollama
    data = json.dumps({"model": model, "messages": messages, "stream": False,
                       "options": {"num_predict": max_tokens, "temperature": temperature}}).encode()
    req  = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=data,
                                  headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read()); lat = (time.time()-t0)*1000
        return {"ok": True, "content": res["message"]["content"],
                "input_tokens": res.get("prompt_eval_count", 0),
                "output_tokens": res.get("eval_count", 0),
                "latency_ms": lat, "model_used": model,
                "provider": "ollama", "gpu_used": GPU_INFO["available"]}


def _handle_embedding(texts: list, model: str = "nomic-embed-text") -> dict:
    """Generate embeddings via Ollama or OpenAI."""
    t0 = time.time()
    # Try Ollama embeddings
    try:
        results = []
        for text in texts:
            data = json.dumps({"model": model, "prompt": text}).encode()
            req  = urllib.request.Request(f"{OLLAMA_URL}/api/embeddings", data=data,
                                          headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                res = json.loads(r.read())
                results.append(res.get("embedding", []))
        lat = (time.time()-t0)*1000
        return {"ok": True, "embeddings": results, "model_used": model,
                "latency_ms": lat, "provider": "ollama", "dimensions": len(results[0]) if results else 0}
    except Exception as e:
        logger.debug(f"Ollama embed failed: {e}")
    # Fallback: OpenAI embeddings
    key = _get_api_key("openai") or OPENAI_KEY
    if not key:
        return {"ok": False, "error": "No embedding backend available"}
    data = json.dumps({"model": "text-embedding-3-small", "input": texts}).encode()
    req  = urllib.request.Request("https://api.openai.com/v1/embeddings", data=data,
                                  headers={"Authorization": f"Bearer {key}",
                                           "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read()); lat = (time.time()-t0)*1000
        embeddings = [d["embedding"] for d in res.get("data", [])]
        return {"ok": True, "embeddings": embeddings, "model_used": "text-embedding-3-small",
                "latency_ms": lat, "provider": "openai",
                "dimensions": len(embeddings[0]) if embeddings else 0}


def _handle_image_generation(prompt: str, model: str = "dall-e-3",
                               size: str = "1024x1024", quality: str = "standard",
                               n: int = 1) -> dict:
    """Image generation: DALL-E 3 (cloud) → SDXL (local GPU) → error."""
    t0 = time.time()
    # DALL-E 3
    key = _get_api_key("openai") or OPENAI_KEY
    if key and "dall-e" in model.lower():
        try:
            data = json.dumps({"model": model, "prompt": prompt, "n": n,
                               "size": size, "quality": quality}).encode()
            req  = urllib.request.Request("https://api.openai.com/v1/images/generations",
                                          data=data,
                                          headers={"Authorization": f"Bearer {key}",
                                                   "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.loads(r.read()); lat = (time.time()-t0)*1000
                images = [d.get("url","") for d in res.get("data",[])]
                return {"ok": True, "images": images, "model_used": model,
                        "latency_ms": lat, "provider": "openai"}
        except Exception as e:
            logger.warning(f"DALL-E failed, trying local SD: {e}")
    # Local SDXL via diffusers (if GPU available)
    if GPU_INFO["available"] and GPU_INFO.get("vram_gb", 0) >= 8:
        try:
            from diffusers import StableDiffusionXLPipeline
            import torch
            device = _torch_device() if _torch_device() in ("cuda", "xpu") else "cpu"
            pipe   = StableDiffusionXLPipeline.from_pretrained(
                SD_MODEL, torch_dtype=torch.float16 if device != "cpu" else torch.float32
            ).to(device)
            pipe.enable_attention_slicing()
            imgs   = pipe(prompt, num_images_per_prompt=n, num_inference_steps=20).images
            # Return as base64
            b64s = []
            for img in imgs:
                import io
                buf = io.BytesIO(); img.save(buf, format="PNG")
                b64s.append(base64.b64encode(buf.getvalue()).decode())
            lat = (time.time()-t0)*1000
            return {"ok": True, "images_b64": b64s, "model_used": SD_MODEL,
                    "latency_ms": lat, "provider": "local_sdxl", "gpu_used": True}
        except Exception as e:
            return {"ok": False, "error": f"Local SD failed: {e}"}
    return {"ok": False, "error": "No image generation backend available (need OPENAI_API_KEY or a GPU with 8 GB+ VRAM)"}


def _handle_transcription(audio_b64: str, language: str = "auto",
                           model: str = "whisper-1") -> dict:
    """Transcription: OpenAI Whisper (cloud) → Faster-Whisper (local GPU)."""
    t0 = time.time()
    # OpenAI Whisper
    key = _get_api_key("openai") or OPENAI_KEY
    if key:
        try:
            audio_bytes = base64.b64decode(audio_b64)
            boundary    = "----orchestra-gpu-boundary"
            body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n{model}\r\n"
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio.mp3\"\r\n"
                    f"Content-Type: audio/mpeg\r\n\r\n").encode() + audio_bytes + \
                   f"\r\n--{boundary}--\r\n".encode()
            req = urllib.request.Request("https://api.openai.com/v1/audio/transcriptions",
                                         data=body,
                                         headers={"Authorization": f"Bearer {key}",
                                                  "Content-Type": f"multipart/form-data; boundary={boundary}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.loads(r.read()); lat = (time.time()-t0)*1000
                return {"ok": True, "text": res.get("text",""), "model_used": model,
                        "latency_ms": lat, "provider": "openai"}
        except Exception as e:
            logger.warning(f"Whisper API failed, trying local: {e}")
    # Local faster-whisper
    try:
        from faster_whisper import WhisperModel
        import tempfile, io
        audio_bytes = base64.b64decode(audio_b64)
        # faster-whisper (CTranslate2) runs on NVIDIA CUDA or the CPU.
        device      = "cuda" if GPU_INFO["available"] and GPU_INFO["backend"]=="cuda" and _torch_device()=="cuda" else "cpu"
        wm          = WhisperModel("base", device=device, compute_type="int8")
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(audio_bytes); tmp_path = tmp.name
        segments, info = wm.transcribe(tmp_path, language=None if language=="auto" else language)
        text = " ".join(s.text for s in segments); lat = (time.time()-t0)*1000
        os.unlink(tmp_path)
        return {"ok": True, "text": text, "language": info.language,
                "model_used": "faster-whisper-base", "latency_ms": lat,
                "provider": "local_whisper", "gpu_used": GPU_INFO["available"]}
    except Exception as e:
        return {"ok": False, "error": f"Transcription failed: {e}"}


# ── GPU Thermal & Health Monitoring ──────────────────────────────────────────
def _gpu_thermal() -> dict:
    """Thermal and health view of this worker, from the per-GPU telemetry: the hottest
    GPU decides the status; "gpus" lists every GPU. None means "not reported"."""
    rows, summ = _telemetry()
    temp = summ["temp_c"]
    used_mb = None if summ["vram_used_gb"] is None else round(summ["vram_used_gb"] * 1024)
    total_mb = None if summ["vram_total_gb"] is None else round(summ["vram_total_gb"] * 1024)
    fans = [r["fan_pct"] for r in rows if r.get("fan_pct") is not None]
    limits = [r["power_limit_w"] for r in rows if r.get("power_limit_w") is not None]
    reasons = sorted({x for r in rows for x in r.get("throttle_reasons") or []})
    thermal = {
        "temperature_c": temp, "temperature_status": "NO TELEMETRY", "utilization_pct": summ["util_pct"],
        "memory_used_mb": used_mb, "memory_total_mb": total_mb,
        "memory_pct": round(used_mb / total_mb * 100, 1) if used_mb is not None and total_mb else None,
        "fan_speed_pct": max(fans) if fans else None, "power_draw_w": summ["power_w"],
        "power_limit_w": round(sum(limits), 1) if limits else None,
        "throttle_reason": ", ".join(reasons) or None, "health": "unknown", "gpus": rows,
    }
    if temp is not None:
        thermal["temperature_status"], thermal["health"] = (
            ("CRITICAL", "critical") if temp >= 95 else ("HOT", "warning") if temp >= 85 else
            ("WARM", "ok") if temp >= 75 else ("NORMAL", "excellent"))
    if reasons:
        thermal["health"] = "throttled"
        thermal["temperature_status"] = "THROTTLED — " + ", ".join(reasons)
    return thermal


# ── FastAPI endpoints ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    with _lock: active = _tasks_active
    thermal = _gpu_thermal()
    return {
        "status": "ok", "worker_id": _worker_id, "type": "gpu", "version": app.version,
        "gpu": {**GPU_INFO, "thermal": thermal},
        "concurrency": CONCURRENCY, "tasks_active": active, "tasks_total": _tasks_total,
        "tasks_errors": _tasks_errors, "avg_latency_ms": round(_avg_latency, 1),
        "load_pct": min(int((active/max(CONCURRENCY,1))*100), 100),
        "idle": active == 0, "registered": _registered,
        "capabilities": _capabilities(), "ollama_url": OLLAMA_URL, "vllm_url": VLLM_URL,
    }


@app.get("/gpu/status")
async def gpu_status():
    """Detailed GPU status — temperature, utilization, memory, fan, power, health."""
    thermal = _gpu_thermal()
    return {
        "gpu": GPU_INFO,
        "thermal": thermal,
        "capabilities": _capabilities(),
        "alerts": _gpu_alerts(thermal),
        # The model server's view: does a loaded model really run on the GPU? (any brand)
        "inference": gpu_inventory.ollama_gpu_status(OLLAMA_URL),
    }


def _gpu_alerts(thermal: dict) -> list:
    """Generate human-readable alerts based on GPU health."""
    alerts = []
    temp = thermal.get("temperature_c")
    if temp is not None:
        if temp >= 95:
            alerts.append({
                "level": "critical", "icon": "🔥",
                "message": f"GPU KRITIS: {temp}°C — Risiko kerusakan hardware! Segera matikan atau tingkatkan pendinginan.",
                "action": "Periksa fan GPU, bersihkan debu, pastikan airflow case memadai. Kurangi beban kerja."
            })
        elif temp >= 85:
            alerts.append({
                "level": "warning", "icon": "🌡️",
                "message": f"GPU PANAS: {temp}°C — Performa mungkin di-throttle.",
                "action": "Pertimbangkan mengurangi concurrency worker atau menambah pendinginan."
            })
        elif temp >= 75:
            alerts.append({
                "level": "info", "icon": "♨️",
                "message": f"GPU hangat: {temp}°C — Masih dalam batas aman.",
            })
    
    mem_pct = thermal.get("memory_pct")
    if mem_pct is not None and mem_pct >= 90:
        alerts.append({
            "level": "warning", "icon": "💾",
            "message": f"VRAM hampir penuh: {mem_pct}% terpakai.",
            "action": "Gunakan model yang lebih kecil atau kurangi batch size."
        })
    
    if thermal.get("throttle_reason"):
        alerts.append({
            "level": "critical", "icon": "⚠️",
            "message": "GPU sedang di-THROTTLE — performa berkurang.",
            "action": f"Throttle reason: {thermal['throttle_reason']}"
        })
    
    if thermal.get("health") == "excellent":
        alerts.append({
            "level": "ok", "icon": "✅",
            "message": f"GPU sehat: {temp}°C — Performa optimal.",
        })
    
    return alerts


class GPUJobReq(BaseModel):
    task_type:    str
    messages:     Optional[list] = None
    prompt:       Optional[str]  = None
    texts:        Optional[list] = None     # for embeddings
    audio_base64: Optional[str]  = None
    model:        str   = DEFAULT_MODEL
    max_tokens:   int   = 2048
    temperature:  float = 0.7
    size:         str   = "1024x1024"
    quality:      str   = "standard"
    n:            int   = 1
    language:     str   = "auto"


@app.post("/run", dependencies=[Depends(_require_core)])
async def run_job(req: GPUJobReq):
    global _tasks_active, _tasks_total, _tasks_errors, _avg_latency, _idle_since
    if not _semaphore.acquire(blocking=False):
        return JSONResponse(status_code=429, content={"error": "GPU worker at capacity"})
    with _lock: _tasks_active += 1; _idle_since = 0
    try:
        if req.task_type in ("chat", "local_inference"):
            msgs = req.messages or [{"role":"user","content": req.prompt or "Hello"}]
            result = _handle_local_inference(msgs, req.model, req.max_tokens, req.temperature)
        elif req.task_type == "embedding":
            texts  = req.texts or ([req.prompt] if req.prompt else [""])
            result = _handle_embedding(texts, req.model)
        elif req.task_type == "image":
            result = _handle_image_generation(req.prompt or "", req.model,
                                               req.size, req.quality, req.n)
        elif req.task_type == "transcribe":
            if not req.audio_base64:
                return JSONResponse(status_code=400, content={"error":"audio_base64 required"})
            result = _handle_transcription(req.audio_base64, req.language, req.model)
        else:
            result = {"ok": False, "error": f"Unknown GPU task: {req.task_type}"}
        lat = result.get("latency_ms", 0)
        _avg_latency = _avg_latency*0.8 + lat*0.2
        _tasks_total += 1
        if not result.get("ok"): _tasks_errors += 1
        return result
    except Exception as e:
        _tasks_errors += 1
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    finally:
        with _lock: _tasks_active -= 1
        _semaphore.release()


@app.get("/models")
async def list_models():
    """List all available local models (Ollama + vLLM)."""
    models = []
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read())
            models += [{"name": m["name"], "backend": "ollama",
                        "size_gb": round(m.get("size",0)/1e9, 1)}
                       for m in data.get("models", [])]
    except Exception: pass
    if VLLM_URL:
        try:
            req = urllib.request.Request(f"{VLLM_URL}/v1/models")
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read())
                models += [{"name": m["id"], "backend": "vllm"} for m in data.get("data", [])]
        except Exception: pass
    return {"models": models, "gpu": GPU_INFO, "capabilities": _capabilities()}


@app.post("/shutdown", dependencies=[Depends(_require_core)])
async def shutdown_ep():
    """Drain: stop taking jobs, leave Orchestra Core, then exit once running jobs finish."""
    global _running; _running = False; deregister()
    threading.Timer(0.5, lambda: os.kill(os.getpid(), signal.SIGTERM)).start()
    return {"ok": True}


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info(f"GPU Worker starting — {GPU_INFO['name']} {GPU_INFO['vram_gb']}GB VRAM"
                + (f" — not usable here: {GPU_INFO['access_note']}" if GPU_INFO.get("access_note") else ""))
    threading.Thread(target=register,           daemon=True, name="gpu-register").start()
    threading.Thread(target=heartbeat_loop,     daemon=True, name="gpu-heartbeat").start()
    threading.Thread(target=idle_shutdown_loop, daemon=True, name="gpu-idle").start()


@app.on_event("shutdown")
async def on_shutdown():
    global _running; _running = False
    deadline = time.time() + 60
    while _tasks_active > 0 and time.time() < deadline: time.sleep(1)
    deregister()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=WORKER_PORT, log_level="info")
