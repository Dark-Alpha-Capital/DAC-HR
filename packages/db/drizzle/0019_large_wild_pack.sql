PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_candidate_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`contract_signed` integer DEFAULT false NOT NULL,
	`email_provided` integer DEFAULT false NOT NULL,
	`onboarding_packet_sent` integer DEFAULT false NOT NULL,
	`company_email_activate` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_candidate_onboarding`("id", "candidate_id", "contract_signed", "email_provided", "onboarding_packet_sent", "company_email_activate", "created_at", "updated_at") SELECT "id", "candidate_id", "contract_signed", "email_provided", "onboarding_packet_sent", "company_email_activate", "created_at", "updated_at" FROM `candidate_onboarding`;--> statement-breakpoint
DROP TABLE `candidate_onboarding`;--> statement-breakpoint
ALTER TABLE `__new_candidate_onboarding` RENAME TO `candidate_onboarding`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_onboarding_candidate_id_unique` ON `candidate_onboarding` (`candidate_id`);--> statement-breakpoint
ALTER TABLE `documents` DROP COLUMN `category`;