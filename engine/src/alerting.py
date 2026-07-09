# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Alerting Engine
Multi-channel alert notifications. Tidak butuh server tambahan.

Channels:
  email     — SMTP (Gmail, SES, Mailgun, any SMTP)
  slack     — Incoming webhook atau Bot token
  telegram  — Bot API (gratis, instant, bisa group/channel)
  pagerduty — Events API v2 (incident escalation)
  webhook   — Generic HTTP POST (custom integrations)
  discord   — Webhook (tim kecil, gratis)

Config via env vars (semua optional — pakai yang ada saja):
  ALERT_EMAIL_SMTP_HOST, ALERT_EMAIL_SMTP_PORT
  ALERT_EMAIL_SMTP_USER, ALERT_EMAIL_SMTP_PASS
  ALERT_EMAIL_FROM, ALERT_EMAIL_TO (comma-separated)
  ALERT_SLACK_WEBHOOK_URL
  ALERT_TELEGRAM_BOT_TOKEN, ALERT_TELEGRAM_CHAT_ID
  ALERT_PAGERDUTY_ROUTING_KEY
  ALERT_WEBHOOK_URL, ALERT_WEBHOOK_SECRET
  ALERT_DISCORD_WEBHOOK_URL

Rules:
  - CRITICAL incidents → semua channel
  - HIGH → Slack + Telegram + PagerDuty
  - MEDIUM → Slack + Telegram
  - LOW → Webhook only (jika dikonfigurasi)
  - Deduplication: alert yang sama tidak dikirim 2x dalam 10 menit
  - Rate limit: max 60 alerts/jam per channel
"""
from __future__ import annotations

import asyncio, hashlib, json, logging, os, smtplib, time
from collections import defaultdict
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional
import urllib.request, urllib.error

log = logging.getLogger("guardian.alerting")

# ── Config from env ───────────────────────────────────────────────────────────
EMAIL_HOST   = os.environ.get("ALERT_EMAIL_SMTP_HOST", "")
EMAIL_PORT   = int(os.environ.get("ALERT_EMAIL_SMTP_PORT", "587"))
EMAIL_USER   = os.environ.get("ALERT_EMAIL_SMTP_USER", "")
EMAIL_PASS   = os.environ.get("ALERT_EMAIL_SMTP_PASS", "")
EMAIL_FROM   = os.environ.get("ALERT_EMAIL_FROM", EMAIL_USER)
EMAIL_TO     = [e.strip() for e in os.environ.get("ALERT_EMAIL_TO", "").split(",") if e.strip()]

SLACK_WEBHOOK      = os.environ.get("ALERT_SLACK_WEBHOOK_URL", "")
TELEGRAM_TOKEN     = os.environ.get("ALERT_TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.environ.get("ALERT_TELEGRAM_CHAT_ID", "")
PAGERDUTY_KEY      = os.environ.get("ALERT_PAGERDUTY_ROUTING_KEY", "")
WEBHOOK_URL        = os.environ.get("ALERT_WEBHOOK_URL", "")
WEBHOOK_SECRET     = os.environ.get("ALERT_WEBHOOK_SECRET", "")
DISCORD_WEBHOOK    = os.environ.get("ALERT_DISCORD_WEBHOOK_URL", "")

# Severity → channels mapping
SEVERITY_CHANNELS = {
    "critical": ["email", "slack", "telegram", "pagerduty", "discord", "webhook"],
    "high":     ["slack", "telegram", "pagerduty", "webhook"],
    "medium":   ["slack", "telegram"],
    "low":      ["webhook"],
    "info":     [],
}

DEDUP_WINDOW  = 600   # 10 minutes
RATE_LIMIT    = 60    # alerts per hour per channel


class AlertingEngine:
    def __init__(self):
        self._sent:    Dict[str, float]      = {}    # dedup: hash → timestamp
        self._counts:  Dict[str, List[float]] = defaultdict(list)  # rate: channel → [timestamps]
        self._history: list                  = []
        self._running  = False

    async def start(self) -> None:
        self._running = True
        configured = self._configured_channels()
        if configured:
            log.info(f"Alerting started: {configured}")
        else:
            log.warning("Alerting: no channels configured. Set ALERT_* env vars to enable.")
        # Tier 2: subscribe to Redis alert channel for multi-core broadcast
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    import asyncio
                    asyncio.create_task(redis.subscribe_alerts(self._on_redis_alert))
                    log.info("Alerting: Redis pub/sub subscribed (multi-core mode)")
        except Exception:
            pass

    async def _on_redis_alert(self, data: dict) -> None:
        """Handle alert broadcast from another Core instance via Redis."""
        try:
            event_type = data.get("event_type", "remote_alert")
            target     = data.get("target", "")
            verdict    = data.get("verdict", "suspicious")
            severity   = data.get("severity", "medium")
            source     = data.get("source", "remote_core")
            # Forward to WebSocket hub so dashboard sees it
            from src.websocket_hub import get_hub
            await get_hub().broadcast("alert.new", data, tenant_id=data.get("tenant_id","*"))
        except Exception as e:
            log.debug(f"Redis alert handler error: {e}")

    async def stop(self) -> None:
        self._running = False

    def _configured_channels(self) -> List[str]:
        ch = []
        if EMAIL_HOST and EMAIL_TO: ch.append("email")
        if SLACK_WEBHOOK:           ch.append("slack")
        if TELEGRAM_TOKEN:          ch.append("telegram")
        if PAGERDUTY_KEY:           ch.append("pagerduty")
        if WEBHOOK_URL:             ch.append("webhook")
        if DISCORD_WEBHOOK:         ch.append("discord")
        return ch

    def _dedup_key(self, event_type: str, target: str, verdict: str) -> str:
        raw = f"{event_type}:{target}:{verdict}"
        return hashlib.md5(raw.encode()).hexdigest()

    def _rate_ok(self, channel: str) -> bool:
        now   = time.time()
        hist  = self._counts[channel]
        hist  = [t for t in hist if now - t < 3600]
        self._counts[channel] = hist
        if len(hist) >= RATE_LIMIT:
            return False
        self._counts[channel].append(now)
        return True

    async def send_alert(
        self,
        title:       str,
        body:        str,
        severity:    str    = "high",
        event_type:  str    = "security_alert",
        target:      str    = "",
        incident_id: str    = "",
        node_name:   str    = "",
        tenant_id:   str    = "default",
    ) -> dict:
        """Send alert to all configured channels for this severity."""

        # Dedup check
        key = self._dedup_key(event_type, target, severity)
        if key in self._sent and time.time() - self._sent[key] < DEDUP_WINDOW:
            return {"ok": True, "deduped": True}
        self._sent[key] = time.time()

        channels = SEVERITY_CHANNELS.get(severity.lower(), [])
        results  = {}

        for channel in channels:
            if not self._rate_ok(channel):
                results[channel] = "rate_limited"
                continue
            try:
                if channel == "email":
                    results[channel] = await self._send_email(title, body, severity)
                elif channel == "slack":
                    results[channel] = await self._send_slack(title, body, severity, incident_id, node_name)
                elif channel == "telegram":
                    results[channel] = await self._send_telegram(title, body, severity, incident_id)
                elif channel == "pagerduty":
                    results[channel] = await self._send_pagerduty(title, body, severity, incident_id)
                elif channel == "webhook":
                    results[channel] = await self._send_webhook(title, body, severity, event_type, target, incident_id)
                elif channel == "discord":
                    results[channel] = await self._send_discord(title, body, severity, incident_id)
            except Exception as e:
                results[channel] = f"error: {e}"
                log.warning(f"Alert channel {channel} failed: {e}")

        record = {
            "ts": time.time(), "title": title, "severity": severity,
            "tenant": tenant_id, "channels": results, "incident_id": incident_id,
        }
        self._history.append(record)
        if len(self._history) > 200:
            self._history = self._history[-200:]

        sent_ok = [c for c, r in results.items() if r == "ok"]
        if sent_ok:
            log.info(f"Alert sent via {sent_ok}: {title[:60]}")

        # Tier 2: publish to Redis so other Core instances see this alert
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    await redis.publish("guardian:alerts", {
                        "title": title, "body": body, "severity": severity,
                        "event_type": event_type, "target": target,
                        "incident_id": incident_id, "node_name": node_name,
                        "tenant_id": tenant_id, "ts": time.time(),
                    })
        except Exception:
            pass

        return {"ok": True, "sent_channels": sent_ok, "results": results}

    # ── Email ─────────────────────────────────────────────────────────────────
    async def _send_email(self, title: str, body: str, severity: str) -> str:
        if not (EMAIL_HOST and EMAIL_TO):
            return "not_configured"
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._send_email_sync, title, body, severity)

    def _send_email_sync(self, title: str, body: str, severity: str) -> str:
        SEVERITY_COLORS = {"critical": "#dc2626", "high": "#ea580c",
                           "medium": "#d97706", "low": "#2563eb"}
        color = SEVERITY_COLORS.get(severity, "#6366f1")
        html  = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<div style="background:{color};color:#fff;padding:20px 24px">
<h2 style="margin:0;font-size:18px">🛡️ Guardian Security Alert</h2>
<p style="margin:4px 0 0;opacity:.9;font-size:13px">{severity.upper()}</p>
</div>
<div style="padding:24px">
<h3 style="margin:0 0 12px;color:#111">{title}</h3>
<pre style="background:#f3f4f6;border-radius:6px;padding:16px;font-size:13px;white-space:pre-wrap;color:#374151">{body}</pre>
<p style="color:#9ca3af;font-size:12px;margin-top:16px">Axto Guardian AI — Automated Security Alert</p>
</div></div></body></html>"""
        try:
            msg  = MIMEMultipart("alternative")
            msg["Subject"] = f"[{severity.upper()}] {title}"
            msg["From"]    = EMAIL_FROM
            msg["To"]      = ", ".join(EMAIL_TO)
            msg.attach(MIMEText(body, "plain"))
            msg.attach(MIMEText(html,  "html"))
            with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10) as smtp:
                smtp.ehlo()
                if EMAIL_PORT != 465:
                    smtp.starttls()
                if EMAIL_USER and EMAIL_PASS:
                    smtp.login(EMAIL_USER, EMAIL_PASS)
                smtp.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
            return "ok"
        except Exception as e:
            return f"error:{e}"

    # ── Slack ─────────────────────────────────────────────────────────────────
    async def _send_slack(self, title: str, body: str, severity: str,
                           incident_id: str, node_name: str) -> str:
        if not SLACK_WEBHOOK:
            return "not_configured"
        COLORS = {"critical": "#dc2626", "high": "#ea580c",
                  "medium": "#d97706", "low": "#3b82f6"}
        EMOJIS = {"critical": "🚨", "high": "⚠️", "medium": "🔶", "low": "🔵"}
        payload = {
            "text": f"{EMOJIS.get(severity,'⚠️')} *Guardian Alert: {title}*",
            "attachments": [{
                "color":  COLORS.get(severity, "#6366f1"),
                "blocks": [
                    {"type": "section", "text": {"type": "mrkdwn",
                     "text": f"*{title}*\n{body[:800]}"}},
                    {"type": "context", "elements": [
                        {"type": "mrkdwn",
                         "text": f"Severity: *{severity.upper()}* | Node: {node_name or 'unknown'}"
                                 + (f" | Incident: `{incident_id}`" if incident_id else "")},
                    ]},
                ],
            }],
        }
        return self._http_post(SLACK_WEBHOOK, payload)

    # ── Telegram ──────────────────────────────────────────────────────────────
    async def _send_telegram(self, title: str, body: str,
                              severity: str, incident_id: str) -> str:
        if not (TELEGRAM_TOKEN and TELEGRAM_CHAT_ID):
            return "not_configured"
        EMOJIS = {"critical": "🚨", "high": "⚠️", "medium": "🔶", "low": "🔵"}
        text = (
            f"{EMOJIS.get(severity,'⚠️')} *{title}*\n\n"
            f"`{body[:1000]}`\n\n"
            f"Severity: *{severity.upper()}*"
            + (f"\nIncident: `{incident_id}`" if incident_id else "")
        )
        payload = {
            "chat_id":    TELEGRAM_CHAT_ID,
            "text":       text,
            "parse_mode": "Markdown",
        }
        return self._http_post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            payload
        )

    # ── PagerDuty ─────────────────────────────────────────────────────────────
    async def _send_pagerduty(self, title: str, body: str,
                               severity: str, incident_id: str) -> str:
        if not PAGERDUTY_KEY:
            return "not_configured"
        PD_SEV = {"critical": "critical", "high": "error",
                  "medium": "warning", "low": "info"}
        payload = {
            "routing_key":  PAGERDUTY_KEY,
            "event_action": "trigger",
            "dedup_key":    incident_id or hashlib.md5(title.encode()).hexdigest()[:16],
            "payload": {
                "summary":   title,
                "severity":  PD_SEV.get(severity, "error"),
                "source":    "Guardian AI",
                "custom_details": {"body": body[:1000], "incident_id": incident_id},
            },
        }
        return self._http_post("https://events.pagerduty.com/v2/enqueue", payload)

    # ── Generic Webhook ───────────────────────────────────────────────────────
    async def _send_webhook(self, title: str, body: str, severity: str,
                             event_type: str, target: str, incident_id: str) -> str:
        if not WEBHOOK_URL:
            return "not_configured"
        payload = {
            "ts": time.time(), "title": title, "body": body,
            "severity": severity, "event_type": event_type,
            "target": target, "incident_id": incident_id,
            "source": "guardian-ai",
        }
        headers = {"Content-Type": "application/json"}
        if WEBHOOK_SECRET:
            sig = hashlib.sha256(f"{WEBHOOK_SECRET}{json.dumps(payload)}".encode()).hexdigest()
            headers["X-Guardian-Signature"] = sig
        return self._http_post(WEBHOOK_URL, payload, headers)

    # ── Discord ───────────────────────────────────────────────────────────────
    async def _send_discord(self, title: str, body: str,
                             severity: str, incident_id: str) -> str:
        if not DISCORD_WEBHOOK:
            return "not_configured"
        COLORS = {"critical": 14495300, "high": 15295232,
                  "medium": 16426522, "low": 3447003}
        payload = {
            "embeds": [{
                "title":       f"🛡️ {title}",
                "description": body[:2000],
                "color":       COLORS.get(severity, 6559092),
                "fields": [
                    {"name": "Severity",    "value": severity.upper(), "inline": True},
                    {"name": "Incident ID", "value": incident_id or "N/A", "inline": True},
                ],
                "footer": {"text": "Axto Guardian AI"},
                "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            }],
        }
        return self._http_post(DISCORD_WEBHOOK, payload)

    # ── HTTP helper ───────────────────────────────────────────────────────────
    def _http_post(self, url: str, payload: dict,
                   extra_headers: dict = None) -> str:
        try:
            data    = json.dumps(payload).encode()
            headers = {"Content-Type": "application/json"}
            if extra_headers:
                headers.update(extra_headers)
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                return "ok" if r.status < 300 else f"http_{r.status}"
        except Exception as e:
            return f"error:{str(e)[:80]}"

    def get_stats(self) -> dict:
        return {
            "configured_channels": self._configured_channels(),
            "sent_total":    len(self._history),
            "recent_alerts": self._history[-10:],
            "rate_counts":   {ch: len(v) for ch, v in self._counts.items()},
        }

    def test_channel(self, channel: str) -> str:
        """Send a test message to verify channel config."""
        test_title = "Axto Guardian — Test Alert"
        test_body  = f"This is a test alert from Guardian AI.\nTimestamp: {time.time()}"
        funcs = {
            "email":     lambda: self._send_email_sync(test_title, test_body, "medium"),
            "slack":     lambda: asyncio.get_event_loop().run_until_complete(
                self._send_slack(test_title, test_body, "medium", "TEST-001", "test-node")),
            "telegram":  lambda: asyncio.get_event_loop().run_until_complete(
                self._send_telegram(test_title, test_body, "medium", "TEST-001")),
            "pagerduty": lambda: asyncio.get_event_loop().run_until_complete(
                self._send_pagerduty(test_title, test_body, "low", "TEST-001")),
            "webhook":   lambda: asyncio.get_event_loop().run_until_complete(
                self._send_webhook(test_title, test_body, "low", "test", "", "TEST-001")),
            "discord":   lambda: asyncio.get_event_loop().run_until_complete(
                self._send_discord(test_title, test_body, "medium", "TEST-001")),
        }
        fn = funcs.get(channel)
        if not fn:
            return f"unknown channel: {channel}"
        try:
            return fn()
        except Exception as e:
            return f"error:{e}"


_engine: Optional[AlertingEngine] = None

def get_alerting() -> AlertingEngine:
    global _engine
    if _engine is None:
        _engine = AlertingEngine()
    return _engine
