# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — License Enforcement Module v2.0
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

Copyright © AXTO Platform. All rights reserved.
Unauthorized use, reproduction, or distribution is strictly prohibited.
"""
from __future__ import annotations
import asyncio, hashlib, logging, os, signal, socket, sys, time, uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import httpx
import base64, json
from cryptography.hazmat.primitives.asymmetric import ed25519 as _ed25519
from cryptography.exceptions import InvalidSignature as _InvalidSignature

log = logging.getLogger("orchestra.license")

# ── Constants ─────────────────────────────────────────────────────────────────
PRODUCT         = "orchestra"
PRODUCT_PREFIX  = "ORCH"
VERSION         = "2.1.0"  # HARDENED build — see AXTO_Security_Hardening_Report.pdf

# ── Response signature verification (HARDENING) ──────────────────────────────
# AXTO signs every /api/license-validate response with Ed25519. Only the
# matching PRIVATE key (held exclusively by axto.io, never distributed) can
# produce a signature this constant will accept. See
# AXTO_Security_Hardening_Report.pdf §3 for the full design rationale.
#
# ⚠️  DEMO KEYPAIR — regenerate before production use (see
#     dashboard/lib/license-signing.ts header comment).
AXTO_LICENSE_PUBLIC_KEY_B64 = "ZTgH36b64ILwsRnUv6XSg4ctaLm0Pd7/CvDOumbre9M="
SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]
VALIDATE_URL    = "https://axto.io/api/license-validate"
GRACE_SECONDS   = 14400   # 4 hours — absolute maximum, NEVER increase
HEARTBEAT_SECS  = 1800    # 30 minutes — re-validation interval
CACHE_SECONDS   = 1800    # local cache window (matches heartbeat)
SHUTDOWN_MSG    = (
    "\n"
    "╔══════════════════════════════════════════════════════════════╗\n"
    "║     AXTO ORCHESTRA — LICENSE GRACE PERIOD EXPIRED      ║\n"
    "║                                                              ║\n"
    "║  The license server has been unreachable for 4+ hours.      ║\n"
    "║  ALL API requests are now blocked to protect your data.     ║\n"
    "║                                                              ║\n"
    "║  ACTION REQUIRED:                                            ║\n"
    "║  1. Verify connectivity to https://axto.io                   ║\n"
    "║  2. Confirm your license has not expired                     ║\n"
    "║  3. Restart this service after connectivity is restored      ║\n"
    "║                                                              ║\n"
    "║  Free program — extend via WhatsApp +6285691234561 / hello@axto.io        ║\n"
    "║  Support: hello@axto.io                                      ║\n"
    "╚══════════════════════════════════════════════════════════════╝\n"
)
EXPIRY_BANNER = (
    "\n"
    "⚠️  ═══════════════════════════════════════════════════════════\n"
    "   AXTO ORCHESTRA LICENSE EXPIRES IN {{days}} DAY{{plural}}\n"
    "   Free program — need more time? WhatsApp +6285691234561 / hello@axto.io\n"
    "   Expires: {{expires}}\n"
    "   ═══════════════════════════════════════════════════════════\n"
)


# ── Machine ID fingerprinting ─────────────────────────────────────────────────

def machine_id() -> str:
    """
    Stable machine fingerprint for license binding.
    Priority: /etc/machine-id (Linux systemd) → DBUS → hostname-UUID.
    SHA-256 hashed to 32 chars — no raw system data transmitted.
    """
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
    """
    Verifies an Ed25519 signature over signed_payload using the embedded
    AXTO platform public key. Returns False on ANY problem — never raises.
    Callers must treat False exactly like "could not reach the server".
    """
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
    """Splits the pipe-delimited canonical payload — must stay byte-for-byte
    in sync with buildCanonicalPayload() in dashboard/lib/license-signing.ts."""
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
    """Where the last verified-valid signed proof is persisted, so an
    offline grace period survives a process restart."""
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
    """Removes any persisted proof — called on every verified NEGATIVE
    result so a later outage cannot fall back to known-stale grace."""
    try:
        path = _cache_path()
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def _load_verified_cache(expected_key: str, expected_machine_id: str) -> Optional[dict]:
    """Loads and RE-verifies the persisted signed proof. Returns trusted
    fields only if the file exists, its signature is valid, AND its
    license_key/machine_id match this process. None otherwise — never
    treat None as "grace by default"."""
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


# ── License State ─────────────────────────────────────────────────────────────

@dataclass
class LicenseState:
    """
    Immutable snapshot of license status at a point in time.
    All enforcement decisions are based on this dataclass.
    """
    valid:              bool  = False
    reason:             str   = "not_validated"
    product:            str   = PRODUCT
    package:            str   = ""
    expires_at:         str   = ""        # ISO-8601 from axto.io
    expires_ts:         float = 0.0       # Unix timestamp
    days_until_expiry:  int   = -1        # -1 = perpetual or unknown
    max_nodes:          int   = 1
    max_requests_daily: int   = 10000
    max_sources:        int   = 10
    max_devices:        int   = 100
    features:           dict  = field(default_factory=dict)
    message:            str   = ""
    key_is_for:         str   = ""
    grace_start:        float = 0.0       # set on first network failure
    last_validated:     float = 0.0

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def grace_expired(self) -> bool:
        """True when 4-hour offline grace has lapsed — ALL endpoints must block."""
        return (
            not self.valid
            and self.grace_start > 0
            and (time.time() - self.grace_start) > GRACE_SECONDS
        )

    @property
    def grace_remaining_min(self) -> int:
        """Minutes remaining in grace window (0 if expired or not in grace)."""
        if self.valid or not self.grace_start:
            return 0
        remaining = GRACE_SECONDS - (time.time() - self.grace_start)
        return max(0, int(remaining / 60))

    @property
    def is_expiring_critical(self) -> bool:
        """True within 7 days of expiry."""
        return 0 <= self.days_until_expiry <= 7

    @property
    def is_expiring_soon(self) -> bool:
        """True within 30 days of expiry."""
        return 0 <= self.days_until_expiry <= 30

    def log_expiry_status(self) -> None:
        """Emit appropriately-urgency log line about expiry."""
        d = self.days_until_expiry
        if d < 0 or not self.expires_at:
            return
        msg = EXPIRY_BANNER.replace("{{days}}", str(d)) \
                           .replace("{{plural}}", "" if d == 1 else "S") \
                           .replace("{{expires}}", self.expires_at)
        if d == 0:
            log.critical("LICENSE EXPIRES TODAY — " + msg)
        elif d <= 7:
            log.warning(msg)
        elif d <= 30:
            log.info(f"License expires in {d} days ({self.expires_at}) — renew: https://axto.io/portal")

    def to_api_dict(self) -> dict:
        """Serializable dict for health/status API endpoints."""
        return {
            "product":             self.product,
            "package":             self.package,
            "valid":               self.valid,
            "reason":              self.reason,
            "expires_at":          self.expires_at,
            "days_until_expiry":   self.days_until_expiry,
            "in_grace":            not self.valid and self.grace_start > 0,
            "grace_remaining_min": self.grace_remaining_min,
            "features":            self.features,
            "last_validated":      datetime.fromtimestamp(self.last_validated, tz=timezone.utc).isoformat()
                                   if self.last_validated else None,
        }

    def warning_message(self) -> Optional[str]:
        """Return a human-readable warning string if action is needed."""
        if self.grace_start and not self.valid:
            return (
                f"⚠️ License validation failed. Grace period: "
                f"{self.grace_remaining_min} minutes remaining before suspension. "
                f"Free program — extend via WhatsApp +6285691234561 / hello@axto.io"
            )
        if self.is_expiring_soon:
            return (
                f"⚠️ License expires in {self.days_until_expiry} day"
                f"{'s' if self.days_until_expiry != 1 else ''}. "
                f"Free program — extend via WhatsApp +6285691234561 / hello@axto.io"
            )
        return None


# ── License Validator ─────────────────────────────────────────────────────────

class _UntrustedLicenseResponse(Exception):
    """Raised internally when a server response fails signature verification
    or its signed fields don't match what we asked for. Handled identically
    to a network failure — see LicenseValidator.validate()."""
    pass


class LicenseValidator:
    """
    Validates AXTO Orchestra license keys against axto.io.

    Security model:
    - Remote validation on every call (cached for HEARTBEAT_SECS=30min)
    - Wrong-product key prefix → hard rejection, zero grace
    - Network failure → 4-hour offline grace window only
    - Grace expiry → is_operational() returns False → ALL requests blocked
    - Heartbeat task sends SIGTERM to process after grace expires

    Usage (at application startup):
        validator = LicenseValidator(config)
        state = await validator.validate()
        asyncio.create_task(validator.start_heartbeat())
    """

    def __init__(self, config: dict):
        self._key    = config.get("license_key", "")
        # ── AXTO Free Full-Access Program — no licence input required ─────────
        # No key configured → self-register under the program's shared free key
        # using this machine's fingerprint as the install ID (no user input).
        # Countdown + synchronized signed lock come from the global admin date.
        if not self._key:
            self._key = f"{PRODUCT_PREFIX}-FREE-ACCESS-2026"
        self._url    = config.get("license_validate_url", VALIDATE_URL)
        self._info:  Optional[LicenseState] = None
        self._last:  float = 0.0
        self._client = httpx.AsyncClient(timeout=20.0)

    async def validate(self, force: bool = False) -> LicenseState:
        """Validate license key. Never raises — errors return invalid state."""
        now = time.time()

        if self._info and not force and (now - self._last) < CACHE_SECONDS:
            return self._info

        if not self._key or self._key.upper().startswith(f"{PRODUCT_PREFIX}-XXXX"):
            state = LicenseState(
                valid=False, reason="no_license_key",
                message=(
                    f"No license key configured. "
                    f"Purchase at https://axto.io/buy and set "
                    f"license_key in orchestra.yml"
                ),
            )
            self._info = state; self._last = now
            return state

        # Wrong product prefix — HARD REJECTION, no grace, no fallback
        if not self._key.upper().startswith(f"{PRODUCT_PREFIX}-"):
            actual = self._key.split("-")[0].upper()
            state = LicenseState(
                valid=False, reason="product_mismatch",
                message=(
                    f"This key belongs to a different AXTO product (prefix: {actual}). "
                    f"Purchase an ORCHESTRA license at https://axto.io/buy"
                ),
            )
            log.error(
                f"LICENSE REJECTED — WRONG PRODUCT | "
                f"Key prefix: {actual} | Required: {PRODUCT_PREFIX}"
            )
            self._info = state; self._last = now
            return state

        try:
            resp = await self._client.post(
                self._url,
                json={
                    "license_key": self._key,
                    "machine_id":  machine_id(),
                    "product":     PRODUCT,
                    "version":     VERSION,
                    "hostname":    socket.gethostname(),
                },
                timeout=20.0,
            )
            resp.raise_for_status()
            data = resp.json()

            # ── HARDENING: verify the Ed25519 signature BEFORE trusting
            # anything in `data`. A response with a missing or invalid
            # signature is treated exactly like an unreachable server —
            # this is what stops a rogue DNS entry / fake axto.io / MITM
            # proxy from being able to hand-craft {"valid": true} and be
            # believed.
            _sig_payload = data.get("signed_payload", "")
            _sig = data.get("signature", "")
            if not _verify_signature(_sig_payload, _sig):
                log.critical(
                    "AXTO ORCHESTRA — RESPONSE SIGNATURE INVALID. This "
                    "response did NOT come from a genuine, unmodified "
                    "axto.io license server. Treating as unreachable."
                )
                raise _UntrustedLicenseResponse("signature_verification_failed")
            _signed_fields = _parse_signed_payload(_sig_payload)
            if not _signed_fields or _signed_fields.get("license_key") != self._key:
                log.critical(
                    "AXTO ORCHESTRA — SIGNED RESPONSE FIELD MISMATCH. "
                    "Treating as unreachable."
                )
                raise _UntrustedLicenseResponse("signed_field_mismatch")

            # ── HARDENING: the valid/status/expires_at fields used to build
            # `state` below MUST come from the SIGNED canonical string, never
            # from the surrounding JSON dict — see
            # AXTO_Security_Hardening_Report.pdf §3.2 for why.
            data["valid"] = (_signed_fields.get("valid") == "true")
            if _signed_fields.get("expires_at"):
                data["expires_at"] = _signed_fields["expires_at"]
            if _signed_fields.get("product"):
                data["product"] = _signed_fields["product"]

            expires_at = data.get("expires_at", "")
            expires_ts = 0.0
            days_left  = data.get("days_until_expiry", -1)
            if expires_at:
                try:
                    expires_ts = datetime.fromisoformat(
                        expires_at.replace("Z", "+00:00")
                    ).timestamp()
                    if days_left == -1:
                        days_left = max(0, int((expires_ts - now) / 86400))
                except Exception:
                    pass

            features = data.get("features", {})
            state = LicenseState(
                valid              = data.get("valid", False),
                reason             = data.get("reason", ""),
                product            = data.get("product", PRODUCT),
                package            = data.get("package", ""),
                expires_at         = expires_at,
                expires_ts         = expires_ts,
                days_until_expiry  = days_left,
                max_nodes          = data.get("max_nodes", 1),
                max_requests_daily = data.get("max_requests_daily", 10000),
                max_sources        = features.get("max_sources", 10),
                max_devices        = features.get("max_devices", 100),
                features           = features,
                message            = data.get("message", ""),
                key_is_for         = data.get("key_is_for", ""),
                grace_start        = 0.0,
                last_validated     = now,
            )

            if state.valid:
                state.log_expiry_status()
                log.info(
                    f"✅ AXTO ORCHESTRA license valid | "
                    f"package={state.package} | "
                    f"expires={'in ' + str(state.days_until_expiry) + ' days' if state.days_until_expiry >= 0 else 'perpetual'}"
                )
                if state.message:
                    log.warning(f"License server notice: {state.message}")
            else:
                if state.reason == "machine_mismatch":
                    log.error(
                        f"LICENSE REJECTED — MACHINE BINDING MISMATCH | "
                        f"License bound to different server. "
                        f"Reset binding at: https://axto.io/portal"
                    )
                else:
                    log.warning(
                        f"License invalid: {state.reason} — {state.message} | "
                        f"Renew: https://axto.io/portal"
                    )

            # ── HARDENING: persist or clear the local signed-proof cache
            # based on the now cryptographically-verified outcome. A
            # verified negative result immediately invalidates any old
            # cached "valid" proof so a LATER outage cannot fall back to
            # known-stale grace.
            if state.valid:
                _save_cache(_sig_payload, _sig)
            else:
                _clear_cache()

            self._info = state; self._last = now
            return state

        # ── Network failures / untrusted responses — offline grace ────────────
        except httpx.HTTPStatusError as e:
            log.error(f"License server HTTP {e.response.status_code}: {e}")
        except httpx.TimeoutException:
            log.warning("License server timeout — activating offline grace (4h max)")
        except httpx.ConnectError as e:
            log.warning(f"License server unreachable: {e} — activating offline grace")
        except _UntrustedLicenseResponse:
            pass  # already logged critical above; fall through to grace logic
        except Exception as e:
            log.warning(f"License validation error ({type(e).__name__}): {e}")

        # ── HARDENING: grace is ONLY granted from a cryptographically signed
        # proof that was verified on a PREVIOUS successful contact with
        # axto.io and persisted to disk — never from "we simply couldn't
        # reach the server." A fresh install gets ZERO grace on first
        # failure. This closes the previous fail-open behavior, where
        # blocking outbound network to axto.io from first boot made ANY
        # fabricated key (with a correct prefix) report "valid": true for
        # 4 hours — repeatable forever via process restart, since the old
        # cache lived in memory only. See
        # AXTO_Security_Hardening_Report.pdf §3.1 (BUG-H01).
        cached = _load_verified_cache(self._key, machine_id())
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
                grace_state = LicenseState(
                    valid               = True,
                    reason              = "offline_grace",
                    product             = cached.get("product", PRODUCT),
                    package             = self._info.package if self._info else "offline",
                    expires_at          = cached.get("expires_at", ""),
                    days_until_expiry   = self._info.days_until_expiry if self._info else -1,
                    max_nodes           = self._info.max_nodes if self._info else 1,
                    max_requests_daily  = self._info.max_requests_daily if self._info else 5000,
                    max_sources         = self._info.max_sources if self._info else 5,
                    max_devices         = self._info.max_devices if self._info else 50,
                    features            = self._info.features if self._info else {},
                    message             = (
                        f"License server unreachable. Offline grace (backed by a "
                        f"verified prior validation): "
                        f"{max(0, int((GRACE_SECONDS - (now - issued_ts)) / 60))} min remaining."
                    ),
                    grace_start         = issued_ts,
                    last_validated      = now,
                )
                self._info = grace_state; self._last = now
                log.warning(
                    f"⚠️  AXTO ORCHESTRA OFFLINE GRACE (verified cache) | "
                    f"{max(0, int((GRACE_SECONDS - (now - issued_ts)) / 60))} min remaining."
                )
                return grace_state
            else:
                log.critical(
                    "Offline grace window from the last verified validation has "
                    "elapsed, or the cached proof is for an already-expired "
                    "license — blocking."
                )

        # No usable verified cache → hard fail. No grace on a fresh install,
        # and no grace once a verified cache's window has elapsed.
        state = LicenseState(
            valid          = False,
            reason         = "server_unreachable_no_verified_cache",
            product        = PRODUCT,
            message        = (
                "Cannot reach axto.io and no previously verified license proof "
                "is available on this machine. This engine will not operate "
                "without successfully contacting the license server at least "
                "once. Verify connectivity to https://axto.io and try again."
            ),
            last_validated = now,
        )
        self._info = state; self._last = now
        log.critical(SHUTDOWN_MSG)
        return state


    # ── Operational check ─────────────────────────────────────────────────────

    def is_operational(self) -> bool:
        """
        Returns True if the engine should process requests.
        Returns False when:
          - No license has been validated yet
          - Grace period has expired
        All API endpoints MUST call this before processing.
        """
        if self._info is None:
            return False
        if self._info.grace_expired:
            log.critical(SHUTDOWN_MSG)
            return False
        return self._info.valid

    def current_state(self) -> Optional[LicenseState]:
        return self._info

    # ── Heartbeat background task ─────────────────────────────────────────────

    async def start_heartbeat(self) -> None:
        """
        Background coroutine — re-validates license every 30 minutes.
        MUST be launched with asyncio.create_task() at application startup.

        Behavior:
        - Success: reset grace, log OK
        - Network failure: preserve original grace_start (4h timer not reset)
        - Grace expired: log CRITICAL and send SIGTERM to process
        - Repeated failures: exponential backoff up to 2× base interval
        """
        failures = 0
        while True:
            sleep_for = HEARTBEAT_SECS * min(2 ** failures, 4)
            await asyncio.sleep(sleep_for)

            try:
                new_state = await self.validate(force=True)
                if new_state.valid and new_state.reason != "offline_grace":
                    failures = 0
                    log.info(
                        f"License heartbeat OK | "
                        f"expires={'in ' + str(new_state.days_until_expiry) + 'd' if new_state.days_until_expiry >= 0 else 'perpetual'}"
                    )
                    new_state.log_expiry_status()
                else:
                    failures += 1
                    if new_state.grace_expired:
                        log.critical(SHUTDOWN_MSG)
                        log.critical("Sending SIGTERM — service will shut down.")
                        os.kill(os.getpid(), signal.SIGTERM)
                        await asyncio.sleep(5)
                        sys.exit(1)
                    log.warning(
                        f"Heartbeat: license not valid | reason={new_state.reason} | "
                        f"grace_remaining={new_state.grace_remaining_min}m"
                    )
            except asyncio.CancelledError:
                break
            except Exception as e:
                failures += 1
                log.error(f"Heartbeat exception (attempt {failures}): {type(e).__name__}: {e}")

    async def close(self) -> None:
        """Clean up HTTP client on application shutdown."""
        try:
            await self._client.aclose()
        except Exception:
            pass
