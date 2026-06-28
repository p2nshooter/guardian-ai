# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
from __future__ import annotations
import asyncio, threading, structlog
from src.config.settings import get_config
from src.license import LicenseValidator, LicenseInfo
from src.pool.manager import AIPoolManager
from src.collector.engine import ThreatFeedCollector
from src.detector.engine import DetectionEngine
from src.response import ResponseEngine
from src.database import get_db
from src.monitor.process_monitor import ProcessMonitor
from src.monitor.network_monitor import NetworkMonitor
from src.monitor.honeypot import HoneypotMonitor
from src.monitor.rootkit_detector import RootkitDetector
from src.monitor.threat_hunter import ThreatHunter as AIThreatHunter
from src.monitor.fim import FileIntegrityMonitor
from src.monitor.memory_scanner import MemoryScanner
from src.monitor.dlp import DLPMonitor
from src.monitor.correlation import CorrelationEngine
from src.monitor.ueba import UEBAEngine
from src.monitor.ml_anomaly import MLAnomalyEngine, get_ml_engine
from src.websocket_hub import WebSocketHub, get_hub
from src.multitenant import MultiTenantManager, get_tenant_manager
from src.alerting import AlertingEngine, get_alerting
from src.siem_forwarder import SIEMForwarder, get_siem
from src.threat_hunting import ThreatHunter, get_threat_hunter
from src.monitor.dns_monitor import DNSMonitor
from src.monitor.deception import DeceptionEngine
from src.monitor.incident_manager import IncidentManager
from src.monitor.threat_intel import ThreatIntelEngine
from src.monitor.compliance import ComplianceEngine
from src.ebpf_monitor import eBPFMonitor, get_ebpf

log = structlog.get_logger()

_singleton_lock = threading.Lock()


class GuardianCore:
    _instance: "GuardianCore | None" = None

    def __init__(self):
        self._cfg = get_config()
        self.license_validator = LicenseValidator()
        self.ai_pool = AIPoolManager()
        self.collector = ThreatFeedCollector()
        self.detector = DetectionEngine(self.ai_pool)
        self.response  = ResponseEngine()
        self.db            = None   # initialized async in startup()
        self.proc_monitor  = ProcessMonitor()
        self.net_monitor   = NetworkMonitor()
        self.honeypot      = HoneypotMonitor()
        self.rootkit       = RootkitDetector()
        self.hunter        = AIThreatHunter()
        self.fim           = FileIntegrityMonitor()
        self.mem_scanner   = MemoryScanner()
        self.dlp           = DLPMonitor()
        self.correlation   = CorrelationEngine()
        self.ueba          = UEBAEngine()
        self.ml_anomaly    = MLAnomalyEngine()
        self.ws_hub        = get_hub()
        self.tenant_mgr    = get_tenant_manager()
        self.alerting      = get_alerting()
        self.siem          = get_siem()
        self.hunt          = get_threat_hunter()
        self.dns_monitor   = DNSMonitor()
        self.deception     = DeceptionEngine()
        self.incident_mgr  = IncidentManager()
        self.threat_intel  = ThreatIntelEngine()
        self.compliance    = ComplianceEngine()
        self.ebpf          = get_ebpf()
        self.license_info: LicenseInfo | None = None
        self._node_count = 0
        self._started = False
        self._start_lock = asyncio.Lock()  # guard against concurrent startup() calls
        self._tasks: list = []

        # Wire collector → detector callback
        self.collector.set_update_callback(self._on_feed_updated)

    @classmethod
    def get(cls) -> "GuardianCore":
        """Thread-safe double-checked locking singleton."""
        if cls._instance is None:
            with _singleton_lock:
                if cls._instance is None:
                    cls._instance = GuardianCore()
        return cls._instance

    async def startup(self) -> None:
        """
        Idempotent startup — safe to call concurrently from FastAPI.
        asyncio.Lock ensures only one coroutine runs the body even if
        two startup events fire simultaneously (e.g. during hot-reload).
        """
        async with self._start_lock:
            if self._started:
                return
            self._started = True

        log.info("🛡️  AXTO Guardian — AI eXecution & Tools Orchestration starting...")

        # License validation
        self.license_info = await self.license_validator.validate(0)
        if self.license_info.valid:
            log.info(f"License: {self.license_info.package} — expires {self.license_info.expires_at}")
        else:
            log.warning(f"License issue: {self.license_info.reason}")

        # AI vendor pool
        if self._cfg.ai_vendors:
            self.ai_pool.initialize(self._cfg.ai_vendors)
            log.info(f"AI Pool: {self.ai_pool.vendor_count} vendor(s) loaded")

        # Background tasks — tracked for clean cancellation on shutdown
        self._tasks.append(asyncio.create_task(self._bg_collector(), name="collector"))
        self._tasks.append(asyncio.create_task(
            self.license_validator.heartbeat(self._node_count), name="license_heartbeat"))

        # Initialize local DB (or distributed if configured)
        self.db = await get_db()
        log.info(f"📀 DB initialized ({__import__('src.database_distributed', fromlist=['get_db_mode']).get_db_mode()})")

        # Tier 2: init multitenant PG registry
        try:
            await self.tenant_mgr.init_pg()
        except Exception:
            pass

        # Start all monitors
        await self.proc_monitor.start()
        await self.net_monitor.start()
        await self.honeypot.start()
        await self.rootkit.start()
        await self.hunter.start()
        await self.fim.start()
        await self.mem_scanner.start()
        await self.dlp.start()
        await self.correlation.start()
        await self.ueba.start()
        await self.ml_anomaly.start()
        await self.alerting.start()
        await self.siem.start()
        asyncio.create_task(self.ws_hub.start_metric_ticker())
        await self.dns_monitor.start()
        await self.deception.start()
        await self.incident_mgr.start()
        await self.threat_intel.start()
        await self.compliance.start()
        # ── Tier 2: eBPF kernel monitor ──────────────────────────────────────
        if self._cfg.ebpf_enabled:
            self.ebpf.set_exec_callback(self._on_ebpf_exec)
            self.ebpf.set_connect_callback(self._on_ebpf_connect)
            await self.ebpf.start()
        from src.health import get_watchdog
        await get_watchdog().start()
        log.info("✅ Guardian Core ready — all monitors active")

    # ── eBPF callbacks ────────────────────────────────────────────────────────

    async def _on_ebpf_exec(self, pid: int, ppid: int, uid: int,
                             comm: str, fname: str) -> None:
        """Called by eBPF on every execve — kernel level, cannot be hidden."""
        self.ueba.observe_process(comm, cpu_pct=0, mem_mb=0)
        suspicious = any(s in fname.lower() for s in (
            "/tmp/", "curl", "wget", "nc ", "ncat", "/dev/tcp",
            "python -c", "perl -e", "base64", "bash -i",
        ))
        if suspicious:
            import os as _os
            await self.incident_mgr.ingest_alert(
                source="ebpf", event_type="suspicious_exec",
                target=fname, verdict="suspicious", confidence=0.75,
                threat_type="living_off_the_land",
                indicators=[f"pid={pid}", f"ppid={ppid}",
                            f"uid={uid}", f"comm={comm}"],
                node_id=_os.environ.get("GUARDIAN_NODE_ID", "core"),
            )

    async def _on_ebpf_connect(self, pid: int, uid: int, comm: str,
                                src_ip: str, dst_ip: str, dst_port: int) -> None:
        """Called by eBPF on every tcp_connect — kernel level."""
        if dst_ip in self.detector.malicious_ips:
            import os as _os
            await self.incident_mgr.ingest_alert(
                source="ebpf_network", event_type="c2_connection",
                target=dst_ip, verdict="malicious", confidence=0.95,
                threat_type="c2_communication",
                indicators=[f"pid={pid}", f"comm={comm}",
                            f"dst={dst_ip}:{dst_port}"],
                node_id=_os.environ.get("GUARDIAN_NODE_ID", "core"),
            )

    # ── Feed update callback ──────────────────────────────────────

    async def _on_feed_updated(self) -> None:
        """
        Invoked by ThreatFeedCollector after every successful update.
        Atomically swaps all three threat sets in DetectionEngine under lock —
        safe for concurrent scan requests.
        """
        await self.detector.load_feeds(
            hashes=self.collector.malware_hashes,
            ips=self.collector.malicious_ips,
            domains=self.collector.malicious_domains,
        )
        s = self.detector.feed_stats
        log.info("🔄 Threat feed → detector synced",
                 hashes=s["hashes"], ips=s["ips"], domains=s["domains"])

    # ── Background collector ──────────────────────────────────────

    async def _bg_collector(self) -> None:
        interval = float(
            self.license_info.features.get("update_interval_hours", 24)
            if self.license_info else 24
        )
        await self.collector.start(interval)

    # ── Helpers ───────────────────────────────────────────────────

    def update_node_count(self, n: int) -> None:
        self._node_count = n

    async def shutdown(self) -> None:
        log.info("Guardian shutting down...")
        # Cancel background tasks
        for task in self._tasks:
            if not task.done():
                task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        # Close HTTP clients
        for client_holder in (self.collector, self.license_validator):
            try:
                await client_holder._client.aclose()
            except Exception:
                pass
        await self.proc_monitor.stop()
        await self.net_monitor.stop()
        await self.honeypot.stop()
        await self.rootkit.stop()
        await self.hunter.stop()
        await self.fim.stop()
        await self.mem_scanner.stop()
        await self.dlp.stop()
        await self.correlation.stop()
        await self.ueba.stop()
        await self.ml_anomaly.stop()
        await self.alerting.stop()
        await self.siem.stop()
        await self.ws_hub.stop()
        await self.dns_monitor.stop()
        await self.deception.stop()
        await self.incident_mgr.stop()
        await self.threat_intel.stop()
        await self.compliance.stop()
        await self.ebpf.stop()
        from src.health import get_watchdog
        await get_watchdog().stop()
        if self.db:
            await self.db.close()
        try:
            from src.database_distributed import close_distributed
            await close_distributed()
        except Exception:
            pass
        log.info("Guardian shutdown complete")
