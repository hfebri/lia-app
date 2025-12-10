import { db } from "../../../db/db";
import { dailyMetrics } from "../../../db/schema";
import { eq } from "drizzle-orm";
import type { NewDailyMetrics } from "../../../db/types";

export async function seedAnalytics() {
  try {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Check if today's metrics already exist
    const existingMetrics = await db
      .select()
      .from(dailyMetrics)
      .where(eq(dailyMetrics.date, today))
      .limit(1);

    if (existingMetrics.length === 0) {
      // Create initial daily metrics for today
      const initialMetrics: NewDailyMetrics = {
        date: today,
        totalUsers: 0,
        activeUsers: 0,
        totalConversations: 0,
        totalMessages: 0,
        totalTokensUsed: 0,
        popularTopics: null,
        modelUsage: null,
        createdAt: new Date(),
      };

      await db.insert(dailyMetrics).values(initialMetrics);

    } else {

    }

    // Create a few historical daily metrics entries for demo purposes
    const historicalDays = 7;
    for (let i = 1; i <= historicalDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      const existing = await db
        .select()
        .from(dailyMetrics)
        .where(eq(dailyMetrics.date, dateString))
        .limit(1);

      if (existing.length === 0) {
        // Generate sample data for historical metrics
        const sampleMetrics: NewDailyMetrics = {
          date: dateString,
          totalUsers: Math.floor(Math.random() * 10) + 1, // 1-10 users
          activeUsers: Math.floor(Math.random() * 5) + 1, // 1-5 active users
          totalConversations: Math.floor(Math.random() * 20) + 1, // 1-20 conversations
          totalMessages: Math.floor(Math.random() * 100) + 10, // 10-110 messages
          totalTokensUsed: Math.floor(Math.random() * 10000) + 1000, // 1000-11000 tokens
          popularTopics: [
            {
              topic: "general assistance",
              count: Math.floor(Math.random() * 10) + 1,
            },
            { topic: "programming", count: Math.floor(Math.random() * 8) + 1 },
            { topic: "writing", count: Math.floor(Math.random() * 6) + 1 },
          ],
          modelUsage: {
            "gpt-5": Math.floor(Math.random() * 50) + 10,
            "gpt-5-mini": Math.floor(Math.random() * 30) + 5,
            "anthropic/claude-4-sonnet": Math.floor(Math.random() * 20) + 2,
          },
          createdAt: new Date(),
        };

        await db.insert(dailyMetrics).values(sampleMetrics);

      }
    }
  } catch (error) {
    throw error;
  }
}
