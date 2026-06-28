# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian Node — PyInstaller Entry Point

NOTE: This is intentionally DIFFERENT from guardian_core_entry.py. Guardian
Core runs the central API/dashboard (uvicorn + FastAPI). Guardian Node is the
lightweight per-server agent that reports threat telemetry back to a Guardian
Core instance — it has no HTTP server of its own, just an async reporting
loop. Configuration is entirely via environment variables (no CLI flags):

    GUARDIAN_CORE_URL          URL of the Guardian Core this node reports to
    GUARDIAN_NODE_ID           Stable identifier for this node (default: random)
    GUARDIAN_NODE_NAME         Display name (default: hostname)
    GUARDIAN_REPORT_INTERVAL   Seconds between telemetry reports (default: 60)
    GUARDIAN_REGISTER_RETRIES  Retries for initial registration (default: 10)
    GUARDIAN_MTLS_ENABLED      "true"/"false" — mutual TLS to Core
    VAULT_LICENSE_KEY / etc.   Product license key (see src/license.py)
"""
import sys, os, asyncio
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
from src.node import main

if __name__ == "__main__":
    asyncio.run(main())
