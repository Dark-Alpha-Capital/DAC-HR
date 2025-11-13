CREATE TYPE "public"."document_category" AS ENUM('job-description', 'onboarding', 'policy', 'hr-form', 'other');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"url" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
