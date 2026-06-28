-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0030: Fix autopost_posts missing columns
-- ═══════════════════════════════════════════════════════════════════
-- Purpose: Migration 0025 re-created autopost_posts with reduced schema
-- missing critical columns that the publisher code expects.
-- This migration adds them back safely (ALTER TABLE ... ADD COLUMN
-- with OR IGNORE-like safety via try/catch in D1).

-- Add missing columns (each ALTER TABLE will silently fail if column already exists in D1)
ALTER TABLE autopost_posts ADD COLUMN platform_config_id TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_posts ADD COLUMN platform_post_id   TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_posts ADD COLUMN platform_url       TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_posts ADD COLUMN metadata           TEXT NOT NULL DEFAULT '{}';
ALTER TABLE autopost_posts ADD COLUMN error_message      TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_posts ADD COLUMN updated_at         TEXT NOT NULL DEFAULT (datetime('now'));

-- Also fix the playbook_purchases table — missing columns that shared.ts webhook expects
ALTER TABLE playbook_purchases ADD COLUMN client_email TEXT NOT NULL DEFAULT '';
ALTER TABLE playbook_purchases ADD COLUMN bundle_id TEXT NOT NULL DEFAULT '';

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0030',
  'schema_migration',
  'system',
  '0030',
  'system',
  '{"migration":"0030_fix_autopost_posts","description":"Add missing columns to autopost_posts: platform_config_id, platform_post_id, platform_url, metadata, error_message, updated_at"}',
  datetime('now')
);
