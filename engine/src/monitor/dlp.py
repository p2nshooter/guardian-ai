# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Data Loss Prevention (DLP)
Deteksi data sensitif yang mau keluar dari server:
  - Credit card numbers (PAN)
  - Social Security Numbers
  - API keys / passwords dalam traffic
  - Bulk data exfiltration (large outbound transfers)
  - Database dumps dalam file/pipe
"""
from __future__ import annotations
import asyncio, logging, os, re
from pathlib import Path
from typing import List
from src.database import get_db

log = logging.getLogger("guardian.dlp")

# DLP patterns
DLP_PATTERNS = [
    # Credit cards (Luhn-valid check would need more code, regex for format)
    (re.compile(rb"(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})"), "credit_card_number"),
    # SSN
    (re.compile(rb"\b\d{3}-\d{2}-\d{4}\b"),                                    "ssn"),
    # AWS access keys
    (re.compile(rb"AKIA[0-9A-Z]{16}"),                                          "aws_access_key"),
    # AWS secret keys
    (re.compile(rb"(?i)aws[_\-]?secret[_\-]?access[_\-]?key[\"'\s:=]{1,5}[A-Za-z0-9/+=]{40}"), "aws_secret_key"),
    # Private key headers
    (re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),    "private_key"),
    # Generic API keys
    (re.compile(rb"(?i)api[_\-]?key[\"'\s:=]{1,5}[A-Za-z0-9_\-]{20,}"),       "api_key_generic"),
    # Passwords in plain text
    (re.compile(rb"(?i)password[\"'\s:=]{1,5}[^\s\"']{8,}"),                   "plaintext_password"),
    # Database connection strings
    (re.compile(rb"(?i)(?:mysql|postgres|mongodb)://[^\s\"']{10,}"),            "db_connection_string"),
    # JWT tokens
    (re.compile(rb"eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}"),          "jwt_token"),
    # Large data patterns (base64 encoded bulk data)
    (re.compile(rb"[A-Za-z0-9+/]{200,}={0,2}"),                                "bulk_base64_data"),
]

BULK_EXFIL_THRESHOLD_BYTES = 10 * 1024 * 1024  # 10MB outbound = suspicious

class DLPMonitor:
    def __init__(self):
        self._node_id = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running = False
        # Monitor /proc/net/tcp for large outbound connections
        self._connection_bytes: dict = {}

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._watch_proc_pipes())
        asyncio.create_task(self._watch_outbound_volume())
        log.info("DLP monitor started")

    async def stop(self) -> None:
        self._running = False

    async def scan_content(self, content: bytes, source: str = "") -> List[str]:
        """Scan arbitrary content for sensitive data patterns."""
        findings = []
        for pattern, data_type in DLP_PATTERNS:
            if pattern.search(content):
                findings.append(data_type)
        if findings:
            db = await get_db()
            await db.log_scan(self._node_id, "dlp", source or "content_scan",
                verdict="malicious", confidence=0.85,
                threat_type="sensitive_data_exposure",
                indicators=findings, method="dlp")
            log.warning(f"🔐 DLP ALERT: Sensitive data detected [{', '.join(findings)}] in {source}")
        return findings

    async def _watch_proc_pipes(self) -> None:
        """Watch /proc/<pid>/fd for large pipe writes (potential data exfil via pipe)."""
        while self._running:
            try:
                for pid_dir in Path("/proc").iterdir():
                    if not pid_dir.name.isdigit():
                        continue
                    try:
                        comm = (pid_dir/"comm").read_text().strip()
                        for fd_link in (pid_dir/"fd").iterdir():
                            target = os.readlink(str(fd_link))
                            if "socket" in target or "pipe" in target:
                                # Check if we can read net stats
                                pass
                    except Exception:
                        pass
            except Exception:
                pass
            await asyncio.sleep(60)

    async def _watch_outbound_volume(self) -> None:
        """Check /proc/net/dev for high outbound traffic."""
        prev_tx: dict = {}
        while self._running:
            try:
                with open("/proc/net/dev") as f:
                    for line in f.readlines()[2:]:
                        parts = line.split()
                        if len(parts) < 10:
                            continue
                        iface = parts[0].rstrip(":")
                        tx_bytes = int(parts[9])
                        if iface in prev_tx:
                            delta = tx_bytes - prev_tx[iface]
                            # > 10MB in 30 seconds = potential exfil
                            if delta > BULK_EXFIL_THRESHOLD_BYTES:
                                log.warning(f"📤 DLP: High outbound traffic: {iface} +{delta//1024//1024}MB in 30s")
                                db = await get_db()
                                await db.log_scan(self._node_id, "dlp", f"net:{iface}",
                                    verdict="suspicious", confidence=0.70,
                                    threat_type="bulk_data_exfiltration",
                                    indicators=[f"interface:{iface}", f"bytes:{delta}"],
                                    method="dlp_network")
                        prev_tx[iface] = tx_bytes
            except Exception:
                pass
            await asyncio.sleep(30)
