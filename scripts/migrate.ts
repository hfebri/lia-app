#!/usr/bin/env tsx

import { runMigrations } from "../lib/db/migrate";

async function main() {
  try {
    console.log("🔄 Running database migrations...");
    await runMigrations();
    console.log("🎉 All migrations completed successfully!");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

main();
