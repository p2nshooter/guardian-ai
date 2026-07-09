# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Dashboard Reporter
Kirim alert dan threat discovery ke AXTO Dashboard API (Cloudflare D1).
Fire-and-forget: tidak block scan, gagal jaringan tidak crash engine.
"""
from __future__ import annotations
import asyncio
import logging
import socket
from typing import Optional
import httpx

log = logging.getLogger("guardian.reporter")

_client: Optional[httpx.AsyncClient] = None

def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client


async def report_alert(
    dashboard_url: str,
    license_key: str,
    *,
    node_id: str,
    node_name: str,
    alert_type: str,   # 'malicious_file' | 'malicious_ip' | 'malicious_domain' | 'behavior'
    verdict: str,
    confidence: float,
    threat_type: Optional[str],
    indicators: list,
    method: str,
    target: str,
    target_hash: str = "",
    raw_data: dict = {},
) -> Optional[str]:
    """
    POST alert ke Dashboard → disimpan di D1.
    Returns alert_id jika sukses, None jika gagal.
    Non-blocking — dipanggil via asyncio.create_task.
    """
    if not dashboard_url or not license_key:
        return None
    try:
        resp = await get_client().post(
            f"{dashboard_url}/api/guardian",
            headers={"x-license-key": license_key},
            json={
                "node_id":     node_id,
                "node_name":   node_name,
                "hostname":    socket.gethostname(),
                "alert_type":  alert_type,
                "verdict":     verdict,
                "confidence":  confidence,
                "threat_type": threat_type,
                "indicators":  indicators,
                "method":      method,
                "target":      target,
                "target_hash": target_hash,
                "raw_data":    raw_data,
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("alert_id")
    except Exception as e:
        log.debug(f"Alert report failed (non-fatal): {e}")
    return None


async def submit_threat(
    dashboard_url: str,
    license_key: str,
    *,
    threat_type: str,  # 'hash' | 'ip' | 'domain'
    value: str,
    name: str = "",
    severity: str = "high",
    alert_id: Optional[str] = None,
) -> None:
    """
    Submit threat baru ke review queue di D1.
    Admin approve → publish ke R2 → masuk ke feed semua Guardian.
    """
    if not dashboard_url or not license_key:
        return
    try:
        await get_client().post(
            f"{dashboard_url}/api/guardian?action=submit_threat",
            headers={"x-license-key": license_key},
            json={
                "threat_type": threat_type,
                "value":       value,
                "name":        name,
                "severity":    severity,
                "alert_id":    alert_id,
            },
        )
    except Exception as e:
        log.debug(f"Threat submission failed (non-fatal): {e}")
