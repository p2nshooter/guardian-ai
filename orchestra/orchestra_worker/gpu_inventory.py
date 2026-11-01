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

Virtual adapters (Microsoft Basic Display / Basic Render Driver, QEMU, VMware,
VirtIO …) are not GPUs and are left out. Found is not the same as usable: each GPU
says whether this container has its device files (/dev/nvidia*, /dev/kfd with
/dev/dri, /dev/dri for Intel; /dev/dxg means WSL 2) and a compute-capable kernel
driver, and why not when it has not (REQUESTS 136).
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
VIRTUAL_MARKERS = ("microsoft basic", "basic render driver", "microsoft remote display", "remote display adapter", "vmware",
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
        g = _gpu(key, label, _named(label, _model(device)), source="lspci")
        slot = line.split(" ", 1)[0].strip()
        if re.fullmatch(r"(?:[0-9a-fA-F]{4}:)?[0-9a-fA-F]{2}:[0-9a-fA-F]{2}\.[0-7]", slot):
            g["pci"] = slot.lower() if slot.count(":") == 2 else f"0000:{slot.lower()}"
        gpus.append(g)
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
        g = _gpu(key, label, f"{label} GPU (PCI {vendor:04x}:{device.replace('0x', '')})", source="sysfs")
        g["pci"] = os.path.basename(dev).lower()
        gpus.append(g)
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


# ── Can this container really use the GPU? (REQUESTS 136, BLUEPRINT-V4 §31.F G1) ──

DRM_VENDORS = {"0x10de": "nvidia", "0x1002": "amd", "0x8086": "intel"}
# Kernel drivers: the open-source ones cannot run CUDA / ROCm compute.
COMPUTE_DRIVERS = {"nvidia": ("nvidia",), "amd": ("amdgpu",), "intel": ("i915", "xe")}


def _read(path: str) -> str:
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return ""


def drm_cards(drm_root: str = "/sys/class/drm") -> dict[str, dict]:
    """PCI address → {driver, vendor, vram_gb, render} for every DRM card the kernel shows."""
    cards: dict[str, dict] = {}
    for node in sorted(glob.glob(os.path.join(drm_root, "card[0-9]*")) + glob.glob(os.path.join(drm_root, "renderD*"))):
        if "-" in os.path.basename(node):
            continue
        dev = os.path.join(node, "device")
        addr = os.path.basename(os.path.realpath(dev)).lower()
        if not re.fullmatch(r"[0-9a-f]{4}:[0-9a-f]{2}:[0-9a-f]{2}\.[0-7]", addr):
            continue
        c = cards.setdefault(addr, {"driver": "", "vendor": DRM_VENDORS.get(_read(os.path.join(dev, "vendor")).lower(), "other"),
                                    "vram_gb": 0.0, "render": ""})
        try:
            c["driver"] = c["driver"] or os.path.basename(os.readlink(os.path.join(dev, "driver")))
        except OSError:
            pass
        total = _read(os.path.join(dev, "mem_info_vram_total"))
        if total.isdigit() and not c["vram_gb"]:
            c["vram_gb"] = round(int(total) / 1024 ** 3, 1)
        if os.path.basename(node).startswith("renderD"):
            c["render"] = os.path.basename(node)
    return cards


def device_access(dev_root: str = "/dev", drm_root: str = "/sys/class/drm") -> dict:
    """The GPU device files this container was given, by brand."""
    render = {}
    for node in sorted(glob.glob(os.path.join(dev_root, "dri", "renderD*"))):
        name = os.path.basename(node)
        render[name] = DRM_VENDORS.get(_read(os.path.join(drm_root, name, "device", "vendor")).lower(), "other")
    return {
        "nvidia": sorted(os.path.basename(p) for p in glob.glob(os.path.join(dev_root, "nvidia[0-9]*"))),
        "kfd": os.path.exists(os.path.join(dev_root, "kfd")),
        "render": render,
        "wsl": os.path.exists(os.path.join(dev_root, "dxg")),
    }


def mark_usable(gpus: list[dict], access: dict) -> None:
    """Sets usable and access_note on each GPU: can a job in this container compute on it?"""
    rendered = set(access.get("render", {}).values())
    wsl = access.get("wsl")
    for g in gpus:
        v, drv = g["vendor"], (g.get("kernel_driver") or "")
        ok, note = False, ""
        if v == "nvidia":
            ok = g.get("source") == "nvidia-smi" or bool(access.get("nvidia"))
            if not ok:
                note = ("the open-source nouveau driver cannot run CUDA — install the NVIDIA driver"
                        if drv == "nouveau" else
                        "this container has no /dev/nvidia* — start it with GPU access (compose profile gpu, "
                        "NVIDIA Container Toolkit on Linux, Docker Desktop WSL 2 on Windows)")
        elif v == "amd":
            ok = bool(access.get("kfd")) and "amd" in rendered
            if not ok:
                note = ("Docker Desktop on Windows passes only NVIDIA GPUs into containers — this AMD card works "
                        "through Ollama on the host" if wsl else
                        "needs /dev/kfd and /dev/dri in the container (compose profile gpu-amd) and the amdgpu driver")
        elif v == "intel":
            ok = "intel" in rendered
            if not ok:
                note = ("Docker Desktop on Windows passes only NVIDIA GPUs into containers — this Intel GPU works "
                        "through Ollama on the host" if wsl else
                        "needs /dev/dri in the container (compose profile gpu-intel) and the i915 or xe driver")
        elif v == "apple":
            note = "Apple GPUs (Metal) are used by Ollama on the Mac itself; containers cannot reach them"
        else:
            note = f"no container runtime for {g.get('vendor_label') or 'this brand'} yet; Ollama or the vendor's runtime on the host can still use it"
        if ok and drv and v in COMPUTE_DRIVERS and drv not in COMPUTE_DRIVERS[v]:
            ok, note = False, f"kernel driver {drv} cannot run {g.get('backend', 'GPU').upper()} compute"
        g["usable"], g["access_note"] = ok, note


# ── The whole inventory ──────────────────────────────────────────────────────

def _default_run(cmd: list[str]) -> str:
    return _run(cmd)


def inventory(run: Runner = _default_run, sysfs_root: str = "/sys/bus/pci/devices", platform: Optional[str] = None,
              dev_root: str = "/dev", drm_root: str = "/sys/class/drm") -> dict:
    """Every GPU this computer has, the ones this container can really use first.

    Returns {"gpus": [...], "primary": gpu-or-None, "sources": [...], "access": {...},
    "usable_count": n}; each GPU carries vendor, vendor_label, name, vram_gb, driver,
    kernel_driver, source, backend, usable and access_note."""
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
    access = {"nvidia": [], "kfd": False, "render": {}, "wsl": False}
    if platform.startswith("linux"):
        cards = drm_cards(drm_root)
        for g in gpus:
            c = cards.get(g.get("pci", ""))
            if c:
                g["kernel_driver"] = c["driver"]
                if not g["vram_gb"] and c["vram_gb"]:
                    g["vram_gb"] = c["vram_gb"]
        access = device_access(dev_root, drm_root)
        mark_usable(gpus, access)
    else:
        for g in gpus:
            g["usable"], g["access_note"] = g["vendor"] == "apple", ""
    gpus.sort(key=lambda g: (not g.get("usable"), BRAND_RANK.get(g["vendor"], len(BRANDS)), -g["vram_gb"]))
    return {"gpus": gpus, "primary": gpus[0] if gpus else None, "sources": sources, "access": access,
            "usable_count": sum(1 for g in gpus if g.get("usable"))}


def ollama_gpu_status(base_url: str, timeout: int = 4) -> dict:
    """Does a model run on the GPU? Ollama reports size_vram for every loaded model."""
    try:
        with urllib.request.urlopen(f"{base_url.rstrip('/')}/api/ps", timeout=timeout) as r:
            models = json.loads(r.read()).get("models", [])
    except (OSError, ValueError):
        return {"reachable": False, "models": 0, "on_gpu": False, "vram_bytes": 0}
    vram = sum(int(m.get("size_vram") or 0) for m in models)
    return {"reachable": True, "models": len(models), "on_gpu": vram > 0, "vram_bytes": vram}
