ALTER TABLE "application" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "status" SET DEFAULT 'ai_screening'::text;--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('ai_screening', 'first_round_recruiter_call', 'second_round_technical_screening', 'third_round_final_ceo', 'contract_offer', 'onboarding', 'rejected', 'withdrawn');--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "status" SET DEFAULT 'ai_screening'::"public"."application_status";--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";