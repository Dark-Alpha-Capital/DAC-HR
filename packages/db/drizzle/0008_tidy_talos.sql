ALTER TABLE "employee" ALTER COLUMN "department" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "department" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."department";--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('management', 'capital-markets', 'deal-team', 'legal', 'operations', 'origination', 'pipe', 'public-markets');--> statement-breakpoint
ALTER TABLE "employee" ALTER COLUMN "department" SET DATA TYPE "public"."department"[] USING "department"::"public"."department"[];--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "department" SET DATA TYPE "public"."department"[] USING "department"::"public"."department"[];--> statement-breakpoint
ALTER TABLE "employee" ALTER COLUMN "department" SET DATA TYPE "public"."department"[] USING "department"::text::"public"."department"[];--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "department" SET DATA TYPE "public"."department"[] USING "department"::text::"public"."department"[];