ALTER TABLE `interview` ADD `mode` text NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE `interview` DROP COLUMN `proceed_to_next_round`;
--> statement-breakpoint
CREATE UNIQUE INDEX `app_candidate_position_unique` ON `application` (`candidate_id`, `position_id`);
--> statement-breakpoint
ALTER TABLE `interview_session` ADD `interview_id` text REFERENCES `interview`(`id`) ON DELETE CASCADE;
