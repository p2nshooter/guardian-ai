# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Product: AXTO Legal — AI-Driven Legal & Compliance Workflow Platform
# ==============================================================================
"""
AXTO Legal Core — PyInstaller Entry Point

Builds the `legal/` product as a standalone Windows .exe (no Docker needed
on client machines). Configured entirely via LEGL_* environment variables
or the legal.yml config file.

Default port: 8096
"""
import sys, os
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
import uvicorn
from src.config.settings import get_config

if __name__ == "__main__":
    cfg = get_config()
    uvicorn.run("src.api:app", host=cfg.api_host, port=cfg.api_port,
                log_level=cfg.log_level.lower())
