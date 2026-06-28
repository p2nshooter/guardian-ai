# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
from __future__ import annotations
import os
from pathlib import Path
from typing import Optional, List, Literal
import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings

CONFIG_PATH = Path(os.environ.get("GUARDIAN_CONFIG", "/guardian/config/guardian.yml"))

# Scan mode values
# "auto"   → node scans automatically every scan_interval seconds (default)
# "manual" → node only scans when explicitly triggered via API
# "off"    → scanning completely disabled on this node (API scans still work on Core)
ScanMode = Literal["auto", "manual", "off"]

# DB mode
# "sqlite"      → single-node SQLite (Tier 1, default)
# "distributed" → PostgreSQL + Redis (Tier 2)
DBMode = Literal["sqlite", "distributed"]


class AIVendorConfig(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None


class GuardianConfig(BaseSettings):
    license_key:          str  = ""
    machine_id:           Optional[str] = None
    license_validate_url: str  = ""
    ai_vendors:           List[AIVendorConfig] = []
    threat_feed_url:      str  = "https://pub-d69a77d3bbf94764be022e1453b16a10.r2.dev"
    data_dir:             Path = Path("/guardian/data")
    log_dir:              Path = Path("/guardian/logs")
    api_port:             int  = 8080
    api_host:             str  = "0.0.0.0"
    heartbeat_interval:   int  = 3600   # seconds between license heartbeats
    scan_interval:        int  = 300    # seconds between auto scans (5 min default)
    max_nodes:            int  = 1

    # ── Antivirus scan mode ──────────────────────────────────────────────────
    scan_mode:            ScanMode = "auto"

    # Paths to scan (comma-separated in env var, list in YAML)
    scan_paths:           List[str] = ["/host", "/tmp"]

    # ── Tier 2: Distributed DB ───────────────────────────────────────────────
    # Set db_mode=distributed dan isi postgres_url untuk aktifkan Tier 2
    db_mode:              DBMode   = "sqlite"
    postgres_url:         str      = ""   # postgresql://user:pass@host:5432/guardian
    redis_url:            str      = "redis://localhost:6379/0"

    # ── Tier 2: mTLS ─────────────────────────────────────────────────────────
    # Set mtls_enabled=true dan siapkan cert/key/ca untuk node-to-core mTLS
    mtls_enabled:         bool     = False
    mtls_cert_path:       str      = "/guardian/certs/node.crt"
    mtls_key_path:        str      = "/guardian/certs/node.key"
    mtls_ca_path:         str      = "/guardian/certs/ca.crt"

    # ── Tier 2: eBPF ─────────────────────────────────────────────────────────
    ebpf_enabled:         bool     = False   # requires Linux + BCC installed

    # ── Multi-tenant ────────────────────────────────────────────────────────
    multitenant:          bool     = False
    tenant_id:            str      = "default"
    superadmin_key:       str      = ""

    class Config:
        env_prefix = "GUARDIAN_"


def load_config() -> GuardianConfig:
    cfg_data: dict = {}
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f) or {}
            cfg_data = raw.get("guardian", {})

    vendors = [AIVendorConfig(**v) for v in cfg_data.get("ai_pool", {}).get("vendors", [])]
    cfg_data["ai_vendors"] = vendors

    # Handle scan_paths from YAML (list) — env var overrides
    if "scan_paths" not in cfg_data:
        cfg_data["scan_paths"] = ["/host", "/tmp"]

    # ── BUG FIX #1: Load persisted license key from license.key file ──────────
    # Activation wizard saves key to {data_dir}/license.key after first-run.
    # This persists the key across container restarts (survives guardian.yml reset).
    # Priority: env var > license.key file > guardian.yml value
    data_dir_path = Path(os.environ.get("DATA_DIR", str(cfg_data.get("data_dir", "/guardian/data"))))
    license_key_file = data_dir_path / "license.key"
    if license_key_file.exists():
        try:
            saved_key = license_key_file.read_text().strip()
            if saved_key and saved_key.startswith("GUARD"):
                cfg_data["license_key"] = saved_key
        except Exception:
            pass
    # Env var takes highest priority
    for env_name in ("GUARDIAN_LICENSE_KEY", "AXTO_LICENSE_KEY"):
        env_val = os.environ.get(env_name, "")
        if env_val:
            cfg_data["license_key"] = env_val
            break

    # ── Tier 2: parse tier2: block from YAML ─────────────────────────────────
    tier2 = cfg_data.pop("tier2", {})
    if isinstance(tier2, dict):
        for key in ("db_mode", "postgres_url", "redis_url", "ebpf_enabled"):
            if key in tier2:
                cfg_data.setdefault(key, tier2[key])
        mtls = tier2.get("mtls", {})
        if isinstance(mtls, dict):
            if mtls.get("enabled"):
                cfg_data.setdefault("mtls_enabled", True)
            for k, fld in (("cert_path","mtls_cert_path"),
                           ("key_path","mtls_key_path"),
                           ("ca_path","mtls_ca_path")):
                if k in mtls:
                    cfg_data.setdefault(fld, mtls[k])

    # Propagate distributed DB config into env so database_distributed.py sees them
    if cfg_data.get("db_mode") == "distributed":
        os.environ.setdefault("GUARDIAN_DB_MODE",      "distributed")
    if cfg_data.get("postgres_url"):
        os.environ.setdefault("GUARDIAN_POSTGRES_URL", cfg_data["postgres_url"])
    if cfg_data.get("redis_url"):
        os.environ.setdefault("GUARDIAN_REDIS_URL",    cfg_data["redis_url"])

    filtered = {k: v for k, v in cfg_data.items() if k != "ai_pool"}
    return GuardianConfig(**filtered)


_config: Optional[GuardianConfig] = None


def get_config() -> GuardianConfig:
    global _config
    if _config is None:
        _config = load_config()
    return _config


def reload_config() -> GuardianConfig:
    """Force reload config from disk — used after scan mode changes."""
    global _config
    _config = load_config()
    return _config
