DROP TABLE `attendance`;
--> statement-breakpoint
DROP TABLE `holiday`;
--> statement-breakpoint
CREATE TABLE `meet_conference` (
	`id` text PRIMARY KEY NOT NULL,
	`google_resource_name` text NOT NULL,
	`title` text NOT NULL,
	`meeting_code` text,
	`space_name` text,
	`starts_at` integer,
	`ends_at` integer,
	`attendance_date` text NOT NULL,
	`synced_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`synced_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meet_conference_attendance_date_idx` ON `meet_conference` (`attendance_date`);
--> statement-breakpoint
CREATE TABLE `meet_attendee` (
	`id` text PRIMARY KEY NOT NULL,
	`conference_id` text NOT NULL,
	`display_name` text NOT NULL,
	`google_user_id` text,
	`kind` text DEFAULT 'unknown' NOT NULL,
	`joined_at` integer,
	`left_at` integer,
	`duration_ms` integer,
	`dedupe_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conference_id`) REFERENCES `meet_conference`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meet_attendee_conference_dedupe_uidx` ON `meet_attendee` (`conference_id`,`dedupe_key`);
