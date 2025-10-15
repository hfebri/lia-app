-- Fresh migration for new Supabase database
-- This combines all migrations into a clean schema

-- Create ENUM types
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');

-- Create users table
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) UNIQUE NOT NULL,
	"name" varchar(100),
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create conversations table (with messages as JSONB)
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"ai_model" varchar(100) DEFAULT 'gpt-4' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create files table
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"filename" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create analytics table
CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb,
	"session_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

-- Create daily_metrics table
CREATE TABLE "daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"total_users" integer DEFAULT 0 NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"total_conversations" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"total_tokens_used" integer DEFAULT 0 NOT NULL,
	"popular_topics" jsonb,
	"model_usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "files" ADD CONSTRAINT "files_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

-- Create indexes
CREATE INDEX "user_email_idx" ON "users"("email");
CREATE INDEX "conversations_user_idx" ON "conversations"("user_id");
CREATE INDEX "files_user_idx" ON "files"("user_id");
CREATE INDEX "files_conversation_idx" ON "files"("conversation_id");
CREATE INDEX "analytics_user_idx" ON "analytics"("user_id");
CREATE INDEX "analytics_timestamp_idx" ON "analytics"("timestamp");
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");
