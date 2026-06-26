# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Memory Scanner
Scan /proc/<pid>/mem untuk shellcode, malware injected in memory.
Deteksi: process injection, fileless malware, in-memory exploits.
"""
from __future__ import annotations
import asyncio, logging, os, re, struct
from pathlib import Path
from typing import List
from src.database import get_db

log = logging.getLogger("guardian.memory")

# Shellcode signatures (common patterns in memory)
MEMORY_PATTERNS = [
    (re.compile(rb"\x90{16,}"),                              "nop_sled"),
    (re.compile(rb"\xcc{8,}"),                               "int3_breakpoints"),
    (re.compile(rb"\x31\xc0\x50\x68",     re.S),            "x86_shellcode_push_execve"),
    (re.compile(rb"\x48\x31\xd2\x48\xbb", re.S),            "x64_shellcode_execve"),
    (re.compile(rb"METERPRETER",           re.I),            "meterpreter_payload"),
    (re.compile(rb"msfvenom",              re.I),            "metasploit"),
    (re.compile(rb"/bin/sh\x00",           re.S),            "shellcode_bin_sh"),
    (re.compile(rb"MALICIOUS|BACKDOOR|ROOTKIT", re.I),       "malware_marker"),
]

# Processes that should NEVER have executable anonymous mappings
HIGH_RISK_PROCS = {"nginx","apache2","httpd","php-fpm","python","python3","node","ruby"}

class MemoryScanner:
    def __init__(self):
        self._node_id = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running = False
        self._scanned: set = set()  # (pid, inode) already scanned

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._scan_loop())
        log.info("Memory scanner started")

    async def stop(self) -> None:
        self._running = False

    async def _scan_loop(self) -> None:
        while self._running:
            try:
                await self._scan_all_processes()
            except Exception as e:
                log.debug(f"Memory scan error: {e}")
            await asyncio.sleep(120)  # Every 2 minutes

    async def _scan_all_processes(self) -> None:
        for pid_dir in Path("/proc").iterdir():
            if not pid_dir.name.isdigit():
                continue
            pid = int(pid_dir.name)
            try:
                comm = (pid_dir/"comm").read_text().strip().lower()
            except Exception:
                continue
            # Only scan high-risk processes (network-facing) to limit overhead
            if comm not in HIGH_RISK_PROCS:
                continue
            try:
                await self._scan_process_memory(pid, comm)
            except Exception:
                pass
            await asyncio.sleep(0.05)  # Yield between processes

    async def _scan_process_memory(self, pid: int, proc_name: str) -> None:
        maps_path = Path(f"/proc/{pid}/maps")
        mem_path  = Path(f"/proc/{pid}/mem")
        if not maps_path.exists() or not mem_path.exists():
            return

        suspicious_regions = []
        try:
            for line in maps_path.read_text().splitlines():
                # Parse: address perms offset dev inode pathname
                parts = line.split()
                if len(parts) < 5:
                    continue
                perms = parts[1]
                # rwx = read+write+exec = injection target
                # r-x with no file backing = potential shellcode
                if "x" not in perms:
                    continue
                if "w" in perms or (len(parts) < 6 or not parts[5]):
                    addr_range = parts[0]
                    start_hex, end_hex = addr_range.split("-")
                    start = int(start_hex, 16)
                    end   = int(end_hex, 16)
                    size  = end - start
                    if size > 1024 * 1024 * 50:  # Skip > 50MB regions
                        continue
                    suspicious_regions.append((start, end, perms))
        except Exception:
            return

        if not suspicious_regions:
            return

        try:
            with open(str(mem_path), "rb", 0) as mem_f:
                for start, end, perms in suspicious_regions[:5]:  # max 5 regions
                    try:
                        mem_f.seek(start)
                        data = mem_f.read(min(end - start, 65536))  # max 64KB sample
                        findings = self._scan_memory_data(data)
                        if findings:
                            log.critical(f"🔴 MEMORY THREAT: {proc_name}(PID:{pid}) region={hex(start)}-{hex(end)} [{', '.join(findings)}]")
                            db = await get_db()
                            await db.log_scan(
                                self._node_id, "memory", f"/proc/{pid}/mem@{hex(start)}",
                                verdict="malicious", confidence=0.90,
                                threat_type="memory_injection",
                                indicators=[f"pid:{pid}", f"process:{proc_name}"] + findings,
                                method="memory_scan"
                            )
                            await db.update_risk_score(self._node_id,
                                os.environ.get("GUARDIAN_NODE_NAME",""), "malicious", 0.90)
                            # Kill the injected process
                            try:
                                from src.core import GuardianCore
                                GuardianCore.get().response.kill_process(pid, proc_name, "memory_injection")
                            except Exception:
                                pass
                            break
                    except Exception:
                        pass
        except PermissionError:
            pass  # Needs root

    def _scan_memory_data(self, data: bytes) -> List[str]:
        findings = []
        for pattern, name in MEMORY_PATTERNS:
            if pattern.search(data):
                findings.append(name)
        return findings
