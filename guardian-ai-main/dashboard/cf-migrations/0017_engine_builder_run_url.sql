-- ============================================================
-- Migration 0017: Add run_url + gh_release_tag to engine_builds
-- Fixes: run_url never stored, GitHub Release cleanup on hard delete
-- Run: wrangler d1 execute axto-db --remote --file=cf-migrations/0017_engine_builder_run_url.sql
-- ============================================================
ALTER TABLE engine_builds ADD COLUMN run_url       TEXT DEFAULT '';
ALTER TABLE engine_builds ADD COLUMN gh_release_tag TEXT DEFAULT '';
-- file_size already exists in 0014, but rename to match code
-- (file_size column exists, no rename needed — just use it)
