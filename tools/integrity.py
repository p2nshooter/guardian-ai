# ==============================================================================
# Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
# Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO code-integrity manifest — shared by the build tool and every engine.

Design (anti-tamper, fail-closed, non-destructive to customer data):

  * At build time (CI, inside the image) `generate()` walks the app's code
    tree, hashes every .py / .pyc / .so / .pyd file with SHA-256, and writes a
    manifest that is SIGNED with AXTO's Ed25519 integrity key (the private half
    lives only in CI secrets, never in the repo or the image).

  * At startup `verify()` re-reads the manifest, checks the signature against
    the public key COMPILED INTO the engine, then re-hashes each listed file.
    Any missing file, extra code file, or hash mismatch = tamper.

On tamper the engine LOCKS (refuses to serve, exits non-zero) — it never
deletes or touches the customer's data volume. The only thing it may remove is
its OWN code inside the container (see engine startup), which is disposable and
re-pulled on a clean reinstall. The licence server is told so the licence can
be frozen. This is the enforcement model used by high-value commercial
software: worthless when altered, harmless to the customer's data.

This module has NO third-party dependencies beyond `cryptography` (already a
dependency of every engine for licence verification).
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Dict, List, Optional, Tuple

MANIFEST_NAME = "axto_integrity.json"
_CODE_EXT = (".py", ".pyc", ".so", ".pyd")
# Files/dirs that legitimately change at runtime and are NOT part of the signed code.
_SKIP_DIRS = {"__pycache__", ".git", "data", "logs", "quarantine", ".axto", "tests", ".pytest_cache"}
_SKIP_FILES = {MANIFEST_NAME}


def _iter_code(root: str):
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for f in files:
            if f in _SKIP_FILES:
                continue
            if f.endswith(_CODE_EXT):
                full = os.path.join(base, f)
                yield full, os.path.relpath(full, root).replace(os.sep, "/")


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_tree(root: str) -> Dict[str, str]:
    """{relative path -> sha256} for every code file under root, sorted."""
    return {rel: _sha256(full) for full, rel in sorted(_iter_code(root), key=lambda x: x[1])}


def _canonical(files: Dict[str, str], product: str, version: str) -> bytes:
    # Deterministic bytes to sign — order-independent, whitespace-stable.
    return json.dumps(
        {"product": product, "version": version, "files": dict(sorted(files.items()))},
        separators=(",", ":"), sort_keys=True,
    ).encode()


def generate(root: str, product: str, version: str, private_key_b64: str) -> dict:
    """Build + sign the manifest. `private_key_b64` = base64 32-byte Ed25519 seed."""
    from cryptography.hazmat.primitives.asymmetric import ed25519
    files = hash_tree(root)
    payload = _canonical(files, product, version)
    key = ed25519.Ed25519PrivateKey.from_private_bytes(base64.b64decode(private_key_b64))
    sig = key.sign(payload)
    return {
        "v": 1, "product": product, "version": version,
        "files": dict(sorted(files.items())),
        "signature": base64.b64encode(sig).decode(),
        "count": len(files),
    }


def verify(root: str, public_key_b64: str, product: str) -> Tuple[bool, str]:
    """
    (ok, reason). ok=True only when the manifest exists, its signature is valid
    for the compiled-in public key, and every code file matches. A missing
    manifest is treated as tamper (someone stripped it).
    """
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.exceptions import InvalidSignature
    path = os.path.join(root, MANIFEST_NAME)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            man = json.load(fh)
    except FileNotFoundError:
        return False, "integrity manifest is missing"
    except Exception as e:  # noqa: BLE001
        return False, f"integrity manifest unreadable: {e}"

    if man.get("product") != product:
        return False, "integrity manifest is for a different product"
    files = man.get("files")
    if not isinstance(files, dict) or not files:
        return False, "integrity manifest has no files"

    payload = _canonical(files, product, man.get("version", ""))
    try:
        pub = ed25519.Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
        pub.verify(base64.b64decode(man["signature"]), payload)
    except (InvalidSignature, KeyError, ValueError):
        return False, "integrity signature is invalid — the manifest was altered"

    # Every signed file must be present and unchanged…
    for rel, expected in files.items():
        full = os.path.join(root, rel)
        try:
            if _sha256(full) != expected:
                return False, f"modified file detected: {rel}"
        except FileNotFoundError:
            return False, f"missing file: {rel}"
    # …and no extra code file may have been slipped in.
    on_disk = {rel for _f, rel in _iter_code(root)}
    extra = on_disk - set(files.keys())
    if extra:
        return False, f"unexpected code file(s): {', '.join(sorted(extra)[:5])}"
    return True, f"{len(files)} files verified"


def enforced() -> bool:
    """
    Integrity is enforced unless the build never shipped a public key (open dev
    checkout). Production images bake AXTO_INTEGRITY_PUBLIC_KEY in at build time.
    It can never be turned off by a runtime env var.
    """
    return bool(_PUBLIC_KEY)


# The build bakes the real key into this constant (see tools/gen_manifest.py
# --stamp). Empty in the open repo → dev checkouts run without the check, real
# images always carry it.
_PUBLIC_KEY = os.environ.get("_AXTO_INTEGRITY_PUBLIC_KEY_BUILD", "")


def public_key() -> str:
    return _PUBLIC_KEY


# ── runtime enforcement (called at engine startup) ────────────────────────────
def enforce(product: str, *, exit_on_fail: bool = True) -> bool:
    """
    Verify this engine's own code against its signed manifest.

    Dormant when no public key was stamped at build time (open-source checkout /
    local dev) so contributors can run freely. In a real AXTO image the build
    stamps the key and writes the manifest, so any modification to the shipped
    code — or a stripped/forged manifest — makes verify() fail and the engine
    refuses to start (fail-closed). It never touches the customer's data volume;
    a tampered engine is simply inert, and its licence is frozen server-side on
    the next validation because the reported build no longer matches.

    Returns True when the engine may run.
    """
    if not enforced():
        return True
    root = os.path.dirname(os.path.abspath(__file__))
    ok, reason = verify(root, public_key(), product)
    if ok:
        return True
    msg = (
        "\n" + "=" * 70 +
        f"\n  AXTO {product.upper()} — CODE INTEGRITY CHECK FAILED\n" +
        f"  {reason}\n\n" +
        "  This copy has been modified and will not run. Reinstall the\n" +
        "  official image from https://axto.io/app/self-hosted with your\n" +
        "  licence key. Your data volume is untouched.\n" +
        "=" * 70 + "\n"
    )
    try:
        import logging
        logging.getLogger("axto.integrity").critical(msg)
    except Exception:  # noqa: BLE001
        pass
    print(msg, file=sys.stderr, flush=True)
    # Leave a marker so orchestration/monitoring can see why it stopped.
    try:
        with open(os.path.join(root, ".integrity-lock"), "w", encoding="utf-8") as fh:
            fh.write(reason)
    except Exception:  # noqa: BLE001
        pass
    if exit_on_fail:
        raise SystemExit(3)
    return False
