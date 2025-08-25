import { NextRequest, NextResponse } from "next/server";
import { ConversationService } from "@/lib/services/conversation";
import { getCurrentSession } from "@/lib/auth/session";

// GET /api/user/analytics - Get user's dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    // TEMPORARY: Use mock user ID when no session (for testing)
    const userId = session?.user?.id || "12345678-1234-1234-1234-123456789abc";

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const periodDays = parseInt(period);

    // Get user's conversations for analytics
    const conversations = await ConversationService.getUserConversations(userId, {
      page: 1,
      limit: 1000, // Get all for analytics
    });

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);

    // Get messages for analytics
    let totalMessages = 0;
    let totalFiles = 0;
    const dailyActivity: Record<string, { messages: number; conversations: number }> = {};
    const recentConversations = [];

    for (const conversation of conversations.conversations.slice(0, 10)) {
      try {
        const messages = await ConversationService.getMessages(conversation.id, {
          page: 1,
          limit: 1000,
          sortOrder: "asc",
        });

        totalMessages += messages.messages.length;
        
        // Count files in messages
        for (const message of messages.messages) {
          if (message.metadata && (message.metadata as any).files) {
            totalFiles += ((message.metadata as any).files as any[]).length || 0;
          }
        }

        // Add to recent conversations with message data
        if (recentConversations.length < 5) {
          const lastMessage = messages.messages[messages.messages.length - 1];
          recentConversations.push({
            id: conversation.id,
            title: conversation.title || "Untitled Chat",
            lastMessage: lastMessage?.content?.substring(0, 100) + "..." || "No messages",
            messageCount: messages.messages.length,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          });
        }

        // Calculate daily activity
        for (const message of messages.messages) {
          const messageDate = new Date(message.createdAt);
          if (messageDate >= startDate && messageDate <= endDate) {
            const dateKey = messageDate.toISOString().split('T')[0];
            if (!dailyActivity[dateKey]) {
              dailyActivity[dateKey] = { messages: 0, conversations: 0 };
            }
            dailyActivity[dateKey].messages += 1;
          }
        }

        // Count conversations per day
        const convDate = new Date(conversation.createdAt);
        if (convDate >= startDate && convDate <= endDate) {
          const dateKey = convDate.toISOString().split('T')[0];
          if (!dailyActivity[dateKey]) {
            dailyActivity[dateKey] = { messages: 0, conversations: 0 };
          }
          dailyActivity[dateKey].conversations += 1;
        }
      } catch (error) {
        console.error(`Error fetching messages for conversation ${conversation.id}:`, error);
      }
    }

    // Calculate trends (mock data for now)
    const previousPeriodMessages = Math.floor(totalMessages * 0.8);
    const messagesTrend = totalMessages > 0 
      ? Math.round(((totalMessages - previousPeriodMessages) / previousPeriodMessages) * 100)
      : 0;

    // Generate activity chart data for the last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const activity = dailyActivity[dateKey] || { messages: 0, conversations: 0 };
      
      chartData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateKey,
        messages: activity.messages,
        conversations: activity.conversations,
      });
    }

    // Calculate average response time (mock for now)
    const avgResponseTime = "1.2s";

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalConversations: conversations.total,
          totalMessages,
          filesProcessed: totalFiles,
          averageResponseTime: avgResponseTime,
        },
        trends: {
          conversations: conversations.total > 0 ? "+12%" : "0%",
          messages: messagesTrend > 0 ? `+${messagesTrend}%` : messagesTrend < 0 ? `${messagesTrend}%` : "0%",
          files: totalFiles > 0 ? "+8%" : "0%",
          responseTime: "-5%",
        },
        chartData,
        recentConversations,
        fileAnalytics: {
          totalFiles: totalFiles,
          types: {
            pdf: Math.floor(totalFiles * 0.4),
            docx: Math.floor(totalFiles * 0.3),
            txt: Math.floor(totalFiles * 0.2),
            other: Math.floor(totalFiles * 0.1),
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}