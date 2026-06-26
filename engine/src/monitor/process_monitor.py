# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Real-Time Process Monitor
Watch /proc untuk deteksi proses berbahaya saat spawn.
"""
from __future__ import annotations
import asyncio, logging, os, time
from pathlib import Path
from typing import Optional, Set
from src.database import get_db

log = logging.getLogger("guardian.process_monitor")

SUSPICIOUS_PARENT_CHILD = {
    "apache2":  {"bash","sh","python","python3","perl","ruby","nc","ncat","wget","curl"},
    "nginx":    {"bash","sh","python","python3","perl","nc"},
    "httpd":    {"bash","sh","python","python3","perl"},
    "mysql":    {"bash","sh","xterm"},
    "postgres": {"bash","sh","xterm"},
    "php-fpm":  {"bash","sh","nc","ncat"},
}

ALWAYS_SUSPICIOUS = {"nc","ncat","netcat","nmap","masscan","hydra","medusa","sqlmap","socat"}
ALWAYS_MALICIOUS  = {"xmrig","cpuminer","cgminer","minergate-cli"}


class ProcessMonitor:
    def __init__(self):
        self._running     = False
        self._known_pids: Set[int] = set()
        self._proc_cache: dict = {}
        self._node_id     = os.environ.get("GUARDIAN_NODE_ID","core")

    async def start(self) -> None:
        self._running = True
        self._known_pids = set(self._list_pids())
        asyncio.create_task(self._watch_loop())
        log.info("Process monitor started")

    async def stop(self) -> None:
        self._running = False

    async def _watch_loop(self) -> None:
        while self._running:
            try:
                current = set(self._list_pids())
                new_pids = current - self._known_pids
                for pid in (self._known_pids - current):
                    self._proc_cache.pop(pid, None)
                self._known_pids = current
                for pid in new_pids:
                    info = self._get_proc_info(pid)
                    if info:
                        self._proc_cache[pid] = info
                        await self._analyze_process(pid, info)
            except Exception as e:
                log.debug(f"Process watch error: {e}")
            await asyncio.sleep(2)

    async def _analyze_process(self, pid: int, info: dict) -> None:
        name = info.get("name","").lower()
        ppid = info.get("ppid", 0)
        cmdline = info.get("cmdline","")
        user = info.get("user","")
        verdict, confidence, threat_type, indicators = "clean", 0.0, "", []

        if name in ALWAYS_MALICIOUS:
            verdict, confidence, threat_type = "malicious", 0.98, "cryptominer"
            indicators.append(f"process:{name}")
        elif name in ALWAYS_SUSPICIOUS:
            verdict, confidence, threat_type = "suspicious", 0.75, "suspicious_tool"
            indicators.append(f"process:{name}")
        else:
            parent = self._proc_cache.get(ppid, {})
            pname  = parent.get("name","").lower()
            if pname in SUSPICIOUS_PARENT_CHILD and name in SUSPICIOUS_PARENT_CHILD[pname]:
                verdict, confidence, threat_type = "malicious", 0.92, "webshell_spawn"
                indicators.append(f"parent:{pname}→child:{name}")

        susp_cmds = ["base64 -d","python -c","bash -i","sh -i","/dev/tcp/","wget http","curl http","chmod +x"]
        if verdict == "clean" and any(kw in cmdline.lower() for kw in susp_cmds):
            verdict, confidence, threat_type = "suspicious", 0.70, "suspicious_cmdline"
            indicators.append("suspicious_cmdline")

        if verdict in ("malicious","suspicious"):
            log.warning(f"🔴 Process: {name}(PID:{pid}) {verdict} conf={confidence:.2f}")
            db = await get_db()
            await db.log_process_event(self._node_id, "spawn", pid, name, cmdline,
                ppid=ppid, user=user, verdict=verdict, confidence=confidence,
                threat_type=threat_type, indicators=indicators)
            await db.update_risk_score(self._node_id,
                os.environ.get("GUARDIAN_NODE_NAME",""), verdict, confidence)
            if verdict == "malicious" and confidence >= 0.90:
                try:
                    from src.core import GuardianCore
                    GuardianCore.get().response.kill_process(pid, name, threat_type)
                except Exception:
                    pass

    @staticmethod
    def _list_pids() -> list:
        pids = []
        for p in Path("/proc").iterdir():
            try:
                if p.name.isdigit(): pids.append(int(p.name))
            except Exception: pass
        return pids

    @staticmethod
    def _get_proc_info(pid: int) -> Optional[dict]:
        try:
            base = Path(f"/proc/{pid}")
            name = (base/"comm").read_text().strip()
            cmdline = (base/"cmdline").read_bytes().replace(b"\x00",b" ").decode(errors="ignore").strip()
            ppid, uid = 0, ""
            for line in (base/"status").read_text().splitlines():
                if line.startswith("PPid:"): ppid = int(line.split()[1])
                if line.startswith("Uid:"): uid = line.split()[1]
            return {"name":name,"cmdline":cmdline,"ppid":ppid,"user":uid,"pid":pid}
        except Exception:
            return None
