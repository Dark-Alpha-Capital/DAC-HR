WITH deduped AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY candidate_id
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM candidate_onboarding
)
DELETE FROM candidate_onboarding target
USING deduped source
WHERE target.id = source.id
  AND source.row_num > 1;--> statement-breakpoint

DO $$ BEGIN
 IF NOT EXISTS (
   SELECT 1
   FROM pg_constraint
   WHERE conname = 'candidate_onboarding_candidate_id_unique'
 ) THEN
  ALTER TABLE "candidate_onboarding"
    ADD CONSTRAINT "candidate_onboarding_candidate_id_unique" UNIQUE ("candidate_id");
 END IF;
END $$;
