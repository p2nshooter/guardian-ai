# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — Database init."""
from pathlib import Path
import aiosqlite

async def init_db(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    for sub in ("plans", "webhooks"):
        (data_dir / sub).mkdir(exist_ok=True)
    async with aiosqlite.connect(str(data_dir / "edge.db")) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.commit()
