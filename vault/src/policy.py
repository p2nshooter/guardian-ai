# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Vault — PolicyManager
Per-project redaction policies stored as JSON on disk.
Projects route to policies via X-Vault-Project header or project_id field.
"""
from __future__ import annotations
import json, uuid, time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class Policy:
    id:                     str
    name:                   str
    description:            str  = ""
    redact_pii:             bool = True
    redact_phi:             bool = True
    redact_financial:       bool = True
    redact_custom_patterns: List[str] = field(default_factory=list)
    whitelist_domains:      List[str] = field(default_factory=list)
    ai_provider:            Optional[str] = None
    ai_model:               Optional[str] = None
    created_at:             str  = ""
    updated_at:             str  = ""


_DEFAULT_POLICY = Policy(
    id="default",
    name="Default Policy",
    description="Global policy — redacts all PII, PHI, and financial data",
    redact_pii=True, redact_phi=True, redact_financial=True,
    created_at="system", updated_at="system",
)


class PolicyManager:
    def __init__(self, data_dir: Path):
        self._dir: Path              = data_dir / "policies"
        self._policies: Dict[str, Policy] = {}

    def startup(self):
        self._dir.mkdir(parents=True, exist_ok=True)
        self._load_all()
        # Ensure default policy always exists
        if "default" not in self._policies:
            self._policies["default"] = _DEFAULT_POLICY
            self._save(_DEFAULT_POLICY)

    @property
    def active_count(self) -> int:
        return len(self._policies)

    def get_policy(self, project_id: Optional[str] = None) -> Policy:
        if not project_id:
            return self._policies.get("default", _DEFAULT_POLICY)
        p = self._policies.get(project_id)
        if p:
            return p
        # Try name lookup
        for pol in self._policies.values():
            if pol.name.lower() == project_id.lower():
                return pol
        return self._policies.get("default", _DEFAULT_POLICY)

    def get_by_id(self, policy_id: str) -> Optional[Dict]:
        p = self._policies.get(policy_id)
        return asdict(p) if p else None

    def list_policies(self) -> List[Dict]:
        return [asdict(p) for p in self._policies.values()]

    def create_policy(self, data: Dict) -> Dict:
        pid = str(uuid.uuid4())[:12]
        now = _now()
        policy = Policy(
            id=pid,
            name=data.get("name", "Unnamed Policy"),
            description=data.get("description", ""),
            redact_pii=data.get("redact_pii", True),
            redact_phi=data.get("redact_phi", True),
            redact_financial=data.get("redact_financial", True),
            redact_custom_patterns=data.get("redact_custom_patterns", []),
            whitelist_domains=data.get("whitelist_domains", []),
            ai_provider=data.get("ai_provider"),
            ai_model=data.get("ai_model"),
            created_at=now, updated_at=now,
        )
        self._policies[pid] = policy
        self._save(policy)
        return asdict(policy)

    def update_policy(self, policy_id: str, data: Dict) -> Dict:
        p = self._policies.get(policy_id)
        if not p:
            raise ValueError(f"Policy {policy_id} not found")
        for key, val in data.items():
            if hasattr(p, key) and key not in ("id", "created_at"):
                setattr(p, key, val)
        p.updated_at = _now()
        self._save(p)
        return asdict(p)

    def delete_policy(self, policy_id: str):
        if policy_id == "default":
            raise ValueError("Cannot delete default policy")
        self._policies.pop(policy_id, None)
        path = self._dir / f"{policy_id}.json"
        if path.exists():
            path.unlink()

    def _load_all(self):
        for path in self._dir.glob("*.json"):
            try:
                raw = json.loads(path.read_text())
                p   = Policy(**{k: raw[k] for k in Policy.__dataclass_fields__ if k in raw})
                self._policies[p.id] = p
            except Exception:
                pass

    def _save(self, policy: Policy):
        path = self._dir / f"{policy.id}.json"
        path.write_text(json.dumps(asdict(policy), indent=2))


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
