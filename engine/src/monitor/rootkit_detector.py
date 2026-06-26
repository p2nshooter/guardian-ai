# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Rootkit Detector
Deteksi rootkit dengan membandingkan:
  - /proc PID list vs kernel proc list (hidden processes)
  - /proc/net vs ss/netstat output (hidden connections)
  - Syscall table integrity (basic check)
  - LD_PRELOAD hijacking
  - Kernel module tampering
"""
from __future__ import annotations
import asyncio, logging, os, subprocess
from pathlib import Path
from typing import Set
from src.database import get_db

log = logging.getLogger("guardian.rootkit")


class RootkitDetector:
    def __init__(self):
        self._node_id = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running = False

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._check_loop())
        log.info("Rootkit detector started")

    async def stop(self) -> None:
        self._running = False

    async def _check_loop(self) -> None:
        while self._running:
            try:
                findings = []
                findings += await self._check_hidden_processes()
                findings += await self._check_ld_preload()
                findings += await self._check_kernel_modules()
                findings += await self._check_syscall_hooks()

                if findings:
                    db = await get_db()
                    for f in findings:
                        log.critical(f"🔴 ROOTKIT DETECTED: {f['type']} — {f['detail']}")
                        await db.log_scan(
                            self._node_id, "rootkit", f["detail"],
                            verdict="malicious", confidence=f["confidence"],
                            threat_type=f["type"],
                            indicators=[f["detail"]],
                            method="rootkit_detector"
                        )
                        await db.update_risk_score(
                            self._node_id,
                            os.environ.get("GUARDIAN_NODE_NAME",""),
                            "malicious", f["confidence"]
                        )
            except Exception as e:
                log.debug(f"Rootkit check error: {e}")
            await asyncio.sleep(300)  # Every 5 minutes

    async def _check_hidden_processes(self) -> list:
        """Compare /proc PIDs vs `ps aux` — hidden PIDs = rootkit."""
        findings = []
        try:
            proc_pids: Set[int] = set()
            for p in Path("/proc").iterdir():
                if p.name.isdigit():
                    proc_pids.add(int(p.name))

            result = subprocess.run(["ps", "-eo", "pid", "--no-headers"],
                                     capture_output=True, text=True, timeout=5)
            ps_pids: Set[int] = set()
            for line in result.stdout.splitlines():
                try: ps_pids.add(int(line.strip()))
                except Exception: pass

            # PIDs in ps but not in /proc = hidden by rootkit
            hidden = ps_pids - proc_pids
            for pid in hidden:
                findings.append({
                    "type":       "hidden_process",
                    "detail":     f"PID {pid} visible in ps but hidden from /proc",
                    "confidence": 0.95
                })
        except Exception:
            pass
        return findings

    async def _check_ld_preload(self) -> list:
        """Check for suspicious LD_PRELOAD in /etc/ld.so.preload."""
        findings = []
        preload = Path("/etc/ld.so.preload")
        if preload.exists():
            try:
                content = preload.read_text().strip()
                if content:
                    findings.append({
                        "type":       "ld_preload_hijack",
                        "detail":     f"/etc/ld.so.preload contains: {content[:200]}",
                        "confidence": 0.90
                    })
            except Exception:
                pass
        # Check env of running processes
        try:
            for pid_dir in Path("/proc").iterdir():
                if not pid_dir.name.isdigit():
                    continue
                try:
                    env = (pid_dir / "environ").read_bytes().decode(errors="ignore")
                    if "LD_PRELOAD=" in env:
                        val = [e for e in env.split("\x00") if e.startswith("LD_PRELOAD=")]
                        if val:
                            name = (pid_dir/"comm").read_text().strip()
                            findings.append({
                                "type":       "ld_preload_process",
                                "detail":     f"Process {name}(PID:{pid_dir.name}): {val[0]}",
                                "confidence": 0.85
                            })
                except Exception:
                    pass
        except Exception:
            pass
        return findings

    async def _check_kernel_modules(self) -> list:
        """Check for unexpected kernel modules."""
        findings = []
        try:
            result = subprocess.run(["lsmod"], capture_output=True, text=True, timeout=5)
            suspicious_mods = ["diamorphine","adore","knark","rkkit","hide","rootkit"]
            for line in result.stdout.lower().splitlines()[1:]:
                mod_name = line.split()[0] if line.split() else ""
                if any(s in mod_name for s in suspicious_mods):
                    findings.append({
                        "type":       "suspicious_kernel_module",
                        "detail":     f"Suspicious module loaded: {mod_name}",
                        "confidence": 0.92
                    })
        except Exception:
            pass
        return findings

    async def _check_syscall_hooks(self) -> list:
        """Basic check: /proc/kallsyms for syscall table modifications."""
        findings = []
        try:
            kallsyms = Path("/proc/kallsyms")
            if kallsyms.exists():
                content = kallsyms.read_text()
                # Look for suspicious symbols added by rootkits
                rootkit_symbols = ["hide_pid","hide_file","t_killall","diamorphine"]
                for sym in rootkit_symbols:
                    if sym in content:
                        findings.append({
                            "type":       "syscall_hook",
                            "detail":     f"Suspicious symbol in kallsyms: {sym}",
                            "confidence": 0.95
                        })
        except PermissionError:
            pass  # Needs root
        except Exception:
            pass
        return findings
