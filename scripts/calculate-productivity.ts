/**
 * Script to manually calculate productivity metrics
 *
 * Usage: npx tsx scripts/calculate-productivity.ts
 */

import { calculateDailySnapshot } from "@/lib/db/queries/productivity";

async function main() {
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`Calculating productivity metrics for ${today.toISOString().split('T')[0]}...`);

  // List of user IDs from your database
  const userIds = [
    "1ae3139a-d643-4cba-b884-41899efe94e5", // hogasan
    "e695a2fe-4190-4895-ac87-de6fa6645ad3", // fauzan
    "f45e9184-c63b-4ebd-a35b-0d4016175800", // dylan
    "09c0d5fc-7e2a-4c0c-8bbd-973dfb07ee87", // skinanti
    "10bfa933-49b9-4218-9597-ebe3a51d2a48", // kmaharani
  ];

  for (const userId of userIds) {
    try {
      console.log(`  Processing user ${userId}...`);
      await calculateDailySnapshot(userId, today);
      console.log(`  ✓ Success`);
    } catch (error) {
      console.error(`  ✗ Error for ${userId}:`, error);
    }
  }

  console.log("\n✅ Done! Productivity metrics calculated.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
