# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Credential Vault
AES-256-GCM encrypted storage for AI provider API keys.
Keys never written to disk in plaintext. Ever.
Master key derived from hardware fingerprint + console password.
"""
import json
import os
import base64
import hashlib
import secrets
import logging
from pathlib import Path
from typing import Optional, Dict, List

logger = logging.getLogger("orchestra.vault")

DATA_DIR    = Path(os.environ.get("DATA_DIR", "./data"))
VAULT_PATH  = DATA_DIR / "credential_vault.enc"

import threading as _threading
_vault_cache: Optional[dict] = None
_vault_lock  = _threading.Lock()


# ── Key Derivation ────────────────────────────────────────────────────────────

def _derive_master_key(unit_id: str, console_password: str) -> bytes:
    """
    Derive 256-bit master key from hardware fingerprint + console password.
    Uses PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP 2024 recommendation).
    """
    salt = hashlib.sha256(f"axto-vault-{unit_id}".encode()).digest()
    key = hashlib.pbkdf2_hmac(
        "sha256",
        console_password.encode(),
        salt,
        iterations=600_000,
        dklen=32
    )
    return key


def _get_master_key() -> bytes:
    from enforcement import get_enforcement_state
    state    = get_enforcement_state()
    unit_id  = state.get("unit_id", "unknown")
    password = os.environ.get("ORCHESTRA_CONSOLE_PASSWORD", "orchestra-console")
    return _derive_master_key(unit_id, password)


# ── AES-256-GCM Encrypt / Decrypt ─────────────────────────────────────────────

def _encrypt(plaintext: str, key: bytes) -> str:
    """Encrypt with AES-256-GCM. Returns base64(nonce + ciphertext + tag)."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce = secrets.token_bytes(12)  # 96-bit nonce
        aesgcm = AESGCM(key)
        ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ct).decode()
    except ImportError:
        # Fallback: XOR with key hash (development only — NOT production safe)
        logger.warning("cryptography not installed — using unsafe fallback encryption")
        key_hash = hashlib.sha256(key).digest()
        data = plaintext.encode()
        encrypted = bytes(b ^ key_hash[i % 32] for i, b in enumerate(data))
        return base64.b64encode(encrypted).decode()


def _decrypt(ciphertext_b64: str, key: bytes) -> str:
    """Decrypt AES-256-GCM ciphertext."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        raw = base64.b64decode(ciphertext_b64.encode())
        nonce = raw[:12]
        ct    = raw[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode()
    except ImportError:
        key_hash = hashlib.sha256(key).digest()
        data = base64.b64decode(ciphertext_b64.encode())
        decrypted = bytes(b ^ key_hash[i % 32] for i, b in enumerate(data))
        return decrypted.decode()


# ── Vault Operations ─────────────────────────────────────────────────────────

def _load_vault() -> dict:
    global _vault_cache
    with _vault_lock:
        if _vault_cache is not None:
            return _vault_cache
        if not VAULT_PATH.exists():
            return {}
        try:
            raw = json.loads(VAULT_PATH.read_text())
            _vault_cache = raw
            return _vault_cache
        except Exception as e:
            logger.error(f"Vault load error: {e}")
            return {}


def _save_vault(vault: dict) -> None:
    global _vault_cache
    with _vault_lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        VAULT_PATH.write_text(json.dumps(vault, indent=2))
        if os.name != "nt":
            try:
                os.chmod(VAULT_PATH, 0o600)
            except Exception:
                pass
        _vault_cache = None  # Invalidate cache after write


def store_key(provider_id: str, api_key: str, label: str = "") -> dict:
    """
    Store API key encrypted. Provider ID is unique key (e.g. 'openai', 'anthropic').
    """
    try:
        master_key = _get_master_key()
        encrypted  = _encrypt(api_key, master_key)
        vault      = _load_vault()

        vault[provider_id] = {
            "label":      label or provider_id,
            "encrypted":  encrypted,
            "key_hint":   f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) >= 8 else "****",
            "provider":   provider_id.split("_")[0] if "_" in provider_id else provider_id,
            "stored_at":  __import__("datetime").datetime.utcnow().isoformat(),
        }
        _save_vault(vault)
        logger.info(f"Vault: stored key for provider '{provider_id}'")
        return {"ok": True, "hint": vault[provider_id]["key_hint"]}
    except Exception as e:
        logger.error(f"Vault store error: {e}")
        return {"ok": False, "error": str(e)}


def get_key(provider_id: str) -> Optional[str]:
    """Retrieve decrypted API key. Returns None if not found."""
    try:
        vault = _load_vault()
        entry = vault.get(provider_id)
        if not entry:
            return None
        master_key = _get_master_key()
        return _decrypt(entry["encrypted"], master_key)
    except Exception as e:
        logger.error(f"Vault retrieve error for '{provider_id}': {e}")
        return None


def delete_key(provider_id: str) -> bool:
    vault = _load_vault()
    if provider_id in vault:
        del vault[provider_id]
        _save_vault(vault)
        return True
    return False


def list_providers() -> List[dict]:
    """Return provider list with hints only — no decrypted keys."""
    vault = _load_vault()
    result = []
    for pid, entry in vault.items():
        result.append({
            "id":        pid,
            "label":     entry.get("label", pid),
            "provider":  entry.get("provider", pid),
            "hint":      entry.get("key_hint", "****"),
            "stored_at": entry.get("stored_at", ""),
        })
    return result


def test_connection(provider_id: str) -> dict:
    """Test that a stored key is valid by making a minimal API call."""
    api_key = get_key(provider_id)
    if not api_key:
        return {"ok": False, "error": "Key not found in vault"}

    provider = provider_id.split("_")[0] if "_" in provider_id else provider_id

    try:
        import urllib.request
        import urllib.error

        if provider == "openai":
            req = urllib.request.Request(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                return {"ok": r.status == 200, "status": r.status}

        elif provider == "anthropic":
            data = json.dumps({
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}]
            }).encode()
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=data,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    return {"ok": True, "status": r.status}
            except urllib.error.HTTPError as e:
                if e.code in (400, 200):  # 400 = valid key, bad request is fine
                    return {"ok": True, "status": e.code}
                return {"ok": False, "status": e.code}

        elif provider == "groq":
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                return {"ok": r.status == 200, "status": r.status}

        elif provider in ("gemini", "google"):
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as r:
                return {"ok": r.status == 200, "status": r.status}

        elif provider == "ollama":
            base_url = api_key  # For Ollama, api_key field stores the base URL
            req = urllib.request.Request(f"{base_url.rstrip('/')}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as r:
                return {"ok": r.status == 200, "status": r.status}

        else:
            return {"ok": True, "status": "unknown_provider_skipped"}

    except Exception as e:
        return {"ok": False, "error": str(e)}
