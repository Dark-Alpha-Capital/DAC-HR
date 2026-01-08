CREATE TABLE "interview_ai_analysis" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" text NOT NULL,
	"application_id" text,
	"position_id" text,
	"analysis" text NOT NULL,
	"structured_data" json,
	"custom_prompt" text,
	"model" text DEFAULT 'gemini-2.5-flash',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_ai_analysis" ADD CONSTRAINT "interview_ai_analysis_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_ai_analysis" ADD CONSTRAINT "interview_ai_analysis_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_ai_analysis" ADD CONSTRAINT "interview_ai_analysis_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE set null ON UPDATE no action;