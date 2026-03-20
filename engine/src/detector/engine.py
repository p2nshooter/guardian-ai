"""
Guardian AI — Detection Engine
Multi-layer threat detection:
  Layer 1 : Hash lookup        (known malware DB — instant O(1))
  Layer 2 : Magic bytes        (file type vs extension mismatch)
  Layer 3 : Entropy analysis   (packed/encrypted/obfuscated binaries)
  Layer 4 : Binary signatures  (PE/ELF headers, shellcode patterns)
  Layer 5 : Static YARA-like   (100+ patterns: webshells, exploits, C2, etc.)
  Layer 6 : AI deep scan       (LLM analysis for unknown/obfuscated threats)
  Layer 7 : Behavioral         (process actions: CPU, mem, network, files)
"""
from __future__ import annotations
import asyncio, hashlib, math, re, struct
from collections import Counter
from pathlib import Path
from typing import Optional, List
from src.pool.manager import AIPoolManager

# ── Layer 5: YARA-like static patterns ───────────────────────────────────────
# Format: (compiled_regex, threat_type, severity_weight)
SUSPICIOUS_PATTERNS: list = [
    # ── Webshells ───────────────────────────────────────────────────────────
    (re.compile(r"(?i)(eval\s*\(\s*base64_decode|exec\s*\(\s*base64_decode)", re.M),      "php_webshell",     0.9),
    (re.compile(r"(?i)(\$_(POST|GET|REQUEST|COOKIE)\s*\[.{0,30}\]\s*\))",     re.M),      "php_webshell",     0.7),
    (re.compile(r"(?i)(passthru|shell_exec|system\s*\(|popen\s*\()",          re.M),      "php_rce",          0.7),
    (re.compile(r"(?i)(assert\s*\(\s*\$_(POST|GET|REQUEST))",                 re.M),      "php_webshell",     0.9),
    (re.compile(r"(?i)(preg_replace\s*\(.{0,10}\/e[\"']?\s*,)",               re.M),      "php_code_exec",    0.8),
    (re.compile(r"(?i)(FilesMan|b374k|c99|r57|WSO\s+Shell|alfa\s+shell)",     re.M),      "php_webshell",     1.0),

    # ── Exploit tools / RAT ─────────────────────────────────────────────────
    (re.compile(r"(?i)(meterpreter|shellcode|reverse[_\s]shell|bind[_\s]shell)", re.M),   "exploit_tool",     0.95),
    (re.compile(r"(?i)(metasploit|cobalt.strike|empire.agent|sliver.implant)", re.M),     "exploit_framework", 0.95),
    (re.compile(r"(?i)(VirtualAlloc|WriteProcessMemory|CreateRemoteThread)",   re.M),     "process_injection", 0.85),
    (re.compile(r"(?i)(NtQueueApcThread|RtlCreateUserThread|ZwCreateThread)",  re.M),     "process_injection", 0.85),
    (re.compile(r"(?i)(CreateToolhelp32Snapshot|Process32First|Process32Next)", re.M),    "process_enum",      0.6),

    # ── Ransomware ──────────────────────────────────────────────────────────
    (re.compile(r"(?i)(ransom|decrypt.{0,20}bitcoin|pay.{0,20}btc|your.files.are.encrypted)", re.M), "ransomware", 0.9),
    (re.compile(r"(?i)(CryptEncrypt|CryptGenRandom|BCryptEncrypt)",            re.M),     "ransomware",       0.8),
    (re.compile(r"(?i)(\.locky|\.wncry|\.ryuk|\.sodinokibi|\.revil|\.conti)", re.M),     "ransomware",       1.0),
    (re.compile(r"(?i)(shadow.copies|vssadmin.delete|bcdedit.{0,30}recoveryenabled)", re.M), "ransomware",    0.85),

    # ── Keylogger / spyware ─────────────────────────────────────────────────
    (re.compile(r"(?i)(keylog|hookwin|SetWindowsHookEx|GetAsyncKeyState)",     re.M),     "keylogger",        0.85),
    (re.compile(r"(?i)(clipboard.steal|GetClipboardData.{0,50}send)",          re.M),     "clipboard_steal",  0.8),
    (re.compile(r"(?i)(screen.capture|BitBlt.{0,100}socket|screenshot.{0,30}upload)", re.M), "spyware",       0.8),

    # ── Backdoor / C2 ───────────────────────────────────────────────────────
    (re.compile(r"(?i)import\s+(socket|subprocess).{0,200}exec\s*\(",          re.M | re.S), "backdoor",      0.85),
    (re.compile(r"(?i)(nc\s+-e|/bin/sh.{0,20}socket|bash.{0,20}-i\s+>&)",     re.M),     "reverse_shell",    0.9),
    (re.compile(r"(?i)(wget.{0,60}chmod.{0,30}\+x|curl.{0,60}bash)",          re.M),     "dropper",          0.85),
    (re.compile(r"(?i)(base64.{0,20}decode.{0,50}exec|eval.{0,20}base64)",    re.M),     "obfuscated_exec",  0.8),
    (re.compile(r"(?i)(crontab\s+-e.{0,100}@reboot|rc\.local.{0,100}wget)",   re.M),     "persistence",      0.8),

    # ── Rootkit / privilege escalation ──────────────────────────────────────
    (re.compile(r"(?i)(sudo\s+chmod\s+4755|chmod\s+u\+s.{0,30}bash)",         re.M),     "suid_abuse",       0.85),
    (re.compile(r"(?i)(LD_PRELOAD.{0,30}malicious|/etc/ld\.so\.preload)",     re.M),     "ld_preload_hijack", 0.9),
    (re.compile(r"(?i)(insmod.{0,30}\.ko|modprobe.{0,30}hide)",               re.M),     "kernel_module",    0.9),
    (re.compile(r"(?i)(/proc/sys/kernel/modules_disabled\s*=\s*0)",            re.M),     "kernel_hardening_bypass", 0.8),

    # ── Crypto mining ───────────────────────────────────────────────────────
    (re.compile(r"(?i)(xmrig|monero.{0,20}miner|nicehash|stratum\+tcp://)",   re.M),     "cryptominer",      0.9),
    (re.compile(r"(?i)(mining.pool|getwork.{0,30}submit|hashrate)",            re.M),     "cryptominer",      0.7),

    # ── Data exfiltration ───────────────────────────────────────────────────
    (re.compile(r"(?i)(/etc/passwd.{0,50}(curl|wget|nc|python))",              re.M),     "data_exfil",       0.85),
    (re.compile(r"(?i)(ssh.{0,20}authorized_keys.{0,50}(echo|>))",            re.M),     "ssh_backdoor",     0.9),
    (re.compile(r"(?i)(find.{0,30}\.(pem|key|p12).{0,30}(tar|zip|send))",    re.M),     "credential_theft", 0.85),

    # ── Network scanning / recon ─────────────────────────────────────────────
    (re.compile(r"(?i)(nmap\s+-s[SC]|masscan\s+--rate|zmap\s+--bandwidth)",   re.M),     "network_scan",     0.6),
    (re.compile(r"(?i)(hydra\s+-l|medusa\s+-u|hashcat\s+--attack)",           re.M),     "brute_force",      0.8),

    # ── Python/bash obfuscation patterns ────────────────────────────────────
    (re.compile(r"(?i)(exec\s*\(\s*compile\s*\(|exec\s*\(\s*__import__)",     re.M),     "python_exec",      0.85),
    (re.compile(r"(?i)(os\.system\s*\(.{0,200}(wget|curl|nc|bash))",          re.M),     "os_exec",          0.8),
    (re.compile(r"(?i)(subprocess\.(run|call|Popen).{0,100}shell\s*=\s*True)", re.M),    "subprocess_shell", 0.7),

    # ── PowerShell obfuscation ───────────────────────────────────────────────
    (re.compile(r"(?i)(-EncodedCommand|-enc\s+[A-Za-z0-9+/]{20,})",           re.M),     "powershell_encoded", 0.85),
    (re.compile(r"(?i)(IEX\s*\(|Invoke-Expression.{0,50}Download)",           re.M),     "powershell_download", 0.85),
    (re.compile(r"(?i)(Set-MpPreference.{0,30}DisableRealtimeMonitoring)",     re.M),     "av_bypass",        0.9),
    (re.compile(r"(?i)(Add-MpPreference.{0,30}Exclusion|AmsiUtils)",           re.M),     "amsi_bypass",      0.9),

    # ── JavaScript/Node malware ──────────────────────────────────────────────
    (re.compile(r"(?i)(require\s*\(\s*['\"]child_process['\"].{0,100}exec)",  re.M),     "js_exec",          0.8),
    (re.compile(r"(?i)(Buffer\.from\s*\(.{0,50}base64.{0,50}exec)",           re.M),     "js_obfuscated",    0.8),
]

# ── Layer 2: Magic bytes — known file signatures ──────────────────────────────
MAGIC_SIGNATURES = {
    b"\x4d\x5a":         "PE_executable",    # Windows PE (MZ header)
    b"\x7f\x45\x4c\x46": "ELF_executable",  # Linux ELF
    b"\xca\xfe\xba\xbe": "Mach-O",          # macOS executable
    b"\x50\x4b\x03\x04": "ZIP/JAR/APK",     # Zip-based
    b"\x23\x21":         "script_shebang",  # #!/... (shell/python scripts)
}

# Script extensions that should trigger AI scan
SCRIPT_EXTENSIONS = {".py", ".sh", ".js", ".php", ".ps1", ".rb", ".pl", ".bat", ".cmd", ".vbs", ".jsx", ".ts"}

# Binary extensions that skip text analysis but get binary scan
BINARY_EXTENSIONS = {".exe", ".dll", ".so", ".elf", ".bin", ".sys", ".ko", ".dylib"}

# Suspicious extension mismatches — file claims to be image but is actually script
MISMATCH_PAIRS = {
    "PE_executable":  {".jpg", ".png", ".gif", ".pdf", ".txt", ".doc"},
    "ELF_executable": {".jpg", ".png", ".gif", ".pdf", ".txt", ".doc"},
    "script_shebang": {".jpg", ".png", ".gif", ".pdf"},
}


class DetectionResult:
    def __init__(self, verdict: str, confidence: float,
                 threat_type: Optional[str] = None,
                 indicators: Optional[List[str]] = None,
                 method: str = "static"):
        self.verdict     = verdict
        self.confidence  = confidence
        self.threat_type = threat_type
        self.indicators  = indicators or []
        self.method      = method

    def to_dict(self) -> dict:
        return {
            "verdict":     self.verdict,
            "confidence":  self.confidence,
            "threat_type": self.threat_type,
            "indicators":  self.indicators,
            "method":      self.method,
        }


class DetectionEngine:
    def __init__(self, ai_pool: AIPoolManager):
        self._ai = ai_pool
        self._threat_hashes:     set = set()
        self._malicious_ips:     set = set()
        self._malicious_domains: set = set()
        self._feed_lock = asyncio.Lock()

    # ── Feed loaders ─────────────────────────────────────────────────────────

    async def load_feeds(self, hashes: List[str], ips: List[str], domains: List[str]) -> None:
        async with self._feed_lock:
            self._threat_hashes      = set(h.lower() for h in hashes  if isinstance(h, str))
            self._malicious_ips      = set(ip.strip() for ip in ips    if isinstance(ip, str))
            self._malicious_domains  = set(d.lower().strip() for d in domains if isinstance(d, str))

    def load_hashes(self, hashes: List[str]) -> None:
        self._threat_hashes.update(h.lower() for h in hashes if isinstance(h, str))

    def load_ips(self, ips: List[str]) -> None:
        self._malicious_ips.update(ip.strip() for ip in ips if isinstance(ip, str))

    def load_domains(self, domains: List[str]) -> None:
        self._malicious_domains.update(d.lower().strip() for d in domains if isinstance(d, str))

    @property
    def feed_stats(self) -> dict:
        return {
            "hashes":  len(self._threat_hashes),
            "ips":     len(self._malicious_ips),
            "domains": len(self._malicious_domains),
        }

    # ── Public scan methods ───────────────────────────────────────────────────

    async def scan_file(self, file_path: str) -> DetectionResult:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            return DetectionResult("unknown", 0, method="error")

        # Layer 1: Hash lookup (known malware DB)
        try:
            fhash = self._hash_file(str(path))
            async with self._feed_lock:
                if fhash in self._threat_hashes:
                    return DetectionResult("malicious", 1.0, "known_malware",
                                           [f"hash:{fhash}"], "hash_db")
        except Exception:
            return DetectionResult("unknown", 0, method="error")

        # Read raw bytes for binary analysis
        try:
            file_size = path.stat().st_size
            with open(str(path), "rb") as f:
                raw_bytes = f.read(min(file_size, 10 * 1024 * 1024))  # up to 10MB
        except Exception:
            return DetectionResult("unknown", 0, method="error")

        # Layer 2: Magic bytes / file type detection
        magic_result = self._check_magic(path, raw_bytes)
        if magic_result:
            return magic_result

        # Layer 3: Entropy analysis (packed/encrypted/obfuscated)
        entropy_result = self._check_entropy(path, raw_bytes, fhash)
        if entropy_result and entropy_result.verdict == "malicious":
            return entropy_result

        # Layer 4: Binary-specific analysis (PE/ELF)
        binary_result = await self._scan_binary(path, raw_bytes)
        if binary_result and binary_result.verdict == "malicious":
            return binary_result

        # Layer 5: Static pattern matching (text content)
        static = await self._static(path, raw_bytes)
        if static.verdict == "malicious":
            await self._log_to_db("file", file_path, static, fhash)
            return static

        # Layer 6: AI deep scan — triggered for:
        # - Any suspicious result from layers 2-5
        # - All script files regardless
        # - Binary files with suspicious entropy
        # - Files with extension mismatch
        should_ai = (
            static.verdict == "suspicious" or
            (entropy_result and entropy_result.verdict == "suspicious") or
            (binary_result and binary_result.verdict == "suspicious") or
            path.suffix.lower() in SCRIPT_EXTENSIONS
        )
        if should_ai and self._ai.vendor_count > 0:
            return await self._ai_scan(path, raw_bytes, static, fhash)

        return static

    async def scan_behavior(self, process_name: str, actions: List[dict]) -> DetectionResult:
        """
        Behavioral analysis — score based on actions.
        Actions: high_cpu, high_mem, mass_file_write, network_scan,
                 privilege_escalation, file_delete_bulk, ransom_pattern,
                 outbound_data, process_inject
        """
        indicators: List[str] = []
        score = 0.0

        ACTION_WEIGHTS = {
            "high_cpu":             (80,  0.2),
            "high_mem":             (50,  0.2),
            "mass_file_write":      (100, 0.4),   # potential ransomware
            "mass_file_delete":     (50,  0.5),   # ransomware / wiper
            "ransom_pattern":       (1,   0.9),   # file rename to .encrypted etc
            "network_scan":         (1,   0.5),
            "outbound_data_large":  (10,  0.5),   # MB/s exfil
            "privilege_escalation": (1,   0.6),
            "process_inject":       (1,   0.8),
            "av_process_kill":      (1,   0.9),   # killing security tools
            "shadow_delete":        (1,   0.95),  # vssadmin delete shadows
        }

        for a in actions:
            t = a.get("type", "")
            v = float(a.get("value", 1))
            if t in ACTION_WEIGHTS:
                threshold, weight = ACTION_WEIGHTS[t]
                if v >= threshold:
                    indicators.append(f"{t}:{v}")
                    score = min(score + weight, 1.0)

        if score < 0.3:
            return DetectionResult("clean", 1 - score, method="behavioral")

        verdict = "malicious" if score >= 0.5 else "suspicious"

        if self._ai.vendor_count > 0:
            r = await self._ai.analyze_threat(
                f"Process: {process_name}\nBehavior score: {score:.2f}\nActions: {', '.join(indicators)}",
                "behavioral_analysis"
            )
            return DetectionResult(
                r.get("verdict", verdict),
                r.get("confidence", score),
                r.get("threat_type"),
                indicators + r.get("indicators", []),
                "behavioral+ai"
            )
        return DetectionResult(verdict, score, indicators=indicators, method="behavioral")

    async def scan_network(self, ip: str, port: Optional[int] = None) -> DetectionResult:
        ip_clean = ip.strip()
        async with self._feed_lock:
            ip_known = ip_clean in self._malicious_ips
        if ip_known:
            return DetectionResult("malicious", 1.0, "known_malicious_ip",
                                   [f"ip:{ip_clean}"], "threat_feed")
        if self._ai.vendor_count > 0:
            content = f"IP: {ip_clean}" + (f", Port: {port}" if port else "")
            r = await self._ai.analyze_threat(content, "network reputation")
            return DetectionResult(r.get("verdict", "clean"), r.get("confidence", 0.5),
                                   r.get("threat_type"), r.get("indicators", []), "ai_network")
        return DetectionResult("clean", 0.5, method="network")

    async def scan_domain(self, domain: str) -> DetectionResult:
        raw = domain.strip().lower()
        for scheme in ("https://", "http://", "ftp://"):
            if raw.startswith(scheme):
                raw = raw[len(scheme):]
                break
        domain_clean = raw.split("/")[0].split("?")[0]

        async with self._feed_lock:
            domains_snapshot = frozenset(self._malicious_domains)

        matched = None
        if domain_clean in domains_snapshot:
            matched = domain_clean
        else:
            for bad in domains_snapshot:
                if domain_clean.endswith("." + bad) or domain_clean == bad:
                    matched = bad
                    break

        if matched:
            return DetectionResult("malicious", 1.0, "known_malicious_domain",
                                   [f"domain:{domain_clean}", f"matched:{matched}"], "threat_feed")

        if self._ai.vendor_count > 0:
            r = await self._ai.analyze_threat(f"Domain: {domain_clean}", "domain reputation")
            return DetectionResult(r.get("verdict", "clean"), r.get("confidence", 0.5),
                                   r.get("threat_type"), r.get("indicators", []), "ai_domain")
        return DetectionResult("clean", 0.5, method="domain")

    # ── Layer 2: Magic bytes ──────────────────────────────────────────────────

    def _check_magic(self, path: Path, raw: bytes) -> Optional[DetectionResult]:
        if len(raw) < 4:
            return None
        detected_type = None
        for magic, ftype in MAGIC_SIGNATURES.items():
            if raw[:len(magic)] == magic:
                detected_type = ftype
                break
        if not detected_type:
            return None

        ext = path.suffix.lower()
        # Extension mismatch — e.g. file.jpg that is actually an ELF binary
        mismatch_exts = MISMATCH_PAIRS.get(detected_type, set())
        if ext in mismatch_exts:
            return DetectionResult(
                "malicious", 0.95, "extension_mismatch",
                [f"file_type:{detected_type}", f"extension:{ext}", "disguised_executable"],
                "magic_bytes"
            )
        return None

    # ── Layer 3: Entropy analysis ─────────────────────────────────────────────

    def _check_entropy(self, path: Path, raw: bytes, fhash: str) -> Optional[DetectionResult]:
        """
        High entropy (>7.2 bits/byte) indicates packed, encrypted, or obfuscated content.
        Normal code: ~5-6 bits. Compressed/encrypted: 7.5-8.0 bits.
        """
        if len(raw) < 256:
            return None
        # Sample first 64KB for speed
        sample = raw[:65536]
        counts = Counter(sample)
        total  = len(sample)
        entropy = -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0)

        ext = path.suffix.lower()
        # Already-compressed formats: skip (they legitimately have high entropy)
        COMPRESSED_EXTS = {".zip", ".gz", ".bz2", ".xz", ".7z", ".rar", ".jpg", ".png",
                           ".mp4", ".avi", ".mp3", ".pdf"}
        if ext in COMPRESSED_EXTS:
            return None

        if entropy > 7.5:
            # Very high entropy on an executable = almost certainly packed/encrypted malware
            if ext in BINARY_EXTENSIONS or raw[:4] in (b"\x4d\x5a", b"\x7f\x45\x4c\x46"):
                return DetectionResult(
                    "malicious", 0.85, "packed_malware",
                    [f"entropy:{entropy:.2f}", f"hash:{fhash}", "likely_packed_or_encrypted"],
                    "entropy"
                )
            # High entropy script = obfuscated code
            if ext in SCRIPT_EXTENSIONS:
                return DetectionResult(
                    "suspicious", 0.70, "obfuscated_code",
                    [f"entropy:{entropy:.2f}", "high_entropy_script"],
                    "entropy"
                )
        elif entropy > 7.0 and ext in BINARY_EXTENSIONS:
            return DetectionResult(
                "suspicious", 0.55, "possibly_packed",
                [f"entropy:{entropy:.2f}"],
                "entropy"
            )
        return None

    # ── Layer 4: Binary analysis (PE/ELF) ────────────────────────────────────

    async def _scan_binary(self, path: Path, raw: bytes) -> Optional[DetectionResult]:
        if len(raw) < 64:
            return None
        indicators: List[str] = []
        score = 0.0

        # PE (Windows executable) analysis
        if raw[:2] == b"\x4d\x5a":  # MZ header
            try:
                # PE offset at 0x3C
                pe_offset = struct.unpack_from("<I", raw, 0x3C)[0]
                if pe_offset + 4 < len(raw) and raw[pe_offset:pe_offset+4] == b"PE\x00\x00":
                    # Check for suspicious PE characteristics
                    # Suspicious section names: .text with high entropy, no imports
                    if b"VirtualAlloc" in raw and b"WriteProcessMemory" in raw:
                        indicators.append("pe_process_injection_api")
                        score += 0.5
                    if b"IsDebuggerPresent" in raw or b"CheckRemoteDebuggerPresent" in raw:
                        indicators.append("pe_anti_debug")
                        score += 0.3
                    if b"SuspendThread" in raw and b"ResumeThread" in raw:
                        indicators.append("pe_thread_manipulation")
                        score += 0.3
                    # Very few imports = possibly packed
                    import_count = raw.count(b"\x00") > 0 and len([x for x in [b"kernel32", b"ntdll", b"user32"] if x in raw.lower()])
                    if import_count == 0:
                        indicators.append("pe_no_standard_imports")
                        score += 0.3
            except Exception:
                pass

        # ELF (Linux executable) analysis
        elif raw[:4] == b"\x7f\x45\x4c\x46":
            if b"/etc/passwd" in raw or b"/etc/shadow" in raw:
                indicators.append("elf_passwd_access")
                score += 0.6
            if b"LD_PRELOAD" in raw:
                indicators.append("elf_ld_preload")
                score += 0.7
            if b"/proc/self/mem" in raw:
                indicators.append("elf_proc_mem_write")
                score += 0.8
            if b"ptrace" in raw and b"PTRACE_ATTACH" in raw:
                indicators.append("elf_ptrace")
                score += 0.5

        # Shellcode patterns — raw binary with common shellcode indicators
        # x86/x64 shellcode often has NOP sled or specific opcodes
        if b"\x90\x90\x90\x90\x90\x90" in raw[:4096]:  # NOP sled
            indicators.append("nop_sled_detected")
            score += 0.5
        if b"\xcc\xcc\xcc\xcc" in raw[:4096]:  # INT3 breakpoints (debugger)
            indicators.append("int3_breakpoints")
            score += 0.3

        if not indicators:
            return None

        verdict = "malicious" if score >= 0.6 else "suspicious"
        return DetectionResult(verdict, min(score, 0.95), "binary_threat",
                               indicators, "binary_analysis")

    # ── Layer 5: Static text pattern matching ─────────────────────────────────

    async def _static(self, path: Path, raw: bytes) -> DetectionResult:
        # Skip large files (now 10MB, up from 5MB)
        if len(raw) > 10 * 1024 * 1024:
            return DetectionResult("unknown", 0.3, method="skipped_large")

        # Decode as text — use errors=ignore to handle binary embedded in text
        try:
            content = raw.decode("utf-8", errors="ignore")
        except Exception:
            return DetectionResult("unknown", 0, method="error")

        # Run all YARA-like patterns
        hits: dict = {}  # threat_type → max_weight
        for pattern, threat_type, weight in SUSPICIOUS_PATTERNS:
            if pattern.search(content):
                if threat_type not in hits or weight > hits[threat_type]:
                    hits[threat_type] = weight

        if not hits:
            return DetectionResult("clean", 0.9, method="static")

        # Score = weighted sum, capped at 1.0
        total_score = min(sum(hits.values()), 1.0)
        top_threat  = max(hits, key=lambda k: hits[k])
        all_threats = list(hits.keys())

        # 2+ pattern matches OR any single match > 0.8 = malicious
        verdict = "malicious" if (len(hits) >= 2 or total_score >= 0.85) else "suspicious"
        confidence = min(0.6 + (len(hits) - 1) * 0.1, 0.95)

        return DetectionResult(verdict, confidence, top_threat, all_threats, "static")

    # ── Layer 6: AI deep scan ─────────────────────────────────────────────────

    async def _ai_scan(self, path: Path, raw: bytes, static: DetectionResult, fhash: str) -> DetectionResult:
        """
        Deep AI analysis. Sends:
        - For text files: first 4000 chars of content
        - For binary files: hex dump of first 512 bytes + metadata
        - Plus static analysis context
        """
        try:
            ext = path.suffix.lower()
            file_size = len(raw)

            if ext in BINARY_EXTENSIONS or raw[:2] in (b"\x4d\x5a", b"\x7f\x45\x4c\x46"):
                # Binary: send hex dump + metadata (not readable text)
                hex_head = raw[:512].hex()
                content = (
                    f"Binary file analysis:\n"
                    f"Name: {path.name}\nSize: {file_size} bytes\nSHA256: {fhash}\n"
                    f"First 512 bytes (hex):\n{hex_head}\n"
                    f"Readable strings: {self._extract_strings(raw)}"
                )
            else:
                # Text: send readable content
                content = raw.decode("utf-8", errors="ignore")[:4000]

            r = await self._ai.analyze_threat(
                content,
                f"File: {path.name} | Static: {static.verdict} | Indicators: {static.indicators}"
            )
        except Exception:
            return static

        result = DetectionResult(
            r.get("verdict", static.verdict),
            r.get("confidence", static.confidence),
            r.get("threat_type", static.threat_type),
            static.indicators + r.get("indicators", []),
            "ai+static" if static.verdict != "clean" else "ai"
        )

        # Submit new malicious hash to threat queue for learning
        if result.verdict == "malicious":
            try:
                import src.reporter as _rep
                from src.core import GuardianCore
                cfg = GuardianCore.get()._cfg
                if cfg.license_validate_url and cfg.license_key:
                    dashboard_url = cfg.license_validate_url.replace("/api/license-validate", "")
                    asyncio.create_task(_rep.submit_threat(
                        dashboard_url, cfg.license_key,
                        threat_type="hash", value=fhash,
                        name=path.name, severity="high",
                    ))
            except Exception:
                pass

        return result

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _hash_file(self, path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()

    def _extract_strings(self, raw: bytes, min_len: int = 6) -> str:
        """Extract printable strings from binary — useful for AI context."""
        result = []
        current = []
        for byte in raw[:4096]:
            c = chr(byte)
            if c.isprintable() and c != " ":
                current.append(c)
            else:
                if len(current) >= min_len:
                    result.append("".join(current))
                current = []
        strings = [s for s in result if len(s) >= min_len]
        # Filter to interesting ones
        interesting = [s for s in strings if any(kw in s.lower() for kw in
            ["http", "cmd", "exec", "shell", "pass", "user", "admin", "crypt",
             "socket", "connect", "download", "upload", "inject", "exploit"])]
        return ", ".join(interesting[:20]) or ", ".join(strings[:10])

    async def _log_to_db(self, scan_type: str, target: str,
                          result: "DetectionResult", target_hash: str = "") -> None:
        """Log scan result to local SQLite DB."""
        if result.verdict == "clean":
            return  # Only log non-clean results to save space
        try:
            import os as _os
            from src.database import get_db
            db = await get_db()
            await db.log_scan(
                node_id=_os.environ.get("GUARDIAN_NODE_ID", "core"),
                scan_type=scan_type,
                target=target,
                verdict=result.verdict,
                confidence=result.confidence,
                threat_type=result.threat_type or "",
                indicators=result.indicators,
                method=result.method,
                target_hash=target_hash,
                raw=result.to_dict()
            )
            # Update host risk score
            await db.update_risk_score(
                _os.environ.get("GUARDIAN_NODE_ID","core"),
                _os.environ.get("GUARDIAN_NODE_NAME",""),
                result.verdict, result.confidence
            )
            # Add to learned patterns if AI confirmed
            if result.verdict == "malicious" and "ai" in result.method and target_hash:
                await db.add_learned_pattern("hash", target_hash,
                    result.threat_type or "malware", result.confidence, "ai_detection")
        except Exception:
            pass
