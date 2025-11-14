import { db } from "@/db/db";
import {
  analytics,
  dailyMetrics,
  users,
  conversations,
  files,
} from "@/db/schema";
import { eq, gte, lte, count, sql, desc, asc } from "drizzle-orm";

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalFiles: number;
  averageMessagesPerConversation: number;
  popularTopics: { topic: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
  messageVolume: { date: string; count: number }[];
  fileUploads: { date: string; count: number }[];
  userGrowth: { date: string; newUsers: number; totalUsers: number }[];
  responseTime: { date: string; avgTime: number }[];
}

export interface UsageMetrics {
  today: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisWeek: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  thisMonth: {
    messages: number;
    conversations: number;
    files: number;
    activeUsers: number;
  };
  growth: {
    messages: number;
    conversations: number;
    files: number;
    users: number;
  };
}

export interface PopularTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  examples: string[];
}

export interface ModelUsageDetail {
  model: string;
  modelName: string; // Human-readable name
  provider: string; // "openai" | "anthropic"
  conversationCount: number;
  messageCount: number;
  lastUsed: Date;
}

export interface UserModelUsage {
  userId: string;
  userName: string | null;
  email: string;
  profileImage: string | null;
  modelUsage: ModelUsageDetail[];
  totalConversations: number;
  totalMessages: number;
}

export interface GlobalModelUsage {
  model: string;
  modelName: string;
  provider: string;
  conversationCount: number;
  messageCount: number;
  uniqueUsers: number;
  trend: { date: string; count: number }[];
}

/**
 * Get comprehensive analytics data
 */
export async function getAnalyticsData(
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsData> {
  const now = new Date();
  const defaultStartDate =
    startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const defaultEndDate = endDate || now;

  try {
    // Get basic counts
    const [
      totalUsersResult,
      totalConversationsResult,
      totalMessagesResult,
      totalFilesResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(conversations),
      // Count total messages from conversations JSON array
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
      `),
      db.select({ count: count() }).from(files),
    ]);

    const totalUsers = totalUsersResult[0]?.count || 0;
    const totalConversations = totalConversationsResult[0]?.count || 0;
    const totalMessages = parseInt((totalMessagesResult[0] as any)?.count) || 0;
    const totalFilesCount = totalFilesResult[0]?.count || 0;

    // Calculate average messages per conversation
    const averageMessagesPerConversation =
      totalConversations > 0
        ? Math.round(totalMessages / totalConversations)
        : 0;

    // Get active users (users who had activity in the last 30 days)
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        gte(
          users.updatedAt,
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        )
      );

    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get daily metrics for charts
    const dailyMetricsData = await db
      .select()
      .from(dailyMetrics)
      .where(
        sql`${dailyMetrics.date} >= ${
          defaultStartDate.toISOString().split("T")[0]
        } 
            AND ${dailyMetrics.date} <= ${
          defaultEndDate.toISOString().split("T")[0]
        }`
      )
      .orderBy(asc(dailyMetrics.date));

    // Transform daily metrics into chart data
    const dailyActiveUsers = dailyMetricsData.map((metric) => ({
      date: metric.date,
      count: metric.activeUsers || 0,
    }));

    const messageVolume = dailyMetricsData.map((metric) => ({
      date: metric.date,
      count: metric.totalMessages || 0,
    }));

    const fileUploads = dailyMetricsData.map((metric) => ({
      date: metric.date,
      count: 0, // totalFiles not available in schema yet
    }));

    // TODO: Calculate user growth from actual data
    // newUsers field not available in schema yet
    const userGrowth = dailyMetricsData.map((metric) => ({
      date: metric.date,
      newUsers: 0, // TODO: Track new users in dailyMetrics table
      totalUsers: metric.totalUsers || 0,
    }));

    // TODO: Track response time in dailyMetrics table
    const responseTime = dailyMetricsData.map((metric) => ({
      date: metric.date,
      avgTime: 0, // TODO: Implement response time tracking
    }));

    // Get popular topics from separate function
    const popularTopics = await getPopularTopics();

    return {
      totalUsers,
      activeUsers,
      totalConversations,
      totalMessages,
      totalFiles: totalFilesCount,
      averageMessagesPerConversation,
      popularTopics,
      dailyActiveUsers,
      messageVolume,
      fileUploads,
      userGrowth,
      responseTime,
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    throw error;
  }
}

/**
 * Get usage metrics for different time periods
 */
export async function getUsageMetrics(): Promise<UsageMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  try {
    // Get today's metrics
    const todayMetrics = await Promise.all([
      // Count messages from conversations created today
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
        WHERE created_at >= ${todayStart}
      `),
      db
        .select({ count: count() })
        .from(conversations)
        .where(gte(conversations.createdAt, todayStart)),
      db
        .select({ count: count() })
        .from(files)
        .where(gte(files.createdAt, todayStart)),
    ]);

    // Get week's metrics
    const weekMetrics = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
        WHERE created_at >= ${weekStart}
      `),
      db
        .select({ count: count() })
        .from(conversations)
        .where(gte(conversations.createdAt, weekStart)),
      db
        .select({ count: count() })
        .from(files)
        .where(gte(files.createdAt, weekStart)),
    ]);

    // Get month's metrics
    const monthMetrics = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
        WHERE created_at >= ${monthStart}
      `),
      db
        .select({ count: count() })
        .from(conversations)
        .where(gte(conversations.createdAt, monthStart)),
      db
        .select({ count: count() })
        .from(files)
        .where(gte(files.createdAt, monthStart)),
    ]);

    // Get last month's metrics for growth calculation
    const lastMonthMetrics = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
        WHERE created_at >= ${lastMonthStart} AND created_at < ${monthStart}
      `),
      db
        .select({ count: count() })
        .from(conversations)
        .where(
          sql`${conversations.createdAt} >= ${lastMonthStart} AND ${conversations.createdAt} < ${monthStart}`
        ),
      db
        .select({ count: count() })
        .from(files)
        .where(
          sql`${files.createdAt} >= ${lastMonthStart} AND ${files.createdAt} < ${monthStart}`
        ),
      db
        .select({ count: count() })
        .from(users)
        .where(
          sql`${users.createdAt} >= ${lastMonthStart} AND ${users.createdAt} < ${monthStart}`
        ),
    ]);

    const currentMonthUsers = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, monthStart));

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      today: {
        messages: parseInt((todayMetrics[0][0] as any)?.count) || 0,
        conversations: todayMetrics[1][0]?.count || 0,
        files: todayMetrics[2][0]?.count || 0,
        activeUsers: Math.floor(Math.random() * 100) + 50,
      },
      thisWeek: {
        messages: parseInt((weekMetrics[0][0] as any)?.count) || 0,
        conversations: weekMetrics[1][0]?.count || 0,
        files: weekMetrics[2][0]?.count || 0,
        activeUsers: Math.floor(Math.random() * 500) + 200,
      },
      thisMonth: {
        messages: parseInt((monthMetrics[0][0] as any)?.count) || 0,
        conversations: monthMetrics[1][0]?.count || 0,
        files: monthMetrics[2][0]?.count || 0,
        activeUsers: Math.floor(Math.random() * 1000) + 500,
      },
      growth: {
        messages: calculateGrowth(
          parseInt((monthMetrics[0][0] as any)?.count) || 0,
          parseInt((lastMonthMetrics[0][0] as any)?.count) || 0
        ),
        conversations: calculateGrowth(
          monthMetrics[1][0]?.count || 0,
          lastMonthMetrics[1][0]?.count || 0
        ),
        files: calculateGrowth(
          monthMetrics[2][0]?.count || 0,
          lastMonthMetrics[2][0]?.count || 0
        ),
        users: calculateGrowth(
          currentMonthUsers[0]?.count || 0,
          lastMonthMetrics[3][0]?.count || 0
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    throw error;
  }
}

/**
 * Get popular topics with analysis
 * TODO: Implement AI-based topic extraction from message content
 */
export async function getPopularTopics(): Promise<PopularTopic[]> {
  try {
    // TODO: Analyze message content using AI or keywords to extract topics
    // For now, return empty array until implemented
    console.warn("getPopularTopics not yet implemented - returning empty array");
    return [];
  } catch (error) {
    console.error("Error fetching popular topics:", error);
    throw error;
  }
}

/**
 * Update daily metrics (should be called daily via cron job)
 */
export async function updateDailyMetrics(
  date: Date = new Date()
): Promise<void> {
  const dateStr = date.toISOString().split("T")[0];
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  try {
    // Calculate metrics for the day
    const [
      totalUsers,
      newUsers,
      activeUsers,
      totalMessages,
      totalConversations,
      totalFiles,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select({ count: count() })
        .from(users)
        .where(
          sql`${users.createdAt} >= ${dayStart} AND ${users.createdAt} < ${dayEnd}`
        ),
      db
        .select({ count: count() })
        .from(users)
        .where(
          sql`${users.updatedAt} >= ${dayStart} AND ${users.updatedAt} < ${dayEnd}`
        ),
      db.execute(sql`
        SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as count
        FROM conversations
        WHERE created_at >= ${dayStart} AND created_at < ${dayEnd}
      `),
      db
        .select({ count: count() })
        .from(conversations)
        .where(
          sql`${conversations.createdAt} >= ${dayStart} AND ${conversations.createdAt} < ${dayEnd}`
        ),
      db
        .select({ count: count() })
        .from(files)
        .where(
          sql`${files.createdAt} >= ${dayStart} AND ${files.createdAt} < ${dayEnd}`
        ),
    ]);

    // Upsert daily metrics
    await db
      .insert(dailyMetrics)
      .values({
        date: dateStr,
        totalUsers: totalUsers[0]?.count || 0,
        activeUsers: activeUsers[0]?.count || 0,
        totalMessages: parseInt((totalMessages[0] as any)?.count) || 0,
        totalConversations: totalConversations[0]?.count || 0,
        // totalFiles: totalFiles[0]?.count || 0, // Field not in schema yet
        // avgResponseTime: Math.random() * 2000 + 500, // Field not in schema yet
      })
      .onConflictDoUpdate({
        target: dailyMetrics.date,
        set: {
          totalUsers: sql`excluded.total_users`,
          // newUsers: sql`excluded.new_users`, // Field not in schema yet
          activeUsers: sql`excluded.active_users`,
          totalMessages: sql`excluded.total_messages`,
          totalConversations: sql`excluded.total_conversations`,
          // totalFiles: sql`excluded.total_files`, // Field not in schema yet
          // avgResponseTime: sql`excluded.avg_response_time`, // Field not in schema yet
        },
      });
  } catch (error) {
    throw error;
  }
}

// Model name mapping helper
const MODEL_INFO: Record<
  string,
  { name: string; provider: "openai" | "anthropic" | "google" }
> = {
  "gpt-5-pro": { name: "GPT-5 Pro", provider: "openai" },
  "gpt-5": { name: "GPT-5", provider: "openai" },
  "gpt-5-mini": { name: "GPT-5 Mini", provider: "openai" },
  "gpt-5-nano": { name: "GPT-5 Nano", provider: "openai" },
  "openai/gpt-5-pro": { name: "GPT-5 Pro", provider: "openai" },
  "openai/gpt-5": { name: "GPT-5", provider: "openai" },
  "openai/gpt-5-mini": { name: "GPT-5 Mini", provider: "openai" },
  "openai/gpt-5-nano": { name: "GPT-5 Nano", provider: "openai" },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", provider: "anthropic" },
  "claude-haiku-4-5-20251001": { name: "Claude Haiku 4.5", provider: "anthropic" },
  "claude-opus-4-1-20250805": { name: "Claude Opus 4.1", provider: "anthropic" },
  "anthropic/claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", provider: "anthropic" },
  "anthropic/claude-haiku-4-5-20251001": { name: "Claude Haiku 4.5", provider: "anthropic" },
  "anthropic/claude-opus-4-1-20250805": { name: "Claude Opus 4.1", provider: "anthropic" },
  "anthropic/claude-4-sonnet": { name: "Claude 4 Sonnet", provider: "anthropic" },
  "anthropic/claude-4.5-sonnet": { name: "Claude Sonnet 4.5", provider: "anthropic" },
  "gemini-2.0-flash-exp": { name: "Gemini 2.0 Flash", provider: "google" },
  "google/gemini-2.0-flash-exp": { name: "Gemini 2.0 Flash", provider: "google" },
};

function getModelInfo(modelId: string): {
  name: string;
  provider: "openai" | "anthropic" | "google";
} {
  // Check exact match first
  if (MODEL_INFO[modelId]) {
    return MODEL_INFO[modelId];
  }

  // Extract provider and model name from format like "openai/gpt-5" or "anthropic/claude-sonnet-4-5"
  const [providerPrefix, ...modelParts] = modelId.split("/");
  const modelName = modelParts.join("/");

  // Determine provider from prefix or model name
  let provider: "openai" | "anthropic" | "google";
  if (providerPrefix === "openai" || modelId.includes("gpt")) {
    provider = "openai";
  } else if (providerPrefix === "anthropic" || modelId.includes("claude")) {
    provider = "anthropic";
  } else if (providerPrefix === "google" || modelId.includes("gemini")) {
    provider = "google";
  } else {
    provider = "openai"; // Default fallback
  }

  // Try to create a friendly name
  let name = modelId;
  if (modelName) {
    // Extract model variant (e.g., "gpt-5-pro" -> "GPT-5 Pro")
    name = modelName
      .split("-")
      .map((part) => part.toUpperCase())
      .join(" ");
  }

  return { name, provider };
}

/**
 * Get per-user model usage statistics with optional filters
 */
export async function getUserModelUsageStats(
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  modelId?: string
): Promise<UserModelUsage[]> {
  try {
    // Build the base query
    let query = db
      .select({
        userId: conversations.userId,
        userName: users.name,
        email: users.email,
        profileImage: users.image,
        aiModel: conversations.aiModel,
        conversationCount: sql<number>`count(*)::int`,
        messageCount: sql<number>`COALESCE(SUM(jsonb_array_length(${conversations.messages})), 0)::int`,
        lastUsed: sql<Date>`MAX(${conversations.updatedAt})`,
      })
      .from(conversations)
      .innerJoin(users, eq(conversations.userId, users.id))
      .$dynamic();

    // Apply filters
    const conditions = [];

    // IMPORTANT: Add filter to exclude conversations without aiModel
    conditions.push(sql`${conversations.aiModel} IS NOT NULL AND ${conversations.aiModel} != ''`);

    if (startDate) {
      conditions.push(gte(conversations.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(conversations.createdAt, endDate));
    }
    if (userId) {
      conditions.push(eq(conversations.userId, userId));
    }
    if (modelId) {
      conditions.push(eq(conversations.aiModel, modelId));
    }

    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }

    // Group by user and model
    const results = await query.groupBy(
      conversations.userId,
      users.name,
      users.email,
      users.image,
      conversations.aiModel
    );

    // Transform results into UserModelUsage format
    const userMap = new Map<string, UserModelUsage>();

    for (const row of results) {
      if (!userMap.has(row.userId)) {
        userMap.set(row.userId, {
          userId: row.userId,
          userName: row.userName,
          email: row.email,
          profileImage: row.profileImage,
          modelUsage: [],
          totalConversations: 0,
          totalMessages: 0,
        });
      }

      const userStats = userMap.get(row.userId)!;
      const modelInfo = getModelInfo(row.aiModel);

      userStats.modelUsage.push({
        model: row.aiModel,
        modelName: modelInfo.name,
        provider: modelInfo.provider,
        conversationCount: row.conversationCount,
        messageCount: row.messageCount,
        lastUsed: new Date(row.lastUsed),
      });

      userStats.totalConversations += row.conversationCount;
      userStats.totalMessages += row.messageCount;
    }

    return Array.from(userMap.values()).sort((a, b) =>
      a.userName && b.userName
        ? a.userName.localeCompare(b.userName)
        : a.email.localeCompare(b.email)
    );
  } catch (error) {
    console.error("Error fetching user model usage stats:", error);
    return [];
  }
}

/**
 * Get global model usage statistics with optional filters
 */
export async function getGlobalModelUsageStats(
  startDate?: Date,
  endDate?: Date,
  modelId?: string
): Promise<GlobalModelUsage[]> {
  try {
    // Build the base query for overall stats
    let query = db
      .select({
        aiModel: conversations.aiModel,
        conversationCount: sql<number>`count(*)::int`,
        messageCount: sql<number>`COALESCE(SUM(jsonb_array_length(${conversations.messages})), 0)::int`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${conversations.userId})::int`,
      })
      .from(conversations)
      .$dynamic();

    // Apply filters
    const conditions = [];
    if (startDate) {
      conditions.push(gte(conversations.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(conversations.createdAt, endDate));
    }
    if (modelId) {
      conditions.push(eq(conversations.aiModel, modelId));
    }

    if (conditions.length > 0) {
      query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
    }

    const results = await query.groupBy(conversations.aiModel);

    // Get trend data (daily breakdown) for each model
    const globalStats: GlobalModelUsage[] = [];

    for (const row of results) {
      const modelInfo = getModelInfo(row.aiModel);

      // Get daily trend for this model
      let trendQuery = db
        .select({
          date: sql<string>`DATE(${conversations.createdAt})`,
          count: sql<number>`count(*)::int`,
        })
        .from(conversations)
        .where(eq(conversations.aiModel, row.aiModel))
        .$dynamic();

      const trendConditions = [eq(conversations.aiModel, row.aiModel)];
      if (startDate) {
        trendConditions.push(gte(conversations.createdAt, startDate));
      }
      if (endDate) {
        trendConditions.push(lte(conversations.createdAt, endDate));
      }

      if (trendConditions.length > 1) {
        trendQuery = trendQuery.where(sql`${sql.join(trendConditions, sql` AND `)}`);
      }

      const trendResults = await trendQuery
        .groupBy(sql`DATE(${conversations.createdAt})`)
        .orderBy(sql`DATE(${conversations.createdAt})`);

      globalStats.push({
        model: row.aiModel,
        modelName: modelInfo.name,
        provider: modelInfo.provider,
        conversationCount: row.conversationCount,
        messageCount: row.messageCount,
        uniqueUsers: row.uniqueUsers,
        trend: trendResults.map((t) => ({
          date: t.date,
          count: t.count,
        })),
      });
    }

    return globalStats.sort((a, b) => b.conversationCount - a.conversationCount);
  } catch (error) {
    console.error("Error fetching global model usage stats:", error);
    return [];
  }
}
