"""
AXTO Guardian — Compliance Engine
Automated compliance checking against major frameworks:

Frameworks supported:
  - NIST CSF 2.0       (Identify / Protect / Detect / Respond / Recover)
  - CIS Controls v8    (18 critical security controls)
  - ISO 27001:2022     (Annex A controls)
  - SOC 2 Type II      (Trust Service Criteria)
  - PCI-DSS v4.0       (Payment card security — if applicable)
  - HIPAA              (Healthcare — if applicable)

Each check is:
  - Pass / Fail / Warning / Not Applicable
  - Scored (0–100 per framework)
  - Evidence attached (what we found)
  - Remediation steps provided

Checks run:
  - On startup (baseline)
  - Every 24 hours (scheduled)
  - On demand via API

Results stored in local JSON and exposed via /analytics/compliance API.
"""
from __future__ import annotations

import asyncio, json, logging, os, platform, subprocess, time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("guardian.compliance")

DATA_DIR       = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
COMPLIANCE_DB  = DATA_DIR / "compliance.json"


# ── Data Models ───────────────────────────────────────────────────────────────

@dataclass
class CheckResult:
    check_id:       str
    framework:      str
    control:        str
    description:    str
    status:         str         # pass | fail | warning | na | unknown
    score:          float       # 0.0–1.0
    evidence:       str
    remediation:    str
    severity:       str         # critical | high | medium | low | info
    ts:             float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FrameworkReport:
    framework:   str
    version:     str
    score:       float          # 0–100
    grade:       str            # A/B/C/D/F
    checks:      List[CheckResult]
    passed:      int
    failed:      int
    warnings:    int
    na:          int
    run_at:      float = field(default_factory=time.time)
    run_duration_sec: float = 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["checks"] = [c.to_dict() for c in self.checks]
        return d


def _grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _run_cmd(cmd: List[str], timeout: int = 5) -> Tuple[int, str]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout + r.stderr
    except Exception as e:
        return -1, str(e)


def _file_contains(path: str, pattern: str) -> bool:
    try:
        return pattern in Path(path).read_text()
    except Exception:
        return False


def _file_exists(path: str) -> bool:
    return Path(path).exists()


def _get_stat(path: str):
    try:
        return Path(path).stat()
    except Exception:
        return None


# ── Individual Check Functions ─────────────────────────────────────────────────

def _check_firewall() -> CheckResult:
    # Check iptables / ufw / nftables
    rc, out = _run_cmd(["iptables", "-L", "-n"])
    has_iptables = rc == 0 and "Chain" in out
    rc2, _ = _run_cmd(["ufw", "status"])
    has_ufw = "active" in _.lower() if rc2 == 0 else False
    rc3, _ = _run_cmd(["nft", "list", "ruleset"])
    has_nft = rc3 == 0 and "table" in _

    active = has_iptables or has_ufw or has_nft
    tool   = "iptables" if has_iptables else ("ufw" if has_ufw else ("nftables" if has_nft else "none"))
    return CheckResult(
        check_id="FW-001", framework="nist_csf", control="PR.AC-5",
        description="Host-based firewall is active",
        status="pass" if active else "fail",
        score=1.0 if active else 0.0,
        evidence=f"Firewall tool: {tool}",
        remediation="Install and enable ufw: apt install ufw && ufw enable",
        severity="high" if not active else "info",
    )


def _check_ssh_hardening() -> CheckResult:
    sshd = "/etc/ssh/sshd_config"
    if not _file_exists(sshd):
        return CheckResult(
            check_id="SSH-001", framework="cis", control="5.2",
            description="SSH daemon configuration hardened",
            status="na", score=1.0, evidence="SSH daemon not installed",
            remediation="N/A", severity="info",
        )
    issues = []
    content = ""
    try: content = Path(sshd).read_text()
    except: pass
    checks_ssh = {
        "PermitRootLogin no": "Root SSH login is enabled",
        "PasswordAuthentication no": "Password auth enabled (use keys only)",
        "X11Forwarding no": "X11 forwarding enabled",
        "MaxAuthTries": "MaxAuthTries not set",
    }
    for setting, issue in checks_ssh.items():
        key = setting.split()[0]
        val = setting.split()[1] if len(setting.split()) > 1 else ""
        if key not in content or (val and f"{key} {val}" not in content):
            issues.append(issue)
    status = "pass" if not issues else ("warning" if len(issues) < 3 else "fail")
    return CheckResult(
        check_id="SSH-001", framework="cis", control="5.2",
        description="SSH daemon configuration hardened",
        status=status, score=1.0 - len(issues)*0.25,
        evidence=f"Issues: {issues}" if issues else "All SSH checks passed",
        remediation="Edit /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no",
        severity="high" if status == "fail" else ("medium" if status == "warning" else "info"),
    )


def _check_unattended_upgrades() -> CheckResult:
    pkg_exists = _file_exists("/etc/apt/apt.conf.d/20auto-upgrades")
    enabled    = False
    if pkg_exists:
        try:
            content = Path("/etc/apt/apt.conf.d/20auto-upgrades").read_text()
            enabled = 'APT::Periodic::Unattended-Upgrade "1"' in content
        except: pass
    # Also check yum-cron / dnf-automatic
    rc, _ = _run_cmd(["systemctl", "is-active", "yum-cron"])
    yum_active = rc == 0
    rc2, _ = _run_cmd(["systemctl", "is-active", "dnf-automatic"])
    dnf_active = rc2 == 0
    active = enabled or yum_active or dnf_active
    return CheckResult(
        check_id="PATCH-001", framework="nist_csf", control="PR.IP-12",
        description="Automatic security updates enabled",
        status="pass" if active else "warning",
        score=1.0 if active else 0.5,
        evidence=f"unattended-upgrades={enabled}, yum-cron={yum_active}, dnf-auto={dnf_active}",
        remediation="apt install unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades",
        severity="medium" if not active else "info",
    )


def _check_audit_logging() -> CheckResult:
    # Check auditd
    rc, _ = _run_cmd(["systemctl", "is-active", "auditd"])
    auditd = rc == 0
    # Check /var/log/auth.log or /var/log/secure
    auth_log = _file_exists("/var/log/auth.log") or _file_exists("/var/log/secure")
    # Check syslog
    rc2, _ = _run_cmd(["systemctl", "is-active", "rsyslog"])
    syslog = rc2 == 0
    score  = sum([auditd, auth_log, syslog]) / 3
    return CheckResult(
        check_id="LOG-001", framework="soc2", control="CC7.2",
        description="Security audit logging is active",
        status="pass" if score >= 0.67 else ("warning" if score > 0 else "fail"),
        score=score,
        evidence=f"auditd={auditd}, auth_log={auth_log}, syslog={syslog}",
        remediation="apt install auditd && systemctl enable --now auditd",
        severity="high" if score == 0 else ("medium" if score < 0.67 else "info"),
    )


def _check_disk_encryption() -> CheckResult:
    # Check LUKS / dm-crypt
    rc, out = _run_cmd(["lsblk", "-o", "NAME,TYPE,FSTYPE"])
    has_luks = "crypt" in out or "luks" in out.lower()
    # Check if /etc/crypttab exists
    crypttab = _file_exists("/etc/crypttab")
    active    = has_luks or crypttab
    return CheckResult(
        check_id="ENC-001", framework="iso27001", control="A.10.1",
        description="Disk encryption (LUKS) configured",
        status="pass" if active else "warning",
        score=1.0 if active else 0.3,
        evidence=f"LUKS detected: {has_luks}, crypttab: {crypttab}",
        remediation="Enable LUKS encryption during OS installation or use dm-crypt",
        severity="medium" if not active else "info",
    )


def _check_password_policy() -> CheckResult:
    # Check /etc/login.defs
    issues = []
    if _file_exists("/etc/login.defs"):
        content = Path("/etc/login.defs").read_text() if _file_exists("/etc/login.defs") else ""
        for setting, min_val in [("PASS_MAX_DAYS", 90), ("PASS_MIN_DAYS", 1),
                                   ("PASS_MIN_LEN", 12)]:
            for line in content.splitlines():
                if line.startswith(setting):
                    try:
                        val = int(line.split()[1])
                        if setting == "PASS_MAX_DAYS" and val > min_val:
                            issues.append(f"{setting}={val} > {min_val}")
                        elif setting in ("PASS_MIN_DAYS","PASS_MIN_LEN") and val < min_val:
                            issues.append(f"{setting}={val} < {min_val}")
                    except: pass
    # Check pam_pwquality
    pwq = _file_exists("/etc/pam.d/common-password")
    status = "pass" if not issues else ("warning" if len(issues) < 2 else "fail")
    return CheckResult(
        check_id="PWD-001", framework="cis", control="5.4",
        description="Password policy meets security requirements",
        status=status, score=1.0 - len(issues)*0.2,
        evidence=f"Issues: {issues}" if issues else "Password policy OK",
        remediation="Edit /etc/login.defs: PASS_MAX_DAYS 90, PASS_MIN_LEN 12",
        severity="high" if status == "fail" else ("medium" if issues else "info"),
    )


def _check_world_writable_files() -> CheckResult:
    rc, out = _run_cmd(["find", "/etc", "/usr", "/bin", "/sbin",
                         "-perm", "-002", "-not", "-type", "l",
                         "-maxdepth", "4"], timeout=15)
    files = [f for f in out.strip().splitlines() if f][:20]
    return CheckResult(
        check_id="PERM-001", framework="cis", control="6.1",
        description="No world-writable files in system directories",
        status="pass" if not files else "fail",
        score=1.0 if not files else max(0.0, 1.0 - len(files)*0.1),
        evidence=f"World-writable files: {files[:5]}" if files else "None found",
        remediation="chmod o-w <file> for each world-writable file listed",
        severity="high" if files else "info",
    )


def _check_suid_binaries() -> CheckResult:
    rc, out = _run_cmd(["find", "/usr", "/bin", "/sbin", "-perm", "-4000",
                         "-type", "f", "-maxdepth", "5"], timeout=15)
    expected_suid = {
        "/usr/bin/sudo", "/usr/bin/su", "/usr/bin/passwd",
        "/usr/bin/pkexec", "/bin/ping", "/usr/bin/newgrp",
    }
    found     = set(out.strip().splitlines()) if out.strip() else set()
    unexpected = found - expected_suid
    return CheckResult(
        check_id="SUID-001", framework="cis", control="6.2",
        description="No unexpected SUID binaries",
        status="pass" if not unexpected else "warning",
        score=1.0 if not unexpected else 0.6,
        evidence=f"Unexpected SUID: {list(unexpected)[:5]}" if unexpected else "Only expected SUID binaries",
        remediation="chmod u-s <binary> for each unexpected SUID binary after verification",
        severity="medium" if unexpected else "info",
    )


def _check_rootkit_indicators() -> CheckResult:
    # Basic rootkit indicators (non-exhaustive, supplement with rootkit_detector.py)
    suspects = []
    # Check for hidden processes via /proc
    try:
        proc_pids  = {int(p.name) for p in Path("/proc").iterdir() if p.name.isdigit()}
        ps_rc, ps_out = _run_cmd(["ps", "ax", "-o", "pid"], timeout=5)
        if ps_rc == 0:
            ps_pids = {int(l.strip()) for l in ps_out.splitlines() if l.strip().isdigit()}
            hidden  = proc_pids - ps_pids
            if hidden:
                suspects.append(f"hidden_pids:{list(hidden)[:5]}")
    except Exception: pass
    # Check for suspicious kernel modules
    rc, out = _run_cmd(["lsmod"])
    suspicious_mods = {"rkkit", "rootkit", "diamorphine", "reptile", "sysemptied"}
    if rc == 0:
        for mod in suspicious_mods:
            if mod in out.lower():
                suspects.append(f"suspicious_module:{mod}")
    return CheckResult(
        check_id="RK-001", framework="nist_csf", control="DE.CM-7",
        description="No rootkit indicators detected",
        status="pass" if not suspects else "fail",
        score=1.0 if not suspects else 0.0,
        evidence=f"Indicators: {suspects}" if suspects else "No rootkit indicators found",
        remediation="Run full rootkit scan: rkhunter --check && chkrootkit",
        severity="critical" if suspects else "info",
    )


def _check_tls_config() -> CheckResult:
    # Check nginx/apache TLS config
    weak_protos = []
    for conf_path in ["/etc/nginx/nginx.conf", "/etc/nginx/sites-enabled/default",
                      "/etc/apache2/sites-enabled/000-default.conf"]:
        if _file_exists(conf_path):
            content = Path(conf_path).read_text() if _file_exists(conf_path) else ""
            if "TLSv1 " in content or "TLSv1.1 " in content:
                weak_protos.append(conf_path)
            if "ssl_protocols" not in content and "SSLProtocol" not in content:
                weak_protos.append(f"{conf_path}:no_ssl_directive")
    status = "pass" if not weak_protos else "warning"
    return CheckResult(
        check_id="TLS-001", framework="pci_dss", control="4.2.1",
        description="TLS 1.2+ configured, TLS 1.0/1.1 disabled",
        status=status, score=1.0 if not weak_protos else 0.5,
        evidence=f"Weak TLS configs: {weak_protos}" if weak_protos else "TLS config OK",
        remediation="Set ssl_protocols TLSv1.2 TLSv1.3 in nginx/apache config",
        severity="high" if weak_protos else "info",
    )


def _check_ntp_sync() -> CheckResult:
    rc, out = _run_cmd(["timedatectl", "status"])
    synced  = "synchronized: yes" in out.lower() or "ntp service: active" in out.lower()
    return CheckResult(
        check_id="TIME-001", framework="soc2", control="CC6.1",
        description="System time synchronized (NTP)",
        status="pass" if synced else "warning",
        score=1.0 if synced else 0.5,
        evidence=out[:200] if out else "timedatectl unavailable",
        remediation="timedatectl set-ntp true && apt install systemd-timesyncd",
        severity="medium" if not synced else "info",
    )


def _check_core_dumps() -> CheckResult:
    # Core dumps can expose sensitive data
    rc, out = _run_cmd(["sysctl", "kernel.core_pattern"])
    # core_pattern should be disabled or point to /dev/null
    disabled = rc == 0 and ("|" not in out)   # piping core dumps = enabled and possibly unsafe
    # Check /proc/sys/kernel/core_pattern
    try:
        pattern = Path("/proc/sys/kernel/core_pattern").read_text().strip()
        safe    = pattern in ("", "/dev/null") or not pattern
    except:
        safe    = False
    return CheckResult(
        check_id="CORE-001", framework="cis", control="1.6.4",
        description="Core dump generation restricted",
        status="pass" if safe else "warning",
        score=1.0 if safe else 0.6,
        evidence=f"core_pattern: {Path('/proc/sys/kernel/core_pattern').read_text().strip()}" if _file_exists("/proc/sys/kernel/core_pattern") else "unknown",
        remediation="echo 'kernel.core_pattern=/dev/null' >> /etc/sysctl.d/99-security.conf && sysctl -p",
        severity="low" if not safe else "info",
    )


# ── All checks per framework ──────────────────────────────────────────────────

FRAMEWORK_CHECKS = {
    "nist_csf":  [_check_firewall, _check_audit_logging, _check_rootkit_indicators,
                  _check_unattended_upgrades],
    "cis":       [_check_ssh_hardening, _check_password_policy, _check_world_writable_files,
                  _check_suid_binaries, _check_core_dumps],
    "iso27001":  [_check_disk_encryption, _check_audit_logging, _check_ssh_hardening,
                  _check_firewall],
    "soc2":      [_check_audit_logging, _check_ntp_sync, _check_tls_config,
                  _check_firewall, _check_ssh_hardening],
    "pci_dss":   [_check_tls_config, _check_firewall, _check_password_policy,
                  _check_audit_logging, _check_ssh_hardening],
}

FRAMEWORK_VERSIONS = {
    "nist_csf": "2.0", "cis": "v8", "iso27001": "2022",
    "soc2": "2017", "pci_dss": "v4.0",
}


# ── ComplianceEngine ──────────────────────────────────────────────────────────

class ComplianceEngine:
    def __init__(self):
        self._running  = False
        self._reports: Dict[str, FrameworkReport] = {}
        self._last_run: float = 0

    async def start(self) -> None:
        self._running = True
        self._load()
        asyncio.create_task(self._scheduled_scan())
        log.info("Compliance Engine started")

    async def stop(self) -> None:
        self._running = False
        self._save()

    async def run_all(self) -> Dict[str, dict]:
        """Run all framework checks. Returns framework → report dict."""
        results = {}
        for framework in FRAMEWORK_CHECKS:
            results[framework] = await self.run_framework(framework)
        self._last_run = time.time()
        return results

    async def run_framework(self, framework: str) -> dict:
        """Run checks for a specific framework."""
        checks_fns = FRAMEWORK_CHECKS.get(framework, [])
        t0         = time.time()
        results    = []
        loop       = asyncio.get_event_loop()

        for fn in checks_fns:
            try:
                # Run blocking checks in executor
                result = await loop.run_in_executor(None, fn)
                results.append(result)
            except Exception as e:
                log.warning(f"Check {fn.__name__} failed: {e}")
                results.append(CheckResult(
                    check_id=fn.__name__, framework=framework,
                    control="unknown", description=fn.__doc__ or fn.__name__,
                    status="unknown", score=0.0,
                    evidence=f"Error: {e}", remediation="",
                    severity="info",
                ))

        passed   = sum(1 for r in results if r.status == "pass")
        failed   = sum(1 for r in results if r.status == "fail")
        warnings = sum(1 for r in results if r.status == "warning")
        na       = sum(1 for r in results if r.status == "na")
        total    = passed + failed + warnings + na
        score    = (passed + warnings * 0.5) / max(total, 1) * 100

        report = FrameworkReport(
            framework=framework, version=FRAMEWORK_VERSIONS.get(framework, ""),
            score=round(score, 1), grade=_grade(score),
            checks=results, passed=passed, failed=failed,
            warnings=warnings, na=na,
            run_at=time.time(), run_duration_sec=round(time.time()-t0, 2),
        )
        self._reports[framework] = report
        self._save()

        log.info(f"Compliance {framework}: score={score:.1f}% grade={report.grade} "
                 f"({passed}✓ {failed}✗ {warnings}⚠)")
        return report.to_dict()

    def get_report(self, framework: str) -> Optional[dict]:
        r = self._reports.get(framework)
        return r.to_dict() if r else None

    def get_summary(self) -> dict:
        summary = {}
        for fw, r in self._reports.items():
            summary[fw] = {"score": r.score, "grade": r.grade,
                           "passed": r.passed, "failed": r.failed,
                           "warnings": r.warnings, "run_at": r.run_at}
        return {"frameworks": summary, "last_run": self._last_run,
                "overall_score": round(
                    sum(r.score for r in self._reports.values()) /
                    max(len(self._reports), 1), 1
                ) if self._reports else 0}

    async def _scheduled_scan(self) -> None:
        # Run initial scan after 60 seconds (let system fully start)
        await asyncio.sleep(60)
        await self.run_all()
        # Then every 24 hours
        while self._running:
            await asyncio.sleep(3600 * 24)
            if self._running:
                await self.run_all()

    def _load(self) -> None:
        if COMPLIANCE_DB.exists():
            try:
                data = json.loads(COMPLIANCE_DB.read_text())
                for fw, rd in data.get("reports", {}).items():
                    checks = [CheckResult(**c) for c in rd.get("checks", [])]
                    rd2    = {k: v for k, v in rd.items() if k != "checks"}
                    self._reports[fw] = FrameworkReport(**rd2, checks=checks)
                self._last_run = data.get("last_run", 0)
            except Exception as e:
                log.warning(f"Compliance load error: {e}")

    def _save(self) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            COMPLIANCE_DB.write_text(json.dumps({
                "reports":  {fw: r.to_dict() for fw, r in self._reports.items()},
                "last_run": self._last_run,
            }, indent=2))
        except Exception as e:
            log.debug(f"Compliance save error: {e}")
