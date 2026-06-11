CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `application` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`position_id` text NOT NULL,
	`status` text DEFAULT 'ai_screening' NOT NULL,
	`personality` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`location` text,
	`source` text,
	`source_url` text,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_email_unique` ON `candidate` (`email`);--> statement-breakpoint
CREATE TABLE `candidate_ai_screening` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`position_id` text,
	`application_id` text,
	`analysis` text NOT NULL,
	`structured_data` text,
	`model` text DEFAULT 'gemini-2.5-flash',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `candidate_document` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'other' NOT NULL,
	`url` text NOT NULL,
	`tags` text,
	`file_search_document_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `candidate_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`contract_signed` integer DEFAULT false NOT NULL,
	`signed_contract_document_id` text,
	`contract_signed_at` integer,
	`email_provided` integer DEFAULT false NOT NULL,
	`email_registered_at` integer,
	`onboarding_packet_sent` integer DEFAULT false NOT NULL,
	`onboarding_packet_sent_at` integer,
	`company_email_activate` integer DEFAULT false NOT NULL,
	`company_email_activate_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`signed_contract_document_id`) REFERENCES `candidate_document`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_onboarding_candidate_id_unique` ON `candidate_onboarding` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `candidate_position` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`position_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_position_unique` ON `candidate_position` (`candidate_id`,`position_id`);--> statement-breakpoint
CREATE TABLE `document_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_categories_name_unique` ON `document_categories` (`name`);--> statement-breakpoint
CREATE TABLE `document_category_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `document_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'other' NOT NULL,
	`url` text NOT NULL,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_slug_unique` ON `documents` (`slug`);--> statement-breakpoint
CREATE TABLE `employee` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`department` text NOT NULL,
	`position_id` text,
	`profile_image` text,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `interview` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`position_round_template_id` text NOT NULL,
	`interviewer_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rating` integer,
	`scheduled_at` integer,
	`overall_feedback` text,
	`proceed_to_next_round` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_round_template_id`) REFERENCES `position_round_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_round_unique` ON `interview` (`application_id`,`position_round_template_id`);--> statement-breakpoint
CREATE TABLE `interview_ai_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`application_id` text,
	`position_id` text,
	`analysis` text NOT NULL,
	`structured_data` text,
	`custom_prompt` text,
	`model` text DEFAULT 'gemini-2.5-flash',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interview`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `interview_evaluation` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`score` integer,
	`recommendation` text,
	`summary` text,
	`strengths` text,
	`risks` text,
	`dimension_scores` text,
	`per_question_feedback` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_evaluation_session_id_unique` ON `interview_evaluation` (`session_id`);--> statement-breakpoint
CREATE TABLE `interview_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`question_id` text NOT NULL,
	`notes` text,
	`rating` integer,
	FOREIGN KEY (`interview_id`) REFERENCES `interview`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_feedback_unique` ON `interview_feedback` (`interview_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `interview_response` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_response_unique` ON `interview_response` (`session_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `interview_session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`application_id` text NOT NULL,
	`round_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`tab_switches` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_session_token_unique` ON `interview_session` (`token`);--> statement-breakpoint
CREATE TABLE `position` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`department` text,
	`hire_level` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `position_slug_unique` ON `position` (`slug`);--> statement-breakpoint
CREATE TABLE `position_round_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`round_template_id` text NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_template_id`) REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `question_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`question_text` text NOT NULL,
	`question_type` text DEFAULT 'text' NOT NULL,
	`question_category` text,
	`time_limit_seconds` integer,
	`order_index` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recruiter_weekly_checkin` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start_date` integer NOT NULL,
	`week_end_date` integer NOT NULL,
	`recruiter_name` text NOT NULL,
	`positions_worked` text,
	`candidates_sourced` integer DEFAULT 0,
	`candidates_screened` integer DEFAULT 0,
	`candidates_rejected` integer DEFAULT 0,
	`candidates_advanced_2nd_round` integer DEFAULT 0,
	`candidates_advanced_3rd_round` integer DEFAULT 0,
	`offers_extended` integer DEFAULT 0,
	`offers_accepted` integer DEFAULT 0,
	`best_performing_channels` text,
	`avg_time_to_screen` text,
	`delays_or_bottlenecks` text,
	`concerns_or_escalations` text,
	`support_needed` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `round_template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `round_template_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`round_template_id` text NOT NULL,
	`question_id` text NOT NULL,
	FOREIGN KEY (`round_template_id`) REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `question_bank`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
