# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""GPU auto-detection for every brand (REQUESTS 113, BLUEPRINT-V4 §31).

Each brand's own output is fed in as text, so the tests run on any computer:
lspci names, sysfs trees, nvidia-smi, rocm-smi, xpu-smi, Win32_VideoController
and system_profiler. Virtual adapters never count as GPUs."""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))

import pytest

from orchestra_worker import gpu_inventory as gi

LSPCI = """\
00:02.0 "VGA compatible controller" "Intel Corporation" "Alder Lake-P GT2 [Iris Xe Graphics]" -r0c
01:00.0 "VGA compatible controller" "NVIDIA Corporation" "GA102 [GeForce RTX 3090]" -ra1
03:00.0 "Display controller" "Advanced Micro Devices, Inc. [AMD/ATI]" "Navi 31 [Radeon RX 7900 XT/7900 XTX]" -rc8
04:00.0 "VGA compatible controller" "Moore Threads Technology Co., Ltd." "MTT S80 [MUSA GPU]" -r01
05:00.0 "Processing accelerators" "Huawei Technologies Co., Ltd." "Ascend 910 [AI Processor]" -r00
06:00.0 "VGA compatible controller" "Microsoft Corporation" "Hyper-V virtual display adapter" -r00
07:00.0 "VGA compatible controller" "Red Hat, Inc." "Virtio GPU" -r00
08:00.0 "Ethernet controller" "Intel Corporation" "I210 Gigabit Network Connection" -r03
"""


def test_lspci_finds_every_display_brand_and_skips_virtual_and_network():
    gpus = gi.parse_lspci(LSPCI)
    assert [g["vendor"] for g in gpus] == ["intel", "nvidia", "amd", "moore", "huawei"]
    names = {g["vendor"]: g["name"] for g in gpus}
    assert names["nvidia"] == "NVIDIA GeForce RTX 3090"
    assert names["amd"] == "AMD Radeon RX 7900 XT/7900 XTX"
    assert names["intel"] == "Intel Iris Xe Graphics"
    assert names["moore"] == "Moore Threads MUSA GPU"
    assert names["huawei"] == "Huawei Ascend AI Processor"
    assert all(g["source"] == "lspci" for g in gpus)


@pytest.mark.parametrize("names, brand", [
    (("NVIDIA Corporation",), "nvidia"),
    (("Advanced Micro Devices, Inc. [AMD/ATI]",), "amd"),
    (("Intel Corporation",), "intel"),
    (("Apple Inc.",), "apple"),
    (("Moore Threads Technology",), "moore"),
    (("Huawei Technologies Co., Ltd.",), "huawei"),
    (("Biren Technology",), "biren"),
    (("Iluvatar CoreX",), "iluvatar"),
    (("MetaX Integrated Circuits",), "metax"),
    (("Enflame Technology",), "enflame"),
    (("Cambricon Technologies",), "cambricon"),
    (("Hygon",), "hygon"),
    (("Qualcomm Technologies, Inc.",), "qualcomm"),
    (("Arm Ltd. Mali-G78",), "arm"),
    (("Matrox Electronics",), "matrox"),
])
def test_every_brand_keeps_its_own_key(names, brand):
    assert gi.brand_of(*names)[0] == brand


def test_an_unknown_maker_is_still_a_gpu_under_its_own_name():
    key, label = gi.brand_of("Acme Compute Corp.")
    assert key == "other" and label == "Acme Compute"


def test_sysfs_tree_is_the_fallback_without_lspci(tmp_path):
    def card(name, cls, vendor, device):
        d = tmp_path / name
        d.mkdir()
        (d / "class").write_text(cls)
        (d / "vendor").write_text(vendor)
        (d / "device").write_text(device)
    card("0000:01:00.0", "0x030000\n", "0x10de\n", "0x2204\n")
    card("0000:03:00.0", "0x030000\n", "0x1002\n", "0x744c\n")
    card("0000:05:00.0", "0x120000\n", "0x19e5\n", "0xd802\n")
    card("0000:06:00.0", "0x030000\n", "0x1414\n", "0x008c\n")      # Microsoft: virtual
    card("0000:08:00.0", "0x020000\n", "0x8086\n", "0x1533\n")      # network card
    gpus = gi.sysfs_gpus(str(tmp_path))
    assert [g["vendor"] for g in gpus] == ["nvidia", "amd", "huawei"]
    assert gpus[0]["name"] == "NVIDIA GPU (PCI 10de:2204)"
    assert all(g["source"] == "sysfs" for g in gpus)


def test_nvidia_smi_gives_model_vram_and_driver():
    text = "NVIDIA GeForce RTX 4090, 24564, 560.35.03\nNVIDIA RTX A4000, 16376, 560.35.03\n"
    gpus = gi.parse_nvidia_smi(text)
    assert gpus[0]["name"] == "NVIDIA GeForce RTX 4090"
    assert gpus[0]["vram_gb"] == pytest.approx(24564 / 1024, rel=1e-3)
    assert gpus[1]["driver"] == "560.35.03" and gpus[1]["backend"] == "cuda"


def test_rocm_smi_json_gives_card_series_and_vram():
    text = json.dumps({
        "card0": {"Card series": "Radeon RX 7900 XTX", "Card model": "0x744c",
                  "VRAM Total Memory (B)": str(24 * 1024 ** 3)},
        "system": {"Driver version": "6.10"},
    })
    gpus = gi.parse_rocm_smi(text)
    assert [g["name"] for g in gpus] == ["AMD Radeon RX 7900 XTX"]
    assert gpus[0]["vram_gb"] == 24.0 and gpus[0]["backend"] == "rocm"
    # The PCI id first in the object, or alone, never becomes the name.
    swapped = json.dumps({"card0": {"Card model": "0x744c", "Card series": "Radeon RX 7900 XTX"}})
    assert gi.parse_rocm_smi(swapped)[0]["name"] == "AMD Radeon RX 7900 XTX"
    assert gi.parse_rocm_smi(json.dumps({"card0": {"Card model": "0x744c"}}))[0]["name"] == "AMD Radeon GPU"


def test_xpu_smi_json_gives_intel_arc_model_and_vram():
    text = json.dumps({"device_list": [{"device_id": 0, "device_name": "Intel(R) Arc(TM) A770 Graphics",
                                        "memory_physical_size_byte": 16 * 1024 ** 3}]})
    gpus = gi.parse_xpu_smi(text)
    assert gpus[0]["name"] == "Intel(R) Arc(TM) A770 Graphics"
    assert gpus[0]["vram_gb"] == 16.0 and gpus[0]["backend"] == "xpu"


def test_inventory_prefers_exact_vendor_tools_and_ranks_nvidia_first():
    def run(cmd):
        if cmd[0] == "lspci":
            return LSPCI
        if cmd[0] == "nvidia-smi":
            return "NVIDIA GeForce RTX 3090, 24576, 550.90\n"
        return ""
    inv = gi.inventory(run=run, platform="linux")
    assert inv["primary"]["vendor"] == "nvidia"
    assert inv["primary"]["vram_gb"] == 24.0
    nvidia = [g for g in inv["gpus"] if g["vendor"] == "nvidia"]
    assert len(nvidia) == 1 and nvidia[0]["source"] == "nvidia-smi"
    assert "nvidia-smi" in inv["sources"]


def test_inventory_without_any_gpu_is_empty():
    inv = gi.inventory(run=lambda cmd: "", sysfs_root="/nonexistent", platform="linux")
    assert inv == {"gpus": [], "primary": None, "sources": ["sysfs"]}


def test_windows_rows_use_registry_vram_and_skip_basic_display():
    rows = json.dumps([
        {"Name": "Microsoft Basic Display Adapter", "AdapterCompatibility": "Microsoft", "DriverVersion": "10.0"},
        {"Name": "NVIDIA GeForce RTX 4080", "AdapterCompatibility": "NVIDIA", "DriverVersion": "566.36"},
        {"Name": "Intel(R) Arc(TM) A380 Graphics", "AdapterCompatibility": "Intel Corporation", "DriverVersion": "31.0"},
    ])
    gpus = gi.parse_windows_gpus(rows, {"NVIDIA GeForce RTX 4080": 16.0})
    assert [g["vendor"] for g in gpus] == ["nvidia", "intel"]
    assert gpus[0]["vram_gb"] == 16.0 and gpus[0]["driver"] == "566.36"
    single = gi.parse_windows_gpus(json.dumps({"Name": "AMD Radeon RX 6600", "AdapterCompatibility": "Advanced Micro Devices, Inc."}), {})
    assert single[0]["vendor"] == "amd"


def test_macos_apple_silicon_is_a_metal_gpu():
    text = json.dumps({"SPDisplaysDataType": [{"sppci_model": "Apple M3 Pro", "sppci_vendor": "sppci_vendor_Apple"}]})
    gpus = gi.parse_system_profiler(text)
    assert gpus[0]["name"] == "Apple M3 Pro"
    assert gpus[0]["vendor"] == "apple" and gpus[0]["backend"] == "metal"


class _Ps(BaseHTTPRequestHandler):
    body = b""

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(self.body)

    def log_message(self, *a):
        pass


def _serve(body: dict):
    _Ps.body = json.dumps(body).encode()
    srv = HTTPServer(("127.0.0.1", 0), _Ps)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def test_ollama_reports_whether_a_model_runs_on_the_gpu_of_any_brand():
    srv = _serve({"models": [{"name": "llama3.2", "size": 4_000_000_000, "size_vram": 4_000_000_000}]})
    try:
        st = gi.ollama_gpu_status(f"http://127.0.0.1:{srv.server_address[1]}")
    finally:
        srv.shutdown()
    assert st == {"reachable": True, "models": 1, "on_gpu": True, "vram_bytes": 4_000_000_000}


def test_ollama_on_cpu_and_unreachable():
    srv = _serve({"models": [{"name": "phi3", "size": 2_000_000_000, "size_vram": 0}]})
    try:
        assert gi.ollama_gpu_status(f"http://127.0.0.1:{srv.server_address[1]}")["on_gpu"] is False
    finally:
        srv.shutdown()
    assert gi.ollama_gpu_status("http://127.0.0.1:9")["reachable"] is False
