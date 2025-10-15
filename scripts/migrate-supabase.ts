import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("🚀 Starting Supabase migration...\n");

  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    // Step 1: Apply fresh schema
    console.log("📋 Step 1: Creating schema...");
    const schemaSql = readFileSync(
      resolve(__dirname, "migrate-fresh.sql"),
      "utf-8"
    );
    await sql.unsafe(schemaSql);
    console.log("✅ Schema created successfully\n");

    // Step 2: Import users
    console.log("👥 Step 2: Importing users...");
    const usersSql = readFileSync(
      "/Users/leverate/Downloads/users_rows.sql",
      "utf-8"
    );
    await sql.unsafe(usersSql);
    const usersCount = await sql`SELECT COUNT(*) FROM users`;
    console.log(`✅ Imported ${usersCount[0].count} users\n`);

    // Step 3: Import conversations
    console.log("💬 Step 3: Importing conversations...");
    const conversationsSql = readFileSync(
      "/Users/leverate/Downloads/conversations_rows_clean.sql",
      "utf-8"
    );
    await sql.unsafe(conversationsSql);
    const conversationsCount =
      await sql`SELECT COUNT(*) FROM conversations`;
    console.log(
      `✅ Imported ${conversationsCount[0].count} conversations\n`
    );

    // Step 4: Import daily_metrics
    console.log("📊 Step 4: Importing daily metrics...");
    const metricsSql = readFileSync(
      "/Users/leverate/Downloads/daily_metrics_rows.sql",
      "utf-8"
    );
    await sql.unsafe(metricsSql);
    const metricsCount = await sql`SELECT COUNT(*) FROM daily_metrics`;
    console.log(`✅ Imported ${metricsCount[0].count} daily metrics\n`);

    // Step 5: Verify data
    console.log("🔍 Step 5: Verifying data integrity...");
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log("\n📊 Database Tables:");
    for (const table of tables) {
      const count =
        await sql.unsafe(`SELECT COUNT(*) FROM ${table.table_name}`);
      console.log(`   - ${table.table_name}: ${count[0].count} rows`);
    }

    console.log("\n✨ Migration completed successfully!");
    console.log(
      "\n📝 Next steps:"
    );
    console.log(
      "   1. Test the application: npm run dev"
    );
    console.log(
      "   2. Verify authentication works"
    );
    console.log(
      "   3. Check that conversations load correctly"
    );
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
