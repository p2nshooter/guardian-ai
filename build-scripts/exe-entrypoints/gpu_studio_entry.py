# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
#!/usr/bin/env python3
"""AXTO GPU Studio — Windows EXE Entry Point (PyInstaller)"""
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

    os.environ.setdefault("GPU_STUDIO_DB",     os.path.join(BASE_DIR, "data", "studio.db"))
    os.environ.setdefault("GPU_STUDIO_CONFIG", os.path.join(BASE_DIR, "gpu-studio.yml"))

    PORT = int(os.environ.get("GPU_STUDIO_PORT", "8092"))

    print("=" * 62)
    print("  🎨  AXTO GPU Studio v2.0.0")
    print("  Self-Hosted Creative AI — Image · Video · Generation")
    print("=" * 62)
    print(f"  Dashboard : http://localhost:{PORT}")
    print(f"  API       : http://localhost:{PORT}/api/generate")
    print(f"  WebSocket : ws://localhost:{PORT}/ws/generate")
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
