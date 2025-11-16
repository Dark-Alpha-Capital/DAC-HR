ALTER TABLE "interview" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interview" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."interview_status";--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('pending', 'move_forward', 'rejected');--> statement-breakpoint
ALTER TABLE "interview" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."interview_status";--> statement-breakpoint
ALTER TABLE "interview" ALTER COLUMN "status" SET DATA TYPE "public"."interview_status" USING "status"::"public"."interview_status";