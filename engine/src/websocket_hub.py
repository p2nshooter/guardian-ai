"""
AXTO Guardian — AI eXecution & Tools Orchestration — WebSocket Hub
Real-time push events ke semua connected dashboard clients.

Setiap alert, incident, health change → broadcast ke semua client dalam <100ms.
Tidak ada polling. Dashboard selalu live.

Events yang di-push:
  alert.new          — new security alert from any monitor
  incident.new       — new incident created
  incident.updated   — incident status/severity changed
  health.changed     — component health status changed
  feed.updated       — threat feed refreshed
  node.online/offline— node connectivity changed
  metric.tick        — performance metrics every 10s (queue depth, CPU, etc)
  scan.result        — file/IP/domain scan completed
  ueba.anomaly       — UEBA behavioral anomaly detected
  deception.triggered— honeypot/canary triggered

Usage:
  from src.websocket_hub import get_hub
  hub = get_hub()
  await hub.broadcast("alert.new", {"verdict": "malicious", ...})
"""
from __future__ import annotations

import asyncio, json, logging, time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Set
from fastapi import WebSocket

log = logging.getLogger("guardian.ws_hub")


@dataclass
class WSClient:
    ws:         WebSocket
    client_id:  str
    tenant_id:  str  = "default"
    connected_at: float = field(default_factory=time.time)
    subscriptions: Set[str] = field(default_factory=set)   # empty = all events


class WebSocketHub:
    """
    Central broadcast hub. Thread-safe via asyncio.
    Supports per-tenant isolation and per-client event filtering.
    """

    def __init__(self):
        self._clients:   Dict[str, WSClient] = {}
        self._lock       = asyncio.Lock()
        self._event_log: list = []   # last 500 events for replay
        self._running    = False

    async def connect(self, ws: WebSocket, client_id: str,
                      tenant_id: str = "default") -> WSClient:
        await ws.accept()
        client = WSClient(ws=ws, client_id=client_id, tenant_id=tenant_id)
        async with self._lock:
            self._clients[client_id] = client
        log.debug(f"WS client connected: {client_id} tenant={tenant_id}")

        # Replay last 20 events for this tenant so client has context
        replay = [e for e in self._event_log[-50:]
                  if e.get("tenant") in (tenant_id, "default", "*")][-20:]
        for event in replay:
            await self._send(client, event)

        return client

    async def disconnect(self, client_id: str) -> None:
        async with self._lock:
            self._clients.pop(client_id, None)
        log.debug(f"WS client disconnected: {client_id}")

    async def broadcast(self, event_type: str, data: dict,
                        tenant_id: str = "*") -> None:
        """
        Broadcast event to all connected clients.
        tenant_id="*" → all tenants.
        tenant_id="default" → only default tenant.
        """
        payload = {
            "type":      event_type,
            "ts":        time.time(),
            "tenant":    tenant_id,
            "data":      data,
        }
        # Store in replay log
        self._event_log.append(payload)
        if len(self._event_log) > 500:
            self._event_log = self._event_log[-500:]

        # Tier 2: publish to Redis so other Core instances broadcast to their clients
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    await redis.publish("guardian:ws_broadcast", payload)
        except Exception:
            pass

        # Broadcast to matching clients
        dead = []
        async with self._lock:
            clients = list(self._clients.values())

        for client in clients:
            # Tenant filter
            if tenant_id != "*" and client.tenant_id not in (tenant_id, "default"):
                continue
            # Subscription filter (empty = all)
            if client.subscriptions and event_type not in client.subscriptions:
                continue
            ok = await self._send(client, payload)
            if not ok:
                dead.append(client.client_id)

        if dead:
            async with self._lock:
                for cid in dead:
                    self._clients.pop(cid, None)

    async def _send(self, client: WSClient, payload: dict) -> bool:
        try:
            await asyncio.wait_for(
                client.ws.send_text(json.dumps(payload)),
                timeout=3.0
            )
            return True
        except Exception:
            return False

    async def send_to(self, client_id: str, event_type: str, data: dict) -> bool:
        """Send event to a specific client only."""
        async with self._lock:
            client = self._clients.get(client_id)
        if not client:
            return False
        return await self._send(client, {
            "type": event_type, "ts": time.time(),
            "tenant": client.tenant_id, "data": data,
        })

    async def start_metric_ticker(self) -> None:
        """Push system metrics every 10 seconds to all clients.
        Tier 2: also start Redis subscriber so multi-core broadcasts reach this hub."""
        self._running = True
        # Tier 2: subscribe to Redis for cross-core event forwarding
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    import asyncio as _aio
                    _aio.create_task(redis.subscribe_alerts(self._on_redis_event))
                    log.info("WebSocket hub: Redis cross-core subscriber started")
        except Exception:
            pass
        while self._running:
            await asyncio.sleep(10)
            if not self._clients:
                continue
            try:
                from src.core import GuardianCore
                c = GuardianCore.get()
                metrics = {
                    "monitors_active": sum(1 for m in [
                        c.proc_monitor, c.net_monitor, c.ueba, c.dns_monitor,
                        c.deception, c.incident_mgr
                    ] if getattr(m, "_running", False)),
                    "incidents_open": c.incident_mgr.get_stats().get("open", 0),
                    "ueba_profiles":  c.ueba.get_stats().get("profiles", 0),
                    "ti_ips":         c.threat_intel.get_stats().get("malicious_ips", 0),
                    "deception_hits": c.deception.triggered_count,
                    "ts":             time.time(),
                }
                await self.broadcast("metric.tick", metrics)
            except Exception:
                pass

    async def _on_redis_event(self, data: dict) -> None:
        """Handle event from Redis (published by another Core instance)."""
        try:
            event_type = data.get("type", "remote.event")
            tenant_id  = data.get("tenant", "*")
            # Avoid re-publishing our own events (check origin)
            await self.broadcast(event_type, data.get("data", data), tenant_id=tenant_id)
        except Exception:
            pass

    async def stop(self) -> None:
        self._running = False
        async with self._lock:
            for client in list(self._clients.values()):
                try:
                    await client.ws.close()
                except Exception:
                    pass
            self._clients.clear()

    @property
    def connected_count(self) -> int:
        return len(self._clients)

    def get_stats(self) -> dict:
        return {
            "connected_clients": len(self._clients),
            "events_buffered":   len(self._event_log),
            "clients": [{"id": c.client_id, "tenant": c.tenant_id,
                         "connected_sec": round(time.time()-c.connected_at)}
                        for c in self._clients.values()],
        }


_hub: Optional[WebSocketHub] = None

def get_hub() -> WebSocketHub:
    global _hub
    if _hub is None:
        _hub = WebSocketHub()
    return _hub
