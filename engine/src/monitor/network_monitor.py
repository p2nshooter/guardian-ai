"""
AXTO Guardian — Network Connection Monitor
Watch /proc/net/tcp dan /proc/net/tcp6 untuk koneksi mencurigakan.
Deteksi: C2 beaconing, port scan, data exfil, reverse shell.
"""
from __future__ import annotations
import asyncio, logging, os, socket, struct, time
from typing import Dict, Set
from src.database import get_db

log = logging.getLogger("guardian.network_monitor")

# Ports that should NEVER receive connections from outside
HONEYPOT_PORTS = {4444, 1337, 31337, 5555, 6666, 7777, 9999}

# Known C2 ports
SUSPICIOUS_PORTS_OUT = {4444, 1337, 31337, 5555, 6666, 7777, 4445, 8888}

def _hex_to_ip(hex_str: str) -> str:
    addr = int(hex_str, 16)
    return socket.inet_ntoa(struct.pack("<I", addr))

def _parse_proc_net(path: str) -> list:
    conns = []
    try:
        with open(path) as f:
            for line in f.readlines()[1:]:
                parts = line.strip().split()
                if len(parts) < 4: continue
                local_hex, remote_hex = parts[1], parts[2]
                state = int(parts[3], 16)
                if state != 1: continue  # 1 = ESTABLISHED
                local_ip,  local_port  = local_hex.split(":")
                remote_ip, remote_port = remote_hex.split(":")
                conns.append({
                    "local_ip":   _hex_to_ip(local_ip),
                    "local_port": int(local_port, 16),
                    "remote_ip":  _hex_to_ip(remote_ip),
                    "remote_port": int(remote_port, 16),
                })
    except Exception:
        pass
    return conns


class NetworkMonitor:
    def __init__(self):
        self._running    = False
        self._node_id    = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._seen: Set[str] = set()

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._watch_loop())
        log.info("Network monitor started")

    async def stop(self) -> None:
        self._running = False

    async def _watch_loop(self) -> None:
        while self._running:
            try:
                await self._check_connections()
            except Exception as e:
                log.debug(f"Network monitor error: {e}")
            await asyncio.sleep(5)

    async def _check_connections(self) -> None:
        conns = _parse_proc_net("/proc/net/tcp")
        conns += _parse_proc_net("/proc/net/tcp6")
        db = None

        for conn in conns:
            rip   = conn["remote_ip"]
            rport = conn["remote_port"]
            key   = f"{rip}:{rport}"

            if key in self._seen:
                continue
            self._seen.add(key)

            # Skip private/loopback
            if rip.startswith(("127.","10.","192.168.","172.16.","0.0.0.0")):
                continue

            verdict, confidence, threat_type = "clean", 0.0, ""

            # Honeypot port — should never be active
            if rport in HONEYPOT_PORTS:
                verdict, confidence, threat_type = "malicious", 0.95, "honeypot_port_active"

            # Suspicious outbound port
            elif rport in SUSPICIOUS_PORTS_OUT:
                verdict, confidence, threat_type = "suspicious", 0.75, "suspicious_c2_port"

            # Check IP against threat feed
            else:
                try:
                    from src.core import GuardianCore
                    det = await GuardianCore.get().detector.scan_network(rip, rport)
                    if det.verdict in ("malicious","suspicious"):
                        verdict, confidence, threat_type = det.verdict, det.confidence, det.threat_type or "malicious_ip"
                except Exception:
                    pass

            if db is None:
                db = await get_db()

            await db.log_network_event(
                self._node_id, rip, rport, "outbound",
                verdict=verdict, threat_type=threat_type,
                confidence=confidence,
                action_taken="none"
            )

            if verdict in ("malicious","suspicious"):
                log.warning(f"🌐 Suspicious connection → {rip}:{rport} [{threat_type}] conf={confidence:.2f}")
                if verdict == "malicious" and confidence >= 0.80:
                    # Auto-block
                    try:
                        from src.core import GuardianCore
                        result = GuardianCore.get().response.block_ip(rip, threat_type, "outbound")
                        if result.get("ok"):
                            await db.log_network_event(
                                self._node_id, rip, rport, "outbound",
                                verdict=verdict, threat_type=threat_type,
                                confidence=confidence, action_taken="blocked"
                            )
                    except Exception:
                        pass
                await db.update_risk_score(self._node_id,
                    os.environ.get("GUARDIAN_NODE_NAME",""), verdict, confidence)

        # Expire seen set hourly
        if len(self._seen) > 10000:
            self._seen.clear()
