# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Sentinel — Configuration"""
from __future__ import annotations
import os
from pathlib import Path
from functools import lru_cache

class SentinelConfig:
    license_key:          str  = os.environ.get("SENTINEL_LICENSE_KEY", "")
    license_validate_url: str  = os.environ.get("SENTINEL_LICENSE_VALIDATE_URL", "https://axto.io/api/license-validate")
    api_host: str  = os.environ.get("SENTINEL_HOST", "0.0.0.0")
    api_port: int  = int(os.environ.get("SENTINEL_PORT", "8095"))
    data_dir: Path = Path(os.environ.get("SENTINEL_DATA_DIR", "/sentinel/data"))
    # Device scan
    scan_networks:       list = []   # CIDR ranges to scan e.g. ["192.168.1.0/24"]
    scan_interval_hours: int  = int(os.environ.get("SENTINEL_SCAN_INTERVAL_HOURS", "4"))
    device_timeout_sec:  int  = int(os.environ.get("SENTINEL_DEVICE_TIMEOUT", "5"))
    # Alerting
    slack_webhook:    str = os.environ.get("SENTINEL_SLACK_WEBHOOK", "")
    alert_email_to:   str = os.environ.get("SENTINEL_ALERT_EMAIL", "")
    smtp_host:        str = os.environ.get("SENTINEL_SMTP_HOST", "")
    smtp_port:        int = int(os.environ.get("SENTINEL_SMTP_PORT", "587"))
    smtp_user:        str = os.environ.get("SENTINEL_SMTP_USER", "")
    smtp_pass:        str = os.environ.get("SENTINEL_SMTP_PASS", "")
    # Vulnerability feeds
    nvd_api_key:      str = os.environ.get("SENTINEL_NVD_API_KEY", "")

@lru_cache(maxsize=1)
def get_config() -> SentinelConfig: return SentinelConfig()
