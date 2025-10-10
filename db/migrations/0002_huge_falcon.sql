-- Migration: Add messages column to conversations table
-- This migration consolidates the separate messages table into a JSONB column
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "messages" jsonb DEFAULT '[]'::jsonb NOT NULL;