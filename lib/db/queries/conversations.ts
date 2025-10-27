import { eq, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { conversations, users } from "../../../db/schema";
import type {
  Conversation,
  NewConversation,
  ConversationWithMessages,
  ConversationWithLastMessage,
  PaginationParams,
  Message,
  NewMessage,
} from "../../../db/types";

// Get conversation by ID
export async function getConversationById(
  id: string
): Promise<Conversation | null> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  return result[0] || null;
}

// Get conversation with messages (messages are now embedded)
export async function getConversationWithMessages(
  id: string
): Promise<ConversationWithMessages | null> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      user: true,
    },
  });

  return conversation || null;
}

// Get messages from a conversation
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) return [];

  const messages = conversation.messages as any;
  return Array.isArray(messages) ? messages : [];
}

// Add message to conversation
export async function addMessageToConversation(
  conversationId: string,
  message: NewMessage
): Promise<Conversation | null> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) return null;

  const existingMessages = (conversation.messages as any) || [];
  const newMessage: Message = {
    ...message,
    createdAt: message.createdAt || new Date().toISOString(),
  };

  const updatedMessages = [...existingMessages, newMessage];

  const result = await db
    .update(conversations)
    .set({
      messages: updatedMessages as any,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId))
    .returning();

  return result[0] || null;
}

// Add multiple messages to conversation (batch)
export async function addMessagesToConversation(
  conversationId: string,
  newMessages: NewMessage[]
): Promise<Conversation | null> {
  const conversation = await getConversationById(conversationId);
  if (!conversation) return null;

  const existingMessages = (conversation.messages as any) || [];
  const messagesToAdd: Message[] = newMessages.map((msg) => ({
    ...msg,
    createdAt: msg.createdAt || new Date().toISOString(),
  }));

  const updatedMessages = [...existingMessages, ...messagesToAdd];

  const result = await db
    .update(conversations)
    .set({
      messages: updatedMessages as any,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId))
    .returning();

  return result[0] || null;
}

// Replace all messages in conversation
export async function replaceConversationMessages(
  conversationId: string,
  newMessages: Message[]
): Promise<Conversation | null> {
  const result = await db
    .update(conversations)
    .set({
      messages: newMessages as any,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId))
    .returning();

  return result[0] || null;
}

// Get message count for a conversation
export async function getConversationMessageCount(
  conversationId: string
): Promise<number> {
  const messages = await getConversationMessages(conversationId);
  return messages.length;
}

// Create new conversation
export async function createConversation(
  conversationData: NewConversation
): Promise<Conversation> {
  const result = await db
    .insert(conversations)
    .values({
      ...conversationData,
      messages: conversationData.messages || ([] as any),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

// Update conversation
export async function updateConversation(
  id: string,
  conversationData: Partial<NewConversation>
): Promise<Conversation | null> {
  const result = await db
    .update(conversations)
    .set({
      ...conversationData,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();
  return result[0] || null;
}

// Delete conversation
export async function deleteConversation(id: string): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  return result.length > 0;
}

// Get conversations by user ID with pagination
export async function getConversationsByUserId(
  userId: string,
  params: PaginationParams = {}
) {
  const {
    page = 1,
    limit = 20,
    sortBy = "updatedAt",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  // Validate sortBy against actual table columns
  const validSortColumns = {
    id: conversations.id,
    title: conversations.title,
    userId: conversations.userId,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
    isFavorite: conversations.isFavorite,
    favoritedAt: conversations.favoritedAt,
  };

  const sortColumn =
    validSortColumns[sortBy as keyof typeof validSortColumns] ||
    conversations.updatedAt;

  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [conversationList, totalCount] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(
        desc(conversations.isFavorite),
        desc(conversations.favoritedAt),
        orderBy
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.userId, userId)),
  ]);

  return {
    conversations: conversationList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get conversations with last message
export async function getConversationsWithLastMessage(
  userId: string,
  params: PaginationParams = {}
): Promise<{
  conversations: ConversationWithLastMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  // Get conversations
  const conversationsList = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(
      desc(conversations.isFavorite),
      desc(conversations.favoritedAt),
      sortOrder === "asc"
        ? asc(conversations.updatedAt)
        : desc(conversations.updatedAt)
    )
    .limit(limit)
    .offset(offset);

  // Transform to include last message and message count
  const conversationsWithLastMessage: ConversationWithLastMessage[] =
    conversationsList.map((conv) => {
      const messages = (conv.messages as any) || [];
      const messageCount = Array.isArray(messages) ? messages.length : 0;
      const lastMessage =
        messageCount > 0 ? messages[messages.length - 1] : undefined;

      return {
        ...conv,
        lastMessage,
        messageCount,
      };
    });

  // Get total count
  const totalCount = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.userId, userId));

  return {
    conversations: conversationsWithLastMessage,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Update conversation title
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<Conversation | null> {
  return updateConversation(id, { title });
}

// Get conversations count by user
export async function getConversationsCountByUser(
  userId: string
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.userId, userId));
  return result[0].count;
}

// Get recent conversations across all users (for admin)
export async function getRecentConversations(
  limit: number = 10
): Promise<ConversationWithMessages[]> {
  return db.query.conversations.findMany({
    limit,
    orderBy: [desc(conversations.createdAt)],
    with: {
      user: true,
    },
  });
}

// Search conversations by title
export async function searchConversations(
  userId: string,
  searchTerm: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [conversationList, totalCount] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          sql`${conversations.title} ILIKE ${"%" + searchTerm + "%"}`
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          sql`${conversations.title} ILIKE ${"%" + searchTerm + "%"}`
        )
      ),
  ]);

  return {
    conversations: conversationList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get latest message in conversation
export async function getLatestMessageInConversation(
  conversationId: string
): Promise<Message | null> {
  const messages = await getConversationMessages(conversationId);
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

// Clear all messages from conversation
export async function clearConversationMessages(
  conversationId: string
): Promise<Conversation | null> {
  return replaceConversationMessages(conversationId, []);
}

// Count favorite conversations for a user
export async function getFavoriteConversationCount(
  userId: string
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.isFavorite, true)));

  return Number(result[0]?.count ?? 0);
}

// Get favorite conversations for a user (sorted by favoritedAt)
