CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated', 'resigned');--> statement-breakpoint
CREATE TABLE "employee" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"location" text,
	"employee_id" text,
	"acceptance_date" timestamp,
	"start_date" timestamp NOT NULL,
	"salary" integer,
	"department" text,
	"position" text NOT NULL,
	"manager_id" text,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_email_unique" UNIQUE("email"),
	CONSTRAINT "employee_employee_id_unique" UNIQUE("employee_id")
);--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_manager_id_employee_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_bank" DROP COLUMN "question_type";