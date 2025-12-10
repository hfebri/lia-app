/**
 * Backfill script for daily_metrics table
 *
 * This script populates historical daily_metrics data by running
 * the metrics collection for today. Since metrics are rolling windows,
 * we can only accurately capture today's snapshot.
 *
 * Run this manually if:
 * 1. The cron job failed to run for several days
 * 2. You just set up the metrics system and need initial data
 *
 * Usage:
 *   npx tsx scripts/backfill-daily-metrics.ts
 */

import { collectDailyMetrics } from "@/lib/jobs/collect-daily-metrics";

async function main() {
  console.log("========================================");
  console.log("Daily Metrics Backfill Script");
  console.log("========================================\n");

  try {
    console.log("Running metrics collection...");
    const result = await collectDailyMetrics();

    console.log("\n✓ Success!");
    console.log("Date:", result.date);
    console.log("Metrics collected:", {
      realTimeActive: result.metrics.realTimeActive,
      dailyActive: result.metrics.dailyActive,
      weeklyActive: result.metrics.weeklyActive,
      monthlyActive: result.metrics.monthlyActive,
    });

    console.log("\nNote: This script only creates/updates today's snapshot.");
    console.log("Historical data must be collected daily by the scheduled function.");
  } catch (error) {
    console.error("\n✗ Failed to backfill metrics:");
    console.error(error);
    process.exit(1);
  }
}

main();
