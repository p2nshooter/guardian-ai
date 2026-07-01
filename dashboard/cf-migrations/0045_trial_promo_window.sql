-- ============================================================================
-- 0045_trial_promo_window.sql
-- Seed the axto.io launch-promo self-service trial claim window.
-- The window is a 1-year CLAIM window: a client may claim a trial code any
-- time inside it; the 7-day trial clock starts when they claim, not when the
-- window opens. When a product+tier's 100-code pool is exhausted, that option
-- closes even if the window is still open.
-- ============================================================================
INSERT INTO trial_promo_config (id, starts_at, ends_at, enabled)
VALUES ('axto_launch', '2026-07-01 00:00:00', '2027-07-01 00:00:00', 1)
ON CONFLICT(id) DO NOTHING;
