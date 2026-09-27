# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — runtime settings.

Order of precedence for every setting: environment variable → orchestra.yml
→ generated default. Must be applied (apply()) BEFORE the other orchestra
modules are imported, because several of them read the environment at import.

Secrets are never shipped with a default value. If the console password or the
worker token is not configured, a strong random value is generated once,
stored in DATA_DIR/.secrets.json (the persistent Docker volume, 0600) and
printed to the log on first start only. Workers in the same compose project
mount the same volume read-only and pick the values up automatically.
"""
import json
import logging
import os
import secrets
from pathlib import Path

log = logging.getLogger("orchestra.settings")

DATA_DIR     = Path(os.environ.get("DATA_DIR", "./data"))
CONFIG_PATH  = Path(os.environ.get("ORCHESTRA_CONFIG", str(Path(__file__).parent / "config" / "orchestra.yml")))
SECRETS_PATH = DATA_DIR / ".secrets.json"

# env var → key under `orchestra:` in orchestra.yml
_FROM_YAML = {
    "AXTO_LICENSE_KEY":           "license_key",
    "AXTO_LICENSE_SERVER":        "license_validate_url",
    "ORCHESTRA_CONSOLE_PASSWORD": "console_password",
    "ORCHESTRA_WORKER_TOKEN":     "worker_token",
}
_GENERATED = ("ORCHESTRA_CONSOLE_PASSWORD", "ORCHESTRA_WORKER_TOKEN")
_PLACEHOLDERS = ("XXXX", "CHANGE_ME", "REPLACE_ME", "orchestra-console", "orchestra-worker-secret")


def _real(value) -> str:
    v = str(value or "").strip()
    if not v or any(p in v for p in _PLACEHOLDERS):
        return ""
    return v


def load_yaml() -> dict:
    """The `orchestra:` block of orchestra.yml ({} when missing/unreadable)."""
    try:
        import yaml
        with open(CONFIG_PATH) as f:
            doc = yaml.safe_load(f) or {}
        block = doc.get("orchestra", doc)
        return block if isinstance(block, dict) else {}
    except FileNotFoundError:
        return {}
    except Exception as e:
        log.warning(f"Could not read {CONFIG_PATH}: {e}")
        return {}


def _load_secrets() -> dict:
    try:
        return json.loads(SECRETS_PATH.read_text())
    except Exception:
        return {}


def apply(generate: bool = True) -> dict:
    """Resolves settings into os.environ. Workers call apply(generate=False):
    they only read what the core has already generated."""
    cfg = load_yaml()
    for env, key in _FROM_YAML.items():
        if not _real(os.environ.get(env)) and _real(cfg.get(key)):
            os.environ[env] = str(cfg[key]).strip()

    stored = _load_secrets()
    created = {}
    for env in _GENERATED:
        if _real(os.environ.get(env)):
            continue
        if _real(stored.get(env)):
            os.environ[env] = stored[env]
        elif generate:
            created[env] = os.environ[env] = secrets.token_urlsafe(24)

    if created:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            SECRETS_PATH.write_text(json.dumps({**stored, **created}, indent=2))
            os.chmod(SECRETS_PATH, 0o600)
        except Exception as e:
            log.warning(f"Could not persist generated secrets: {e}")
        for env, value in created.items():
            log.warning(f"Generated {env} (first start only — set it in orchestra.yml to choose your own): {value}")
    return cfg


def vendor_keys(cfg: dict) -> list:
    """BYOK vendor entries from orchestra.yml → [(provider, api_key, label)]."""
    out = []
    vendors = ((cfg.get("ai_pool") or {}).get("vendors") or []) if isinstance(cfg, dict) else []
    for v in vendors:
        if not isinstance(v, dict):
            continue
        provider = str(v.get("provider") or "").strip().lower()
        key = _real(v.get("api_key"))
        if provider and key:
            out.append((provider, key, str(v.get("model") or "")))
    return out
