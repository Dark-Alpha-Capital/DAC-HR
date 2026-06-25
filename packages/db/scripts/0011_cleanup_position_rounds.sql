PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_interview` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`round_id` text NOT NULL,
	`interviewer_id` text,
	`mode` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rating` integer,
	`scheduled_at` integer,
	`overall_feedback` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_interview`("id", "application_id", "round_id", "interviewer_id", "mode", "status", "rating", "scheduled_at", "overall_feedback", "created_at") SELECT "id", "application_id", "round_id", "interviewer_id", "mode", "status", "rating", "scheduled_at", "overall_feedback", "created_at" FROM `interview` WHERE "round_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `interview`;--> statement-breakpoint
ALTER TABLE `__new_interview` RENAME TO `interview`;--> statement-breakpoint
DROP TABLE `position_round_templates`;--> statement-breakpoint
CREATE TABLE `__new_round_template` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_round_template`("id", "position_id", "name", "description", "created_at", "updated_at") SELECT "id", "position_id", "name", "description", "created_at", "updated_at" FROM `round_template` WHERE "position_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `round_template`;--> statement-breakpoint
ALTER TABLE `__new_round_template` RENAME TO `round_template`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
