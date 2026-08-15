-- Backfill the persisted `user.role` for the three hardcoded admin emails.
-- This is the single source of truth for admin-ness going forward (the
-- session-time email re-derivation was removed from lib/auth.ts).
UPDATE `user`
SET `role` = 'admin'
WHERE `email` IN (
  'rahul@darkalphacapital.com',
  'gaurav@darkalphacapital.com',
  'da@darkalphacapital.com'
)
AND (`role` IS NULL OR `role` != 'admin');
