import { eq, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { conversations, messages, users, templates } from "../../../db/schema";
import type {
  Conversation,
  NewConversation,
  ConversationWithMessages,
  ConversationWithLastMessage,
  PaginationParams,
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

// Get conversation with messages
export async function getConversationWithMessages(
  id: string
): Promise<ConversationWithMessages | null> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      user: true,
      template: true,
      messages: {
        orderBy: [asc(messages.createdAt)],
      },
    },
  });

  return conversation || null;
}

// Create new conversation
export async function createConversation(
  conversationData: NewConversation
): Promise<Conversation> {
  const result = await db
    .insert(conversations)
    .values({
      ...conversationData,
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

  const orderBy =
    sortOrder === "asc"
      ? asc(conversations[sortBy as keyof typeof conversations])
      : desc(conversations[sortBy as keyof typeof conversations]);

  const [conversationList, totalCount] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(orderBy)
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

  // Get conversations with message counts
  const conversationsWithStats = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      templateId: conversations.templateId,
      aiModel: conversations.aiModel,
      metadata: conversations.metadata,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: count(messages.id),
    })
    .from(conversations)
    .leftJoin(messages, eq(conversations.id, messages.conversationId))
    .where(eq(conversations.userId, userId))
    .groupBy(
      conversations.id,
      conversations.userId,
      conversations.title,
      conversations.templateId,
      conversations.aiModel,
      conversations.metadata,
      conversations.createdAt,
      conversations.updatedAt
    )
    .orderBy(
      sortOrder === "asc"
        ? asc(conversations.updatedAt)
        : desc(conversations.updatedAt)
    )
    .limit(limit)
    .offset(offset);

  // Get last messages for each conversation
  const conversationIds = conversationsWithStats.map((c) => c.id);
  const lastMessages =
    conversationIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(
            and(
              sql`${messages.conversationId} IN ${conversationIds}`,
              sql`${messages.id} IN (
          SELECT id FROM ${messages} m2 
          WHERE m2.conversation_id = ${messages.conversationId} 
          ORDER BY m2.created_at DESC 
          LIMIT 1
        )`
            )
          )
      : [];

  // Combine data
  const conversationsWithLastMessage: ConversationWithLastMessage[] =
    conversationsWithStats.map((conv) => ({
      ...conv,
      lastMessage: lastMessages.find((msg) => msg.conversationId === conv.id),
    }));

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
      template: true,
      messages: {
        limit: 1,
        orderBy: [desc(messages.createdAt)],
      },
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
