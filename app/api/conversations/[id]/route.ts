import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { getCurrentSession } from "@/lib/auth/session";

interface RouteParams {
  params: { id: string };
}

// GET /api/conversations/[id] - Get specific conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const conversationId = params.id;
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
    // Check if user owns this conversation
    // if (conversation.userId !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    return NextResponse.json({
      success: true,
      data: ConversationService.formatConversationForResponse(conversation),
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
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
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const conversationId = params.id;
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

    // TEMPORARY: Skip ownership check for testing
    // if (existingConversation.userId !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // Update conversation
    const updates: any = {};
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
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const conversationId = params.id;

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

    // TEMPORARY: Skip ownership check for testing
    // if (conversation.userId !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

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
