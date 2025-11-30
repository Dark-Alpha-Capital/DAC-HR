DO $$ BEGIN
 CREATE TYPE "public"."application_status" AS ENUM('pending', 'reviewed', 'shortlisted', 'interviewing', 'hired', 'rejected', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."candidate_document_category" AS ENUM('resume', 'cover-letter', 'portfolio', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."department" AS ENUM('engineering', 'product', 'sales', 'marketing', 'hr', 'finance', 'operations', 'legal', 'customer-support', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_category" AS ENUM('job-description', 'onboarding', 'policy', 'hr-form', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."interview_status" AS ENUM('pending', 'move_forward', 'rejected', 'scheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "application" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"position_id" text NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "candidate" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"location" text,
	"resume_url" text,
	"cover_letter_url" text,
	"portfolio_url" text,
	"source" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "candidate_document" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "candidate_document_category" DEFAULT 'other' NOT NULL,
	"url" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "candidate_onboarding" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"contract_signed" boolean DEFAULT false NOT NULL,
	"signed_contract_document_id" text,
	"contract_signed_at" timestamp,
	"email_provided" boolean DEFAULT false NOT NULL,
	"email_registered_at" timestamp,
	"onboarding_packet_sent" boolean DEFAULT false NOT NULL,
	"onboarding_packet_sent_at" timestamp,
	"company_email_activate" boolean DEFAULT false NOT NULL,
	"company_email_activate_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "candidate_position" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"position_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"url" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_slug_unique" UNIQUE("slug")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "employee" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"department" "department" NOT NULL,
	"position_id" text,
	"profile_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "interview" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" text NOT NULL,
	"position_round_template_id" text NOT NULL,
	"interviewer_id" text NOT NULL,
	"status" "interview_status" DEFAULT 'pending' NOT NULL,
	"rating" integer,
	"scheduled_at" timestamp,
	"overall_feedback" text,
	"proceed_to_next_round" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "interview_feedback" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" text NOT NULL,
	"question_id" text NOT NULL,
	"notes" text,
	"rating" integer
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "position" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "position_slug_unique" UNIQUE("slug")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "position_round_templates" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" text NOT NULL,
	"round_template_id" text NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "question_bank" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "round_template" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "round_template_name_unique" UNIQUE("name")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "round_template_questions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_template_id" text NOT NULL,
	"question_id" text NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application" ADD CONSTRAINT "application_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application" ADD CONSTRAINT "application_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_onboarding" ADD CONSTRAINT "candidate_onboarding_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_onboarding" ADD CONSTRAINT "candidate_onboarding_signed_contract_document_id_candidate_document_id_fk" FOREIGN KEY ("signed_contract_document_id") REFERENCES "public"."candidate_document"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_position" ADD CONSTRAINT "candidate_position_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_position" ADD CONSTRAINT "candidate_position_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee" ADD CONSTRAINT "employee_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview" ADD CONSTRAINT "interview_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview" ADD CONSTRAINT "interview_position_round_template_id_position_round_templates_id_fk" FOREIGN KEY ("position_round_template_id") REFERENCES "public"."position_round_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview" ADD CONSTRAINT "interview_interviewer_id_user_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "position_round_templates" ADD CONSTRAINT "position_round_templates_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "position_round_templates" ADD CONSTRAINT "position_round_templates_round_template_id_round_template_id_fk" FOREIGN KEY ("round_template_id") REFERENCES "public"."round_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "round_template_questions" ADD CONSTRAINT "round_template_questions_round_template_id_round_template_id_fk" FOREIGN KEY ("round_template_id") REFERENCES "public"."round_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "round_template_questions" ADD CONSTRAINT "round_template_questions_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;