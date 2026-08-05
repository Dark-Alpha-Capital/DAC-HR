CREATE TABLE `candidate_checklist_item` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`label` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `screener` ADD `position_id` text REFERENCES position(id);--> statement-breakpoint
CREATE UNIQUE INDEX `screener_position_unique` ON `screener` (`position_id`);