# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Guardian Core — PyInstaller Entry Point"""
import sys, os, argparse
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
import uvicorn
from src.api import app
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AXTO Guardian Core")
    parser.add_argument("--host", default=os.environ.get("GUARDIAN_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("GUARDIAN_PORT", "8080")))
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
