#!/usr/bin/env tsx

/**
 * Migration script to update user IDs in conversations and messages
 * from mock test ID to actual user ID
 *
 * Usage: npx tsx scripts/migrate-user-id.ts
 */

import { db } from "../db/db";
import { conversations, messages, files } from "../db/schema";
import { eq } from "drizzle-orm";

const OLD_USER_ID = "12345678-1234-1234-1234-123456789abc"; // Mock user ID
const NEW_USER_ID = "5e771bf0-1721-4216-9517-45fc90089720"; // Your actual user ID

async function migrateUserIds() {
  console.log("🔄 Starting user ID migration...");
  console.log(`📝 Changing from: ${OLD_USER_ID}`);
  console.log(`📝 Changing to: ${NEW_USER_ID}`);

  try {
    // First, let's check what data exists
    console.log("\n📊 Checking existing data...");

    const existingConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, OLD_USER_ID));

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, OLD_USER_ID));

    const existingFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, OLD_USER_ID));

    console.log(
      `📈 Found ${existingConversations.length} conversations with old user ID`
    );
    console.log(
      `📈 Found ${existingMessages.length} messages with old user ID`
    );
    console.log(`📈 Found ${existingFiles.length} files with old user ID`);

    if (
      existingConversations.length === 0 &&
      existingMessages.length === 0 &&
      existingFiles.length === 0
    ) {
      console.log("✅ No data to migrate. Migration complete!");
      return;
    }

    // Update conversations
    if (existingConversations.length > 0) {
      console.log(
        `\n🔄 Updating ${existingConversations.length} conversations...`
      );

      const conversationResult = await db
        .update(conversations)
        .set({ userId: NEW_USER_ID })
        .where(eq(conversations.userId, OLD_USER_ID))
        .returning({ id: conversations.id });

      console.log(`✅ Updated ${conversationResult.length} conversations`);
    }

    // Update messages
    if (existingMessages.length > 0) {
      console.log(`\n🔄 Updating ${existingMessages.length} messages...`);

      const messageResult = await db
        .update(messages)
        .set({ userId: NEW_USER_ID })
        .where(eq(messages.userId, OLD_USER_ID))
        .returning({ id: messages.id });

      console.log(`✅ Updated ${messageResult.length} messages`);
    }

    // Update files
    if (existingFiles.length > 0) {
      console.log(`\n🔄 Updating ${existingFiles.length} files...`);

      const fileResult = await db
        .update(files)
        .set({ userId: NEW_USER_ID })
        .where(eq(files.userId, OLD_USER_ID))
        .returning({ id: files.id });

      console.log(`✅ Updated ${fileResult.length} files`);
    }

    // Verify the migration
    console.log("\n🔍 Verifying migration...");

    const remainingConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, OLD_USER_ID));

    const remainingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, OLD_USER_ID));

    const newConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, NEW_USER_ID));

    const newMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, NEW_USER_ID));

    const remainingFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, OLD_USER_ID));

    const newFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, NEW_USER_ID));

    console.log(
      `📊 Remaining with old ID - Conversations: ${remainingConversations.length}, Messages: ${remainingMessages.length}, Files: ${remainingFiles.length}`
    );
    console.log(
      `📊 Now with new ID - Conversations: ${newConversations.length}, Messages: ${newMessages.length}, Files: ${newFiles.length}`
    );

    if (
      remainingConversations.length === 0 &&
      remainingMessages.length === 0 &&
      remainingFiles.length === 0
    ) {
      console.log("\n🎉 Migration completed successfully!");
      console.log(`✅ All data is now associated with user ID: ${NEW_USER_ID}`);
    } else {
      console.log("\n⚠️ Warning: Some data may not have been migrated");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration
migrateUserIds()
  .then(() => {
    console.log("\n🏁 Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
