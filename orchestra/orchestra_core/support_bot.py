"""
Axto AI Support Bot
Menggunakan Orchestra sendiri untuk menjawab pertanyaan support.
Bot tahu kondisi sistem saat ini (health, incidents, config) dan
memberikan jawaban yang kontekstual — bukan jawaban generik.

Architecture:
  User question → Context Builder → AI (via Orchestra/direct) → Answer

Context Builder mengumpulkan:
  - Current system health (dari health.py)
  - Active incidents
  - Recent errors from logs
  - Relevant runbooks
  - System config (non-sensitive)

Diakses via:
  POST /support/ask       → one-shot Q&A
  WebSocket /support/ws   → real-time streaming chat
  GET  /support/history   → conversation history
  POST /support/diagnose  → paste error message, get diagnosis

Model: Claude Sonnet (via Orchestra if configured, else direct API)
Fallback: GPT-4o-mini if Anthropic not available
"""
from __future__ import annotations

import asyncio, json, logging, os, time
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional

log = logging.getLogger("axto.support_bot")

DATA_DIR       = Path(os.environ.get("GUARDIAN_DATA_DIR",
                       os.environ.get("DATA_DIR", "./data")))
HISTORY_FILE   = DATA_DIR / "support_history.json"
MAX_HISTORY    = 50       # keep last N conversations
CONTEXT_TOKENS = 3000     # max tokens for context injection


# ── System context builder ────────────────────────────────────────────────────

class SystemContextBuilder:
    """
    Gathers real-time system state to inject into AI prompt.
    Membuat AI tahu kondisi aktual sistem user — bukan tebak-tebakan.
    """

    def __init__(self, mode: str = "guardian"):
        self.mode = mode   # "guardian" or "orchestra"

    async def build(self, question: str) -> str:
        """Build context string for the current question."""
        parts = [f"# System Context (live snapshot at {time.strftime('%Y-%m-%d %H:%M:%S UTC')})\n"]

        # Health summary
        health = await self._get_health()
        if health:
            parts.append(f"## System Health\n{health}\n")

        # Active incidents (Guardian only)
        if self.mode == "guardian":
            incidents = await self._get_incidents()
            if incidents:
                parts.append(f"## Active Incidents\n{incidents}\n")

        # Recent errors
        errors = await self._get_recent_errors()
        if errors:
            parts.append(f"## Recent Errors (last 10 min)\n{errors}\n")

        # Relevant runbooks based on question
        runbooks = self._get_relevant_runbooks(question)
        if runbooks:
            parts.append(f"## Relevant Runbooks\n{runbooks}\n")

        # Config summary
        config = await self._get_config_summary()
        if config:
            parts.append(f"## Configuration Summary\n{config}\n")

        return "\n".join(parts)

    async def _get_health(self) -> str:
        try:
            if self.mode == "guardian":
                from src.health import get_watchdog
                wd  = get_watchdog()
                h   = wd.last_health
                if not h:
                    from src.health import run_full_diagnostic
                    h = await run_full_diagnostic()
            else:
                from health import run_full_diagnostic
                h = run_full_diagnostic()

            lines = [f"Overall: {h.overall.upper()} (score={h.score}/100)"]
            for name, comp in h.components.items():
                emoji = "✅" if comp.status == "ok" else ("⚠️" if comp.status == "degraded" else "🔴")
                lines.append(f"  {emoji} {name}: {comp.status} — {comp.message}")
                if comp.status != "ok" and comp.fix:
                    lines.append(f"      Fix: {comp.fix}")
            return "\n".join(lines)
        except Exception as e:
            return f"Health check unavailable: {e}"

    async def _get_incidents(self) -> str:
        try:
            from src.core import GuardianCore
            stats = GuardianCore.get().incident_mgr.get_stats()
            incs  = GuardianCore.get().incident_mgr.list_incidents(status="open", limit=5)
            lines = [f"Open: {stats.get('open',0)}, Closed: {stats.get('closed',0)}"]
            for inc in incs[:5]:
                lines.append(f"  🚨 [{inc['severity'].upper()}] {inc['title']} (id={inc['id']})")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_recent_errors(self) -> str:
        try:
            errors = []
            # Read recent log entries (last 10 minutes)
            log_file = DATA_DIR / "guardian.log"
            if not log_file.exists():
                log_file = Path("/var/log/guardian.log")
            if log_file.exists():
                cutoff = time.time() - 600
                with open(log_file) as f:
                    lines = f.readlines()[-200:]
                for line in lines:
                    if "ERROR" in line or "CRITICAL" in line or "WARNING" in line:
                        errors.append(line.strip()[:200])
            return "\n".join(errors[-10:]) if errors else "No recent errors"
        except Exception:
            return ""

    def _get_relevant_runbooks(self, question: str) -> str:
        try:
            from runbook import search_runbooks
            rbs = search_runbooks(question)[:3]
            if not rbs:
                from runbook import get_runbook_for_error
                rbs = get_runbook_for_error(question)[:3]
            if not rbs:
                return ""
            lines = []
            for rb in rbs:
                lines.append(f"**{rb.code}: {rb.title}**")
                lines.append(f"  Steps: {' → '.join(rb.steps[:3])}")
                if rb.commands:
                    lines.append(f"  Commands: {rb.commands[0]}")
            return "\n".join(lines)
        except Exception:
            return ""

    async def _get_config_summary(self) -> str:
        try:
            if self.mode == "guardian":
                from src.config.settings import get_config
                cfg = get_config()
                return (f"Mode: {cfg.scan_mode}, Interval: {cfg.scan_interval}s, "
                        f"Paths: {cfg.scan_paths}, Nodes: {cfg.max_nodes}")
            else:
                from database import get_all_settings
                s = get_all_settings()
                return (f"Routing: {s.get('routing_mode','?')}, "
                        f"Cache: {s.get('cache_enabled','?')}, "
                        f"Autoscale: {s.get('autoscale_enabled','?')}")
        except Exception:
            return ""


# ── AI caller ─────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are the Axto AI Support Assistant — an expert on the Axto security and AI orchestration platform.

You have access to the user's LIVE SYSTEM STATE injected in each message. Use this context to give specific, actionable answers.

Rules:
1. Always reference the actual system state in your answer
2. Give exact commands to run — not vague suggestions
3. If health shows a component is failing, address that directly
4. If a runbook exists for the issue, walk through its steps
5. Never say "I don't know" — reason from the context provided
6. Be concise but complete. Format with markdown for readability.
7. Always end with "Next step:" telling the user exactly what to do first.

You support: Guardian AI (security/EDR), Orchestra Core (AI orchestration), Worker CPU/GPU.
Product docs: https://docs.axto.ai
"""


async def call_ai(messages: List[dict], stream: bool = False) -> str:
    """Call AI model. Tries Orchestra first, then direct API."""

    # Try via Orchestra (uses routing, fallback, quality retry)
    orchestra_url = os.environ.get("ORCHESTRA_CORE_URL", "")
    console_token = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD",
                                    os.environ.get("AXTO_CONSOLE_TOKEN", ""))

    if orchestra_url and console_token:
        try:
            import urllib.request
            payload = json.dumps({
                "task_type": "chat",
                "messages":  messages,
                "priority":  "high",
                "max_tokens": 1500,
                "temperature": 0.3,
                "metadata": {"source": "support_bot"},
            }).encode()
            req = urllib.request.Request(
                f"{orchestra_url}/api/jobs/submit", data=payload,
                headers={"X-Console-Token": console_token,
                         "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                data   = json.loads(r.read())
                job_id = data.get("job_id", "")

                if data.get("from_cache"):
                    return data.get("result", "")

                # Poll for result
                for _ in range(60):
                    await asyncio.sleep(1)
                    req2 = urllib.request.Request(
                        f"{orchestra_url}/api/jobs/{job_id}",
                        headers={"X-Console-Token": console_token}
                    )
                    with urllib.request.urlopen(req2, timeout=10) as r2:
                        job = json.loads(r2.read())
                        if job.get("status") == "done":
                            return job.get("result", "No response generated")
                        if job.get("status") == "error":
                            raise Exception(f"Job failed: {job.get('error')}")
        except Exception as e:
            log.warning(f"Orchestra routing failed, falling back to direct API: {e}")

    # Direct API fallback — try Anthropic then OpenAI
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    openai_key    = os.environ.get("OPENAI_API_KEY", "")

    if anthropic_key:
        try:
            import urllib.request
            payload = json.dumps({
                "model": "claude-sonnet-4-6",
                "max_tokens": 1500,
                "messages": messages,
            }).encode()
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages", data=payload,
                headers={"x-api-key": anthropic_key,
                         "anthropic-version": "2023-06-01",
                         "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                return data["content"][0]["text"]
        except Exception as e:
            log.warning(f"Anthropic fallback failed: {e}")

    if openai_key:
        try:
            import urllib.request
            payload = json.dumps({
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
                "max_tokens": 1500,
                "temperature": 0.3,
            }).encode()
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions", data=payload,
                headers={"Authorization": f"Bearer {openai_key}",
                         "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            log.warning(f"OpenAI fallback failed: {e}")

    return ("❌ AI Support temporarily unavailable — no AI provider configured.\n\n"
            "**Quick fix options:**\n"
            "1. Configure an API key: add ANTHROPIC_API_KEY or OPENAI_API_KEY env var\n"
            "2. Or add a provider via Orchestra vault: POST /api/vault/store\n\n"
            "**Meanwhile, check the runbook:** GET /runbook/ for manual troubleshooting guides.")


# ── Support Bot core ──────────────────────────────────────────────────────────

class SupportBot:
    def __init__(self, mode: str = "guardian"):
        self.mode       = mode
        self._context   = SystemContextBuilder(mode)
        self._history:  List[dict] = []   # global conversation buffer
        self._sessions: Dict[str, List[dict]] = {}   # per-session history

    async def ask(self, question: str, session_id: str = "default") -> dict:
        """
        Ask a question. Returns answer with sources and suggested next steps.
        """
        t0 = time.time()

        # Build live context
        context = await self._context.build(question)

        # Get session history
        session = self._sessions.setdefault(session_id, [])

        # Build message list for AI
        system_with_context = f"{SYSTEM_PROMPT}\n\n{context}"
        messages = []
        # Include last 5 turns for context
        for turn in session[-10:]:
            messages.append(turn)
        messages.append({"role": "user", "content": question})

        # Call AI with system message prepended
        full_messages = [{"role": "user",
                          "content": f"[System]: {system_with_context}\n\n[User question]: {question}"}]
        if session:
            full_messages = ([{"role": "user",
                               "content": f"[System]: {system_with_context}"}] +
                             session[-6:] +
                             [{"role": "user", "content": question}])

        answer = await call_ai(full_messages)

        # Update session
        session.append({"role": "user", "content": question})
        session.append({"role": "assistant", "content": answer})

        # Find related runbooks
        from runbook import get_runbook_for_error, search_runbooks
        related_rbs = (get_runbook_for_error(question + " " + answer) +
                       search_runbooks(question))[:3]

        # Save to persistent history
        self._save_history(session_id, question, answer)

        return {
            "answer":    answer,
            "session_id": session_id,
            "latency_ms": round((time.time()-t0)*1000),
            "related_runbooks": [{"code": rb.code, "title": rb.title}
                                  for rb in related_rbs],
            "context_snapshot": context[:500] + "..." if len(context) > 500 else context,
        }

    async def diagnose(self, error_message: str, session_id: str = "default") -> dict:
        """
        Paste an error message, get diagnosis + fix steps.
        More focused than ask() — specifically for error diagnosis.
        """
        question = (
            f"I'm getting this error:\n\n```\n{error_message[:2000]}\n```\n\n"
            f"What is causing this and how do I fix it? "
            f"Give me the exact commands to run."
        )
        return await self.ask(question, session_id)

    async def stream_ask(self, question: str,
                          session_id: str = "default") -> AsyncGenerator[str, None]:
        """
        Streaming version — yields answer chunks as they arrive.
        Used for WebSocket real-time chat.
        """
        # Build context (quick)
        context = await self._context.build(question)
        session = self._sessions.setdefault(session_id, [])

        # Real streaming via OpenAI-compatible stream=True
        import httpx, json as _json
        yield "⏳ Analyzing your system...\n\n"

        context = await self._context.build(question)
        session = self._sessions.setdefault(session_id, [])
        messages = [{"role": "system", "content": self._system_prompt + "\n\n" + context}]
        for h in session[-10:]:
            messages.append(h)
        messages.append({"role": "user", "content": question})

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                    json={"model": self._model, "messages": messages, "stream": True, "max_tokens": 1024}
                ) as resp:
                    full = ""
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "): continue
                        data = line[6:]
                        if data == "[DONE]": break
                        try:
                            chunk = _json.loads(data)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                full += delta
                                yield delta
                        except Exception:
                            continue
                    # Update session history
                    session.append({"role": "user", "content": question})
                    session.append({"role": "assistant", "content": full})
        except Exception as e:
            # Fallback to non-streaming
            result = await self.ask(question, session_id)
            yield result["answer"]

    def get_history(self, session_id: str = "default", limit: int = 20) -> List[dict]:
        session = self._sessions.get(session_id, [])
        # Convert to Q&A pairs
        pairs = []
        for i in range(0, len(session)-1, 2):
            if i+1 < len(session):
                pairs.append({
                    "question": session[i]["content"],
                    "answer":   session[i+1]["content"],
                })
        return pairs[-limit:]

    def clear_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def _save_history(self, session_id: str, question: str, answer: str) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            history = []
            if HISTORY_FILE.exists():
                try:
                    history = json.loads(HISTORY_FILE.read_text())
                except Exception:
                    history = []
            history.append({
                "ts": time.time(), "session": session_id,
                "q": question[:200], "a": answer[:500],
            })
            history = history[-MAX_HISTORY:]
            HISTORY_FILE.write_text(json.dumps(history, indent=2))
        except Exception:
            pass


# ── Singleton ─────────────────────────────────────────────────────────────────
_guardian_bot: Optional[SupportBot] = None
_orchestra_bot: Optional[SupportBot] = None


def get_guardian_bot() -> SupportBot:
    global _guardian_bot
    if _guardian_bot is None:
        _guardian_bot = SupportBot(mode="guardian")
    return _guardian_bot


def get_orchestra_bot() -> SupportBot:
    global _orchestra_bot
    if _orchestra_bot is None:
        _orchestra_bot = SupportBot(mode="orchestra")
    return _orchestra_bot
