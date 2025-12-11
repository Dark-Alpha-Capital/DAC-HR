CREATE TYPE "public"."position_status" AS ENUM('active', 'hold', 'passed', 'upcoming');--> statement-breakpoint
ALTER TABLE "position" ADD COLUMN "status" "position_status" DEFAULT 'active' NOT NULL;