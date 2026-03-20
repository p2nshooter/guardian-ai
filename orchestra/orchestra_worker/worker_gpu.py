"""
Orchestra Worker GPU — Production v2
GPU-accelerated inference worker: local LLM (Ollama/vLLM), image generation (SDXL/DALL-E),
audio transcription (Whisper), embedding generation.

On-demand idle behaviour:
  - Reports idle flag when tasks_active == 0
  - IDLE_SHUTDOWN_SEC > 0 → auto-deregister + exit after N idle seconds
  - Autoscaler respawns on next GPU job (Docker/webhook)

GPU detection priority: nvidia-smi → torch.cuda → ROCm (AMD) → Apple MPS → CPU fallback

Capabilities exposed per GPU spec:
  < 8 GB VRAM  → chat only (small models: phi3, llama3.2:1b)
  8–16 GB VRAM → chat + embedding + transcription
  > 16 GB VRAM → all: chat + image + embedding + transcription + local SD
"""
import base64, json, logging, os, subprocess, sys, threading, time, urllib.request
from pathlib import Path
from typing import Optional
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
ORCHESTRA_URL     = os.environ.get("ORCHESTRA_CORE_URL",         "http://orchestra-core:8080")
WORKER_TOKEN      = os.environ.get("ORCHESTRA_WORKER_TOKEN",     "orchestra-worker-secret")
CONSOLE_TOKEN     = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "orchestra-console")
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

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("worker.gpu")

# ── GPU Detection ─────────────────────────────────────────────────────────────
def _detect_gpu() -> dict:
    # 1. nvidia-smi
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
             "--format=csv,noheader,nounits"],
            timeout=5, stderr=subprocess.DEVNULL,
        ).decode().strip().split("\n")
        gpus = []
        for line in out:
            p = [x.strip() for x in line.split(",")]
            gpus.append({"name": p[0], "vram_gb": round(float(p[1])/1024, 1) if len(p)>1 else 0,
                         "driver": p[2] if len(p)>2 else ""})
        if gpus:
            total_vram = sum(g["vram_gb"] for g in gpus)
            return {"available": True, "backend": "cuda", "gpus": gpus,
                    "vram_gb": total_vram, "name": gpus[0]["name"],
                    "driver": gpus[0].get("driver", "")}
    except Exception:
        pass
    # 2. PyTorch CUDA
    try:
        import torch
        if torch.cuda.is_available():
            name  = torch.cuda.get_device_name(0)
            vram  = round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
            return {"available": True, "backend": "cuda", "name": name, "vram_gb": vram,
                    "driver": f"torch-{torch.__version__}",
                    "gpus": [{"name": name, "vram_gb": vram}]}
    except ImportError:
        pass
    # 3. ROCm (AMD)
    try:
        out = subprocess.check_output(["rocm-smi", "--showmeminfo", "vram"],
                                       timeout=5, stderr=subprocess.DEVNULL).decode()
        if "GPU" in out:
            return {"available": True, "backend": "rocm", "name": "AMD GPU", "vram_gb": 0,
                    "driver": "rocm", "gpus": [{"name": "AMD GPU", "vram_gb": 0}]}
    except Exception:
        pass
    # 4. Apple MPS
    try:
        import torch
        if torch.backends.mps.is_available():
            return {"available": True, "backend": "mps", "name": "Apple Silicon GPU",
                    "vram_gb": 0, "driver": "mps",
                    "gpus": [{"name": "Apple Silicon", "vram_gb": 0}]}
    except Exception:
        pass
    return {"available": False, "backend": "cpu", "name": "CPU fallback",
            "vram_gb": 0, "driver": "", "gpus": []}

GPU_INFO = _detect_gpu()

def _capabilities() -> list:
    vram = GPU_INFO.get("vram_gb", 0)
    caps = ["chat", "local_inference", "embedding"]
    if vram >= 8 or not GPU_INFO["available"]:
        caps += ["transcription"]
    if vram >= 16:
        caps += ["image_generation", "stable_diffusion"]
    return caps

# ── State ─────────────────────────────────────────────────────────────────────
_worker_id    = "";  _registered = False;  _running = True
_tasks_active = 0;   _tasks_total = 0;     _tasks_errors = 0
_avg_latency  = 0.0; _idle_since  = time.time()
_semaphore    = threading.Semaphore(CONCURRENCY)
_lock         = threading.Lock()

app = FastAPI(title="Orchestra Worker GPU", version="2.0.0",
              docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

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
def register():
    global _worker_id, _registered
    while _running and not _registered:
        try:
            r = _orch_post("/api/workers/register", {
                "node_id": NODE_ID, "type": "gpu",
                "provider_id": "ollama", "model": DEFAULT_MODEL,
                "concurrency": CONCURRENCY, "timeout_sec": 300,
                "priority": "high", "gpu_vram_gb": GPU_INFO.get("vram_gb", 0),
                "label": WORKER_LABEL, "base_url": OLLAMA_URL,
            })
            _worker_id = r.get("worker_id", "W-GPU-001"); _registered = True
            logger.info(f"GPU Worker registered: {_worker_id} | {GPU_INFO['name']} "
                        f"{GPU_INFO['vram_gb']}GB | caps={_capabilities()}")
        except Exception as e:
            logger.warning(f"GPU register fail, retry 15s: {e}"); time.sleep(15)

def deregister():
    if not _worker_id: return
    try: _orch_delete(f"/api/workers/{_worker_id}")
    except Exception: pass

def heartbeat_loop():
    global _idle_since
    while _running:
        time.sleep(HB_INTERVAL)
        if not _worker_id: continue
        with _lock: active = _tasks_active
        try:
            load = min(int((active/max(CONCURRENCY,1))*100), 100)
            _orch_post(f"/api/workers/{_worker_id}/heartbeat",
                       {"load_pct": load, "tasks_active": active})
            if active == 0:
                if _idle_since == 0: _idle_since = time.time()
            else:
                _idle_since = 0
        except Exception: pass

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
            device = "cuda" if GPU_INFO["backend"] == "cuda" else "cpu"
            pipe   = StableDiffusionXLPipeline.from_pretrained(
                SD_MODEL, torch_dtype=torch.float16 if device=="cuda" else torch.float32
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
    return {"ok": False, "error": "No image generation backend available (need OPENAI_API_KEY or GPU+16GB VRAM)"}


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
        device      = "cuda" if GPU_INFO["available"] and GPU_INFO["backend"]=="cuda" else "cpu"
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


# ── FastAPI endpoints ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    with _lock: active = _tasks_active
    return {"status": "ok", "worker_id": _worker_id, "type": "gpu", "gpu": GPU_INFO,
            "concurrency": CONCURRENCY, "tasks_active": active, "tasks_total": _tasks_total,
            "tasks_errors": _tasks_errors, "avg_latency_ms": round(_avg_latency, 1),
            "load_pct": min(int((active/max(CONCURRENCY,1))*100), 100),
            "idle": active == 0, "registered": _registered,
            "capabilities": _capabilities(), "ollama_url": OLLAMA_URL, "vllm_url": VLLM_URL}


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


@app.post("/run")
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


@app.post("/shutdown")
async def shutdown_ep():
    global _running; _running = False; deregister()
    return {"ok": True}


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info(f"GPU Worker starting — {GPU_INFO['name']} {GPU_INFO['vram_gb']}GB VRAM")
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
    uvicorn.run("worker_gpu:app", host="0.0.0.0", port=WORKER_PORT, log_level="info")
