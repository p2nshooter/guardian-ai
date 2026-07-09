# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""Entry point for `python -m src` — starts the Guardian Node agent."""
import asyncio
from src.node import main

if __name__ == "__main__":
    asyncio.run(main())
