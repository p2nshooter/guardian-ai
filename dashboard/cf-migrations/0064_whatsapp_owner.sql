-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- ==============================================================================
-- Owner, 18 Oct 2026: "ubah seluruh nomer HP yg ada di axto.io & xaa.es menjadi
-- +6285691234561, ini adalah nomer kirim bukti transaksi manual fast respon".
-- The code defaults already use it; this also updates a stored Admin → Site
-- sale setting (and the investor round, if saved) that still carries another
-- number. It supersedes the +62 856-9287-9465 of 14 Oct (docs/REQUESTS.md row 59).
UPDATE platform_config
   SET value = json_set(value, '$.whatsapp', '+6285691234561'), updated_at = datetime('now')
 WHERE key IN ('site_sale', 'invest_offer')
   AND json_valid(value)
   AND COALESCE(json_extract(value, '$.whatsapp'), '') != '+6285691234561';
