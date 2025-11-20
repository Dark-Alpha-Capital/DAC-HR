ALTER TYPE "public"."interview_status" ADD VALUE 'scheduled';--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "candidate_onboarding" ADD CONSTRAINT "candidate_onboarding_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_onboarding" ADD CONSTRAINT "candidate_onboarding_signed_contract_document_id_candidate_document_id_fk" FOREIGN KEY ("signed_contract_document_id") REFERENCES "public"."candidate_document"("id") ON DELETE set null ON UPDATE no action;