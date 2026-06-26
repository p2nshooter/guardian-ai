# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
from __future__ import annotations
import os
from pathlib import Path
from typing import List, Optional
import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings

CONFIG_PATH = Path(os.environ.get("VAULT_CONFIG", "/vault/config/vault.yml"))


class AIVendorConfig(BaseModel):
    provider:      str
    api_key:       Optional[str] = None
    default_model: Optional[str] = None
    base_url:      Optional[str] = None


class VaultConfig(BaseSettings):
    license_key:            str  = ""
    license_validate_url:   str  = "https://axto.io/api/license-validate"
    data_dir:               Path = Path("/vault/data")
    log_dir:                Path = Path("/vault/logs")
    api_host:               str  = "0.0.0.0"
    api_port:               int  = 8080
    heartbeat_interval:     int  = 3600

    # AI vendors (BYOK)
    ai_vendors: List[AIVendorConfig] = []

    # Audit
    audit_store_originals:  bool = False
    audit_retention_days:   int  = 90

    # Rate limiting (requests per minute, 0 = unlimited)
    rate_limit_per_minute:  int  = 0

    # Alerting — Slack
    slack_webhook_url:      str  = ""   # POST high-sensitivity alerts here
    # Alerting — Generic webhook
    alert_webhook_url:      str  = ""
    # SIEM — Splunk HEC / Elastic / Datadog
    siem_url:               str  = ""   # e.g. https://splunk:8088/services/collector
    siem_token:             str  = ""   # Splunk HEC token or API key

    class Config:
        env_prefix = "VAULT_"


def load_config() -> VaultConfig:
    cfg_data: dict = {}
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            raw      = yaml.safe_load(f) or {}
            cfg_data = raw.get("vault", {})

    vendors = [AIVendorConfig(**v) for v in cfg_data.get("ai_pool", {}).get("vendors", [])]
    cfg_data["ai_vendors"] = vendors

    # Persist license key from data directory
    data_dir = Path(cfg_data.get("data_dir", "/vault/data"))
    key_file = data_dir / "license.key"
    if key_file.exists():
        try:
            saved = key_file.read_text().strip()
            if saved.startswith("VAULT-"):
                cfg_data["license_key"] = saved
        except Exception:
            pass

    # Environment variable overrides
    for env_name in ("VAULT_LICENSE_KEY", "AXTO_LICENSE_KEY"):
        val = os.environ.get(env_name, "")
        if val:
            cfg_data["license_key"] = val
            break

    # Map alerting fields from vault.yml alerting: block
    alerting = cfg_data.pop("alerting", {})
    if isinstance(alerting, dict):
        if alerting.get("slack_webhook"):   cfg_data.setdefault("slack_webhook_url", alerting["slack_webhook"])
        if alerting.get("webhook_url"):     cfg_data.setdefault("alert_webhook_url", alerting["webhook_url"])
        if alerting.get("siem_url"):        cfg_data.setdefault("siem_url", alerting["siem_url"])
        if alerting.get("siem_token"):      cfg_data.setdefault("siem_token", alerting["siem_token"])

    filtered = {k: v for k, v in cfg_data.items() if k != "ai_pool"}
    valid    = {k: v for k, v in filtered.items() if k in VaultConfig.model_fields}
    return VaultConfig(**valid)


_config: Optional[VaultConfig] = None


def get_config() -> VaultConfig:
    global _config
    if _config is None:
        _config = load_config()
    return _config
