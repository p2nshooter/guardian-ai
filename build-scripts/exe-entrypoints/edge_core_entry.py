# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Edge Core — PyInstaller Entry Point

NOTE: This builds the `edge/` product ("Edge Core" — AI API Gateway & Billing
Engine, the dashboard's "edge-core" card). It is intentionally separate from
edge_entry.py, which builds the unrelated edge-agent/ codebase (a different,
not-yet-dashboard-exposed product). Do not merge these two.
"""
import sys, os
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
import uvicorn
from src.config.settings import get_config

if __name__ == "__main__":
    cfg = get_config()
    uvicorn.run("src.api:app", host=cfg.api_host, port=cfg.api_port, log_level="info")
