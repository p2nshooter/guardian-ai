# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — licence enforcement (v3).

Single source of truth: the Ed25519-signed answer from axto.io, verified by
license.LicenseValidator — the same protocol every AXTO engine uses (signature,
key + installation + request-nonce binding, 4-hour verified offline grace).

Paid licences only. There is no trial mode and no unsigned licence file:
without a valid ORCH- key the API stays locked and the console shows the
activation page.

Key sources, first match wins:
  1. AXTO_LICENSE_KEY (environment, or `license_key` in orchestra.yml)
  2. DATA_DIR/license.key (written by the activation page)
"""
import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import license as _lic

log = logging.getLogger("orchestra.enforcement")

DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
KEY_FILE = DATA_DIR / "license.key"
UNLIMITED = 1_000_000

_validator: Optional[_lic.LicenseValidator] = None
_heartbeat: Optional[asyncio.Task] = None
_pending_error = "No licence key — activate Orchestra with your ORCH- key from https://axto.io/app/self-hosted"


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
    REVOKED          = "REVOKED"
    SUSPENDED        = "SUSPENDED"
    FINGERPRINT_FAIL = "FINGERPRINT_MISMATCH"
    UNREACHABLE      = "UNREACHABLE"


_REASON_STATUS = {
    "expired": LicenseState.EXPIRED, "revoked": LicenseState.REVOKED,
    "suspended": LicenseState.SUSPENDED, "program_ended": LicenseState.EXPIRED,
    "machine_mismatch": LicenseState.FINGERPRINT_FAIL, "no_license_key": LicenseState.MISSING,
    "server_unreachable_no_verified_cache": LicenseState.UNREACHABLE,
}


def get_unit_id() -> str:
    """Stable installation id (persisted in the data volume) — also the key
    the credential vault derives its master key from."""
    return _lic.machine_id()


def configured_key() -> str:
    env = os.environ.get("AXTO_LICENSE_KEY", "").strip().upper()
    if env and "XXXX" not in env:
        return env
    try:
        saved = KEY_FILE.read_text().strip().upper()
        if saved.startswith("ORCH-"):
            return saved
    except Exception:
        pass
    return ""


def _limit(v, default: int) -> int:
    try:
        n = int(v)
    except (TypeError, ValueError):
        return default
    return UNLIMITED if n < 0 else n


def get_enforcement_state() -> dict:
    """Current licence state as a plain dict (never blocks, never calls out)."""
    state = _validator.current_state() if _validator else None
    if state is None:
        return {"status": LicenseState.MISSING, "error": _pending_error, "unit_id": get_unit_id()}
    if not _validator.is_operational():
        status = _REASON_STATUS.get(state.reason, LicenseState.INVALID)
        return {
            "status": status,
            "error": state.message or state.reason or "Licence not valid",
            "reason": state.reason,
            "unit_id": get_unit_id(),
            "manage_url": "https://axto.io/app/self-hosted",
        }
    f = state.features or {}
    workers = _limit(f.get("max_workers", state.max_nodes), 1)
    return {
        "status":        LicenseState.ACTIVE,
        "error":         None,
        "reason":        state.reason,              # "offline_grace" while axto.io is unreachable
        "license_id":    configured_key()[:14],
        "license_mode":  "lifetime" if state.reason == "lifetime_offline" else "subscription",
        "tier":          state.package or "orchestra_unlimited",
        "expires_at":    state.expires_at,
        "client_name":   "",
        "wl_name":       "",
        "cpu_workers":   workers,
        "gpu_workers":   workers if f.get("gpu_workers", True) else 0,
        "max_nodes":     _limit(state.max_nodes, 1),
        "features":      sorted(k for k, v in f.items() if v is True),
        "branding":      None,
        "unit_id":       get_unit_id(),
        "grace_remaining_min": state.grace_remaining_min if state.reason == "offline_grace" else None,
        "validated_at":  datetime.fromtimestamp(state.last_validated or 0, tz=timezone.utc).isoformat(),
    }


def run_enforcement() -> dict:
    return get_enforcement_state()


def require_active():
    state = get_enforcement_state()
    if state.get("status") != LicenseState.ACTIVE:
        raise EnforcementError(state.get("status", "UNKNOWN"), state.get("error") or "Licence not active")


MANAGE_URL = "https://axto.io/app/self-hosted"

# What each switchable feature is called on screen (editions: dashboard/lib/editions.ts).
FEATURE_NAMES = {"autoscaler": "Autoscaling", "federation": "Federation", "cost_analytics": "Cost analytics",
                 "gpu_workers": "GPU workers"}


def has_feature(feature: str) -> bool:
    """A feature is included unless the signed licence switches it off. Lower
    editions carry `<feature>=false` (Starter: autoscaler, federation,
    cost_analytics); top editions and older licences simply list everything."""
    if _validator is None or not _validator.is_operational():
        return False
    state = _validator.current_state()
    return (state.features or {}).get(feature, True) is not False if state else False


def require_feature(feature: str):
    require_active()
    if not has_feature(feature):
        name = FEATURE_NAMES.get(feature, feature)
        raise EnforcementError("FEATURE_NOT_LICENSED",
                               f"{name} is not included in your edition ({get_enforcement_state().get('tier')}). "
                               f"Upgrade at {MANAGE_URL}")


def worker_counts(workers) -> dict:
    """Workers per type, as registered in the workers table (column worker_type). A worker
    paused for heat or draining still holds its slot; only offline ones (no heartbeat) do not."""
    out = {"cpu": 0, "gpu": 0}
    for w in workers:
        t = w.get("worker_type")
        if t in out and w.get("status", "active") != "offline":
            out[t] += 1
    return out


def worker_limit(worker_type: str) -> int:
    state = get_enforcement_state()
    return int(state.get("gpu_workers" if worker_type == "gpu" else "cpu_workers", 0) or 0)


def check_worker_slot(worker_type: str, workers) -> None:
    """Refuse a new worker beyond the edition's limit (Starter 10, Professional 50, Enterprise unlimited)."""
    require_active()
    if worker_type not in ("cpu", "gpu"):
        raise EnforcementError("BAD_WORKER_TYPE", f"Unknown worker type '{worker_type}' (cpu or gpu)")
    if worker_type == "gpu" and not has_feature("gpu_workers"):
        require_feature("gpu_workers")
    used, limit = worker_counts(workers)[worker_type], worker_limit(worker_type)
    if used >= limit:
        raise EnforcementError("WORKER_LIMIT",
                               f"{worker_type.upper()} worker limit reached ({used}/{limit} for your edition). "
                               f"Remove an idle worker or upgrade at {MANAGE_URL}")


async def _use_key(key: str) -> dict:
    global _validator, _heartbeat, _pending_error
    old = _validator
    _validator = _lic.LicenseValidator({"license_key": key})
    await _validator.validate(force=True)
    if old is not None:
        await old.close()
    if _heartbeat is None or _heartbeat.done():
        _heartbeat = asyncio.create_task(_heartbeat_loop())
    return get_enforcement_state()


async def _heartbeat_loop():
    # One loop for the life of the process; it always follows the current validator.
    while True:
        await asyncio.sleep(_lic.HEARTBEAT_SECS)
        try:
            if _validator is not None:
                await _validator.validate(force=True)
                if not _validator.is_operational():
                    log.warning(f"Licence not operational: {get_enforcement_state().get('error')}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            log.warning(f"Licence heartbeat error: {e}")


async def start() -> dict:
    """Called once at startup."""
    key = configured_key()
    if not key and not _lic.offline_activation():
        log.warning(_pending_error)
        log.warning(_lic.offline_hint())
        return get_enforcement_state()
    return await _use_key(key)   # "" = Lifetime offline activation file


async def activate(key: str) -> dict:
    """Activation page: validate a key online; persist it only when valid."""
    key = (key or "").strip().upper()
    if not key.startswith("ORCH-"):
        return {"ok": False, "error": "This is not an Orchestra key — Orchestra keys start with ORCH-."}
    state = await _use_key(key)
    if state.get("status") != LicenseState.ACTIVE:
        return {"ok": False, "error": state.get("error"), "reason": state.get("reason"), "unit_id": state.get("unit_id")}
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        KEY_FILE.write_text(key)
        os.chmod(KEY_FILE, 0o600)
    except Exception as e:
        log.warning(f"Could not persist licence key: {e}")
    return {"ok": True, "state": state}


def install_license(artifact: str) -> dict:
    return {"ok": False, "error": "Licence files are not used by this version. Activate with your ORCH- key from https://axto.io/app/self-hosted."}
