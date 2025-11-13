-- First, convert enum to text so we can update values
ALTER TABLE "interview" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
-- Update existing status values to match new enum
UPDATE "interview" SET "status" = 'pending' WHERE "status" = 'scheduled';--> statement-breakpoint
UPDATE "interview" SET "status" = 'complete' WHERE "status" = 'completed';--> statement-breakpoint
UPDATE "interview" SET "status" = 'complete' WHERE "status" = 'cancelled';--> statement-breakpoint
-- Set default
ALTER TABLE "interview" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
-- Drop old enum type
DROP TYPE "public"."interview_status";--> statement-breakpoint
-- Create new enum type
CREATE TYPE "public"."interview_status" AS ENUM('pending', 'complete');--> statement-breakpoint
-- Set default with new enum
ALTER TABLE "interview" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."interview_status";--> statement-breakpoint
-- Convert text back to new enum type
ALTER TABLE "interview" ALTER COLUMN "status" SET DATA TYPE "public"."interview_status" USING "status"::"public"."interview_status";--> statement-breakpoint
-- Add rating column
ALTER TABLE "interview" ADD COLUMN "rating" integer;--> statement-breakpoint
-- Remove current_stage column
ALTER TABLE "application" DROP COLUMN "current_stage";--> statement-breakpoint
-- Remove stage_order column
ALTER TABLE "position_round_templates" DROP COLUMN "stage_order";
