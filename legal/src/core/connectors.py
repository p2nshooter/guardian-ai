# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
"""
BYOD (Bring Your Own Data) Connector Engine

All URLs and source definitions live in /connectors/registry.yml — NEVER
hardcoded in application code (Bagian 12.5 requirement).
This engine reads the YAML registry and provides:
  - Source catalog with verification status
  - Health check per source
  - Fetch methods per auth type (open/apikey/crawl/subscription)
  - Warning flags for unverified/gap sources
"""
import asyncio
import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import httpx
import yaml

logger = logging.getLogger("axto.legal.connectors")

# Path to the connector YAML registry
REGISTRY_PATH = Path(__file__).parent.parent.parent / "connectors" / "registry.yml"

# Verification status messages (elegant, informative)
VERIFICATION_MESSAGES = {
    True:  "✅ Endpoint terverifikasi dan aktif",
    False: "⚠️  Sumber ini membutuhkan verifikasi tambahan. Informasi hukum yang disediakan perlu dikonfirmasi dengan sumber resmi terkini.",
}

AVAIL_LABELS = {
    "yes":     "Tersedia penuh — REST API aktif",
    "partial": "Tersedia sebagian — HTML/PDF, memerlukan parsing",
    "no":      "Belum tersedia — perlu crawler atau input manual",
}

AUTH_LABELS = {
    "open":         "Terbuka — tidak memerlukan kunci API",
    "apikey":       "Memerlukan API Key (umumnya gratis)",
    "oauth2":       "Memerlukan OAuth2",
    "subscription": "Berlangganan berbayar diperlukan",
    "crawl":        "Web scraping (tidak ada API resmi)",
    "manual":       "Import manual",
}

DISCLAIMER = (
    "AXTO Legal adalah alat bantu riset hukum berbasis AI. "
    "Platform ini dirancang untuk membantu Anda memahami dan menjelajahi "
    "informasi hukum dari berbagai yurisdiksi — bukan untuk memberikan nasihat hukum. "
    "Setiap keputusan hukum penting hendaknya selalu dikonsultasikan dengan "
    "konsultan hukum atau pengacara yang berkualifikasi dan berpengalaman di "
    "yurisdiksi yang relevan. Informasi yang tersedia mungkin belum mencerminkan "
    "perubahan hukum terkini. Selalu verifikasi dengan sumber resmi sebelum "
    "mengambil tindakan hukum."
)


class ConnectorRegistry:
    """
    Loads and manages all legal data source connectors from YAML registry.
    No URLs are hardcoded — all come from connectors/registry.yml.
    """

    def __init__(self, registry_path: Optional[Path] = None):
        self._path    = registry_path or REGISTRY_PATH
        self._data: dict = {}
        self._sources: dict[str, dict] = {}
        self._loaded_at: float = 0.0
        self._load()

    def _load(self):
        """Load connector registry from YAML."""
        try:
            raw = yaml.safe_load(self._path.read_text(encoding="utf-8"))
            self._data = raw or {}
            self._sources = {}

            # Flatten all categories into a single sources dict
            skip_keys = {"version", "schema"}
            for category, entries in self._data.items():
                if category in skip_keys or not isinstance(entries, dict):
                    continue
                for source_id, source in entries.items():
                    if isinstance(source, dict) and "id" in source:
                        source["_category"] = category
                        self._sources[source_id] = source

            self._loaded_at = time.time()
            logger.info("Loaded %d connector sources from registry", len(self._sources))
        except FileNotFoundError:
            logger.warning("Connector registry not found at %s", self._path)
            self._sources = {}
        except Exception as e:
            logger.error("Failed to load connector registry: %s", e)
            self._sources = {}

    def reload(self):
        self._load()

    def get_all_sources(self) -> dict[str, dict]:
        return dict(self._sources)

    def get_source(self, source_id: str) -> Optional[dict]:
        return self._sources.get(source_id)

    def get_sources_by_category(self, category: str) -> list[dict]:
        return [s for s in self._sources.values() if s.get("_category") == category]

    def get_sources_by_country(self, country_code: str) -> list[dict]:
        cc = country_code.lower()
        results = []
        for s in self._sources.values():
            country = s.get("country", "").lower()
            if cc in country or country in (cc, "global", "eu", "international"):
                results.append(s)
        return results

    def get_open_sources(self) -> list[dict]:
        """Sources that require no API key — immediate access."""
        return [s for s in self._sources.values() if s.get("auth") == "open"]

    def get_verified_sources(self) -> list[dict]:
        return [s for s in self._sources.values() if s.get("verified", False)]

    def get_gap_sources(self) -> list[dict]:
        """Sources flagged as gaps/needing verification."""
        return [s for s in self._sources.values() if not s.get("verified", True)]

    def get_summary(self) -> dict:
        total    = len(self._sources)
        verified = len(self.get_verified_sources())
        open_s   = len(self.get_open_sources())
        gaps     = len(self.get_gap_sources())
        return {
            "total_sources":        total,
            "verified":             verified,
            "needs_verification":   gaps,
            "open_access":          open_s,
            "subscription_required": len([s for s in self._sources.values() if s.get("auth") == "subscription"]),
            "disclaimer":           DISCLAIMER,
        }

    def enrich_source(self, source: dict) -> dict:
        """Add human-friendly labels and warnings to a source record."""
        enriched = dict(source)
        avail    = source.get("avail", "no")
        verified = source.get("verified", False)
        auth     = source.get("auth", "open")

        enriched["avail_label"]        = AVAIL_LABELS.get(avail, avail)
        enriched["auth_label"]         = AUTH_LABELS.get(auth, auth)
        enriched["verification_status"] = VERIFICATION_MESSAGES[verified]
        enriched["needs_verification"]  = not verified

        if not verified:
            enriched["warning"] = (
                f"⚠️  Data dari sumber '{source.get('name', '')}' belum sepenuhnya "
                f"terverifikasi. Mohon konfirmasi dengan website resmi sebelum "
                f"mengandalkan informasi ini untuk keputusan hukum penting."
            )
        return enriched


class ConnectorFetcher:
    """
    Fetches data from connector sources.
    Handles different auth types: open, apikey, crawl.
    """

    def __init__(self, registry: ConnectorRegistry, api_keys: dict = None):
        self.registry  = registry
        self.api_keys  = api_keys or {}  # source_id -> api_key mapping
        self._cache:   dict = {}
        self._cache_ttl = 3600  # 1 hour

    def _get_key(self, source_id: str) -> Optional[str]:
        """Get API key for a source from env or config."""
        # Check env: LEGL_APIKEY_FIN01, LEGL_APIKEY_INTL03, etc.
        env_key = f"LEGL_APIKEY_{source_id.replace('-', '')}"
        return os.environ.get(env_key) or self.api_keys.get(source_id)

    async def health_check(self, source_id: str, timeout: float = 10.0) -> dict:
        """Check if a source endpoint is reachable."""
        source = self.registry.get_source(source_id)
        if not source:
            return {"source_id": source_id, "status": "not_found"}

        links = source.get("links", [])
        if not links:
            return {"source_id": source_id, "status": "no_endpoint", "avail": source.get("avail")}

        # Try first link
        url = links[0]["url"] if isinstance(links[0], dict) else links[0]
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                resp = await client.head(url)
            return {
                "source_id":   source_id,
                "status":      "ok" if resp.status_code < 400 else "error",
                "http_status": resp.status_code,
                "url":         url,
                "verified":    source.get("verified", False),
            }
        except Exception as e:
            return {
                "source_id": source_id,
                "status":    "unreachable",
                "error":     str(e)[:100],
                "url":       url,
            }

    async def fetch_source(
        self,
        source_id: str,
        query_params: dict = None,
        path_suffix: str = "",
        timeout: float = 30.0,
    ) -> dict:
        """
        Fetch data from a source's primary endpoint.
        Returns structured response with data + metadata + warnings.
        """
        source = self.registry.get_source(source_id)
        if not source:
            return {"error": f"Source {source_id} not found in registry"}

        auth   = source.get("auth", "open")
        avail  = source.get("avail", "no")
        links  = source.get("links", [])

        if avail == "no":
            return {
                "source_id": source_id,
                "status":    "no_api",
                "message":   f"Sumber '{source.get('name')}' tidak memiliki REST API resmi. "
                             f"Data tersedia via HTML/PDF manual. "
                             f"{source.get('notes', '')}",
                "links":     links,
            }

        if auth == "subscription":
            api_key = self._get_key(source_id)
            if not api_key:
                return {
                    "source_id": source_id,
                    "status":    "subscription_required",
                    "message":   f"Sumber '{source.get('name')}' memerlukan berlangganan. "
                                 f"Konfigurasi LEGL_APIKEY_{source_id.replace('-','')} "
                                 f"di environment variables.",
                    "website":   source.get("website"),
                }

        if not links:
            return {"error": "No endpoints configured"}

        base_url = links[0]["url"] if isinstance(links[0], dict) else links[0]
        url      = base_url.rstrip("/") + path_suffix

        headers = {"User-Agent": "AXTO-Legal/1.0 (axto.io; legal-research)"}
        if auth in ("apikey", "subscription"):
            api_key = self._get_key(source_id)
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers, params=query_params or {})
                resp.raise_for_status()

            try:
                data = resp.json()
            except Exception:
                data = {"text": resp.text[:5000]}

            result = {
                "source_id":   source_id,
                "source_name": source.get("name"),
                "status":      "ok",
                "data":        data,
                "url":         str(resp.url),
                "fetched_at":  time.time(),
            }

            if not source.get("verified", False):
                result["verification_warning"] = (
                    f"⚠️  Data dari '{source.get('name')}' belum sepenuhnya terverifikasi. "
                    f"Konfirmasi dengan sumber resmi sebelum mengandalkan informasi ini."
                )

            return result

        except httpx.HTTPStatusError as e:
            return {
                "source_id": source_id,
                "status":    "http_error",
                "http_code": e.response.status_code,
                "message":   e.response.text[:500],
            }
        except Exception as e:
            return {
                "source_id": source_id,
                "status":    "error",
                "message":   str(e)[:300],
            }


# ── Singletons ────────────────────────────────────────────────────────────────
_registry: Optional[ConnectorRegistry] = None
_fetcher:  Optional[ConnectorFetcher]  = None


def get_registry() -> ConnectorRegistry:
    global _registry
    if _registry is None:
        _registry = ConnectorRegistry()
    return _registry


def get_fetcher() -> ConnectorFetcher:
    global _fetcher, _registry
    if _fetcher is None:
        _fetcher = ConnectorFetcher(get_registry())
    return _fetcher
