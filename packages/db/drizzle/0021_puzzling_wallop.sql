CREATE TABLE `side_effect_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`dispatched_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `side_effect_outbox_dedupe_key_unique` ON `side_effect_outbox` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `side_effect_outbox_status_idx` ON `side_effect_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `side_effect_outbox_created_at_idx` ON `side_effect_outbox` (`created_at`);