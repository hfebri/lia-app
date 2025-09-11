#!/usr/bin/env npx tsx

/**
 * Migration script to update all conversations using 'gpt-3.5-turbo' to 'openai/gpt-5'
 * This fixes the model references to match the available models in the system.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { conversations } from "../db/schema/conversations";

async function main() {
  // Database connection
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🔧 Starting model reference migration...");
  
  try {
    // Create database connection
    const connection = postgres(connectionString);
    const db = drizzle(connection);

    // First, check how many conversations need updating
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.aiModel, "gpt-3.5-turbo"));
    
    const totalToUpdate = countResult[0]?.count ?? 0;
    
    if (totalToUpdate === 0) {
      console.log("✅ No conversations found with 'gpt-3.5-turbo' model");
      await connection.end();
      return;
    }
    
    console.log(`📊 Found ${totalToUpdate} conversations using 'gpt-3.5-turbo'`);
    console.log("🔄 Updating them to 'openai/gpt-5'...");

    // Update all conversations with gpt-3.5-turbo to openai/gpt-5
    const updateResult = await db
      .update(conversations)
      .set({
        aiModel: "openai/gpt-5",
        updatedAt: new Date()
      })
      .where(eq(conversations.aiModel, "gpt-3.5-turbo"))
      .returning({ id: conversations.id });

    console.log(`✅ Successfully updated ${updateResult.length} conversations`);
    console.log("🔍 Updated conversation IDs:", updateResult.map(r => r.id));

    // Verify the update
    const verifyResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.aiModel, "gpt-3.5-turbo"));
    
    const remainingOldRefs = verifyResult[0]?.count ?? 0;
    
    if (remainingOldRefs === 0) {
      console.log("✅ Migration completed successfully - no 'gpt-3.5-turbo' references remain");
    } else {
      console.warn(`⚠️  Warning: ${remainingOldRefs} conversations still have 'gpt-3.5-turbo' model`);
    }

    await connection.end();
    console.log("🎉 Migration script completed");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});