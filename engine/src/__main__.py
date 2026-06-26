# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""Entry point for `python -m src` — starts the Guardian Node agent."""
import asyncio
from src.node import main

if __name__ == "__main__":
    asyncio.run(main())
