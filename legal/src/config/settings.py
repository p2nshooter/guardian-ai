# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
import os
from functools import lru_cache
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # pydantic v1 fallback


class LegalConfig(BaseSettings):
    # ── License ────────────────────────────────────────────────────────────
    license_key: str = ""

    # ── Server ─────────────────────────────────────────────────────────────
    api_host:    str = "0.0.0.0"
    api_port:    int = 8096
    log_level:   str = "INFO"
    api_key:     str = ""          # REQUIRED — set via LEGL_API_KEY env var
    secret_key:  str = ""          # JWT / session secret

    # ── Storage ────────────────────────────────────────────────────────────
    data_path:      str = "/legal/data"
    upload_path:    str = "/legal/data/uploads"
    index_path:     str = "/legal/data/index"
    output_path:    str = "/legal/data/outputs"
    max_upload_mb:  int = 100

    # ── LLM — BYOK (no default keys ever) ─────────────────────────────────
    llm_provider:   str   = "openai"        # openai|anthropic|gemini|groq|ollama|custom
    llm_model:      str   = "gpt-4o-mini"
    llm_api_key:    str   = ""              # Set via LEGL_LLM_API_KEY
    llm_base_url:   str   = ""              # For Ollama / custom endpoints
    llm_max_tokens: int   = 8192
    llm_temperature: float = 0.05           # Very low for legal accuracy
    llm_router_enabled: bool = True         # Multi-model auto-router

    # ── Local/offline LLM (Ollama) for air-gapped deployments ─────────────
    ollama_url:     str = "http://localhost:11434"
    ollama_model:   str = ""                # e.g. llama3.2 or qwen2.5

    # ── Real-time Regulatory Updates ──────────────────────────────────────
    regulatory_update_enabled: bool = True
    regulatory_update_interval_hours: int = 6  # Check for new laws every 6h

    # ── Features ───────────────────────────────────────────────────────────
    rag_enabled:          bool = True
    ocr_enabled:          bool = True
    translation_enabled:  bool = True
    citation_engine:      bool = True

    # ── Security ───────────────────────────────────────────────────────────
    cors_origins:  str  = "*"
    require_auth:  bool = True
    session_ttl:   int  = 3600  # seconds

    class Config:
        env_prefix = "LEGL_"
        env_file   = ".env"


@lru_cache()
def get_config() -> LegalConfig:
    return LegalConfig()
