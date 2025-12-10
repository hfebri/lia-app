import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getAIService, createMessage } from "@/lib/ai/service";
import type { AIProviderName } from "@/lib/ai/types";
import { ProductivityTracker } from "@/lib/services/productivity-tracker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const { userId } = await requireAuthenticatedUser();

    const conversationId = resolvedParams.id;

    // Check if conversation exists and user owns it
    const conversation = await ConversationService.getConversation(
      conversationId
    );
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user owns this conversation
    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await ConversationService.getMessages(conversationId, {
      page,
      limit,
      sortOrder: "asc", // Messages should be in chronological order
    });

    // Format messages for response
    const formattedMessages = result.messages.map(
      ConversationService.formatMessageForResponse
    );

    return NextResponse.json({
      success: true,
      data: formattedMessages,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {

    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const { userId } = await requireAuthenticatedUser();

    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { content, model } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Check if conversation exists and user owns it
    const conversation = await ConversationService.getConversation(
      conversationId
    );
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user owns this conversation
    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Add the user message
    const userMessage = await ConversationService.addMessage(
      conversationId,
      userId,
      {
        content: content.trim(),
        role: "user",
      }
    );

    // Generate AI response using Replicate GPT-5
    try {
      const aiService = getAIService();

      // Get conversation history for context
      const messageHistory = await ConversationService.getMessages(
        conversationId,
        {
          page: 1,
          limit: 20,
          sortOrder: "asc",
        }
      );

      // Format messages for AI service
      const conversationMessages = messageHistory.messages.map((msg) =>
        createMessage(msg.role as "user" | "assistant", msg.content)
      );

      // Determine provider based on model - NO FALLBACK LOGIC
      let provider: AIProviderName = "openai";
      const selectedModel = model || "gpt-5";

      if (selectedModel.startsWith("anthropic/") || selectedModel.startsWith("deepseek-ai/")) {
        provider = "replicate";
      } else if (selectedModel.startsWith("gpt-")) {
        provider = "openai";
      }

      // Generate AI response
      const aiResponse = await aiService.generateResponse(
        conversationMessages,
        {
          provider,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000,
        }
      );

      // Add the assistant message
      const assistantMessage = await ConversationService.addMessage(
        conversationId,
        userId,
        {
          content: aiResponse.content,
          role: "assistant",
          metadata: {
            model: aiResponse.model,
            provider: aiResponse.provider,
            tokens: aiResponse.usage?.total_tokens || 0,
          },
        }
      );

      // Track message creation for productivity metrics (non-blocking)
      // Track both user and assistant messages
      ProductivityTracker.trackMessageCreated(userId);
      ProductivityTracker.trackMessageCreated(userId);

      return NextResponse.json({
        success: true,
        data: {
          userMessage:
            ConversationService.formatMessageForResponse(userMessage),
          assistantMessage:
            ConversationService.formatMessageForResponse(assistantMessage),
        },
      });
    } catch (aiError) {

      // Fallback to a simple response if AI fails
      const assistantMessage = await ConversationService.addMessage(
        conversationId,
        userId,
        {
          content:
            "I apologize, but I'm having trouble generating a response right now. Please try again later.",
          role: "assistant",
          metadata: {
            model: "fallback",
            error:
              aiError instanceof Error ? aiError.message : "Unknown AI error",
          },
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          userMessage:
            ConversationService.formatMessageForResponse(userMessage),
          assistantMessage:
            ConversationService.formatMessageForResponse(assistantMessage),
        },
        warning:
          "AI service temporarily unavailable, fallback response provided",
      });
    }
  } catch (error) {

    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
