ALTER TABLE "templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "templates" CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "template_id";