# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO AI STUDIO — License Enforcement Module v1.1 (HARDENED)
================================================================
PRODUCTION SECURITY NOTICE — READ BEFORE MODIFYING:
  ❌ Do NOT add bypass conditions, env-var overrides, or debug modes
  ❌ Do NOT remove or weaken validation calls
  ❌ Do NOT increase GRACE_SECONDS above 14400 (4 hours)
  ❌ Do NOT add SKIP_LICENSE, DEV_MODE, or similar env checks
  ✅ Product key prefix mismatch = HARD REJECTION, no fallback
  ✅ Machine ID binding enforced server-side by axto.io
  ✅ Heartbeat every 30 minutes — grace expires after 4h
  ✅ After grace expiry: ALL requests blocked, engine shuts down
  ✅ HARDENED v1.1: every server response is Ed25519-signature-verified
     before being trusted, and grace periods are backed by a persisted,
     re-verified signed proof — NOT granted on first contact failure with
     no prior verified success. See AXTO_Security_Hardening_Report.pdf.

Copyright © AXTO Platform. All rights reserved.
"""
from __future__ import annotations
import asyncio, base64, hashlib, json, logging, os, signal, socket, sys, time, uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import httpx
from cryptography.hazmat.primitives.asymmetric import ed25519 as _ed25519
from cryptography.exceptions import InvalidSignature as _InvalidSignature

log = logging.getLogger("ai_studio.license")

PRODUCT         = "ai-studio"
PRODUCT_PREFIX  = "AIST"
VERSION         = "1.1.0"
VALIDATE_URL    = "https://axto.io/api/license-validate"
GRACE_SECONDS   = 14400
HEARTBEAT_SECS  = 1800
CACHE_SECONDS   = 1800
SHUTDOWN_MSG    = (
    "\n"
    "╔══════════════════════════════════════════════════════════════╗\n"
    "║     AXTO AI STUDIO — LICENSE GRACE PERIOD EXPIRED             ║\n"
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

# ── Response signature verification (HARDENING) ──────────────────────────────
# ⚠️  DEMO KEYPAIR — regenerate before production use (see
#     dashboard/lib/license-signing.ts header comment).
AXTO_LICENSE_PUBLIC_KEY_B64 = "ZTgH36b64ILwsRnUv6XSg4ctaLm0Pd7/CvDOumbre9M="
SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]


def machine_id() -> str:
    try:
        for candidate in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
            if os.path.exists(candidate):
                raw = open(candidate).read().strip()
                if raw:
                    return hashlib.sha256(raw.encode()).hexdigest()[:32]
        raw = socket.gethostname() + str(uuid.getnode())
        return hashlib.sha256(raw.encode()).hexdigest()[:32]
    except Exception:
        return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:32]


# ── Signed-response verification & local proof cache (HARDENING) ────────────

def _verify_signature(signed_payload: str, signature_b64: str) -> bool:
    """Verifies an Ed25519 signature using the embedded AXTO platform public
    key. Returns False on ANY problem — never raises. Callers must treat
    False exactly like "could not reach the server"."""
    try:
        if not signed_payload or not signature_b64:
            return False
        pub_raw = base64.b64decode(AXTO_LICENSE_PUBLIC_KEY_B64)
        pub_key = _ed25519.Ed25519PublicKey.from_public_bytes(pub_raw)
        sig = base64.b64decode(signature_b64)
        pub_key.verify(sig, signed_payload.encode("utf-8"))
        return True
    except _InvalidSignature:
        return False
    except Exception:
        return False


def _parse_signed_payload(signed_payload: str) -> Optional[dict]:
    parts = (signed_payload or "").split("|")
    if len(parts) < len(SIGNED_PAYLOAD_FIELDS):
        return None
    d = dict(zip(SIGNED_PAYLOAD_FIELDS, parts))
    # Forward-compatible: tolerate extra trailing segments (e.g. the signed
    # entitlements segment appended by newer issuers). Signature verification
    # runs over the received payload string as-is, so the original field order
    # is untouched; the extras are captured as extra_0, extra_1, ...
    if len(parts) > len(SIGNED_PAYLOAD_FIELDS):
        d.update({f"extra_{i}": v for i, v in enumerate(parts[len(SIGNED_PAYLOAD_FIELDS):])})
    return d


def _cache_path() -> str:
    state_dir = os.environ.get("AXTO_STATE_DIR", "").strip()
    candidates = [state_dir] if state_dir else ["/var/lib/axto", os.path.expanduser("~/.axto")]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            os.makedirs(candidate, exist_ok=True)
            return os.path.join(candidate, f"{PRODUCT}.license.cache.json")
        except Exception:
            continue
    return f"./{PRODUCT}.license.cache.json"


def _save_cache(signed_payload: str, signature: str) -> None:
    try:
        path = _cache_path()
        with open(path, "w") as f:
            json.dump({"signed_payload": signed_payload, "signature": signature}, f)
        try:
            os.chmod(path, 0o600)
        except Exception:
            pass
    except Exception as e:
        log.warning(f"Could not persist license cache: {e}")


def _clear_cache() -> None:
    try:
        path = _cache_path()
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def _load_verified_cache(expected_key: str, expected_machine_id: str) -> Optional[dict]:
    try:
        path = _cache_path()
        if not os.path.exists(path):
            return None
        with open(path) as f:
            raw = json.load(f)
        signed_payload = raw.get("signed_payload", "")
        signature = raw.get("signature", "")
        if not _verify_signature(signed_payload, signature):
            log.critical(
                "Cached license proof failed signature verification — "
                "ignoring (file may be corrupted, tampered, or signed by "
                "an old/rotated key)."
            )
            return None
        fields = _parse_signed_payload(signed_payload)
        if not fields:
            return None
        if fields["license_key"] != expected_key:
            log.warning("Cached license proof is for a different license_key — ignoring.")
            return None
        if expected_machine_id and fields["machine_id"] and fields["machine_id"] != expected_machine_id:
            log.critical("Cached license proof is bound to a different machine_id — ignoring.")
            return None
        return fields
    except Exception as e:
        log.warning(f"Could not load license cache: {e}")
        return None


@dataclass
class LicenseState:
    key: str = ""
    valid: bool = False
    product: str = ""
    plan: str = "starter"
    max_nodes: int = 1
    expires_at: str = ""
    machine_bound: bool = False
    last_check: float = 0.0
    last_success: float = 0.0
    grace_active: bool = False
    error: str = ""


_state = LicenseState()
_lock = asyncio.Lock()


def get_state() -> LicenseState:
    return _state


def is_valid() -> bool:
    if not _state.valid:
        return False
    if _state.grace_active and (time.time() - _state.last_success > GRACE_SECONDS):
        log.critical(SHUTDOWN_MSG)
        return False
    return True


async def validate_license(license_key: str) -> LicenseState:
    global _state
    async with _lock:
        _state.key = license_key.strip().upper()
        _state.last_check = time.time()

        if not _state.key.startswith(PRODUCT_PREFIX + "-"):
            _state.valid = False
            _state.error = f"Invalid license key prefix. Expected {PRODUCT_PREFIX}-XXXX-... for AXTO AI STUDIO."
            log.error(f"License rejected: wrong prefix. Got '{_state.key[:10]}...', expected '{PRODUCT_PREFIX}-'")
            return _state

        mid = machine_id()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(VALIDATE_URL, json={
                    "license_key": _state.key,
                    "product": PRODUCT,
                    "machine_id": mid,
                    "version": VERSION,
                    "hostname": socket.gethostname(),
                })
                data = resp.json()

            # ── HARDENING: verify the Ed25519 signature BEFORE trusting
            # anything in `data`. A response with a missing or invalid
            # signature is treated exactly like an unreachable server —
            # this is what stops a rogue DNS entry / fake axto.io / MITM
            # proxy from being able to hand-craft {"valid": true} and be
            # believed.
            sig_payload = data.get("signed_payload", "")
            sig = data.get("signature", "")
            if not _verify_signature(sig_payload, sig):
                log.critical(
                    "AXTO AI STUDIO — RESPONSE SIGNATURE INVALID. This response "
                    "did NOT come from a genuine, unmodified axto.io license "
                    "server. Treating as unreachable."
                )
                raise httpx.TransportError("signature_verification_failed")
            signed_fields = _parse_signed_payload(sig_payload)
            if not signed_fields or signed_fields.get("license_key") != _state.key:
                log.critical("AXTO AI STUDIO — SIGNED RESPONSE FIELD MISMATCH. Treating as unreachable.")
                raise httpx.TransportError("signed_field_mismatch")

            # ── HARDENING: the valid/expires_at/product fields used below MUST
            # come from the SIGNED canonical string, never from the
            # surrounding JSON dict — see AXTO_Security_Hardening_Report.pdf
            # §3.2 for why (a MITM proxy can rewrite `data` freely without
            # invalidating the signature, since only `sig_payload` itself was
            # actually signed).
            data["valid"] = (signed_fields.get("valid") == "true")
            if signed_fields.get("expires_at"):
                data["expires_at"] = signed_fields["expires_at"]
            if signed_fields.get("product"):
                data["product"] = signed_fields["product"]

            if resp.status_code == 200 and data.get("valid"):
                _state.valid = True
                _state.product = data.get("product", PRODUCT)
                _state.plan = data.get("plan", data.get("package_code", "starter"))
                _state.max_nodes = data.get("max_nodes", 1)
                _state.expires_at = data.get("expires_at", "")
                _state.machine_bound = True
                _state.last_success = time.time()
                _state.grace_active = False
                _state.error = ""
                _save_cache(sig_payload, sig)
                log.info(f"✅ License validated: {_state.plan} | Expires: {_state.expires_at}")
            else:
                _state.valid = False
                _state.error = data.get("error", "Validation failed")
                _clear_cache()
                log.warning(f"❌ License invalid: {_state.error}")

        except Exception as e:
            # ── HARDENING: grace is ONLY granted from a cryptographically
            # signed proof that was verified on a PREVIOUS successful
            # contact with axto.io and persisted to disk — never merely
            # because "_state.last_success > 0 in THIS process's memory."
            # The original design already refused grace on a fresh
            # in-memory state (good instinct), but lost that protection on
            # every process restart, since _state reset to defaults each
            # time. Backing grace with a signed, on-disk, re-verified proof
            # closes that gap while remaining MORE resilient for genuinely
            # licensed customers across routine restarts. See
            # AXTO_Security_Hardening_Report.pdf §3.1.
            cached = _load_verified_cache(_state.key, mid)
            now = time.time()
            granted = False
            if cached and cached.get("valid") == "true":
                try:
                    issued_ts = datetime.fromisoformat(cached["issued_at"].replace("Z", "+00:00")).timestamp()
                except Exception:
                    issued_ts = 0.0
                try:
                    cached_expires_ts = (
                        datetime.fromisoformat(cached["expires_at"].replace("Z", "+00:00")).timestamp()
                        if cached.get("expires_at") else None
                    )
                except Exception:
                    cached_expires_ts = None

                within_grace_window = issued_ts > 0 and (now - issued_ts) <= GRACE_SECONDS
                not_past_real_expiry = cached_expires_ts is None or now <= cached_expires_ts

                if within_grace_window and not_past_real_expiry:
                    _state.valid = True
                    _state.grace_active = True
                    _state.last_success = issued_ts  # anchor remaining-time math to the VERIFIED proof
                    _state.product = cached.get("product", PRODUCT)
                    _state.expires_at = cached.get("expires_at", _state.expires_at)
                    _state.error = ""
                    remaining = max(0, int(GRACE_SECONDS - (now - issued_ts)))
                    log.warning(
                        f"⚠️  License server unreachable. Offline grace (backed by a "
                        f"verified prior validation): {remaining}s remaining. Error: {e}"
                    )
                    granted = True
                else:
                    log.critical(
                        "Offline grace window from the last verified validation "
                        "has elapsed, or the cached proof is for an "
                        "already-expired license — blocking."
                    )

            if not granted:
                _state.valid = False
                _state.grace_active = False
                _state.error = f"Cannot reach license server and no verified prior license proof is available: {e}"
                log.error(
                    f"❌ AXTO AI STUDIO — no verified cache available, no grace "
                    f"granted. Error: {e}"
                )

        return _state


async def heartbeat_loop(license_key: str):
    while True:
        await asyncio.sleep(HEARTBEAT_SECS)
        try:
            await validate_license(license_key)
        except Exception as e:
            log.error(f"Heartbeat error: {e}")
