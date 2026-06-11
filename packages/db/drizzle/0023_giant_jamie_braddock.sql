CREATE TYPE "public"."interview_evaluation_recommendation" AS ENUM('strong_hire', 'hire', 'maybe', 'reject');--> statement-breakpoint
CREATE TYPE "public"."interview_session_status" AS ENUM('pending', 'invited', 'in_progress', 'completed', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."question_category" AS ENUM('screening', 'technical', 'behavioral');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('text', 'video', 'audio', 'mcq');--> statement-breakpoint
CREATE TABLE "interview_evaluation" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"score" integer,
	"recommendation" "interview_evaluation_recommendation",
	"summary" text,
	"strengths" json,
	"risks" json,
	"dimension_scores" json,
	"per_question_feedback" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_evaluation_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "interview_response" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"answer_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_session" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"application_id" text NOT NULL,
	"round_id" text NOT NULL,
	"status" "interview_session_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"tab_switches" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "question_type" "question_type" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "question_category" "question_category";--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "time_limit_seconds" integer;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "order_index" integer;--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "interview_evaluation_session_id_interview_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_response" ADD CONSTRAINT "interview_response_session_id_interview_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_response" ADD CONSTRAINT "interview_response_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_round_id_round_template_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_response_unique" ON "interview_response" USING btree ("session_id","question_id");
