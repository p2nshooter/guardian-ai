# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
import os
import uvicorn

port = int(os.environ.get("AV_PORT", "8097"))
host = os.environ.get("AV_HOST", "0.0.0.0")

uvicorn.run("src.api:app", host=host, port=port, log_level="info")
