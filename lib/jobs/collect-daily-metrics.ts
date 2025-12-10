import { db } from "@/db/db";
import { dailyMetrics } from "@/db/schema/analytics";
import { users } from "@/db/schema/users";
import { ActiveUsersService } from "@/lib/services/active-users-service";
import { format } from "date-fns";
import { sql } from "drizzle-orm";

export async function collectDailyMetrics() {
  console.log("[Metrics Job] Starting daily metrics collection...");

  try {
    // 1. Get current metrics (these are rolling windows from NOW)
    const metrics = await ActiveUsersService.getActiveUserMetrics();

    // 2. Get total users count
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    // 3. Prepare data for storage
    // IMPORTANT: We store metrics under TODAY's date when the job runs at 00:00 UTC
    // The metrics represent the rolling windows as of this moment (midnight)
    // This creates a daily snapshot we can compare for trends
    const today = new Date();
    const dateStr = format(today, "yyyy-MM-dd");

    // 4. Upsert to database (insert or update if exists for this date)
    // This handles retries/manual runs without creating duplicates
    await db
      .insert(dailyMetrics)
      .values({
        date: dateStr,
        totalUsers,
        activeUsers: metrics.dailyActive, // Legacy field
        realTimeActiveUsers: metrics.realTimeActive,
        dailyActiveUsers: metrics.dailyActive,
        weeklyActiveUsers: metrics.weeklyActive,
        monthlyActiveUsers: metrics.monthlyActive,
        // Other fields default to 0
      })
      .onConflictDoUpdate({
        target: dailyMetrics.date,
        set: {
          totalUsers,
          activeUsers: metrics.dailyActive,
          realTimeActiveUsers: metrics.realTimeActive,
          dailyActiveUsers: metrics.dailyActive,
          weeklyActiveUsers: metrics.weeklyActive,
          monthlyActiveUsers: metrics.monthlyActive,
        },
      });

    // 5. Cleanup old sessions
    await ActiveUsersService.cleanupOldSessions();

    console.log("[Metrics Job] Successfully collected metrics for", dateStr);
    return { success: true, date: dateStr, metrics };
  } catch (error) {
    console.error("[Metrics Job] Failed:", error);
    throw error;
  }
}
