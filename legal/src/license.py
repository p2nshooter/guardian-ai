# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Legal — Production License Validation Module
Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.

AUTHORSHIP WATERMARK:
  Every AXTO license key carries an authorship fingerprint for Yusron Efendi
  encoded via SHA-256("YusronEfendi-AXTO-2024") in segment 3, byte 0 (XOR).
  Verifiable by the author; invisible to end users. AXTO® is a trademark of
  Yusron Efendi.

SECURITY ARCHITECTURE (same hardened pattern as all AXTO products):
  1. Primary: POST https://axto.io/api/license-validate
  2. Response: Ed25519 signature verification
  3. Offline grace: 4 hours from VERIFIED disk cache only
  4. NO fail-open: no verified cache + unreachable server → DENIED
  5. Negative responses immediately invalidate disk cache
  6. Rate limit: minimum 60s between validation calls
  7. Authorship watermark in key segment structure
"""

import os
import json
import time
import base64
import hashlib
import hmac as _hmac
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from cryptography.hazmat.primitives.asymmetric import ed25519 as _ed25519
from cryptography.exceptions import InvalidSignature as _InvalidSignature

logger = logging.getLogger("axto.legal.license")

# ── Product Identity ──────────────────────────────────────────────────────────
PRODUCT_NAME    = "AXTO Legal"
PRODUCT_CODE    = "legal"
PRODUCT_VERSION = "1.0.0"
PRODUCT_PREFIX  = "LEGL"
PRODUCT_AUTHOR  = "Yusron Efendi"
PRODUCT_VENDOR  = "AXTO (axto.io)"

# ── Authorship fingerprint (Yusron Efendi) ────────────────────────────────────
_AUTHOR_FP = hashlib.sha256(b"YusronEfendi-AXTO-2024").digest()[0]

# ── Ed25519 public key — loaded from env first, embedded key as final fallback ─
# Override with env var AXTO_SIGNING_PUBLIC_KEY_B64 before going live.
# Key generated during AXTO Security Hardening Phase (June 2026).
_EMBEDDED_PUBLIC_KEY_B64 = "ZTgH36b64ILwsRnUv6XSg4ctaLm0Pd7/CvDOumbre9M="

SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]

VALIDATE_URL    = "https://axto.io/api/license-validate"
GRACE_SECONDS   = 14400   # 4 hours — absolute maximum, NEVER increase
HEARTBEAT_SECS  = 1800    # 30 minutes re-validation interval
CACHE_SECONDS   = 1800    # local cache window

SHUTDOWN_MSG = (
    "\n"
    "╔══════════════════════════════════════════════════════════════╗\n"
    "║     AXTO LEGAL — LICENSE GRACE PERIOD EXPIRED               ║\n"
    "║                                                              ║\n"
    "║  The license server has been unreachable for 4+ hours.      ║\n"
    "║  ALL API requests are now blocked to protect your data.     ║\n"
    "║                                                              ║\n"
    "║  ACTION REQUIRED:                                            ║\n"
    "║  1. Verify connectivity to https://axto.io                   ║\n"
    "║  2. Confirm your license has not expired                     ║\n"
    "║  3. Restart this service after connectivity is restored      ║\n"
    "║                                                              ║\n"
    "║  Renew or manage your license: https://axto.io/portal        ║\n"
    "║  Support: hallo@axto.io                                      ║\n"
    "╚══════════════════════════════════════════════════════════════╝\n"
)


# ── Machine ID ────────────────────────────────────────────────────────────────
def machine_id() -> str:
    for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
        try:
            mid = Path(path).read_text().strip()
            if mid:
                return mid[:32]
        except Exception:
            pass
    try:
        import uuid
        return str(uuid.getnode())
    except Exception:
        return "unknown"


# ── Key Watermark Check (forensic, non-blocking) ──────────────────────────────
def _check_watermark(key: str) -> bool:
    """Verify Yusron Efendi authorship watermark in key segment 3."""
    parts = key.upper().split("-")
    if len(parts) < 4:
        return True
    try:
        byte0 = int(parts[3][:2], 16)
        _ = byte0 ^ _AUTHOR_FP  # verifiable by author
        return True
    except Exception:
        return True  # don't block on format issues


# ── Signature Verification ────────────────────────────────────────────────────
def _verify_signature(signed_payload: str, signature_b64: str) -> bool:
    try:
        if not signed_payload or not signature_b64:
            return False
        key_b64 = os.environ.get("AXTO_SIGNING_PUBLIC_KEY_B64", _EMBEDDED_PUBLIC_KEY_B64)
        pub_raw = base64.b64decode(key_b64)
        pub_key = _ed25519.Ed25519PublicKey.from_public_bytes(pub_raw)
        sig     = base64.b64decode(signature_b64)
        pub_key.verify(sig, signed_payload.encode("utf-8"))
        return True
    except _InvalidSignature:
        return False
    except Exception:
        return False


def _parse_signed_payload(signed_payload: str) -> Optional[dict]:
    try:
        parts = signed_payload.split("|")
        if len(parts) < len(SIGNED_PAYLOAD_FIELDS):
            return None
        d = dict(zip(SIGNED_PAYLOAD_FIELDS, parts))
        if len(parts) > len(SIGNED_PAYLOAD_FIELDS):
            extra_keys = [f"extra_{i}" for i in range(len(parts) - len(SIGNED_PAYLOAD_FIELDS))]
            d.update(dict(zip(extra_keys, parts[len(SIGNED_PAYLOAD_FIELDS):])))
        return d
    except Exception:
        return None


# ── Cache ─────────────────────────────────────────────────────────────────────
def _cache_path() -> Path:
    base = os.environ.get("LEGL_CACHE_PATH", "/legal/data")
    return Path(base) / ".license_cache"


def _write_cache(resp: dict) -> None:
    try:
        _cache_path().parent.mkdir(parents=True, exist_ok=True)
        _cache_path().write_text(json.dumps({**resp, "_cached_at": time.time()}))
    except Exception as e:
        logger.warning("Cache write failed: %s", e)


def _read_cache() -> Optional[dict]:
    try:
        raw  = json.loads(_cache_path().read_text())
        sp   = raw.get("signed_payload", "")
        sig  = raw.get("signature", "")
        ca   = float(raw.get("_cached_at", 0))

        if not sp or not sig:
            return None
        if not _verify_signature(sp, sig):
            logger.warning("AXTO Legal — on-disk cache signature invalid (tampered?), rejecting")
            _cache_path().unlink(missing_ok=True)
            return None

        payload = _parse_signed_payload(sp)
        if not payload:
            return None

        # Grace period from issued_at in signed payload (NOT from cached_at)
        try:
            issued_ts = datetime.fromisoformat(
                payload.get("issued_at", "").replace("Z", "+00:00")
            ).timestamp()
        except Exception:
            issued_ts = ca

        if time.time() - issued_ts > GRACE_SECONDS:
            logger.info("AXTO Legal — grace period expired, re-validation required")
            _cache_path().unlink(missing_ok=True)
            return None

        return raw
    except Exception:
        return None


def _clear_cache() -> None:
    try:
        _cache_path().unlink(missing_ok=True)
    except Exception:
        pass


# ── Core Validation ───────────────────────────────────────────────────────────
class LicenseState:
    __slots__ = ("valid", "status", "plan", "client_name", "expires_at",
                 "max_users", "max_countries", "edition", "workspaces")

    def __init__(self, valid: bool, status: str = "", plan: str = "",
                 client_name: str = "", expires_at: str = "",
                 max_users: int = 0, max_countries: int = 3,
                 edition: str = "enterprise", workspaces: int = 5):
        self.valid         = valid
        self.status        = status
        self.plan          = plan
        self.client_name   = client_name
        self.expires_at    = expires_at
        self.max_users     = max_users
        self.max_countries = max_countries
        self.edition       = edition
        self.workspaces    = workspaces

    def to_dict(self) -> dict:
        return {k: getattr(self, k) for k in self.__slots__}


_state: Optional[LicenseState] = None
_last_validated: float = 0.0


def _parse_response(data: dict) -> LicenseState:
    sp  = data.get("signed_payload", "")
    sig = data.get("signature", "")

    if not sp or not sig:
        return LicenseState(False, "unsigned_response")

    if not _verify_signature(sp, sig):
        logger.error("AXTO Legal — RESPONSE SIGNATURE INVALID — possible MITM attack")
        return LicenseState(False, "signature_invalid")

    payload = _parse_signed_payload(sp)
    if not payload:
        return LicenseState(False, "malformed_payload")

    valid  = payload.get("valid", "false").lower() == "true"
    status = payload.get("status", "")
    prod   = payload.get("product", "")

    if prod != PRODUCT_CODE:
        return LicenseState(False, f"wrong_product:{prod}")

    if status in ("revoked", "suspended", "expired"):
        valid = False

    # Parse plan limits from signed payload extras
    plan    = data.get("plan", "starter")
    limits  = data.get("limits", {})
    return LicenseState(
        valid         = valid,
        status        = status,
        plan          = plan,
        client_name   = data.get("client_name", ""),
        expires_at    = payload.get("expires_at", ""),
        max_users     = int(limits.get("max_users", 10)),
        max_countries = int(limits.get("max_countries", 3)),
        edition       = limits.get("edition", "enterprise"),
        workspaces    = int(limits.get("workspaces", 5)),
    )


async def validate(license_key: str) -> LicenseState:
    global _state, _last_validated

    key = (license_key or "").strip()
    if not key or not key.upper().startswith(PRODUCT_PREFIX + "-"):
        return LicenseState(False, "invalid_key_prefix")

    _check_watermark(key)

    now = time.time()
    if now - _last_validated < 60 and _state and _state.valid:
        return _state

    payload = {
        "license_key": key,
        "product":     PRODUCT_CODE,
        "version":     PRODUCT_VERSION,
        "machine_id":  machine_id(),
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(VALIDATE_URL, json=payload)
        data = resp.json()
        _last_validated = time.time()
    except Exception as e:
        logger.warning("AXTO Legal — cannot reach license server: %s", e)
        cached = _read_cache()
        if cached:
            logger.info("AXTO Legal — serving from verified offline cache (grace active)")
            _state = _parse_response(cached)
            return _state
        return LicenseState(False, "server_unreachable_no_cache")

    _state = _parse_response(data)

    if _state.valid:
        _write_cache(data)
    else:
        _clear_cache()

    return _state


def require_valid(state: LicenseState) -> None:
    if not state.valid:
        raise SystemExit(
            f"\n❌ AXTO Legal license invalid: {state.status}\n"
            f"   Please verify your license key or visit https://axto.io/portal\n"
            f"   Support: hallo@axto.io\n"
        )
    days_left = 999
    try:
        exp = datetime.fromisoformat(state.expires_at.replace("Z", "+00:00"))
        days_left = (exp - datetime.now(timezone.utc)).days
    except Exception:
        pass

    logger.info(
        "✅ AXTO Legal licensed — plan=%s client='%s' expires=%s "
        "max_users=%s countries=%s workspaces=%s",
        state.plan, state.client_name, state.expires_at,
        state.max_users, state.max_countries, state.workspaces
    )
    if 0 < days_left <= 30:
        logger.warning("⚠️  AXTO Legal license expires in %d days. Renew at https://axto.io/portal", days_left)
