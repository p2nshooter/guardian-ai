-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0030: Fix autopost_posts missing columns
-- ═══════════════════════════════════════════════════════════════════
-- Purpose: this migration originally assumed 0025 had re-created autopost_posts
-- with a reduced schema and tried to ALTER the missing columns back in. In
-- fact 0006_fix_missing_columns.sql's "nuclear reset" already gave
-- autopost_posts platform_config_id, platform_post_id, platform_url,
-- metadata, error_message and updated_at (0025's CREATE TABLE IF NOT EXISTS
-- is a no-op against that already-existing table, so those columns were
-- never actually missing). SQLite's ALTER TABLE ADD COLUMN has no
-- IF NOT EXISTS / silent-skip form — it hard-errors on a duplicate column —
-- so re-adding them here would abort this migration. Nothing to do for
-- autopost_posts.

-- playbook_purchases: same story — 0009_playbooks.sql already created this
-- table with client_email and bundle_id, so 0025's CREATE TABLE IF NOT EXISTS
-- was a no-op here too and there is nothing missing to add.

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
