"""Deterministic tests for AXTO Orchestra routing core.
Stubs the local `database` and `semantic_router` modules so the REAL routing
logic can be exercised offline. Run from this dir: python3 test_routing.py
"""
import sys, types, os

# ── Stub dependencies BEFORE importing routing_engine ────────────────────────
_state = {"routing_mode": "smart_balance", "circuits": {}}

db = types.ModuleType("database")
db.get_setting = lambda key, default=None: _state["routing_mode"] if key == "routing_mode" else (default if default is not None else "")
db.circuit_check = lambda pid: _state["circuits"].get(pid, "closed")
sys.modules["database"] = db

sr = types.ModuleType("semantic_router")
sr.get_classifier = lambda: types.SimpleNamespace(classify=lambda messages, task: ("default", 1.0))
sr.CATEGORY_ROUTING = {"default": []}
sr.CATEGORY_CHEAP = set()
sys.modules["semantic_router"] = sr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import routing_engine as R  # noqa: E402

results = []
def ok(name, cond): results.append((name, bool(cond)))

def W(pid, model="m", load=10, lat=100, err=0.0, status="active", wtype="cpu"):
    return {"provider_id": pid, "model": model, "load_pct": load, "avg_latency_ms": lat,
            "error_rate": err, "status": status, "worker_type": wtype}

# ── candidate filtering ──────────────────────────────────────────────────────
_state["routing_mode"] = "cost_first"
ok("inactive workers excluded", R.select_worker([W("a", status="draining")]) is None)
ok("empty pool → None", R.select_worker([]) is None)

# gpu_required only matches gpu workers
ok("gpu_required excludes cpu worker", R.select_worker([W("a", wtype="cpu")], gpu_required=True) is None)
ok("gpu_required matches gpu worker", R.select_worker([W("g", wtype="gpu")], gpu_required=True)["provider_id"] == "g")

# circuit breaker excludes provider
_state["circuits"] = {"bad": "open"}
ok("open circuit excluded", R.select_worker([W("bad")]) is None)
ok("closed circuit allowed", R.select_worker([W("good")])["provider_id"] == "good")
_state["circuits"] = {}

# ── scoring: cost_first prefers lower load (same provider/model) ──────────────
_state["routing_mode"] = "cost_first"
pick = R.select_worker([W("a", load=90), W("b", load=5)])
ok("cost_first prefers lighter load", pick["provider_id"] == "b")

# error-rate penalty: clean worker beats high-error worker
pick2 = R.select_worker([W("hi", load=5, err=0.9), W("lo", load=5, err=0.0)])
ok("high error-rate worker deprioritized", pick2["provider_id"] == "lo")

# ── SLA-aware: too-slow worker excluded for urgent jobs ──────────────────────
_state["routing_mode"] = "smart_balance"
slow = R.select_worker([W("slow", lat=4500)], sla_ms=1000)   # 4500 > 1000*0.8
ok("worker too slow for SLA excluded", slow is None)
fast = R.select_worker([W("fast", lat=200)], sla_ms=1000)
ok("worker within SLA allowed", fast and fast["provider_id"] == "fast")

# ── round-robin distributes across candidates ────────────────────────────────
_state["routing_mode"] = "round_robin"
pool = [W("x"), W("y"), W("z")]
picks = {R.select_worker(pool)["provider_id"] for _ in range(6)}
ok("round_robin spreads across pool", len(picks) >= 2)

# ── cheapest provider helper ─────────────────────────────────────────────────
cp = R.get_cheapest_provider([W("a"), W("b")])
ok("cheapest provider returns an active provider", cp in ("a", "b"))
ok("cheapest ignores inactive", R.get_cheapest_provider([W("a", status="off")]) is None)

# ── scorer direct: circuit open returns -1 ───────────────────────────────────
_state["circuits"] = {"z": "open"}
ok("scorer: open circuit = -1", R._score_worker(W("z"), "smart_balance", "chat") == -1.0)
_state["circuits"] = {}

passed = sum(1 for _, c in results if c)
failed = len(results) - passed
for n, c in results:
    if not c:
        print("FAIL:", n)
print(f"\nORCHESTRA-ROUTING: {passed}/{len(results)} passed, {failed} failed")
sys.exit(0 if failed == 0 else 1)
