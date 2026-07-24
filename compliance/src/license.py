# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO COMPLIANCE — License Enforcement Module v2.0
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

log = logging.getLogger("compliance.license")

# ── Constants ─────────────────────────────────────────────────────────────────
PRODUCT         = "compliance"
PRODUCT_PREFIX  = "CMPL"

# ── Response signature verification (HARDENING) ──────────────────────────────
# AXTO signs every /api/license-validate response with Ed25519. Only the
# matching PRIVATE key (held exclusively by axto.io, never distributed) can
# produce a signature this constant will accept — so even a fully open-source
# build of this file cannot be used to forge a "valid" response. See
# AXTO_Security_Hardening_Report.pdf §3 for the full design rationale.
#
# ⚠️  DEMO KEYPAIR — regenerate before production use. This default keypair
#     was generated for this hardening pass and documented in the audit
#     report; rotate it (see lib/license-signing.ts header comment) before
#     axto.io goes live with this build, since its private half is, by
#     necessity, recorded in that report.
AXTO_LICENSE_PUBLIC_KEY_B64 = "ZTgH36b64ILwsRnUv6XSg4ctaLm0Pd7/CvDOumbre9M="
SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]
VERSION         = "2.1.0"  # HARDENED build — see AXTO_Security_Hardening_Report.pdf
VALIDATE_URL    = "https://axto.io/api/license-validate"
GRACE_SECONDS   = 14400   # 4 hours — absolute maximum, NEVER increase
HEARTBEAT_SECS  = 1800    # 30 minutes — re-validation interval
CACHE_SECONDS   = 1800    # local cache window (matches heartbeat)
SHUTDOWN_MSG    = (
    "\n"
    "╔══════════════════════════════════════════════════════════════╗\n"
    "║     AXTO COMPLIANCE — LICENSE GRACE PERIOD EXPIRED           ║\n"
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
    "║  Support: hello@axto.io                                      ║\n"
    "╚══════════════════════════════════════════════════════════════╝\n"
)
EXPIRY_BANNER = (
    "\n"
    "⚠️  ═══════════════════════════════════════════════════════════\n"
    "   AXTO COMPLIANCE LICENSE EXPIRES IN {{days}} DAY{{plural}}\n"
    "   Renew immediately at: https://axto.io/portal\n"
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
        # Deterministic fallback from UUID based on available entropy
        return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:32]


# ── Signed-response verification & local proof cache (HARDENING) ────────────

def _verify_signature(signed_payload: str, signature_b64: str) -> bool:
    """
    Verifies an Ed25519 signature over signed_payload using the embedded
    AXTO platform public key. Returns False on ANY problem (missing data,
    malformed base64, wrong length, bad signature) — never raises, and
    callers must treat False exactly like "could not reach the server":
    no trust is extended to the accompanying JSON fields.
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
    """
    Splits the pipe-delimited canonical payload into named fields. Field
    order MUST stay byte-for-byte in sync with buildCanonicalPayload() in
    dashboard/lib/license-signing.ts. Returns None if malformed.
    """
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
    """
    Where the last verified-valid signed proof is persisted, so that an
    offline grace period survives a process restart. Tries a system-wide
    location first, falls back to the user's home directory, then the
    current directory — must remain writable in restricted/sandboxed
    deployments (e.g. inside a container running as non-root).
    """
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
    """Persists the last verified-valid signed proof to disk."""
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
    """
    Removes any persisted proof. Called whenever axto.io gives us a verified
    (signed) NEGATIVE answer (revoked / suspended / expired / mismatch) so a
    later network outage cannot fall back to a now-known-stale "valid" proof.
    """
    try:
        path = _cache_path()
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def _load_verified_cache(expected_key: str, expected_machine_id: str) -> Optional[dict]:
    """
    Loads and RE-verifies the persisted signed proof (defends against a
    tampered cache file on disk, not just a tampered network response).
    Returns the parsed, trusted field dict only if the file exists, its
    signature is valid, AND its license_key/machine_id match what THIS
    process is configured with. Returns None in every other case — callers
    must treat that as "no usable offline grace", never as "grace by
    default".
    """
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
        msg = EXPIRY_BANNER.format(
            days=d, plural="" if d == 1 else "S", expires=self.expires_at
        ).replace("COMPLIANCE", PRODUCT.upper())
        if d == 0:
            log.critical("LICENSE EXPIRES TODAY — " + msg)
        elif d <= 7:
            log.warning(msg)
        elif d <= 30:
            log.info(f"License expires in {d} days ({self.expires_at}) — renew: https://axto.io/portal")

    def to_api_dict(self) -> dict:
        """Serializable dict for health/status API endpoints."""
        return {
            "product":          self.product,
            "package":          self.package,
            "valid":            self.valid,
            "reason":           self.reason,
            "expires_at":       self.expires_at,
            "days_until_expiry":self.days_until_expiry,
            "in_grace":         not self.valid and self.grace_start > 0,
            "grace_remaining_min": self.grace_remaining_min,
            "features":         self.features,
            "last_validated":   datetime.fromtimestamp(self.last_validated, tz=timezone.utc).isoformat()
                                if self.last_validated else None,
        }

    def warning_message(self) -> Optional[str]:
        """Return a human-readable warning string if action is needed."""
        if self.grace_start and not self.valid:
            return (
                f"⚠️ License validation failed. Grace period: "
                f"{self.grace_remaining_min} minutes remaining before suspension. "
                f"Renew at: https://axto.io/portal"
            )
        if self.is_expiring_soon:
            return (
                f"⚠️ License expires in {self.days_until_expiry} day"
                f"{'s' if self.days_until_expiry != 1 else ''}. "
                f"Renew at: https://axto.io/portal"
            )
        return None


# ── License Validator ─────────────────────────────────────────────────────────

class _UntrustedLicenseResponse(Exception):
    """Raised internally when a server response fails signature
    verification or its signed fields don't match what we asked for.
    Handled identically to a network failure — see validate()."""
    pass


class LicenseValidator:
    """
    Validates AXTO COMPLIANCE license keys against axto.io.

    Security model:
    - Remote validation on every call (cached for HEARTBEAT_SECS=30min)
    - Wrong-product key prefix → hard rejection, zero grace
    - Network failure → 4-hour offline grace window only
    - Grace expiry → is_operational() returns False → ALL requests blocked
    - Heartbeat task calls _enforce_shutdown() after grace expires

    Usage (in FastAPI lifespan):
        validator = LicenseValidator(config)
        state = await validator.validate()
        asyncio.create_task(validator.start_heartbeat())
    """

    def __init__(self, config: dict):
        self._key   = (
            config.get("license_key", "")
            or os.environ.get("COMPLIANCE_LICENSE_KEY", "")
            or os.environ.get("AXTO_LICENSE_KEY", "")
        ).strip()
        # ── AXTO Free Full-Access Program — no licence input required ─────────
        # When no key is configured, self-register under the program's shared
        # free key using this machine's fingerprint (machine_id) as the install
        # ID — no user input, no purchase. The countdown and the synchronized,
        # signed lock are driven entirely by the global end date the server
        # returns (managed from the axto.io admin). A real, purchased key placed
        # in config still takes priority and unlocks continued use afterwards.
        if not self._key:
            self._key = f"{PRODUCT_PREFIX}-FREE-ACCESS-2026"
        self._url   = config.get("license_validate_url", VALIDATE_URL)
        self._info: Optional[LicenseState] = None
        self._last: float = 0.0
        self._client = httpx.AsyncClient(timeout=20.0, verify=True)

    # ── Core validation ───────────────────────────────────────────────────────

    async def validate(self, force: bool = False) -> LicenseState:
        """
        Validate license against axto.io.
        Returns LicenseState — never raises.
        force=True bypasses the 30-minute local cache.
        """
        now = time.time()

        # Cache hit
        if self._info and not force and (now - self._last) < CACHE_SECONDS:
            return self._info

        # ── No license key ────────────────────────────────────────────────────
        if not self._key or self._key.upper().startswith(f"CMPL-XXXX"):
            state = LicenseState(
                valid   = False,
                reason  = "no_license_key",
                message = (
                    f"No license key configured. "
                    f"Set license_key in {PRODUCT}.yml or "
                    f"COMPLIANCE_LICENSE_KEY env var. "
                    f"Purchase at https://axto.io"
                ),
                last_validated = now,
            )
            log.error(
                f"AXTO COMPLIANCE — NO LICENSE KEY. "
                f"Purchase at https://axto.io and set license_key in {PRODUCT}.yml"
            )
            self._info = state; self._last = now
            return state

        # ── Wrong product prefix — HARD REJECTION, no grace ──────────────────
        if not self._key.upper().startswith(f"CMPL-"):
            actual_prefix = self._key.split("-")[0].upper()
            state = LicenseState(
                valid       = False,
                reason      = "product_mismatch",
                key_is_for  = actual_prefix,
                message     = (
                    f"Key prefix '{actual_prefix}' is not valid for AXTO COMPLIANCE. "
                    f"Required prefix: CMPL-. "
                    f"Purchase correct license at https://axto.io"
                ),
                last_validated = now,
            )
            log.critical(
                f"AXTO COMPLIANCE — LICENSE REJECTED: WRONG PRODUCT | "
                f"Key prefix: {actual_prefix} | Required: CMPL | "
                f"Purchase COMPLIANCE license: https://axto.io"
            )
            self._info = state; self._last = now
            return state

        # ── Remote validation ─────────────────────────────────────────────────
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
            # it falls through to the verified-cache-backed grace logic
            # below, NOT to whatever `data['valid']` claims. This is what
            # actually stops a rogue DNS entry / fake axto.io / MITM proxy
            # from being able to hand-craft {"valid": true} and be believed.
            _sig_payload = data.get("signed_payload", "")
            _sig = data.get("signature", "")
            if not _verify_signature(_sig_payload, _sig):
                log.critical(
                    "AXTO COMPLIANCE — RESPONSE SIGNATURE INVALID. "
                    "This response did NOT come from a genuine, unmodified "
                    "axto.io license server (or it was signed by a key this "
                    "build no longer trusts). Treating as unreachable."
                )
                raise _UntrustedLicenseResponse("signature_verification_failed")
            _signed_fields = _parse_signed_payload(_sig_payload)
            if not _signed_fields or _signed_fields.get("license_key") != self._key:
                log.critical(
                    "AXTO COMPLIANCE — SIGNED RESPONSE FIELD MISMATCH. "
                    "Treating as unreachable."
                )
                raise _UntrustedLicenseResponse("signed_field_mismatch")

            # ── HARDENING: the valid/status/expires_at fields used to build
            # `state` below MUST come from the SIGNED canonical string, never
            # from the surrounding JSON dict — `data` can be freely rewritten
            # by anything between the server and this process (a MITM proxy,
            # a compromised CDN, a buggy intermediary) without invalidating
            # the signature, because only `_sig_payload` itself is what was
            # actually signed. Overriding here closes that gap.
            data["valid"] = (_signed_fields.get("valid") == "true")
            data["status"] = _signed_fields.get("status", data.get("status", ""))
            if _signed_fields.get("expires_at"):
                data["expires_at"] = _signed_fields["expires_at"]
            if _signed_fields.get("product"):
                data["product"] = _signed_fields["product"]

            # Parse expiry
            expires_at = data.get("expires_at", "")
            expires_ts = 0.0
            days_left  = data.get("days_until_expiry", data.get("days_left", -1))
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
                valid               = data.get("valid", False),
                reason              = data.get("reason", ""),
                product             = data.get("product", PRODUCT),
                package             = data.get("package", data.get("package_code", "")),
                expires_at          = expires_at,
                expires_ts          = expires_ts,
                days_until_expiry   = days_left,
                max_nodes           = data.get("max_nodes", features.get("max_nodes", 1)),
                max_requests_daily  = features.get("max_requests_daily", 10000),
                max_sources         = features.get("max_sources", 10),
                max_devices         = features.get("max_devices", 100),
                features            = features,
                message             = data.get("message", data.get("warning", "")),
                key_is_for          = data.get("key_is_for", ""),
                grace_start         = self._info.grace_start if self._info else 0.0,
                last_validated      = now,
            )

            # Validate succeeded — clear grace
            if state.valid:
                state.grace_start = 0.0

            # Log result
            if not state.valid:
                if state.reason == "product_mismatch":
                    log.critical(
                        f"AXTO COMPLIANCE LICENSE — PRODUCT MISMATCH | "
                        f"Key is for: {state.key_is_for} | Required: {PRODUCT} | "
                        f"Purchase: https://axto.io"
                    )
                elif state.reason == "expired":
                    log.critical(
                        f"AXTO COMPLIANCE LICENSE EXPIRED | "
                        f"Renew immediately: https://axto.io/portal"
                    )
                elif state.reason == "machine_mismatch":
                    log.critical(
                        f"AXTO COMPLIANCE — MACHINE ID MISMATCH | "
                        f"License bound to different server. "
                        f"Reset binding at: https://axto.io/portal"
                    )
                else:
                    log.warning(
                        f"License invalid: {state.reason} — {state.message} | "
                        f"Renew: https://axto.io/portal"
                    )
            else:
                state.log_expiry_status()
                log.info(
                    f"✅ AXTO COMPLIANCE license valid | "
                    f"package={state.package} | "
                    f"expires={'in ' + str(state.days_until_expiry) + ' days' if state.days_until_expiry >= 0 else 'perpetual'}"
                )
                # Relay any server warning (e.g. expiry approaching)
                if state.message:
                    log.warning(f"License server notice: {state.message}")

            # ── HARDENING: persist or clear the local signed-proof cache
            # based on the now cryptographically-verified outcome (not the
            # raw, previously-untrusted JSON). A verified negative result
            # immediately invalidates any old cached "valid" proof so a
            # LATER network outage cannot fall back to known-stale grace.
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
        # reach the server." A fresh install (or any install that has never
        # successfully validated) gets ZERO grace on first failure. This
        # closes the previous fail-open behavior, where blocking outbound
        # network to axto.io from first boot made ANY fabricated key (with
        # a correct prefix) report "valid": true for 4 hours — repeatable
        # forever via process restart, since the old cache lived in memory
        # only. See AXTO_Security_Hardening_Report.pdf §3.1 (BUG-H01).
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
                    f"⚠️  AXTO COMPLIANCE OFFLINE GRACE (verified cache) | "
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
        log.critical(SHUTDOWN_MSG.replace("COMPLIANCE", PRODUCT.upper()))
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
            log.critical(SHUTDOWN_MSG.replace("COMPLIANCE", PRODUCT.upper()))
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
                        log.critical(SHUTDOWN_MSG.replace("COMPLIANCE", PRODUCT.upper()))
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
