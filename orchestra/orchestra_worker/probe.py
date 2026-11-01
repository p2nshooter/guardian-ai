# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — GPU test inside the worker image (REQUESTS 136, BLUEPRINT-V4 §31.F G2).

AXTO Setup runs this before the GPU worker starts, with the GPU handed to the
container exactly as compose will (NVIDIA: --gpus all; AMD: /dev/kfd + /dev/dri;
Intel: /dev/dri), on Windows and Linux alike:

    docker run --rm --gpus all --entrypoint python axto/orchestra-worker-gpu -m orchestra_worker.probe

It prints one JSON line {"ok", "gpus", "torch", "detail", "variant"} and exits 0 when the
container can really compute on a GPU, 3 when it cannot. Nothing is started,
registered or written.
"""
from __future__ import annotations

import json
import os
import sys

from orchestra_worker import gpu_inventory


def probe() -> dict:
    inv = gpu_inventory.inventory()
    usable = [g for g in inv["gpus"] if g.get("usable")]
    blocked = [g for g in inv["gpus"] if not g.get("usable")]
    torch_dev = ""
    try:
        import torch  # type: ignore
        if torch.cuda.is_available():
            torch_dev = f"cuda×{torch.cuda.device_count()}"
        elif hasattr(torch, "xpu") and torch.xpu.is_available():
            torch_dev = f"xpu×{torch.xpu.device_count()}"
    except Exception:
        torch_dev = ""
    ok = bool(usable)
    detail = ""
    variant = os.environ.get("GPU_VARIANT", "")
    want = {"nvidia": "cuda", "amd": "rocm"}.get(usable[0]["vendor"], "") if usable else ""
    if ok and variant and want and variant != want:
        # e.g. an AMD card handed to the NVIDIA (CUDA) build: chat via Ollama works, PyTorch does not.
        detail = (f"this is the {variant.upper()} build of the GPU worker; the {usable[0]['name']} needs "
                  f"axto/orchestra-worker-gpu{'-amd' if want == 'rocm' else ''}")
    if not ok:
        detail = "; ".join(f"{g['name']}: {g['access_note']}" for g in blocked if g.get("access_note")) or \
                 ("WSL 2 GPU (/dev/dxg) present but no NVIDIA GPU passed through" if inv["access"].get("wsl")
                  else "no GPU visible inside the container")
    elif not detail and usable[0]["vendor"] in ("nvidia", "amd", "intel") and not torch_dev:
        detail = "the GPU is visible, but PyTorch in this image cannot use it — chat via Ollama still works"
    return {"ok": ok, "gpus": [f"{g['name']} ({g['vram_gb']:g} GB)" if g.get("vram_gb") else g["name"] for g in usable],
            "torch": torch_dev, "detail": detail, "variant": variant}


if __name__ == "__main__":
    result = probe()
    print(json.dumps(result))
    sys.exit(0 if result["ok"] else 3)
