# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Compliance — Configuration"""
from __future__ import annotations
import os
from pathlib import Path
from functools import lru_cache


class ComplianceConfig:
    license_key:          str  = os.environ.get("COMPLIANCE_LICENSE_KEY", "")
    license_validate_url: str  = os.environ.get("COMPLIANCE_LICENSE_VALIDATE_URL",
                                                  "https://axto.io/api/license-validate")
    api_host: str  = os.environ.get("COMPLIANCE_HOST", "0.0.0.0")
    api_port: int  = int(os.environ.get("COMPLIANCE_PORT", "8093"))
    data_dir: Path = Path(os.environ.get("COMPLIANCE_DATA_DIR", "/compliance/data"))

    # Frameworks enabled
    frameworks: list = ["nist_csf", "soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa"]

    # Scan schedule (hours between automatic scans)
    scan_interval_hours: int = int(os.environ.get("COMPLIANCE_SCAN_INTERVAL_HOURS", "24"))

    # Report output
    report_dir: Path = Path(os.environ.get("COMPLIANCE_REPORT_DIR", "/compliance/data/reports"))

    # Alerting
    slack_webhook:    str = os.environ.get("COMPLIANCE_SLACK_WEBHOOK", "")
    alert_email_to:   str = os.environ.get("COMPLIANCE_ALERT_EMAIL", "")
    smtp_host:        str = os.environ.get("COMPLIANCE_SMTP_HOST", "")
    smtp_port:        int = int(os.environ.get("COMPLIANCE_SMTP_PORT", "587"))
    smtp_user:        str = os.environ.get("COMPLIANCE_SMTP_USER", "")
    smtp_pass:        str = os.environ.get("COMPLIANCE_SMTP_PASS", "")

    # Guardian integration for richer compliance data
    guardian_api_url: str = os.environ.get("COMPLIANCE_GUARDIAN_API", "")
    guardian_api_key: str = os.environ.get("COMPLIANCE_GUARDIAN_KEY", "")


@lru_cache(maxsize=1)
def get_config() -> ComplianceConfig:
    return ComplianceConfig()
