import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

async function reset() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log("🗑️  Dropping all tables...");
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO postgres`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    console.log("✅ Database reset successfully");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

reset();
