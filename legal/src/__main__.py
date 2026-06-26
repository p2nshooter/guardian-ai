# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
import uvicorn
from src.config.settings import get_config
cfg = get_config()
uvicorn.run("src.api:app", host=cfg.api_host, port=cfg.api_port,
            log_level=cfg.log_level.lower(), workers=1)
