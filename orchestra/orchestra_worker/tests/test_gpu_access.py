# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# ==============================================================================
"""Found is not usable (REQUESTS 136, BLUEPRINT-V4 §31.F G1).

A GPU on the PCI bus is only a GPU worker's GPU when this container has its
device files and a compute driver. Device trees and sysfs are built in tmp
folders, so the tests run anywhere: bare-metal Linux with NVIDIA, AMD and
Intel, a container without passthrough, WSL 2 (Docker Desktop on Windows)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))

from orchestra_worker import gpu_inventory as gi

LSPCI = """\
00:02.0 "VGA compatible controller" "Intel Corporation" "DG2 [Arc A770]" -r08
01:00.0 "VGA compatible controller" "NVIDIA Corporation" "AD102 [GeForce RTX 4090]" -ra1
03:00.0 "Display controller" "Advanced Micro Devices, Inc. [AMD/ATI]" "Navi 31 [Radeon RX 7900 XTX]" -rc8
"""


def _drm(root, node, addr, vendor, driver="", vram=None):
    """/sys/class/drm/<node>/device → a PCI device folder with vendor, driver link and VRAM."""
    dev = root / "pci" / addr
    dev.mkdir(parents=True, exist_ok=True)
    (dev / "vendor").write_text(vendor + "\n")
    if driver:
        drv = root / "drivers" / driver
        drv.mkdir(parents=True, exist_ok=True)
        if not (dev / "driver").exists():
            os.symlink(drv, dev / "driver")
    if vram is not None:
        (dev / "mem_info_vram_total").write_text(str(vram))
    (root / "drm" / node).mkdir(parents=True, exist_ok=True)
    os.symlink(dev, root / "drm" / node / "device")


def _machine(tmp_path, *, nvidia_dev=True, kfd=True, render=("amd", "intel"), dxg=False):
    drm = tmp_path / "drm"
    _drm(tmp_path, "card0", "0000:00:02.0", "0x8086", "i915")
    _drm(tmp_path, "card1", "0000:01:00.0", "0x10de", "nvidia")
    _drm(tmp_path, "card2", "0000:03:00.0", "0x1002", "amdgpu", vram=24 * 1024 ** 3)
    _drm(tmp_path, "renderD128", "0000:00:02.0", "0x8086", "i915")
    _drm(tmp_path, "renderD130", "0000:03:00.0", "0x1002", "amdgpu")
    dev = tmp_path / "dev"
    (dev / "dri").mkdir(parents=True)
    if nvidia_dev:
        (dev / "nvidia0").write_text("")
        (dev / "nvidiactl").write_text("")
    if kfd:
        (dev / "kfd").write_text("")
    if "intel" in render:
        (dev / "dri" / "renderD128").write_text("")
    if "amd" in render:
        (dev / "dri" / "renderD130").write_text("")
    if dxg:
        (dev / "dxg").write_text("")
    return str(dev), str(drm)


def _inv(tmp_path, run=None, **machine):
    dev, drm = _machine(tmp_path, **machine)
    run = run or (lambda cmd: LSPCI if cmd[0] == "lspci" else "")
    return gi.inventory(run=run, platform="linux", dev_root=dev, drm_root=drm)


def test_every_brand_is_usable_when_the_container_has_its_devices(tmp_path):
    inv = _inv(tmp_path)
    by = {g["vendor"]: g for g in inv["gpus"]}
    assert by["nvidia"]["usable"] and by["amd"]["usable"] and by["intel"]["usable"]
    assert inv["usable_count"] == 3 and inv["primary"]["vendor"] == "nvidia"
    # Kernel drivers come from sysfs; AMD VRAM from mem_info_vram_total when rocm-smi is missing.
    assert by["amd"]["kernel_driver"] == "amdgpu" and by["amd"]["vram_gb"] == 24.0
    assert by["intel"]["kernel_driver"] == "i915"
    assert inv["access"]["kfd"] and inv["access"]["nvidia"] == ["nvidia0"]
    assert inv["access"]["render"] == {"renderD128": "intel", "renderD130": "amd"}


def test_a_container_without_passthrough_sees_the_cards_but_cannot_use_them(tmp_path):
    inv = _inv(tmp_path, nvidia_dev=False, kfd=False, render=())
    assert inv["usable_count"] == 0
    notes = {g["vendor"]: g["access_note"] for g in inv["gpus"]}
    assert "/dev/nvidia" in notes["nvidia"] and "NVIDIA Container Toolkit" in notes["nvidia"]
    assert "/dev/kfd" in notes["amd"] and "gpu-amd" in notes["amd"]
    assert "/dev/dri" in notes["intel"] and "gpu-intel" in notes["intel"]


def test_amd_needs_both_kfd_and_its_render_node(tmp_path):
    inv = _inv(tmp_path, kfd=False)
    amd = next(g for g in inv["gpus"] if g["vendor"] == "amd")
    assert not amd["usable"]
    # The usable ones are listed first.
    assert [g["usable"] for g in inv["gpus"]] == sorted([g["usable"] for g in inv["gpus"]], reverse=True)


def test_nouveau_cannot_run_cuda(tmp_path):
    dev, drm = _machine(tmp_path)
    os.remove(os.path.join(dev, "nvidia0"))
    target = tmp_path / "pci" / "0000:01:00.0" / "driver"
    os.remove(target)
    (tmp_path / "drivers" / "nouveau").mkdir(parents=True)
    os.symlink(tmp_path / "drivers" / "nouveau", target)
    inv = gi.inventory(run=lambda c: LSPCI if c[0] == "lspci" else "", platform="linux", dev_root=dev, drm_root=drm)
    nv = next(g for g in inv["gpus"] if g["vendor"] == "nvidia")
    assert not nv["usable"] and "nouveau" in nv["access_note"]


def test_nvidia_smi_inside_the_container_means_usable(tmp_path):
    def run(cmd):
        if cmd[0] == "lspci":
            return LSPCI
        if cmd[0] == "nvidia-smi":
            return "NVIDIA GeForce RTX 4090, 24564, 560.35.03\n"
        return ""
    inv = _inv(tmp_path, run=run, nvidia_dev=False, kfd=False, render=())
    nv = next(g for g in inv["gpus"] if g["vendor"] == "nvidia")
    assert nv["usable"] and nv["source"] == "nvidia-smi"


def test_wsl_basic_render_driver_is_not_a_gpu_and_amd_intel_say_use_host_ollama(tmp_path):
    lspci = LSPCI + '''0a:00.0 "3D controller" "Microsoft Corporation" "Basic Render Driver" -r00\n'''
    def run(cmd):
        return lspci if cmd[0] == "lspci" else ""
    inv = _inv(tmp_path, run=run, nvidia_dev=False, kfd=False, render=(), dxg=True)
    assert inv["access"]["wsl"] is True
    assert all("basic render" not in g["name"].lower() for g in inv["gpus"])
    notes = {g["vendor"]: g["access_note"] for g in inv["gpus"]}
    assert "Docker Desktop on Windows passes only NVIDIA" in notes["amd"]
    assert "Ollama on the host" in notes["intel"]


def test_lspci_keeps_the_pci_address_for_joining_sysfs():
    gpus = gi.parse_lspci(LSPCI)
    assert [g["pci"] for g in gpus] == ["0000:00:02.0", "0000:01:00.0", "0000:03:00.0"]
