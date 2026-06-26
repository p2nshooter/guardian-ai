# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Studio — Credential Encryption Utility
Encrypts API keys using AES-128-CBC via Fernet (symmetric, machine-bound).
Key is derived from machine ID + license key hash — never stored plain.
"""
from __future__ import annotations
import base64, hashlib, json, logging, os
from typing import Optional

log = logging.getLogger("studio.crypto")

def _derive_key(seed: str = "") -> bytes:
    """Derive a stable 32-byte key from machine fingerprint + optional seed."""
    import socket, platform
    # Combine stable machine identifiers
    parts = [
        socket.gethostname(),
        platform.node(),
        os.environ.get("STUDIO_SECRET", ""),
        seed,
        "axto-studio-v2",
    ]
    material = "|".join(p for p in parts if p)
    digest = hashlib.sha256(material.encode()).digest()
    return base64.urlsafe_b64encode(digest)  # 44 bytes, valid Fernet key


def encrypt_credential(data: dict, seed: str = "") -> str:
    """Encrypt a credential dict to an opaque string."""
    try:
        from cryptography.fernet import Fernet
        key = _derive_key(seed)
        f = Fernet(key)
        plaintext = json.dumps(data).encode()
        return f.encrypt(plaintext).decode()
    except Exception as e:
        log.warning(f"Encryption unavailable ({e}), using base64 fallback")
        # Fallback: base64 obfuscation (not cryptographically secure but better than plaintext)
        return "b64:" + base64.b64encode(json.dumps(data).encode()).decode()


def decrypt_credential(token: str, seed: str = "") -> dict:
    """Decrypt a credential token back to dict."""
    if not token:
        return {}
    try:
        # Handle base64 fallback
        if token.startswith("b64:"):
            return json.loads(base64.b64decode(token[4:]).decode())
        # Handle plain JSON (legacy unencrypted)
        if token.startswith("{"):
            return json.loads(token)
        # Fernet decryption
        from cryptography.fernet import Fernet, InvalidToken
        key = _derive_key(seed)
        f = Fernet(key)
        plaintext = f.decrypt(token.encode())
        return json.loads(plaintext.decode())
    except Exception as e:
        log.warning(f"Decryption failed ({e}), trying legacy JSON parse")
        try:
            return json.loads(token)
        except Exception:
            return {}


def migrate_plaintext_credential(raw: str, seed: str = "") -> Optional[str]:
    """Migrate a plaintext JSON credential to encrypted format."""
    if not raw or raw.startswith("b64:"):
        return None
    try:
        data = json.loads(raw)
        return encrypt_credential(data, seed)
    except Exception:
        return None
