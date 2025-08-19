import { config } from "dotenv";
import { seedUsers } from "./seeds/users";
import { seedTemplates } from "./seeds/templates";
import { seedAnalytics } from "./seeds/analytics";

// Load environment variables
config({ path: ".env.local" });

export async function runSeed() {
  const startTime = Date.now();

  console.log("🌱 Starting database seeding...");
  console.log("=====================================");

  try {
    // Seed in order: users first, then templates (which depend on users), then analytics
    await seedUsers();
    console.log("");

    await seedTemplates();
    console.log("");

    await seedAnalytics();
    console.log("");

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=====================================");
    console.log(`🎉 Database seeding completed successfully in ${duration}s!`);
    console.log("=====================================");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

// If this file is run directly
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("Seed process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed process failed:", error);
      process.exit(1);
    });
}
