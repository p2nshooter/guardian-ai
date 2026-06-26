# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
#!/usr/bin/env python3
"""AXTO Studio — Windows EXE Entry Point (PyInstaller)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  AXTO Studio — Self-Hosted AI & GPU Pool Platform")
    print("  Starting on http://localhost:8090")
    print("  Dashboard: http://localhost:8090")
    print("  API: http://localhost:8090/api/chat")
    print("  WebSocket: ws://localhost:8090/ws/chat")
    print("=" * 60)
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    os.makedirs("artifacts", exist_ok=True)
    os.environ.setdefault("STUDIO_DB_PATH", os.path.join("data", "studio.db"))
    os.environ.setdefault("STUDIO_CONFIG", "studio.yml")
    uvicorn.run("src.api:app", host="0.0.0.0", port=8090, reload=False)
