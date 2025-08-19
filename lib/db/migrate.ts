import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.local" });

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🚀 Starting database migrations...");

  // Create connection for migrations
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    // Run migrations
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("✅ Database migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    // Close the connection
    await migrationClient.end();
  }
}

export { runMigrations };

// If this file is run directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migration process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration process failed:", error);
      process.exit(1);
    });
}
