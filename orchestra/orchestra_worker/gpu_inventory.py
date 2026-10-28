# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — GPU inventory for every brand (REQUESTS 113, BLUEPRINT-V4 §31).

Finds the graphics and accelerator cards of a computer whatever their brand:
  Linux   lspci (pciutils) — its database names the PCI vendors of the world;
          /sys/bus/pci when lspci is missing
  Windows Win32_VideoController (installer, PowerShell); VRAM from the driver
          registry, because AdapterRAM stops at 4 GB
  macOS   system_profiler (Apple silicon and older Macs)
Vendor tools, when they are installed, add the exact model and VRAM:
nvidia-smi, rocm-smi and xpu-smi. Ollama's /api/ps says whether a model really
runs on the GPU (size_vram > 0), the same test for every brand.

Virtual adapters (Microsoft Basic Display, QEMU, VMware, VirtIO …) are not GPUs
and are left out.
"""
from __future__ import annotations

import glob
import json
import os
import re
import subprocess
import urllib.request
from typing import Callable, Optional

# Brand keys, in the order a primary GPU is chosen (dedicated AI cards first).
# Matching is on the vendor name the OS reports, lower-case.
BRANDS: list[tuple[str, str, tuple[str, ...]]] = [
    ("nvidia",     "NVIDIA",          ("nvidia",)),
    ("amd",        "AMD",             ("advanced micro devices", "amd/ati", "ati technologies", "amd ", "radeon")),
    ("intel",      "Intel",           ("intel",)),
    ("apple",      "Apple",           ("apple",)),
    ("moore",      "Moore Threads",   ("moore threads", "mthreads")),
    ("huawei",     "Huawei Ascend",   ("huawei", "hisilicon", "ascend")),
    ("biren",      "Biren",           ("biren",)),
    ("iluvatar",   "Iluvatar CoreX",  ("iluvatar", "corex")),
    ("metax",      "MetaX",           ("metax", "muxi")),
    ("enflame",    "Enflame",         ("enflame",)),
    ("cambricon",  "Cambricon",       ("cambricon",)),
    ("hygon",      "Hygon",           ("hygon",)),
    ("qualcomm",   "Qualcomm",        ("qualcomm", "adreno")),
    ("arm",        "Arm",             ("arm mali", "mali-", "arm ltd")),
    ("matrox",     "Matrox",          ("matrox",)),
]
BRAND_RANK = {key: i for i, (key, _, _) in enumerate(BRANDS)}
BACKEND = {"nvidia": "cuda", "amd": "rocm", "intel": "xpu", "apple": "metal"}

# Adapters that are not hardware GPUs (hypervisors, remote desktop, basic display).
VIRTUAL_MARKERS = ("microsoft basic", "microsoft remote display", "remote display adapter", "vmware",
                   "virtualbox", "innotek", "qemu", "bochs", "virtio", "hyper-v", "parallels", "citrix",
                   "virtual display", "virtual desktop")

# PCI vendor ids for /sys/bus/pci when lspci is not installed.
SYSFS_VENDORS = {
    0x10DE: ("nvidia", "NVIDIA"), 0x1002: ("amd", "AMD"), 0x8086: ("intel", "Intel"),
    0x106B: ("apple", "Apple"), 0x1ED5: ("moore", "Moore Threads"), 0x19E5: ("huawei", "Huawei Ascend"),
    0x5143: ("qualcomm", "Qualcomm"), 0x13B5: ("arm", "Arm"),
    0x1414: ("virtual", "Microsoft"), 0x15AD: ("virtual", "VMware"), 0x1234: ("virtual", "QEMU"),
    0x1AF4: ("virtual", "VirtIO"), 0x80EE: ("virtual", "VirtualBox"),
}
DISPLAY_CLASSES = ("vga compatible controller", "3d controller", "display controller", "processing accelerators")

Runner = Callable[[list[str]], str]


def _run(cmd: list[str], timeout: int = 8) -> str:
    """Output of a command, or "" when it is not installed or fails."""
    try:
        return subprocess.check_output(cmd, timeout=timeout, stderr=subprocess.DEVNULL).decode("utf-8", "replace")
    except (OSError, subprocess.SubprocessError):
        return ""


def brand_of(*names: str) -> tuple[str, str]:
    """(key, label) of the brand these names point to; unknown makers are "other" with the name they gave."""
    text = " ".join(n for n in names if n).lower()
    for key, label, words in BRANDS:
        if any(w in text for w in words):
            return key, label
    for n in names:
        if n and n.strip():
            return "other", re.sub(r"\s*\[.*?\]|,?\s*\b(inc|corporation|corp|co|ltd|limited)\b\.?", "", n, flags=re.I).strip(" ,.")
    return "other", "Other"


def is_virtual(name: str) -> bool:
    return any(m in (name or "").lower() for m in VIRTUAL_MARKERS)


def _model(device: str) -> str:
    """The marketing name inside lspci's device string: "GA102 [GeForce RTX 3090]" → "GeForce RTX 3090"."""
    brackets = [b for b in re.findall(r"\[([^\]]+)\]", device or "") if not re.fullmatch(r"[0-9a-fA-F]{4}:[0-9a-fA-F]{4}", b)]
    return brackets[-1].strip() if brackets else (device or "").strip()


def _named(label: str, model: str) -> str:
    """Full card name with the brand in front, unless the model already says it."""
    if not model:
        return label
    return model if label.lower() in model.lower() else f"{label} {model}"


def _gpu(key: str, label: str, name: str, *, vram_gb: float = 0.0, driver: str = "", source: str) -> dict:
    return {"vendor": key, "vendor_label": label, "name": name, "vram_gb": round(vram_gb, 1),
            "driver": driver, "source": source, "backend": BACKEND.get(key, "generic"), "virtual": False}


# ── Linux: lspci, then sysfs ─────────────────────────────────────────────────

def parse_lspci(text: str) -> list[dict]:
    """Display and accelerator devices from `lspci -mm` output (fields in quotes)."""
    gpus = []
    for line in text.splitlines():
        fields = re.findall(r'"([^"]*)"', line)
        if len(fields) < 3:
            continue
        cls, vendor, device = fields[0].lower(), fields[1], fields[2]
        if not any(c in cls for c in DISPLAY_CLASSES):
            continue
        if is_virtual(vendor + " " + device):
            continue
        key, label = brand_of(vendor)
        gpus.append(_gpu(key, label, _named(label, _model(device)), source="lspci"))
    return gpus


def sysfs_gpus(root: str = "/sys/bus/pci/devices") -> list[dict]:
    """The same from the kernel's PCI tree — works without any tool installed."""
    gpus = []
    for dev in sorted(glob.glob(os.path.join(root, "*"))):
        try:
            cls = int(open(os.path.join(dev, "class")).read().strip(), 16)
            vendor = int(open(os.path.join(dev, "vendor")).read().strip(), 16)
            device = open(os.path.join(dev, "device")).read().strip()
        except (OSError, ValueError):
            continue
        if (cls >> 16) not in (0x03, 0x12):          # display controllers and processing accelerators
            continue
        key, label = SYSFS_VENDORS.get(vendor, ("other", f"PCI {vendor:04x}"))
        if key == "virtual":
            continue
        gpus.append(_gpu(key, label, f"{label} GPU (PCI {vendor:04x}:{device.replace('0x', '')})", source="sysfs"))
    return gpus


# ── Vendor tools: exact model and VRAM ───────────────────────────────────────

def parse_nvidia_smi(text: str) -> list[dict]:
    gpus = []
    for line in text.strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        if not f or not f[0]:
            continue
        mib = float(f[1]) if len(f) > 1 and re.fullmatch(r"[0-9.]+", f[1]) else 0.0
        gpus.append(_gpu("nvidia", "NVIDIA", _named("NVIDIA", f[0]), vram_gb=mib / 1024,
                         driver=f[2] if len(f) > 2 else "", source="nvidia-smi"))
    return gpus


def parse_rocm_smi(text: str) -> list[dict]:
    """rocm-smi --showproductname --showmeminfo vram --json: one object per card."""
    try:
        data = json.loads(text)
    except ValueError:
        return []
    gpus = []
    for card, info in sorted(data.items()) if isinstance(data, dict) else []:
        if not card.startswith("card") or not isinstance(info, dict):
            continue
        # "Card series" is the marketing name; "Card model" is often a PCI id (0x744c).
        model = next((str(v).strip() for want in ("series", "model", "sku") for k, v in sorted(info.items())
                      if want in k.lower() and str(v).strip() and not str(v).strip().lower().startswith("0x")), "")
        total = next((v for k, v in info.items() if "vram total memory" in k.lower()), 0)
        try:
            vram = float(total) / 1024 ** 3
        except (TypeError, ValueError):
            vram = 0.0
        gpus.append(_gpu("amd", "AMD", _named("AMD", model or "Radeon GPU"), vram_gb=vram, source="rocm-smi"))
    return gpus


def parse_xpu_smi(text: str) -> list[dict]:
    """xpu-smi discovery -j (Intel Arc, Data Center GPU, Xe)."""
    try:
        devices = json.loads(text).get("device_list", [])
    except (ValueError, AttributeError):
        return []
    gpus = []
    for d in devices:
        name = str(d.get("device_name", "")).strip()
        try:
            vram = float(d.get("memory_physical_size_byte", 0)) / 1024 ** 3
        except (TypeError, ValueError):
            vram = 0.0
        gpus.append(_gpu("intel", "Intel", _named("Intel", name) if name else "Intel GPU", vram_gb=vram, source="xpu-smi"))
    return gpus


def _vendor_tools(run: Runner) -> dict[str, list[dict]]:
    """Exact GPUs by brand from whichever vendor tool is installed."""
    out: dict[str, list[dict]] = {}
    smi = parse_nvidia_smi(run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
                                "--format=csv,noheader,nounits"]))
    if smi:
        out["nvidia"] = smi
    rocm = parse_rocm_smi(run(["rocm-smi", "--showproductname", "--showmeminfo", "vram", "--json"]))
    if rocm:
        out["amd"] = rocm
    xpu = parse_xpu_smi(run(["xpu-smi", "discovery", "-j"]))
    if xpu:
        out["intel"] = xpu
    return out


# ── Windows and macOS ────────────────────────────────────────────────────────

def parse_windows_gpus(video_json: str, vram_by_name: dict[str, float]) -> list[dict]:
    """Win32_VideoController rows (ConvertTo-Json: one object or a list)."""
    try:
        rows = json.loads(video_json or "[]")
    except ValueError:
        return []
    if isinstance(rows, dict):
        rows = [rows]
    gpus = []
    for r in rows:
        name = str(r.get("Name") or "").strip()
        if not name or is_virtual(name):
            continue
        key, label = brand_of(name, str(r.get("AdapterCompatibility") or ""))
        vram = vram_by_name.get(name, 0.0)
        gpus.append(_gpu(key, label, _named(label, name), vram_gb=vram, driver=str(r.get("DriverVersion") or ""),
                         source="win32"))
    return gpus


def parse_system_profiler(text: str) -> list[dict]:
    """system_profiler SPDisplaysDataType -json (macOS): Apple silicon and older Macs."""
    try:
        items = json.loads(text).get("SPDisplaysDataType", [])
    except (ValueError, AttributeError):
        return []
    gpus = []
    for it in items:
        name = str(it.get("sppci_model") or it.get("_name") or "").strip()
        if not name or is_virtual(name):
            continue
        key, label = brand_of(name, str(it.get("sppci_vendor") or "").replace("sppci_vendor_", ""))
        gpus.append(_gpu(key, label, _named(label, name), source="system_profiler"))
    return gpus


# ── The whole inventory ──────────────────────────────────────────────────────

def _default_run(cmd: list[str]) -> str:
    return _run(cmd)


def inventory(run: Runner = _default_run, sysfs_root: str = "/sys/bus/pci/devices", platform: Optional[str] = None) -> dict:
    """Every GPU this computer has, with the best one first.

    Returns {"gpus": [...], "primary": gpu-or-None, "sources": [...]}; each GPU carries
    vendor, vendor_label, name, vram_gb, driver, source and backend."""
    import sys
    platform = platform or sys.platform
    gpus: list[dict] = []
    sources: list[str] = []

    if platform.startswith("linux"):
        pci = parse_lspci(run(["lspci", "-mm"]))
        if not pci:
            pci = sysfs_gpus(sysfs_root)
        sources.append("lspci" if pci and pci[0]["source"] == "lspci" else "sysfs")
        exact = _vendor_tools(run)
        for brand, found in exact.items():
            sources.append(found[0]["source"])
            pci = [g for g in pci if g["vendor"] != brand] + found
        gpus = pci
    elif platform == "darwin":
        gpus = parse_system_profiler(run(["system_profiler", "SPDisplaysDataType", "-json"]))
        sources.append("system_profiler")

    gpus = [g for g in gpus if not g.get("virtual")]
    gpus.sort(key=lambda g: (BRAND_RANK.get(g["vendor"], len(BRANDS)), -g["vram_gb"]))
    return {"gpus": gpus, "primary": gpus[0] if gpus else None, "sources": sources}


def ollama_gpu_status(base_url: str, timeout: int = 4) -> dict:
    """Does a model run on the GPU? Ollama reports size_vram for every loaded model."""
    try:
        with urllib.request.urlopen(f"{base_url.rstrip('/')}/api/ps", timeout=timeout) as r:
            models = json.loads(r.read()).get("models", [])
    except (OSError, ValueError):
        return {"reachable": False, "models": 0, "on_gpu": False, "vram_bytes": 0}
    vram = sum(int(m.get("size_vram") or 0) for m in models)
    return {"reachable": True, "models": len(models), "on_gpu": vram > 0, "vram_bytes": vram}
