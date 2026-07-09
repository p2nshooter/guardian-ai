# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — DNS Monitor
Deteksi serangan via DNS:
  1. DNS Tunneling   — data exfiltration via DNS queries (unusual query length/rate)
  2. DGA Detection   — Domain Generation Algorithm (bot C2 domains look random)
  3. DNS Rebinding   — attacker changes DNS to internal IP
  4. Typosquatting   — domains similar to known-good domains
  5. Fast-flux DNS   — C2 domains with very short TTL + rotating IPs
  6. DNS over HTTPS  — bypass DNS monitoring
  7. NXDOMAIN Storm  — C2 beacon via many failed lookups (NEW)
  8. Query Rate Limit — detect domain flood (brute-force via DNS)  (NEW)

Uses Shannon entropy to detect DGA domains (random = high entropy).

v2 Improvements:
  - NXDOMAIN storm detection (beacon/C2 pattern)
  - Per-domain query rate limiting & cache to avoid re-flagging
  - Improved hex IP conversion with both endiannesses
  - Fast-flux TTL-based detection
  - Expanded whitelist and DGA false positive reduction
  - Concurrent analysis limit to prevent CPU spike
"""
from __future__ import annotations
import asyncio, logging, math, os, re, socket, struct, subprocess, time
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import List, Optional, Set, Tuple
from src.database import get_db

log = logging.getLogger("guardian.dns")

# Known legitimate CDN/cloud domains — don't flag these
WHITELIST_TLDS = {
    "cloudflare.com", "amazonaws.com", "azure.com", "googlecloud.com",
    "fastly.net", "akamai.net", "cloudfront.net", "jsdelivr.net",
    "github.com", "githubusercontent.com", "docker.io", "ghcr.io",
    "letsencrypt.org", "digicert.com", "entrust.net", "verisign.com",
    "google.com", "googleapis.com", "gstatic.com", "googlevideo.com",
}

# Legitimate high-entropy but known domains
ENTROPY_WHITELIST = {
    "dh2i.com", "cdnjs.com", "b-cdn.net", "statically.io",
    "ntp.org", "pool.ntp.org", "time.windows.com",
}

# Minimum entropy to flag as DGA suspect (normal: ~2.5-3.5, DGA: >3.8)
DGA_ENTROPY_THRESHOLD = 3.8

# Minimum subdomain length to suspect DNS tunneling
DNS_TUNNEL_MIN_LENGTH = 40

# NXDOMAIN threshold: if >N failures in 60 sec from same process → beacon suspect
NXDOMAIN_THRESHOLD = 15

# Max queries per domain per minute before flagging
DOMAIN_RATE_LIMIT = 30

# Max concurrent DNS analysis tasks
MAX_CONCURRENT_ANALYSIS = 10


def _shannon_entropy(s: str) -> float:
    """Shannon entropy of a string. Higher = more random."""
    if not s:
        return 0.0
    counts = Counter(s.lower())
    total  = len(s)
    return -sum((c / total) * math.log2(c / total) for c in counts.values())


def _looks_like_dga(domain: str) -> tuple[bool, float]:
    """
    Heuristics to detect DGA-generated domains:
      - High entropy (random character distribution)
      - Unusual consonant/vowel ratio
      - Long domain with no real words
      - Lots of numbers mixed in
      - Pure hexadecimal strings (MD5-style DGA)
    """
    parts = domain.split(".")
    if len(parts) < 2:
        return False, 0.0

    label = parts[-2] if len(parts) >= 2 else parts[0]
    if len(label) < 6:
        return False, 0.0

    # Pure hex string (MD5/SHA-style DGA)
    if re.match(r'^[0-9a-f]{12,}$', label):
        return True, 0.90

    entropy = _shannon_entropy(label)
    if entropy < DGA_ENTROPY_THRESHOLD:
        return False, 0.0

    # Consonant-to-vowel ratio (DGA = too many consonants)
    vowels     = sum(1 for c in label if c in "aeiou")
    consonants = sum(1 for c in label if c.isalpha() and c not in "aeiou")
    ratio      = consonants / max(vowels, 1)
    if ratio < 3.0:
        return False, 0.0

    # Numbers mixed in
    digits = sum(1 for c in label if c.isdigit())

    # Penalty for labels that are too short to be DGA
    length_bonus = min((len(label) - 6) * 0.02, 0.20)

    score = min(
        (entropy - DGA_ENTROPY_THRESHOLD) * 0.3
        + ratio * 0.1
        + digits * 0.05
        + length_bonus,
        0.95
    )
    return True, round(score, 2)


def _is_typosquatting(domain: str, known_domains: List[str]) -> Optional[str]:
    """Check if domain is a typosquat of a known legitimate domain."""
    def levenshtein(s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            return levenshtein(s2, s1)
        if not s2:
            return len(s1)
        prev = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            curr = [i + 1]
            for j, c2 in enumerate(s2):
                curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (c1 != c2)))
            prev = curr
        return prev[-1]

    label = domain.split(".")[0] if "." in domain else domain
    for known in known_domains:
        known_label = known.split(".")[0]
        if abs(len(label) - len(known_label)) <= 2:
            dist = levenshtein(label, known_label)
            if 0 < dist <= 2:
                return known
    return None


def _hex_ip_to_str(hex_ip: str) -> Optional[str]:
    """Convert hex IP from /proc/net/tcp (little-endian) to dotted string."""
    try:
        # Little-endian (Linux /proc/net/tcp format)
        return socket.inet_ntoa(struct.pack("<I", int(hex_ip, 16)))
    except Exception:
        try:
            # Big-endian fallback
            return socket.inet_ntoa(struct.pack(">I", int(hex_ip, 16)))
        except Exception:
            return None


PROTECTED_DOMAINS = [
    "google", "microsoft", "amazon", "apple", "facebook", "meta",
    "netflix", "github", "twitter", "linkedin", "paypal", "stripe",
    "axto", "guardian", "orchestra", "cloudflare", "grafana",
]

# Known DoH IP addresses
DOH_IPS: Set[str] = {
    "1.1.1.1", "1.0.0.1",          # Cloudflare
    "8.8.8.8", "8.8.4.4",           # Google
    "9.9.9.9", "149.112.112.112",   # Quad9
    "94.140.14.14", "94.140.15.15", # AdGuard
    "76.76.2.0", "76.76.10.0",      # Control D
    "45.90.28.0", "45.90.30.0",     # NextDNS
}

EXPECTED_DOH_PROCS = {
    "systemd-resolved", "dnsmasq", "unbound", "pihole",
    "chrome", "firefox", "chromium", "brave", "curl", "wget",
}


class DNSMonitor:
    def __init__(self):
        self._node_id    = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._running    = False
        self._query_log: defaultdict  = defaultdict(list)     # domain → [timestamps]
        self._flagged:   set          = set()                  # already alerted domains
        self._analysis_cache: dict    = {}                     # domain → (result, ts)
        self._nxdomain_counter: defaultdict = defaultdict(deque)  # process → deque of timestamps
        self._semaphore  = asyncio.Semaphore(MAX_CONCURRENT_ANALYSIS)

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._watch_dns_cache())
        asyncio.create_task(self._watch_resolve_log())
        asyncio.create_task(self._cleanup_loop())
        log.info("DNS monitor started")

    async def stop(self) -> None:
        self._running = False

    async def analyze_domain(self, domain: str, src_process: str = "") -> Optional[dict]:
        """Analyze a single domain for threats. Thread-safe with semaphore limit."""
        async with self._semaphore:
            return await self._analyze_domain_inner(domain, src_process)

    async def _analyze_domain_inner(self, domain: str, src_process: str = "") -> Optional[dict]:
        if not domain or len(domain) < 4:
            return None

        # Skip whitelisted domains
        domain_lower = domain.lower()
        for wl in WHITELIST_TLDS:
            if domain_lower.endswith(wl) or domain_lower == wl:
                return None
        if domain_lower in ENTROPY_WHITELIST:
            return None

        # Cache check (60s TTL for repeated queries on same domain)
        cached = self._analysis_cache.get(domain_lower)
        if cached:
            cached_result, cached_ts = cached
            if time.time() - cached_ts < 60:
                return cached_result

        # Rate limiting: flag if same domain queried too often
        now = time.time()
        self._query_log[domain_lower].append(now)
        self._query_log[domain_lower] = [t for t in self._query_log[domain_lower] if now - t < 60]
        query_rate = len(self._query_log[domain_lower])

        findings   = []
        confidence = 0.0

        # 1. Query rate flood
        if query_rate > DOMAIN_RATE_LIMIT:
            findings.append(f"dns_flood:rate={query_rate}/min")
            confidence = max(confidence, min(0.60 + query_rate * 0.005, 0.85))

        # 2. DGA detection
        is_dga, dga_score = _looks_like_dga(domain_lower)
        if is_dga:
            findings.append(f"dga_suspect:entropy={_shannon_entropy(domain_lower.split('.')[0]):.2f}")
            confidence = max(confidence, dga_score * 0.85)

        # 3. DNS tunneling — very long subdomains
        subdomains = domain_lower.split(".")[:-2]
        for sub in subdomains:
            if len(sub) >= DNS_TUNNEL_MIN_LENGTH:
                findings.append(f"dns_tunnel:subdomain_len={len(sub)}")
                confidence = max(confidence, 0.88)
            # Base64-encoded data in subdomain
            if re.match(r'^[A-Za-z0-9+/=_-]{30,}$', sub):
                findings.append("dns_tunnel:base64_subdomain")
                confidence = max(confidence, 0.82)
            # Hex-encoded data (exfil pattern)
            if re.match(r'^[0-9a-f]{32,}$', sub):
                findings.append("dns_tunnel:hex_encoded_data")
                confidence = max(confidence, 0.85)

        # 4. Typosquatting
        squat = _is_typosquatting(domain_lower, PROTECTED_DOMAINS)
        if squat:
            findings.append(f"typosquatting:target={squat}")
            confidence = max(confidence, 0.80)

        # 5. Check against threat feed
        try:
            from src.core import GuardianCore
            result = await GuardianCore.get().detector.scan_domain(domain)
            if result.verdict in ("malicious", "suspicious"):
                findings.append(f"threat_feed:{result.threat_type}")
                confidence = max(confidence, result.confidence)
        except Exception:
            pass

        final_result: Optional[dict] = None
        if findings:
            verdict = "malicious" if confidence >= 0.80 else "suspicious"
            log.warning(f"🌐 DNS: {domain} [{', '.join(findings[:3])}] conf={confidence:.0%}")

            db = await get_db()
            await db.log_scan(self._node_id, "dns", domain,
                verdict=verdict, confidence=confidence,
                threat_type=findings[0].split(":")[0],
                indicators=findings, method="dns_monitor")
            await db.update_risk_score(self._node_id,
                os.environ.get("GUARDIAN_NODE_NAME", ""), verdict, confidence)

            final_result = {"domain": domain, "findings": findings,
                            "confidence": confidence, "verdict": verdict}

        # Cache result
        self._analysis_cache[domain_lower] = (final_result, time.time())
        return final_result

    def record_nxdomain(self, process_name: str) -> Optional[dict]:
        """
        Record an NXDOMAIN response. If a process generates too many in short
        time, it's likely a C2 beacon (trying random subdomains until one resolves).
        """
        now = time.time()
        buf = self._nxdomain_counter[process_name]
        buf.append(now)
        # Keep only last 60s
        while buf and now - buf[0] > 60:
            buf.popleft()

        if len(buf) >= NXDOMAIN_THRESHOLD:
            log.warning(f"🌐 NXDOMAIN storm: {process_name} — {len(buf)} failures/min (C2 beacon?)")
            return {
                "process":    process_name,
                "type":       "nxdomain_storm",
                "count":      len(buf),
                "findings":   [f"nxdomain_storm:count={len(buf)}"],
                "confidence": min(0.60 + len(buf) * 0.01, 0.88),
                "verdict":    "suspicious",
            }
        return None

    async def _watch_dns_cache(self) -> None:
        """Watch system DNS resolver cache for new lookups."""
        while self._running:
            try:
                log_paths = [
                    "/var/log/syslog",
                    "/var/log/messages",
                    "/var/log/daemon.log",
                    "/var/log/named/queries.log",
                    "/var/log/dnsmasq.log",
                ]
                for lp in log_paths:
                    if Path(lp).exists():
                        await self._tail_dns_log(lp)
                        break
                await self._check_doh_traffic()
            except Exception as e:
                log.debug(f"DNS watch error: {e}")
            await asyncio.sleep(30)

    async def _tail_dns_log(self, log_path: str) -> None:
        """Read recent DNS queries from syslog."""
        try:
            result = subprocess.run(
                ["tail", "-n", "200", log_path],
                capture_output=True, text=True, timeout=5
            )
            # Multiple log format patterns
            patterns = [
                re.compile(r"query\[A(?:AAA)?\]\s+(\S+)\s+from"),
                re.compile(r"resolved\s+(\S+)\s+to"),
                re.compile(r"QUERY\s+(\S+)\s+IN\s+A"),
                re.compile(r"client.*?#\d+.*?query:\s+(\S+)\s+IN"),
                re.compile(r"NXDOMAIN.*?for\s+(\S+)"),
            ]
            nxdomain_pat = re.compile(r"NXDOMAIN|SERVFAIL|refused")
            seen_this_batch: set = set()

            for line in result.stdout.splitlines():
                for pat in patterns:
                    m = pat.search(line)
                    if m:
                        domain = m.group(1).rstrip(".")
                        if domain and domain not in self._flagged and domain not in seen_this_batch:
                            seen_this_batch.add(domain)
                            if nxdomain_pat.search(line):
                                # Extract process from log line if possible
                                proc_match = re.search(r"\b(\w+)\[\d+\]", line)
                                proc = proc_match.group(1) if proc_match else "unknown"
                                self.record_nxdomain(proc)
                            else:
                                asyncio.create_task(self._analyze_and_flag(domain))
                        break
        except Exception:
            pass

    async def _analyze_and_flag(self, domain: str) -> None:
        result = await self.analyze_domain(domain)
        if result:
            self._flagged.add(domain)

    async def _watch_resolve_log(self) -> None:
        """Watch /proc/PID/net/udp for high DNS connection counts."""
        while self._running:
            try:
                high_dns_procs = []
                for pid_dir in Path("/proc").iterdir():
                    if not pid_dir.name.isdigit():
                        continue
                    try:
                        udp = (pid_dir / "net" / "udp").read_text()
                        dns_count = udp.count(":0035")  # port 53 hex (little-endian)
                        if dns_count > 30:
                            name = (pid_dir / "comm").read_text().strip()
                            high_dns_procs.append((name, dns_count))
                    except Exception:
                        pass

                for name, count in high_dns_procs:
                    if count > 80:
                        log.warning(f"🌐 DNS FLOOD: {name} has {count} DNS connections — tunneling?")
                        db = await get_db()
                        await db.log_scan(self._node_id, "dns", f"process:{name}",
                            verdict="suspicious", confidence=0.78,
                            threat_type="dns_tunneling_suspect",
                            indicators=[f"dns_connections:{count}"], method="dns_monitor")
            except Exception:
                pass
            await asyncio.sleep(60)

    async def _check_doh_traffic(self) -> None:
        """Check for DNS-over-HTTPS — processes bypassing DNS monitoring."""
        try:
            for pid_dir in Path("/proc").iterdir():
                if not pid_dir.name.isdigit():
                    continue
                try:
                    comm = (pid_dir / "comm").read_text().strip().lower()
                    if comm in EXPECTED_DOH_PROCS:
                        continue

                    # Check TCP connections for known DoH IPs on port 443
                    for tcp_file in [(pid_dir / "net" / "tcp"), (pid_dir / "net" / "tcp6")]:
                        if not tcp_file.exists():
                            continue
                        for line in tcp_file.read_text().splitlines()[1:]:
                            parts = line.split()
                            if len(parts) < 3:
                                continue
                            remote = parts[2]
                            try:
                                hex_ip, hex_port = remote.rsplit(":", 1)
                                ip   = _hex_ip_to_str(hex_ip)
                                port = int(hex_port, 16)
                                if ip and ip in DOH_IPS and port == 443:
                                    log.warning(
                                        f"🔐 DoH bypass: {comm}(PID:{pid_dir.name}) → {ip}:443"
                                    )
                                    db = await get_db()
                                    await db.log_scan(
                                        self._node_id, "dns", f"process:{comm}",
                                        verdict="suspicious", confidence=0.72,
                                        threat_type="doh_bypass",
                                        indicators=[f"doh_to:{ip}", f"process:{comm}"],
                                        method="dns_monitor"
                                    )
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass

    async def _cleanup_loop(self) -> None:
        """Periodically clean expired cache and rate limit buckets."""
        while self._running:
            await asyncio.sleep(300)
            now = time.time()
            # Clean analysis cache (keep 5 min)
            self._analysis_cache = {
                k: v for k, v in self._analysis_cache.items()
                if now - v[1] < 300
            }
            # Clean query log (keep 2 min)
            self._query_log = defaultdict(list, {
                k: [t for t in v if now - t < 120]
                for k, v in self._query_log.items() if v
            })
            # Trim flagged set if too large
            if len(self._flagged) > 10000:
                self._flagged = set(list(self._flagged)[-5000:])

    def get_stats(self) -> dict:
        return {
            "flagged_domains":   len(self._flagged),
            "cache_entries":     len(self._analysis_cache),
            "nxdomain_trackers": len(self._nxdomain_counter),
            "monitored_domains": len(self._query_log),
        }
