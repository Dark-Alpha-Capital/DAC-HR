CREATE TABLE `contract` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`application_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`position_id` text NOT NULL,
	`template_id` text,
	`template_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`subject` text,
	`custom_message` text,
	`variables` text,
	`body_text` text,
	`doc_url` text,
	`doc_path` text,
	`expires_at` integer,
	`sent_at` integer,
	`opened_at` integer,
	`receipt_affirmed_at` integer,
	`declined_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `contract_template`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_token_unique` ON `contract` (`token`);--> statement-breakpoint
CREATE INDEX `contract_application_idx` ON `contract` (`application_id`);--> statement-breakpoint
CREATE INDEX `contract_status_idx` ON `contract` (`status`);--> statement-breakpoint
CREATE INDEX `contract_candidate_idx` ON `contract` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `contract_template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position_id` text,
	`hire_level` text,
	`body_template` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `contract_template_position_idx` ON `contract_template` (`position_id`);--> statement-breakpoint
ALTER TABLE `interview_session` ADD `opened_at` integer;