CREATE TYPE "public"."hire_level" AS ENUM('managing-director', 'vice-president', 'associate-analyst', 'intern');--> statement-breakpoint
CREATE TYPE "public"."target_status" AS ENUM('pending', 'complete');--> statement-breakpoint
CREATE TABLE "target" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"status" "target_status" DEFAULT 'pending' NOT NULL,
	"timeline" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position" ADD COLUMN "hire_level" "hire_level";--> statement-breakpoint
ALTER TABLE "target" ADD CONSTRAINT "target_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;