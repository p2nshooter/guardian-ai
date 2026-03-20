"""
Orchestra Worker CPU — Production v2
Autonomous AI inference worker. Registers with Core, polls for jobs,
reports heartbeat, and shuts down cleanly on idle timeout or signal.

On-demand idle behaviour:
  - Reports load_pct=0 when no tasks running
  - After IDLE_SHUTDOWN_SEC seconds with no jobs, calls /api/workers/{id}/drain
    on Core then exits (autoscaler will spawn new instance when needed)
  - IDLE_SHUTDOWN_SEC=0 disables idle shutdown (always-on mode)

Supports: openai, anthropic, gemini, groq, together, deepseek, mistral,
          perplexity, cohere, ollama, custom OpenAI-compatible
"""
import json, logging, os, sys, threading, time, urllib.request, uuid
from pathlib import Path
from typing import Optional
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
ORCHESTRA_URL       = os.environ.get("ORCHESTRA_CORE_URL",         "http://orchestra-core:8080")
WORKER_TOKEN        = os.environ.get("ORCHESTRA_WORKER_TOKEN",     "orchestra-worker-secret")
CONSOLE_TOKEN       = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "orchestra-console")
PROVIDER_ID         = os.environ.get("WORKER_PROVIDER",            "openai")
MODEL               = os.environ.get("WORKER_MODEL",               "gpt-4o-mini")
CONCURRENCY         = int(os.environ.get("WORKER_CONCURRENCY",     "5"))
TIMEOUT_SEC         = int(os.environ.get("WORKER_TIMEOUT",         "120"))
WORKER_PORT         = int(os.environ.get("WORKER_PORT",            "7891"))
NODE_ID             = os.environ.get("NODE_ID",                    "default-node")
WORKER_LABEL        = os.environ.get("WORKER_LABEL",               f"{MODEL} CPU Worker")
BASE_URL            = os.environ.get("WORKER_BASE_URL",            "")
HB_INTERVAL         = int(os.environ.get("WORKER_HEARTBEAT_INTERVAL", "20"))
IDLE_SHUTDOWN_SEC   = int(os.environ.get("WORKER_IDLE_SHUTDOWN",   "0"))   # 0 = disabled
QUALITY_RETRY       = os.environ.get("WORKER_QUALITY_RETRY",       "true").lower() == "true"

# Provider base URLs
PROVIDER_URLS = {
    "openai":     "https://api.openai.com/v1",
    "groq":       "https://api.groq.com/openai/v1",
    "together":   "https://api.together.xyz/v1",
    "deepseek":   "https://api.deepseek.com/v1",
    "mistral":    "https://api.mistral.ai/v1",
    "perplexity": "https://api.perplexity.ai",
    "cohere":     "https://api.cohere.ai/v2",
}

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("worker.cpu")

# ── State ─────────────────────────────────────────────────────────────────────
_worker_id      = ""
_registered     = False
_running        = True
_tasks_active   = 0
_tasks_total    = 0
_tasks_errors   = 0
_avg_latency    = 0.0
_idle_since     = time.time()
_semaphore      = threading.Semaphore(CONCURRENCY)
_state_lock     = threading.Lock()

app = FastAPI(title="Orchestra Worker CPU", version="2.0.0",
              docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Orchestra API helpers ─────────────────────────────────────────────────────
def _headers() -> dict:
    return {"X-Console-Token": CONSOLE_TOKEN,
            "X-Orchestra-Worker-Token": WORKER_TOKEN,
            "Content-Type": "application/json"}

def _orch_post(path: str, body: dict, timeout=10) -> dict:
    data = json.dumps(body).encode()
    req  = urllib.request.Request(ORCHESTRA_URL+path, data=data, headers=_headers())
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def _orch_delete(path: str, timeout=10) -> dict:
    req = urllib.request.Request(ORCHESTRA_URL+path, headers=_headers(), method="DELETE")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

# ── Registration & Heartbeat ──────────────────────────────────────────────────
def register() -> None:
    global _worker_id, _registered
    while _running and not _registered:
        try:
            r = _orch_post("/api/workers/register", {
                "node_id": NODE_ID, "type": "cpu",
                "provider_id": PROVIDER_ID, "model": MODEL,
                "concurrency": CONCURRENCY, "timeout_sec": TIMEOUT_SEC,
                "priority": "normal", "label": WORKER_LABEL, "base_url": BASE_URL,
            })
            _worker_id = r.get("worker_id", "W-001"); _registered = True
            logger.info(f"Registered: {_worker_id}")
        except Exception as e:
            logger.warning(f"Register failed, retry 10s: {e}"); time.sleep(10)

def deregister() -> None:
    if not _worker_id: return
    try: _orch_delete(f"/api/workers/{_worker_id}"); logger.info(f"Deregistered {_worker_id}")
    except Exception as e: logger.warning(f"Deregister failed: {e}")

def heartbeat_loop() -> None:
    global _idle_since
    while _running:
        time.sleep(HB_INTERVAL)
        if not _worker_id: continue
        with _state_lock:
            active = _tasks_active
        try:
            load = min(int((active/CONCURRENCY)*100), 100)
            _orch_post(f"/api/workers/{_worker_id}/heartbeat",
                       {"load_pct": load, "tasks_active": active})
            if active == 0:
                if _idle_since == 0: _idle_since = time.time()
            else:
                _idle_since = 0
        except Exception: pass

def idle_shutdown_loop() -> None:
    """Shut down this worker after IDLE_SHUTDOWN_SEC of zero activity."""
    if IDLE_SHUTDOWN_SEC <= 0:
        return
    while _running:
        time.sleep(30)
        with _state_lock:
            active = _tasks_active
        if active == 0 and _idle_since > 0:
            idle_secs = time.time() - _idle_since
            if idle_secs >= IDLE_SHUTDOWN_SEC:
                logger.info(f"Idle {idle_secs:.0f}s >= {IDLE_SHUTDOWN_SEC}s, shutting down")
                deregister()
                os.kill(os.getpid(), __import__("signal").SIGTERM)
                return

# ── AI Dispatch ───────────────────────────────────────────────────────────────
def _get_api_key(provider_id: str) -> str:
    """Try vault first, then env variable."""
    sys.path.insert(0, str(Path(__file__).parent.parent/"orchestra_core"))
    try:
        import credential_vault
        key = credential_vault.get_key(provider_id)
        if key: return key
    except Exception: pass
    return os.environ.get(f"{provider_id.upper()}_API_KEY", "")

def dispatch(messages, model, provider_id, max_tokens, temperature) -> dict:
    api_key  = _get_api_key(provider_id)
    if not api_key:
        return {"ok": False, "error": f"No API key for '{provider_id}'"}

    t0 = time.time()

    # ── Anthropic ─────────────────────────────────────────────────────────────
    if provider_id == "anthropic":
        data = json.dumps({"model": model, "max_tokens": max_tokens,
                           "messages": messages}).encode()
        req  = urllib.request.Request(
            "https://api.anthropic.com/v1/messages", data=data,
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                     "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as r:
            res = json.loads(r.read()); lat = (time.time()-t0)*1000
            return {"ok": True,
                    "content":       res["content"][0]["text"],
                    "input_tokens":  res["usage"]["input_tokens"],
                    "output_tokens": res["usage"]["output_tokens"],
                    "latency_ms": lat, "model_used": model, "provider": provider_id}

    # ── Gemini ────────────────────────────────────────────────────────────────
    if provider_id == "gemini":
        parts   = [{"text": m["content"]} for m in messages if m.get("role") == "user"]
        payload = {"contents": [{"role": "user", "parts": parts}],
                   "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
        url  = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        data = json.dumps(payload).encode()
        req  = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"})
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as r:
            res = json.loads(r.read()); lat = (time.time()-t0)*1000
            text = res["candidates"][0]["content"]["parts"][0]["text"]
            usage = res.get("usageMetadata", {})
            return {"ok": True, "content": text,
                    "input_tokens":  usage.get("promptTokenCount", 0),
                    "output_tokens": usage.get("candidatesTokenCount", 0),
                    "latency_ms": lat, "model_used": model, "provider": provider_id}

    # ── Ollama ────────────────────────────────────────────────────────────────
    if provider_id == "ollama":
        base = BASE_URL or "http://localhost:11434"
        data = json.dumps({"model": model, "messages": messages, "stream": False,
                           "options": {"num_predict": max_tokens}}).encode()
        req  = urllib.request.Request(f"{base}/api/chat", data=data,
                                      headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.loads(r.read()); lat = (time.time()-t0)*1000
            return {"ok": True, "content": res["message"]["content"],
                    "input_tokens": res.get("prompt_eval_count",0),
                    "output_tokens": res.get("eval_count",0),
                    "latency_ms": lat, "model_used": model, "provider": provider_id}

    # ── OpenAI-compatible (openai, groq, together, deepseek, mistral, perplexity, custom) ──
    base = BASE_URL or PROVIDER_URLS.get(provider_id, "https://api.openai.com/v1")
    data = json.dumps({"model": model, "messages": messages,
                       "max_tokens": max_tokens, "temperature": temperature}).encode()
    req  = urllib.request.Request(f"{base}/chat/completions", data=data,
                                  headers={"Authorization": f"Bearer {api_key}",
                                           "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as r:
        res = json.loads(r.read()); lat = (time.time()-t0)*1000
        usage = res.get("usage", {})
        return {"ok": True,
                "content":       res["choices"][0]["message"]["content"],
                "input_tokens":  usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
                "latency_ms": lat, "model_used": model, "provider": provider_id}

# ── FastAPI endpoints ─────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    with _state_lock: active = _tasks_active
    return {"status":"ok","worker_id":_worker_id,"provider_id":PROVIDER_ID,"model":MODEL,
            "type":"cpu","concurrency":CONCURRENCY,"tasks_active":active,
            "tasks_total":_tasks_total,"tasks_errors":_tasks_errors,
            "avg_latency_ms":round(_avg_latency,1),
            "load_pct":min(int((active/CONCURRENCY)*100),100),
            "idle":active==0,"registered":_registered,"orchestra_url":ORCHESTRA_URL}


class RunReq(BaseModel):
    messages: list; model: str=MODEL; provider_id: str=PROVIDER_ID
    max_tokens: int=2048; temperature: float=0.7


@app.post("/run")
async def run(req: RunReq):
    global _tasks_active, _tasks_total, _tasks_errors, _avg_latency, _idle_since
    if not _semaphore.acquire(blocking=False):
        return JSONResponse(status_code=429, content={"error":"Worker at capacity"})
    with _state_lock: _tasks_active += 1; _idle_since = 0
    try:
        result = dispatch(req.messages, req.model, req.provider_id,
                          req.max_tokens, req.temperature)
        _avg_latency = _avg_latency*0.8 + result.get("latency_ms",0)*0.2
        _tasks_total += 1
        if not result["ok"]: _tasks_errors += 1
        return result
    except Exception as e:
        _tasks_errors += 1
        return JSONResponse(status_code=500, content={"ok":False,"error":str(e)})
    finally:
        with _state_lock: _tasks_active -= 1
        _semaphore.release()


@app.post("/shutdown")
async def shutdown_endpoint():
    """Called by autoscaler to drain this worker gracefully."""
    global _running
    logger.info("Shutdown requested via API")
    _running = False
    deregister()
    return {"ok": True}


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    logger.info(f"CPU Worker starting: {PROVIDER_ID}/{MODEL} concurrency={CONCURRENCY}")
    threading.Thread(target=register,           daemon=True, name="register").start()
    threading.Thread(target=heartbeat_loop,     daemon=True, name="heartbeat").start()
    threading.Thread(target=idle_shutdown_loop, daemon=True, name="idle-shutdown").start()


@app.on_event("shutdown")
async def on_shutdown():
    global _running; _running = False
    deadline = time.time() + 30
    while _tasks_active > 0 and time.time() < deadline: time.sleep(0.5)
    deregister()


if __name__ == "__main__":
    uvicorn.run("worker_cpu:app", host="0.0.0.0", port=WORKER_PORT, log_level="info")
