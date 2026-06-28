-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0022: Add CI provider tracking to product_builds
-- Supports dual CI: GitHub Actions + GitLab CI
-- ═══════════════════════════════════════════════════════════════════════════

-- Add ci_provider column (which CI system built this artifact)
ALTER TABLE product_builds ADD COLUMN ci_provider TEXT DEFAULT '' ;

-- Add pipeline_id column (GitLab pipeline ID or GitHub run ID)
ALTER TABLE product_builds ADD COLUMN pipeline_id TEXT DEFAULT '' ;

-- Add commit hash for traceability
ALTER TABLE product_builds ADD COLUMN commit_hash TEXT DEFAULT '' ;

-- Update existing rows to mark as 'manual' or 'unknown'
UPDATE product_builds SET ci_provider = 'manual' WHERE status = 'ready' AND ci_provider = '';
UPDATE product_builds SET ci_provider = 'unknown' WHERE status != 'ready' AND ci_provider = '';

-- Index for CI provider queries
CREATE INDEX IF NOT EXISTS idx_product_builds_ci ON product_builds(ci_provider, status);

-- Audit log entry
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0022',
  'schema_migration',
  'system',
  '0022',
  'system',
  '{"migration":"0022_ci_provider_tracking","description":"Add CI provider (github/gitlab) tracking to product_builds","columns_added":["ci_provider","pipeline_id","commit_hash"]}',
  datetime('now')
);
