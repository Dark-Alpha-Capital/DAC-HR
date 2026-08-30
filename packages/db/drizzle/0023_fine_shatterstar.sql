CREATE TABLE `email_template` (
	`type` text PRIMARY KEY NOT NULL,
	`subject_template` text NOT NULL,
	`body_template` text NOT NULL,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
