CREATE TYPE "public"."ai_analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_skill_category" AS ENUM('technical', 'soft', 'domain', 'language', 'tool', 'other');--> statement-breakpoint
CREATE TYPE "public"."ai_skill_proficiency" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TABLE "ai_analysis" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" text NOT NULL,
	"parsed_resume" text,
	"parsed_cover_letter" text,
	"skills_extracted" text[],
	"experience_years" integer,
	"education_level" text,
	"overall_score" integer,
	"skills_match_score" integer,
	"experience_match_score" integer,
	"culture_fit_score" integer,
	"summary" text,
	"strengths" text[],
	"concerns" text[],
	"detailed_report" text,
	"sentiment_score" integer,
	"enthusiasm" text,
	"model_used" text DEFAULT 'claude-sonnet-4-5',
	"tokens_used" integer,
	"processing_time_ms" integer,
	"status" "ai_analysis_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_position_ranking" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" text NOT NULL,
	"rankings" text,
	"total_candidates" integer NOT NULL,
	"top_candidate_ids" text[],
	"cohort_insights" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_skill" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"category" "ai_skill_category",
	"proficiency_level" "ai_skill_proficiency",
	"years_of_experience" integer,
	"is_required_for_position" boolean DEFAULT false,
	"match_score" integer,
	"source" text,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_position_ranking" ADD CONSTRAINT "ai_position_ranking_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skill" ADD CONSTRAINT "ai_skill_analysis_id_ai_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_analysis"("id") ON DELETE cascade ON UPDATE no action;