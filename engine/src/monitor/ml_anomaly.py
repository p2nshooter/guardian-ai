# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — ML Anomaly Detection (Tier 2)
Uses scikit-learn IsolationForest — production-grade, 10x faster than pure Python.

Model persistence:
  - Trained models saved to /guardian/data/ml_models/*.joblib
  - Auto-loaded on restart (no cold-start penalty)
  - Retrain every 24h or on explicit call

Training sources:
  - Process behavior: CPU, mem, net_bytes, file_ops, syscall_rate
  - Network: bytes_out, connections, hour, unique_dsts
  - Login: hour, failed_logins, day_of_week, geo_distance
  - DNS: query_rate, nxdomain_ratio, entropy

Scoring:
  - anomaly_score() → 0.0–1.0 (>0.6 suspicious, >0.75 alert)
  - Falls back to Z-score if model not yet trained (< MIN_SAMPLES)
"""
from __future__ import annotations

import asyncio, json, logging, math, os, time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("guardian.ml")

DATA_DIR  = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
MODEL_DIR = DATA_DIR / "ml_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MIN_SAMPLES   = 200    # samples needed before ML kicks in
RETRAIN_HOURS = 24     # auto-retrain interval
CONTAMINATION = 0.05   # expected anomaly fraction in training data


# ── Try scikit-learn (always available in production image) ───────────────────
try:
    from sklearn.ensemble import IsolationForest as _SKLearnIF
    from sklearn.preprocessing import StandardScaler
    import joblib as _joblib
    import numpy as _np
    _SKLEARN_OK = True
    log.debug("ML backend: scikit-learn IsolationForest")
except ImportError:
    _SKLEARN_OK = False
    log.warning("scikit-learn not available — using pure-Python fallback (less accurate)")


# ── Pure-Python fallback Isolation Forest (when sklearn unavailable) ──────────
class _PurePyIF:
    """Minimal Isolation Forest fallback — numpy only."""

    def __init__(self):
        self.trained = False
        self._means: List[float] = []
        self._stds:  List[float] = []
        self.n_samples = 0
        self.feature_names: List[str] = []

    def fit(self, X: List[List[float]], feature_names: List[str]) -> None:
        if len(X) < 10:
            return
        n = len(X[0])
        self.feature_names = feature_names
        self.n_samples = len(X)
        self._means = [sum(row[i] for row in X) / len(X) for i in range(n)]
        self._stds  = [
            max(math.sqrt(sum((row[i] - self._means[i]) ** 2 for row in X) / len(X)), 1e-8)
            for i in range(n)
        ]
        self.trained = True

    def anomaly_score(self, x: List[float]) -> float:
        if not self.trained:
            return 0.0
        z_scores = [abs((x[i] - self._means[i]) / self._stds[i]) for i in range(len(x))]
        max_z = max(z_scores) if z_scores else 0.0
        # Convert Z-score to 0-1 range (Z>3 → score ~0.7+)
        return round(min(max_z / 4.0, 1.0), 4)

    def to_dict(self) -> dict:
        return {"trained": self.trained, "n_samples": self.n_samples, "feature_names": self.feature_names}


# ── Unified Model Wrapper ─────────────────────────────────────────────────────

class AnomalyModel:
    """Wraps either sklearn IsolationForest or pure-Python fallback."""

    def __init__(self, entity_key: str):
        self.entity_key   = entity_key
        self.trained      = False
        self.n_samples    = 0
        self.feature_names: List[str] = []
        self._sk_model: Optional[object] = None
        self._sk_scaler: Optional[object] = None
        self._fallback: Optional[_PurePyIF] = None
        self._model_path = MODEL_DIR / f"{entity_key.replace(':', '_').replace('/', '_')}.joblib"

    def fit(self, X: List[List[float]], feature_names: List[str]) -> None:
        if len(X) < 10:
            return
        self.feature_names = feature_names
        self.n_samples     = len(X)

        if _SKLEARN_OK:
            try:
                arr    = _np.array(X, dtype=float)
                scaler = StandardScaler()
                X_sc   = scaler.fit_transform(arr)
                model  = _SKLearnIF(
                    n_estimators=200,
                    max_samples=min(256, len(X)),
                    contamination=CONTAMINATION,
                    random_state=42,
                    n_jobs=-1,          # use all CPU cores
                )
                model.fit(X_sc)
                self._sk_model  = model
                self._sk_scaler = scaler
                # Persist to disk
                _joblib.dump({"model": model, "scaler": scaler,
                              "feature_names": feature_names,
                              "n_samples": self.n_samples,
                              "trained_at": time.time()},
                             self._model_path)
                self.trained = True
                log.info(f"ML[sklearn]: trained {self.entity_key} ({len(X)} samples, {len(feature_names)} features)")
                return
            except Exception as e:
                log.warning(f"sklearn fit failed for {self.entity_key}: {e} — fallback")

        # Fallback
        fb = _PurePyIF()
        fb.fit(X, feature_names)
        self._fallback = fb
        self.trained   = fb.trained

    def load_from_disk(self) -> bool:
        """Load a previously trained model from disk (survive restarts)."""
        if not _SKLEARN_OK or not self._model_path.exists():
            return False
        try:
            data = _joblib.load(self._model_path)
            self._sk_model    = data["model"]
            self._sk_scaler   = data["scaler"]
            self.feature_names = data.get("feature_names", [])
            self.n_samples     = data.get("n_samples", 0)
            self.trained       = True
            log.debug(f"ML: loaded model {self.entity_key} from disk ({self.n_samples} samples)")
            return True
        except Exception as e:
            log.debug(f"ML: could not load {self.entity_key} from disk: {e}")
            return False

    def anomaly_score(self, x: List[float]) -> Tuple[float, str]:
        """Returns (score 0-1, method_name)."""
        if not self.trained:
            return 0.0, "no_model"

        if _SKLEARN_OK and self._sk_model is not None:
            try:
                arr = _np.array(x, dtype=float).reshape(1, -1)
                arr_sc = self._sk_scaler.transform(arr)  # type: ignore
                raw = self._sk_model.decision_function(arr_sc)[0]  # type: ignore
                # decision_function: higher = more normal, lower = more anomalous
                # Typical range: -0.5 (anomaly) to +0.5 (normal)
                # Map to 0-1 where 1 = most anomalous
                score = float(max(0.0, min(1.0, 0.5 - raw)))
                return round(score, 4), "isolation_forest_sklearn"
            except Exception as e:
                log.debug(f"sklearn score error: {e}")

        if self._fallback and self._fallback.trained:
            return self._fallback.anomaly_score(x), "zscore_fallback"

        return 0.0, "no_model"


# ── ML Anomaly Engine ─────────────────────────────────────────────────────────

class MLAnomalyEngine:
    """
    Per-entity ML anomaly detection.
    Each process name, IP, username gets its own trained model.
    """

    def __init__(self):
        self._models:   Dict[str, AnomalyModel]       = {}
        self._samples:  Dict[str, List[List[float]]]  = {}
        self._fnames:   Dict[str, List[str]]           = {}
        self._last_train: Dict[str, float]             = {}
        self._running   = False

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._preload_models())
        asyncio.create_task(self._train_loop())
        log.info(f"ML Anomaly Engine started (backend: {'sklearn' if _SKLEARN_OK else 'pure-python'})")

    async def stop(self) -> None:
        self._running = False

    async def _preload_models(self) -> None:
        """Load persisted models from disk on startup."""
        if not _SKLEARN_OK:
            return
        await asyncio.sleep(2)
        loop = asyncio.get_event_loop()
        for p in MODEL_DIR.glob("*.joblib"):
            key = p.stem.replace("_", ":", 1)
            if key not in self._models:
                model = AnomalyModel(key)
                ok = await loop.run_in_executor(None, model.load_from_disk)
                if ok:
                    self._models[key] = model
        if self._models:
            log.info(f"ML: preloaded {len(self._models)} models from disk")

    # ── Record samples ──────────────────────────────────────────────────────

    def _record(self, key: str, features: List[float], fnames: List[str]) -> None:
        if key not in self._samples:
            self._samples[key] = []
            self._fnames[key]  = fnames
        self._samples[key].append(features)
        if len(self._samples[key]) > 10_000:
            self._samples[key] = self._samples[key][-10_000:]

    def record_process(self, name: str, cpu: float, mem_mb: float,
                       net_bytes: float, file_ops: float, syscall_rate: float = 0.0) -> None:
        self._record(f"proc:{name}",
                     [cpu, mem_mb, net_bytes, file_ops, syscall_rate],
                     ["cpu_pct","mem_mb","net_bytes","file_ops","syscall_rate"])

    def record_network(self, src_ip: str, bytes_out: float, connections: float,
                       hour: float, unique_dsts: float = 0.0) -> None:
        self._record(f"ip:{src_ip}",
                     [bytes_out, connections, hour, unique_dsts],
                     ["bytes_out","connections","hour","unique_dsts"])

    def record_login(self, username: str, hour: float, failed: float,
                     day_of_week: float, geo_distance: float = 0.0) -> None:
        self._record(f"user:{username}",
                     [hour, failed, day_of_week, geo_distance],
                     ["hour","failed_logins","day_of_week","geo_distance"])

    def record_dns(self, domain_base: str, query_rate: float,
                   nxdomain_ratio: float, entropy: float) -> None:
        self._record(f"dns:{domain_base}",
                     [query_rate, nxdomain_ratio, entropy],
                     ["query_rate","nxdomain_ratio","entropy"])

    # ── Score ───────────────────────────────────────────────────────────────

    def score_process(self, name: str, cpu: float, mem_mb: float,
                      net_bytes: float, file_ops: float,
                      syscall_rate: float = 0.0) -> Tuple[float, str]:
        return self._score(f"proc:{name}", [cpu, mem_mb, net_bytes, file_ops, syscall_rate])

    def score_network(self, src_ip: str, bytes_out: float, connections: float,
                      hour: float, unique_dsts: float = 0.0) -> Tuple[float, str]:
        return self._score(f"ip:{src_ip}", [bytes_out, connections, hour, unique_dsts])

    def score_login(self, username: str, hour: float, failed: float,
                    day_of_week: float, geo_distance: float = 0.0) -> Tuple[float, str]:
        return self._score(f"user:{username}", [hour, failed, day_of_week, geo_distance])

    def score_dns(self, domain_base: str, query_rate: float,
                  nxdomain_ratio: float, entropy: float) -> Tuple[float, str]:
        return self._score(f"dns:{domain_base}", [query_rate, nxdomain_ratio, entropy])

    def _score(self, key: str, features: List[float]) -> Tuple[float, str]:
        m = self._models.get(key)
        if m and m.trained:
            return m.anomaly_score(features)
        return 0.0, "no_model_yet"

    # ── Training loop ───────────────────────────────────────────────────────

    async def _train_loop(self) -> None:
        await asyncio.sleep(120)   # wait for initial data collection
        while self._running:
            trained = 0
            loop = asyncio.get_event_loop()
            for key, samples in list(self._samples.items()):
                if len(samples) < MIN_SAMPLES:
                    continue
                since = time.time() - self._last_train.get(key, 0)
                if since < RETRAIN_HOURS * 3600:
                    continue
                fnames = self._fnames.get(key, [])
                try:
                    model = AnomalyModel(key)
                    await loop.run_in_executor(None, model.fit, list(samples), fnames)
                    if model.trained:
                        self._models[key]      = model
                        self._last_train[key]  = time.time()
                        trained += 1
                except Exception as e:
                    log.debug(f"ML train error for {key}: {e}")
            if trained:
                log.info(f"ML: trained/updated {trained} models")
            await asyncio.sleep(3600)

    def get_stats(self) -> dict:
        return {
            "backend":         "sklearn" if _SKLEARN_OK else "pure_python",
            "models_trained":  sum(1 for m in self._models.values() if m.trained),
            "models_pending":  sum(1 for k in self._samples if len(self._samples[k]) < MIN_SAMPLES),
            "total_entities":  len(self._samples),
            "persisted_models": len(list(MODEL_DIR.glob("*.joblib"))) if _SKLEARN_OK else 0,
            "top_entities": {
                k: len(v) for k, v in
                sorted(self._samples.items(), key=lambda x: len(x[1]), reverse=True)[:10]
            },
        }


_engine: Optional[MLAnomalyEngine] = None

def get_ml_engine() -> MLAnomalyEngine:
    global _engine
    if _engine is None:
        _engine = MLAnomalyEngine()
    return _engine
