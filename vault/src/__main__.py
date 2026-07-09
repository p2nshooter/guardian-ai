# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
import uvicorn
from src.config.settings import get_config
cfg = get_config()
uvicorn.run("src.api:app", host=cfg.api_host, port=cfg.api_port, log_level="info")
