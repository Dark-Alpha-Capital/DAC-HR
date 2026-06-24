CREATE TABLE `candidate_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`school` text,
	`major` text,
	`graduation_year` integer,
	`linkedin_url` text,
	`resume_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_profile_candidate_id_unique` ON `candidate_profile` (`candidate_id`);
--> statement-breakpoint
CREATE TABLE `candidate_import` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`uploaded_by` text NOT NULL,
	`original_file_url` text NOT NULL,
	`position_id` text,
	`duplicate_policy` text DEFAULT 'skip' NOT NULL,
	`total_candidates` integer DEFAULT 0 NOT NULL,
	`processed_candidates` integer DEFAULT 0 NOT NULL,
	`failed_candidates` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `candidate_import_row` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`row_index` integer NOT NULL,
	`candidate_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `candidate_import`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_import_row_unique` ON `candidate_import_row` (`import_id`,`row_index`);
