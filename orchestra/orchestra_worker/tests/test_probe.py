# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""The GPU test AXTO Setup runs inside the worker image before the GPU worker starts
(REQUESTS 136, BLUEPRINT-V4 §31.F G2): one JSON line, exit 0 only when the container
can really compute on a GPU, and the reason when it cannot."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, ROOT)

from orchestra_worker import probe as pr


def _inv(gpus, wsl=False):
    return lambda: {"gpus": gpus, "primary": gpus[0] if gpus else None, "sources": [], "usable_count": sum(g["usable"] for g in gpus),
                    "access": {"nvidia": [], "kfd": False, "render": {}, "wsl": wsl}}


def test_usable_gpu_passes(monkeypatch):
    monkeypatch.setattr(pr.gpu_inventory, "inventory", _inv([{"name": "NVIDIA GeForce RTX 4090", "vendor": "nvidia", "vram_gb": 24.0,
                                                                  "usable": True, "access_note": ""}]))
    r = pr.probe()
    assert r["ok"] is True and r["gpus"] == ["NVIDIA GeForce RTX 4090 (24 GB)"]


def test_found_but_blocked_gpu_fails_with_the_reason(monkeypatch):
    monkeypatch.setattr(pr.gpu_inventory, "inventory", _inv([{"name": "AMD Radeon RX 7900 XTX", "vendor": "amd", "vram_gb": 24.0, "usable": False,
                                                                  "access_note": "needs /dev/kfd and /dev/dri in the container (compose profile gpu-amd)"}]))
    r = pr.probe()
    assert r["ok"] is False and "/dev/kfd" in r["detail"] and "AMD Radeon RX 7900 XTX" in r["detail"]


def test_wsl_without_nvidia_says_so(monkeypatch):
    monkeypatch.setattr(pr.gpu_inventory, "inventory", _inv([], wsl=True))
    assert "WSL 2" in pr.probe()["detail"]


def test_command_line_prints_one_json_line_and_exits_3_without_a_gpu():
    out = subprocess.run([sys.executable, "-m", "orchestra_worker.probe"], cwd=ROOT, capture_output=True, text=True, timeout=120)
    line = [l for l in out.stdout.splitlines() if l.startswith("{")][-1]
    data = json.loads(line)
    assert set(data) == {"ok", "gpus", "torch", "detail"}
    assert out.returncode == (0 if data["ok"] else 3)
