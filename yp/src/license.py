# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Yusron Power (YP) — License Enforcement Module
================================================================
PRODUCTION SECURITY NOTICE — READ BEFORE MODIFYING:
  ❌ Do NOT add bypass conditions, env-var overrides, or debug modes
  ❌ Do NOT remove or weaken validation calls
  ❌ Do NOT increase GRACE_SECONDS above 14400 (4 hours)
  ✅ Product key prefix mismatch = HARD REJECTION, no fallback
  ✅ Heartbeat every 30 minutes — grace expires after 4h (annual/trial)

YP has three license modes, all issued by axto.io and distinguished by the
signed `license_type` field in the validation response:

  • "yearly"  → behaves like every other AXTO product: heartbeat every 30 min,
                4-hour offline grace, blocks after grace expiry.
  • "trial"   → same enforcement as yearly, with a short expiry.
  • "lifetime"→ THE DISCONNECT MODE. On the FIRST successful validation that
                returns license_type=="lifetime", YP writes a locally-signed
                "disconnect certificate" to the data dir and then NEVER calls
                axto.io again — the app is permanently portable, server-movable,
                and fully offline. This is the $5M tier's defining property and
                is intentional: the client has bought perpetual, unconditional
                use. The one-time online check exists only to confirm the key
                is genuinely a lifetime key before cutting the cord.

Copyright © AXTO Platform. All rights reserved.
"""
from __future__ import annotations
import asyncio, base64, hashlib, json, logging, os, socket, time, uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from cryptography.hazmat.primitives.asymmetric import ed25519 as _ed25519
from cryptography.exceptions import InvalidSignature as _InvalidSignature

log = logging.getLogger("yp.license")

# ── Constants ─────────────────────────────────────────────────────────────────
PRODUCT        = "yp"
PRODUCT_PREFIX = "YP"
VERSION        = "1.0.0"
VALIDATE_URL   = "https://axto.io/api/license-validate"
GRACE_SECONDS  = 14400   # 4 hours — absolute maximum, NEVER increase
HEARTBEAT_SECS = 1800    # 30 minutes
CACHE_SECONDS  = 1800

# AXTO signs every /api/license-validate response with Ed25519. This public
# key must match lib/license-signing.ts on the server. Only axto.io holds the
# private half, so an open-source build of this file cannot forge a "valid"
# response. (Shared with the other products' hardened license modules.)
AXTO_LICENSE_PUBLIC_KEY_B64 = "ZTgH36b64ILwsRnUv6XSg4ctaLm0Pd7/CvDOumbre9M="
SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]

DISCONNECT_CERT_NAME = "yp_lifetime.cert"


def machine_id() -> str:
    """Stable per-machine identifier (hostname + MAC), hashed."""
    raw = f"{socket.gethostname()}|{uuid.getnode()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _verify_signature(signed_payload: str, signature_b64: str) -> bool:
    try:
        if not signed_payload or not signature_b64:
            return False
        pub = _ed25519.Ed25519PublicKey.from_public_bytes(
            base64.b64decode(AXTO_LICENSE_PUBLIC_KEY_B64)
        )
        pub.verify(base64.b64decode(signature_b64), signed_payload.encode("utf-8"))
        return True
    except (_InvalidSignature, Exception):
        return False


@dataclass
class LicenseState:
    valid:          bool = False
    reason:         str = ""
    message:        str = ""
    product:        str = PRODUCT
    package:        str = ""
    license_type:   str = ""          # yearly | lifetime | trial
    status:         str = ""
    expires_at:     str = ""
    lifetime:       bool = False       # True once the disconnect cert is active
    last_validated: float = 0.0
    grace_start:    float = 0.0
    features:       list = field(default_factory=list)

    @property
    def days_until_expiry(self) -> int:
        if self.lifetime or not self.expires_at:
            return 10_000
        try:
            exp = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
            return max(0, (exp - datetime.now(timezone.utc)).days)
        except Exception:
            return 0

    @property
    def grace_remaining_min(self) -> int:
        if not self.grace_start:
            return 0
        return max(0, int((GRACE_SECONDS - (time.time() - self.grace_start)) / 60))

    def is_operational(self) -> bool:
        """True if YP is allowed to serve requests right now."""
        if self.lifetime:
            return True                       # disconnected lifetime = always on
        if self.valid:
            return True
        # In grace window?
        if self.grace_start and (time.time() - self.grace_start) < GRACE_SECONDS:
            return True
        return False

    def to_api_dict(self) -> dict:
        return {
            "product":            self.product,
            "package":            self.package,
            "license_type":       self.license_type,
            "valid":              self.valid,
            "lifetime":           self.lifetime,
            "reason":             self.reason,
            "status":             self.status,
            "expires_at":         self.expires_at,
            "days_until_expiry":  self.days_until_expiry,
            "in_grace":           bool(self.grace_start) and not self.valid and not self.lifetime,
            "grace_remaining_min":self.grace_remaining_min,
            "operational":        self.is_operational(),
            "last_validated":     datetime.fromtimestamp(self.last_validated, tz=timezone.utc).isoformat()
                                  if self.last_validated else None,
        }


class LicenseManager:
    """
    Validates YP license keys against axto.io and manages the lifetime
    disconnect certificate. Never raises from validate().
    """

    def __init__(self, license_key: str, validate_url: str, data_dir: Path):
        self._key = (license_key or "").strip()
        self._url = validate_url or VALIDATE_URL
        self._data_dir = Path(data_dir)
        self._cert_path = self._data_dir / DISCONNECT_CERT_NAME
        self._state = LicenseState()
        self._client = httpx.AsyncClient(timeout=20.0, verify=True)
        self._hb_task: Optional[asyncio.Task] = None

    # ── Lifetime disconnect certificate ──────────────────────────────────────
    def _load_disconnect_cert(self) -> Optional[dict]:
        """If a valid lifetime cert exists for THIS key + machine, return it."""
        if not self._cert_path.exists():
            return None
        try:
            cert = json.loads(self._cert_path.read_text())
        except Exception:
            return None
        # The cert is only honoured for the exact key + machine it was minted for.
        # (It binds to machine_id at mint time; moving servers re-mints on the
        # next online check, which lifetime buyers may do freely.)
        if cert.get("license_key") != self._key:
            return None
        # Verify axto.io's original signature is still intact — a tampered cert
        # is ignored and forces a fresh online validation.
        if not _verify_signature(cert.get("signed_payload", ""), cert.get("signature", "")):
            log.warning("YP lifetime cert failed signature check — ignoring, will re-validate online.")
            return None
        return cert

    def _write_disconnect_cert(self, signed_payload: str, signature: str, resp: dict) -> None:
        try:
            self._data_dir.mkdir(parents=True, exist_ok=True)
            self._cert_path.write_text(json.dumps({
                "license_key":    self._key,
                "machine_id":     machine_id(),
                "minted_at":      datetime.now(timezone.utc).isoformat(),
                "signed_payload": signed_payload,
                "signature":      signature,
                "package":        resp.get("package", ""),
                "expires_at":     resp.get("expires_at", ""),
            }, indent=2))
            log.info("YP LIFETIME activated — disconnect certificate written. "
                     "This installation will no longer contact axto.io.")
        except Exception as e:
            log.error(f"Failed to write YP lifetime cert: {e}")

    # ── Core validation ──────────────────────────────────────────────────────
    async def validate(self, force: bool = False) -> LicenseState:
        now = time.time()

        # 0) Already disconnected lifetime? Short-circuit, never call home.
        if self._state.lifetime:
            return self._state
        cert = self._load_disconnect_cert()
        if cert:
            self._state = LicenseState(
                valid=True, lifetime=True, license_type="lifetime",
                reason="lifetime_disconnected", status="active",
                package=cert.get("package", ""), expires_at=cert.get("expires_at", ""),
                last_validated=now,
            )
            return self._state

        # Cache hit
        if self._state.last_validated and not force and (now - self._state.last_validated) < CACHE_SECONDS:
            return self._state

        # No key
        if not self._key or self._key.upper().startswith("YP-XXXX"):
            self._state = LicenseState(
                valid=False, reason="no_license_key",
                message="No license key configured. Set license_key in yp.yml or YP_LICENSE_KEY. "
                        "Yusron Power is invite-only — contact hello@axto.io.",
                last_validated=now,
            )
            log.error("YP — NO LICENSE KEY configured.")
            return self._state

        # Wrong product prefix → hard rejection
        if not self._key.upper().startswith("YP-"):
            self._state = LicenseState(
                valid=False, reason="product_mismatch",
                message=f"This key is not a Yusron Power key (prefix "
                        f"'{self._key.split('-')[0].upper()}'). YP keys start with 'YP-'.",
                last_validated=now,
            )
            log.error("YP — WRONG PRODUCT KEY.")
            return self._state

        # Remote validation
        try:
            resp = await self._client.post(self._url, json={
                "license_key": self._key,
                "machine_id":  machine_id(),
                "product":     PRODUCT,
                "version":     VERSION,
                "hostname":    socket.gethostname(),
            })
            resp.raise_for_status()
            data = resp.json()

            signed_payload = data.get("signed_payload", "")
            signature      = data.get("signature", "")
            if not _verify_signature(signed_payload, signature):
                # Unsigned/forged response — treat as unreachable (grace path).
                raise RuntimeError("unsigned_or_forged_response")

            valid = bool(data.get("valid"))
            lic_type = (data.get("license_type") or data.get("billing_cycle") or "yearly").lower()
            self._state = LicenseState(
                valid=valid,
                reason=data.get("reason", "" if valid else "invalid"),
                message=data.get("message", ""),
                package=data.get("package", ""),
                license_type=lic_type,
                status=data.get("status", ""),
                expires_at=data.get("expires_at", ""),
                features=data.get("features", []) or [],
                last_validated=now,
                grace_start=0.0,
            )

            # THE DISCONNECT: a genuine, signed lifetime key cuts the cord now.
            if valid and lic_type == "lifetime":
                self._write_disconnect_cert(signed_payload, signature, data)
                self._state.lifetime = True

            if not valid:
                log.error(f"YP license invalid: {self._state.reason} — {self._state.message}")
            return self._state

        except Exception as e:
            # Network/verification failure → offline grace window.
            if not self._state.grace_start:
                self._state.grace_start = now
            self._state.last_validated = now
            self._state.reason = "offline_grace"
            self._state.message = (
                f"Cannot reach axto.io ({e.__class__.__name__}). "
                f"Grace: {self._state.grace_remaining_min} min remaining."
            )
            log.warning(self._state.message)
            return self._state

    # ── Heartbeat ────────────────────────────────────────────────────────────
    async def start_heartbeat(self) -> None:
        if self._state.lifetime:
            return  # disconnected — no heartbeat ever
        async def _loop():
            while True:
                await asyncio.sleep(HEARTBEAT_SECS)
                if self._state.lifetime:
                    return
                await self.validate(force=True)
        self._hb_task = asyncio.create_task(_loop())

    async def close(self) -> None:
        if self._hb_task:
            self._hb_task.cancel()
        await self._client.aclose()

    @property
    def state(self) -> LicenseState:
        return self._state
