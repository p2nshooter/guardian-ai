# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — live telemetry for every GPU a worker can use (REQUESTS 136, BLUEPRINT-V4 §31.F G1).

One row per GPU, whatever the brand:
  index, vendor, name, util_pct, temp_c, vram_used_gb, vram_total_gb,
  power_w, power_limit_w, fan_pct, throttled, throttle_reasons, uuid, source

Sources, best first:
  NVIDIA  nvidia-smi (one line per GPU; throttle bits read separately so an
          older or newer driver that renamed the field never breaks the rest)
  AMD     rocm-smi --json, or the amdgpu sysfs files when rocm-smi is missing
          (gpu_busy_percent, mem_info_vram_used/total, hwmon temp/power/fan)
  Intel   i915 / xe sysfs and hwmon (temperature and power where the driver
          exposes them)
A value the hardware does not report is None — never 0 — so the console can
say "no telemetry" instead of showing a healthy 0 °C.
"""
from __future__ import annotations

import glob
import json
import os
import re
from typing import Callable, Optional

Runner = Callable[[list[str]], str]

# nvidia-smi clocks_event_reasons bits that mean the GPU is really held back.
# 0x1 (idle) and 0x2 (application clocks setting) are normal and not throttling.
NV_THROTTLE_BITS = {
    0x4: "power cap", 0x8: "hardware slowdown", 0x20: "thermal (software)",
    0x40: "thermal (hardware)", 0x80: "power brake",
}

NV_FIELDS = "index,name,uuid,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,fan.speed"


def _num(v) -> Optional[float]:
    """A number from a tool's text, or None for N/A, [Not Supported], blanks."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group(0)) if m and "n/a" not in str(v).lower() and "not supported" not in str(v).lower() else None


def _row(index: int, vendor: str, name: str, source: str, **kw) -> dict:
    row = {"index": index, "vendor": vendor, "name": name, "util_pct": None, "temp_c": None,
           "vram_used_gb": None, "vram_total_gb": None, "power_w": None, "power_limit_w": None,
           "fan_pct": None, "throttled": False, "throttle_reasons": [], "uuid": None, "source": source}
    row.update({k: v for k, v in kw.items() if k in row})
    for k in ("util_pct", "temp_c", "power_w", "power_limit_w", "fan_pct"):
        if row[k] is not None:
            row[k] = round(float(row[k]), 1)
    for k in ("vram_used_gb", "vram_total_gb"):
        if row[k] is not None:
            row[k] = round(float(row[k]), 2)
    return row


# ── NVIDIA ───────────────────────────────────────────────────────────────────

def parse_nvidia(text: str, throttle_text: str = "") -> list[dict]:
    """`nvidia-smi --query-gpu=<NV_FIELDS> --format=csv,noheader,nounits`, one GPU per line."""
    masks: dict[int, int] = {}
    for line in (throttle_text or "").strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        if len(f) >= 2 and f[0].isdigit():
            try:
                masks[int(f[0])] = int(f[1], 16)
            except ValueError:
                pass
    rows = []
    for line in (text or "").strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        if len(f) < 7 or not f[0].isdigit():
            continue
        idx = int(f[0])
        used, total = _num(f[5]), _num(f[6])
        mask = masks.get(idx, 0)
        reasons = [label for bit, label in NV_THROTTLE_BITS.items() if mask & bit]
        name = f[1] if f[1].lower().startswith("nvidia") else f"NVIDIA {f[1]}"
        rows.append(_row(idx, "nvidia", name, "nvidia-smi", uuid=f[2] or None,
                         temp_c=_num(f[3]), util_pct=_num(f[4]),
                         vram_used_gb=None if used is None else used / 1024,
                         vram_total_gb=None if total is None else total / 1024,
                         power_w=_num(f[7]) if len(f) > 7 else None,
                         power_limit_w=_num(f[8]) if len(f) > 8 else None,
                         fan_pct=_num(f[9]) if len(f) > 9 else None,
                         throttled=bool(reasons), throttle_reasons=reasons))
    return rows


def nvidia(run: Runner) -> list[dict]:
    text = run(["nvidia-smi", f"--query-gpu={NV_FIELDS}", "--format=csv,noheader,nounits"])
    if not text.strip():
        return []
    throttle = ""
    for field in ("clocks_event_reasons.active", "clocks_throttle_reasons.active"):
        throttle = run(["nvidia-smi", f"--query-gpu=index,{field}", "--format=csv,noheader"])
        if throttle.strip() and "not a valid field" not in throttle.lower():
            break
        throttle = ""
    return parse_nvidia(text, throttle)


# ── AMD ──────────────────────────────────────────────────────────────────────

def _pick(info: dict, *needles: str) -> Optional[float]:
    """First value whose key contains all needles (rocm-smi keys change between versions)."""
    for k, v in info.items():
        kl = k.lower()
        if all(n in kl for n in needles):
            n = _num(v)
            if n is not None:
                return n
    return None


def parse_rocm(text: str) -> list[dict]:
    """`rocm-smi --showproductname --showtemp --showuse --showpower --showfan --showmeminfo vram --json`."""
    try:
        data = json.loads(text or "")
    except ValueError:
        return []
    rows = []
    cards = sorted((k for k in data if isinstance(k, str) and k.startswith("card")),
                   key=lambda k: int(re.sub(r"\D", "", k) or 0)) if isinstance(data, dict) else []
    for card in cards:
        info = data[card]
        if not isinstance(info, dict):
            continue
        idx = int(re.sub(r"\D", "", card) or 0)
        series = next((str(v).strip() for k, v in info.items()
                       if "series" in k.lower() and str(v).strip() and not str(v).strip().lower().startswith("0x")), "")
        temp = _pick(info, "temperature", "edge") or _pick(info, "temperature", "junction") or _pick(info, "temperature")
        total_b = _pick(info, "vram total memory")
        used_b = _pick(info, "vram total used memory")
        mem_pct = _pick(info, "memory", "%")
        if used_b is None and mem_pct is not None and total_b:
            used_b = total_b * mem_pct / 100
        rows.append(_row(idx, "amd", f"AMD {series}" if series and "amd" not in series.lower() else (series or "AMD Radeon GPU"),
                         "rocm-smi",
                         temp_c=temp, util_pct=_pick(info, "gpu use"),
                         vram_used_gb=None if used_b is None else used_b / 1024 ** 3,
                         vram_total_gb=None if total_b is None else total_b / 1024 ** 3,
                         power_w=_pick(info, "power", "(w)"), fan_pct=_pick(info, "fan", "%")))
    return rows


# ── sysfs (amdgpu, i915, xe): no tool needed ────────────────────────────────

def _read(path: str) -> Optional[str]:
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def _read_num(path: str) -> Optional[float]:
    v = _read(path)
    try:
        return float(v) if v is not None else None
    except ValueError:
        return None


def _driver(dev: str) -> str:
    try:
        return os.path.basename(os.readlink(os.path.join(dev, "driver")))
    except OSError:
        return ""


def sysfs(drm_root: str = "/sys/class/drm", vendors: tuple[str, ...] = ("amd", "intel")) -> list[dict]:
    """Telemetry for amdgpu and Intel cards straight from the kernel."""
    rows = []
    for card in sorted(glob.glob(os.path.join(drm_root, "card[0-9]*")), key=lambda p: int(re.sub(r"\D", "", os.path.basename(p)) or 0)):
        if "-" in os.path.basename(card):          # card0-HDMI-A-1 is a connector, not a GPU
            continue
        dev = os.path.join(card, "device")
        vid = (_read(os.path.join(dev, "vendor")) or "").lower()
        vendor = {"0x1002": "amd", "0x8086": "intel"}.get(vid)
        if vendor not in vendors:
            continue
        idx = int(re.sub(r"\D", "", os.path.basename(card)) or 0)
        hw = sorted(glob.glob(os.path.join(dev, "hwmon", "hwmon*")))
        hw = hw[0] if hw else ""
        temp = _read_num(os.path.join(hw, "temp1_input")) if hw else None
        power = None
        if hw:
            for f in ("power1_average", "power1_input"):
                power = _read_num(os.path.join(hw, f))
                if power is not None:
                    break
        fan = None
        if hw:
            pwm, pwm_max = _read_num(os.path.join(hw, "pwm1")), _read_num(os.path.join(hw, "pwm1_max")) or 255.0
            fan = pwm / pwm_max * 100 if pwm is not None and pwm_max else None
        used, total = _read_num(os.path.join(dev, "mem_info_vram_used")), _read_num(os.path.join(dev, "mem_info_vram_total"))
        name = "AMD Radeon GPU" if vendor == "amd" else ("Intel Arc / Xe GPU" if _driver(dev) in ("xe", "i915") else "Intel GPU")
        rows.append(_row(idx, vendor, name, f"sysfs:{_driver(dev) or vendor}",
                         temp_c=None if temp is None else temp / 1000,
                         util_pct=_read_num(os.path.join(dev, "gpu_busy_percent")),
                         vram_used_gb=None if used is None else used / 1024 ** 3,
                         vram_total_gb=None if total is None else total / 1024 ** 3,
                         power_w=None if power is None else power / 1_000_000, fan_pct=fan))
    return rows


# ── Everything ───────────────────────────────────────────────────────────────

def collect(run: Runner, drm_root: str = "/sys/class/drm") -> list[dict]:
    """Every GPU the worker can see, NVIDIA first, then AMD, then Intel."""
    rows = nvidia(run)
    amd = parse_rocm(run(["rocm-smi", "--showproductname", "--showtemp", "--showuse", "--showpower",
                          "--showfan", "--showmeminfo", "vram", "--json"]))
    rows += amd or sysfs(drm_root, ("amd",))
    rows += sysfs(drm_root, ("intel",))
    return rows


def summary(rows: list[dict]) -> dict:
    """Worker-level view: the hottest GPU decides the thermal state, utilisation is the average."""
    temps = [r["temp_c"] for r in rows if r.get("temp_c") is not None]
    utils = [r["util_pct"] for r in rows if r.get("util_pct") is not None]
    used = [r["vram_used_gb"] for r in rows if r.get("vram_used_gb") is not None]
    total = [r["vram_total_gb"] for r in rows if r.get("vram_total_gb") is not None]
    power = [r["power_w"] for r in rows if r.get("power_w") is not None]
    return {
        "gpu_count": len(rows),
        "temp_c": max(temps) if temps else None,
        "util_pct": round(sum(utils) / len(utils), 1) if utils else None,
        "vram_used_gb": round(sum(used), 2) if used else None,
        "vram_total_gb": round(sum(total), 2) if total else None,
        "power_w": round(sum(power), 1) if power else None,
        "throttled": any(r.get("throttled") for r in rows),
        "telemetry": bool(temps or utils or used),
    }
