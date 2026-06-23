ALTER TABLE `interview_session` ADD `delivery_mode` text DEFAULT 'hybrid' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `agent_config` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `realtime_session_id` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `cheating_summary` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `session_audio_url` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `interrupted_at` integer;--> statement-breakpoint
ALTER TABLE `interview_response` ADD `input_method` text;--> statement-breakpoint
ALTER TABLE `interview_response` ADD `audio_url` text;--> statement-breakpoint
ALTER TABLE `interview_response` ADD `transcript` text;--> statement-breakpoint
ALTER TABLE `interview_response` ADD `transcript_confidence` real;--> statement-breakpoint
ALTER TABLE `interview_response` ADD `realtime_event_id` text;--> statement-breakpoint
CREATE TABLE `cheating_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`metadata` text,
	FOREIGN KEY (`session_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cheating_event_session_timestamp_idx` ON `cheating_event` (`session_id`,`timestamp`);
