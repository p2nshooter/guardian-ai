# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO SOC — PyInstaller Entry Point"""
import sys, os, argparse
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
import uvicorn
from src.api import app
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AXTO SOC")
    parser.add_argument("--host", default=os.environ.get("SOC_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("SOC_PORT", "8092")))
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
