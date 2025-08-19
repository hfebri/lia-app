import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { getCurrentSession } from "@/lib/auth/session";

// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    let result;

    if (search) {
      result = await ConversationService.searchConversations(userId, search, {
        page,
        limit,
      });
    } else {
      result = await ConversationService.getUserConversations(userId, {
        page,
        limit,
      });
    }

    // Format conversations for response
    const formattedConversations = result.conversations.map(
      ConversationService.formatConversationForResponse
    );

    return NextResponse.json({
      success: true,
      data: formattedConversations,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch conversations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const body = await request.json();
    const { title, templateId, initialMessage } = body;

    const conversation = await ConversationService.createConversation(userId, {
      title,
      templateId,
      initialMessage,
    });

    return NextResponse.json({
      success: true,
      data: ConversationService.formatConversationForResponse(conversation),
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
