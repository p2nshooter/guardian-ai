# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Yusron Power entry point — works three ways:
  • `python -m src`         (from the yp/ directory)
  • Docker  `uvicorn src.api:app`
  • PyInstaller onefile EXE

To be robust across all three, we make the package root (the directory that
CONTAINS the `src` package) importable, then hand uvicorn the app OBJECT
directly rather than an import string — so it never depends on the current
working directory being right.
"""
import os
import sys
from pathlib import Path

# Directory containing the `src` package = parent of this file's directory.
_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

import uvicorn
from src.config import get_config
from src.api import app

cfg = get_config()
uvicorn.run(app, host=cfg.api_host, port=cfg.api_port, log_level="info")
