ALTER TABLE "position" ALTER COLUMN "department" SET DATA TYPE "public"."department" USING "department"::text::"public"."department";--> statement-breakpoint
DROP TYPE "public"."position_department";