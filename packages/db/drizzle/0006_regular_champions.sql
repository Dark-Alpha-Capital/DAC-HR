ALTER TABLE "documents" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_slug_unique" UNIQUE("slug");