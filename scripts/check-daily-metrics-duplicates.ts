import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkDuplicates() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const client = postgres(baseUrl, { prepare: false, max: 1 });

  try {
    console.log("Checking for duplicate dates in daily_metrics table...\n");

    // Find duplicate dates
    const duplicates = await client`
      SELECT
        date,
        COUNT(*) as count,
        ARRAY_AGG(id) as ids,
        ARRAY_AGG(created_at) as created_at_times
      FROM daily_metrics
      GROUP BY date
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `;

    if (duplicates.length === 0) {
      console.log("✅ No duplicate dates found! The UNIQUE constraint can be safely applied.");
      process.exit(0);
    }

    console.log(`❌ Found ${duplicates.length} duplicate date(s):\n`);

    duplicates.forEach((dup) => {
      console.log(`Date: ${dup.date}`);
      console.log(`  Count: ${dup.count}`);
      console.log(`  IDs: ${dup.ids.join(", ")}`);
      console.log(`  Created times: ${dup.created_at_times.map((t: Date) => t.toISOString()).join(", ")}`);
      console.log();
    });

    console.log("⚠️  The UNIQUE constraint will FAIL until duplicates are removed.");
    console.log("Run the dedupe script to fix this: npm run dedupe-daily-metrics\n");

    process.exit(1);
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDuplicates();
