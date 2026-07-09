# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Vault Enterprise — PyInstaller Entry Point"""
import sys, os, argparse
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))
import uvicorn
from src.config.settings import get_config
from src.api import app
if __name__ == "__main__":
    cfg = get_config()
    parser = argparse.ArgumentParser(description="AXTO Vault Enterprise")
    parser.add_argument("--host", default=getattr(cfg, 'api_host', '0.0.0.0'))
    parser.add_argument("--port", type=int, default=getattr(cfg, 'api_port', 8080))
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
