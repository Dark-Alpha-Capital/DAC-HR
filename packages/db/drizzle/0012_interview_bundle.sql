CREATE TABLE `interview_bundle` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`application_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_bundle_token_unique` ON `interview_bundle` (`token`);--> statement-breakpoint
ALTER TABLE `interview_session` ADD `bundle_id` text REFERENCES `interview_bundle`(`id`) ON UPDATE no action ON DELETE cascade;--> statement-breakpoint
CREATE TABLE `interview_bundle_round` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_id` text NOT NULL,
	`round_id` text NOT NULL,
	`round_order` integer NOT NULL,
	`delivery_mode` text NOT NULL,
	`interview_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`bundle_id`) REFERENCES `interview_bundle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interview_id`) REFERENCES `interview`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_bundle_round_unique` ON `interview_bundle_round` (`bundle_id`,`round_id`);
