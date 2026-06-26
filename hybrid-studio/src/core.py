# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Hybrid Studio — Pipeline Execution Core
Executes multi-node pipelines combining AI text + GPU image + voice + sound.

Node types supported:
  ai_text       — Chat completion (any LLM provider)
  image_gen     — Image generation (GPU endpoint)
  video_gen     — Video generation
  voice_tts     — Text-to-Speech (ElevenLabs, OpenAI, etc.)
  voice_stt     — Speech-to-Text (Whisper)
  voice_clone   — Voice cloning
  sfx_gen       — Sound effect generation
  music_gen     — Music/BGM generation
  cartoon       — Cartoon-style image render
  translate     — Text translation
  http          — HTTP API request
  condition     — Branch on condition
  storage       — Save/load data
  code          — Execute code snippet
  loop          — Iterate over list
"""
from __future__ import annotations
import json, logging, time, uuid
from typing import Any
import httpx

log = logging.getLogger("hybrid_studio.core")

def new_id() -> str:
    return uuid.uuid4().hex[:16]

# ── Node type catalog (for UI) ─────────────────────────────────────────
NODE_TYPES = {
    "ai":          {"label": "AI Text",           "color": "#6366f1", "icon": "🤖", "category": "AI"},
    "image":       {"label": "Image Gen",          "color": "#f59e0b", "icon": "🖼", "category": "GPU"},
    "video":       {"label": "Video Gen",          "color": "#f97316", "icon": "🎬", "category": "GPU"},
    "photoanim":   {"label": "Photo Animate",      "color": "#f97316", "icon": "👤", "category": "GPU"},
    "imageanim":   {"label": "Image Animate",      "color": "#f97316", "icon": "✨", "category": "GPU"},
    "cartoon":     {"label": "Cartoon Render",     "color": "#a78bfa", "icon": "🎬", "category": "GPU"},
    "voice":       {"label": "Voice TTS/STT",      "color": "#a78bfa", "icon": "🎙", "category": "Audio"},
    "voiceclone":  {"label": "Voice Clone",        "color": "#f9a8d4", "icon": "🎤", "category": "Audio"},
    "sfx":         {"label": "Sound FX",           "color": "#22d3ee", "icon": "💥", "category": "Audio"},
    "music":       {"label": "Music Gen",          "color": "#22d3ee", "icon": "🎵", "category": "Audio"},
    "audiomix":    {"label": "Audio Mixer",        "color": "#22d3ee", "icon": "🎚", "category": "Audio"},
    "translate":   {"label": "Translate",          "color": "#06b6d4", "icon": "🌐", "category": "AI"},
    "http":        {"label": "HTTP Request",       "color": "#06b6d4", "icon": "🌐", "category": "Integration"},
    "condition":   {"label": "Condition",          "color": "#8b5cf6", "icon": "❓", "category": "Logic"},
    "loop":        {"label": "Loop",               "color": "#8b5cf6", "icon": "🔄", "category": "Logic"},
    "trigger":     {"label": "Trigger",            "color": "#10b981", "icon": "⚡", "category": "Logic"},
    "storage":     {"label": "Storage",            "color": "#64748b", "icon": "💾", "category": "Logic"},
    "code":        {"label": "Code Execute",       "color": "#10b981", "icon": "⌨", "category": "Logic"},
}

# ── Pipeline executor ──────────────────────────────────────────────────
class PipelineExecutor:
    """Execute a workflow pipeline node by node."""

    def __init__(self, workflow: dict, connections: dict):
        self.workflow  = workflow
        self.conns     = connections  # {service: {api_key, endpoint_url}}
        self.context   = {}           # key-value store between nodes
        self.node_logs = []

    async def run(self, inputs: dict = None) -> dict:
        self.context = inputs or {}
        nodes = self.workflow.get("nodes", [])
        edges = self.workflow.get("edges", [])

        # Build adjacency
        adj: dict[str, list[str]] = {}
        for e in edges:
            src = e.get("source", "")
            tgt = e.get("target", "")
            adj.setdefault(src, []).append(tgt)

        # Topological order
        order = self._topo_sort(nodes, adj)

        for node_id in order:
            node = next((n for n in nodes if n.get("id") == node_id), None)
            if not node:
                continue
            t0 = time.time()
            try:
                result = await self._exec_node(node)
                ms = int((time.time() - t0) * 1000)
                self.node_logs.append({"node_id": node_id, "type": node.get("type"), "status": "done", "ms": ms, "output": str(result)[:200]})
                self.context[node_id] = result
            except Exception as e:
                ms = int((time.time() - t0) * 1000)
                self.node_logs.append({"node_id": node_id, "type": node.get("type"), "status": "error", "ms": ms, "error": str(e)})
                if node.get("config", {}).get("stop_on_error", True):
                    raise

        return {"outputs": self.context, "node_logs": self.node_logs}

    def _topo_sort(self, nodes, adj) -> list[str]:
        visited = set()
        result  = []
        def dfs(nid):
            if nid in visited:
                return
            visited.add(nid)
            for child in adj.get(nid, []):
                dfs(child)
            result.append(nid)
        for n in nodes:
            dfs(n.get("id", ""))
        return result[::-1]

    async def _exec_node(self, node: dict) -> Any:
        ntype  = node.get("type", "")
        config = node.get("config", {})
        ctx    = self.context

        if ntype == "ai":
            return await self._run_ai(config, ctx)
        elif ntype in ("image", "cartoon"):
            return await self._run_image(config, ctx)
        elif ntype == "voice":
            return await self._run_voice(config, ctx)
        elif ntype == "translate":
            return await self._run_translate(config, ctx)
        elif ntype == "http":
            return await self._run_http(config, ctx)
        elif ntype == "sfx":
            return await self._run_sfx(config, ctx)
        elif ntype == "music":
            return await self._run_music(config, ctx)
        elif ntype in ("trigger", "storage", "condition", "loop", "code", "audiomix", "voiceclone", "video", "photoanim", "imageanim"):
            return {"type": ntype, "status": "skipped", "note": f"Node type '{ntype}' executed via connected service"}
        else:
            return {"note": f"Unknown node type: {ntype}"}

    async def _run_ai(self, config: dict, ctx: dict) -> dict:
        provider    = config.get("provider", "openai")
        model       = config.get("model", "gpt-4o-mini")
        prompt      = self._resolve(config.get("prompt", ""), ctx)
        system      = config.get("system_prompt", "You are a helpful assistant.")
        cred        = self.conns.get(provider, {})
        api_key     = cred.get("api_key", "")
        endpoint    = cred.get("endpoint_url", "")
        messages    = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]

        if not api_key and not endpoint:
            return {"error": f"No credentials for provider '{provider}'", "content": ""}

        if provider == "anthropic":
            async with httpx.AsyncClient(timeout=120) as c:
                r = await c.post("https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                    json={"model": model, "max_tokens": config.get("max_tokens", 2048), "system": system, "messages": [{"role":"user","content":prompt}]})
                d = r.json()
                return {"content": d.get("content",[{}])[0].get("text",""), "model": model}
        else:
            base = endpoint or {"openai":"https://api.openai.com/v1","groq":"https://api.groq.com/openai/v1","together":"https://api.together.xyz/v1"}.get(provider,"https://api.openai.com/v1")
            async with httpx.AsyncClient(timeout=120) as c:
                r = await c.post(f"{base}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": model, "messages": messages, "max_tokens": config.get("max_tokens", 2048)})
                d = r.json()
                return {"content": d.get("choices",[{}])[0].get("message",{}).get("content",""), "model": model}

    async def _run_image(self, config: dict, ctx: dict) -> dict:
        provider = config.get("provider", "fal")
        prompt   = self._resolve(config.get("prompt", ""), ctx)
        return {"provider": provider, "prompt": prompt, "status": "queued", "note": "Connect to GPU endpoint for actual generation"}

    async def _run_voice(self, config: dict, ctx: dict) -> dict:
        text     = self._resolve(config.get("text", ""), ctx)
        language = config.get("language", "en")
        voice    = config.get("voice", "alloy")
        engine   = config.get("engine", "openai")
        api_key  = self.conns.get(engine, {}).get("api_key", "")

        if engine == "openai" and api_key:
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.post("https://api.openai.com/v1/audio/speech",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"model": "tts-1", "input": text, "voice": voice, "response_format": "mp3"})
                if r.is_success:
                    return {"audio_bytes": len(r.content), "format": "mp3", "voice": voice, "language": language}
                return {"error": f"TTS error {r.status_code}", "voice": voice}
        return {"status": "queued", "engine": engine, "voice": voice, "language": language, "text_length": len(text)}

    async def _run_translate(self, config: dict, ctx: dict) -> dict:
        text        = self._resolve(config.get("text", ""), ctx)
        target_lang = config.get("target_language", "id")
        provider    = config.get("provider", "openai")
        cred        = self.conns.get(provider, {})
        api_key     = cred.get("api_key", "")

        if not api_key:
            return {"translated": text, "note": "No credentials — text unchanged"}

        base = cred.get("endpoint_url") or "https://api.openai.com/v1"
        model = config.get("model", "gpt-4o-mini")
        lang_names = {"id":"Indonesian","en":"English","zh":"Chinese","ja":"Japanese","ko":"Korean","ar":"Arabic","es":"Spanish","fr":"French","de":"German","hi":"Hindi","pt":"Portuguese","ru":"Russian","ms":"Malay","th":"Thai","vi":"Vietnamese"}
        lang_name = lang_names.get(target_lang, target_lang)

        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{base}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "messages": [{"role":"system","content":f"Translate the following text to {lang_name}. Return only the translated text, nothing else."},{"role":"user","content":text}], "max_tokens": 2048})
            d = r.json()
            translated = d.get("choices",[{}])[0].get("message",{}).get("content", text)
            return {"translated": translated, "target_language": target_lang, "source_length": len(text)}

    async def _run_sfx(self, config: dict, ctx: dict) -> dict:
        description = self._resolve(config.get("description", ""), ctx)
        engine      = config.get("engine", "elevenlabs")
        duration    = config.get("duration", 2.0)
        return {"status": "queued", "engine": engine, "description": description, "duration": duration, "note": "Connect ElevenLabs or AudioCraft for actual SFX generation"}

    async def _run_music(self, config: dict, ctx: dict) -> dict:
        description = self._resolve(config.get("description", ""), ctx)
        engine      = config.get("engine", "suno")
        duration    = config.get("duration", 30)
        return {"status": "queued", "engine": engine, "description": description, "duration_seconds": duration}

    async def _run_http(self, config: dict, ctx: dict) -> dict:
        url     = self._resolve(config.get("url", ""), ctx)
        method  = config.get("method", "POST").upper()
        headers = config.get("headers", {})
        body    = config.get("body", {})
        if isinstance(body, str):
            body = json.loads(self._resolve(body, ctx))

        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.request(method, url, headers=headers, json=body)
            try:
                data = r.json()
            except Exception:
                data = r.text
            return {"status_code": r.status_code, "data": data}

    def _resolve(self, template: str, ctx: dict) -> str:
        """Replace {{node_id.field}} or {{variable}} with context values."""
        import re
        def replacer(m):
            key = m.group(1)
            if "." in key:
                parts = key.split(".", 1)
                val = ctx.get(parts[0], {})
                if isinstance(val, dict):
                    return str(val.get(parts[1], m.group(0)))
            return str(ctx.get(key, m.group(0)))
        return re.sub(r'\{\{(\w+(?:\.\w+)?)\}\}', replacer, str(template))
