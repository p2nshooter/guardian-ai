"""
Orchestra Worker CPU v3.0
Autonomous AI inference worker — registers with Core, executes jobs.

New in v3.0:
  - Unified dispatch via ai_providers (15 providers, circuit breaker)
  - Tool/function calling support
  - Vision/multimodal support
  - JSON mode
  - Quality retry (auto-retry on empty/garbage response)
  - Multi-provider fallback within single request
  - /models endpoint (list available models per configured provider)
  - /ping endpoint (health check with latency)

Supported providers: openai, anthropic, gemini, groq, together, mistral,
  deepseek, perplexity, xai, fireworks, azure_openai, cerebras, sambanova,
  ollama, custom
"""
import json, logging, os, sys, threading, time, urllib.request, uuid
from pathlib import Path
from typing import Optional, List
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
ORCHESTRA_URL     = os.environ.get("ORCHESTRA_CORE_URL",         "http://orchestra-core:8080")
WORKER_TOKEN      = os.environ.get("ORCHESTRA_WORKER_TOKEN",     "orchestra-worker-secret")
CONSOLE_TOKEN     = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "orchestra-console")
PROVIDER_ID       = os.environ.get("WORKER_PROVIDER",            "openai")
MODEL             = os.environ.get("WORKER_MODEL",               "gpt-4o-mini")
CONCURRENCY       = int(os.environ.get("WORKER_CONCURRENCY",     "5"))
TIMEOUT_SEC       = int(os.environ.get("WORKER_TIMEOUT",         "120"))
WORKER_PORT       = int(os.environ.get("WORKER_PORT",            "7891"))
NODE_ID           = os.environ.get("NODE_ID",                    "default-node")
WORKER_LABEL      = os.environ.get("WORKER_LABEL",               f"{MODEL} CPU Worker")
BASE_URL          = os.environ.get("WORKER_BASE_URL",            "")
HB_INTERVAL       = int(os.environ.get("WORKER_HEARTBEAT_INTERVAL", "20"))
IDLE_SHUTDOWN_SEC = int(os.environ.get("WORKER_IDLE_SHUTDOWN",   "0"))
QUALITY_RETRY     = os.environ.get("WORKER_QUALITY_RETRY", "true").lower() == "true"
MAX_RETRIES       = int(os.environ.get("WORKER_MAX_RETRIES",     "2"))

# Add orchestra_core to path for credential_vault + ai_providers
_core_path = str(Path(__file__).parent.parent / "orchestra_core")
if _core_path not in sys.path:
    sys.path.insert(0, _core_path)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("worker.cpu")

# ── State ─────────────────────────────────────────────────────────────────────
_worker_id    = ""; _registered = False; _running = True
_tasks_active = 0;  _tasks_total = 0;    _tasks_errors = 0
_avg_latency  = 0.0; _idle_since = time.time()
_semaphore    = threading.Semaphore(CONCURRENCY)
_state_lock   = threading.Lock()

app = FastAPI(title="Orchestra Worker CPU", version="3.0.0",
              docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Orchestra API helpers ──────────────────────────────────────────────────────
def _headers() -> dict:
    return {"X-Console-Token": CONSOLE_TOKEN,
            "X-Orchestra-Worker-Token": WORKER_TOKEN,
            "Content-Type": "application/json"}

def _orch_post(path: str, body: dict, timeout=10) -> dict:
    req = urllib.request.Request(ORCHESTRA_URL+path,
                                  data=json.dumps(body).encode(), headers=_headers())
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
            _worker_id = r.get("worker_id", f"W-CPU-{uuid.uuid4().hex[:6]}")
            _registered = True
            logger.info(f"Registered: {_worker_id} | {PROVIDER_ID}/{MODEL}")
        except Exception as e:
            logger.warning(f"Register failed, retry 10s: {e}")
            time.sleep(10)

def deregister() -> None:
    if not _worker_id: return
    try: _orch_delete(f"/api/workers/{_worker_id}")
    except Exception: pass

def heartbeat_loop() -> None:
    global _idle_since
    while _running:
        time.sleep(HB_INTERVAL)
        if not _worker_id: continue
        with _state_lock:
            active = _tasks_active
        try:
            load = min(int((active/max(CONCURRENCY,1))*100), 100)
            _orch_post(f"/api/workers/{_worker_id}/heartbeat",
                       {"load_pct": load, "tasks_active": active})
            if active == 0:
                if _idle_since == 0: _idle_since = time.time()
            else:
                _idle_since = 0
        except Exception: pass

def idle_shutdown_loop() -> None:
    if IDLE_SHUTDOWN_SEC <= 0: return
    while _running:
        time.sleep(30)
        with _state_lock: active = _tasks_active
        if active == 0 and _idle_since > 0:
            if time.time() - _idle_since >= IDLE_SHUTDOWN_SEC:
                logger.info(f"Idle {IDLE_SHUTDOWN_SEC}s — shutting down")
                deregister()
                os.kill(os.getpid(), __import__("signal").SIGTERM)
                return

# ── AI Dispatch ───────────────────────────────────────────────────────────────
def _get_api_key(provider_id: str) -> str:
    try:
        import credential_vault
        key = credential_vault.get_key(provider_id)
        if key: return key
    except Exception: pass
    env_map = {
        "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
        "gemini": "GOOGLE_API_KEY", "groq": "GROQ_API_KEY",
        "together": "TOGETHER_API_KEY", "mistral": "MISTRAL_API_KEY",
        "cohere": "COHERE_API_KEY", "deepseek": "DEEPSEEK_API_KEY",
        "perplexity": "PERPLEXITY_API_KEY", "xai": "XAI_API_KEY",
        "fireworks": "FIREWORKS_API_KEY", "azure_openai": "AZURE_OPENAI_API_KEY",
        "cerebras": "CEREBRAS_API_KEY", "sambanova": "SAMBANOVA_API_KEY",
        "ollama": BASE_URL or "http://localhost:11434",
    }
    return os.environ.get(env_map.get(provider_id, f"{provider_id.upper()}_API_KEY"), "")

def _is_bad_response(content: str) -> bool:
    """Detect empty or garbage responses that warrant a quality retry."""
    if not content or not content.strip():
        return True
    c = content.strip()
    if len(c) < 3:
        return True
    # Check for common garbage patterns
    garbage = ["I cannot", "I'm sorry, I cannot", "null", "undefined"]
    return c in garbage

def _dispatch_with_retry(
    messages: list, model: str, provider_id: str,
    max_tokens: int, temperature: float,
    tools: Optional[list] = None, json_mode: bool = False,
    base_url: str = "",
) -> dict:
    """Dispatch with quality retry and provider fallback."""
    try:
        from ai_providers import dispatch as ai_dispatch, PROVIDER_CONFIGS
    except ImportError:
        return _dispatch_raw(messages, model, provider_id, max_tokens, temperature)

    api_key = _get_api_key(provider_id)
    if not api_key and provider_id != "ollama":
        return {"ok": False, "error": f"No API key for '{provider_id}'"}

    effective_base = base_url or BASE_URL
    last_result = None

    for attempt in range(MAX_RETRIES + 1):
        result = ai_dispatch(
            provider_id, api_key, model, messages,
            max_tokens=max_tokens, temperature=temperature,
            base_url=effective_base, timeout=TIMEOUT_SEC,
            tools=tools, json_mode=json_mode,
        )
        if result.get("ok"):
            if QUALITY_RETRY and attempt < MAX_RETRIES and _is_bad_response(result.get("content","")):
                logger.warning(f"Quality retry {attempt+1}/{MAX_RETRIES} — bad response from {provider_id}")
                last_result = result
                time.sleep(0.5 * (attempt + 1))
                continue
            result["attempt"] = attempt
            return result
        last_result = result
        if attempt < MAX_RETRIES:
            logger.warning(f"Retry {attempt+1}/{MAX_RETRIES}: {provider_id} — {result.get('error','')[:60]}")
            time.sleep(1.0 * (attempt + 1))

    return last_result or {"ok": False, "error": "All retries exhausted"}

def _dispatch_raw(messages, model, provider_id, max_tokens, temperature) -> dict:
    """Fallback dispatch without ai_providers module (raw HTTP)."""
    import urllib.request, urllib.error
    api_key = _get_api_key(provider_id)
    if not api_key:
        return {"ok": False, "error": f"No API key for {provider_id}"}
    t0 = time.time()
    URLS = {
        "openai": "https://api.openai.com/v1", "groq": "https://api.groq.com/openai/v1",
        "together": "https://api.together.xyz/v1", "deepseek": "https://api.deepseek.com/v1",
        "mistral": "https://api.mistral.ai/v1", "xai": "https://api.x.ai/v1",
        "cerebras": "https://api.cerebras.ai/v1", "fireworks": "https://api.fireworks.ai/inference/v1",
    }
    base = BASE_URL or URLS.get(provider_id, "https://api.openai.com/v1")
    payload = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(f"{base}/chat/completions", data=data,
                                   headers={"Authorization": f"Bearer {api_key}",
                                            "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as r:
            res   = json.loads(r.read())
            lat   = (time.time()-t0)*1000
            usage = res.get("usage",{})
            return {"ok": True,
                    "content":       res["choices"][0]["message"]["content"],
                    "input_tokens":  usage.get("prompt_tokens",0),
                    "output_tokens": usage.get("completion_tokens",0),
                    "latency_ms": lat, "model_used": model, "provider": provider_id}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# ── FastAPI endpoints ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    with _state_lock: active = _tasks_active
    return {
        "status": "ok", "worker_id": _worker_id,
        "provider_id": PROVIDER_ID, "model": MODEL, "type": "cpu",
        "concurrency": CONCURRENCY, "tasks_active": active,
        "tasks_total": _tasks_total, "tasks_errors": _tasks_errors,
        "avg_latency_ms": round(_avg_latency, 1),
        "load_pct": min(int((active/max(CONCURRENCY,1))*100), 100),
        "idle": active == 0, "registered": _registered,
        "orchestra_url": ORCHESTRA_URL,
    }

@app.get("/ping")
async def ping():
    return {"ok": True, "worker_id": _worker_id, "ts": time.time()}

@app.get("/models")
async def list_models():
    """List models available for the configured provider."""
    try:
        from ai_providers import PROVIDER_CONFIGS, get_ollama_models
        cfg = PROVIDER_CONFIGS.get(PROVIDER_ID, {})
        models = cfg.get("models", [])
        if PROVIDER_ID == "ollama":
            models = get_ollama_models(BASE_URL or "http://localhost:11434")
        return {"provider": PROVIDER_ID, "models": models,
                "current_model": MODEL, "supports": cfg.get("supports", [])}
    except Exception as e:
        return {"provider": PROVIDER_ID, "models": [MODEL], "error": str(e)}


class RunReq(BaseModel):
    messages:    list
    model:       str            = MODEL
    provider_id: str            = PROVIDER_ID
    max_tokens:  int            = 2048
    temperature: float          = 0.7
    tools:       Optional[list] = None
    tool_choice: Optional[str]  = None
    json_mode:   bool           = False
    base_url:    str            = ""


@app.post("/run")
async def run(req: RunReq):
    global _tasks_active, _tasks_total, _tasks_errors, _avg_latency, _idle_since
    if not _semaphore.acquire(blocking=False):
        return JSONResponse(status_code=429, content={"error": "Worker at capacity"})
    with _state_lock:
        _tasks_active += 1
        _idle_since = 0
    try:
        result = _dispatch_with_retry(
            req.messages, req.model, req.provider_id,
            req.max_tokens, req.temperature,
            tools=req.tools, json_mode=req.json_mode,
            base_url=req.base_url,
        )
        lat = result.get("latency_ms", 0)
        _avg_latency = _avg_latency * 0.8 + lat * 0.2
        _tasks_total += 1
        if not result.get("ok"):
            _tasks_errors += 1
        return result
    except Exception as e:
        _tasks_errors += 1
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
    finally:
        with _state_lock:
            _tasks_active -= 1
        _semaphore.release()


@app.post("/shutdown")
async def shutdown_endpoint():
    global _running
    logger.info("Shutdown requested via API")
    _running = False
    deregister()
    return {"ok": True}


# ── Lifecycle ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info(f"CPU Worker v3.0 starting: {PROVIDER_ID}/{MODEL} "
                f"concurrency={CONCURRENCY} timeout={TIMEOUT_SEC}s")
    threading.Thread(target=register,           daemon=True, name="register").start()
    threading.Thread(target=heartbeat_loop,     daemon=True, name="heartbeat").start()
    threading.Thread(target=idle_shutdown_loop, daemon=True, name="idle-shutdown").start()

@app.on_event("shutdown")
async def on_shutdown():
    global _running
    _running = False
    deadline = time.time() + 30
    while _tasks_active > 0 and time.time() < deadline:
        time.sleep(0.5)
    deregister()

if __name__ == "__main__":
    uvicorn.run("worker_cpu:app", host="0.0.0.0", port=WORKER_PORT, log_level="info")
