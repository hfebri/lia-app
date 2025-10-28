import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { ProductivityTracker } from "@/lib/services/productivity-tracker";

// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();

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
    const { userId } = await requireAuthenticatedUser();

    const body = await request.json();
    const { title, initialMessage, aiModel } = body;

    const conversation = await ConversationService.createConversation(userId, {
      title,
      initialMessage,
      aiModel,
    });

    // Track conversation creation for productivity metrics (non-blocking)
    ProductivityTracker.trackConversationCreated(userId);

    return NextResponse.json({
      success: true,
      data: ConversationService.formatConversationForResponse(conversation),
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
        error: "Failed to create conversation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
