CREATE TYPE "public"."hire_level" AS ENUM('managing-director', 'vice-president', 'associate-analyst', 'intern');--> statement-breakpoint
ALTER TABLE "position" ADD COLUMN "hire_level" "hire_level";