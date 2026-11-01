# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""Live per-GPU telemetry for every brand (REQUESTS 136, BLUEPRINT-V4 §31.F G1).

nvidia-smi with several GPUs, values a card does not report, the throttle bits
that are not throttling (idle), rocm-smi's decimal strings and the amdgpu /
Intel sysfs files, all as fixtures."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))

import pytest

from orchestra_worker import gpu_telemetry as gt

NV = """\
0, NVIDIA GeForce RTX 4090, GPU-aaaa, 64, 87, 18432, 24564, 312.55, 450.00, 61
1, NVIDIA RTX A4000, GPU-bbbb, 41, 3, 512, 16376, [N/A], [N/A], [Not Supported]
"""
NV_THROTTLE = "0, 0x0000000000000004\n1, 0x0000000000000001\n"


def test_nvidia_every_gpu_on_its_own_line():
    rows = gt.parse_nvidia(NV, NV_THROTTLE)
    assert [r["index"] for r in rows] == [0, 1]
    a, b = rows
    assert a["name"] == "NVIDIA GeForce RTX 4090" and a["uuid"] == "GPU-aaaa"
    assert a["temp_c"] == 64 and a["util_pct"] == 87 and a["fan_pct"] == 61
    assert a["vram_used_gb"] == pytest.approx(18.0) and a["vram_total_gb"] == pytest.approx(23.99, abs=0.01)
    assert a["power_w"] == 312.6 and a["power_limit_w"] == 450.0
    # Values the card does not report are None, never 0.
    assert b["power_w"] is None and b["fan_pct"] is None and b["temp_c"] == 41


def test_idle_clocks_are_not_throttling_but_a_power_cap_is():
    a, b = gt.parse_nvidia(NV, NV_THROTTLE)
    assert a["throttled"] is True and a["throttle_reasons"] == ["power cap"]
    assert b["throttled"] is False and b["throttle_reasons"] == []


def test_nvidia_falls_back_to_the_old_throttle_field_name():
    calls = []

    def run(cmd):
        calls.append(cmd[1])
        if cmd[1].startswith("--query-gpu=index,name"):
            return NV
        if "clocks_event_reasons" in cmd[1]:
            return 'Field "clocks_event_reasons.active" is not a valid field to query.'
        return NV_THROTTLE
    rows = gt.nvidia(run)
    assert rows[0]["throttled"] and any("clocks_throttle_reasons" in c for c in calls)


def test_rocm_smi_decimal_strings_and_vram_bytes():
    text = json.dumps({
        "card1": {"Card series": "Radeon RX 7900 XTX", "Temperature (Sensor edge) (C)": "51.0",
                  "Temperature (Sensor junction) (C)": "63.0", "GPU use (%)": "42",
                  "Average Graphics Package Power (W)": "212.0", "Fan speed (%)": "35.29",
                  "VRAM Total Memory (B)": str(24 * 1024 ** 3), "VRAM Total Used Memory (B)": str(6 * 1024 ** 3)},
        "card0": {"Card series": "Radeon PRO W7800", "Temperature (Sensor edge) (C)": "40.0", "GPU use (%)": "0"},
        "system": {"Driver version": "6.10.5"},
    })
    rows = gt.parse_rocm(text)
    assert [r["index"] for r in rows] == [0, 1]
    w7800, xtx = rows
    assert xtx["name"] == "AMD Radeon RX 7900 XTX" and xtx["temp_c"] == 51.0 and xtx["util_pct"] == 42
    assert xtx["vram_used_gb"] == 6.0 and xtx["vram_total_gb"] == 24.0 and xtx["power_w"] == 212.0
    assert xtx["fan_pct"] == 35.3
    assert w7800["vram_used_gb"] is None and w7800["power_w"] is None


def _card(root, n, vendor, driver, files, hw=None):
    dev = root / f"card{n}" / "device"
    dev.mkdir(parents=True)
    (dev / "vendor").write_text(vendor)
    drv = root / "_drivers" / driver
    drv.mkdir(parents=True, exist_ok=True)
    os.symlink(drv, dev / "driver")
    for k, v in files.items():
        (dev / k).write_text(str(v))
    if hw:
        h = dev / "hwmon" / "hwmon3"
        h.mkdir(parents=True)
        for k, v in hw.items():
            (h / k).write_text(str(v))


def test_sysfs_amdgpu_and_intel_without_any_tool(tmp_path):
    _card(tmp_path, 0, "0x8086", "xe", {}, hw={"temp1_input": 47000})
    _card(tmp_path, 1, "0x1002", "amdgpu",
          {"gpu_busy_percent": 77, "mem_info_vram_used": 8 * 1024 ** 3, "mem_info_vram_total": 16 * 1024 ** 3},
          hw={"temp1_input": 68000, "power1_average": 145_000_000, "pwm1": 128, "pwm1_max": 255})
    (tmp_path / "card1-DP-1").mkdir()                       # a connector, not a GPU
    rows = gt.sysfs(str(tmp_path))
    assert [(r["vendor"], r["index"]) for r in rows] == [("intel", 0), ("amd", 1)]
    intel, amd = rows
    assert intel["temp_c"] == 47.0 and intel["util_pct"] is None and intel["source"] == "sysfs:xe"
    assert amd["util_pct"] == 77 and amd["temp_c"] == 68.0 and amd["power_w"] == 145.0
    assert amd["vram_used_gb"] == 8.0 and amd["vram_total_gb"] == 16.0 and amd["fan_pct"] == 50.2


def test_collect_prefers_rocm_smi_over_sysfs_for_amd(tmp_path):
    _card(tmp_path, 1, "0x1002", "amdgpu", {"gpu_busy_percent": 5})
    rocm = json.dumps({"card1": {"Card series": "Radeon RX 7900 XTX", "GPU use (%)": "42"}})

    def run(cmd):
        return rocm if cmd[0] == "rocm-smi" else ""
    rows = gt.collect(run, str(tmp_path))
    assert len(rows) == 1 and rows[0]["source"] == "rocm-smi" and rows[0]["util_pct"] == 42
    rows = gt.collect(lambda cmd: "", str(tmp_path))
    assert len(rows) == 1 and rows[0]["source"] == "sysfs:amdgpu" and rows[0]["util_pct"] == 5


def test_summary_hottest_gpu_average_utilisation_and_no_telemetry():
    rows = gt.parse_nvidia(NV, NV_THROTTLE)
    s = gt.summary(rows)
    assert s["temp_c"] == 64 and s["util_pct"] == 45.0 and s["gpu_count"] == 2
    assert s["vram_used_gb"] == pytest.approx(18.5) and s["throttled"] is True and s["telemetry"] is True
    empty = gt.summary([])
    assert empty["temp_c"] is None and empty["util_pct"] is None and empty["telemetry"] is False
