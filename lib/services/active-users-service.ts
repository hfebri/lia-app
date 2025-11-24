import { db } from "@/db/db";
import { userSessions, dailyMetrics } from "@/db/schema/analytics";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { format } from "date-fns";

interface ActiveUserMetrics {
  realTimeActive: number;
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  timestamp: Date;
}

interface ActiveUserTrends {
  realTime: number;
  daily: number;
  weekly: number;
  monthly: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export class ActiveUsersService {
  /**
   * Update user session or create new one
   */
  static async updateUserSession(
    userId: string,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const now = new Date();

    // Try to update existing session
    // IMPORTANT: Update userId too in case user changed (logout/login on same browser)
    const updated = await db
      .update(userSessions)
      .set({
        userId, // Update userId to handle account switching
        lastSeenAt: now,
        isActive: true,
        userAgent: userAgent || undefined,
        ipAddress: ipAddress || undefined,
      })
      .where(eq(userSessions.sessionId, sessionId))
      .returning({ id: userSessions.id });

    // If no session found, create new one
    if (updated.length === 0) {
      // Determine device type from user agent (simple heuristic)
      let deviceType = "desktop";
      if (userAgent) {
        const ua = userAgent.toLowerCase();
        if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
          deviceType = "mobile";
        } else if (ua.includes("ipad") || ua.includes("tablet")) {
          deviceType = "tablet";
        }
      }

      await db.insert(userSessions).values({
        userId,
        sessionId,
        lastSeenAt: now,
        userAgent,
        ipAddress,
        deviceType,
        isActive: true,
      });
    }
  }

  /**
   * Get active user metrics with caching
   */
  static async getActiveUserMetrics(): Promise<ActiveUserMetrics> {
    const cacheKey = "active_user_metrics";
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [realTime, daily, weekly, monthly] = await Promise.all([
      db
        .select({ count: sql<number>`count(distinct ${userSessions.userId})` })
        .from(userSessions)
        .where(gte(userSessions.lastSeenAt, fifteenMinutesAgo)),
      db
        .select({ count: sql<number>`count(distinct ${userSessions.userId})` })
        .from(userSessions)
        .where(gte(userSessions.lastSeenAt, twentyFourHoursAgo)),
      db
        .select({ count: sql<number>`count(distinct ${userSessions.userId})` })
        .from(userSessions)
        .where(gte(userSessions.lastSeenAt, sevenDaysAgo)),
      db
        .select({ count: sql<number>`count(distinct ${userSessions.userId})` })
        .from(userSessions)
        .where(gte(userSessions.lastSeenAt, thirtyDaysAgo)),
    ]);

    const metrics = {
      realTimeActive: Number(realTime[0]?.count || 0),
      dailyActive: Number(daily[0]?.count || 0),
      weeklyActive: Number(weekly[0]?.count || 0),
      monthlyActive: Number(monthly[0]?.count || 0),
      timestamp: now,
    };

    // Cache for 60 seconds
    cache.set(cacheKey, {
      data: metrics,
      expiresAt: Date.now() + 60 * 1000,
    });

    return metrics;
  }

  /**
   * Calculate trends based on historical data
   * Compares current live metrics to yesterday's stored snapshot
   */
  static async getTrends(currentMetrics: ActiveUserMetrics): Promise<ActiveUserTrends> {
    // Cache key must include current metrics to ensure accurate trend calculations
    // Format: "trends:realTime-daily-weekly-monthly"
    const cacheKey = `trends:${currentMetrics.realTimeActive}-${currentMetrics.dailyActive}-${currentMetrics.weeklyActive}-${currentMetrics.monthlyActive}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Get yesterday's snapshot from dailyMetrics table
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, "yyyy-MM-dd");

    const history = await db
      .select()
      .from(dailyMetrics)
      .where(eq(dailyMetrics.date, yesterdayStr))
      .limit(1);

    // If we don't have yesterday's data, return 0 trends
    if (history.length === 0) {
      return { realTime: 0, daily: 0, weekly: 0, monthly: 0 };
    }

    const yesterdayMetrics = history[0];

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Compare current live metrics to yesterday's snapshot (taken at midnight)
    // This gives us "change from yesterday" for all metrics
    const trends = {
      realTime: calculateTrend(currentMetrics.realTimeActive, yesterdayMetrics.realTimeActiveUsers || 0),
      daily: calculateTrend(currentMetrics.dailyActive, yesterdayMetrics.dailyActiveUsers || 0),
      weekly: calculateTrend(currentMetrics.weeklyActive, yesterdayMetrics.weeklyActiveUsers || 0),
      monthly: calculateTrend(currentMetrics.monthlyActive, yesterdayMetrics.monthlyActiveUsers || 0),
    };

    // Cache for 1 minute (short cache to stay fresh with 60s heartbeat interval)
    cache.set(cacheKey, {
      data: trends,
      expiresAt: Date.now() + 60 * 1000,
    });

    return trends;
  }

  /**
   * Cleanup old sessions (older than 30 days)
   */
  static async cleanupOldSessions() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await db
      .delete(userSessions)
      .where(sql`${userSessions.lastSeenAt} < ${thirtyDaysAgo}`);
  }
}

