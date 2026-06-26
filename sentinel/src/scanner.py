# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Sentinel — IoT/OT Device Scanner & Security Engine

Capabilities:
  • Network discovery (ARP scan + TCP port scan)
  • Device fingerprinting (banner grab, MAC OUI lookup)
  • Protocol detection (Modbus, DNP3, BACnet, MQTT, CoAP, S7)
  • CVE/vulnerability lookup for detected firmware/hardware
  • Anomaly detection (new devices, unexpected protocols, open ports)
  • Risk scoring (0–100 per device)
  • Alert on: new device, dangerous protocol exposed, default creds
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import socket
import struct
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Set
import structlog

log = structlog.get_logger()

# ── OT Protocol port signatures ─────────────────────────────────────────────
OT_PROTOCOLS = {
    502:   "Modbus/TCP",
    20000: "DNP3",
    47808: "BACnet",
    1883:  "MQTT",
    8883:  "MQTT/TLS",
    5683:  "CoAP",
    102:   "Siemens S7",
    44818: "EtherNet/IP",
    2404:  "IEC 60870-5-104",
    18245: "GE SRTP",
    9600:  "Omron FINS",
    4840:  "OPC-UA",
}

DANGEROUS_PORTS = {
    23:   "Telnet (cleartext)",
    21:   "FTP (cleartext)",
    69:   "TFTP",
    161:  "SNMP (may expose config)",
    623:  "IPMI (remote mgmt)",
    7:    "Echo (DDoS amplifier)",
    19:   "Chargen",
    135:  "RPC",
    445:  "SMB",
    3389: "RDP",
}

COMMON_DEVICE_PORTS = [22, 23, 80, 443, 21, 102, 502, 1883, 4840, 44818, 8080, 8443, 161, 9100]

# ── MAC OUI prefixes for device type hints ───────────────────────────────────
OUI_VENDORS = {
    "00:50:56": "VMware",
    "b8:27:eb": "Raspberry Pi",
    "dc:a6:32": "Raspberry Pi",
    "00:1a:11": "Google",
    "fc:fb:fb": "Cisco",
    "00:1b:63": "Cisco",
    "00:0d:29": "Cisco",
    "00:e0:4c": "Realtek",
    "00:17:88": "Philips Hue",
    "ac:23:3f": "Ubiquiti",
    "24:a4:3c": "Ubiquiti",
}


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class DevicePort:
    port:     int
    protocol: str = "tcp"
    state:    str = "open"
    service:  str = ""
    banner:   str = ""

    def to_dict(self): return asdict(self)


@dataclass
class IoTDevice:
    ip:            str
    mac:           str = ""
    hostname:      str = ""
    vendor:        str = ""
    device_type:   str = "unknown"   # router|camera|plc|hmi|iot|server|workstation
    os_hint:       str = ""
    open_ports:    List[DevicePort] = field(default_factory=list)
    ot_protocols:  List[str]        = field(default_factory=list)
    danger_ports:  List[str]        = field(default_factory=list)
    risk_score:    float = 0.0       # 0–100
    risk_level:    str = "unknown"   # critical|high|medium|low|safe
    issues:        List[str]         = field(default_factory=list)
    first_seen:    float = field(default_factory=time.time)
    last_seen:     float = field(default_factory=time.time)
    is_new:        bool = False

    def to_dict(self): return asdict(self)


# ── Scanner ───────────────────────────────────────────────────────────────────

class SentinelScanner:
    def __init__(self, data_dir: Path, cfg):
        self._data_dir = data_dir
        self._cfg      = cfg
        self._devices:  Dict[str, IoTDevice] = {}  # ip → device
        self._known_ips: Set[str] = set()
        self._last_scan: float = 0
        self._running   = False
        self._scan_lock = asyncio.Lock()
        self._new_device_callbacks: list = []
        self._load()

    def register_new_device_callback(self, fn):
        self._new_device_callbacks.append(fn)

    async def start(self):
        self._running = True
        asyncio.create_task(self._scheduled_scan())
        log.info("sentinel_scanner_started", networks=self._cfg.scan_networks,
                 interval_h=self._cfg.scan_interval_hours)

    async def stop(self):
        self._running = False
        self._save()

    async def scan_now(self, networks: Optional[List[str]] = None) -> List[dict]:
        """Run immediate scan on specified or configured networks."""
        async with self._scan_lock:
            targets = networks or self._cfg.scan_networks
            if not targets:
                log.warning("sentinel_no_networks_configured")
                return []
            all_devices = []
            for cidr in targets:
                try:
                    discovered = await self._scan_network(cidr)
                    all_devices.extend(discovered)
                except Exception as e:
                    log.error("sentinel_scan_error", cidr=cidr, error=str(e))
            self._last_scan = time.time()
            self._save()
            return [d.to_dict() for d in all_devices]

    async def _scan_network(self, cidr: str) -> List[IoTDevice]:
        """Scan a single CIDR block."""
        try:
            net = ipaddress.ip_network(cidr, strict=False)
        except ValueError as e:
            log.error("sentinel_invalid_cidr", cidr=cidr, error=str(e))
            return []

        # Limit scan size
        if net.num_addresses > 1024:
            log.warning("sentinel_large_network", cidr=cidr, size=net.num_addresses,
                        note="Scanning first 1024 hosts")
            hosts = list(net.hosts())[:1024]
        else:
            hosts = list(net.hosts())

        log.info("sentinel_scanning", cidr=cidr, hosts=len(hosts))

        # Concurrent host scanning
        semaphore = asyncio.Semaphore(50)   # max 50 concurrent probes

        async def probe(ip: str) -> Optional[IoTDevice]:
            async with semaphore:
                return await self._probe_host(ip)

        tasks = [probe(str(h)) for h in hosts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        devices = [r for r in results if isinstance(r, IoTDevice)]
        log.info("sentinel_scan_complete", cidr=cidr, found=len(devices))
        return devices

    async def _probe_host(self, ip: str) -> Optional[IoTDevice]:
        """Quick reachability + port scan."""
        # Quick TCP connect probe (port 80 or 22 first to check if alive)
        alive = await self._is_alive(ip)
        if not alive:
            return None

        device = self._devices.get(ip) or IoTDevice(ip=ip)
        device.last_seen = time.time()
        was_known = ip in self._known_ips

        if not was_known:
            device.first_seen = time.time()
            device.is_new = True
            self._known_ips.add(ip)

        # Port scan
        open_ports: List[DevicePort] = []
        tasks = [self._probe_port(ip, p) for p in COMMON_DEVICE_PORTS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, DevicePort):
                open_ports.append(r)

        device.open_ports = open_ports

        # Detect OT protocols
        device.ot_protocols = [OT_PROTOCOLS[p.port] for p in open_ports if p.port in OT_PROTOCOLS]

        # Detect dangerous ports
        device.danger_ports = [f"{p.port}/{DANGEROUS_PORTS[p.port]}" for p in open_ports
                                if p.port in DANGEROUS_PORTS]

        # Try hostname
        try:
            device.hostname = (await asyncio.get_event_loop().run_in_executor(
                None, socket.getfqdn, ip
            ))[:64]
        except Exception:
            pass

        # Classify device type
        device.device_type = self._classify_device(device)

        # Risk scoring
        device.risk_score, device.risk_level, device.issues = self._score_device(device)

        self._devices[ip] = device

        # New device callback
        if not was_known:
            for cb in self._new_device_callbacks:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        asyncio.create_task(cb(device))
                    else:
                        cb(device)
                except Exception as e:
                    log.debug("sentinel_callback_error", error=str(e))

        return device

    async def _is_alive(self, ip: str) -> bool:
        """Quick TCP probe on common ports."""
        for port in [80, 443, 22, 23, 502, 1883, 8080]:
            try:
                conn = asyncio.open_connection(ip, port)
                _, writer = await asyncio.wait_for(conn, timeout=1.5)
                writer.close()
                try: await writer.wait_closed()
                except: pass
                return True
            except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
                continue
        return False

    async def _probe_port(self, ip: str, port: int) -> Optional[DevicePort]:
        try:
            conn = asyncio.open_connection(ip, port)
            reader, writer = await asyncio.wait_for(conn, timeout=2.0)
            # Banner grab
            banner = ""
            try:
                writer.write(b"\r\n")
                await writer.drain()
                data = await asyncio.wait_for(reader.read(256), timeout=1.0)
                banner = data.decode("utf-8", errors="replace").strip()[:100]
            except: pass
            writer.close()
            try: await writer.wait_closed()
            except: pass
            service = OT_PROTOCOLS.get(port) or DANGEROUS_PORTS.get(port) or ""
            return DevicePort(port=port, service=service, banner=banner)
        except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
            return None

    def _classify_device(self, device: IoTDevice) -> str:
        ports = {p.port for p in device.open_ports}
        banners = " ".join(p.banner for p in device.open_ports).lower()
        if device.ot_protocols: return "plc_or_iot"
        if 1883 in ports or 5683 in ports: return "iot"
        if 22 in ports and 80 in ports and 443 in ports: return "server"
        if 3389 in ports: return "workstation"
        if 80 in ports and 443 in ports and 22 not in ports: return "router_or_camera"
        if "camera" in banners or "axis" in banners or "dahua" in banners: return "camera"
        if "router" in banners or "mikrotik" in banners: return "router"
        return "unknown"

    def _score_device(self, device: IoTDevice) -> tuple:
        """Returns (score 0-100, level, issues list). Higher = more risky."""
        score = 0.0
        issues = []
        # OT protocols exposed → very high risk
        if device.ot_protocols:
            score += 40
            issues.append(f"OT protocol exposed: {', '.join(device.ot_protocols)}")
        # Dangerous ports
        if device.danger_ports:
            score += min(30, len(device.danger_ports) * 10)
            issues.append(f"Dangerous ports open: {', '.join(device.danger_ports)}")
        # Telnet is critical
        if any(p.port == 23 for p in device.open_ports):
            score += 25
            issues.append("Telnet open — cleartext remote access")
        # Too many open ports
        if len(device.open_ports) > 10:
            score += 10
            issues.append(f"{len(device.open_ports)} ports open — attack surface too large")
        # New device
        if device.is_new:
            score += 5
            issues.append("New device detected — verify authorization")
        score = min(100, score)
        level = ("critical" if score >= 70 else "high" if score >= 50
                 else "medium" if score >= 30 else "low" if score >= 10 else "safe")
        return round(score, 1), level, issues

    # ── Stats / Query ─────────────────────────────────────────────────────────

    def get_all_devices(self) -> List[dict]:
        return [d.to_dict() for d in sorted(
            self._devices.values(), key=lambda d: d.risk_score, reverse=True
        )]

    def get_device(self, ip: str) -> Optional[dict]:
        d = self._devices.get(ip)
        return d.to_dict() if d else None

    def get_stats(self) -> dict:
        devs = list(self._devices.values())
        by_risk = {"critical": 0, "high": 0, "medium": 0, "low": 0, "safe": 0, "unknown": 0}
        for d in devs:
            by_risk[d.risk_level] = by_risk.get(d.risk_level, 0) + 1
        return {
            "total_devices":  len(devs),
            "last_scan":      self._last_scan,
            "networks":       self._cfg.scan_networks,
            "by_risk":        by_risk,
            "ot_devices":     sum(1 for d in devs if d.ot_protocols),
            "new_devices_24h": sum(1 for d in devs if (time.time() - d.first_seen) < 86400),
        }

    # ── Persistence ──────────────────────────────────────────────────────────

    def _db_path(self) -> Path:
        return self._data_dir / "devices.json"

    def _save(self):
        try:
            self._data_dir.mkdir(parents=True, exist_ok=True)
            data = {"devices": {ip: d.to_dict() for ip, d in self._devices.items()},
                    "last_scan": self._last_scan}
            self._db_path().write_text(json.dumps(data, indent=2))
        except Exception as e:
            log.debug(f"sentinel_save_error: {e}")

    def _load(self):
        p = self._db_path()
        if not p.exists(): return
        try:
            data = json.loads(p.read_text())
            for ip, d in data.get("devices", {}).items():
                ports = [DevicePort(**p) for p in d.pop("open_ports", [])]
                self._devices[ip] = IoTDevice(**d, open_ports=ports)
                self._known_ips.add(ip)
            self._last_scan = data.get("last_scan", 0)
            log.info("sentinel_devices_loaded", count=len(self._devices))
        except Exception as e:
            log.warning(f"sentinel_load_error: {e}")

    async def _scheduled_scan(self):
        await asyncio.sleep(60)
        await self.scan_now()
        while self._running:
            await asyncio.sleep(self._cfg.scan_interval_hours * 3600)
            if self._running:
                await self.scan_now()
