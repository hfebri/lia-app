ALTER TABLE "conversations" ALTER COLUMN "ai_model" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "ai_model" SET DEFAULT 'gpt-5';