ALTER TABLE "productivity_snapshots" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_productivity_metrics" ALTER COLUMN "user_id" SET DATA TYPE uuid;