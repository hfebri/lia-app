#!/usr/bin/env tsx

import { runSeed } from "../lib/db/seed";

async function main() {
  try {
    console.log("🚀 Running database seed...");
    await runSeed();
    console.log("🎉 All seed data inserted successfully!");
  } catch (error) {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  }
}

main();
