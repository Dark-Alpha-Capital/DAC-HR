CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`prismic_uid` text NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`check_in_time` text,
	`check_out_time` text,
	`notes` text,
	`marked_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`marked_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_unique` ON `attendance` (`prismic_uid`,`date`);
