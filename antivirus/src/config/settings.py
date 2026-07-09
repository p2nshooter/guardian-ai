# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Guardian Antivirus — Settings"""
from __future__ import annotations
import os, yaml
from dataclasses import dataclass, field
from typing import Optional

CONFIG_PATH = os.environ.get(
    "ANTIVIRUS_CONFIG",
    "/guardian/config/guardian.yml"
)

@dataclass
class AntivirusSettings:
    license_key:          str   = ""
    license_validate_url: str   = "https://axto.io/api/license-validate"
    api_key:              str   = ""
    db_path:              str   = "/guardian/data/antivirus.db"
    clamd_host:           str   = "127.0.0.1"
    clamd_port:           int   = 3310
    clamd_socket:         str   = "/var/run/clamav/clamd.ctl"
    data_dir:             str   = "/guardian/data"
    port:                 int   = 8097
    max_file_size_mb:     int   = 500
    quarantine_dir:       str   = "/guardian/data/quarantine"
    ai_provider:          str   = ""
    ai_api_key:           str   = ""
    ai_model:             str   = ""
    webhook_url:          str   = ""

_settings: Optional[AntivirusSettings] = None

def get_settings() -> AntivirusSettings:
    global _settings
    if _settings:
        return _settings
    cfg: dict = {}
    for p in [CONFIG_PATH, "guardian.yml", "/config/guardian.yml"]:
        if os.path.exists(p):
            with open(p) as f:
                cfg = yaml.safe_load(f) or {}
            break
    g = cfg.get("guardian", {})
    av = cfg.get("antivirus", g)
    ai = cfg.get("ai_pool", {})
    vendors = ai.get("vendors", [])
    first_vendor = vendors[0] if vendors else {}
    _settings = AntivirusSettings(
        license_key          = av.get("license_key", ""),
        license_validate_url = av.get("license_validate_url", "https://axto.io/api/license-validate"),
        api_key              = av.get("api_key", ""),
        db_path              = av.get("db_path", "/guardian/data/antivirus.db"),
        clamd_host           = av.get("clamd_host", "127.0.0.1"),
        clamd_port           = int(av.get("clamd_port", 3310)),
        clamd_socket         = av.get("clamd_socket", "/var/run/clamav/clamd.ctl"),
        data_dir             = av.get("data_dir", "/guardian/data"),
        port                 = int(os.environ.get("AV_PORT", av.get("port", 8097))),
        max_file_size_mb     = int(av.get("max_file_size_mb", 500)),
        quarantine_dir       = av.get("quarantine_dir", "/guardian/data/quarantine"),
        ai_provider          = first_vendor.get("provider", ""),
        ai_api_key           = first_vendor.get("api_key", ""),
        ai_model             = first_vendor.get("model", ""),
        webhook_url          = av.get("webhook_url", ""),
    )
    return _settings
