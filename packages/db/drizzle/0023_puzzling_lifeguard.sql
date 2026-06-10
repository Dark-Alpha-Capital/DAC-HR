ALTER TABLE "interview" ADD COLUMN "link_token" text;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "link_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "candidate_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "candidate_submitted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_position_unique" ON "candidate_position" USING btree ("candidate_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_round_unique" ON "interview" USING btree ("application_id","position_round_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_feedback_unique" ON "interview_feedback" USING btree ("interview_id","question_id");--> statement-breakpoint
ALTER TABLE "candidate_onboarding" ADD CONSTRAINT "candidate_onboarding_candidate_id_unique" UNIQUE("candidate_id");--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_link_token_unique" UNIQUE("link_token");