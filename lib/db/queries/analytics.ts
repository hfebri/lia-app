import { eq, desc, asc, count, and, sql, between, gte, lte } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  analytics,
  dailyMetrics,
  users,
  conversations,
} from "../../../db/schema";
import type {
  Analytics,
  NewAnalytics,
  DailyMetrics,
  NewDailyMetrics,
  PaginationParams,
} from "../../../db/types";

// Create analytics event
export async function createAnalyticsEvent(
  eventData: NewAnalytics
): Promise<Analytics> {
  const result = await db
    .insert(analytics)
    .values({
      ...eventData,
      timestamp: new Date(),
    })
    .returning();
  return result[0];
}

// Get analytics events by user
export async function getAnalyticsByUser(
  userId: string,
  params: PaginationParams = {}
): Promise<{
  events: Analytics[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(analytics.timestamp) : desc(analytics.timestamp);

  const [eventList, totalCount] = await Promise.all([
    db
      .select()
      .from(analytics)
      .where(eq(analytics.userId, userId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(analytics)
      .where(eq(analytics.userId, userId)),
  ]);

  return {
    events: eventList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get analytics events by type
export async function getAnalyticsByEventType(
  eventType: string,
  params: PaginationParams = {}
): Promise<{
  events: Analytics[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(analytics.timestamp) : desc(analytics.timestamp);

  const [eventList, totalCount] = await Promise.all([
    db
      .select()
      .from(analytics)
      .where(eq(analytics.eventType, eventType))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(analytics)
      .where(eq(analytics.eventType, eventType)),
  ]);

  return {
    events: eventList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get analytics events by date range
export async function getAnalyticsByDateRange(
  startDate: Date,
  endDate: Date,
  params: PaginationParams = {}
): Promise<{
  events: Analytics[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page = 1, limit = 100, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(analytics.timestamp) : desc(analytics.timestamp);

  const [eventList, totalCount] = await Promise.all([
    db
      .select()
      .from(analytics)
      .where(between(analytics.timestamp, startDate, endDate))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(analytics)
      .where(between(analytics.timestamp, startDate, endDate)),
  ]);

  return {
    events: eventList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Create or update daily metrics
export async function createOrUpdateDailyMetrics(
  date: string,
  metricsData: Partial<NewDailyMetrics>
): Promise<DailyMetrics> {
  // Try to update existing record first
  const existing = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.date, date))
    .limit(1);

  if (existing.length > 0) {
    const result = await db
      .update(dailyMetrics)
      .set(metricsData)
      .where(eq(dailyMetrics.date, date))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(dailyMetrics)
      .values({
        date,
        ...metricsData,
        createdAt: new Date(),
      })
      .returning();
    return result[0];
  }
}

// Get daily metrics by date
export async function getDailyMetricsByDate(
  date: string
): Promise<DailyMetrics | null> {
  const result = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.date, date))
    .limit(1);
  return result[0] || null;
}

// Get daily metrics by date range
export async function getDailyMetricsByDateRange(
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  return db
    .select()
    .from(dailyMetrics)
    .where(between(dailyMetrics.date, startDate, endDate))
    .orderBy(asc(dailyMetrics.date));
}

// Get event counts by type for a date range
export async function getEventCountsByType(
  startDate: Date,
  endDate: Date
): Promise<{ eventType: string; count: number }[]> {
  const result = await db
    .select({
      eventType: analytics.eventType,
      count: count(),
    })
    .from(analytics)
    .where(between(analytics.timestamp, startDate, endDate))
    .groupBy(analytics.eventType)
    .orderBy(desc(count()));

  return result;
}

// Get active users count for a date
export async function getActiveUsersForDate(date: Date): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .selectDistinct({ userId: analytics.userId })
    .from(analytics)
    .where(
      and(
        between(analytics.timestamp, startOfDay, endOfDay),
        sql`${analytics.userId} IS NOT NULL`
      )
    );

  return result.length;
}

// Get popular topics/keywords from analytics
export async function getPopularTopics(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<{ topic: string; count: number }[]> {
  // This would analyze event data to extract popular topics
  // For now, return empty array - would need to implement text analysis
  return [];
}

// Track user session analytics
export async function trackUserSession(
  userId: string,
  sessionId: string,
  eventType: string,
  eventData?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<Analytics> {
  return createAnalyticsEvent({
    userId,
    sessionId,
    eventType,
    eventData,
    ipAddress,
    userAgent,
  });
}

// Get user activity summary
export async function getUserActivitySummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalEvents: number;
  eventsByType: { eventType: string; count: number }[];
  activeDays: number;
}> {
  const [totalEvents, eventsByType, activeDaysResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(analytics)
      .where(
        and(
          eq(analytics.userId, userId),
          between(analytics.timestamp, startDate, endDate)
        )
      ),
    db
      .select({
        eventType: analytics.eventType,
        count: count(),
      })
      .from(analytics)
      .where(
        and(
          eq(analytics.userId, userId),
          between(analytics.timestamp, startDate, endDate)
        )
      )
      .groupBy(analytics.eventType)
      .orderBy(desc(count())),
    db
      .selectDistinct({
        date: sql<string>`DATE(${analytics.timestamp})`,
      })
      .from(analytics)
      .where(
        and(
          eq(analytics.userId, userId),
          between(analytics.timestamp, startDate, endDate)
        )
      ),
  ]);

  return {
    totalEvents: totalEvents[0].count,
    eventsByType,
    activeDays: activeDaysResult.length,
  };
}

// Generate comprehensive daily metrics
export async function generateDailyMetrics(
  date: string
): Promise<DailyMetrics> {
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    totalUsersResult,
    activeUsersResult,
    totalConversationsResult,
    totalMessagesResult,
  ] = await Promise.all([
    // Total users up to this date
    db
      .select({ count: count() })
      .from(users)
      .where(lte(users.createdAt, endOfDay)),

    // Active users for this day
    db
      .selectDistinct({ userId: analytics.userId })
      .from(analytics)
      .where(
        and(
          between(analytics.timestamp, startOfDay, endOfDay),
          sql`${analytics.userId} IS NOT NULL`
        )
      ),

    // Total conversations up to this date
    db
      .select({ count: count() })
      .from(conversations)
      .where(lte(conversations.createdAt, endOfDay)),

    // Total messages up to this date (count from JSONB arrays)
    db
      .select({
        count: sql<number>`COALESCE(SUM(jsonb_array_length(${conversations.messages})), 0)`,
      })
      .from(conversations)
      .where(lte(conversations.createdAt, endOfDay)),
  ]);

  const metricsData: Partial<NewDailyMetrics> = {
    totalUsers: totalUsersResult[0].count,
    activeUsers: activeUsersResult.length,
    totalConversations: totalConversationsResult[0].count,
    totalMessages: totalMessagesResult[0].count || 0,
    totalTokensUsed: 0, // Would be calculated from messages metadata
    popularTopics: null, // Would be generated from text analysis
    modelUsage: null, // Would be calculated from conversation data
  };

  return createOrUpdateDailyMetrics(date, metricsData);
}

// Get analytics dashboard data
export async function getAnalyticsDashboardData(
  startDate: Date,
  endDate: Date
): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  topEventTypes: { eventType: string; count: number }[];
  dailyMetrics: DailyMetrics[];
}> {
  const [
    totalUsers,
    activeUsers,
    totalConversations,
    totalMessages,
    topEventTypes,
    dailyMetrics,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db
      .selectDistinct({ userId: analytics.userId })
      .from(analytics)
      .where(
        and(
          between(analytics.timestamp, startDate, endDate),
          sql`${analytics.userId} IS NOT NULL`
        )
      ),
    db.select({ count: count() }).from(conversations),
    // Count total messages from JSONB arrays
    db.select({
      count: sql<number>`COALESCE(SUM(jsonb_array_length(${conversations.messages})), 0)`,
    }).from(conversations),
    getEventCountsByType(startDate, endDate),
    getDailyMetricsByDateRange(
      startDate.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0]
    ),
  ]);

  const averageMessagesPerConversation =
    totalConversations[0].count > 0
      ? Math.round(
          (totalMessages[0].count / totalConversations[0].count) * 100
        ) / 100
      : 0;

  return {
    totalUsers: totalUsers[0].count,
    activeUsers: activeUsers.length,
    totalConversations: totalConversations[0].count,
    totalMessages: totalMessages[0].count,
    averageMessagesPerConversation,
    topEventTypes: topEventTypes.slice(0, 10),
    dailyMetrics,
  };
}
