# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Automated Response Engine
Tindakan otomatis setelah deteksi malware:
  - Quarantine file (pindah ke quarantine dir, chmod 000)
  - Kill proses berbahaya
  - Block IP via iptables/nftables
  - Alert ke Dashboard
"""
from __future__ import annotations
import asyncio, logging, os, shutil, subprocess, time
from pathlib import Path
from typing import Optional
from src.config.settings import get_config

log = logging.getLogger("guardian.response")


class ResponseEngine:
    def __init__(self):
        self._cfg        = get_config()
        # Use env var if set (Docker: /guardian/quarantine volume)
        import os as _os
        q_dir = _os.environ.get("GUARDIAN_QUARANTINE_DIR", "")
        self._quarantine = Path(q_dir) if q_dir else self._cfg.data_dir / "quarantine"
        self._quarantine.mkdir(parents=True, exist_ok=True)
        self._blocked_ips: set = set()
        self._action_log: list = []

    # ── Quarantine file ───────────────────────────────────────────────────────

    def quarantine_file(self, file_path: str, threat_type: str, confidence: float) -> dict:
        """
        Pindahkan file berbahaya ke quarantine dir dan revoke permissions.
        Returns: {ok, quarantine_path, original_path}
        """
        path = Path(file_path)
        if not path.exists():
            return {"ok": False, "error": "File not found"}

        try:
            ts     = int(time.time())
            q_name = f"{ts}_{path.name}.quarantine"
            q_path = self._quarantine / q_name

            # Copy ke quarantine, chmod 000 (tidak bisa dieksekusi/dibaca)
            shutil.copy2(str(path), str(q_path))
            os.chmod(str(q_path), 0o000)

            # Hapus original
            path.unlink()

            entry = {
                "action":         "quarantine",
                "original_path":  str(path),
                "quarantine_path": str(q_path),
                "threat_type":    threat_type,
                "confidence":     confidence,
                "timestamp":      ts,
            }
            self._action_log.append(entry)
            log.warning(f"🔒 QUARANTINED: {path} → {q_path} [{threat_type}]")
            return {"ok": True, **entry}

        except PermissionError:
            log.error(f"Cannot quarantine {path} — permission denied (not root?)")
            return {"ok": False, "error": "Permission denied — run Guardian as root for quarantine"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Kill process ──────────────────────────────────────────────────────────

    def kill_process(self, pid: int, process_name: str, reason: str) -> dict:
        """
        Kill proses berbahaya.
        Butuh: Guardian jalan sebagai root atau dengan CAP_KILL capability.
        """
        try:
            result = subprocess.run(
                ["kill", "-9", str(pid)],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                entry = {
                    "action":  "kill_process",
                    "pid":     pid,
                    "name":    process_name,
                    "reason":  reason,
                    "timestamp": int(time.time()),
                }
                self._action_log.append(entry)
                log.warning(f"🔪 KILLED process {process_name} (PID:{pid}) — {reason}")
                return {"ok": True, **entry}
            else:
                return {"ok": False, "error": result.stderr.strip() or "kill failed"}
        except FileNotFoundError:
            return {"ok": False, "error": "kill command not found"}
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "kill timed out"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Block IP via iptables ─────────────────────────────────────────────────

    def block_ip(self, ip: str, reason: str, direction: str = "both") -> dict:
        """
        Block IP via iptables.
        direction: 'inbound' | 'outbound' | 'both'
        Butuh: Guardian jalan sebagai root atau dengan CAP_NET_ADMIN.
        """
        if ip in self._blocked_ips:
            return {"ok": True, "message": f"{ip} already blocked"}

        rules = []
        if direction in ("inbound", "both"):
            rules.append(["iptables", "-I", "INPUT", "-s", ip, "-j", "DROP"])
        if direction in ("outbound", "both"):
            rules.append(["iptables", "-I", "OUTPUT", "-d", ip, "-j", "DROP"])

        results = []
        for rule in rules:
            try:
                r = subprocess.run(rule, capture_output=True, text=True, timeout=5)
                results.append(r.returncode == 0)
            except Exception as e:
                log.error(f"iptables error: {e}")
                results.append(False)

        if all(results):
            self._blocked_ips.add(ip)
            entry = {
                "action":    "block_ip",
                "ip":        ip,
                "direction": direction,
                "reason":    reason,
                "timestamp": int(time.time()),
            }
            self._action_log.append(entry)
            log.warning(f"🚫 BLOCKED IP: {ip} ({direction}) — {reason}")
            return {"ok": True, **entry}
        return {"ok": False, "error": "iptables failed — root/CAP_NET_ADMIN required"}

    def unblock_ip(self, ip: str) -> dict:
        """Remove iptables block for an IP."""
        if ip not in self._blocked_ips:
            return {"ok": False, "error": "IP not in block list"}
        for chain, flag in [("INPUT", "-s"), ("OUTPUT", "-d")]:
            try:
                subprocess.run(
                    ["iptables", "-D", chain, flag, ip, "-j", "DROP"],
                    capture_output=True, timeout=5
                )
            except Exception:
                pass
        self._blocked_ips.discard(ip)
        return {"ok": True, "message": f"{ip} unblocked"}

    # ── Auto-respond based on verdict ────────────────────────────────────────

    async def auto_respond(self,
        verdict: str,
        confidence: float,
        threat_type: Optional[str],
        target: str,
        target_type: str,  # 'file' | 'ip' | 'process'
        pid: Optional[int] = None,
    ) -> list:
        """
        Tindakan otomatis berdasarkan severity:
          confidence >= 0.9 → otomatis block/quarantine
          confidence 0.6-0.9 → block saja, tidak hapus file (butuh review)
          confidence < 0.6 → alert saja
        """
        actions = []

        if target_type == "file" and verdict == "malicious":
            if confidence >= 0.85:
                result = self.quarantine_file(target, threat_type or "malware", confidence)
                actions.append(result)
            else:
                actions.append({"action": "alert_only", "reason": f"confidence {confidence:.2f} < 0.85 threshold"})

        elif target_type == "ip" and verdict == "malicious":
            if confidence >= 0.7:
                result = self.block_ip(target, threat_type or "malicious_ip", "inbound")
                actions.append(result)

        elif target_type == "process" and verdict == "malicious" and pid:
            if confidence >= 0.80:
                result = self.kill_process(pid, target, threat_type or "malicious_behavior")
                actions.append(result)

        return actions

    @property
    def action_log(self) -> list:
        return list(self._action_log)

    @property
    def blocked_ips(self) -> list:
        return list(self._blocked_ips)
