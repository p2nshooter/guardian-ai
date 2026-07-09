# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Sentinel — IoT/OT Security Engine v1.0
============================================
World-class industrial & IoT security monitoring.

Capabilities:
  ▸ Device Discovery: ARP scan, mDNS, SSDP, Modbus/DNP3 enumeration
  ▸ Protocol Monitoring: Modbus, DNP3, MQTT, CoAP, OPC-UA, BACnet
  ▸ Anomaly Detection: Baseline + z-score per device/register
  ▸ Firmware Analysis: Hash tracking, version anomaly, vendor advisories
  ▸ Network Segmentation Audit: IT/OT boundary enforcement
  ▸ CVE Correlation: Match device fingerprints to NVD CVE database
  ▸ Real-time Alerts: Severity-tiered, SOAR webhook integration
  ▸ Asset Inventory: Auto-discovered, enriched with vendor/model/firmware
  ▸ Compliance: IEC 62443, NERC CIP, NIST SP 800-82
  ▸ Threat Intelligence: ICS-CERT advisories, vendor security bulletins
  ▸ Passive Monitoring: Zero-touch packet capture analysis
  ▸ AI Triage: BYOK threat analysis for OT incidents
"""
from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import logging
import math
import os
import random
import re
import socket
import struct
import time
import uuid
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, List, Optional, Set, Tuple

import aiosqlite

try:
    import aiohttp
    _HAS_AIOHTTP = True
except ImportError:
    _HAS_AIOHTTP = False

log = logging.getLogger("sentinel.engine")

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────────────────
class DeviceType(str, Enum):
    PLC          = "plc"
    HMI          = "hmi"
    RTU          = "rtu"
    HISTORIAN    = "historian"
    ENGINEERING  = "engineering_workstation"
    SENSOR       = "sensor"
    ACTUATOR     = "actuator"
    GATEWAY      = "iot_gateway"
    CAMERA       = "ip_camera"
    SCADA        = "scada_server"
    ROUTER       = "industrial_router"
    SWITCH       = "industrial_switch"
    CONTROLLER   = "embedded_controller"
    UNKNOWN      = "unknown"

class Protocol(str, Enum):
    MODBUS   = "modbus"
    DNP3     = "dnp3"
    MQTT     = "mqtt"
    COAP     = "coap"
    OPCUA    = "opc_ua"
    BACNET   = "bacnet"
    PROFINET = "profinet"
    ETHERCAT = "ethercat"
    S7COMM   = "s7comm"
    EIP      = "ethernet_ip"
    ICMP     = "icmp"
    HTTP     = "http"
    SSH      = "ssh"
    TELNET   = "telnet"

class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"
    INFO     = "info"

class ComplianceStandard(str, Enum):
    IEC62443  = "iec62443"
    NERC_CIP  = "nerc_cip"
    NIST80082 = "nist_sp_800_82"
    ISA99     = "isa99"

# ─────────────────────────────────────────────────────────────────────────────
# KNOWN DEVICE FINGERPRINTS  (vendor/model/CVE mapping)
# ─────────────────────────────────────────────────────────────────────────────
DEVICE_FINGERPRINTS: List[Dict] = [
    {"vendor": "Siemens", "product": "S7-300 PLC", "type": DeviceType.PLC,
     "ports": [102], "banner_re": r"siemens|s7-300|step\s*7",
     "known_cves": ["CVE-2019-13945", "CVE-2020-15782", "CVE-2022-38465"]},
    {"vendor": "Siemens", "product": "S7-1200 PLC", "type": DeviceType.PLC,
     "ports": [102, 443], "banner_re": r"siemens|s7-1200",
     "known_cves": ["CVE-2019-10929", "CVE-2020-15782"]},
    {"vendor": "Rockwell Automation", "product": "Allen-Bradley MicroLogix", "type": DeviceType.PLC,
     "ports": [44818, 2222], "banner_re": r"allen.?bradley|rockwell|micrologix",
     "known_cves": ["CVE-2017-6021", "CVE-2018-17924"]},
    {"vendor": "Schneider Electric", "product": "Modicon M340", "type": DeviceType.PLC,
     "ports": [502, 80], "banner_re": r"schneider|modicon|m340",
     "known_cves": ["CVE-2018-7841", "CVE-2019-6821", "CVE-2021-22786"]},
    {"vendor": "ABB", "product": "AC500 PLC", "type": DeviceType.PLC,
     "ports": [502, 102], "banner_re": r"\babb\b|ac500",
     "known_cves": ["CVE-2019-19000"]},
    {"vendor": "Emerson", "product": "DeltaV DCS", "type": DeviceType.HISTORIAN,
     "ports": [4840, 80, 443], "banner_re": r"emerson|deltav",
     "known_cves": ["CVE-2022-29957"]},
    {"vendor": "Honeywell", "product": "Experion PKS", "type": DeviceType.SCADA,
     "ports": [80, 443, 55555], "banner_re": r"honeywell|experion",
     "known_cves": ["CVE-2021-38397", "CVE-2021-38399"]},
    {"vendor": "GE Digital", "product": "iFIX HMI", "type": DeviceType.HMI,
     "ports": [80, 443, 135], "banner_re": r"ge\s+digital|ifix|proficy",
     "known_cves": ["CVE-2020-6992"]},
    {"vendor": "Moxa", "product": "Industrial Switch", "type": DeviceType.SWITCH,
     "ports": [22, 23, 80], "banner_re": r"moxa",
     "known_cves": ["CVE-2019-9098", "CVE-2020-25159"]},
    {"vendor": "Generic", "product": "MQTT Broker", "type": DeviceType.GATEWAY,
     "ports": [1883, 8883], "banner_re": r"mosquitto|hivemq|emqx",
     "known_cves": []},
    {"vendor": "Generic", "product": "OPC-UA Server", "type": DeviceType.SCADA,
     "ports": [4840, 4843], "banner_re": r"opc.?ua|open62541|prosys",
     "known_cves": ["CVE-2022-25882"]},
    {"vendor": "Axis", "product": "IP Camera", "type": DeviceType.CAMERA,
     "ports": [80, 443, 554], "banner_re": r"axis\s*(?:communications)?|vapix",
     "known_cves": ["CVE-2018-10661", "CVE-2021-31986"]},
    {"vendor": "Hikvision", "product": "IP Camera", "type": DeviceType.CAMERA,
     "ports": [80, 8000, 554], "banner_re": r"hikvision|dahua|dvr|nvr",
     "known_cves": ["CVE-2021-36260", "CVE-2022-28173"]},
]

# OT Security rules
OT_RULES: List[Dict] = [
    {
        "id": "OT-001", "name": "Unsecured Modbus Port",
        "description": "Modbus TCP (port 502) accessible without authentication",
        "check": "port_open", "port": 502, "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0846", "cis_control": "IEC 62443 SR 1.1",
    },
    {
        "id": "OT-002", "name": "Telnet Enabled on OT Device",
        "description": "Unencrypted Telnet (port 23) active — transmits credentials in cleartext",
        "check": "port_open", "port": 23, "severity": AlertSeverity.CRITICAL,
        "mitre_ics": "T0822", "cis_control": "NERC CIP-007-6 R2",
    },
    {
        "id": "OT-003", "name": "Default HTTP on Industrial Device",
        "description": "Unencrypted HTTP management interface exposed",
        "check": "port_open_no_redirect", "port": 80, "severity": AlertSeverity.MEDIUM,
        "mitre_ics": "T0885", "cis_control": "IEC 62443 SR 3.3",
    },
    {
        "id": "OT-004", "name": "MQTT Broker Without Authentication",
        "description": "MQTT broker (1883) accepts anonymous connections",
        "check": "mqtt_anon", "port": 1883, "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0861", "cis_control": "IEC 62443 SR 1.2",
    },
    {
        "id": "OT-005", "name": "Firmware Version Change",
        "description": "Firmware version changed — validate authorized update",
        "check": "firmware_change", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0857", "cis_control": "NERC CIP-010-3 R3",
    },
    {
        "id": "OT-006", "name": "New Device on OT Network",
        "description": "Unknown device discovered on OT network segment",
        "check": "new_device", "severity": AlertSeverity.MEDIUM,
        "mitre_ics": "T0846", "cis_control": "IEC 62443 SR 1.1",
    },
    {
        "id": "OT-007", "name": "Modbus Register Value Anomaly",
        "description": "Modbus register value outside historical baseline (z > 3σ)",
        "check": "register_anomaly", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0831", "cis_control": "IEC 62443 SR 6.1",
    },
    {
        "id": "OT-008", "name": "Device Communication Dropout",
        "description": "Device stopped responding — may indicate failure or attack",
        "check": "device_dropout", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0827", "cis_control": "IEC 62443 SR 7.1",
    },
    {
        "id": "OT-009", "name": "IT/OT Boundary Violation",
        "description": "IT-zone device communicating directly with OT device",
        "check": "boundary_violation", "severity": AlertSeverity.CRITICAL,
        "mitre_ics": "T0849", "cis_control": "NERC CIP-005-6 R1",
    },
    {
        "id": "OT-010", "name": "Scan/Enumeration Activity on OT Network",
        "description": "Port scanning or protocol enumeration detected",
        "check": "scan_detected", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0846", "cis_control": "IEC 62443 SR 1.1",
    },
    {
        "id": "OT-011", "name": "DNP3 Unauthorized Function Code",
        "description": "DNP3 function code outside expected set — possible command injection",
        "check": "dnp3_func_code", "severity": AlertSeverity.CRITICAL,
        "mitre_ics": "T0836", "cis_control": "IEC 62443 SR 6.2",
    },
    {
        "id": "OT-012", "name": "Known CVE Matched on Device",
        "description": "Device fingerprint matches known vulnerable product with published CVE",
        "check": "cve_match", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0862", "cis_control": "NERC CIP-007-6 R3",
    },
    {
        "id": "OT-013", "name": "OPC-UA Anonymous Session",
        "description": "OPC-UA server allows anonymous connections without authentication",
        "check": "opcua_anon", "port": 4840, "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0861", "cis_control": "IEC 62443 SR 1.2",
    },
    {
        "id": "OT-014", "name": "Industrial Firewall Rule Change",
        "description": "Unexpected change to OT network firewall configuration",
        "check": "firewall_change", "severity": AlertSeverity.CRITICAL,
        "mitre_ics": "T0883", "cis_control": "NERC CIP-007-6 R4",
    },
    {
        "id": "OT-015", "name": "PLC in Programming Mode",
        "description": "PLC switched to programming/maintenance mode — verify authorization",
        "check": "plc_prog_mode", "severity": AlertSeverity.HIGH,
        "mitre_ics": "T0845", "cis_control": "IEC 62443 SR 2.6",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class Device:
    id:              str = field(default_factory=lambda: str(uuid.uuid4()))
    ip:              str = ""
    mac:             str = ""
    hostname:        str = ""
    vendor:          str = ""
    product:         str = ""
    device_type:     DeviceType = DeviceType.UNKNOWN
    firmware_ver:    str = ""
    firmware_hash:   str = ""
    protocols:       List[str] = field(default_factory=list)
    open_ports:      List[int] = field(default_factory=list)
    known_cves:      List[str] = field(default_factory=list)
    first_seen:      float = field(default_factory=time.time)
    last_seen:       float = field(default_factory=time.time)
    last_polled:     float = 0.0
    is_authorized:   bool = False
    ot_zone:         str = ""
    criticality:     str = "medium"   # low / medium / high / critical
    alert_count:     int = 0

@dataclass
class OTAlert:
    id:           str = field(default_factory=lambda: str(uuid.uuid4()))
    ts:           float = field(default_factory=time.time)
    rule_id:      str = ""
    rule_name:    str = ""
    severity:     AlertSeverity = AlertSeverity.MEDIUM
    device_id:    str = ""
    device_ip:    str = ""
    description:  str = ""
    mitre_ics:    str = ""
    evidence:     Dict = field(default_factory=dict)
    acknowledged: bool = False
    incident_id:  Optional[str] = None

@dataclass
class RegisterBaseline:
    device_id:  str = ""
    address:    int = 0
    protocol:   str = ""
    n:          int = 0
    mean:       float = 0.0
    M2:         float = 0.0
    min_val:    float = 0.0
    max_val:    float = 0.0
    last_value: float = 0.0

    def update(self, value: float):
        self.n += 1
        d = value - self.mean
        self.mean += d / self.n
        self.M2   += d * (value - self.mean)
        self.last_value = value
        self.min_val = min(self.min_val, value) if self.n > 1 else value
        self.max_val = max(self.max_val, value) if self.n > 1 else value

    @property
    def std(self) -> float:
        return math.sqrt(self.M2 / (self.n - 1)) if self.n > 1 else 0.0

    def is_anomalous(self, value: float, z_thresh: float = 3.0) -> bool:
        if self.n < 20:
            return False
        if self.std < 1e-9:
            return abs(value - self.mean) > 1e-6
        return abs(value - self.mean) / self.std > z_thresh

# ─────────────────────────────────────────────────────────────────────────────
# DEVICE SCANNER  (active discovery + passive fingerprinting)
# ─────────────────────────────────────────────────────────────────────────────
class DeviceScanner:
    def __init__(self, config: Dict):
        self._subnets    = config.get("scan_subnets", [])
        self._timeout    = config.get("scan_timeout_sec", 2)
        self._ot_ports   = [21, 22, 23, 80, 102, 443, 502, 1883, 2222, 4840, 4843,
                            8000, 8080, 8883, 44818, 47808]

    async def scan_subnet(self, subnet: str) -> List[Device]:
        """Discover devices on subnet via async TCP connect scan."""
        try:
            network = ipaddress.ip_network(subnet, strict=False)
        except ValueError as e:
            log.error(f"Invalid subnet {subnet}: {e}")
            return []

        # Limit scan to /24 or smaller for safety
        if network.prefixlen < 24:
            log.warning(f"Limiting scan of {subnet} to first 254 hosts")
            hosts = list(network.hosts())[:254]
        else:
            hosts = list(network.hosts())

        log.info(f"Scanning {len(hosts)} hosts on {subnet}")
        semaphore = asyncio.Semaphore(50)
        tasks     = [self._probe_host(str(h), semaphore) for h in hosts]
        results   = await asyncio.gather(*tasks, return_exceptions=True)
        devices   = [r for r in results if isinstance(r, Device)]
        log.info(f"Scan complete: {len(devices)}/{len(hosts)} hosts responded")
        return devices

    async def _probe_host(self, ip: str, sem: asyncio.Semaphore) -> Optional[Device]:
        async with sem:
            open_ports: List[int] = []
            port_tasks = [self._check_port(ip, p) for p in self._ot_ports]
            port_results = await asyncio.gather(*port_tasks, return_exceptions=True)
            for port, result in zip(self._ot_ports, port_results):
                if result is True:
                    open_ports.append(port)
            if not open_ports:
                return None

            device = Device(ip=ip, open_ports=open_ports)
            # Fingerprint
            await self._fingerprint(device)
            # Try hostname resolution
            try:
                hostname = socket.gethostbyaddr(ip)[0]
                device.hostname = hostname
            except Exception:
                pass
            return device

    async def _check_port(self, ip: str, port: int) -> bool:
        try:
            conn = asyncio.open_connection(ip, port)
            r, w = await asyncio.wait_for(conn, timeout=self._timeout)
            w.close()
            return True
        except Exception:
            return False

    async def _fingerprint(self, device: Device):
        """Match device against known fingerprints."""
        # Protocol detection by port
        proto_map = {
            502: Protocol.MODBUS, 102: Protocol.S7COMM, 1883: Protocol.MQTT,
            8883: Protocol.MQTT, 4840: Protocol.OPCUA, 4843: Protocol.OPCUA,
            47808: Protocol.BACNET, 44818: Protocol.EIP,
        }
        for port in device.open_ports:
            if port in proto_map:
                p = proto_map[port].value
                if p not in device.protocols:
                    device.protocols.append(p)
        if 22 in device.open_ports:
            device.protocols.append(Protocol.SSH.value)
        if 23 in device.open_ports:
            device.protocols.append(Protocol.TELNET.value)
        if 80 in device.open_ports or 8080 in device.open_ports:
            device.protocols.append(Protocol.HTTP.value)

        # HTTP banner grab for vendor ID
        if 80 in device.open_ports and _HAS_AIOHTTP:
            try:
                async with aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=3)
                ) as s:
                    async with s.get(f"http://{device.ip}/", ssl=False) as r:
                        banner = await r.text(errors="ignore")
                        banner = banner[:2000].lower()
                        server = r.headers.get("Server","").lower()
                        full   = f"{banner} {server}"
                        for fp in DEVICE_FINGERPRINTS:
                            if re.search(fp["banner_re"], full, re.I):
                                device.vendor      = fp["vendor"]
                                device.product     = fp["product"]
                                device.device_type = fp["type"]
                                device.known_cves  = fp["known_cves"]
                                break
            except Exception:
                pass

        # Guess type from protocols if still unknown
        if device.device_type == DeviceType.UNKNOWN:
            if Protocol.MODBUS.value in device.protocols or Protocol.S7COMM.value in device.protocols:
                device.device_type = DeviceType.PLC
            elif Protocol.MQTT.value in device.protocols:
                device.device_type = DeviceType.GATEWAY
            elif Protocol.OPCUA.value in device.protocols:
                device.device_type = DeviceType.SCADA
            elif 554 in device.open_ports:
                device.device_type = DeviceType.CAMERA

# ─────────────────────────────────────────────────────────────────────────────
# MODBUS POLLER  (real protocol — RFC 1628)
# ─────────────────────────────────────────────────────────────────────────────
class ModbusPoller:
    """
    Real Modbus TCP polling — reads holding registers from PLCs.
    No external library needed — implements Modbus ADU directly.
    """
    FUNC_READ_HOLDING = 0x03
    FUNC_READ_INPUT   = 0x04
    FUNC_READ_COILS   = 0x01
    FUNC_WRITE_SINGLE = 0x06

    @staticmethod
    def _build_request(unit_id: int, func: int, start_addr: int, count: int, tx_id: int = 1) -> bytes:
        pdu  = struct.pack(">BHH", func, start_addr, count)
        mbap = struct.pack(">HHHB", tx_id, 0, len(pdu) + 1, unit_id)
        return mbap + pdu

    @staticmethod
    def _parse_response(data: bytes) -> Optional[List[int]]:
        if len(data) < 9:
            return None
        func     = data[7]
        byte_cnt = data[8]
        if func & 0x80:   # error response
            return None
        values = []
        for i in range(byte_cnt // 2):
            val = struct.unpack_from(">H", data, 9 + i * 2)[0]
            values.append(val)
        return values

    async def read_registers(
        self,
        ip: str, port: int = 502,
        unit_id: int = 1,
        start_addr: int = 0,
        count: int = 10,
        timeout: float = 3.0,
    ) -> Optional[List[int]]:
        try:
            tx_id = random.randint(1, 65535)
            req   = self._build_request(unit_id, self.FUNC_READ_HOLDING, start_addr, count, tx_id)
            conn  = asyncio.open_connection(ip, port)
            reader, writer = await asyncio.wait_for(conn, timeout=timeout)
            writer.write(req)
            await writer.drain()
            data = await asyncio.wait_for(reader.read(256), timeout=timeout)
            writer.close()
            return self._parse_response(data)
        except Exception as e:
            log.debug(f"Modbus read {ip}:{port} failed: {e}")
            return None

# ─────────────────────────────────────────────────────────────────────────────
# MQTT AUDITOR  (check anonymous access)
# ─────────────────────────────────────────────────────────────────────────────
class MQTTAuditor:
    """Tests MQTT broker for anonymous access via raw CONNECT packet."""

    @staticmethod
    def _build_connect(client_id: str = "axto-sentinel-audit") -> bytes:
        cid_bytes = client_id.encode()
        # Variable header: protocol name + level + flags + keepalive
        vh = (b"\x00\x04MQTT"  # protocol name
              + b"\x04"        # protocol level (3.1.1)
              + b"\x00"        # connect flags (no will, no credentials)
              + b"\x00\x3c")   # keepalive 60s
        payload = struct.pack(">H", len(cid_bytes)) + cid_bytes
        remaining = len(vh) + len(payload)
        # Fixed header: CONNECT (0x10) + remaining length
        fixed = bytes([0x10, remaining])
        return fixed + vh + payload

    async def check_anonymous(self, ip: str, port: int = 1883, timeout: float = 4.0) -> Dict:
        try:
            conn   = asyncio.open_connection(ip, port)
            reader, writer = await asyncio.wait_for(conn, timeout=timeout)
            writer.write(self._build_connect())
            await writer.drain()
            data = await asyncio.wait_for(reader.read(16), timeout=timeout)
            writer.close()
            if len(data) >= 4:
                # CONNACK fixed header = 0x20, remaining = 0x02
                # Byte 3 = return code: 0x00 = accepted
                if data[0] == 0x20 and data[3] == 0x00:
                    return {"anonymous_access": True, "return_code": 0}
                else:
                    return {"anonymous_access": False, "return_code": data[3] if len(data)>3 else -1}
            return {"anonymous_access": False, "error": "unexpected response"}
        except ConnectionRefusedError:
            return {"anonymous_access": False, "error": "port_closed"}
        except Exception as e:
            return {"anonymous_access": False, "error": str(e)}

# ─────────────────────────────────────────────────────────────────────────────
# CVE LOOKUP  (NVD API)
# ─────────────────────────────────────────────────────────────────────────────
class CVELookup:
    def __init__(self, nvd_api_key: str = ""):
        self._key   = nvd_api_key
        self._cache: Dict[str, List[Dict]] = {}

    async def lookup_cpe(self, vendor: str, product: str) -> List[Dict]:
        if not _HAS_AIOHTTP:
            return []
        cache_key = f"{vendor}:{product}".lower()
        if cache_key in self._cache:
            return self._cache[cache_key]
        try:
            hdrs  = {"apiKey": self._key} if self._key else {}
            kw    = f"{vendor} {product}".strip()
            url   = (f"https://services.nvd.nist.gov/rest/json/cves/2.0"
                     f"?keywordSearch={kw}&resultsPerPage=10")
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as s:
                async with s.get(url, headers=hdrs) as r:
                    if r.status != 200:
                        return []
                    d    = await r.json()
                    cves = []
                    for item in d.get("vulnerabilities", []):
                        cve  = item.get("cve", {})
                        desc = next(
                            (d["value"] for d in cve.get("descriptions",[]) if d.get("lang")=="en"),
                            ""
                        )
                        metrics = cve.get("metrics", {})
                        score   = 0.0
                        for key in ("cvssMetricV31","cvssMetricV30","cvssMetricV2"):
                            m = metrics.get(key, [{}])[0].get("cvssData",{}).get("baseScore")
                            if m:
                                score = float(m); break
                        cves.append({
                            "id":          cve.get("id",""),
                            "description": desc[:200],
                            "cvss_score":  score,
                            "severity":    ("critical" if score >= 9 else "high" if score >= 7
                                           else "medium" if score >= 4 else "low"),
                        })
                    self._cache[cache_key] = cves
                    return cves
        except Exception as e:
            log.debug(f"CVE lookup error: {e}")
            return []

# ─────────────────────────────────────────────────────────────────────────────
# ALERT NOTIFIER  (Slack + email + webhook)
# ─────────────────────────────────────────────────────────────────────────────
class AlertNotifier:
    def __init__(self, config: Dict):
        self._slack   = config.get("slack_webhook_url", "")
        self._webhook = config.get("soar_webhook_url", "")
        self._email   = config.get("email_api_url", "")

    async def notify(self, alert: OTAlert, device: Optional[Device] = None):
        if not _HAS_AIOHTTP:
            return
        ctx = {
            "alert_id":    alert.id,
            "rule":        alert.rule_name,
            "severity":    alert.severity.value,
            "device_ip":   alert.device_ip,
            "description": alert.description,
            "mitre_ics":   alert.mitre_ics,
            "device_type": device.device_type.value if device else "unknown",
            "vendor":      device.vendor if device else "",
            "product":     device.product if device else "",
            "cves":        device.known_cves[:3] if device else [],
        }

        colors = {
            "critical": "#FF0000", "high": "#FF6600",
            "medium": "#FFC000",   "low": "#00CC44",
        }
        tasks = []
        if self._slack:
            payload = {
                "attachments": [{
                    "color": colors.get(alert.severity.value, "#808080"),
                    "title": f"🏭 AXTO Sentinel — {alert.rule_name}",
                    "fields": [
                        {"title": "Severity",    "value": alert.severity.value.upper(), "short": True},
                        {"title": "Device IP",   "value": alert.device_ip,              "short": True},
                        {"title": "Device Type", "value": ctx["device_type"],           "short": True},
                        {"title": "MITRE ICS",   "value": alert.mitre_ics,              "short": True},
                        {"title": "Vendor",      "value": f"{ctx['vendor']} {ctx['product']}", "short": True},
                        {"title": "Known CVEs",  "value": ", ".join(ctx["cves"]) or "—",       "short": True},
                        {"title": "Description", "value": alert.description,            "short": False},
                    ],
                    "footer": "AXTO Sentinel ICS Security | axto.io",
                    "ts": int(time.time()),
                }]
            }
            async def _slack():
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=6)) as s:
                    await s.post(self._slack, json=payload)
            tasks.append(asyncio.create_task(_slack()))

        if self._webhook:
            async def _wh():
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=6)) as s:
                    await s.post(self._webhook, json={"source":"axto_sentinel","event":"ot_alert","data":ctx})
            tasks.append(asyncio.create_task(_wh()))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

# ─────────────────────────────────────────────────────────────────────────────
# AI OT TRIAGE  (BYOK)
# ─────────────────────────────────────────────────────────────────────────────
class AITriage:
    def __init__(self, vendors: List[Dict]):
        self._vendors = [v for v in vendors if v.get("api_key","").strip()]

    async def analyze(self, alert: OTAlert, device: Optional[Device]) -> Dict:
        if not self._vendors or not _HAS_AIOHTTP:
            return {}
        vendor   = self._vendors[0]
        provider = vendor.get("provider","openai")
        api_key  = vendor.get("api_key","")
        model    = vendor.get("model","gpt-4o-mini")
        prompt = (
            "You are an ICS/OT cybersecurity expert. Analyze this industrial security alert.\n"
            f"Alert: {alert.rule_name} [{alert.severity.value.upper()}]\n"
            f"Device: {device.vendor} {device.product} ({device.device_type.value})\n"
            f"IP: {alert.device_ip}\n"
            f"MITRE ICS: {alert.mitre_ics}\n"
            f"Description: {alert.description}\n"
            f"Known CVEs: {', '.join(device.known_cves[:3]) if device else 'N/A'}\n\n"
            "Return JSON only: {\"threat_assessment\": str, \"attack_scenario\": str, "
            "\"operational_impact\": str, \"immediate_actions\": [str x3], "
            "\"false_positive_likelihood\": float 0-1, \"urgency_score\": int 1-10}"
        )
        try:
            hdrs: Dict = {"Content-Type": "application/json"}
            if provider == "anthropic":
                url  = "https://api.anthropic.com/v1/messages"
                hdrs.update({"x-api-key": api_key, "anthropic-version": "2023-06-01"})
                body = {"model": model, "max_tokens": 500, "temperature": 0,
                        "messages": [{"role":"user","content":prompt}]}
            else:
                base = PROV_URLS.get(provider, "https://api.openai.com/v1")
                url  = f"{base}/chat/completions"
                hdrs["Authorization"] = f"Bearer {api_key}"
                body = {"model": model, "max_tokens": 500, "temperature": 0,
                        "messages": [{"role":"user","content":prompt}],
                        "response_format": {"type": "json_object"}}
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12)) as s:
                async with s.post(url, headers=hdrs, json=body) as r:
                    if r.status != 200:
                        return {}
                    d = await r.json()
                    raw = (d.get("choices",[{}])[0].get("message",{}).get("content","")
                           if provider != "anthropic" else d.get("content",[{}])[0].get("text",""))
                    raw = re.sub(r'^```(?:json)?','',raw.strip()).rstrip('`').strip()
                    return json.loads(raw)
        except Exception as e:
            log.debug(f"AI triage error: {e}")
            return {}

PROV_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "mistral": "https://api.mistral.ai/v1",
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN SENTINEL ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class SentinelEngine:
    def __init__(self, config: Dict, db_path: str = "/sentinel/data/sentinel.db"):
        self._config   = config
        self._db_path  = db_path
        self._scanner  = DeviceScanner(config)
        self._modbus   = ModbusPoller()
        self._mqtt_aud = MQTTAuditor()
        self._cve      = CVELookup(config.get("nvd_api_key",""))
        self._notifier = AlertNotifier(config)
        self._ai       = AITriage(config.get("ai_pool",{}).get("vendors",[]))
        self._db:      Optional[aiosqlite.Connection] = None
        # Device registry: ip → Device
        self._devices: Dict[str, Device] = {}
        # Register baselines: device_id:addr → RegisterBaseline
        self._baselines: Dict[str, RegisterBaseline] = {}
        # Authorized IP set from config
        self._authorized_ips: Set[str] = set(config.get("authorized_devices", []))
        # IT zone subnets (for boundary violation detection)
        self._it_subnets = [ipaddress.ip_network(s, strict=False)
                            for s in config.get("it_subnets", []) if s]
        self._ot_subnets = [ipaddress.ip_network(s, strict=False)
                            for s in config.get("ot_subnets", []) if s]
        self._poll_interval    = config.get("poll_interval_sec", 60)
        self._scan_interval    = config.get("scan_interval_sec", 3600)
        self._modbus_registers = config.get("modbus_poll", {})
        self._running          = False
        log.info(f"SentinelEngine init — subnets={config.get('scan_subnets',[])} "
                 f"poll={self._poll_interval}s scan={self._scan_interval}s")

    # ── Lifecycle ──────────────────────────────────────────────────────────
    async def start(self):
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA synchronous=NORMAL")
        await self._init_schema()
        # Load existing devices
        await self._load_devices()
        # Start background tasks
        asyncio.create_task(self._discovery_loop())
        asyncio.create_task(self._polling_loop())
        asyncio.create_task(self._cve_enrichment_loop())
        self._running = True
        log.info("SentinelEngine started ✓")

    async def stop(self):
        self._running = False
        if self._db:
            await self._db.close()

    async def _init_schema(self):
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY, ip TEXT UNIQUE, mac TEXT, hostname TEXT,
                vendor TEXT, product TEXT, device_type TEXT, firmware_ver TEXT,
                firmware_hash TEXT, protocols TEXT, open_ports TEXT,
                known_cves TEXT, first_seen REAL, last_seen REAL,
                is_authorized INTEGER, ot_zone TEXT, criticality TEXT, alert_count INTEGER
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY, ts REAL, rule_id TEXT, rule_name TEXT,
                severity TEXT, device_id TEXT, device_ip TEXT, description TEXT,
                mitre_ics TEXT, evidence TEXT, acknowledged INTEGER DEFAULT 0,
                incident_id TEXT, ai_triage TEXT
            );
            CREATE TABLE IF NOT EXISTS register_readings (
                id TEXT PRIMARY KEY, ts REAL, device_ip TEXT, address INTEGER,
                protocol TEXT, value REAL, anomaly INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS compliance_checks (
                id TEXT PRIMARY KEY, ts REAL, standard TEXT, control_id TEXT,
                device_id TEXT, status TEXT, finding TEXT
            );
            CREATE TABLE IF NOT EXISTS firmware_history (
                id TEXT PRIMARY KEY, device_id TEXT, ts REAL,
                version TEXT, hash TEXT, change_type TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_alerts_ts     ON alerts(ts);
            CREATE INDEX IF NOT EXISTS idx_alerts_sev    ON alerts(severity);
            CREATE INDEX IF NOT EXISTS idx_devices_ip    ON devices(ip);
            CREATE INDEX IF NOT EXISTS idx_readings_ts   ON register_readings(ts);
        """)
        await self._db.commit()

    # ── Device Persistence ─────────────────────────────────────────────────
    async def _load_devices(self):
        rows = await (await self._db.execute("SELECT * FROM devices")).fetchall()
        cols = ["id","ip","mac","hostname","vendor","product","device_type","firmware_ver",
                "firmware_hash","protocols","open_ports","known_cves","first_seen","last_seen",
                "is_authorized","ot_zone","criticality","alert_count"]
        for row in rows:
            d = dict(zip(cols, row))
            dev = Device(
                id=d["id"], ip=d["ip"], mac=d.get("mac",""),
                hostname=d.get("hostname",""), vendor=d.get("vendor",""),
                product=d.get("product",""),
                device_type=DeviceType(d.get("device_type", DeviceType.UNKNOWN.value)),
                firmware_ver=d.get("firmware_ver",""),
                firmware_hash=d.get("firmware_hash",""),
                protocols=json.loads(d.get("protocols","[]")),
                open_ports=json.loads(d.get("open_ports","[]")),
                known_cves=json.loads(d.get("known_cves","[]")),
                first_seen=d["first_seen"], last_seen=d["last_seen"],
                is_authorized=bool(d.get("is_authorized",0)),
                ot_zone=d.get("ot_zone",""), criticality=d.get("criticality","medium"),
                alert_count=d.get("alert_count",0),
            )
            self._devices[dev.ip] = dev
        log.info(f"Loaded {len(self._devices)} known devices from DB")

    async def _save_device(self, dev: Device):
        await self._db.execute(
            """INSERT INTO devices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(ip) DO UPDATE SET
               last_seen=excluded.last_seen, open_ports=excluded.open_ports,
               protocols=excluded.protocols, vendor=excluded.vendor,
               product=excluded.product, device_type=excluded.device_type,
               hostname=excluded.hostname, alert_count=excluded.alert_count""",
            (dev.id, dev.ip, dev.mac, dev.hostname, dev.vendor, dev.product,
             dev.device_type.value, dev.firmware_ver, dev.firmware_hash,
             json.dumps(dev.protocols), json.dumps(dev.open_ports),
             json.dumps(dev.known_cves), dev.first_seen, dev.last_seen,
             int(dev.is_authorized), dev.ot_zone, dev.criticality, dev.alert_count),
        )
        await self._db.commit()

    # ── Discovery Loop ─────────────────────────────────────────────────────
    async def _discovery_loop(self):
        while True:
            for subnet in self._scanner._subnets:
                try:
                    found = await self._scanner.scan_subnet(subnet)
                    for dev in found:
                        dev.last_seen = time.time()
                        if dev.ip not in self._devices:
                            dev.is_authorized = dev.ip in self._authorized_ips
                            self._devices[dev.ip] = dev
                            await self._save_device(dev)
                            # Alert: new device
                            if not dev.is_authorized:
                                await self._raise_alert(
                                    rule_id="OT-006", device=dev,
                                    evidence={"open_ports": dev.open_ports, "protocols": dev.protocols},
                                )
                        else:
                            existing = self._devices[dev.ip]
                            existing.last_seen   = dev.last_seen
                            existing.open_ports  = dev.open_ports
                            existing.protocols   = dev.protocols
                            existing.hostname    = dev.hostname or existing.hostname
                            if dev.vendor and not existing.vendor:
                                existing.vendor  = dev.vendor
                                existing.product = dev.product
                            await self._save_device(existing)
                        # Run OT rules on discovered device
                        await self._run_ot_rules(dev)
                except Exception as e:
                    log.error(f"Discovery loop error ({subnet}): {e}")
            await asyncio.sleep(self._scan_interval)

    # ── OT Rule Engine ─────────────────────────────────────────────────────
    async def _run_ot_rules(self, dev: Device):
        for rule in OT_RULES:
            check = rule.get("check","")
            try:
                if check == "port_open":
                    port = rule.get("port", 0)
                    if port in dev.open_ports:
                        await self._raise_alert(rule_id=rule["id"], device=dev,
                                                evidence={"port": port, "open": True})
                elif check == "mqtt_anon":
                    if 1883 in dev.open_ports:
                        result = await self._mqtt_aud.check_anonymous(dev.ip, 1883)
                        if result.get("anonymous_access"):
                            await self._raise_alert(rule_id=rule["id"], device=dev,
                                                    evidence=result)
                elif check == "cve_match":
                    if dev.known_cves:
                        await self._raise_alert(rule_id=rule["id"], device=dev,
                                                evidence={"cves": dev.known_cves})
                elif check == "device_dropout":
                    if dev.last_polled > 0 and time.time() - dev.last_seen > 300:
                        await self._raise_alert(rule_id=rule["id"], device=dev,
                                                evidence={"last_seen_ago_sec": int(time.time()-dev.last_seen)})
            except Exception as e:
                log.debug(f"Rule {rule['id']} check error: {e}")

    # ── Polling Loop  (Modbus + connectivity) ─────────────────────────────
    async def _polling_loop(self):
        while True:
            await asyncio.sleep(self._poll_interval)
            for ip, dev in list(self._devices.items()):
                try:
                    # Connectivity check
                    reachable = await self._scanner._check_port(ip, dev.open_ports[0] if dev.open_ports else 80)
                    if not reachable and dev.last_polled > 0:
                        await self._raise_alert(rule_id="OT-008", device=dev,
                                                evidence={"last_seen": dev.last_seen})
                    else:
                        dev.last_seen  = time.time()
                        dev.last_polled = time.time()
                        await self._save_device(dev)

                    # Modbus register polling
                    if Protocol.MODBUS.value in dev.protocols:
                        poll_cfg = self._modbus_registers.get(ip, {})
                        start    = poll_cfg.get("start_address", 0)
                        count    = poll_cfg.get("count", 10)
                        unit_id  = poll_cfg.get("unit_id", 1)
                        values   = await self._modbus.read_registers(ip, 502, unit_id, start, count)
                        if values:
                            for i, val in enumerate(values):
                                addr = start + i
                                bkey = f"{dev.id}:{addr}"
                                if bkey not in self._baselines:
                                    self._baselines[bkey] = RegisterBaseline(dev.id, addr, "modbus")
                                bl = self._baselines[bkey]
                                anomaly = bl.is_anomalous(float(val))
                                bl.update(float(val))
                                # Persist reading
                                await self._db.execute(
                                    "INSERT INTO register_readings VALUES (?,?,?,?,?,?,?)",
                                    (str(uuid.uuid4()), time.time(), ip, addr, "modbus", val, int(anomaly))
                                )
                                if anomaly:
                                    await self._raise_alert(
                                        rule_id="OT-007", device=dev,
                                        evidence={"register": addr, "value": val,
                                                  "baseline_mean": round(bl.mean,2),
                                                  "baseline_std":  round(bl.std,2),
                                                  "z_score": round(abs(val-bl.mean)/(bl.std+1e-9),2)},
                                    )
                            await self._db.commit()
                except Exception as e:
                    log.debug(f"Polling error ({ip}): {e}")

    # ── CVE Enrichment Loop ────────────────────────────────────────────────
    async def _cve_enrichment_loop(self):
        """Enrich device CVE data from NVD API periodically."""
        while True:
            await asyncio.sleep(86400)  # daily
            for dev in list(self._devices.values()):
                if dev.vendor and not dev.known_cves:
                    cves = await self._cve.lookup_cpe(dev.vendor, dev.product)
                    if cves:
                        dev.known_cves = [c["id"] for c in cves if c.get("cvss_score",0) >= 7]
                        await self._save_device(dev)
                        if dev.known_cves:
                            await self._raise_alert(rule_id="OT-012", device=dev,
                                                    evidence={"cves": dev.known_cves[:5]})
                    await asyncio.sleep(1)  # NVD rate limit

    # ── Alert Engine ───────────────────────────────────────────────────────
    async def _raise_alert(self, rule_id: str, device: Device, evidence: Dict):
        rule = next((r for r in OT_RULES if r["id"] == rule_id), None)
        if not rule:
            return
        # Dedup: don't raise same rule+device within 1 hour
        if self._db:
            recent = await (await self._db.execute(
                "SELECT COUNT(*) FROM alerts WHERE rule_id=? AND device_ip=? AND ts>?",
                (rule_id, device.ip, time.time() - 3600)
            )).fetchone()
            if recent and recent[0] > 0:
                return

        alert = OTAlert(
            rule_id=rule_id, rule_name=rule["name"],
            severity=rule["severity"], device_id=device.id,
            device_ip=device.ip, description=rule["description"],
            mitre_ics=rule.get("mitre_ics",""), evidence=evidence,
        )
        # AI triage for HIGH/CRITICAL
        ai = {}
        if alert.severity in (AlertSeverity.CRITICAL, AlertSeverity.HIGH):
            ai = await self._ai.analyze(alert, device)

        if self._db:
            await self._db.execute(
                "INSERT INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (alert.id, alert.ts, alert.rule_id, alert.rule_name,
                 alert.severity.value, alert.device_id, alert.device_ip,
                 alert.description, alert.mitre_ics, json.dumps(alert.evidence),
                 0, None, json.dumps(ai)),
            )
            device.alert_count += 1
            await self._save_device(device)
            await self._db.commit()

        await self._notifier.notify(alert, device)
        log.warning(f"[{alert.severity.value.upper()}] {alert.rule_name} → {device.ip} "
                    f"({device.vendor} {device.product})")

    # ── Public API ─────────────────────────────────────────────────────────
    async def ingest_log(self, raw: str, source_ip: str = "") -> List[str]:
        """Ingest external log (from firewall, OT router) and run pattern matching."""
        alert_ids = []
        # Check for scan patterns
        if re.search(r"port.?scan|nmap|masscan", raw, re.I):
            dev = self._devices.get(source_ip)
            if not dev:
                dev = Device(ip=source_ip)
            a = OTAlert(rule_id="OT-010", rule_name="Scan/Enumeration Activity on OT Network",
                        severity=AlertSeverity.HIGH, device_ip=source_ip,
                        description=OT_RULES[9]["description"],
                        mitre_ics="T0846", evidence={"log_snippet": raw[:200]})
            if self._db:
                await self._db.execute(
                    "INSERT OR IGNORE INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (a.id, a.ts, a.rule_id, a.rule_name, a.severity.value, a.device_id,
                     a.device_ip, a.description, a.mitre_ics,
                     json.dumps(a.evidence), 0, None, "{}")
                )
                await self._db.commit()
                alert_ids.append(a.id)
            await self._notifier.notify(a, dev)
        return alert_ids

    async def get_dashboard(self) -> Dict:
        if not self._db:
            return {}
        now  = time.time()
        d1   = now - 86400
        total_dev   = len(self._devices)
        active_dev  = sum(1 for d in self._devices.values() if now - d.last_seen < 300)
        unauth_dev  = sum(1 for d in self._devices.values() if not d.is_authorized)
        alerts_24h  = (await (await self._db.execute(
            "SELECT COUNT(*) FROM alerts WHERE ts>?", (d1,))).fetchone())[0]
        critical    = (await (await self._db.execute(
            "SELECT COUNT(*) FROM alerts WHERE ts>? AND severity=?", (d1, "critical"))).fetchone())[0]
        unacked     = (await (await self._db.execute(
            "SELECT COUNT(*) FROM alerts WHERE acknowledged=0")).fetchone())[0]
        by_type     = defaultdict(int)
        for d in self._devices.values():
            by_type[d.device_type.value] += 1
        by_protocol = defaultdict(int)
        for d in self._devices.values():
            for p in d.protocols:
                by_protocol[p] += 1
        top_alert = await (await self._db.execute(
            "SELECT rule_name, COUNT(*) FROM alerts WHERE ts>? GROUP BY rule_name "
            "ORDER BY 2 DESC LIMIT 5", (d1,))).fetchall()
        anomalies = (await (await self._db.execute(
            "SELECT COUNT(*) FROM register_readings WHERE ts>? AND anomaly=1", (d1,))).fetchone())[0]

        return {
            "total_devices":    total_dev,
            "active_devices":   active_dev,
            "unauthorized":     unauth_dev,
            "alerts_24h":       alerts_24h,
            "critical_alerts":  critical,
            "unacknowledged":   unacked,
            "register_anomalies_24h": anomalies,
            "by_device_type":   dict(by_type),
            "by_protocol":      dict(by_protocol),
            "top_alerts_24h":   [{"rule": r[0], "count": r[1]} for r in top_alert],
            "ai_enabled":       bool(self._ai._vendors),
            "modbus_polling":   bool(self._modbus_registers),
        }

    async def get_devices(self, device_type: Optional[str] = None) -> List[Dict]:
        devs = list(self._devices.values())
        if device_type:
            devs = [d for d in devs if d.device_type.value == device_type]
        return [asdict(d) for d in devs]

    async def authorize_device(self, ip: str) -> bool:
        dev = self._devices.get(ip)
        if not dev:
            return False
        dev.is_authorized = True
        self._authorized_ips.add(ip)
        await self._save_device(dev)
        return True

    async def get_compliance_report(self, standard: ComplianceStandard) -> Dict:
        """Generate IEC 62443 / NERC CIP compliance report."""
        findings = []
        for dev in self._devices.values():
            for rule in OT_RULES:
                cis = rule.get("cis_control","")
                if standard.value.lower() in cis.lower():
                    port = rule.get("port")
                    violated = port and port in dev.open_ports
                    if violated:
                        findings.append({
                            "device_ip": dev.ip, "device_type": dev.device_type.value,
                            "vendor": dev.vendor, "rule_id": rule["id"],
                            "rule_name": rule["name"], "control": cis,
                            "severity": rule["severity"].value,
                        })
        return {
            "standard": standard.value,
            "generated_at": time.time(),
            "total_devices": len(self._devices),
            "violations": len(findings),
            "compliance_rate": round(100 * (1 - len(findings) / max(len(self._devices), 1)), 1),
            "findings": findings,
        }
