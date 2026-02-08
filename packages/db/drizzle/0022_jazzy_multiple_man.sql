CREATE TYPE "public"."bulk_resume_batch_status" AS ENUM('pending', 'processing', 'completed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."bulk_resume_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "bulk_resume_upload_batch" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"total_count" integer NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" "bulk_resume_batch_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_resume_upload_job" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" text NOT NULL,
	"job_index" integer NOT NULL,
	"file_name" text NOT NULL,
	"status" "bulk_resume_job_status" DEFAULT 'pending' NOT NULL,
	"candidate_id" text,
	"error_message" text,
	"bullmq_job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bulk_resume_upload_batch" ADD CONSTRAINT "bulk_resume_upload_batch_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_resume_upload_job" ADD CONSTRAINT "bulk_resume_upload_job_batch_id_bulk_resume_upload_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."bulk_resume_upload_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_resume_upload_job" ADD CONSTRAINT "bulk_resume_upload_job_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE set null ON UPDATE no action;