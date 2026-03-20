-- ============================================================
-- Migration 0005: Placeholder (columns handled by 0006)
-- This migration previously tried ALTER TABLE ADD COLUMN
-- which fails if columns already exist. All column additions
-- are now safely handled in 0006 via table recreation.
-- ============================================================
SELECT 1;
