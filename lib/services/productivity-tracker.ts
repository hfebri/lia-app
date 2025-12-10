import { calculateDailySnapshot } from "@/lib/db/queries/productivity";

/**
 * Productivity Tracker Service
 *
 * Tracks user activity for productivity metrics.
 * All tracking is asynchronous and non-blocking.
 */

export class ProductivityTracker {
  /**
   * Track a conversation creation event
   * This runs asynchronously and doesn't block the response
   */
  static trackConversationCreated(userId: string): void {
    // Run asynchronously without blocking
    this.updateDailySnapshot(userId).catch((error) => {
      console.error("[Productivity Tracker] Error tracking conversation:", error);
    });
  }

  /**
   * Track a message creation event
   * This runs asynchronously and doesn't block the response
   */
  static trackMessageCreated(userId: string): void {
    // Run asynchronously without blocking
    this.updateDailySnapshot(userId).catch((error) => {
      console.error("[Productivity Tracker] Error tracking message:", error);
    });
  }

  /**
   * Track a file processing event
   * This runs asynchronously and doesn't block the response
   */
  static trackFileProcessed(userId: string): void {
    // Run asynchronously without blocking
    this.updateDailySnapshot(userId).catch((error) => {
      console.error("[Productivity Tracker] Error tracking file:", error);
    });
  }

  /**
   * Update daily snapshot for today
   * This is called internally and runs without blocking
   */
  private static async updateDailySnapshot(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Update today's snapshot
      await calculateDailySnapshot(userId, today);
    } catch (error) {
      console.error("[Productivity Tracker] Error updating snapshot:", error);
      throw error;
    }
  }

  /**
   * Recalculate metrics for a specific date
   * Useful for backfilling or fixing data
   */
  static async recalculateMetrics(
    userId: string,
    date: Date
  ): Promise<void> {
    try {
      await calculateDailySnapshot(userId, date);
    } catch (error) {
      console.error("[Productivity Tracker] Error recalculating metrics:", error);
      throw error;
    }
  }
}
