# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Multi-Cluster Federation
Enables multiple Orchestra instances to share load globally.

Architecture:
  Primary cluster  → accepts jobs, can delegate to peer clusters
  Peer clusters    → register as federation members
  Load balancing   → overflow jobs route to least-loaded peer
  Health check     → peers with high load or offline are skipped

Scales from 1 server to unlimited clusters worldwide.
Each cluster handles its own license enforcement independently.
"""
from __future__ import annotations
import asyncio, json, logging, time
from typing import Optional, List, Dict
import httpx

from database import OrchestraDB

log = logging.getLogger("orchestra.federation")


class FederationManager:
    """
    Manages connections to peer Orchestra clusters.
    Allows overflow routing when local queue is too deep.
    """

    def __init__(self):
        self.db    = OrchestraDB.get()
        self._http = httpx.AsyncClient(timeout=10.0)
        self._peer_health: Dict[str, Dict] = {}  # endpoint → {latency, queue_depth, online}

    async def start(self) -> None:
        asyncio.create_task(self._health_check_loop())
        log.info("Federation manager started")

    async def stop(self) -> None:
        await self._http.aclose()

    # ── Peer registration ─────────────────────────────────────────────────────

    def add_peer(self, endpoint: str, name: str = "", region: str = "",
                 cluster_id: str = "", token: str = "") -> None:
        """Add a peer Orchestra cluster."""
        self.db.upsert_node({
            "id":         cluster_id or f"peer-{endpoint.replace('://', '-').replace('/', '-').replace(':', '-')}",
            "name":       name or endpoint,
            "endpoint":   endpoint,
            "node_type":  "federation_peer",
            "max_workers": 0,
            "region":     region,
            "cluster_id": cluster_id,
            "tags":       json.dumps(["federation", "peer"]),
        })
        log.info(f"Federation peer registered: {endpoint}")

    def get_peers(self) -> List[Dict]:
        nodes = self.db.get_nodes()
        return [n for n in nodes if n.get("node_type") == "federation_peer"]

    # ── Overflow routing ──────────────────────────────────────────────────────

    async def should_delegate(self) -> bool:
        """Return True if local queue is overloaded and peers are available."""
        snap      = self.db.get_queue_snapshot()
        threshold = int(self.db.get_setting("autoscale_threshold", "20"))
        if snap["depth"] < threshold:
            return False
        healthy_peers = [p for p in self._peer_health.values() if p.get("online")]
        return len(healthy_peers) > 0

    async def delegate_job(self, job: Dict) -> Optional[Dict]:
        """Route a job to the least-loaded available peer cluster."""
        peers = self.get_peers()
        if not peers:
            return None

        # Find best peer: online + least queue depth
        best_peer = None
        best_depth = float("inf")
        for peer in peers:
            health = self._peer_health.get(peer["endpoint"], {})
            if not health.get("online"):
                continue
            depth = health.get("queue_depth", 999)
            if depth < best_depth:
                best_depth = depth
                best_peer = peer

        if not best_peer:
            return None

        try:
            endpoint = best_peer["endpoint"].rstrip("/")
            resp = await self._http.post(
                f"{endpoint}/jobs",
                json=job,
                headers={"X-Federation-Source": "local"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                log.info(f"Job delegated to {endpoint}: {data.get('job_id')}")
                return data
        except Exception as e:
            log.debug(f"Delegation to {best_peer['endpoint']} failed: {e}")
        return None

    # ── Health monitoring ─────────────────────────────────────────────────────

    async def _health_check_loop(self) -> None:
        while True:
            for peer in self.get_peers():
                await self._check_peer_health(peer)
            await asyncio.sleep(30)

    async def _check_peer_health(self, peer: Dict) -> None:
        endpoint = peer["endpoint"].rstrip("/")
        start = time.time()
        try:
            resp = await self._http.get(f"{endpoint}/health", timeout=5)
            latency_ms = int((time.time() - start) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                self._peer_health[peer["endpoint"]] = {
                    "online":      True,
                    "latency_ms":  latency_ms,
                    "queue_depth": data.get("queue_depth", 0),
                    "workers":     data.get("active_workers", 0),
                    "last_check":  time.time(),
                }
            else:
                self._peer_health[peer["endpoint"]] = {"online": False}
        except Exception:
            self._peer_health[peer["endpoint"]] = {"online": False, "last_check": time.time()}

    def get_federation_status(self) -> Dict:
        peers = self.get_peers()
        return {
            "peer_count":   len(peers),
            "online_peers": sum(1 for h in self._peer_health.values() if h.get("online")),
            "peers": [
                {**p, "health": self._peer_health.get(p["endpoint"], {"online": False})}
                for p in peers
            ],
        }


_federation: Optional[FederationManager] = None

def get_federation() -> FederationManager:
    global _federation
    if _federation is None:
        _federation = FederationManager()
    return _federation
