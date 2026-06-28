# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO GPU Studio — Generation Core
Routes image/video generation to GPU endpoints and API providers.

Supported backends:
  • Stability AI API      (SDXL, SD3, Stable Image)
  • Replicate API         (Flux, SDXL, video models)
  • Fal.ai API            (Flux Dev/Pro/Schnell, video)
  • Together AI Images    (Flux series)
  • Fireworks AI Images   (Stable Diffusion, Flux)
  • ComfyUI (self-hosted) — OpenAPI-compatible
  • Automatic1111 (A1111) — REST API
  • Any OpenAI-compatible image endpoint
  • Custom HTTP endpoint  — raw POST
"""
from __future__ import annotations
import base64, json, logging, time, uuid
from typing import Any
import httpx

log = logging.getLogger("gpu_studio.core")

def new_id() -> str:
    return uuid.uuid4().hex[:16]

# ── Provider info ──────────────────────────────────────────────────────────
PROVIDER_INFO = {
    "stability":  {"name": "Stability AI",     "color": "#7c3aed", "requires_key": True,  "type": "api"},
    "replicate":  {"name": "Replicate",         "color": "#0891b2", "requires_key": True,  "type": "api"},
    "fal":        {"name": "Fal.ai",            "color": "#f59e0b", "requires_key": True,  "type": "api"},
    "together":   {"name": "Together AI",       "color": "#6366f1", "requires_key": True,  "type": "api"},
    "fireworks":  {"name": "Fireworks AI",      "color": "#ef4444", "requires_key": True,  "type": "api"},
    "openai":     {"name": "OpenAI DALL·E",     "color": "#10a37f", "requires_key": True,  "type": "api"},
    "comfyui":    {"name": "ComfyUI (Local)",   "color": "#34d399", "requires_key": False, "type": "local"},
    "a1111":      {"name": "A1111 (Local)",     "color": "#60a5fa", "requires_key": False, "type": "local"},
    "custom":     {"name": "Custom Endpoint",   "color": "#94a3b8", "requires_key": False, "type": "custom"},
}

# ── Model catalog ──────────────────────────────────────────────────────────
MODEL_CATALOG = {
    "stability": [
        {"id": "sd3-large",              "name": "Stable Diffusion 3 Large",  "type": "txt2img"},
        {"id": "sd3-medium",             "name": "Stable Diffusion 3 Medium", "type": "txt2img"},
        {"id": "stable-image/generate",  "name": "Stable Image Core",         "type": "txt2img"},
        {"id": "stable-image/upscale",   "name": "Stable Image Upscale",      "type": "upscale"},
    ],
    "replicate": [
        {"id": "black-forest-labs/flux-1.1-pro",     "name": "Flux 1.1 Pro",    "type": "txt2img"},
        {"id": "black-forest-labs/flux-dev",         "name": "Flux Dev",        "type": "txt2img"},
        {"id": "black-forest-labs/flux-schnell",     "name": "Flux Schnell",    "type": "txt2img"},
        {"id": "stability-ai/sdxl",                  "name": "SDXL",            "type": "txt2img"},
        {"id": "stability-ai/stable-diffusion-3",    "name": "SD3",             "type": "txt2img"},
        {"id": "lucataco/animate-diff",              "name": "AnimateDiff",     "type": "txt2video"},
        {"id": "anotherjesse/zeroscope-v2-xl",       "name": "Zeroscope XL",    "type": "txt2video"},
        {"id": "tencent/hunyuan-video",              "name": "HunyuanVideo",    "type": "txt2video"},
    ],
    "fal": [
        {"id": "fal-ai/flux-pro/v1.1",   "name": "Flux 1.1 Pro",        "type": "txt2img"},
        {"id": "fal-ai/flux/dev",        "name": "Flux Dev",             "type": "txt2img"},
        {"id": "fal-ai/flux/schnell",    "name": "Flux Schnell (Fast)",  "type": "txt2img"},
        {"id": "fal-ai/flux-pro",        "name": "Flux Pro",             "type": "txt2img"},
        {"id": "fal-ai/stable-diffusion-xl", "name": "SDXL",            "type": "txt2img"},
        {"id": "fal-ai/kling-video/v1/standard/text-to-video", "name": "Kling Video", "type": "txt2video"},
        {"id": "fal-ai/minimax-video",   "name": "MiniMax Video",        "type": "txt2video"},
        {"id": "fal-ai/fast-animatediff/turbo", "name": "AnimateDiff Turbo", "type": "txt2video"},
        {"id": "fal-ai/lipsync",         "name": "LipSync",              "type": "img2video"},
    ],
    "together": [
        {"id": "black-forest-labs/FLUX.1-schnell-Free", "name": "Flux Schnell (Free)", "type": "txt2img"},
        {"id": "black-forest-labs/FLUX.1.1-pro",        "name": "Flux 1.1 Pro",        "type": "txt2img"},
        {"id": "black-forest-labs/FLUX.1-dev",          "name": "Flux Dev",            "type": "txt2img"},
        {"id": "stabilityai/stable-diffusion-xl-base-1.0", "name": "SDXL",            "type": "txt2img"},
    ],
    "openai": [
        {"id": "dall-e-3",   "name": "DALL·E 3",        "type": "txt2img"},
        {"id": "dall-e-2",   "name": "DALL·E 2",        "type": "txt2img"},
        {"id": "gpt-image-1","name": "GPT Image 1",     "type": "txt2img"},
    ],
    "fireworks": [
        {"id": "accounts/fireworks/models/stable-diffusion-xl-1024-v1-0", "name": "SDXL 1.0", "type": "txt2img"},
        {"id": "accounts/fireworks/models/playground-v2-5-1024px-aesthetic", "name": "Playground v2.5", "type": "txt2img"},
    ],
    "comfyui": [
        {"id": "flux-dev",  "name": "Flux Dev (Local)",       "type": "txt2img"},
        {"id": "sdxl",      "name": "SDXL (Local)",           "type": "txt2img"},
        {"id": "sd15",      "name": "SD 1.5 (Local)",         "type": "txt2img"},
        {"id": "custom",    "name": "Custom Workflow",        "type": "custom"},
    ],
    "a1111": [
        {"id": "default",   "name": "Active Model",          "type": "txt2img"},
    ],
}

# ── Pricing estimates (per image) ──────────────────────────────────────────
PRICING = {
    # Stability
    "sd3-large": 0.065, "sd3-medium": 0.035, "stable-image": 0.02,
    # Replicate
    "flux-1.1-pro": 0.04, "flux-dev": 0.025, "flux-schnell": 0.003, "sdxl": 0.0023,
    "zeroscope": 0.08, "hunyuan-video": 0.25,
    # Fal
    "flux/dev": 0.025, "flux/schnell": 0.003, "flux-pro": 0.05,
    "kling-video": 0.28, "minimax-video": 0.35,
    # Together
    "flux.1-schnell-free": 0.0, "flux.1.1-pro": 0.04, "flux.1-dev": 0.025,
    # OpenAI
    "dall-e-3": 0.04, "dall-e-2": 0.018, "gpt-image-1": 0.04,
}

def estimate_cost(model: str) -> float:
    m = model.lower()
    for key, price in PRICING.items():
        if key in m:
            return price
    return 0.0


# ── Main generation router ─────────────────────────────────────────────────
async def generate(
    provider: str,
    api_key: str,
    model: str,
    job_type: str,
    prompt: str,
    negative_prompt: str = "",
    params: dict | None = None,
    endpoint_url: str = "",
) -> dict:
    """
    Route a generation job to the appropriate provider.
    Returns: {images:[{url,b64}], cost, latency_ms, model, error?}
    """
    t0 = time.time()
    params = params or {}

    try:
        if provider == "stability":
            result = await _stability(api_key, model, job_type, prompt, negative_prompt, params)
        elif provider == "replicate":
            result = await _replicate(api_key, model, job_type, prompt, negative_prompt, params)
        elif provider == "fal":
            result = await _fal(api_key, model, job_type, prompt, negative_prompt, params)
        elif provider == "together":
            result = await _together(api_key, model, prompt, params)
        elif provider == "openai":
            result = await _openai_images(api_key, model, prompt, params)
        elif provider == "fireworks":
            result = await _fireworks(api_key, model, prompt, params)
        elif provider == "comfyui":
            base = endpoint_url or "http://localhost:8188"
            result = await _comfyui(base, model, job_type, prompt, negative_prompt, params)
        elif provider == "a1111":
            base = endpoint_url or "http://localhost:7860"
            result = await _a1111(base, model, job_type, prompt, negative_prompt, params)
        elif provider == "custom":
            result = await _custom(endpoint_url, api_key, model, job_type, prompt, negative_prompt, params)
        else:
            return {"error": f"Unknown provider: {provider}"}
    except httpx.TimeoutException:
        return {"error": "Request timed out. GPU inference can take 30-120s — try again.", "latency_ms": 120000}
    except httpx.ConnectError as e:
        return {"error": f"Cannot connect to {provider}: {e}. Check endpoint URL.", "latency_ms": 0}
    except Exception as e:
        return {"error": str(e), "latency_ms": int((time.time()-t0)*1000)}

    result["latency_ms"] = int((time.time()-t0)*1000)
    result["cost"] = result.get("cost") or estimate_cost(model)
    result["model"] = model
    return result


async def _stability(api_key, model, job_type, prompt, neg_prompt, params):
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 30)
    cfg    = params.get("cfg_scale", 7)

    if "sd3" in model.lower():
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(
                f"https://api.stability.ai/v2beta/stable-image/generate/sd3",
                headers={"authorization": f"Bearer {api_key}", "accept": "image/*"},
                data={"prompt": prompt, "negative_prompt": neg_prompt, "model": model,
                      "output_format": "png", "width": width, "height": height, "steps": steps},
            )
            if not r.is_success:
                return {"error": f"Stability error {r.status_code}: {r.text[:200]}"}
            b64 = base64.b64encode(r.content).decode()
            return {"images": [{"url": f"data:image/png;base64,{b64}", "b64": b64}]}
    else:
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(
                "https://api.stability.ai/v2beta/stable-image/generate/core",
                headers={"authorization": f"Bearer {api_key}", "accept": "image/*"},
                data={"prompt": prompt, "negative_prompt": neg_prompt,
                      "output_format": "png", "aspect_ratio": f"{width}:{height}"},
            )
            if not r.is_success:
                return {"error": f"Stability error {r.status_code}: {r.text[:200]}"}
            b64 = base64.b64encode(r.content).decode()
            return {"images": [{"url": f"data:image/png;base64,{b64}", "b64": b64}]}


async def _replicate(api_key, model, job_type, prompt, neg_prompt, params):
    import asyncio
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 25)
    cfg    = params.get("cfg_scale", 3.5)
    num    = params.get("num_images", 1)

    is_video = job_type == "txt2video"
    inp: dict[str, Any] = {"prompt": prompt}
    if not is_video:
        inp.update({"width": width, "height": height, "num_inference_steps": steps,
                    "guidance_scale": cfg, "num_outputs": num})
        if neg_prompt:
            inp["negative_prompt"] = neg_prompt

    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            f"https://api.replicate.com/v1/models/{model}/predictions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"input": inp},
        )
        if not r.is_success:
            return {"error": f"Replicate error {r.status_code}: {r.text[:200]}"}
        pred = r.json()
        pred_id = pred.get("id", "")
        if not pred_id:
            return {"error": "No prediction ID returned"}

    # Poll for completion
    for _ in range(60):
        await asyncio.sleep(2)
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(
                f"https://api.replicate.com/v1/predictions/{pred_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            d = r.json()
            status = d.get("status", "")
            if status == "succeeded":
                output = d.get("output", [])
                if isinstance(output, str):
                    output = [output]
                images = [{"url": u} for u in (output if output else [])]
                return {"images": images, "video_url": output[0] if is_video and output else None}
            elif status in ("failed", "canceled"):
                return {"error": d.get("error", "Prediction failed")}
    return {"error": "Replicate prediction timed out after 120s"}


async def _fal(api_key, model, job_type, prompt, neg_prompt, params):
    import asyncio
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 28)
    cfg    = params.get("guidance_scale", 3.5)
    num    = params.get("num_images", 1)

    inp: dict[str, Any] = {"prompt": prompt}
    if job_type != "txt2video":
        inp.update({"image_size": {"width": width, "height": height},
                    "num_inference_steps": steps, "guidance_scale": cfg,
                    "num_images": num})
        if neg_prompt:
            inp["negative_prompt"] = neg_prompt
    else:
        inp.update({"duration": params.get("duration", 5),
                    "aspect_ratio": params.get("aspect_ratio", "16:9")})

    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            f"https://queue.fal.run/{model}",
            headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
            json=inp,
        )
        if not r.is_success:
            return {"error": f"Fal error {r.status_code}: {r.text[:200]}"}
        req_data = r.json()
        req_id = req_data.get("request_id", "")
        status_url = req_data.get("status_url", f"https://queue.fal.run/{model}/requests/{req_id}/status")
        result_url = req_data.get("response_url", f"https://queue.fal.run/{model}/requests/{req_id}")

    for _ in range(90):
        await asyncio.sleep(2)
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(status_url, headers={"Authorization": f"Key {api_key}"})
            d = r.json()
            status = d.get("status", "")
            if status == "COMPLETED":
                # Fetch result
                async with httpx.AsyncClient(timeout=30) as c2:
                    rr = await c2.get(result_url, headers={"Authorization": f"Key {api_key}"})
                    result = rr.json()
                imgs = result.get("images", [])
                if not imgs and result.get("image"):
                    imgs = [result["image"]]
                images = [{"url": i.get("url", i) if isinstance(i, dict) else i} for i in imgs]
                video_url = result.get("video", {}).get("url") if job_type == "txt2video" else None
                return {"images": images, "video_url": video_url}
            elif status in ("FAILED", "ERROR"):
                return {"error": d.get("error", "Fal job failed")}
    return {"error": "Fal request timed out after 180s"}


async def _together(api_key, model, prompt, params):
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 4)
    num    = params.get("num_images", 1)

    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "prompt": prompt, "width": width, "height": height,
                  "steps": steps, "n": num, "response_format": "url"},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"Together error {r.status_code}")}
        images = [{"url": item.get("url", "")} for item in d.get("data", [])]
        return {"images": images}


async def _openai_images(api_key, model, prompt, params):
    size = f"{params.get('width',1024)}x{params.get('height',1024)}"
    num  = min(params.get("num_images", 1), 4)
    quality = params.get("quality", "standard")

    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "prompt": prompt, "n": num, "size": size,
                  "quality": quality, "response_format": "url"},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("error", {}).get("message", f"OpenAI error {r.status_code}")}
        images = [{"url": item.get("url", "")} for item in d.get("data", [])]
        return {"images": images}


async def _fireworks(api_key, model, prompt, params):
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 30)
    cfg    = params.get("cfg_scale", 7)

    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(
            "https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/" + model.split("/")[-1],
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"prompt": prompt, "height": height, "width": width,
                  "num_inference_steps": steps, "guidance_scale": cfg, "num_images_per_prompt": 1},
        )
        d = r.json()
        if not r.is_success:
            return {"error": d.get("message", f"Fireworks error {r.status_code}")}
        imgs = d.get("output", {}).get("choices", [])
        if not imgs:
            imgs = [{"image_base64": d.get("output", {}).get("image_base64", "")}]
        images = []
        for img in imgs:
            b64 = img.get("image_base64", "")
            if b64:
                images.append({"url": f"data:image/png;base64,{b64}", "b64": b64})
        return {"images": images}


async def _comfyui(base_url, model, job_type, prompt, neg_prompt, params):
    """ComfyUI via /prompt endpoint."""
    import asyncio
    width  = params.get("width", 1024)
    height = params.get("height", 1024)
    steps  = params.get("steps", 20)
    cfg    = params.get("cfg_scale", 7)
    seed   = params.get("seed", -1)

    # Simple txt2img workflow
    workflow = {
        "3": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler",
            "scheduler": "karras", "denoise": 1.0,
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0],
        }},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": model or "v1-5-pruned-emaonly.safetensors"}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": neg_prompt or "ugly, blurry, low quality", "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode",   "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage",   "inputs": {"filename_prefix": "axto_studio", "images": ["8", 0]}},
    }

    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{base_url}/prompt", json={"prompt": workflow})
        if not r.is_success:
            return {"error": f"ComfyUI error {r.status_code}: {r.text[:200]}"}
        prompt_id = r.json().get("prompt_id", "")

    # Poll history
    for _ in range(60):
        await asyncio.sleep(2)
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(f"{base_url}/history/{prompt_id}")
            hist = r.json()
            if prompt_id in hist:
                outputs = hist[prompt_id].get("outputs", {})
                images = []
                for node_id, node_out in outputs.items():
                    for img in node_out.get("images", []):
                        fname = img.get("filename", "")
                        subdir = img.get("subfolder", "")
                        img_url = f"{base_url}/view?filename={fname}&subfolder={subdir}&type=output"
                        images.append({"url": img_url})
                return {"images": images}
    return {"error": "ComfyUI timed out"}


async def _a1111(base_url, model, job_type, prompt, neg_prompt, params):
    width  = params.get("width", 512)
    height = params.get("height", 512)
    steps  = params.get("steps", 20)
    cfg    = params.get("cfg_scale", 7)
    seed   = params.get("seed", -1)
    num    = params.get("num_images", 1)

    endpoint = "txt2img" if job_type != "img2img" else "img2img"
    payload: dict[str, Any] = {
        "prompt": prompt, "negative_prompt": neg_prompt or "",
        "steps": steps, "cfg_scale": cfg, "seed": seed,
        "width": width, "height": height, "batch_size": num,
    }
    if model and model != "default":
        payload["override_settings"] = {"sd_model_checkpoint": model}

    async with httpx.AsyncClient(timeout=180) as c:
        r = await c.post(f"{base_url}/sdapi/v1/{endpoint}", json=payload)
        if not r.is_success:
            return {"error": f"A1111 error {r.status_code}: {r.text[:200]}"}
        d = r.json()
        images = [{"url": f"data:image/png;base64,{b64}", "b64": b64} for b64 in d.get("images", [])]
        return {"images": images}


async def _custom(endpoint_url, api_key, model, job_type, prompt, neg_prompt, params):
    """Generic custom endpoint — tries OpenAI image API format first, then raw POST."""
    if not endpoint_url:
        return {"error": "Custom endpoint URL required"}
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    body = {"prompt": prompt, "model": model, "negative_prompt": neg_prompt, **params}

    async with httpx.AsyncClient(timeout=120) as c:
        # Try OpenAI-compat first
        try:
            r = await c.post(f"{endpoint_url.rstrip('/')}/v1/images/generations", headers=headers, json=body)
            if r.is_success:
                d = r.json()
                images = [{"url": item.get("url", "")} for item in d.get("data", [])]
                return {"images": images}
        except Exception:
            pass

        # Fallback: raw POST
        r = await c.post(endpoint_url, headers=headers, json=body)
        if not r.is_success:
            return {"error": f"Custom endpoint error {r.status_code}: {r.text[:200]}"}
        d = r.json()
        # Try to extract images from common response shapes
        images = (d.get("images") or d.get("outputs") or d.get("data") or [])
        if not images and d.get("url"):
            images = [{"url": d["url"]}]
        if not images and d.get("image"):
            images = [{"url": d["image"]}]
        return {"images": [{"url": i.get("url", i) if isinstance(i, dict) else i} for i in images]}


# ── Health check ──────────────────────────────────────────────────────────
async def check_endpoint_health(provider: str, endpoint_url: str, api_key: str = "") -> dict:
    try:
        if provider == "comfyui":
            async with httpx.AsyncClient(timeout=8) as c:
                r = await c.get(f"{endpoint_url.rstrip('/')}/system_stats")
                return {"status": "online", "info": r.json() if r.is_success else {}}
        elif provider == "a1111":
            async with httpx.AsyncClient(timeout=8) as c:
                r = await c.get(f"{endpoint_url.rstrip('/')}/sdapi/v1/progress")
                if r.is_success:
                    d = r.json()
                    return {"status": "online", "info": {"progress": d.get("progress", 0)}}
                return {"status": "error"}
        elif provider in ("stability", "replicate", "fal", "together", "openai"):
            # Just confirm API key format
            return {"status": "configured", "info": {"requires_live_check": True}}
        else:
            async with httpx.AsyncClient(timeout=8) as c:
                r = await c.get(endpoint_url.rstrip('/'), headers={"Authorization": f"Bearer {api_key}"} if api_key else {})
                return {"status": "online" if r.is_success else "error"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}
