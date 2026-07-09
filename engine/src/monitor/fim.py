# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — File Integrity Monitor (FIM)
Pantau file-file kritis: jika berubah → alert.
Deteksi: rootkit memodifikasi binary sistem, attacker mengubah config.
"""
from __future__ import annotations
import asyncio, hashlib, json, logging, os, time
from pathlib import Path
from typing import Dict
from src.database import get_db

log = logging.getLogger("guardian.fim")

# File kritis yang harus tidak pernah berubah (kecuali update resmi)
CRITICAL_FILES = [
    "/etc/passwd", "/etc/shadow", "/etc/sudoers",
    "/etc/hosts", "/etc/resolv.conf", "/etc/crontab",
    "/etc/ssh/sshd_config", "/etc/pam.d/common-auth",
    "/bin/bash", "/bin/sh", "/usr/bin/sudo", "/usr/bin/su",
    "/sbin/init", "/usr/sbin/sshd",
    "/etc/ld.so.preload",
    "/proc/sys/kernel/modules_disabled",
]

# Direktori yang dipantau (file baru/hilang)
WATCHED_DIRS = ["/etc", "/bin", "/sbin", "/usr/bin", "/usr/sbin", "/lib"]

class FileIntegrityMonitor:
    def __init__(self):
        self._baseline: Dict[str, str] = {}  # path → sha256
        self._dir_snap: Dict[str, set] = {}  # dir → set of filenames
        self._node_id  = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running  = False

    async def start(self) -> None:
        self._running = True
        await self._build_baseline()
        asyncio.create_task(self._watch_loop())
        log.info(f"FIM started: {len(self._baseline)} files monitored")

    async def stop(self) -> None:
        self._running = False

    async def _build_baseline(self) -> None:
        """Hash all critical files as baseline."""
        for path_str in CRITICAL_FILES:
            h = self._hash_file(path_str)
            if h:
                self._baseline[path_str] = h
        for dir_str in WATCHED_DIRS:
            d = Path(dir_str)
            if d.exists():
                try:
                    self._dir_snap[dir_str] = {f.name for f in d.iterdir() if f.is_file()}
                except Exception:
                    pass

    async def _watch_loop(self) -> None:
        while self._running:
            try:
                # Check critical file hashes
                for path_str, original_hash in list(self._baseline.items()):
                    current = self._hash_file(path_str)
                    if current and current != original_hash:
                        await self._alert_modified(path_str, original_hash, current)
                        self._baseline[path_str] = current  # update

                # Check for new/deleted files in critical dirs
                for dir_str in WATCHED_DIRS:
                    d = Path(dir_str)
                    if not d.exists():
                        continue
                    try:
                        current_files = {f.name for f in d.iterdir() if f.is_file()}
                        prev_files    = self._dir_snap.get(dir_str, current_files)
                        new_files     = current_files - prev_files
                        del_files     = prev_files - current_files
                        for fname in new_files:
                            await self._alert_new_file(f"{dir_str}/{fname}")
                        for fname in del_files:
                            await self._alert_deleted_file(f"{dir_str}/{fname}")
                        self._dir_snap[dir_str] = current_files
                    except Exception:
                        pass
            except Exception as e:
                log.debug(f"FIM error: {e}")
            await asyncio.sleep(30)  # Check every 30s

    async def _alert_modified(self, path: str, old_hash: str, new_hash: str) -> None:
        log.critical(f"🚨 FIM ALERT: Critical file MODIFIED: {path}")
        db = await get_db()
        await db.log_scan(self._node_id, "fim", path,
            verdict="malicious", confidence=0.95,
            threat_type="critical_file_modified",
            indicators=[f"old_hash:{old_hash[:16]}", f"new_hash:{new_hash[:16]}"],
            method="fim", target_hash=new_hash)
        await db.update_risk_score(self._node_id, os.environ.get("GUARDIAN_NODE_NAME",""), "malicious", 0.95)

    async def _alert_new_file(self, path: str) -> None:
        log.warning(f"⚠️ FIM: New file in critical dir: {path}")
        # Scan the new file immediately
        try:
            from src.core import GuardianCore
            result = await GuardianCore.get().detector.scan_file(path)
            if result.verdict in ("malicious","suspicious"):
                log.critical(f"🔴 FIM: New malicious file: {path} [{result.threat_type}]")
        except Exception:
            pass

    async def _alert_deleted_file(self, path: str) -> None:
        log.warning(f"⚠️ FIM: System binary DELETED: {path}")
        db = await get_db()
        await db.log_scan(self._node_id, "fim", path,
            verdict="suspicious", confidence=0.70,
            threat_type="system_file_deleted",
            indicators=[f"deleted:{path}"], method="fim")

    @staticmethod
    def _hash_file(path: str) -> str:
        try:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""): h.update(chunk)
            return h.hexdigest()
        except Exception:
            return ""
