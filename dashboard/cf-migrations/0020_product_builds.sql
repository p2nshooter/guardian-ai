-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════
-- Migration 0020: Product Builds tracking (for 12-product pipeline)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_builds (
  id            TEXT PRIMARY KEY,
  product       TEXT NOT NULL,              -- 'guardian-core', 'orchestra-worker-gpu', etc.
  build_type    TEXT NOT NULL DEFAULT 'image', -- 'image' | 'exe'
  status        TEXT NOT NULL DEFAULT 'building', -- 'building' | 'ready' | 'failed'
  pipeline_id   TEXT DEFAULT '',
  pipeline_url  TEXT DEFAULT '',
  progress      INTEGER DEFAULT 0,
  build_id      TEXT DEFAULT '',             -- cross-reference if triggered from dashboard
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_builds_product ON product_builds(product, build_type);
CREATE INDEX IF NOT EXISTS idx_product_builds_status ON product_builds(status);
