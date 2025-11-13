CREATE TYPE "public"."candidate_document_category" AS ENUM('resume', 'cover-letter', 'portfolio', 'other');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;