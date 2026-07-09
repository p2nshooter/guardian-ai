-- ==============================================================================
-- 0051_trial_discount_and_ratings.sql   (additive)
--
-- 1. trial_batch_codes.discount_used_at: tracks whether a client who claimed a
--    launch-promo trial has already redeemed the one-time 50%-off-first-year
--    continuation discount for that product, so it can't be reused.
-- 2. trial_promo_max_products: caps how many distinct products a single email
--    may claim a trial for during the pre-launch promo (product owner rule:
--    max 2 apps per client). Stored so it's adjustable without a deploy.
-- ==============================================================================
ALTER TABLE trial_batch_codes ADD COLUMN discount_used_at TEXT NOT NULL DEFAULT '';

INSERT OR IGNORE INTO site_settings (key, value, updated_at)
VALUES ('trial_promo_max_products', '2', datetime('now'));
