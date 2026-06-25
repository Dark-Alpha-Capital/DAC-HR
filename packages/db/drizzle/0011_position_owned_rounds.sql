ALTER TABLE `round_template` ADD `position_id` text REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `interview` ADD `round_id` text REFERENCES `round_template`(`id`) ON UPDATE no action ON DELETE cascade;
