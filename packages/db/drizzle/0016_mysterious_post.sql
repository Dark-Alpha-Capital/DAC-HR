CREATE TABLE "document_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "document_category_relations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "hire_level" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."hire_level";--> statement-breakpoint
CREATE TYPE "public"."hire_level" AS ENUM('managing-director', 'vice-president', 'associate', 'analyst', 'intern');--> statement-breakpoint
ALTER TABLE "position" ALTER COLUMN "hire_level" SET DATA TYPE "public"."hire_level" USING "hire_level"::"public"."hire_level";--> statement-breakpoint
ALTER TABLE "document_category_relations" ADD CONSTRAINT "document_category_relations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_category_relations" ADD CONSTRAINT "document_category_relations_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE cascade ON UPDATE no action;