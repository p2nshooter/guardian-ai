# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Security Hardening
Anti-tamper, clock integrity, module hash verification.
Mirror of Guardian Core hardening architecture.
"""
import os, sys, time, json, hashlib, platform, logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("orchestra.hardening")
DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
KNOWN_HASHES_PATH = DATA_DIR / "module_hashes.json"

GUARDED_MODULES = [
    "enforcement.py", "credential_vault.py", "job_router.py",
    "worker_manager.py", "routing_engine.py", "ai_providers.py",
]


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ""


def check_clock_integrity() -> dict:
    ts_path = DATA_DIR / "last_timestamp"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    now = int(time.time())
    if ts_path.exists():
        try:
            last_ts = int(ts_path.read_text().strip())
            if now < last_ts - 10:
                return {"check": "clock_integrity", "passed": False,
                        "error": f"Clock rollback detected: current={now} last={last_ts}"}
        except Exception:
            pass
    ts_path.write_text(str(now))
    return {"check": "clock_integrity", "passed": True}


def check_module_integrity() -> dict:
    base_dir = Path(__file__).parent
    known = {}
    if KNOWN_HASHES_PATH.exists():
        try:
            known = json.loads(KNOWN_HASHES_PATH.read_text())
        except Exception:
            pass

    current_hashes = {}
    violations = []

    for module_name in GUARDED_MODULES:
        path = base_dir / module_name
        if not path.exists():
            continue
        h = _sha256_file(path)
        current_hashes[module_name] = h
        if module_name in known:
            if known[module_name] != h:
                violations.append(f"{module_name} hash mismatch — possible tampering")
        else:
            known[module_name] = h

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    KNOWN_HASHES_PATH.write_text(json.dumps(known, indent=2))
    if platform.system() != "Windows":
        try: os.chmod(KNOWN_HASHES_PATH, 0o600)
        except: pass

    if violations:
        return {"check": "module_integrity", "passed": False,
                "error": f"Integrity violations: {', '.join(violations)}", "violations": violations}
    return {"check": "module_integrity", "passed": True, "modules_checked": list(current_hashes.keys())}


def check_environment() -> dict:
    issues = []
    py_major, py_minor = sys.version_info[:2]
    if py_major < 3 or (py_major == 3 and py_minor < 10):
        issues.append(f"Python {py_major}.{py_minor} < 3.10 required")
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        test_path = DATA_DIR / ".write_test"
        test_path.write_text("ok")
        test_path.unlink()
    except Exception as e:
        issues.append(f"Data directory not writable: {e}")
    if issues:
        return {"check": "environment", "passed": False, "issues": issues}
    return {"check": "environment", "passed": True}


def check_data_permissions() -> dict:
    issues = []
    sensitive_files = [
        DATA_DIR / "license.orch1",
        DATA_DIR / "unit_fingerprint",
        DATA_DIR / "credential_vault.enc",
        DATA_DIR / "module_hashes.json",
    ]
    if platform.system() != "Windows":
        for path in sensitive_files:
            if path.exists():
                mode = oct(path.stat().st_mode)[-3:]
                if mode[-1] not in ("0",):
                    try:
                        os.chmod(path, 0o600)
                    except Exception:
                        issues.append(f"{path.name}: cannot restrict permissions")
    if issues:
        return {"check": "data_permissions", "passed": False, "issues": issues}
    return {"check": "data_permissions", "passed": True}


def run_all(air_gap: bool = False) -> dict:
    checks = [
        check_clock_integrity(),
        check_module_integrity(),
        check_environment(),
        check_data_permissions(),
    ]
    total    = len(checks)
    passed   = sum(1 for c in checks if c.get("passed", False))
    failed   = [c for c in checks if not c.get("passed", False)]
    critical = {"clock_integrity", "module_integrity"}
    critical_failures = [c for c in failed if c.get("check") in critical]

    for c in critical_failures:
        logger.critical(f"[HARDENING] CRITICAL: {c['check']} — {c.get('error')}")
    for c in [f for f in failed if f.get("check") not in critical]:
        logger.warning(f"[HARDENING] WARNING: {c['check']} — {c.get('issues', c.get('error'))}")

    return {
        "all_passed":       len(failed) == 0,
        "checks_total":     total,
        "checks_passed":    passed,
        "checks_failed":    len(failed),
        "critical_failure": len(critical_failures) > 0,
        "failed_checks":    failed,
        "details":          checks,
        "checked_at":       datetime.now(timezone.utc).isoformat(),
    }
