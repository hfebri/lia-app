import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { requireAuthenticatedUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get specific conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const { userId } = await requireAuthenticatedUser();

    const conversationId = resolvedParams.id;
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

    return NextResponse.json({
      success: true,
      data: ConversationService.formatConversationForResponse(conversation),
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);

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
        error: "Failed to fetch conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/conversations/[id] - Update conversation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const { userId } = await requireAuthenticatedUser();

    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { title, metadata } = body;

    // First check if conversation exists and user owns it
    const existingConversation = await ConversationService.getConversation(
      conversationId
    );
    if (!existingConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user owns this conversation
    if (existingConversation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update conversation
    const updates: { title?: string; metadata?: Record<string, unknown> } = {};
    if (title !== undefined) updates.title = title;
    if (metadata !== undefined) updates.metadata = metadata;

    const updatedConversation = await ConversationService.updateConversation(
      conversationId,
      updates
    );

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Failed to update conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ConversationService.formatConversationForResponse(
        updatedConversation
      ),
    });
  } catch (error) {
    console.error("Error updating conversation:", error);

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
        error: "Failed to update conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const { userId } = await requireAuthenticatedUser();

    const conversationId = resolvedParams.id;

    // First check if conversation exists and user owns it
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

    // Delete conversation
    const deleted = await ConversationService.deleteConversation(
      conversationId
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);

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
        error: "Failed to delete conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
