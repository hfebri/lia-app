import {
  createConversation as dbCreateConversation,
  updateConversation as dbUpdateConversation,
  deleteConversation as dbDeleteConversation,
  getConversationById,
  getConversationWithMessages,
  getConversationsWithLastMessage,
  updateConversationTitle,
  getConversationsCountByUser,
  searchConversations,
  getConversationMessages,
  addMessageToConversation,
  getLatestMessageInConversation,
  getConversationMessageCount,
  addMessagesToConversation,
} from "@/lib/db/queries/conversations";

import type {
  Conversation,
  NewConversation,
  Message,
  NewMessage,
  ConversationWithLastMessage,
  PaginationParams,
} from "@/db/types";

import { CreateConversationParams, SendMessageParams } from "@/lib/types/chat";

// Generate a conversation title from the first message
function generateConversationTitle(firstMessage: string): string {
  const maxLength = 50;
  const cleaned = firstMessage.trim().replace(/\n+/g, " ");

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 20
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

export class ConversationService {
  // Create a new conversation
  static async createConversation(
    userId: string,
    params: CreateConversationParams = {}
  ): Promise<Conversation> {
    const { title, initialMessage, aiModel } = params;

    const conversationData: NewConversation = {
      userId,
      title:
        title ||
        (initialMessage
          ? generateConversationTitle(initialMessage)
          : "New Conversation"),
      aiModel: aiModel || "openai/gpt-5", // Use provided model or default
      messages: [] as any, // Start with empty messages array
      metadata: null,
    };

    const conversation = await dbCreateConversation(conversationData);

    // If there's an initial message, add it
    if (initialMessage) {
      await this.addMessage(conversation.id, userId, {
        content: initialMessage,
        role: "user",
      });

      // Update the title if it was auto-generated
      if (!title) {
        await dbUpdateConversation(conversation.id, {
          title: generateConversationTitle(initialMessage),
        });
      }
    }

    return conversation;
  }

  // Get conversation by ID
  static async getConversation(
    conversationId: string
  ): Promise<Conversation | null> {
    return getConversationById(conversationId);
  }

  // Get conversation with all messages
  static async getConversationWithMessages(conversationId: string) {
    return getConversationWithMessages(conversationId);
  }

  // Get user's conversations with last message and pagination
  static async getUserConversations(
    userId: string,
    params: PaginationParams = {}
  ) {
    return getConversationsWithLastMessage(userId, params);
  }

  // Update conversation
  static async updateConversation(
    conversationId: string,
    updates: Partial<NewConversation>
  ): Promise<Conversation | null> {
    return dbUpdateConversation(conversationId, updates);
  }

  // Update conversation title
  static async updateTitle(
    conversationId: string,
    title: string
  ): Promise<Conversation | null> {
    return updateConversationTitle(conversationId, title);
  }

  // Delete conversation
  static async deleteConversation(conversationId: string): Promise<boolean> {
    return dbDeleteConversation(conversationId);
  }

  // Add message to conversation
  static async addMessage(
    conversationId: string,
    userId: string,
    messageData: {
      content: string;
      role: "user" | "assistant" | "system";
      metadata?: any;
    }
  ): Promise<Message> {
    const newMessage: NewMessage = {
      content: messageData.content,
      role: messageData.role,
      metadata: messageData.metadata || null,
    };

    // Add message to conversation's messages array
    await addMessageToConversation(conversationId, newMessage);

    // Return the message (note: no longer has conversationId or userId since it's embedded)
    return {
      ...newMessage,
      createdAt: new Date().toISOString(),
    } as Message;
  }

  // Add multiple messages to conversation (batch)
  static async addMessages(
    conversationId: string,
    userId: string,
    messages: Array<{
      content: string;
      role: "user" | "assistant" | "system";
      metadata?: any;
    }>
  ): Promise<Message[]> {
    const newMessages: NewMessage[] = messages.map((msg) => ({
      content: msg.content,
      role: msg.role,
      metadata: msg.metadata || null,
    }));

    await addMessagesToConversation(conversationId, newMessages);

    return newMessages.map((msg) => ({
      ...msg,
      createdAt: new Date().toISOString(),
    })) as Message[];
  }

  // Get messages for a conversation
  static async getMessages(
    conversationId: string,
    params: PaginationParams = {}
  ) {
    const messages = await getConversationMessages(conversationId);
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    // Simple pagination on the array
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      total: messages.length,
      page,
      limit,
      totalPages: Math.ceil(messages.length / limit),
    };
  }

  // Get all messages for a conversation (no pagination)
  static async getAllMessages(conversationId: string): Promise<Message[]> {
    return getConversationMessages(conversationId);
  }

  // Search conversations
  static async searchConversations(
    userId: string,
    searchTerm: string,
    params: PaginationParams = {}
  ) {
    return searchConversations(userId, searchTerm, params);
  }

  // Get conversation statistics
  static async getConversationStats(conversationId: string) {
    const messageCount = await getConversationMessageCount(conversationId);
    const latestMessage = await getLatestMessageInConversation(conversationId);

    return {
      messageCount,
      latestMessage,
    };
  }

  // Get user conversation statistics
  static async getUserStats(userId: string) {
    const conversationCount = await getConversationsCountByUser(userId);

    return {
      conversationCount,
    };
  }

  // Send message and handle conversation creation
  static async sendMessage(
    userId: string,
    params: SendMessageParams
  ): Promise<{
    conversation: Conversation;
    userMessage: Message;
    // assistantMessage will be handled by AI service later
  }> {
    let conversationId = params.conversationId;
    let conversation: Conversation;

    // Create new conversation if none exists
    if (!conversationId) {
      conversation = await this.createConversation(userId, {
        title: generateConversationTitle(params.content),
      });
      conversationId = conversation.id;
    } else {
      const existingConversation = await this.getConversation(conversationId);
      if (!existingConversation) {
        throw new Error("Conversation not found");
      }
      conversation = existingConversation;
    }

    // Add user message
    const userMessage = await this.addMessage(conversationId, userId, {
      content: params.content,
      role: "user",
    });

    return {
      conversation,
      userMessage,
    };
  }

  // Format conversation for API response
  static formatConversationForResponse(
    conversation: Conversation | ConversationWithLastMessage
  ): any {
    const messages = (conversation.messages as any) || [];
    const messageCount = Array.isArray(messages) ? messages.length : 0;

    return {
      id: conversation.id,
      title: conversation.title,
      aiModel: conversation.aiModel,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      userId: conversation.userId,
      messageCount:
        "messageCount" in conversation ? conversation.messageCount : messageCount,
      lastMessage:
        "lastMessage" in conversation
          ? conversation.lastMessage
          : (messageCount > 0 ? messages[messages.length - 1] : undefined),
      metadata: conversation.metadata,
    };
  }

  // Format message for API response
  static formatMessageForResponse(message: Message): any {
    return {
      content: message.content,
      role: message.role,
      timestamp: message.createdAt,
      metadata: message.metadata,
    };
  }

  // Check if conversation is approaching context limit (50 messages)
  static async checkContextLimit(conversationId: string): Promise<{
    messageCount: number;
    shouldWarn: boolean;
    shouldAlert: boolean;
  }> {
    const messageCount = await getConversationMessageCount(conversationId);

    return {
      messageCount,
      shouldWarn: messageCount >= 45, // Soft warning at 45
      shouldAlert: messageCount >= 50, // Strong alert at 50
    };
  }
}
