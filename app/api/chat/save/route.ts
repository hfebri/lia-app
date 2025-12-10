import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { requireAuthenticatedUser } from "@/lib/auth/session";

// POST /api/chat/save - Save chat messages to database without AI generation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const body = await request.json();
    const { conversationId, userMessage, assistantMessage, conversationTitle, aiModel } =
      body;


    // Validate required fields
    if (!userMessage?.content) {
      return NextResponse.json(
        { success: false, error: "User message content is required" },
        { status: 400 }
      );
    }

    let currentConversationId = conversationId;
    let conversationTitleForResponse: string | null = null;

    // Create new conversation if no ID provided
    if (!currentConversationId) {
      const conversation = await ConversationService.createConversation(
        userId,
        {
          title: conversationTitle || "New Chat",
          aiModel: aiModel || "gpt-5", // Use provided model or default
        }
      );
      currentConversationId = conversation.id;
      conversationTitleForResponse = conversation.title;
    } else {
      // Verify user owns the conversation
      const conversation = await ConversationService.getConversation(
        currentConversationId
      );
      if (!conversation || conversation.userId !== userId) {
        return NextResponse.json(
          { success: false, error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
    }

    // Save user message
    const savedUserMessage = await ConversationService.addMessage(
      currentConversationId,
      userId,
      {
        content: userMessage.content,
        role: "user",
        metadata: userMessage.metadata || null,
      }
    );

    // Save assistant message if provided
    let savedAssistantMessage = null;
    if (assistantMessage?.content) {
      savedAssistantMessage = await ConversationService.addMessage(
        currentConversationId,
        userId,
        {
          content: assistantMessage.content,
          role: "assistant",
          metadata: assistantMessage.metadata || null,
        }
      );
    }

    // Auto-update conversation title if it's still "New Chat" and we have the first user message
    if (!conversationId && userMessage?.content) {
      const titleFromMessage = userMessage.content.slice(0, 50).trim();
      const finalTitle = titleFromMessage.length > 50
        ? titleFromMessage.slice(0, 47) + "..."
        : titleFromMessage;

      await ConversationService.updateConversation(currentConversationId, {
        title: finalTitle,
      });

      // Update the title for response
      conversationTitleForResponse = finalTitle;
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: currentConversationId,
        title: conversationTitleForResponse, // Include the title in response
        userMessage:
          ConversationService.formatMessageForResponse(savedUserMessage),
        assistantMessage: savedAssistantMessage
          ? ConversationService.formatMessageForResponse(savedAssistantMessage)
          : null,
      },
    });
  } catch (error) {
    console.error("Error saving chat messages:", error);

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
        error: "Failed to save messages",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
