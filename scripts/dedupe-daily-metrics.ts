import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

async function dedupeDailyMetrics() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const client = postgres(baseUrl, { prepare: false, max: 1 });

  try {
    console.log("Starting deduplication of daily_metrics table...\n");

    // First, check for duplicates
    const duplicates = await client`
      SELECT
        date,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as ids
      FROM daily_metrics
      GROUP BY date
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `;

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found! Table is clean.");
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate date(s). Removing duplicates...\n`);

    let totalRemoved = 0;

    for (const dup of duplicates) {
      console.log(`Processing date: ${dup.date} (${dup.count} records)`);

      // Keep the most recent record (first in the ordered array)
      const keepId = dup.ids[0];
      const deleteIds = dup.ids.slice(1);

      console.log(`  Keeping ID: ${keepId}`);
      console.log(`  Deleting IDs: ${deleteIds.join(", ")}`);

      // Delete the duplicates
      const result = await client`
        DELETE FROM daily_metrics
        WHERE date = ${dup.date}
        AND id = ANY(${deleteIds})
      `;

      console.log(`  ✓ Removed ${result.count} duplicate record(s)\n`);
      totalRemoved += result.count;
    }

    console.log("=" .repeat(60));
    console.log(`✅ Deduplication complete!`);
    console.log(`   Total duplicates removed: ${totalRemoved}`);
    console.log(`   Duplicate dates processed: ${duplicates.length}`);
    console.log("\nYou can now safely add the UNIQUE constraint:");
    console.log("ALTER TABLE daily_metrics ADD CONSTRAINT daily_metrics_date_unique UNIQUE(date);\n");

  } catch (error: any) {
    console.error("❌ Error during deduplication:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dedupeDailyMetrics();
