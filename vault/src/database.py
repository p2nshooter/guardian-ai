# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Vault — Database initialization."""
from pathlib import Path
import aiosqlite


async def init_db(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    # Main DB is managed by AuditEngine
    # This ensures the data directory exists and basic structure is ready
    db_path = data_dir / "vault_audit.db"
    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.commit()
