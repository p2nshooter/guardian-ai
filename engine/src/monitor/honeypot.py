"""
AXTO Guardian — Honeypot / Canary File Monitor
Taruh file jebakan di direktori sensitif.
Jika diakses → pasti attacker (user normal tidak pernah buka file ini).
"""
from __future__ import annotations
import asyncio, logging, os, stat, time
from pathlib import Path
from typing import List
from src.database import get_db

log = logging.getLogger("guardian.honeypot")

DEFAULT_HONEYPOTS = [
    "/etc/.shadow_backup",
    "/root/.ssh/id_rsa.backup",
    "/var/www/html/.htpasswd.bak",
    "/tmp/.system_update",
    "/home/.credentials.txt",
    "/opt/.internal_config",
]

HONEYPOT_CONTENT = b"# AXTO Guardian Honeypot - DO NOT TOUCH\n# Accessing this file triggers an alert.\n"


class HoneypotMonitor:
    def __init__(self):
        self._running   = False
        self._node_id   = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._honeypots: List[str] = []
        self._atimes:    dict = {}  # path → last atime

    async def start(self, paths: List[str] = None) -> None:
        self._running   = True
        self._honeypots = paths or DEFAULT_HONEYPOTS
        self._create_honeypots()
        # Snapshot initial atimes
        for p in self._honeypots:
            try:
                self._atimes[p] = Path(p).stat().st_atime
            except Exception:
                self._atimes[p] = 0
        asyncio.create_task(self._watch_loop())
        log.info(f"Honeypot monitor started: {len(self._honeypots)} files")

    def _create_honeypots(self) -> None:
        """Create honeypot files if they don't exist."""
        for path_str in self._honeypots:
            p = Path(path_str)
            try:
                if not p.exists():
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_bytes(HONEYPOT_CONTENT)
                    # Make it look legitimate but not executable
                    os.chmod(path_str, stat.S_IRUSR | stat.S_IWUSR)
                    log.debug(f"Honeypot created: {path_str}")
            except Exception as e:
                log.debug(f"Could not create honeypot {path_str}: {e}")

    async def _watch_loop(self) -> None:
        while self._running:
            for path_str in self._honeypots:
                try:
                    p = Path(path_str)
                    if not p.exists():
                        continue
                    new_atime = p.stat().st_atime
                    if new_atime != self._atimes.get(path_str, 0):
                        self._atimes[path_str] = new_atime
                        await self._handle_access(path_str)
                except Exception:
                    pass
            await asyncio.sleep(5)

    async def _handle_access(self, path_str: str) -> None:
        log.critical(f"🍯🚨 HONEYPOT ACCESSED: {path_str}")
        # Find which process accessed it via /proc/*/fd
        accessor_pid, accessor_name, accessor_user = 0, "unknown", ""
        try:
            for pid_dir in Path("/proc").iterdir():
                if not pid_dir.name.isdigit():
                    continue
                try:
                    for fd in (pid_dir / "fd").iterdir():
                        try:
                            if os.readlink(str(fd)) == path_str:
                                accessor_pid  = int(pid_dir.name)
                                accessor_name = (pid_dir / "comm").read_text().strip()
                                status = (pid_dir / "status").read_text()
                                for line in status.splitlines():
                                    if line.startswith("Uid:"):
                                        accessor_user = line.split()[1]
                                break
                        except Exception:
                            pass
                    if accessor_pid:
                        break
                except Exception:
                    pass
        except Exception:
            pass

        db = await get_db()
        await db.log_honeypot(
            self._node_id, path_str,
            accessor_pid, accessor_name, accessor_user, "read"
        )
        await db.update_risk_score(
            self._node_id, os.environ.get("GUARDIAN_NODE_NAME",""),
            "malicious", 0.99
        )
        # Honeypot access = kill the accessing process immediately
        if accessor_pid:
            try:
                from src.core import GuardianCore
                GuardianCore.get().response.kill_process(
                    accessor_pid, accessor_name, "honeypot_access"
                )
            except Exception:
                pass
