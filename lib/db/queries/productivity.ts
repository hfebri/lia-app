import { db } from "../../../db/db";
import {
  conversations,
  userProductivityMetrics,
  productivitySnapshots,
  type NewUserProductivityMetric,
  type NewProductivitySnapshot,
} from "../../../db/schema";
import { eq, and, gte, lte, desc, sql, between } from "drizzle-orm";
import {
  ProductivityCalculator,
  type RawActivityData,
} from "@/lib/services/productivity-calculator";

/**
 * Get raw activity data for a user within a time period
 */
export async function getRawActivityData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<RawActivityData> {
  // Fetch all conversations in the period
  const userConversations = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        gte(conversations.createdAt, startDate),
        lte(conversations.createdAt, endDate)
      )
    );

  // Initialize metrics
  const totalConversations = userConversations.length;
  let totalMessages = 0;
  let totalUserMessages = 0;
  let totalAiMessages = 0;
  let totalFilesProcessed = 0;

  const conversationLengths: number[] = [];
  const iterationDepths: number[] = [];
  const messageLengths: number[] = [];
  const fileUsageByConversation: number[] = [];
  const timeToFirstMessage: number[] = [];
  const timeBetweenMessages: number[] = [];
  const tokenUsage: number[] = [];
  const topics: { [key: string]: number } = {};
  const models: { [model: string]: number } = {};
  const activityByHour: { [hour: string]: number } = {};
  const activityByDayOfWeek: { [day: string]: number } = {};

  let conversationsWithMultipleExchanges = 0;
  let favoriteConversations = 0;

  // Process each conversation
  for (const conv of userConversations) {
    const messages = conv.messages as any[];
    if (!messages || messages.length === 0) continue;

    totalMessages += messages.length;
    conversationLengths.push(messages.length);

    // Count user vs AI messages
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    const aiMsgCount = messages.filter((m) => m.role === "assistant").length;
    totalUserMessages += userMsgCount;
    totalAiMessages += aiMsgCount;

    // Iteration depth (min of user/ai messages)
    iterationDepths.push(Math.min(userMsgCount, aiMsgCount));

    // Check for multiple exchanges
    if (messages.length > 3) {
      conversationsWithMultipleExchanges++;
    }

    // Message lengths
    for (const msg of messages) {
      if (msg.content) {
        messageLengths.push(msg.content.length);
      }
    }

    // Files processed
    const filesInConv = messages.filter(
      (m) => m.files && m.files.length > 0
    ).length;
    if (filesInConv > 0) {
      totalFilesProcessed += filesInConv;
      fileUsageByConversation.push(filesInConv);
    } else {
      fileUsageByConversation.push(0);
    }

    // Time to first message
    if (messages.length > 1) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const firstAiMsg = messages.find((m) => m.role === "assistant");
      if (firstUserMsg && firstAiMsg && firstAiMsg.timestamp) {
        const userTime = new Date(
          firstUserMsg.timestamp || conv.createdAt
        ).getTime();
        const aiTime = new Date(firstAiMsg.timestamp).getTime();
        timeToFirstMessage.push((aiTime - userTime) / 1000); // seconds
      }
    }

    // Time between messages
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].timestamp && messages[i - 1].timestamp) {
        const timeDiff =
          new Date(messages[i].timestamp).getTime() -
          new Date(messages[i - 1].timestamp).getTime();
        timeBetweenMessages.push(timeDiff / 1000); // seconds
      }
    }

    // Token usage
    if (conv.metadata && (conv.metadata as any).totalTokens) {
      tokenUsage.push((conv.metadata as any).totalTokens);
    }

    // Model usage
    if (conv.aiModel) {
      models[conv.aiModel] = (models[conv.aiModel] || 0) + 1;
    }

    // Favorite conversations
    if (conv.metadata && (conv.metadata as any).isFavorite) {
      favoriteConversations++;
    }

    // Activity by hour
    const hour = new Date(conv.createdAt).getHours().toString();
    activityByHour[hour] = (activityByHour[hour] || 0) + 1;

    // Activity by day of week
    const dayOfWeek = new Date(conv.createdAt)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    activityByDayOfWeek[dayOfWeek] = (activityByDayOfWeek[dayOfWeek] || 0) + 1;

    // Topics (extract from metadata if available)
    if (conv.metadata && (conv.metadata as any).topic) {
      const topic = (conv.metadata as any).topic;
      topics[topic] = (topics[topic] || 0) + 1;
    }
  }

  // Calculate active days
  const uniqueDays = new Set(
    userConversations.map((c) =>
      new Date(c.createdAt).toISOString().split("T")[0]
    )
  );
  const activeDays = uniqueDays.size;

  // Estimate sessions (group conversations within 1 hour)
  let totalSessions = 0;
  const sessionDurations: number[] = [];
  if (userConversations.length > 0) {
    const sortedConvs = [...userConversations].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let sessionStart = sortedConvs[0].createdAt.getTime();
    let sessionEnd = sessionStart;
    let currentSession = 1;

    for (let i = 1; i < sortedConvs.length; i++) {
      const convTime = sortedConvs[i].createdAt.getTime();
      const timeSinceLastConv = (convTime - sessionEnd) / 1000 / 60; // minutes

      if (timeSinceLastConv < 60) {
        // Same session
        sessionEnd = convTime;
        currentSession++;
      } else {
        // New session
        sessionDurations.push((sessionEnd - sessionStart) / 1000); // seconds
        totalSessions++;
        sessionStart = convTime;
        sessionEnd = convTime;
        currentSession = 1;
      }
    }

    // Add last session
    sessionDurations.push((sessionEnd - sessionStart) / 1000);
    totalSessions++;
  }

  return {
    totalConversations,
    totalMessages,
    totalUserMessages,
    totalAiMessages,
    totalFilesProcessed,
    activeDays,
    totalSessions,
    conversationLengths,
    iterationDepths,
    messageLengths,
    fileUsageByConversation,
    timeToFirstMessage,
    timeBetweenMessages,
    sessionDurations,
    activityByHour,
    activityByDayOfWeek,
    tokenUsage,
    conversationsWithMultipleExchanges,
    favoriteConversations,
    topics,
    models,
  };
}

/**
 * Calculate and store productivity metrics for a user and time period
 */
export async function calculateAndStoreMetrics(
  userId: string,
  periodType: "day" | "week" | "month",
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get raw activity data
  const rawData = await getRawActivityData(userId, periodStart, periodEnd);

  // Calculate metrics
  const metrics = ProductivityCalculator.calculateMetrics(rawData);

  // Prepare data for insertion
  const metricsData: NewUserProductivityMetric = {
    userId,
    periodType,
    periodStart,
    periodEnd,
    totalConversations: metrics.totalConversations,
    totalMessages: metrics.totalMessages,
    totalUserMessages: metrics.totalUserMessages,
    totalAiMessages: metrics.totalAiMessages,
    totalFilesProcessed: metrics.totalFilesProcessed,
    activeDays: metrics.activeDays,
    totalSessions: metrics.totalSessions,
    avgConversationLength: metrics.avgConversationLength,
    avgIterationDepth: metrics.avgIterationDepth,
    complexityScore: metrics.complexityScore,
    conversationDiversity: metrics.conversationDiversity,
    avgTimeToFirstMessage: metrics.avgTimeToFirstMessage,
    avgTimeBetweenMessages: metrics.avgTimeBetweenMessages,
    avgSessionDuration: metrics.avgSessionDuration,
    peakActivityHour: metrics.peakActivityHour,
    tokenEfficiency: metrics.tokenEfficiency,
    avgMessagesPerConversation: metrics.avgMessagesPerConversation,
    fileProcessingRate: metrics.fileProcessingRate,
    conversationCompletionRate: metrics.conversationCompletionRate,
    favoriteConversations: metrics.favoriteConversations,
    productivityScore: metrics.productivityScore,
    activityByDayOfWeek: metrics.activityByDayOfWeek,
    activityByHour: metrics.activityByHour,
    topicBreakdown: metrics.topicBreakdown,
    modelUsage: metrics.modelUsage,
  };

  // Upsert metrics (insert or update if exists)
  await db
    .insert(userProductivityMetrics)
    .values(metricsData)
    .onConflictDoUpdate({
      target: [
        userProductivityMetrics.userId,
        userProductivityMetrics.periodType,
        userProductivityMetrics.periodStart,
      ],
      set: {
        ...metricsData,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get productivity metrics for a user and period
 */
export async function getProductivityMetrics(
  userId: string,
  periodType: "day" | "week" | "month",
  periodStart: Date
) {
  const result = await db
    .select()
    .from(userProductivityMetrics)
    .where(
      and(
        eq(userProductivityMetrics.userId, userId),
        eq(userProductivityMetrics.periodType, periodType),
        eq(userProductivityMetrics.periodStart, periodStart)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get productivity metrics for a date range
 */
export async function getProductivityMetricsRange(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .select()
    .from(userProductivityMetrics)
    .where(
      and(
        eq(userProductivityMetrics.userId, userId),
        gte(userProductivityMetrics.periodStart, startDate),
        lte(userProductivityMetrics.periodEnd, endDate)
      )
    )
    .orderBy(desc(userProductivityMetrics.periodStart));
}

/**
 * Calculate and store daily snapshot
 */
export async function calculateDailySnapshot(
  userId: string,
  snapshotDate: Date
): Promise<void> {
  // Get start and end of day
  const dayStart = new Date(snapshotDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(snapshotDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Get conversations for the day
  const dayConversations = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        gte(conversations.createdAt, dayStart),
        lte(conversations.createdAt, dayEnd)
      )
    );

  // Calculate daily metrics
  let messagesCreated = 0;
  let filesProcessed = 0;
  const activityByHour: {
    [hour: string]: {
      messages: number;
      conversations: number;
      activeMinutes: number;
    };
  } = {};
  const modelsUsed: {
    [model: string]: {
      conversations: number;
      messages: number;
      tokensUsed: number;
    };
  } = {};

  for (const conv of dayConversations) {
    const messages = (conv.messages as any[]) || [];
    messagesCreated += messages.length;

    // Count files
    const filesInConv = messages.filter(
      (m) => m.files && m.files.length > 0
    ).length;
    filesProcessed += filesInConv;

    // Activity by hour
    const hour = new Date(conv.createdAt).getHours().toString();
    if (!activityByHour[hour]) {
      activityByHour[hour] = {
        messages: 0,
        conversations: 0,
        activeMinutes: 0,
      };
    }
    activityByHour[hour].messages += messages.length;
    activityByHour[hour].conversations += 1;

    // Model usage
    if (conv.aiModel) {
      if (!modelsUsed[conv.aiModel]) {
        modelsUsed[conv.aiModel] = {
          conversations: 0,
          messages: 0,
          tokensUsed: 0,
        };
      }
      modelsUsed[conv.aiModel].conversations += 1;
      modelsUsed[conv.aiModel].messages += messages.length;
      if (conv.metadata && (conv.metadata as any).totalTokens) {
        modelsUsed[conv.aiModel].tokensUsed += (conv.metadata as any).totalTokens;
      }
    }
  }

  // Estimate sessions and active time
  const activeSessions = Math.max(Math.ceil(dayConversations.length / 3), 1);
  const totalActiveTime = activeSessions * 20 * 60; // estimate 20 minutes per session

  // Calculate daily scores
  const scores = ProductivityCalculator.calculateDailyScore({
    messagesCreated,
    conversationsCreated: dayConversations.length,
    filesProcessed,
    activeSessions,
    totalActiveTime,
  });

  // Determine if day is complete (not today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isComplete = snapshotDate < today ? 1 : 0;

  // Prepare snapshot data
  const snapshotData: NewProductivitySnapshot = {
    userId,
    snapshotDate: dayStart,
    conversationsCreated: dayConversations.length,
    messagesCreated,
    filesProcessed,
    activeSessions,
    totalActiveTime,
    dailyActivityScore: scores.dailyActivityScore,
    dailyEngagementScore: scores.dailyEngagementScore,
    dailyEfficiencyScore: scores.dailyEfficiencyScore,
    dailyValueScore: scores.dailyValueScore,
    dailyProductivityScore: scores.dailyProductivityScore,
    activityByHour,
    modelsUsed,
    isComplete,
  };

  // Upsert snapshot
  await db
    .insert(productivitySnapshots)
    .values(snapshotData)
    .onConflictDoUpdate({
      target: [
        productivitySnapshots.userId,
        productivitySnapshots.snapshotDate,
      ],
      set: {
        ...snapshotData,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get daily snapshots for a date range
 */
export async function getDailySnapshots(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .select()
    .from(productivitySnapshots)
    .where(
      and(
        eq(productivitySnapshots.userId, userId),
        gte(productivitySnapshots.snapshotDate, startDate),
        lte(productivitySnapshots.snapshotDate, endDate)
      )
    )
    .orderBy(desc(productivitySnapshots.snapshotDate));
}

/**
 * Get productivity dashboard data for a user
 */
export async function getProductivityDashboard(
  userId: string,
  period: "week" | "month" = "week"
) {
  const now = new Date();
  const startDate = new Date(now);

  if (period === "week") {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setMonth(now.getMonth() - 1);
  }

  // Get daily snapshots
  const snapshots = await getDailySnapshots(userId, startDate, now);

  // Get period metrics
  const periodMetrics = await getProductivityMetrics(userId, period, startDate);

  // Calculate trends
  const trendDays = period === "week" ? 7 : 30;
  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(startDate.getDate() - trendDays);

  const previousSnapshots = await getDailySnapshots(
    userId,
    previousPeriodStart,
    startDate
  );

  // Calculate average scores
  const currentAvgScore =
    snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.dailyProductivityScore, 0) /
        snapshots.length
      : 0;

  const previousAvgScore =
    previousSnapshots.length > 0
      ? previousSnapshots.reduce((sum, s) => sum + s.dailyProductivityScore, 0) /
        previousSnapshots.length
      : 0;

  const trend =
    previousAvgScore > 0
      ? ((currentAvgScore - previousAvgScore) / previousAvgScore) * 100
      : 0;

  return {
    currentPeriod: {
      metrics: periodMetrics,
      snapshots,
      avgProductivityScore: currentAvgScore,
    },
    previousPeriod: {
      snapshots: previousSnapshots,
      avgProductivityScore: previousAvgScore,
    },
    trend: {
      percentage: trend,
      direction: trend > 0 ? "up" : trend < 0 ? "down" : "stable",
    },
  };
}

/**
 * Background job: Calculate metrics for all users for yesterday
 */
export async function calculateMetricsForAllUsers(date?: Date): Promise<void> {
  const targetDate = date || new Date();
  targetDate.setDate(targetDate.getDate() - 1); // Yesterday
  targetDate.setHours(0, 0, 0, 0);

  // Get all active users (users with conversations in the last 30 days)
  const thirtyDaysAgo = new Date(targetDate);
  thirtyDaysAgo.setDate(targetDate.getDate() - 30);

  const activeUsers = await db
    .selectDistinct({ userId: conversations.userId })
    .from(conversations)
    .where(gte(conversations.createdAt, thirtyDaysAgo));

  // Calculate daily snapshot for each user
  for (const { userId } of activeUsers) {
    try {
      await calculateDailySnapshot(userId, targetDate);
    } catch (error) {
      console.error(
        `[Productivity] Error calculating snapshot for user ${userId}:`,
        error
      );
    }
  }

  // Calculate weekly metrics (if it's Sunday)
  if (targetDate.getDay() === 0) {
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - 6);

    for (const { userId } of activeUsers) {
      try {
        await calculateAndStoreMetrics(userId, "week", weekStart, targetDate);
      } catch (error) {
        console.error(
          `[Productivity] Error calculating weekly metrics for user ${userId}:`,
          error
        );
      }
    }
  }

  // Calculate monthly metrics (if it's the last day of the month)
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(targetDate.getDate() + 1);
  if (tomorrow.getDate() === 1) {
    const monthStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    );

    for (const { userId } of activeUsers) {
      try {
        await calculateAndStoreMetrics(userId, "month", monthStart, targetDate);
      } catch (error) {
        console.error(
          `[Productivity] Error calculating monthly metrics for user ${userId}:`,
          error
        );
      }
    }
  }
}
