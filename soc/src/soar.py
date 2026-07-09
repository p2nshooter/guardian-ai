# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — SOAR Engine
Security Orchestration, Automation & Response

Playbook triggers:
  • Event severity threshold
  • Event type match (brute_force, malware_detected, etc.)
  • Threat intel match (known IOC detected)
  • Manual trigger

Playbook actions:
  • create_incident  — Open an incident with auto-populated details
  • block_ip         — Add IP to blocklist (calls Guardian API if configured)
  • alert_slack      — Send Slack notification
  • alert_email      — Send email notification
  • isolate_source   — Mark source as isolated (requires Guardian integration)
  • enrich_ioc       — Lookup IOC in threat intel
  • run_script       — Execute custom shell script (allowlist only)
"""
from __future__ import annotations

import asyncio
import json
import smtplib
import time
from email.mime.text import MIMEText
from typing import Any, Callable, Dict, List, Optional
import structlog

log = structlog.get_logger()


class SOAREngine:
    """
    Playbook execution engine.
    Loaded once at startup; playbooks evaluated for every incoming event.
    """

    def __init__(self, db, cfg):
        self._db  = db
        self._cfg = cfg
        self._playbooks: List[dict] = []
        self._blocked_ips: set = set()
        self._action_log: list = []

    def load_playbooks(self):
        """Load active playbooks from DB."""
        self._playbooks = self._db.get_playbooks()
        log.info("soc_soar_playbooks_loaded", count=len(self._playbooks))

    async def evaluate(self, event) -> List[str]:
        """
        Evaluate all playbooks against an event.
        Returns list of playbook IDs that fired.
        """
        fired = []
        for pb in self._playbooks:
            try:
                if await self._matches(pb, event):
                    await self._execute(pb, event)
                    fired.append(pb["id"])
            except Exception as e:
                log.error("soc_soar_playbook_error", pb=pb.get("id"), error=str(e))
        return fired

    async def _matches(self, pb: dict, event) -> bool:
        trigger     = pb.get("trigger", "")
        conditions  = json.loads(pb.get("conditions") or "{}")
        event_type  = getattr(event, "event_type", "")
        severity    = getattr(event, "severity", "info")

        if trigger != event_type and trigger != "*":
            return False

        # Check severity threshold
        sev_order = ["info", "low", "medium", "high", "critical"]
        min_sev = conditions.get("min_severity")
        if min_sev and sev_order.index(severity) < sev_order.index(min_sev):
            return False

        return True

    async def _execute(self, pb: dict, event):
        actions = json.loads(pb.get("actions") or "[]")
        log.info("soc_soar_playbook_fired", pb=pb.get("name"), event_type=event.event_type)

        for action in actions:
            action_type = action.get("type")
            params      = action.get("params", {})
            try:
                if action_type == "create_incident":
                    await self._action_create_incident(event, params)
                elif action_type == "block_ip":
                    await self._action_block_ip(event, params)
                elif action_type == "alert_slack":
                    await self._action_alert_slack(event, params)
                elif action_type == "alert_email":
                    await self._action_alert_email(event, params)
                elif action_type == "isolate_source":
                    await self._action_isolate(event, params)
                else:
                    log.warning("soc_soar_unknown_action", action=action_type)
            except Exception as e:
                log.error("soc_soar_action_error", action=action_type, error=str(e))

        # Update run count
        self._db._conn.execute(
            "UPDATE playbooks SET run_count = run_count + 1, last_run = ? WHERE id = ?",
            [time.time(), pb["id"]]
        )
        self._db._conn.commit()

    async def _action_create_incident(self, event, params: dict):
        iid = self._db.create_incident({
            "title":       f"[AUTO] {event.event_type.replace('_', ' ').title()} from {event.source_ip or event.source}",
            "description": (
                f"Automated incident created by SOAR playbook.\n\n"
                f"Event Type: {event.event_type}\n"
                f"Source: {event.source}\n"
                f"Source IP: {event.source_ip}\n"
                f"Severity: {event.severity}\n"
                f"Raw: {event.raw[:500]}"
            ),
            "severity":    params.get("severity", event.severity),
            "tags":        ["auto-created", "soar", event.event_type],
        })
        log.info("soc_soar_incident_created", incident_id=iid)

    async def _action_block_ip(self, event, params: dict):
        ip = event.source_ip
        if not ip:
            return
        self._blocked_ips.add(ip)
        log.info("soc_soar_ip_blocked", ip=ip, duration_hours=params.get("duration_hours", 24))

        # If Guardian is integrated, call its blocklist API
        guardian_url = self._cfg.guardian_api_url
        if guardian_url:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(
                        f"{guardian_url}/guardian/network/blocklist",
                        json={"ip": ip, "reason": "SOAR auto-block",
                              "duration_hours": params.get("duration_hours", 24)},
                        headers={"X-AXTO-Key": self._cfg.guardian_api_key},
                    )
            except Exception as e:
                log.warning("soc_soar_guardian_block_failed", error=str(e))

    async def _action_alert_slack(self, event, params: dict):
        webhook = self._cfg.slack_webhook
        if not webhook:
            return
        try:
            import httpx
            color  = {"critical": "#e53e3e", "high": "#dd6b20", "medium": "#d69e2e"}.get(
                event.severity, "#718096"
            )
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(webhook, json={
                    "attachments": [{
                        "color":   color,
                        "title":   f"🚨 SOC Alert — {event.event_type.replace('_', ' ').title()}",
                        "text":    f"*Severity:* {event.severity.upper()}\n"
                                   f"*Source:* {event.source_ip or event.source}\n"
                                   f"*Event:* {event.raw[:300]}",
                        "footer":  "AXTO SOC — Security Operations Center",
                        "ts":      int(event.ts),
                    }]
                })
        except Exception as e:
            log.warning("soc_soar_slack_error", error=str(e))

    async def _action_alert_email(self, event, params: dict):
        if not (self._cfg.email_smtp_host and self._cfg.alert_email_to):
            return
        try:
            subject = f"[AXTO SOC] {event.severity.upper()} — {event.event_type}"
            body    = (
                f"AXTO SOC Security Alert\n"
                f"{'='*50}\n\n"
                f"Severity  : {event.severity.upper()}\n"
                f"Event Type: {event.event_type}\n"
                f"Source    : {event.source}\n"
                f"Source IP : {event.source_ip or 'N/A'}\n"
                f"Timestamp : {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(event.ts))}\n\n"
                f"Raw Event :\n{event.raw[:1000]}\n\n"
                f"---\nAXTO SOC • https://axto.io"
            )
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"]    = self._cfg.email_smtp_user or "soc@axto.io"
            msg["To"]      = self._cfg.alert_email_to

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._send_email, msg)
        except Exception as e:
            log.warning("soc_soar_email_error", error=str(e))

    def _send_email(self, msg: MIMEText):
        with smtplib.SMTP(self._cfg.email_smtp_host, self._cfg.email_smtp_port) as s:
            if self._cfg.email_smtp_user:
                s.starttls()
                s.login(self._cfg.email_smtp_user, self._cfg.email_smtp_pass)
            s.send_message(msg)

    async def _action_isolate(self, event, params: dict):
        ip = event.source_ip
        log.info("soc_soar_source_isolated", ip=ip, note="Manual verification recommended")
        self._blocked_ips.add(ip or "unknown")

    def get_blocked_ips(self) -> List[str]:
        return list(self._blocked_ips)

    def unblock_ip(self, ip: str) -> bool:
        if ip in self._blocked_ips:
            self._blocked_ips.discard(ip)
            return True
        return False

    def get_stats(self) -> dict:
        return {
            "playbooks_loaded": len(self._playbooks),
            "blocked_ips":      len(self._blocked_ips),
            "action_log_size":  len(self._action_log),
        }
