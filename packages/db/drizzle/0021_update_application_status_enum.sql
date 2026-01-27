-- Step 1: Migrate existing data to new status values
UPDATE "application" 
SET "status" = CASE 
  WHEN "status" = 'pending' THEN 'ai_screening'
  WHEN "status" = 'reviewed' THEN 'ai_screening'
  WHEN "status" = 'shortlisted' THEN 'first_round_recruiter_call'
  WHEN "status" = 'interviewing' THEN 'second_round_technical_screening'
  WHEN "status" = 'hired' THEN 'onboarding'
  WHEN "status" = 'rejected' THEN 'rejected'
  WHEN "status" = 'withdrawn' THEN 'withdrawn'
  ELSE 'ai_screening'
END;--> statement-breakpoint

-- Step 2: Create new enum type with new values
DO $$ BEGIN
 CREATE TYPE "public"."application_status_new" AS ENUM('ai_screening', 'first_round_recruiter_call', 'second_round_technical_screening', 'third_round_final_ceo', 'contract_offer', 'onboarding', 'rejected', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Step 3: Alter the application table column to use the new enum type
ALTER TABLE "application" 
  ALTER COLUMN "status" TYPE "application_status_new" 
  USING "status"::text::"application_status_new";--> statement-breakpoint

-- Step 4: Drop the old enum type
DROP TYPE "public"."application_status";--> statement-breakpoint

-- Step 5: Rename the new enum type to the original name
ALTER TYPE "public"."application_status_new" RENAME TO "application_status";--> statement-breakpoint

-- Step 6: Update the default value for new applications
ALTER TABLE "application" 
  ALTER COLUMN "status" SET DEFAULT 'ai_screening';
