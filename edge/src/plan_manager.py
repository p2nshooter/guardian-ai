# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — Plan Manager: billing plan lifecycle."""
from __future__ import annotations
import json, uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class Plan:
    code:               str
    name:               str
    description:        str   = ""
    monthly_token_quota:int   = 1_000_000   # 0 = unlimited
    rate_limit_rpm:     int   = 60
    price_per_1k_tokens:float = 0.002        # USD charged to customers
    allowed_models:     List[str] = field(default_factory=list)   # empty = all
    max_context_tokens: int   = 128_000
    blocked_keywords:   List[str] = field(default_factory=list)
    features:           List[str] = field(default_factory=list)

# Default plans every new Edge instance gets
_DEFAULTS = [
    Plan(code="free",       name="Free",       monthly_token_quota=100_000,   rate_limit_rpm=10,  price_per_1k_tokens=0,      features=["Basic AI access","100K tokens/month"]),
    Plan(code="starter",    name="Starter",    monthly_token_quota=1_000_000, rate_limit_rpm=60,  price_per_1k_tokens=0.002,  features=["1M tokens/month","60 req/min","All models"]),
    Plan(code="pro",        name="Pro",        monthly_token_quota=5_000_000, rate_limit_rpm=200, price_per_1k_tokens=0.0018, features=["5M tokens/month","200 req/min","Priority routing"]),
    Plan(code="enterprise", name="Enterprise", monthly_token_quota=0,         rate_limit_rpm=0,   price_per_1k_tokens=0.0015, features=["Unlimited tokens","Unlimited req/min","Dedicated SLA"]),
]


class PlanManager:
    def __init__(self, data_dir: Path):
        self._dir   = data_dir / "plans"
        self._plans: Dict[str, Plan] = {}

    def startup(self):
        self._dir.mkdir(parents=True, exist_ok=True)
        self._load()
        for d in _DEFAULTS:
            if d.code not in self._plans:
                self._plans[d.code] = d
                self._save(d)

    def get_plan(self, code: str) -> Plan:
        return self._plans.get(code) or self._plans.get("free") or _DEFAULTS[0]

    def list_plans(self) -> List[Dict]:
        return [asdict(p) for p in self._plans.values()]

    def create_plan(self, data: Dict) -> Dict:
        p = Plan(**{k: data[k] for k in Plan.__dataclass_fields__ if k in data})
        self._plans[p.code] = p
        self._save(p)
        return asdict(p)

    def update_plan(self, code: str, data: Dict) -> Dict:
        p = self._plans.get(code)
        if not p: raise ValueError(f"Plan '{code}' not found")
        for k, v in data.items():
            if hasattr(p, k): setattr(p, k, v)
        self._save(p)
        return asdict(p)

    def delete_plan(self, code: str):
        if code in ("free",): raise ValueError("Cannot delete free plan")
        self._plans.pop(code, None)
        (self._dir / f"{code}.json").unlink(missing_ok=True)

    def count(self) -> int:
        return len(self._plans)

    def _load(self):
        for path in self._dir.glob("*.json"):
            try:
                raw = json.loads(path.read_text())
                self._plans[raw["code"]] = Plan(**{k: raw[k] for k in Plan.__dataclass_fields__ if k in raw})
            except Exception:
                pass

    def _save(self, p: Plan):
        (self._dir / f"{p.code}.json").write_text(json.dumps(asdict(p), indent=2))
