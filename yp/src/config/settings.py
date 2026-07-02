# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Yusron Power (YP) — configuration loader.

Loads from yp.yml (mounted at /yp/config/yp.yml by default), with a persisted
license key in the data dir and environment-variable overrides. Mirrors the
pattern used by every other AXTO product's config loader so operators who run
other AXTO products feel at home.

100% BYO: every provider api_key and every GPU endpoint below belongs to the
CLIENT. YP ships no keys and operates no shared infrastructure.
"""
from __future__ import annotations
import os
from pathlib import Path
from typing import List, Optional
import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings

CONFIG_PATH = Path(os.environ.get("YP_CONFIG", "/yp/config/yp.yml"))


class AIProviderConfig(BaseModel):
    """A single BYOK AI provider the client has configured."""
    name:          str                    # unique label, e.g. "openai-primary"
    provider:      str                    # openai | anthropic | google | groq | mistral | deepseek | xai | cohere | ollama | custom
    api_key:       Optional[str] = None   # the CLIENT's key — never AXTO's
    base_url:      Optional[str] = None   # for custom / self-hosted / ollama
    default_model: Optional[str] = None
    weight:        float = 1.0            # scheduler bias (higher = preferred)
    max_usd_per_day: float = 0.0         # 0 = no cap
    enabled:       bool = True


class GPUEndpointConfig(BaseModel):
    """A single BYO GPU endpoint (RunPod, Lambda, vast.ai, or self-hosted)."""
    name:      str
    provider:  str                        # runpod | lambda | vastai | ollama | vllm | custom
    base_url:  str
    api_key:   Optional[str] = None
    model:     Optional[str] = None
    enabled:   bool = True


class YPConfig(BaseSettings):
    # ── License ──────────────────────────────────────────────────────────────
    license_key:          str  = ""
    license_validate_url: str  = "https://axto.io/api/license-validate"

    # ── Paths ────────────────────────────────────────────────────────────────
    data_dir: Path = Path("/yp/data")
    log_dir:  Path = Path("/yp/logs")

    # ── API server ───────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8100

    # ── BYO providers / endpoints ────────────────────────────────────────────
    ai_providers:  List[AIProviderConfig]  = []
    gpu_endpoints: List[GPUEndpointConfig] = []

    # ── Provider-scaling scheduler ───────────────────────────────────────────
    # "quality" prefers the best recent success/latency score; "cost" prefers
    # the cheapest configured provider; "round_robin" spreads evenly.
    routing_strategy: str = "quality"      # quality | cost | round_robin | weighted

    # ── Capability toggles (all native to YP; on by default) ─────────────────
    enable_security:   bool = True   # endpoint/AV + threat detection
    enable_privacy:    bool = True   # PII/PHI/financial redaction layer
    enable_gateway:    bool = True   # AI API gateway + metering
    enable_soc:        bool = True   # SIEM/SOAR operations
    enable_compliance: bool = True   # audit frameworks
    enable_ot:         bool = True   # IoT/OT asset security
    enable_legal:      bool = True   # expanded global legal research

    # ── Redaction ────────────────────────────────────────────────────────────
    redact_before_forward: bool = True   # strip PII/PHI/financial before any provider call
    high_redaction_threshold: int = 5    # >= this many redactions in one call → SOC signal

    # ── Gateway ──────────────────────────────────────────────────────────────
    gateway_rate_per_minute: int = 120   # per-downstream-key rate limit on /ai/complete

    # ── Quarantine ───────────────────────────────────────────────────────────
    quarantine_dir: Path = Path("/yp/data/quarantine")

    class Config:
        env_prefix = "YP_"


def _persisted_key(data_dir: Path) -> Optional[str]:
    key_file = data_dir / "license.key"
    if key_file.exists():
        try:
            saved = key_file.read_text().strip()
            if saved.startswith("YP-"):
                return saved
        except Exception:
            pass
    return None


def load_config() -> YPConfig:
    cfg_data: dict = {}
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f) or {}
            cfg_data = raw.get("yp", raw) or {}

    # Nested BYO lists
    cfg_data["ai_providers"] = [
        AIProviderConfig(**p) for p in cfg_data.get("ai_providers", [])
    ]
    cfg_data["gpu_endpoints"] = [
        GPUEndpointConfig(**g) for g in cfg_data.get("gpu_endpoints", [])
    ]

    # Persisted license key (survives container restarts)
    data_dir = Path(cfg_data.get("data_dir", "/yp/data"))
    saved = _persisted_key(data_dir)
    if saved and not cfg_data.get("license_key"):
        cfg_data["license_key"] = saved

    # Env overrides for the license key
    for env_name in ("YP_LICENSE_KEY", "AXTO_LICENSE_KEY"):
        val = os.environ.get(env_name, "")
        if val:
            cfg_data["license_key"] = val
            break

    valid = {k: v for k, v in cfg_data.items() if k in YPConfig.model_fields}
    return YPConfig(**valid)


_config: Optional[YPConfig] = None


def get_config() -> YPConfig:
    global _config
    if _config is None:
        _config = load_config()
    return _config
