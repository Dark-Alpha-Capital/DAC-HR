PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_interview` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`position_round_template_id` text NOT NULL,
	`interviewer_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rating` integer,
	`scheduled_at` integer,
	`overall_feedback` text,
	`created_at` integer NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_round_template_id`) REFERENCES `position_round_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_interview`("id", "application_id", "position_round_template_id", "interviewer_id", "status", "rating", "scheduled_at", "overall_feedback", "created_at", "mode") SELECT "id", "application_id", "position_round_template_id", "interviewer_id", "status", "rating", "scheduled_at", "overall_feedback", "created_at", "mode" FROM `interview`;
--> statement-breakpoint
DROP TABLE `interview`;
--> statement-breakpoint
ALTER TABLE `__new_interview` RENAME TO `interview`;
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_round_unique` ON `interview` (`application_id`,`position_round_template_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
