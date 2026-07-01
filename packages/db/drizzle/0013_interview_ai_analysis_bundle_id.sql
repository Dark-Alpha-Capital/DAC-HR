ALTER TABLE `interview_ai_analysis` ADD `bundle_id` text REFERENCES `interview_bundle`(`id`) ON UPDATE no action ON DELETE cascade;
