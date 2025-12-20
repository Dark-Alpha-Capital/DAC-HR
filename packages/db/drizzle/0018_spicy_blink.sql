-- Drop the failed composite unique index if it exists
DROP INDEX IF EXISTS "name_email_idx";--> statement-breakpoint
-- Remove duplicate emails, keeping the first occurrence (by created_at)
DELETE FROM "candidate" 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at ASC) as rn
    FROM "candidate"
  ) t 
  WHERE rn > 1
);--> statement-breakpoint
-- Add unique constraint on email
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_email_unique" UNIQUE("email");