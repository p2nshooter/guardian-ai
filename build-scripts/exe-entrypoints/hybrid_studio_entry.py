# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
#!/usr/bin/env python3
"""AXTO Hybrid Studio — Windows EXE Entry Point (PyInstaller)"""
import sys, os

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

if __name__ == "__main__":
    import uvicorn

    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "config"), exist_ok=True)

    os.environ.setdefault("HYBRID_STUDIO_DB",     os.path.join(BASE_DIR, "data", "studio.db"))
    os.environ.setdefault("HYBRID_STUDIO_CONFIG", os.path.join(BASE_DIR, "hybrid-studio.yml"))

    PORT = int(os.environ.get("HYBRID_STUDIO_PORT", "8093"))

    print("=" * 62)
    print("  ⚡  AXTO Hybrid Studio v2.0.0")
    print("  Pipeline Automation: AI + GPU + Voice + Sound")
    print("=" * 62)
    print(f"  Dashboard : http://localhost:{PORT}")
    print(f"  API       : http://localhost:{PORT}/api/workflows")
    print(f"  WebSocket : ws://localhost:{PORT}/ws/pipeline")
    print(f"  Data      : {os.path.join(BASE_DIR, 'data')}")
    print("=" * 62)
    print("  Press Ctrl+C to stop")
    print()

    try:
        import threading, webbrowser, time
        def open_browser():
            time.sleep(2.5)
            webbrowser.open(f"http://localhost:{PORT}")
        threading.Thread(target=open_browser, daemon=True).start()
    except Exception:
        pass

    uvicorn.run("src.api:app", host="0.0.0.0", port=PORT, reload=False, log_level="warning")
