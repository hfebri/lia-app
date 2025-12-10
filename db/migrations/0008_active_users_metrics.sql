-- Create user_sessions table for real-time activity tracking
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"device_type" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint

-- Add foreign key constraint from user_sessions to users
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add indexes to user_sessions for performance
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_last_seen_at_idx" ON "user_sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_last_seen_idx" ON "user_sessions" USING btree ("user_id","last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_session_id_idx" ON "user_sessions" USING btree ("session_id");--> statement-breakpoint

-- Add active user metrics columns to daily_metrics
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "real_time_active_users" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "daily_active_users" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "weekly_active_users" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "monthly_active_users" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Deduplicate daily_metrics before adding unique constraint
-- Keep the most recent record per date (by created_at, then id for ties)
WITH ranked_metrics AS (
  SELECT id, date,
    ROW_NUMBER() OVER (PARTITION BY date ORDER BY created_at DESC, id DESC) AS row_num
  FROM daily_metrics
)
DELETE FROM daily_metrics dm
USING ranked_metrics rm
WHERE dm.id = rm.id
  AND rm.row_num > 1;--> statement-breakpoint

-- Add unique constraint on date to prevent duplicate daily snapshots
-- Use DO block to handle case where constraint already exists
DO $$ BEGIN
  ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_date_unique" UNIQUE("date");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Add indexes to conversations for performance
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_user_id_updated_at_idx" ON "conversations" USING btree ("user_id","updated_at");
