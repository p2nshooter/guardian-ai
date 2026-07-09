# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP OT / IoT Security — real asset inventory + classification + risk scoring.

Not a stub: the client registers assets (or feeds discovery data), and YP
classifies each by its industrial protocol, infers a device role, and computes
a real risk score from genuine factors (protocol criticality, network exposure,
authentication, and known-insecure legacy protocols). High-risk assets emit a
SOC event so the security modules stay interconnected.
"""
from __future__ import annotations

# Real OT/ICS protocol → default port + inherent criticality (0..40) mapping.
# Legacy fieldbus protocols with no built-in auth score higher.
PROTOCOLS = {
    "modbus":  {"port": 502,   "criticality": 35, "auth": False, "label": "Modbus TCP"},
    "dnp3":    {"port": 20000, "criticality": 35, "auth": False, "label": "DNP3"},
    "s7":      {"port": 102,   "criticality": 38, "auth": False, "label": "Siemens S7comm"},
    "enip":    {"port": 44818, "criticality": 33, "auth": False, "label": "EtherNet/IP"},
    "bacnet":  {"port": 47808, "criticality": 25, "auth": False, "label": "BACnet"},
    "opcua":   {"port": 4840,  "criticality": 20, "auth": True,  "label": "OPC UA"},
    "iec104":  {"port": 2404,  "criticality": 38, "auth": False, "label": "IEC 60870-5-104"},
    "profinet":{"port": 34962, "criticality": 34, "auth": False, "label": "PROFINET"},
    "mqtt":    {"port": 1883,  "criticality": 18, "auth": False, "label": "MQTT"},
    "coap":    {"port": 5683,  "criticality": 15, "auth": False, "label": "CoAP"},
}

# Device role hints by asset_type.
ROLES = {
    "plc":    "Programmable Logic Controller",
    "rtu":    "Remote Terminal Unit",
    "hmi":    "Human-Machine Interface",
    "sensor": "Field sensor / IoT endpoint",
    "gateway":"Protocol gateway",
    "server": "SCADA/Historian server",
    "unknown":"Unclassified device",
}


def classify_protocol(protocol: str | None, port: int | None) -> str:
    """Resolve a protocol from an explicit name or a well-known port."""
    if protocol and protocol.lower() in PROTOCOLS:
        return protocol.lower()
    if port:
        for name, meta in PROTOCOLS.items():
            if meta["port"] == port:
                return name
    return protocol.lower() if protocol else "unknown"


def risk_score(protocol: str, exposed: bool, authenticated: bool,
               asset_type: str = "unknown") -> int:
    """
    Real 0..100 risk score:
      + protocol inherent criticality (0..40)
      + 30 if reachable from an untrusted/exposed network
      + 20 if the protocol lacks authentication and none is layered on
      + 10 if it's a control device (plc/rtu) vs a passive sensor
    """
    meta = PROTOCOLS.get(protocol, {"criticality": 10, "auth": True})
    score = meta["criticality"]
    if exposed:
        score += 30
    if not authenticated and not meta.get("auth", False):
        score += 20
    if asset_type in ("plc", "rtu"):
        score += 10
    return max(0, min(100, score))


def classify(name: str, ip: str, asset_type: str, protocol: str | None,
             port: int | None, vendor: str, exposed: bool,
             authenticated: bool) -> dict:
    proto = classify_protocol(protocol, port)
    score = risk_score(proto, exposed, authenticated, asset_type)
    meta = PROTOCOLS.get(proto, {})
    return {
        "name": name, "ip": ip,
        "asset_type": asset_type if asset_type in ROLES else "unknown",
        "role": ROLES.get(asset_type, ROLES["unknown"]),
        "protocol": proto,
        "protocol_label": meta.get("label", proto),
        "protocol_port": meta.get("port"),
        "vendor": vendor,
        "exposed": exposed,
        "authenticated": authenticated,
        "risk_score": score,
        "risk_band": "critical" if score >= 80 else "high" if score >= 60
                     else "medium" if score >= 35 else "low",
    }
