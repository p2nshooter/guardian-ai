-- ============================================================================
-- 0039_reviews.sql   (additive)
-- Real customer reviews/testimonials shown on the public index — moderated.
--   • rating 1..5 stars
--   • client may choose to show their company name (show_company), but the ADMIN
--     has final say (admin_show_company) on whether it appears on the index
--   • optional company logo (size-limited, stored as a data URL)
--   • status pending → approved/rejected; only approved+featured show on index
--   • polite-language filter result is stored (flagged) for admin attention
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id                 TEXT PRIMARY KEY,
  client_email       TEXT NOT NULL,
  client_name        TEXT NOT NULL DEFAULT '',
  company_name       TEXT NOT NULL DEFAULT '',
  show_company       INTEGER NOT NULL DEFAULT 0,  -- client's preference
  admin_show_company INTEGER NOT NULL DEFAULT 1,  -- admin override (final say)
  logo_data          TEXT NOT NULL DEFAULT '',    -- data URL (size-limited)
  product            TEXT NOT NULL DEFAULT '',
  rating             INTEGER NOT NULL DEFAULT 5,  -- 1..5
  title              TEXT NOT NULL DEFAULT '',
  body               TEXT NOT NULL DEFAULT '',
  language           TEXT NOT NULL DEFAULT 'en',
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  featured           INTEGER NOT NULL DEFAULT 0,   -- show on index when 1
  flagged            INTEGER NOT NULL DEFAULT 0,   -- polite-filter flagged for review
  flag_reason        TEXT NOT NULL DEFAULT '',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at         TEXT NOT NULL DEFAULT '',
  decided_by         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reviews_status   ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(featured);
CREATE INDEX IF NOT EXISTS idx_reviews_email    ON reviews(client_email);
