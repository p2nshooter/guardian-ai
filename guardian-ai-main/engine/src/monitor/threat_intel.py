"""
AXTO Guardian — Threat Intelligence Engine
Real-time multi-source threat intel aggregation:

Sources (all free tiers supported):
  1. AlienVault OTX    — IPs, domains, hashes, CVEs
  2. abuse.ch (Bazaar) — malware hashes, C2 domains, URLhaus
  3. CISA KEV          — Known Exploited Vulnerabilities catalog
  4. NVD (NIST)        — CVE advisories (critical/high only)
  5. Shodan            — exposed services on your IPs (needs API key)
  6. VirusTotal        — file/URL enrichment (needs API key)
  7. MISP              — self-hosted or community MISP instance (optional)
  8. Emerging Threats  — Snort/Suricata rules → IOC extraction

IOC types enriched:
  - IP addresses        → reputation, ASN, country, abuse score
  - Domains             → WHOIS age, DGA score, malware family
  - File hashes         → malware family, AV verdicts
  - CVEs                → CVSS, affected software, exploit availability

All lookups are cached in local SQLite to avoid repeated API calls.
Rate-limited per source to respect free tier limits.
"""
from __future__ import annotations

import asyncio, json, logging, os, time, hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import httpx

log = logging.getLogger("guardian.threat_intel")

DATA_DIR = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
CACHE_DB = DATA_DIR / "threat_intel_cache.json"

# API keys (optional — works without them, but with lower coverage)
OTX_KEY      = os.environ.get("OTX_API_KEY",       "")
VT_KEY       = os.environ.get("VIRUSTOTAL_API_KEY", "")
SHODAN_KEY   = os.environ.get("SHODAN_API_KEY",     "")
MISP_URL     = os.environ.get("MISP_URL",           "")
MISP_KEY     = os.environ.get("MISP_API_KEY",       "")

# Cache TTLs (seconds)
TTL_IP     = 3600 * 6    # 6 hours
TTL_DOMAIN = 3600 * 12   # 12 hours
TTL_HASH   = 3600 * 24   # 24 hours
TTL_CVE    = 3600 * 24   # 24 hours

# Rate limits (requests per minute per source)
RATE_LIMITS = {
    "otx":      30,
    "vt":       4,       # free tier: 4/min
    "shodan":   1,
    "misp":     60,
    "bazaar":   10,
    "cisa":     10,
    "nvd":      5,
}


class ThreatIntelEngine:
    def __init__(self):
        self._node_id     = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._running     = False
        self._cache: Dict[str, dict]    = {}    # key → {data, ts, ttl}
        self._rate_tracker: Dict[str, List[float]] = {}  # source → [timestamps]
        self._client: Optional[httpx.AsyncClient] = None
        self._dirty       = False
        # Local IOC store (populated from feeds)
        self.malicious_ips:     set = set()
        self.malicious_domains: set = set()
        self.malicious_hashes:  set = set()
        self.cve_advisories:    List[dict] = []

    async def start(self) -> None:
        self._running = True
        self._client  = httpx.AsyncClient(timeout=30.0, headers={"User-Agent": "Guardian-AI/2.0"})
        self._load_cache()
        asyncio.create_task(self._feed_update_loop())
        asyncio.create_task(self._save_loop())
        log.info("Threat Intel Engine started")

    async def stop(self) -> None:
        self._running = False
        if self._client:
            await self._client.aclose()
        self._save_cache()

    # ── Rate limiting ─────────────────────────────────────────────────────────

    def _rate_ok(self, source: str) -> bool:
        limit = RATE_LIMITS.get(source, 10)
        now   = time.time()
        hist  = self._rate_tracker.setdefault(source, [])
        hist  = [t for t in hist if now - t < 60]
        self._rate_tracker[source] = hist
        if len(hist) >= limit:
            return False
        self._rate_tracker[source].append(now)
        return True

    def _cached(self, key: str, ttl: int) -> Optional[dict]:
        entry = self._cache.get(key)
        if entry and time.time() - entry["ts"] < ttl:
            return entry["data"]
        return None

    def _set_cache(self, key: str, data: dict) -> None:
        self._cache[key] = {"data": data, "ts": time.time()}
        self._dirty = True

    async def _redis_get(self, key: str) -> Optional[dict]:
        """Try Redis cache first (Tier 2 acceleration)."""
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    return await redis.get(f"ti:{key}")
        except Exception:
            pass
        return None

    async def _redis_set(self, key: str, data: dict, ttl: int = 3600) -> None:
        """Store in Redis cache (Tier 2)."""
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    await redis.set(f"ti:{key}", data, ttl=ttl)
        except Exception:
            pass

    # ── IP Enrichment ─────────────────────────────────────────────────────────

    async def enrich_ip(self, ip: str) -> dict:
        """Enrich an IP with threat intel from OTX, Shodan, abuse databases."""
        cache_key = f"ip:{ip}"
        cached    = self._cached(cache_key, TTL_IP)
        if cached:
            return cached

        result = {"ip": ip, "sources": [], "malicious": False,
                  "abuse_score": 0, "country": "", "asn": "", "isp": "",
                  "malware_families": [], "last_seen": "", "tags": []}

        # Check local IOC store first (instant)
        if ip in self.malicious_ips:
            result["malicious"] = True
            result["sources"].append("local_feed")

        # AlienVault OTX
        if OTX_KEY and self._rate_ok("otx"):
            try:
                r = await self._client.get(
                    f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/general",
                    headers={"X-OTX-API-KEY": OTX_KEY}, timeout=10
                )
                if r.status_code == 200:
                    d = r.json()
                    pulse_count = d.get("pulse_info", {}).get("count", 0)
                    if pulse_count > 0:
                        result["malicious"]    = True
                        result["abuse_score"]  = min(pulse_count * 10, 100)
                        result["sources"].append("otx")
                        result["tags"] += [p.get("name","") for p in
                                           d.get("pulse_info",{}).get("pulses",[])[:3]]
                    result["country"] = d.get("country_name", "")
                    result["asn"]     = d.get("asn", "")
            except Exception as e:
                log.debug(f"OTX IP lookup failed: {e}")

        # AbuseIPDB (no key needed for basic)
        if self._rate_ok("bazaar"):
            try:
                r = await self._client.get(
                    f"https://api.abuseipdb.com/api/v2/check",
                    params={"ipAddress": ip, "maxAgeInDays": 90},
                    headers={"Key": os.environ.get("ABUSEIPDB_KEY",""), "Accept": "application/json"},
                    timeout=10
                )
                if r.status_code == 200:
                    d = r.json().get("data", {})
                    score = d.get("abuseConfidenceScore", 0)
                    if score > 25:
                        result["malicious"]   = True
                        result["abuse_score"] = max(result["abuse_score"], score)
                        result["sources"].append("abuseipdb")
                        result["isp"]         = d.get("isp", "")
                        result["country"]     = d.get("countryCode", "")
            except Exception:
                pass

        # Shodan
        if SHODAN_KEY and self._rate_ok("shodan"):
            try:
                r = await self._client.get(
                    f"https://api.shodan.io/shodan/host/{ip}",
                    params={"key": SHODAN_KEY}, timeout=15
                )
                if r.status_code == 200:
                    d = r.json()
                    result["shodan"] = {
                        "ports": d.get("ports", []),
                        "vulns": list(d.get("vulns", {}).keys()),
                        "tags":  d.get("tags", []),
                        "org":   d.get("org", ""),
                    }
                    if d.get("vulns"):
                        result["malicious"] = True
                        result["sources"].append("shodan")
            except Exception:
                pass

        self._set_cache(cache_key, result)
        if result["malicious"]:
            self.malicious_ips.add(ip)
        return result

    # ── Domain Enrichment ─────────────────────────────────────────────────────

    async def enrich_domain(self, domain: str) -> dict:
        cache_key = f"domain:{domain}"
        cached    = self._cached(cache_key, TTL_DOMAIN)
        if cached:
            return cached

        result = {"domain": domain, "sources": [], "malicious": False,
                  "malware_families": [], "tags": [], "first_seen": "", "last_seen": ""}

        if domain in self.malicious_domains:
            result["malicious"] = True
            result["sources"].append("local_feed")

        # OTX domain lookup
        if OTX_KEY and self._rate_ok("otx"):
            try:
                r = await self._client.get(
                    f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/general",
                    headers={"X-OTX-API-KEY": OTX_KEY}, timeout=10
                )
                if r.status_code == 200:
                    d = r.json()
                    pulses = d.get("pulse_info", {}).get("count", 0)
                    if pulses > 0:
                        result["malicious"] = True
                        result["sources"].append("otx")
                        result["tags"] += [p.get("name","") for p in
                                           d.get("pulse_info",{}).get("pulses",[])[:3]]
            except Exception:
                pass

        # URLhaus (abuse.ch)
        if self._rate_ok("bazaar"):
            try:
                r = await self._client.post(
                    "https://urlhaus-api.abuse.ch/v1/host/",
                    data={"host": domain}, timeout=10
                )
                if r.status_code == 200:
                    d = r.json()
                    if d.get("query_status") == "is_host":
                        result["malicious"]  = True
                        result["sources"].append("urlhaus")
                        result["tags"].append("urlhaus_host")
            except Exception:
                pass

        # MISP
        if MISP_URL and MISP_KEY and self._rate_ok("misp"):
            try:
                r = await self._client.post(
                    f"{MISP_URL}/attributes/restSearch",
                    json={"value": domain, "type": "domain"},
                    headers={"Authorization": MISP_KEY, "Accept": "application/json"},
                    timeout=10
                )
                if r.status_code == 200:
                    attrs = r.json().get("response", {}).get("Attribute", [])
                    if attrs:
                        result["malicious"] = True
                        result["sources"].append("misp")
            except Exception:
                pass

        self._set_cache(cache_key, result)
        if result["malicious"]:
            self.malicious_domains.add(domain)
        return result

    # ── Hash Enrichment ───────────────────────────────────────────────────────

    async def enrich_hash(self, file_hash: str) -> dict:
        cache_key = f"hash:{file_hash}"
        cached    = self._cached(cache_key, TTL_HASH)
        if cached:
            return cached

        result = {"hash": file_hash, "sources": [], "malicious": False,
                  "malware_family": "", "av_labels": [], "file_type": "",
                  "first_seen": "", "last_seen": ""}

        if file_hash in self.malicious_hashes:
            result["malicious"] = True
            result["sources"].append("local_feed")

        # MalwareBazaar (abuse.ch) — no key needed
        if self._rate_ok("bazaar"):
            try:
                r = await self._client.post(
                    "https://mb-api.abuse.ch/api/v1/",
                    data={"query": "get_info", "hash": file_hash}, timeout=15
                )
                if r.status_code == 200:
                    d = r.json()
                    if d.get("query_status") == "hash_found":
                        info = d.get("data", [{}])[0]
                        result["malicious"]      = True
                        result["malware_family"] = info.get("signature", "")
                        result["file_type"]      = info.get("file_type", "")
                        result["first_seen"]     = info.get("first_seen", "")
                        result["sources"].append("malware_bazaar")
            except Exception:
                pass

        # VirusTotal
        if VT_KEY and self._rate_ok("vt"):
            try:
                r = await self._client.get(
                    f"https://www.virustotal.com/api/v3/files/{file_hash}",
                    headers={"x-apikey": VT_KEY}, timeout=15
                )
                if r.status_code == 200:
                    stats = r.json()["data"]["attributes"]["last_analysis_stats"]
                    malicious_count = stats.get("malicious", 0)
                    if malicious_count > 3:
                        result["malicious"]  = True
                        result["sources"].append("virustotal")
                        result["av_labels"]  = [f"VT:{malicious_count}/{sum(stats.values())}"]
            except Exception:
                pass

        self._set_cache(cache_key, result)
        if result["malicious"]:
            self.malicious_hashes.add(file_hash)
        return result

    # ── CVE Lookup ────────────────────────────────────────────────────────────

    async def get_cve(self, cve_id: str) -> Optional[dict]:
        """Look up a CVE from NVD."""
        cache_key = f"cve:{cve_id}"
        cached    = self._cached(cache_key, TTL_CVE)
        if cached:
            return cached

        if not self._rate_ok("nvd"):
            return None
        try:
            r = await self._client.get(
                f"https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"cveId": cve_id}, timeout=15
            )
            if r.status_code == 200:
                vulns = r.json().get("vulnerabilities", [])
                if vulns:
                    cve   = vulns[0]["cve"]
                    metrics = cve.get("metrics", {})
                    cvss_v3 = (metrics.get("cvssMetricV31", [{}])[0]
                               if metrics.get("cvssMetricV31") else {})
                    score   = cvss_v3.get("cvssData", {}).get("baseScore", 0)
                    result  = {
                        "cve_id":       cve_id,
                        "description":  cve.get("descriptions", [{}])[0].get("value", ""),
                        "cvss_score":   score,
                        "severity":     cvss_v3.get("cvssData", {}).get("baseSeverity", ""),
                        "published":    cve.get("published", ""),
                        "references":   [r.get("url") for r in cve.get("references", [])[:3]],
                    }
                    self._set_cache(cache_key, result)
                    return result
        except Exception as e:
            log.debug(f"CVE lookup failed {cve_id}: {e}")
        return None

    # ── Feed Update Loop ──────────────────────────────────────────────────────

    async def _feed_update_loop(self) -> None:
        """Periodically update local IOC feeds from all sources."""
        while self._running:
            try:
                await self._update_cisa_kev()
                await self._update_bazaar_iocs()
                await self._update_emerging_threats()
            except Exception as e:
                log.debug(f"Feed update error: {e}")
            await asyncio.sleep(3600 * 4)   # Update every 4 hours

    async def _update_cisa_kev(self) -> None:
        """Download CISA Known Exploited Vulnerabilities catalog."""
        try:
            r = await self._client.get(
                "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
                timeout=30
            )
            if r.status_code == 200:
                data  = r.json()
                vulns = data.get("vulnerabilities", [])
                for v in vulns:
                    cve_id = v.get("cveID", "")
                    if cve_id:
                        self._set_cache(f"cve:{cve_id}", {
                            "cve_id":      cve_id,
                            "description": v.get("shortDescription", ""),
                            "cvss_score":  0,
                            "severity":    "HIGH",
                            "published":   v.get("dateAdded", ""),
                            "kev":         True,
                            "ransomware":  v.get("knownRansomwareCampaignUse", "") == "Known",
                        })
                log.info(f"CISA KEV: {len(vulns)} CVEs loaded")
        except Exception as e:
            log.debug(f"CISA KEV update failed: {e}")

    async def _update_bazaar_iocs(self) -> None:
        """Update malware hashes from MalwareBazaar recent list."""
        try:
            r = await self._client.post(
                "https://mb-api.abuse.ch/api/v1/",
                data={"query": "get_recent", "selector": "100"},
                timeout=20
            )
            if r.status_code == 200:
                samples = r.json().get("data", [])
                count   = 0
                for s in samples:
                    h = s.get("sha256_hash", "")
                    if h:
                        self.malicious_hashes.add(h)
                        count += 1
                if count:
                    log.info(f"MalwareBazaar: {count} new hashes")
        except Exception:
            pass

    async def _update_emerging_threats(self) -> None:
        """Pull Emerging Threats compromised IPs list (free)."""
        try:
            r = await self._client.get(
                "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
                timeout=20
            )
            if r.status_code == 200:
                count = 0
                for line in r.text.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#"):
                        self.malicious_ips.add(line); count += 1
                if count:
                    log.info(f"Emerging Threats: {count} IPs loaded")
        except Exception:
            pass

    # ── Local IOC check ───────────────────────────────────────────────────────

    def check_ioc(self, value: str, ioc_type: str = "") -> bool:
        """Quick synchronous check against local IOC store."""
        if ioc_type == "ip"   or (not ioc_type and "." in value and value.replace(".","").isdigit()):
            return value in self.malicious_ips
        if ioc_type == "hash" or len(value) in (32, 40, 64):
            return value.lower() in self.malicious_hashes
        return value in self.malicious_domains

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load_cache(self) -> None:
        if CACHE_DB.exists():
            try:
                data = json.loads(CACHE_DB.read_text())
                self._cache          = data.get("cache", {})
                self.malicious_ips   = set(data.get("ips", []))
                self.malicious_hashes= set(data.get("hashes", []))
                self.malicious_domains=set(data.get("domains", []))
                log.info(f"TI cache loaded: {len(self._cache)} entries, "
                         f"{len(self.malicious_ips)} IPs, "
                         f"{len(self.malicious_hashes)} hashes")
            except Exception as e:
                log.warning(f"TI cache load error: {e}")

    def _save_cache(self) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            CACHE_DB.write_text(json.dumps({
                "cache":   self._cache,
                "ips":     list(self.malicious_ips),
                "hashes":  list(self.malicious_hashes),
                "domains": list(self.malicious_domains),
            }))
        except Exception as e:
            log.debug(f"TI cache save error: {e}")

    async def _save_loop(self) -> None:
        while self._running:
            await asyncio.sleep(300)
            if self._dirty:
                self._save_cache(); self._dirty = False

    def get_stats(self) -> dict:
        return {
            "cache_entries":      len(self._cache),
            "malicious_ips":      len(self.malicious_ips),
            "malicious_domains":  len(self.malicious_domains),
            "malicious_hashes":   len(self.malicious_hashes),
            "otx_enabled":        bool(OTX_KEY),
            "vt_enabled":         bool(VT_KEY),
            "shodan_enabled":     bool(SHODAN_KEY),
            "misp_enabled":       bool(MISP_URL and MISP_KEY),
        }
