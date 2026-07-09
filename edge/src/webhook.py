# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — Webhook Manager"""
from __future__ import annotations
import asyncio, json, uuid
from pathlib import Path
from typing import Dict, List, Optional
import httpx, structlog

log = structlog.get_logger()


class WebhookManager:
    def __init__(self, data_dir: Path):
        self._file  = data_dir / "webhooks.json"
        self._hooks: List[Dict] = []
        self._http: Optional[httpx.AsyncClient] = None

    def startup(self):
        self._http = httpx.AsyncClient(timeout=10.0)
        if self._file.exists():
            try:
                self._hooks = json.loads(self._file.read_text())
            except Exception:
                self._hooks = []

    def list_webhooks(self) -> List[Dict]:
        return [{"id":h["id"],"url":h["url"],"events":h["events"],"enabled":h.get("enabled",True)}
                for h in self._hooks]

    def add_webhook(self, data: Dict) -> Dict:
        h = {"id": str(uuid.uuid4())[:8], "url": data.get("url",""),
             "events": data.get("events", ["all"]), "enabled": True}
        self._hooks.append(h)
        self._save()
        return h

    def remove_webhook(self, webhook_id: str):
        self._hooks = [h for h in self._hooks if h["id"] != webhook_id]
        self._save()

    async def fire(self, event: str, payload: Dict) -> int:
        """Fire webhook to all matching subscriptions. Returns count sent."""
        sent = 0
        for hook in self._hooks:
            if not hook.get("enabled", True): continue
            evts = hook.get("events", ["all"])
            if "all" not in evts and event not in evts: continue
            try:
                await self._http.post(hook["url"], json={
                    "event": event, "payload": payload,
                    "source": "axto-edge", "ts": _now(),
                }, timeout=8.0)
                sent += 1
            except Exception as e:
                log.warning("webhook_fire_failed", event=event, url=hook["url"], error=str(e))
        return sent

    def _save(self):
        self._file.write_text(json.dumps(self._hooks, indent=2))


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
