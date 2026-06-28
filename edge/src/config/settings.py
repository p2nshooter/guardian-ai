# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
from __future__ import annotations
import os
from pathlib import Path
from typing import List, Optional
import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings

CONFIG_PATH = Path(os.environ.get("EDGE_CONFIG", "/edge/config/edge.yml"))


class AIVendorConfig(BaseModel):
    provider:      str
    api_key:       Optional[str] = None
    default_model: Optional[str] = None
    base_url:      Optional[str] = None


class EdgeConfig(BaseSettings):
    license_key:              str  = ""
    license_validate_url:     str  = "https://axto.io/api/license-validate"
    data_dir:                 Path = Path("/edge/data")
    log_dir:                  Path = Path("/edge/logs")
    api_host:                 str  = "0.0.0.0"
    api_port:                 int  = 8080
    heartbeat_interval:       int  = 3600
    default_rate_limit_rpm:   int  = 60
    # Firewall
    firewall_prompt_injection:bool = True
    firewall_content_filter:  bool = True
    firewall_abuse_detection: bool = True
    # AI vendors (BYOK)
    ai_vendors: List[AIVendorConfig] = []

    class Config:
        env_prefix = "EDGE_"


def load_config() -> EdgeConfig:
    cfg: dict = {}
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f) or {}
            cfg = raw.get("edge", {})

    vendors = [AIVendorConfig(**v) for v in cfg.get("ai_pool", {}).get("vendors", [])]
    cfg["ai_vendors"] = vendors

    # Persist license key
    data_dir = Path(cfg.get("data_dir", "/edge/data"))
    key_file = data_dir / "license.key"
    if key_file.exists():
        try:
            saved = key_file.read_text().strip()
            if saved.startswith("EDGE-"):
                cfg["license_key"] = saved
        except Exception:
            pass

    for env_name in ("EDGE_LICENSE_KEY", "AXTO_LICENSE_KEY"):
        val = os.environ.get(env_name, "")
        if val:
            cfg["license_key"] = val
            break

    # Firewall flags from yaml
    fw = cfg.pop("firewall", {})
    if isinstance(fw, dict):
        if "prompt_injection" in fw: cfg.setdefault("firewall_prompt_injection", fw["prompt_injection"])
        if "content_filter"   in fw: cfg.setdefault("firewall_content_filter",   fw["content_filter"])
        if "abuse_detection"  in fw: cfg.setdefault("firewall_abuse_detection",  fw["abuse_detection"])

    filtered = {k: v for k, v in cfg.items() if k not in ("ai_pool",)}
    valid    = {k: v for k, v in filtered.items() if k in EdgeConfig.model_fields}
    return EdgeConfig(**valid)


_config: Optional[EdgeConfig] = None


def get_config() -> EdgeConfig:
    global _config
    if _config is None:
        _config = load_config()
    return _config
