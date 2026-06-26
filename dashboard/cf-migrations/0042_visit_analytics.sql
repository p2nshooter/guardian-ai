-- ==============================================================================
-- Copyright (c) 2024-2026 AXTO (axto.io). All rights reserved.
-- Platform: AXTO (axto.io) — Sovereign AI Infrastructure.
-- ==============================================================================
-- Migration 0042: Web visitor analytics
-- Lightweight daily × country aggregate (no per-request rows → cheap & private).
--   visitors = unique daily sessions (cookie-based), views = total page views.

CREATE TABLE IF NOT EXISTS visit_stats (
  day      TEXT NOT NULL,                 -- YYYY-MM-DD (UTC)
  country  TEXT NOT NULL DEFAULT 'XX',    -- CF-IPCountry (ISO-2) or 'XX'
  visitors INTEGER NOT NULL DEFAULT 0,
  views    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country)
);
CREATE INDEX IF NOT EXISTS idx_visit_day ON visit_stats(day);
