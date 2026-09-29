# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Legal — Production License Validation Module
Copyright (c) 2024-2026 Axto AI. All rights reserved.

AUTHORSHIP WATERMARK:
  Every AXTO license key carries an authorship fingerprint encoded via SHA-256 of an obfuscated authorship seed in segment 3, byte 0 (XOR).
  Verifiable by the author; invisible to end users. AXTO® is a trademark of Axto AI.

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
PRODUCT_AUTHOR  = "Axto AI"
PRODUCT_VENDOR  = "AXTO (axto.io)"

# ── Authorship fingerprint ────────────────────────────────────
_AUTHOR_FP = hashlib.sha256(base64.b64decode(b"WXVzcm9uRWZlbmRpLUFYVE8tMjAyNA==")).digest()[0]

# ── Ed25519 public key ─────────────────────────────────────────────────────────
# Production signing key (rotated 2026-09-27, AXTO v3). Compiled in; there is
# deliberately no way to override it at runtime.
_EMBEDDED_PUBLIC_KEY_B64 = "p9cJ3Ct6j/tQPGtH/YJA7Fm8P/VgOSc2+e57+dFNMF0="

SIGNED_PAYLOAD_FIELDS = [
    "license_key", "machine_id", "product", "valid",
    "status", "expires_at", "issued_at", "nonce",
]

VALIDATE_URL    = os.environ.get("AXTO_LICENSE_SERVER", "").strip() or "https://axto.io/api/license-validate"
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
    "║  Renew or manage your license: https://axto.io/app/self-hosted        ║\n"
    "║  Support: hello@axto.io                                      ║\n"
    "╚══════════════════════════════════════════════════════════════╝\n"
)


# ── Machine ID ────────────────────────────────────────────────────────────────
_MACHINE_ID = ""


def _state_dir() -> str:
    """Writable directory for licence state (installation id, verified proof).
    The Docker images point AXTO_STATE_DIR at a persistent volume."""
    import os
    configured = os.environ.get("AXTO_STATE_DIR", "").strip()
    if configured:
        try:
            os.makedirs(configured, exist_ok=True)
        except Exception:
            pass
        if os.path.isdir(configured):
            return configured    # may be read-only (a worker sharing the core's volume)
    for candidate in ("/var/lib/axto", os.path.expanduser("~/.axto")):
        try:
            os.makedirs(candidate, exist_ok=True)
            if os.access(candidate, os.W_OK):
                return candidate
        except Exception:
            continue
    return "."


def machine_id() -> str:
    """
    Stable installation fingerprint for licence binding (32 hex chars).
    A container has no stable hardware identity (hostname and MAC change every
    time it is re-created), so the first value is persisted in the state
    directory (a Docker volume) and reused across restarts and image updates.
    Source order: persisted id -> host /etc/machine-id -> random (then persisted).
    """
    import hashlib, os, uuid
    global _MACHINE_ID
    if _MACHINE_ID:
        return _MACHINE_ID
    path = os.path.join(_state_dir(), "machine-id")
    try:
        with open(path) as f:
            saved = f.read().strip()
        if len(saved) == 32 and all(c in "0123456789abcdef" for c in saved):
            _MACHINE_ID = saved
            return saved
    except Exception:
        pass
    raw = ""
    for candidate in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            with open(candidate) as f:
                raw = f.read().strip()
        except Exception:
            raw = ""
        if raw:
            break
    mid = hashlib.sha256((raw or uuid.uuid4().hex).encode()).hexdigest()[:32]
    try:
        with open(path, "w") as f:
            f.write(mid)
    except Exception:
        pass
    _MACHINE_ID = mid
    return mid


# ── Key Watermark Check (forensic, non-blocking) ──────────────────────────────
def _check_watermark(key: str) -> bool:
    """Verify the embedded authorship watermark in key segment 3."""
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
        # The key is compiled in on purpose — never read it from the environment,
        # or anyone could run their own licence server with their own key.
        key_b64 = _EMBEDDED_PUBLIC_KEY_B64
        pub_raw = base64.b64decode(key_b64)
        pub_key = _ed25519.Ed25519PublicKey.from_public_bytes(pub_raw)
        sig     = base64.b64decode(signature_b64)
        pub_key.verify(sig, signed_payload.encode("utf-8"))
        return True
    except _InvalidSignature:
        return False
    except Exception:
        return False



# ── Lifetime (offline) activation — AXTO v3.2 ────────────────────────────────
# A Lifetime licence is activated per device with a `.axto-license` file that
# axto.io signs with the SAME Ed25519 key as its online answers. It is bound to
# one app and to THIS installation's machine id, so it verifies with no network
# at all (air-gapped) and never expires. Field order must match
# activationPayload() in dashboard/lib/lifetime.ts byte for byte.
OFFLINE_FORMAT = "axto-lifetime-1"
OFFLINE_FIELDS = [
    "format", "license_id", "product", "machine_id", "scope",
    "devices", "major", "updates_until", "issued_at", "entitlements",
]


def _offline_file() -> str:
    return os.environ.get("AXTO_LICENSE_FILE", "").strip() or os.path.join(_state_dir(), f"{PRODUCT_CODE}.axto-license")


def offline_activation() -> Optional[dict]:
    """The verified Lifetime activation for this app on this machine, or None.
    Any problem (missing, unreadable, forged, other app or machine, newer major
    version) means "no offline licence" — it never raises."""
    import json as _json
    path = _offline_file()
    try:
        with open(path, encoding="utf-8") as fh:
            doc = _json.load(fh)
        payload, sig = str(doc.get("payload", "")), str(doc.get("signature", ""))
    except FileNotFoundError:
        return None
    except Exception:
        logger.error(f"Lifetime licence file {path} is unreadable — ignored")
        return None
    if not _verify_signature(payload, sig):
        logger.critical(f"Lifetime licence file {path} has an INVALID signature — ignored")
        return None
    parts = payload.split("|")
    if len(parts) != len(OFFLINE_FIELDS):
        return None
    f = dict(zip(OFFLINE_FIELDS, parts))
    if f["format"] != OFFLINE_FORMAT or f["product"] != PRODUCT_CODE:
        logger.error(f"Lifetime licence file {path} is for '{f.get('product')}', not '{PRODUCT_CODE}' — ignored")
        return None
    if f["machine_id"] != machine_id():
        logger.error(f"Lifetime licence file {path} belongs to another machine — ignored. {offline_hint()}")
        return None
    try:
        if int(str(PRODUCT_VERSION).split(".")[0]) > int(f["major"]):
            logger.error(f"Lifetime licence {f['license_id']} covers major version {f['major']}; this build is {PRODUCT_VERSION} — ignored")
            return None
    except ValueError:
        return None
    ent: dict = {}
    for kv in f["entitlements"].split(";"):
        if "=" in kv:
            k, v = (x.strip() for x in kv.split("=", 1))
            ent[k] = (v == "true") if v in ("true", "false") else (int(v) if v.lstrip("-").isdigit() else v)
    f["ent"] = ent
    return f


def offline_hint() -> str:
    """How the operator activates this device without a network connection."""
    return (f"Lifetime / offline activation: this machine ID is {machine_id()} — activate it at "
            f"https://axto.io/app/lifetime and save the file as {_offline_file()}")


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


def _binding_problem(fields, key: str, mid: str, nonce) -> str:
    """Why a signed payload with a GENUINE signature must still be refused for
    this request ("" = accept). The answer has to be for this licence key, this
    installation and — for live answers — this very request (the server echoes
    our nonce), so a captured answer cannot be replayed to other servers or
    after the licence has lapsed."""
    if not fields:
        return "malformed"
    if str(fields.get("license_key", "")).upper() != str(key or "").upper():
        return "key_mismatch"
    if fields.get("machine_id", "") != mid:
        return "machine_mismatch"
    if nonce is not None and fields.get("nonce", "") != nonce:
        return "stale_or_replayed"
    return ""


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

        # Offline grace must never extend past the license's REAL expiry —
        # otherwise an outage that straddles the actual expiry moment would
        # let the cache keep granting access after the license is genuinely
        # over. Matches the same cap already enforced in every other engine
        # (soc, vault, guardian, antivirus, edge, orchestra, compliance,
        # sentinel — see GRACE_SECONDS usage in those license.py files).
        try:
            expires_ts = datetime.fromisoformat(
                payload.get("expires_at", "").replace("Z", "+00:00")
            ).timestamp()
            if time.time() > expires_ts:
                logger.info("AXTO Legal — cached grace would extend past real expiry, rejecting")
                _cache_path().unlink(missing_ok=True)
                return None
        except Exception:
            pass  # no parsable expires_at in payload — fall through, GRACE_SECONDS cap above still applies

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
    __slots__ = ("valid", "status", "plan", "package", "client_name", "expires_at",
                 "max_users", "max_countries", "max_frameworks", "edition", "workspaces")

    def __init__(self, valid: bool, status: str = "", plan: str = "", package: str = "",
                 client_name: str = "", expires_at: str = "",
                 max_users: int = 0, max_countries: int = 3, max_frameworks: int = 5,
                 edition: str = "enterprise", workspaces: int = 5):
        self.valid          = valid
        self.status         = status
        self.plan           = plan
        self.package        = package
        self.client_name    = client_name
        self.expires_at     = expires_at
        self.max_users      = max_users
        self.max_countries  = max_countries
        self.max_frameworks = max_frameworks
        self.edition        = edition
        self.workspaces     = workspaces

    def to_dict(self) -> dict:
        return {k: getattr(self, k) for k in self.__slots__}

    # Unlimited sentinel: the server emits -1 for "all" (Enterprise/Sovereign).
    def countries_allowed(self) -> str:
        return "all" if self.max_countries == -1 else str(self.max_countries)


def _parse_entitlements(s: str) -> dict:
    """Parse the signed entitlements segment 'package=x;key=val;...' into a dict.
    Values are kept as strings; callers coerce as needed."""
    out: dict = {}
    if not s:
        return out
    for kv in s.split(";"):
        if "=" in kv:
            k, v = kv.split("=", 1)
            out[k.strip()] = v.strip()
    return out


# Field order of the separately-signed entitlements payload — must match
# buildEntitlementsPayload() in dashboard/lib/license-sign.ts byte-for-byte.
ENTITLEMENTS_FIELDS = ["license_key", "machine_id", "product", "entitlements", "issued_at", "nonce"]


def _verified_entitlements(data: dict, expected_key: str = "") -> dict:
    """Verify and parse the SEPARATELY-signed entitlements block. Returns the
    parsed entitlements dict only if its Ed25519 signature is valid, it is bound
    to this product, and (when known) to this license_key — otherwise {} so the
    caller falls back to safe defaults. Older issuers that don't send the block
    simply yield {}; this never weakens the main license verification."""
    ep = data.get("entitlements_payload", "")
    es = data.get("entitlements_signature", "")
    if not ep or not es:
        return {}
    if not _verify_signature(ep, es):
        logger.warning("AXTO Legal — entitlements signature invalid, ignoring (safe defaults apply)")
        return {}
    parts = ep.split("|")
    if len(parts) < len(ENTITLEMENTS_FIELDS):
        return {}
    fields = dict(zip(ENTITLEMENTS_FIELDS, parts))
    if fields.get("product") and fields["product"] != PRODUCT_CODE:
        return {}
    if expected_key and fields.get("license_key") and fields["license_key"] != expected_key:
        logger.warning("AXTO Legal — entitlements bound to a different license, ignoring")
        return {}
    return _parse_entitlements(fields.get("entitlements", ""))


def _ent_int(ent: dict, feats: dict, key: str, default: int) -> int:
    """Resolve an integer entitlement: SIGNED entitlements first (authoritative),
    then the (transitional) unsigned features object, then the safe default."""
    for src in (ent, feats):
        if key in src and src[key] not in ("", None):
            try:
                return int(src[key])
            except (TypeError, ValueError):
                pass
    return default


_state: Optional[LicenseState] = None
_last_validated: float = 0.0


def _parse_response(data: dict, key: str = "", mid: str = "", nonce=None) -> LicenseState:
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
    problem = _binding_problem(payload, key, mid, nonce) if key else "unbound"
    if problem:
        logger.error("AXTO Legal — signed response refused (%s)", problem)
        return LicenseState(False, f"untrusted_response:{problem}")

    valid  = payload.get("valid", "false").lower() == "true"
    status = payload.get("status", "")
    prod   = payload.get("product", "")

    if prod != PRODUCT_CODE:
        return LicenseState(False, f"wrong_product:{prod}")

    if status in ("revoked", "suspended", "expired"):
        valid = False

    # ── Entitlements (package + per-tier limits) ──────────────────────────────
    # AUTHORITATIVE source is the SEPARATELY-signed entitlements block, verified
    # and bound to this license_key — a client cannot edit its cache to unlock a
    # higher tier. The unsigned `features`/`package_code` fields are only a
    # transitional fallback (older issuer responses) and are never trusted over
    # the signed value; safe defaults apply if neither is present.
    ent   = _verified_entitlements(data, payload.get("license_key", ""))
    feats = data.get("features", {}) if isinstance(data.get("features"), dict) else {}
    package = ent.get("package") or data.get("package_code") or data.get("package") or ""

    return LicenseState(
        valid          = valid,
        status         = status,
        plan           = package or "starter",
        package        = package,
        client_name    = data.get("client_name", ""),
        expires_at     = payload.get("expires_at", ""),
        max_users      = _ent_int(ent, feats, "max_users", 10),
        max_countries  = _ent_int(ent, feats, "max_countries", 3),
        max_frameworks = _ent_int(ent, feats, "max_frameworks", 5),
        edition        = ent.get("edition") or feats.get("edition") or "enterprise",
        workspaces     = _ent_int(ent, feats, "workspaces", 5),
    )


async def validate(license_key: str) -> LicenseState:
    global _state, _last_validated

    # ── Lifetime (offline) licence — verified locally, no network ────────────
    off = offline_activation()
    if off:
        ent = off["ent"]
        num = lambda k, d: ent[k] if isinstance(ent.get(k), int) else d
        if not (_state and _state.status == "lifetime_offline"):
            logger.info("✅ AXTO Legal — lifetime licence %s verified offline", off["license_id"])
        _state = LicenseState(
            True, "lifetime_offline", plan=str(ent.get("package", "")) or "legal_enterprise",
            package=str(ent.get("package", "")), client_name="", expires_at="",
            max_users=num("max_users", -1), max_countries=num("max_countries", -1),
            max_frameworks=num("max_frameworks", -1), edition=str(ent.get("edition", "enterprise")),
            workspaces=num("workspaces", -1),
        )
        return _state

    key = (license_key or "").strip()
    if not key or not key.upper().startswith(PRODUCT_PREFIX + "-"):
        if not key:
            logger.warning(offline_hint())
        return LicenseState(False, "invalid_key_prefix")

    _check_watermark(key)

    now = time.time()
    if now - _last_validated < 60 and _state and _state.valid:
        return _state

    key   = key.strip().upper()
    mid   = machine_id()
    nonce = os.urandom(16).hex()
    payload = {
        "license_key": key,
        "product":     PRODUCT_CODE,
        "version":     PRODUCT_VERSION,
        "machine_id":  mid,
        "nonce":       nonce,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(VALIDATE_URL, json=payload)
        data = resp.json()
        # Busy/unavailable server or an unsigned answer: same as unreachable —
        # never let it wipe a verified proof.
        if resp.status_code == 429 or resp.status_code >= 500 or not data.get("signed_payload"):
            raise RuntimeError(f"no signed answer (HTTP {resp.status_code})")
        _last_validated = time.time()
    except Exception as e:
        logger.warning("AXTO Legal — cannot reach license server: %s", e)
        cached = _read_cache()
        if cached:
            logger.info("AXTO Legal — serving from verified offline cache (grace active)")
            _state = _parse_response(cached, key, mid, None)
            return _state
        return LicenseState(False, "server_unreachable_no_cache")

    _state = _parse_response(data, key, mid, nonce)

    if _state.valid:
        _write_cache(data)
    else:
        _clear_cache()

    return _state


def require_valid(state: LicenseState) -> None:
    if not state.valid:
        raise SystemExit(
            f"\n❌ AXTO Legal license invalid: {state.status}\n"
            f"   Please verify your license key or visit https://axto.io/app/self-hosted\n"
            f"   Support: hello@axto.io\n"
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
        logger.warning("⚠️  AXTO Legal license expires in %d days. Renew at https://axto.io/app/self-hosted", days_left)
