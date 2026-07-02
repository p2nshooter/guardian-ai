# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""Yusron Power entry point — `python -m src` or the PyInstaller EXE."""
import uvicorn
from src.config import get_config

cfg = get_config()
uvicorn.run("src.api:app", host=cfg.api_host, port=cfg.api_port, log_level="info")
