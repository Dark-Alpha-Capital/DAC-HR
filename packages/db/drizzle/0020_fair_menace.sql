CREATE TYPE "public"."sourcing_channel" AS ENUM('linkedin', 'indeed', 'upwork', 'handshake', 'internal-referrals', 'university-portals', 'agency', 'other');--> statement-breakpoint
CREATE TABLE "recruiter_weekly_checkin" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"week_end_date" timestamp NOT NULL,
	"recruiter_name" text NOT NULL,
	"positions_worked" text[],
	"candidates_sourced" integer DEFAULT 0,
	"candidates_screened" integer DEFAULT 0,
	"candidates_rejected" integer DEFAULT 0,
	"candidates_advanced_2nd_round" integer DEFAULT 0,
	"candidates_advanced_3rd_round" integer DEFAULT 0,
	"offers_extended" integer DEFAULT 0,
	"offers_accepted" integer DEFAULT 0,
	"best_performing_channels" text[],
	"avg_time_to_screen" text,
	"delays_or_bottlenecks" text,
	"concerns_or_escalations" text,
	"support_needed" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recruiter_weekly_checkin" ADD CONSTRAINT "recruiter_weekly_checkin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;