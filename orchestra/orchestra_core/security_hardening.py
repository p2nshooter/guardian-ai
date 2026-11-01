# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
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

# Hashes of the guarded modules, written into the image when it is built
# (see orchestra/Dockerfile). Each official release ships its own manifest,
# so an update is never mistaken for tampering, while a module edited inside
# a running container is still caught.
RELEASE_MANIFEST_NAME = "module_hashes.release.json"

# The old trust-on-first-use file in the data volume. It outlived updates and
# shut Orchestra down after every release that changed a guarded module, so
# it is no longer read or written. It is left in place, never deleted.
LEGACY_HASHES_PATH = DATA_DIR / "module_hashes.json"

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


def _module_hashes(base_dir: Path) -> dict:
    hashes = {}
    for module_name in GUARDED_MODULES:
        path = base_dir / module_name
        if path.exists():
            hashes[module_name] = _sha256_file(path)
    return hashes


def write_release_manifest(base_dir: Path | None = None) -> dict:
    """Record the guarded modules' hashes next to them. Run once at image build."""
    base_dir = Path(base_dir) if base_dir else Path(__file__).parent
    hashes = _module_hashes(base_dir)
    (base_dir / RELEASE_MANIFEST_NAME).write_text(json.dumps(hashes, indent=2, sort_keys=True) + "\n")
    return hashes


def check_module_integrity(base_dir: Path | None = None) -> dict:
    base_dir = Path(base_dir) if base_dir else Path(__file__).parent
    current = _module_hashes(base_dir)
    manifest_path = base_dir / RELEASE_MANIFEST_NAME

    if not manifest_path.exists():
        # Running from source (development, tests): there is no release to
        # compare against, so report it instead of stopping.
        return {"check": "module_integrity", "passed": True, "mode": "development",
                "note": f"{RELEASE_MANIFEST_NAME} not found — release integrity not enforced",
                "modules_checked": list(current.keys())}

    try:
        expected = json.loads(manifest_path.read_text())
        if not isinstance(expected, dict):
            raise ValueError("manifest is not an object")
    except Exception as e:
        return {"check": "module_integrity", "passed": False, "mode": "release",
                "error": f"Release manifest unreadable: {e}",
                "violations": [f"{RELEASE_MANIFEST_NAME} unreadable"]}

    violations = []
    for module_name, h in current.items():
        if module_name not in expected:
            violations.append(f"{module_name} not in release manifest — possible tampering")
        elif expected[module_name] != h:
            violations.append(f"{module_name} hash mismatch — possible tampering")
    for module_name in expected:
        if module_name not in current:
            violations.append(f"{module_name} missing — possible tampering")

    if violations:
        return {"check": "module_integrity", "passed": False, "mode": "release",
                "error": f"Integrity violations: {', '.join(violations)}", "violations": violations}
    return {"check": "module_integrity", "passed": True, "mode": "release",
            "modules_checked": list(current.keys())}


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
        LEGACY_HASHES_PATH,
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
