# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Studio Engine — Entry Point"""
import uvicorn
if __name__ == "__main__":
    uvicorn.run("src.api:app", host="0.0.0.0", port=8080, reload=False)
