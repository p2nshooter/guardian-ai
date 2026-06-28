-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════
-- Migration 0018: Link engine builds → licenses (portal download)
-- ═══════════════════════════════════════════════════════════════

-- Add engine_build_id to licenses so portal knows which R2 binary to serve
ALTER TABLE licenses ADD COLUMN engine_build_id TEXT DEFAULT '';

-- Index for fast lookup: license_key → engine_build
CREATE INDEX IF NOT EXISTS idx_engine_builds_license_key ON engine_builds(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_engine_build     ON licenses(engine_build_id);

-- NOTE: run_url already added in migration 0017 — removed to prevent duplicate column error
