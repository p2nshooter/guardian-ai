# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO SOC — Configuration Settings"""
from __future__ import annotations
import os
from pathlib import Path
from functools import lru_cache


class SOCConfig:
    # License
    license_key:           str  = os.environ.get("SOC_LICENSE_KEY", "")
    license_validate_url:  str  = os.environ.get("SOC_LICENSE_VALIDATE_URL",
                                                   "https://axto.io/api/license-validate")
    # API
    api_host:   str  = os.environ.get("SOC_HOST", "0.0.0.0")
    api_port:   int  = int(os.environ.get("SOC_PORT", "8092"))

    # Data
    data_dir:   Path = Path(os.environ.get("SOC_DATA_DIR", "/soc/data"))

    # SIEM Sources
    syslog_port:       int  = int(os.environ.get("SOC_SYSLOG_PORT", "5514"))
    log_sources:       list = []   # populated from soc.yml

    # Threat Intelligence
    threat_intel_feeds: list = []  # URLs of OSINT feeds
    threat_intel_update_hours: int = int(os.environ.get("SOC_THREAT_INTEL_UPDATE_HOURS", "6"))

    # Alerting
    slack_webhook:      str  = os.environ.get("SOC_SLACK_WEBHOOK", "")
    email_smtp_host:    str  = os.environ.get("SOC_SMTP_HOST", "")
    email_smtp_port:    int  = int(os.environ.get("SOC_SMTP_PORT", "587"))
    email_smtp_user:    str  = os.environ.get("SOC_SMTP_USER", "")
    email_smtp_pass:    str  = os.environ.get("SOC_SMTP_PASS", "")
    alert_email_to:     str  = os.environ.get("SOC_ALERT_EMAIL", "")

    # Retention
    event_retention_days: int = int(os.environ.get("SOC_EVENT_RETENTION_DAYS", "90"))
    incident_retention_days: int = int(os.environ.get("SOC_INCIDENT_RETENTION_DAYS", "365"))

    # SOAR
    soar_auto_respond: bool = os.environ.get("SOC_SOAR_AUTO_RESPOND", "true").lower() == "true"

    # Guardian Integration (if co-deployed)
    guardian_api_url:  str  = os.environ.get("SOC_GUARDIAN_API", "")
    guardian_api_key:  str  = os.environ.get("SOC_GUARDIAN_KEY", "")


@lru_cache(maxsize=1)
def get_config() -> SOCConfig:
    """Load config from environment. Call once at startup."""
    return SOCConfig()
