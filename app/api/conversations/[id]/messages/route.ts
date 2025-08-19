import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { getCurrentSession } from "@/lib/auth/session";
import { getAIService, createMessage } from "@/lib/ai/service";

interface RouteParams {
  params: { id: string };
}

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const conversationId = params.id;

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

    // TEMPORARY: Skip ownership check for testing
    // if (conversation.userId !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

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
    console.error("Error fetching messages:", error);
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
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const conversationId = params.id;
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

    // TEMPORARY: Skip ownership check for testing
    // if (conversation.userId !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

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

      // Generate response using GPT-5
      console.log("Generating AI response with GPT-5...");
      const aiResponse = await aiService.generateResponse(
        conversationMessages,
        {
          provider: "replicate",
          model: model || "openai/gpt-5",
          temperature: 0.7,
          max_tokens: 1000,
        }
      );

      console.log("AI response received:", aiResponse);

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
      console.error("AI service error:", aiError);

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
    console.error("Error sending message:", error);
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
