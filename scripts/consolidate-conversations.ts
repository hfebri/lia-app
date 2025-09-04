#!/usr/bin/env tsx

import { db } from "../db/db";
import { conversations, messages } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

interface ConversationData {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  messageCount: number;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>;
}

async function consolidateConversations() {
  console.log("🔄 Starting conversation consolidation...");

  try {
    // Get all conversations with their messages
    const allConversations = await db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .orderBy(desc(conversations.createdAt));

    console.log(`📊 Found ${allConversations.length} total conversations`);

    // Group conversations by user
    const conversationsByUser = new Map<string, ConversationData[]>();

    for (const conv of allConversations) {
      if (!conversationsByUser.has(conv.userId)) {
        conversationsByUser.set(conv.userId, []);
      }

      // Get messages for this conversation
      const convMessages = await db
        .select({
          id: messages.id,
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(messages.createdAt);

      const conversationData: ConversationData = {
        id: conv.id,
        userId: conv.userId,
        title: conv.title,
        createdAt: conv.createdAt,
        messageCount: convMessages.length,
        messages: convMessages.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
        })),
      };

      conversationsByUser.get(conv.userId)!.push(conversationData);
    }

    console.log(`👥 Processing ${conversationsByUser.size} users`);

    let totalMerged = 0;
    let totalDeleted = 0;

    // Process each user's conversations
    for (const [userId, userConversations] of conversationsByUser) {
      console.log(`\n🔍 Processing user ${userId} with ${userConversations.length} conversations`);

      // Sort conversations by creation time
      userConversations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Group conversations that should be merged (within 30 minutes of each other)
      const conversationGroups: ConversationData[][] = [];
      let currentGroup: ConversationData[] = [];

      for (let i = 0; i < userConversations.length; i++) {
        const conversation = userConversations[i];

        // If this is the first conversation or it's within 30 minutes of the last one in current group
        if (currentGroup.length === 0) {
          currentGroup.push(conversation);
        } else {
          const lastConversation = currentGroup[currentGroup.length - 1];
          const timeDifference = conversation.createdAt.getTime() - lastConversation.createdAt.getTime();
          const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

          if (timeDifference <= thirtyMinutes) {
            // Add to current group
            currentGroup.push(conversation);
          } else {
            // Start a new group
            conversationGroups.push([...currentGroup]);
            currentGroup = [conversation];
          }
        }
      }

      // Don't forget the last group
      if (currentGroup.length > 0) {
        conversationGroups.push(currentGroup);
      }

      // Process each group
      for (const group of conversationGroups) {
        if (group.length > 1) {
          console.log(`  🔗 Merging ${group.length} conversations`);

          // Find the conversation with the most messages (or first one if tie)
          const primaryConversation = group.reduce((prev, current) => 
            current.messageCount > prev.messageCount ? current : prev
          );

          // Create a better title from the first user message
          const allMessages = group.flatMap(conv => conv.messages).sort((a, b) => 
            a.createdAt.getTime() - b.createdAt.getTime()
          );
          
          const firstUserMessage = allMessages.find(msg => msg.role === "user");
          const newTitle = firstUserMessage 
            ? (firstUserMessage.content.length > 50 
                ? firstUserMessage.content.slice(0, 47) + "..." 
                : firstUserMessage.content)
            : "Merged Conversation";

          // Update primary conversation title
          await db
            .update(conversations)
            .set({ 
              title: newTitle,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, primaryConversation.id));

          // Move all messages from other conversations to the primary one
          const conversationsToDelete = group.filter(conv => conv.id !== primaryConversation.id);
          
          for (const convToDelete of conversationsToDelete) {
            // Move messages to primary conversation
            await db
              .update(messages)
              .set({ conversationId: primaryConversation.id })
              .where(eq(messages.conversationId, convToDelete.id));

            // Delete the empty conversation
            await db
              .delete(conversations)
              .where(eq(conversations.id, convToDelete.id));

            totalDeleted++;
          }

          totalMerged++;
          console.log(`    ✅ Merged into "${newTitle}"`);
        }
      }
    }

    console.log(`\n🎉 Consolidation complete!`);
    console.log(`📈 ${totalMerged} conversation groups merged`);
    console.log(`🗑️ ${totalDeleted} duplicate conversations deleted`);

    // Final stats
    const finalConversationCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations);
    
    console.log(`📊 Final conversation count: ${finalConversationCount[0].count}`);

  } catch (error) {
    console.error("❌ Error during consolidation:", error);
    process.exit(1);
  }
}

// Run the script
consolidateConversations()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });