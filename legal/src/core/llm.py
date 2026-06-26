# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
"""
Multi-Model LLM Router — Production Build
Supports: OpenAI, Anthropic Claude, Google Gemini, Groq, Ollama (local/air-gapped),
any OpenAI-compatible endpoint. Auto-routes based on task type and cost.
"""
import logging
import json
import time
from typing import Optional

import httpx

logger = logging.getLogger("axto.legal.llm")

# Task type → preferred model capability mapping
TASK_ROUTING = {
    "legal_research":   {"capability": "reasoning", "tokens": 8192},
    "contract_review":  {"capability": "analysis",  "tokens": 8192},
    "compliance_check": {"capability": "analysis",  "tokens": 4096},
    "translation":      {"capability": "fast",      "tokens": 4096},
    "summarization":    {"capability": "fast",      "tokens": 2048},
    "clause_extract":   {"capability": "analysis",  "tokens": 4096},
    "risk_analysis":    {"capability": "reasoning", "tokens": 8192},
    "drafting":         {"capability": "creative",  "tokens": 8192},
    "due_diligence":    {"capability": "reasoning", "tokens": 8192},
}

LEGAL_SYSTEM_PROMPT = """You are AXTO Legal AI, an expert enterprise legal and compliance intelligence system.
Developed by Yusron Efendi as part of the AXTO platform (axto.io).

You operate as a multi-jurisdiction legal research and compliance engine with access to laws from 195+ countries.

CORE PRINCIPLES:
1. ACCURACY FIRST — never fabricate legal citations, case numbers, or regulatory references
2. CITATION REQUIRED — every legal claim must reference specific law, article, section, date
3. JURISDICTION EXPLICIT — always state which jurisdiction/country each rule applies to
4. RISK FLAGGING — mark risk levels: [LOW-RISK], [MEDIUM-RISK], [HIGH-RISK], [CRITICAL-RISK]
5. CONFIDENCE SCORE — rate confidence 0-100% for each answer
6. NOT LEGAL ADVICE — distinguish legal information from legal advice; recommend qualified counsel
7. CURRENT LAW — note if laws may have changed; always recommend verification with latest sources
8. MULTI-LANGUAGE — respond in the requested language using accurate legal terminology

OUTPUT FORMAT: When asked for structured output, return valid JSON only with no preamble.
"""


class LLMRouter:
    """Production multi-model LLM router with fallback chain."""

    def __init__(self, config):
        self.cfg = config
        self._call_count  = 0
        self._error_count = 0

    def _get_client_config(self, task_type: str = "legal_research") -> dict:
        """Determine which provider/model to use for this task."""
        # If Ollama configured and air-gapped mode, always use local
        if self.cfg.ollama_model and not self.cfg.llm_api_key:
            return {
                "provider": "ollama",
                "model":    self.cfg.ollama_model,
                "url":      f"{self.cfg.ollama_url}/v1/chat/completions",
                "headers":  {"Content-Type": "application/json"},
                "key":      "ollama",
            }

        # BYOK cloud providers
        p = self.cfg.llm_provider.lower()
        if p == "anthropic":
            return {
                "provider": "anthropic",
                "model":    self.cfg.llm_model,
                "url":      "https://api.anthropic.com/v1/messages",
                "headers":  {
                    "x-api-key": self.cfg.llm_api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                "key": self.cfg.llm_api_key,
            }
        if p == "gemini":
            return {
                "provider": "gemini",
                "model":    self.cfg.llm_model,
                "url":      f"https://generativelanguage.googleapis.com/v1beta/models/{self.cfg.llm_model}:generateContent?key={self.cfg.llm_api_key}",
                "headers":  {"Content-Type": "application/json"},
                "key": self.cfg.llm_api_key,
            }
        if p == "custom" and self.cfg.llm_base_url:
            return {
                "provider": "openai_compat",
                "model":    self.cfg.llm_model,
                "url":      f"{self.cfg.llm_base_url.rstrip('/')}/v1/chat/completions",
                "headers":  {
                    "Authorization": f"Bearer {self.cfg.llm_api_key}",
                    "Content-Type": "application/json",
                },
                "key": self.cfg.llm_api_key,
            }

        # Default: OpenAI or Groq (both use OpenAI-compatible API)
        url = "https://api.groq.com/openai/v1/chat/completions" if p == "groq" else "https://api.openai.com/v1/chat/completions"
        return {
            "provider": p,
            "model":    self.cfg.llm_model,
            "url":      url,
            "headers":  {
                "Authorization": f"Bearer {self.cfg.llm_api_key}",
                "Content-Type": "application/json",
            },
            "key": self.cfg.llm_api_key,
        }

    def _build_body(self, client_cfg: dict, messages: list, max_tokens: int) -> dict:
        if client_cfg["provider"] == "anthropic":
            sys_msg   = next((m["content"] for m in messages if m["role"] == "system"), "")
            user_msgs = [m for m in messages if m["role"] != "system"]
            return {"model": client_cfg["model"], "max_tokens": max_tokens,
                    "system": sys_msg, "messages": user_msgs}
        if client_cfg["provider"] == "gemini":
            contents = []
            for m in messages:
                if m["role"] == "system":
                    continue
                contents.append({
                    "role": "user" if m["role"] == "user" else "model",
                    "parts": [{"text": m["content"]}]
                })
            return {"contents": contents,
                    "generationConfig": {"maxOutputTokens": max_tokens,
                                         "temperature": self.cfg.llm_temperature}}
        return {
            "model": client_cfg["model"],
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.cfg.llm_temperature,
        }

    def _extract_text(self, data: dict, provider: str) -> str:
        if provider == "anthropic":
            return data.get("content", [{}])[0].get("text", "")
        if provider == "gemini":
            cands = data.get("candidates", [{}])
            return cands[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")

    async def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        language: str = "en",
        task_type: str = "legal_research",
        return_json: bool = False,
    ) -> str:
        """Execute LLM completion with automatic model routing."""
        if not self.cfg.llm_api_key and not self.cfg.ollama_model:
            raise RuntimeError(
                "No LLM provider configured. Set LEGL_LLM_API_KEY (cloud) "
                "or LEGL_OLLAMA_MODEL (local/air-gapped) environment variable."
            )

        task_info   = TASK_ROUTING.get(task_type, {"tokens": 4096})
        max_tokens  = min(task_info["tokens"], self.cfg.llm_max_tokens)
        client_cfg  = self._get_client_config(task_type)

        sys_content = system or (LEGAL_SYSTEM_PROMPT + f"\n\nRespond in language ISO code: {language}")
        if return_json:
            sys_content += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no preamble."

        messages = [
            {"role": "system", "content": sys_content},
            {"role": "user",   "content": prompt},
        ]

        body = self._build_body(client_cfg, messages, max_tokens)

        try:
            self._call_count += 1
            t0 = time.time()
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    client_cfg["url"],
                    headers=client_cfg["headers"],
                    json=body,
                )
                resp.raise_for_status()
            data  = resp.json()
            text  = self._extract_text(data, client_cfg["provider"])
            elapsed = time.time() - t0
            logger.debug("LLM %s/%s completed in %.1fs (%s tokens)",
                         client_cfg["provider"], client_cfg["model"], elapsed, task_type)
            return text

        except httpx.HTTPStatusError as e:
            self._error_count += 1
            logger.error("LLM HTTP %s: %s", e.response.status_code, e.response.text[:300])
            raise RuntimeError(f"LLM provider error {e.response.status_code}: {e.response.text[:200]}")

        except Exception as e:
            self._error_count += 1
            logger.error("LLM error: %s", e)
            raise

    async def complete_json(self, prompt: str, system: Optional[str] = None,
                             language: str = "en", task_type: str = "legal_research") -> dict:
        """Complete and parse JSON response."""
        raw = await self.complete(prompt, system, language, task_type, return_json=True)
        try:
            clean = raw.strip()
            if clean.startswith("```"):
                lines = clean.split("\n")
                clean = "\n".join(lines[1:])
            if clean.endswith("```"):
                clean = "\n".join(clean.split("\n")[:-1])
            return json.loads(clean.strip())
        except json.JSONDecodeError:
            logger.warning("LLM JSON parse failed, returning raw text")
            return {"raw": raw, "_parse_error": True}

    def stats(self) -> dict:
        return {
            "calls":  self._call_count,
            "errors": self._error_count,
            "provider": self.cfg.llm_provider,
            "model":    self.cfg.llm_model,
        }


_router_instance: Optional[LLMRouter] = None


def get_llm() -> LLMRouter:
    global _router_instance
    if _router_instance is None:
        from src.config.settings import get_config
        _router_instance = LLMRouter(get_config())
    return _router_instance
