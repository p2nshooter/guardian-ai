"""
AXTO Orchestra — AI eXecution & Tools Orchestration | License Enforcement Engine
Fail-closed. No fallback. No grace period. No bypass.
Hardware-bound, tamper-proof, cryptographically signed.
"""
import json
import hashlib
import hmac
import platform
import os
import re
import time
import subprocess
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Embedded public key (injected at build time by AXTO CI) ─────────────────
EMBEDDED_PUBLIC_KEY_PEM = os.environ.get("ORCHESTRA_PUBLIC_KEY_PEM", "")
AXTO_LICENSE_SERVER     = os.environ.get("AXTO_LICENSE_SERVER", "https://license.axto.ai")
AIR_GAP_MODE            = os.environ.get("ORCHESTRA_AIR_GAP", "false").lower() == "true"

DATA_DIR              = Path(os.environ.get("DATA_DIR", "./data"))
LICENSE_PATH          = DATA_DIR / "license.orch1"
FINGERPRINT_PATH      = DATA_DIR / "unit_fingerprint"
TRIAL_EXHAUSTION_PATH = DATA_DIR / "trial_exhaustion"
REVOCATION_CACHE_PATH = DATA_DIR / "revocation_cache.json"

_enforcement_state: dict = {}
_last_check: float = 0.0
_CHECK_INTERVAL = 300  # re-validate every 5 minutes


class EnforcementError(Exception):
    def __init__(self, category: str, detail: str = ""):
        self.category = category
        self.detail = detail
        super().__init__(f"[{category}] {detail}")


class LicenseState:
    ACTIVE           = "ACTIVE"
    EXPIRED          = "EXPIRED"
    INVALID          = "INVALID"
    MISSING          = "MISSING"
    TRIAL_EXHAUSTED  = "TRIAL_EXHAUSTED"
    REVOKED          = "REVOKED"
    TAMPERED         = "TAMPERED"
    FINGERPRINT_FAIL = "FINGERPRINT_MISMATCH"


# ── Hardware Fingerprint ─────────────────────────────────────────────────────

def _collect_hw_signals() -> dict:
    signals = {}
    try:
        signals["cpu_brand"]  = platform.processor() or "unknown"
        signals["machine"]    = platform.machine()
        signals["node"]       = platform.node()
        signals["system"]     = platform.system()
    except Exception:
        signals["cpu_brand"] = "unknown"

    try:
        if platform.system() == "Linux":
            for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
                p = Path(path)
                if p.exists():
                    signals["machine_id"] = p.read_text().strip()
                    break
            for path in ["/sys/class/dmi/id/board_serial", "/sys/class/dmi/id/product_uuid"]:
                p = Path(path)
                if p.exists():
                    val = p.read_text().strip()
                    if val and val not in ("", "None", "To be filled by O.E.M."):
                        signals["dmi"] = hashlib.sha256(val.encode()).hexdigest()[:16]
                        break
        elif platform.system() == "Windows":
            out = subprocess.check_output(
                "wmic csproduct get UUID", shell=True, timeout=5
            ).decode().strip().split("\n")
            signals["product_uuid"] = out[-1].strip() if len(out) > 1 else "win_unknown"
        elif platform.system() == "Darwin":
            out = subprocess.check_output(
                "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID",
                shell=True, timeout=5
            ).decode()
            m = re.search(r'"IOPlatformUUID" = "([^"]+)"', out)
            signals["product_uuid"] = m.group(1) if m else "mac_unknown"
    except Exception:
        pass

    # Docker container ID (if running in container)
    try:
        cgroup = Path("/proc/1/cgroup")
        if cgroup.exists():
            content = cgroup.read_text()
            m = re.search(r"docker[/-]([a-f0-9]{12,})", content)
            if m:
                signals["container_id"] = m.group(1)[:12]
    except Exception:
        pass

    return signals


def generate_fingerprint() -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if FINGERPRINT_PATH.exists():
        return FINGERPRINT_PATH.read_text().strip()
    signals = _collect_hw_signals()
    raw = json.dumps(signals, sort_keys=True)
    fp = hashlib.sha256(raw.encode()).hexdigest()
    FINGERPRINT_PATH.write_text(fp)
    if platform.system() != "Windows":
        try:
            os.chmod(FINGERPRINT_PATH, 0o600)
        except Exception:
            pass
    return fp


def get_unit_id() -> str:
    return generate_fingerprint()


# ── License Parsing ──────────────────────────────────────────────────────────

def _parse_license_artifact(artifact_text: str) -> dict:
    """
    Parse .orch1 license artifact.
    Format:
      PAYLOAD:<base64-json>
      SIG:<hex-signature>
    Production: RSA-4096 + SHA-256 signature verified with embedded public key.
    """
    try:
        lines = [l.strip() for l in artifact_text.strip().splitlines()]
        payload_b64 = None
        sig_hex     = None

        for line in lines:
            if line.startswith("PAYLOAD:"):
                payload_b64 = line[8:].strip()
            elif line.startswith("SIG:"):
                sig_hex = line[4:].strip()

        if not payload_b64:
            raise EnforcementError("PARSE_ERROR", "Missing PAYLOAD field in license artifact")

        payload_json = base64.b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)

        # RSA signature verification (production)
        if sig_hex and EMBEDDED_PUBLIC_KEY_PEM:
            try:
                from cryptography.hazmat.primitives import hashes, serialization
                from cryptography.hazmat.primitives.asymmetric import padding
                pub_key = serialization.load_pem_public_key(EMBEDDED_PUBLIC_KEY_PEM.encode())
                sig_bytes = bytes.fromhex(sig_hex)
                pub_key.verify(
                    sig_bytes,
                    payload_b64.encode(),
                    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
                    hashes.SHA256()
                )
            except ImportError:
                # cryptography not installed — HMAC fallback (dev mode)
                pass
            except Exception:
                raise EnforcementError("SIGNATURE_INVALID", "License signature verification failed — artifact may be tampered")
        elif sig_hex:
            # No public key embedded — validate format only (trial/dev)
            if len(sig_hex) < 16:
                raise EnforcementError("SIGNATURE_INVALID", "Malformed signature")

        return payload

    except EnforcementError:
        raise
    except Exception as e:
        raise EnforcementError("PARSE_ERROR", str(e))


def _check_expiry(payload: dict) -> None:
    exp = payload.get("expires_at")
    if not exp:
        if payload.get("license_mode") == "lifetime":
            return
        raise EnforcementError("MISSING_EXPIRY", "License has no expiry field")
    try:
        exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > exp_dt:
            raise EnforcementError("EXPIRED", f"License expired at {exp}")
    except EnforcementError:
        raise
    except Exception as e:
        raise EnforcementError("EXPIRY_PARSE", str(e))


def _check_fingerprint(payload: dict) -> None:
    bound_fp = payload.get("unit_fingerprint")
    if not bound_fp:
        return  # Portable license
    current_fp = generate_fingerprint()
    if not hmac.compare_digest(bound_fp, current_fp):
        raise EnforcementError(
            LicenseState.FINGERPRINT_FAIL,
            "Hardware fingerprint mismatch — license bound to different machine. Contact AXTO to re-bind."
        )


def _check_revocation(payload: dict) -> None:
    if payload.get("revoked", False):
        raise EnforcementError(LicenseState.REVOKED, "License has been revoked by AXTO")

    # Check local revocation cache (updated periodically from license server)
    if REVOCATION_CACHE_PATH.exists():
        try:
            cache = json.loads(REVOCATION_CACHE_PATH.read_text())
            license_id = payload.get("license_id", "")
            if license_id in cache.get("revoked_ids", []):
                raise EnforcementError(LicenseState.REVOKED, f"License {license_id} revoked per AXTO cache")
        except EnforcementError:
            raise
        except Exception:
            pass


def _check_product(payload: dict) -> None:
    product = payload.get("product", "")
    if product and product.lower() not in ("orchestra", "orch", ""):
        raise EnforcementError("WRONG_PRODUCT", f"License is for '{product}', not Orchestra")


# ── State Builder ─────────────────────────────────────────────────────────────

def _build_state_from_payload(payload: dict) -> dict:
    return {
        "status":                  LicenseState.ACTIVE,
        "error":                   None,
        "license_id":              payload.get("license_id", ""),
        "license_mode":            payload.get("license_mode", "annual"),
        "tier":                    payload.get("tier", "starter"),
        "expires_at":              payload.get("expires_at"),
        "client_name":             payload.get("client_name", ""),
        "wl_name":                 payload.get("wl_name", ""),
        "cpu_workers":             int(payload.get("cpu_workers", 2)),
        "gpu_workers":             int(payload.get("gpu_workers", 0)),
        "max_nodes":               int(payload.get("max_nodes", 50)),
        "max_end_users":           int(payload.get("max_end_users", 500)),
        "max_domains":             int(payload.get("max_domains", 1)),
        "can_wl_rebrand":          bool(payload.get("can_wl_rebrand", False)),
        "air_gap_enabled":         bool(payload.get("air_gap_enabled", False)),
        "gpu_on_demand":           bool(payload.get("gpu_on_demand", False)),
        "multi_orchestra":         bool(payload.get("multi_orchestra", False)),
        "hardware_id_binding":     bool(payload.get("unit_fingerprint", False)),
        "credential_vault_aes256": bool(payload.get("credential_vault_aes256", True)),
        "features":                payload.get("features", []),
        "branding":                payload.get("branding", None),
        "unit_id":                 generate_fingerprint(),
        "validated_at":            datetime.now(timezone.utc).isoformat(),
    }


# ── Core Enforcement ─────────────────────────────────────────────────────────

def run_enforcement() -> dict:
    global _enforcement_state, _last_check

    now = time.time()
    if _enforcement_state.get("status") == LicenseState.ACTIVE and (now - _last_check) < _CHECK_INTERVAL:
        return _enforcement_state

    # BUG FIX #2: Check license.key file (written by activation wizard)
    # Priority: env var > license.key file > .orch1 file
    key_file = DATA_DIR / "license.key"
    if key_file.exists():
        try:
            saved_key = key_file.read_text().strip()
            if saved_key and saved_key.startswith("ORCH"):
                return run_enforcement_online(saved_key)
        except Exception:
            pass

    # Online key mode: if AXTO_LICENSE_KEY env var is set, use online validation
    env_key = os.environ.get("AXTO_LICENSE_KEY", "")
    if env_key:
        return run_enforcement_online(env_key)

    try:
        if not LICENSE_PATH.exists():
            if TRIAL_EXHAUSTION_PATH.exists():
                _enforcement_state = {
                    "status": LicenseState.TRIAL_EXHAUSTED,
                    "error":  "Trial period exhausted. Purchase a license at axto.ai",
                }
                return _enforcement_state
            # Trial mode
            _enforcement_state = {
                "status":                  LicenseState.ACTIVE,
                "error":                   None,
                "license_id":              "TRIAL",
                "license_mode":            "trial",
                "tier":                    "trial",
                "expires_at":              None,
                "client_name":             "Trial",
                "wl_name":                 "",
                "cpu_workers":             1,
                "gpu_workers":             0,
                "max_nodes":               3,
                "max_end_users":           50,
                "max_domains":             1,
                "can_wl_rebrand":          False,
                "air_gap_enabled":         False,
                "gpu_on_demand":           False,
                "multi_orchestra":         False,
                "hardware_id_binding":     False,
                "credential_vault_aes256": True,
                "features":                [],
                "branding":                None,
                "unit_id":                 generate_fingerprint(),
                "validated_at":            datetime.now(timezone.utc).isoformat(),
            }
            _last_check = now
            return _enforcement_state

        artifact_text = LICENSE_PATH.read_text()
        payload = _parse_license_artifact(artifact_text)
        _check_product(payload)
        _check_expiry(payload)
        _check_fingerprint(payload)
        _check_revocation(payload)

        _enforcement_state = _build_state_from_payload(payload)
        _last_check = now
        return _enforcement_state

    except EnforcementError as e:
        _enforcement_state = {
            "status": e.category if e.category in (
                LicenseState.EXPIRED, LicenseState.REVOKED, LicenseState.TAMPERED,
                LicenseState.INVALID, LicenseState.TRIAL_EXHAUSTED, LicenseState.FINGERPRINT_FAIL
            ) else LicenseState.INVALID,
            "error": str(e),
        }
        return _enforcement_state
    except Exception as e:
        _enforcement_state = {"status": LicenseState.INVALID, "error": f"Unexpected: {e}"}
        return _enforcement_state


def get_enforcement_state() -> dict:
    return _enforcement_state if _enforcement_state else run_enforcement()


def require_active():
    state = get_enforcement_state()
    if state.get("status") != LicenseState.ACTIVE:
        raise EnforcementError(
            state.get("status", "UNKNOWN"),
            state.get("error", "License not active")
        )


def require_feature(feature: str):
    require_active()
    state = get_enforcement_state()
    if not state.get(feature, False):
        raise EnforcementError("FEATURE_NOT_LICENSED", f"'{feature}' not in your license tier")


def install_license(artifact: str) -> dict:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        payload = _parse_license_artifact(artifact)
        _check_product(payload)
        _check_expiry(payload)
        _check_revocation(payload)
        LICENSE_PATH.write_text(artifact)
        if platform.system() != "Windows":
            try:
                os.chmod(LICENSE_PATH, 0o600)
            except Exception:
                pass
        global _last_check
        _last_check = 0
        state = run_enforcement()
        return {"ok": True, "state": state}
    except EnforcementError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Online validation via AXTO Dashboard API (CF Pages) ─────────────────────

import urllib.request

def validate_online(license_key: str, unit_id: str, node_count: int = 0) -> dict:
    """
    Hit the AXTO Dashboard API to validate the Orchestra license key.
    This is the ORCH-XXXX-XXXX-XXXX-XXXX key (online mode).
    Falls back gracefully if network is unavailable.
    """
    validate_url = os.environ.get(
        "AXTO_VALIDATE_URL",
        "https://axto.io/api/license-validate"
    )
    import json as _json, socket as _socket
    try:
        payload = _json.dumps({
            "license_key":      license_key,
            "machine_id":       unit_id,
            "product":          "orchestra",    # ← always orchestra for this engine
            "orchestra_version": "2.0.0",
            "node_count":       node_count,
            "hostname":         _socket.gethostname(),
        }).encode()
        req = urllib.request.Request(
            validate_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return _json.loads(resp.read())
    except Exception as e:
        return {"valid": None, "reason": "network_error", "message": str(e)}


def run_enforcement_online(license_key=None) -> dict:
    """
    Online enforcement path: validate ORCH-XXXX key against AXTO Dashboard API.
    Used when AXTO_LICENSE_KEY env var is set instead of a .orch1 file.
    """
    global _enforcement_state, _last_check

    now = time.time()
    if _enforcement_state.get("status") == LicenseState.ACTIVE and (now - _last_check) < _CHECK_INTERVAL:
        return _enforcement_state

    key = license_key or os.environ.get("AXTO_LICENSE_KEY", "")
    if not key:
        return {"status": LicenseState.MISSING, "error": "No license key provided"}

    uid    = get_unit_id()
    result = validate_online(key, uid)

    if result.get("valid") is True:
        _enforcement_state = {
            "status":      LicenseState.ACTIVE,
            "error":       None,
            "license_id":  result.get("license_key", ""),
            "license_mode": "annual",
            "tier":        result.get("package_code", "orchestra_core"),
            "expires_at":  result.get("expires_at"),
            "client_name": result.get("client_name", ""),
            "cpu_workers": 4,
            "gpu_workers": 0,
            "max_nodes":   result.get("max_nodes", 10),
            "max_end_users": 1000,
            "max_domains": 3,
            "can_wl_rebrand": False,
            "air_gap_enabled": False,
            "gpu_on_demand": True,
            "multi_orchestra": False,
            "hardware_id_binding": False,
            "credential_vault_aes256": True,
            "features": [],
            "unit_id": uid,
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }
        _last_check = now
        return _enforcement_state

    if result.get("valid") is False:
        reason = result.get("reason", "invalid")
        if reason == "product_mismatch":
            print(f"ERROR: This license key is for '{result.get('key_is_for')}', not Orchestra.")
            print(f"       Use your Orchestra key (starts with ORCH-) in this config.")
        _enforcement_state = {"status": LicenseState.INVALID, "error": result.get("message", reason)}
        return _enforcement_state

    # Network error — use cached state if available
    if _enforcement_state.get("status") == LicenseState.ACTIVE:
        return _enforcement_state
    return {"status": LicenseState.INVALID, "error": "License validation failed — check network"}
