"""
AXTO Guardian — UEBA (User & Entity Behavior Analytics)
Belajar pola normal setiap user/process/IP, deteksi anomali.
Tidak butuh rule — murni statistical learning dari history.

Tracks:
  - Login hours (user biasanya login jam berapa?)
  - Command frequency per user
  - Network volume per process (biasanya kirim berapa MB?)
  - File access patterns (user biasanya buka folder mana?)
  - Process spawn frequency (bash spawn 50x/menit = abnormal)

Menggunakan Z-score untuk anomaly detection:
  z = (current - mean) / stddev
  z > 3.0 = anomaly (3 standard deviations from mean)

v2 Improvements:
  - Multivariate anomaly score (kombinasi semua metrics)
  - Peer group comparison (compare process to similar processes)
  - Adaptive Z-threshold (auto-adjust berdasarkan false positive rate)
  - File access behavior tracking
  - Short-term burst detection (spike dalam 60 detik)
  - Whitelist for known-safe high-resource processes
"""
from __future__ import annotations
import asyncio, json, logging, math, os, time
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from src.database import get_db

log = logging.getLogger("guardian.ueba")

DATA_DIR    = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
PROFILE_DB  = DATA_DIR / "ueba_profiles.json"
WINDOW_DAYS = 30   # Learn from last 30 days
Z_THRESHOLD = 3.0  # Alert if 3+ standard deviations from mean

# Processes that are allowed to spike — don't generate false alarms
RESOURCE_WHITELIST = {
    "kworker", "ksoftirqd", "migration", "rcu_sched", "systemd-journal",
    "dockerd", "containerd", "kubelet", "prometheus", "node_exporter",
    "rsyslogd", "journald", "auditd",
}

# Known legitimate high-CPU processes (won't alert on CPU only)
HIGH_CPU_ALLOWED = {"python3", "python", "java", "node", "ruby", "php"}


class Metric:
    """Rolling mean/stddev tracker using Welford's online algorithm."""
    def __init__(self):
        self.n     = 0
        self.mean  = 0.0
        self.M2    = 0.0   # sum of squared differences from mean
        self._recent: deque = deque(maxlen=60)  # last 60 observations for burst detection

    def update(self, x: float) -> None:
        self.n += 1
        delta  = x - self.mean
        self.mean += delta / self.n
        delta2 = x - self.mean
        self.M2 += delta * delta2
        self._recent.append((time.time(), x))

    @property
    def stddev(self) -> float:
        return math.sqrt(self.M2 / self.n) if self.n >= 2 else 1.0

    def zscore(self, x: float) -> float:
        if self.n < 5:  # Not enough data to judge
            return 0.0
        std = self.stddev
        if std < 1e-10:
            return 0.0
        return abs(x - self.mean) / std

    def burst_score(self, window_sec: float = 60.0) -> float:
        """Detect recent burst: how many observations in last window_sec vs baseline."""
        if self.n < 10:
            return 0.0
        now = time.time()
        recent_values = [v for ts, v in self._recent if now - ts <= window_sec]
        if len(recent_values) < 3:
            return 0.0
        recent_mean = sum(recent_values) / len(recent_values)
        return self.zscore(recent_mean)

    def to_dict(self) -> dict:
        return {"n": self.n, "mean": self.mean, "M2": self.M2}

    @classmethod
    def from_dict(cls, d: dict) -> "Metric":
        m = cls()
        m.n, m.mean, m.M2 = d.get("n", 0), d.get("mean", 0.0), d.get("M2", 0.0)
        return m


class EntityProfile:
    """Behavioral profile for a user, process, or IP."""
    def __init__(self, entity_id: str, entity_type: str):
        self.entity_id   = entity_id
        self.entity_type = entity_type
        self.metrics: Dict[str, Metric] = {}
        self.hour_dist   = [0] * 24  # activity per hour of day
        self.last_seen   = 0.0
        self.created_at  = time.time()
        self.false_positive_count = 0  # track how many times we alerted but were wrong
        self._adaptive_z = Z_THRESHOLD  # self-adjusting threshold

        # File access tracking: folder → access count
        self.folder_access: Dict[str, int] = {}
        # Short-term event buffer for burst detection
        self._event_buffer: deque = deque(maxlen=100)

    def metric(self, name: str) -> Metric:
        if name not in self.metrics:
            self.metrics[name] = Metric()
        return self.metrics[name]

    def record_activity(self, hour: int) -> None:
        self.hour_dist[hour % 24] += 1
        self.last_seen = time.time()
        self._event_buffer.append(time.time())

    def record_file_access(self, path: str) -> None:
        """Track which folders this entity accesses."""
        folder = str(Path(path).parent)
        self.folder_access[folder] = self.folder_access.get(folder, 0) + 1

    def hour_anomaly(self, hour: int) -> float:
        """Return anomaly score for given hour (0=normal, 1=never seen)."""
        total = sum(self.hour_dist)
        if total < 20:
            return 0.0
        seen = self.hour_dist[hour % 24]
        rate = seen / total
        return 1.0 - min(rate * 24, 1.0)  # normalize: if rate=1/24, anomaly=0

    def activity_burst_score(self, window_sec: float = 60.0) -> float:
        """Detect if event frequency spiked recently."""
        if len(self._event_buffer) < 5:
            return 0.0
        now = time.time()
        recent = sum(1 for ts in self._event_buffer if now - ts <= window_sec)
        # Compare to typical rate
        total_time = now - self.created_at
        if total_time < 120:
            return 0.0
        typical_per_min = (len(self._event_buffer) / total_time) * 60
        if typical_per_min < 1:
            return 0.0
        ratio = recent / max(typical_per_min, 1)
        return max(0.0, (ratio - 3.0) / 3.0)  # normalize: ratio=6x → score=1.0

    def adaptive_threshold(self) -> float:
        """Auto-raise threshold if too many false positives reported."""
        fp_penalty = min(self.false_positive_count * 0.2, 2.0)
        return Z_THRESHOLD + fp_penalty

    def multivariate_score(self, observations: Dict[str, float]) -> float:
        """
        Combine multiple metric z-scores into a single anomaly score.
        Uses Mahalanobis-like distance: sqrt(sum of z^2 / n_metrics)
        More accurate than using max z-score alone.
        """
        zscores = []
        for metric_name, value in observations.items():
            if value > 0 and metric_name in self.metrics:
                z = self.metrics[metric_name].zscore(value)
                if z > 0:
                    zscores.append(z)
        if not zscores:
            return 0.0
        # Root mean square of z-scores
        rms = math.sqrt(sum(z**2 for z in zscores) / len(zscores))
        return rms

    def to_dict(self) -> dict:
        return {
            "entity_id":            self.entity_id,
            "entity_type":          self.entity_type,
            "metrics":              {k: v.to_dict() for k, v in self.metrics.items()},
            "hour_dist":            self.hour_dist,
            "last_seen":            self.last_seen,
            "created_at":           self.created_at,
            "false_positive_count": self.false_positive_count,
            "folder_access":        self.folder_access,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EntityProfile":
        p = cls(d["entity_id"], d["entity_type"])
        p.metrics              = {k: Metric.from_dict(v) for k, v in d.get("metrics", {}).items()}
        p.hour_dist            = d.get("hour_dist", [0] * 24)
        p.last_seen            = d.get("last_seen", 0.0)
        p.created_at           = d.get("created_at", time.time())
        p.false_positive_count = d.get("false_positive_count", 0)
        p.folder_access        = d.get("folder_access", {})
        return p


class PeerGroupAnalyzer:
    """
    Compare entity metrics against peers of the same type.
    e.g. if ALL python processes are using high CPU, it's not an anomaly for one.
    """
    def __init__(self):
        self._group_metrics: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))

    def record(self, entity_type: str, metric_name: str, value: float) -> None:
        bucket = self._group_metrics[entity_type][metric_name]
        bucket.append(value)
        if len(bucket) > 500:  # keep memory bounded
            bucket.pop(0)

    def is_outlier_in_peer_group(self, entity_type: str, metric_name: str, value: float) -> bool:
        """Return True if value is outlier among peers of same type."""
        peers = self._group_metrics[entity_type].get(metric_name, [])
        if len(peers) < 10:
            return False
        mean = sum(peers) / len(peers)
        stddev = math.sqrt(sum((x - mean) ** 2 for x in peers) / len(peers))
        if stddev < 1e-10:
            return False
        z = abs(value - mean) / stddev
        return z > 3.5  # stricter threshold for peer comparison


class UEBAEngine:
    def __init__(self):
        self._profiles: Dict[str, EntityProfile] = {}
        self._node_id  = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._running  = False
        self._dirty    = False
        self._peer     = PeerGroupAnalyzer()
        # Track last CPU ticks per PID for delta calculation (avoid /proc accumulation artifact)
        self._last_cpu_ticks: Dict[str, Tuple[float, float]] = {}  # pid → (ticks, timestamp)

    async def start(self) -> None:
        self._running = True
        self._load_profiles()
        asyncio.create_task(self._learn_loop())
        asyncio.create_task(self._save_loop())
        asyncio.create_task(self._analyze_loop())
        log.info(f"UEBA started: {len(self._profiles)} entity profiles loaded")

    async def stop(self) -> None:
        self._running = False
        self._save_profiles()

    # ── Profile management ────────────────────────────────────────────────────

    def get_profile(self, entity_id: str, entity_type: str = "process") -> EntityProfile:
        if entity_id not in self._profiles:
            self._profiles[entity_id] = EntityProfile(entity_id, entity_type)
        return self._profiles[entity_id]

    def mark_false_positive(self, entity_id: str) -> None:
        """Called when an alert was confirmed to be a false positive — raises threshold."""
        if entity_id in self._profiles:
            self._profiles[entity_id].false_positive_count += 1
            log.info(f"UEBA: {entity_id} false positive #{self._profiles[entity_id].false_positive_count} — raising threshold")

    # ── Observe behaviors ─────────────────────────────────────────────────────

    def observe_process(self, proc_name: str, cpu_pct: float = 0, mem_mb: float = 0,
                        net_bytes: float = 0, file_ops: int = 0) -> Optional[dict]:
        """
        Record process behavior. Returns anomaly dict if anomalous, else None.
        Call this regularly from process monitor.
        """
        # Skip known whitelisted processes
        if proc_name.lower() in RESOURCE_WHITELIST:
            return None

        p    = self.get_profile(proc_name, "process")
        hour = time.localtime().tm_hour
        p.record_activity(hour)

        # Update metrics
        if cpu_pct > 0:   p.metric("cpu_pct").update(cpu_pct)
        if mem_mb > 0:    p.metric("mem_mb").update(mem_mb)
        if net_bytes > 0: p.metric("net_bytes_pm").update(net_bytes)
        if file_ops > 0:  p.metric("file_ops_pm").update(file_ops)
        self._dirty = True

        # Feed peer group
        if cpu_pct > 0:   self._peer.record("process", "cpu_pct", cpu_pct)
        if mem_mb > 0:    self._peer.record("process", "mem_mb", mem_mb)

        # Use adaptive threshold
        threshold = p.adaptive_threshold()

        # Multivariate score
        mv_score = p.multivariate_score({
            "cpu_pct": cpu_pct, "mem_mb": mem_mb,
            "net_bytes_pm": net_bytes, "file_ops_pm": file_ops,
        })

        anomalies = []
        checks = [
            ("cpu_pct",      cpu_pct,   "CPU spike"),
            ("mem_mb",       mem_mb,    "Memory spike"),
            ("net_bytes_pm", net_bytes, "Network volume spike"),
            ("file_ops_pm",  file_ops,  "File operation spike"),
        ]
        for metric_name, value, label in checks:
            if value <= 0 or metric_name not in p.metrics:
                continue
            z = p.metric(metric_name).zscore(value)
            if z >= threshold:
                # Cross-validate: also anomalous among peers?
                peer_outlier = self._peer.is_outlier_in_peer_group("process", metric_name, value)
                anomalies.append({
                    "metric":      label,
                    "z":           round(z, 2),
                    "value":       value,
                    "mean":        round(p.metric(metric_name).mean, 2),
                    "peer_outlier": peer_outlier,
                })

        # Burst detection
        burst = p.activity_burst_score()
        if burst > 0.7:
            anomalies.append({"metric": "activity_burst", "z": round(burst * 4, 2),
                               "value": burst, "mean": "normal_rate"})

        # Unusual hour
        hour_score = p.hour_anomaly(hour)
        if hour_score > 0.85 and p.metrics.get("cpu_pct") and p.metrics["cpu_pct"].n > 20:
            anomalies.append({"metric": "unusual_hour", "z": hour_score * 4,
                               "value": hour, "mean": "business hours"})

        # CPU-only spike for high-CPU-allowed processes: require additional metric
        if proc_name.lower() in HIGH_CPU_ALLOWED:
            anomalies = [a for a in anomalies if a["metric"] != "CPU spike"]

        if anomalies:
            max_z = max(a["z"] for a in anomalies)
            # Boost confidence if multivariate score also high
            mv_boost = min(mv_score * 0.02, 0.10)
            confidence = min(0.50 + (max_z - threshold) * 0.05 + mv_boost, 0.92)
            return {
                "entity":          proc_name,
                "type":            "process",
                "anomalies":       anomalies,
                "confidence":      confidence,
                "multivariate_z":  round(mv_score, 2),
                "verdict":         "malicious" if max_z > 6.0 else "suspicious",
            }
        return None

    def observe_login(self, username: str, source_ip: str = "", success: bool = True) -> Optional[dict]:
        """Observe a login event and check for anomalies."""
        p    = self.get_profile(username, "user")
        hour = time.localtime().tm_hour
        p.record_activity(hour)

        if not success:
            p.metric("failed_logins").update(1)
        p.metric("logins_per_day").update(1)
        self._dirty = True

        threshold = p.adaptive_threshold()
        anomalies = []

        hour_score = p.hour_anomaly(hour)
        if hour_score > 0.90 and p.hour_dist.count(0) < 12:
            anomalies.append({"metric": "unusual_login_hour", "z": hour_score * 5,
                               "value": hour, "mean": "normal hours"})

        failed = p.metric("failed_logins")
        if failed.n > 0 and failed.zscore(1) > 2.0:
            anomalies.append({"metric": "failed_login_spike", "z": failed.zscore(1),
                               "value": failed.n, "mean": round(failed.mean, 1)})

        # Detect rapid repeated logins (brute force indicator)
        burst = p.activity_burst_score(window_sec=120)
        if burst > 0.5:
            anomalies.append({"metric": "login_burst", "z": round(burst * 4, 2),
                               "value": "rapid_logins", "mean": "normal_rate"})

        if anomalies:
            confidence = min(0.55 + max(a["z"] for a in anomalies) * 0.04, 0.90)
            return {
                "entity":    username,
                "type":      "user",
                "source_ip": source_ip,
                "anomalies": anomalies,
                "confidence": confidence,
                "verdict":   "suspicious",
            }
        return None

    def observe_network(self, src_ip: str, bytes_out: float, connections: int = 1) -> Optional[dict]:
        """Observe IP network behavior."""
        p = self.get_profile(src_ip, "ip")
        p.record_activity(time.localtime().tm_hour)
        if bytes_out > 0:   p.metric("bytes_out").update(bytes_out)
        if connections > 0: p.metric("connections").update(connections)
        self._dirty = True

        threshold = p.adaptive_threshold()
        anomalies = []
        for metric_name, value, label in [
            ("bytes_out",   bytes_out,   "Unusual outbound volume"),
            ("connections", connections, "Connection spike"),
        ]:
            if value <= 0 or metric_name not in p.metrics:
                continue
            z = p.metric(metric_name).zscore(value)
            if z >= threshold:
                anomalies.append({"metric": label, "z": round(z, 2), "value": value,
                                   "mean": round(p.metric(metric_name).mean, 2)})

        # Data exfiltration: high volume + unusual hour
        if bytes_out > 50_000_000 and p.hour_anomaly(time.localtime().tm_hour) > 0.8:
            anomalies.append({"metric": "exfil_suspect", "z": 5.0,
                               "value": bytes_out, "mean": "normal_volume"})

        if anomalies:
            confidence = min(0.50 + max(a["z"] for a in anomalies) * 0.04, 0.88)
            return {"entity": src_ip, "type": "ip", "anomalies": anomalies,
                    "confidence": confidence, "verdict": "suspicious"}
        return None

    def observe_file_access(self, entity_id: str, path: str,
                             entity_type: str = "process") -> Optional[dict]:
        """
        Track file access patterns. Alert if process/user accessing unusual paths.
        e.g. nginx suddenly reading /etc/shadow = very suspicious.
        """
        p = self.get_profile(entity_id, entity_type)
        p.record_file_access(path)
        self._dirty = True

        folder = str(Path(path).parent)
        total_access = sum(p.folder_access.values())
        if total_access < 20:
            return None

        # Check if this folder is unusual for this entity
        folder_count = p.folder_access.get(folder, 0)
        folder_rate  = folder_count / total_access

        # Sensitive paths that should trigger alert regardless of history
        SENSITIVE_PATHS = {
            "/etc/shadow", "/etc/passwd", "/root/.ssh",
            "/etc/sudoers", "/.ssh", "/proc/",
        }
        is_sensitive = any(path.startswith(s) for s in SENSITIVE_PATHS)

        if is_sensitive and folder_rate < 0.05:
            return {
                "entity":     entity_id,
                "type":       entity_type,
                "anomalies":  [{"metric": "sensitive_path_access",
                                "z": 6.0, "value": path, "mean": "normal_paths"}],
                "confidence": 0.88,
                "verdict":    "suspicious",
            }
        return None

    # ── Loops ─────────────────────────────────────────────────────────────────

    async def _learn_loop(self) -> None:
        """Feed historical data from DB into profiles."""
        while self._running:
            try:
                db     = await get_db()
                events = await db.get_scan_history(limit=200)
                for e in events:
                    if e.get("scan_type") == "process":
                        self.get_profile(e["target"], "process")
                    elif e.get("scan_type") == "ip":
                        self.get_profile(e["target"], "ip")
            except Exception:
                pass
            await asyncio.sleep(3600)  # Re-learn every hour

    async def _analyze_loop(self) -> None:
        """Periodically check /proc stats for anomalies."""
        while self._running:
            try:
                import psutil
                for proc in psutil.process_iter(["name", "cpu_percent", "memory_info", "pid", "open_files"]):
                    try:
                        name   = proc.info.get("name", "") or ""
                        cpu    = proc.info.get("cpu_percent", 0) or 0
                        mem_mb = (proc.info.get("memory_info") or type("", (), {"rss": 0})()).rss / 1024 / 1024
                        # Count open file descriptors as file_ops proxy
                        try:
                            file_ops = len(proc.open_files()) if hasattr(proc, 'open_files') else 0
                        except Exception:
                            file_ops = 0
                        result = self.observe_process(name, cpu, mem_mb, file_ops=file_ops)
                        if result:
                            log.warning(f"⚠️ UEBA anomaly: {name} — {result['anomalies']}")
                            db = await get_db()
                            await db.log_scan(
                                self._node_id, "ueba", name,
                                verdict=result["verdict"], confidence=result["confidence"],
                                threat_type="behavioral_anomaly",
                                indicators=[str(a) for a in result["anomalies"]],
                                method="ueba"
                            )
                            await db.update_risk_score(self._node_id,
                                os.environ.get("GUARDIAN_NODE_NAME", ""),
                                result["verdict"], result["confidence"])
                    except Exception:
                        pass
            except ImportError:
                await self._analyze_proc_direct()
            except Exception as e:
                log.debug(f"UEBA analyze error: {e}")
            await asyncio.sleep(60)

    async def _analyze_proc_direct(self) -> None:
        """Fallback: read /proc directly without psutil, with proper CPU delta."""
        now = time.time()
        for pid_dir in Path("/proc").iterdir():
            if not pid_dir.name.isdigit():
                continue
            try:
                stat   = (pid_dir / "stat").read_text().split()
                name   = stat[1].strip("()")
                pid    = pid_dir.name
                utime  = int(stat[13])
                stime  = int(stat[14])
                ticks  = utime + stime

                # CPU delta from last observation
                last = self._last_cpu_ticks.get(pid)
                if last:
                    last_ticks, last_ts = last
                    delta_ticks = ticks - last_ticks
                    delta_sec   = max(now - last_ts, 0.1)
                    hertz       = os.sysconf(os.sysconf_names.get("SC_CLK_TCK", 100)) if hasattr(os, "sysconf") else 100
                    cpu_pct     = (delta_ticks / hertz) / delta_sec * 100
                else:
                    cpu_pct = 0

                self._last_cpu_ticks[pid] = (ticks, now)

                # Memory from /proc/PID/status
                mem_mb = 0.0
                try:
                    for line in (pid_dir / "status").read_text().splitlines():
                        if line.startswith("VmRSS:"):
                            mem_mb = int(line.split()[1]) / 1024
                            break
                except Exception:
                    pass

                if cpu_pct > 0 or mem_mb > 0:
                    self.observe_process(name, cpu_pct=cpu_pct, mem_mb=mem_mb)
            except Exception:
                pass

    async def _save_loop(self) -> None:
        while self._running:
            await asyncio.sleep(300)
            if self._dirty:
                self._save_profiles()
                self._dirty = False

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load_profiles(self) -> None:
        if PROFILE_DB.exists():
            try:
                data = json.loads(PROFILE_DB.read_text())
                self._profiles = {k: EntityProfile.from_dict(v) for k, v in data.items()}
            except Exception:
                self._profiles = {}

    def _save_profiles(self) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            PROFILE_DB.write_text(json.dumps(
                {k: v.to_dict() for k, v in self._profiles.items()}, indent=2
            ))
        except Exception as e:
            log.debug(f"UEBA save error: {e}")

    def get_stats(self) -> dict:
        return {
            "profiles":  len(self._profiles),
            "users":     sum(1 for p in self._profiles.values() if p.entity_type == "user"),
            "processes": sum(1 for p in self._profiles.values() if p.entity_type == "process"),
            "ips":       sum(1 for p in self._profiles.values() if p.entity_type == "ip"),
        }

    def get_anomaly_summary(self) -> List[dict]:
        """Return top 10 most anomalous entities by cumulative z-score."""
        scores = []
        for eid, p in self._profiles.items():
            total_z = sum(m.zscore(m.mean + m.stddev * 2) for m in p.metrics.values() if m.n > 5)
            if total_z > 0:
                scores.append({"entity": eid, "type": p.entity_type,
                                "total_anomaly_score": round(total_z, 2),
                                "observations": sum(m.n for m in p.metrics.values())})
        scores.sort(key=lambda x: x["total_anomaly_score"], reverse=True)
        return scores[:10]
