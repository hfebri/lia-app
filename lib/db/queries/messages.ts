import { eq, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { messages, conversations, users } from "../../../db/schema";
import type {
  Message,
  NewMessage,
  MessageRole,
  PaginationParams,
} from "../../../db/types";

// Get message by ID
export async function getMessageById(id: string): Promise<Message | null> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);
  return result[0] || null;
}

// Get messages by conversation ID
export async function getMessagesByConversationId(
  conversationId: string,
  params: PaginationParams = {}
): Promise<{
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, sortOrder = "asc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(messages.createdAt) : desc(messages.createdAt);

  const [messageList, totalCount] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.conversationId, conversationId)),
  ]);

  return {
    messages: messageList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Create new message
export async function createMessage(messageData: NewMessage): Promise<Message> {
  const result = await db
    .insert(messages)
    .values({
      ...messageData,
      createdAt: new Date(),
    })
    .returning();
  return result[0];
}

// Update message
export async function updateMessage(
  id: string,
  messageData: Partial<NewMessage>
): Promise<Message | null> {
  const result = await db
    .update(messages)
    .set(messageData)
    .where(eq(messages.id, id))
    .returning();
  return result[0] || null;
}

// Delete message
export async function deleteMessage(id: string): Promise<boolean> {
  const result = await db
    .delete(messages)
    .where(eq(messages.id, id))
    .returning();
  return result.length > 0;
}

// Delete all messages in a conversation
export async function deleteMessagesByConversationId(
  conversationId: string
): Promise<number> {
  const result = await db
    .delete(messages)
    .where(eq(messages.conversationId, conversationId))
    .returning();
  return result.length;
}

// Get latest message in conversation
export async function getLatestMessageInConversation(
  conversationId: string
): Promise<Message | null> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return result[0] || null;
}

// Get messages count by conversation
export async function getMessagesCountByConversation(
  conversationId: string
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return result[0].count;
}

// Get messages count by user
export async function getMessagesCountByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.userId, userId));
  return result[0].count;
}

// Get user messages by role
export async function getMessagesByUserAndRole(
  userId: string,
  role: MessageRole,
  params: PaginationParams = {}
): Promise<{
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;

  const [messageList, totalCount] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.role, role)))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.role, role))),
  ]);

  return {
    messages: messageList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Search messages by content
export async function searchMessages(
  userId: string,
  searchTerm: string,
  params: PaginationParams = {}
): Promise<{
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [messageList, totalCount] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.userId, userId),
          sql`${messages.content} ILIKE ${"%" + searchTerm + "%"}`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.userId, userId),
          sql`${messages.content} ILIKE ${"%" + searchTerm + "%"}`
        )
      ),
  ]);

  return {
    messages: messageList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get conversation messages with context (includes user info)
export async function getConversationMessagesWithContext(
  conversationId: string
) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

// Get recent messages across all users (for admin)
export async function getRecentMessages(
  limit: number = 50
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

// Get token usage statistics for a user
export async function getTokenUsageByUser(
  userId: string
): Promise<{ totalTokens: number; messageCount: number }> {
  const result = await db
    .select({
      messageCount: count(),
      // Note: This would need custom aggregation for JSON token data
      // For now, we'll return 0 and implement token counting logic later
    })
    .from(messages)
    .where(eq(messages.userId, userId));

  return {
    totalTokens: 0, // Will be calculated from tokens JSONB field
    messageCount: result[0].messageCount,
  };
}

// Create multiple messages (batch insert)
export async function createMessages(
  messagesData: NewMessage[]
): Promise<Message[]> {
  if (messagesData.length === 0) return [];

  const result = await db
    .insert(messages)
    .values(
      messagesData.map((data) => ({
        ...data,
        createdAt: new Date(),
      }))
    )
    .returning();

  return result;
}
