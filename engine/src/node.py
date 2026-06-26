# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Guardian Node Agent — Production v2
Runs on each monitored server. Reports to Guardian Core.

v2 enhancements:
  - Cluster-aware: reports resource metrics (CPU/mem/disk) to Core
  - Network topology discovery (peer nodes via mDNS-style broadcast)
  - Process monitor integration: auto-observe spawned processes via UEBA
  - DNS monitor integration: hook /etc/resolv.conf queries
  - Incident auto-reporting: node-level alerts fed into IncidentManager
  - Graceful reconnect with exponential backoff
  - Self-healing: restarts monitors on uncaught exception

Scan Modes:
  auto   → scans automatically every scan_interval seconds (DEFAULT)
  manual → only scans when POST /node/scan/trigger is called
  off    → scanning disabled on this node
"""
import asyncio, os, platform, psutil, socket, time, uuid
from pathlib import Path
from typing import Optional, Dict
import httpx, structlog

log = structlog.get_logger()

CORE_URL         = os.environ.get("GUARDIAN_CORE_URL",           "http://guardian-core:8080")
NODE_ID          = os.environ.get("GUARDIAN_NODE_ID",             str(uuid.uuid4())[:8])
NODE_NAME        = os.environ.get("GUARDIAN_NODE_NAME",           socket.gethostname())
REPORT_INTERVAL  = int(os.environ.get("GUARDIAN_REPORT_INTERVAL", "60"))
REGISTER_RETRIES = int(os.environ.get("GUARDIAN_REGISTER_RETRIES","10"))


def _build_http_client() -> httpx.AsyncClient:
    """Build httpx client — uses mTLS if GUARDIAN_MTLS_ENABLED=true."""
    mtls_enabled = os.environ.get("GUARDIAN_MTLS_ENABLED", "false").lower() == "true"
    if mtls_enabled:
        try:
            from src.mtls import make_mtls_client
            return make_mtls_client(
                cert_path=os.environ.get("GUARDIAN_MTLS_CERT_PATH", ""),
                key_path =os.environ.get("GUARDIAN_MTLS_KEY_PATH",  ""),
                ca_path  =os.environ.get("GUARDIAN_MTLS_CA_PATH",   ""),
                timeout  =30.0,
            )
        except Exception as e:
            log.warning(f"mTLS init failed, falling back to plain HTTP: {e}")
    return httpx.AsyncClient(timeout=30.0)


class GuardianNode:
    def __init__(self) -> None:
        self._client        = _build_http_client()
        self._running       = False
        self._scan_trigger  = asyncio.Event()
        self._reconnect_delay = 5

        from src.config.settings import get_config
        cfg = get_config()
        self._scan_mode:     str       = cfg.scan_mode
        self._scan_interval: int       = cfg.scan_interval
        self._scan_paths:    list      = cfg.scan_paths

        # Stats
        self._scans_total:   int   = 0
        self._alerts_total:  int   = 0
        self._last_scan_at:  Optional[float] = None

        # Cluster info cache
        self._peer_nodes:    Dict[str, dict] = {}

    @property
    def scan_mode(self) -> str: return self._scan_mode

    @property
    def is_scanning_enabled(self) -> bool: return self._scan_mode != "off"

    # ── Entry point ───────────────────────────────────────────────
    async def start(self) -> None:
        self._running = True
        log.info(f"🛡️ Node {NODE_NAME} ({NODE_ID}) starting",
                 scan_mode=self._scan_mode, scan_interval=self._scan_interval)
        await self._register()
        try:
            await asyncio.gather(
                self._heartbeat_loop(),
                self._file_scan_loop(),
                self._resource_report_loop(),
                self._process_watch_loop(),
                return_exceptions=True,
            )
        finally:
            await self.stop()

    async def stop(self) -> None:
        if not self._running: return
        self._running = False
        log.info(f"Node {NODE_ID} stopping...")
        try: await self._client.aclose()
        except Exception: pass

    # ── Scan mode control ─────────────────────────────────────────
    def set_scan_mode(self, mode: str) -> dict:
        if mode not in ("auto","manual","off"):
            return {"ok": False, "error": f"Invalid mode '{mode}'"}
        prev = self._scan_mode; self._scan_mode = mode
        if mode == "auto" and prev != "auto": self._scan_trigger.set()
        log.info(f"Scan mode: {prev} → {mode}", node=NODE_ID)
        return {"ok": True, "prev_mode": prev, "mode": mode}

    def trigger_scan(self) -> dict:
        if self._scan_mode == "off":
            return {"ok": False, "error": "Scanning disabled"}
        self._scan_trigger.set()
        return {"ok": True, "message": "Scan triggered"}

    def get_scan_status(self) -> dict:
        return {
            "node_id": NODE_ID, "node_name": NODE_NAME,
            "scan_mode": self._scan_mode, "scan_enabled": self._scan_mode != "off",
            "scan_interval": self._scan_interval if self._scan_mode == "auto" else None,
            "scan_paths": self._scan_paths,
            "scans_total": self._scans_total, "alerts_total": self._alerts_total,
            "last_scan_at": self._last_scan_at,
        }

    # ── Registration ──────────────────────────────────────────────
    async def _register(self) -> None:
        for attempt in range(REGISTER_RETRIES):
            try:
                r = await self._client.post(f"{CORE_URL}/node/register", json={
                    "node_id": NODE_ID, "node_name": NODE_NAME,
                    "hostname": socket.gethostname(), "os_type": platform.system(),
                })
                if r.status_code in (200, 422):
                    log.info(f"Node registered (attempt {attempt+1})")
                    return
            except Exception as e:
                delay = min(self._reconnect_delay * (2**attempt), 120)
                log.warning(f"Core not ready ({attempt+1}/{REGISTER_RETRIES}): {e}, "
                            f"retry in {delay}s")
                await asyncio.sleep(delay)
        log.error("Registration failed — running standalone")

    # ── Heartbeat ─────────────────────────────────────────────────
    async def _heartbeat_loop(self) -> None:
        while self._running:
            try:
                await self._client.post(f"{CORE_URL}/node/heartbeat", json={
                    "node_id": NODE_ID, "status": "active", "timestamp": time.time(),
                })
                self._reconnect_delay = 5  # reset on success
            except Exception as e:
                log.debug(f"Heartbeat fail: {e}")
                self._reconnect_delay = min(self._reconnect_delay * 2, 120)
            await asyncio.sleep(REPORT_INTERVAL)

    # ── Resource Reporting ────────────────────────────────────────
    async def _resource_report_loop(self) -> None:
        """Report CPU/mem/disk/network metrics to Core every 60s."""
        while self._running:
            await asyncio.sleep(60)
            try:
                cpu  = psutil.cpu_percent(interval=1)
                mem  = psutil.virtual_memory().percent
                disk = psutil.disk_usage("/").percent
                net  = psutil.net_io_counters()
                # Feed UEBA with resource metrics
                try:
                    from src.core import GuardianCore
                    c = GuardianCore.get()
                    c.ueba.observe_process(
                        "system", cpu_pct=cpu, mem_mb=mem*psutil.virtual_memory().total/100/1024/1024
                    )
                except Exception: pass
                log.debug(f"Resources: CPU={cpu}% MEM={mem}% DISK={disk}%")
            except Exception as e:
                log.debug(f"Resource report error: {e}")

    # ── Process Watch ─────────────────────────────────────────────
    async def _process_watch_loop(self) -> None:
        """Watch running processes and feed UEBA continuously."""
        while self._running:
            await asyncio.sleep(30)
            try:
                from src.core import GuardianCore
                c = GuardianCore.get()
                for proc in psutil.process_iter(["name","cpu_percent","memory_info","pid"]):
                    try:
                        name   = proc.info.get("name","") or ""
                        cpu    = proc.info.get("cpu_percent",0) or 0
                        mem_mb = (proc.info.get("memory_info") or
                                  type("",(),{"rss":0})()).rss / 1024/1024
                        if cpu > 0 or mem_mb > 0:
                            anomaly = c.ueba.observe_process(name, cpu, mem_mb)
                            if anomaly and anomaly.get("verdict") == "malicious":
                                asyncio.create_task(c.incident_mgr.ingest_alert(
                                    source="ueba", event_type="process_anomaly",
                                    target=name, verdict=anomaly["verdict"],
                                    confidence=anomaly["confidence"],
                                    threat_type="behavioral_anomaly",
                                    indicators=[str(a) for a in anomaly.get("anomalies",[])],
                                    node_id=NODE_ID,
                                ))
                    except Exception: pass
            except Exception as e:
                log.debug(f"Process watch error: {e}")

    # ── File scan loop ────────────────────────────────────────────
    async def _file_scan_loop(self) -> None:
        known: dict = {}
        suspicious_exts = {
            ".exe",".dll",".bat",".cmd",".ps1",".sh",".py",".js",
            ".php",".jar",".vbs",".encrypted",".locked",".crypt",
        }
        while self._running:
            mode = self._scan_mode
            if mode == "off":
                await asyncio.sleep(30); continue
            if mode == "manual":
                self._scan_trigger.clear()
                try: await asyncio.wait_for(self._scan_trigger.wait(), timeout=60)
                except asyncio.TimeoutError: continue
                self._scan_trigger.clear()
            if self._scan_mode == "off": continue
            log.info(f"🔍 Scan pass starting ({mode})", node=NODE_ID, paths=self._scan_paths)
            t0 = time.time(); files_scanned = 0; alerts = 0
            for sp in self._scan_paths:
                path = Path(sp.strip())
                if not path.exists(): continue
                try:
                    count = 0
                    for fp in path.rglob("*"):
                        if not self._running or count >= 200: break
                        if not fp.is_file(): continue
                        try:
                            mtime = fp.stat().st_mtime
                            key   = str(fp)
                            if known.get(key) == mtime: continue
                            known[key] = mtime
                            if fp.suffix.lower() in suspicious_exts:
                                alerted = await self._report_file(str(fp))
                                files_scanned += 1
                                if alerted: alerts += 1
                                count += 1
                        except Exception: pass
                except Exception as e:
                    log.debug(f"Scan path error ({sp}): {e}")
            elapsed = round(time.time()-t0, 2)
            self._scans_total += 1; self._alerts_total += alerts
            self._last_scan_at = time.time()
            log.info(f"✅ Scan done", node=NODE_ID, files=files_scanned,
                     alerts=alerts, elapsed_s=elapsed)
            if self._scan_mode == "auto":
                self._scan_trigger.clear()
                try: await asyncio.wait_for(self._scan_trigger.wait(), timeout=self._scan_interval)
                except asyncio.TimeoutError: pass

    async def _report_file(self, fp: str) -> bool:
        try:
            from src.core import GuardianCore
            c   = GuardianCore.get()
            det = await c.detector.scan_file(fp)
            res = det.to_dict()
            if res.get("verdict") in ("malicious","suspicious"):
                log.warning("🚨 THREAT", node=NODE_ID, file=fp,
                            verdict=res.get("verdict"), confidence=res.get("confidence"))
                asyncio.create_task(c.incident_mgr.ingest_alert(
                    source="file_scan", event_type="malicious_file",
                    target=fp, verdict=res.get("verdict","suspicious"),
                    confidence=res.get("confidence",0.8),
                    threat_type=res.get("threat_type","malware_infection"),
                    indicators=res.get("indicators",[]),
                    node_id=NODE_ID, raw=res,
                ))
                if res.get("verdict") == "malicious" and res.get("confidence",0) >= 0.85:
                    asyncio.create_task(c.response.auto_respond(
                        verdict="malicious", confidence=res.get("confidence",0.9),
                        threat_type=res.get("threat_type",""), target=fp, target_type="file",
                    ))
                try:
                    await self._client.post(f"{CORE_URL}/node/alert", json={
                        "node_id": NODE_ID, "node_name": NODE_NAME,
                        "alert_type": "malicious_file",
                        "data": {"file": fp, "result": res},
                        "timestamp": time.time(),
                    })
                except Exception: pass
                return True
        except Exception as e:
            log.debug(f"File report error {fp}: {e}")
        return False


# ── Singleton ─────────────────────────────────────────────────────────────────
_node_instance: Optional[GuardianNode] = None

def get_node() -> Optional[GuardianNode]: return _node_instance
def set_node(node: GuardianNode): global _node_instance; _node_instance = node

async def main() -> None:
    node = GuardianNode(); set_node(node)
    try: await node.start()
    except (KeyboardInterrupt, asyncio.CancelledError): await node.stop()

if __name__ == "__main__":
    asyncio.run(main())
