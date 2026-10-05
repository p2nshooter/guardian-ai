-- Site sale: the asking price moves from US$2,000,000 to US$10,000,000 (owner's decision,
-- 1 Oct 2026). Only a stored price still equal to the old default is updated; a price the
-- administrator set by hand is left alone.
UPDATE platform_config
   SET value = json_set(value, '$.priceUsd', 10000000), updated_at = datetime('now')
 WHERE key = 'site_sale' AND json_valid(value) AND json_extract(value, '$.priceUsd') = 2000000;
