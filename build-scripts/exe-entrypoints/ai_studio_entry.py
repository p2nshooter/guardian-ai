# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
#!/usr/bin/env python3
"""
AXTO AI Studio — Windows EXE Entry Point (PyInstaller)
Self-hosted AI workspace — runs as standalone .exe
"""
import sys, os

# When frozen by PyInstaller, set working directory correctly
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

if __name__ == "__main__":
    import uvicorn

    # Create required directories
    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "config"), exist_ok=True)

    # Set environment defaults
    os.environ.setdefault("AI_STUDIO_DB",     os.path.join(BASE_DIR, "data", "studio.db"))
    os.environ.setdefault("AI_STUDIO_CONFIG", os.path.join(BASE_DIR, "ai-studio.yml"))

    PORT = int(os.environ.get("AI_STUDIO_PORT", "8091"))

    print("=" * 62)
    print("  🧠  AXTO AI Studio v2.0.0")
    print("  Self-Hosted AI Workspace — 14+ Providers")
    print("=" * 62)
    print(f"  Dashboard : http://localhost:{PORT}")
    print(f"  API       : http://localhost:{PORT}/api/chat")
    print(f"  WebSocket : ws://localhost:{PORT}/ws/chat")
    print(f"  Data      : {os.path.join(BASE_DIR, 'data')}")
    print("=" * 62)
    print("  Press Ctrl+C to stop")
    print()

    # Open browser automatically
    try:
        import threading, webbrowser, time
        def open_browser():
            time.sleep(2.5)
            webbrowser.open(f"http://localhost:{PORT}")
        threading.Thread(target=open_browser, daemon=True).start()
    except Exception:
        pass

    uvicorn.run(
        "src.api:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="warning",
    )
