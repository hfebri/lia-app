import { config } from "dotenv";
import { seedUsers } from "./seeds/users";
import { seedAnalytics } from "./seeds/analytics";

// Load environment variables
config({ path: ".env.local" });

export async function runSeed() {
  const startTime = Date.now();
  try {
    // Seed in order: users first, then analytics
    await seedUsers();
    await seedAnalytics();
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
  } catch (error) {
    throw error;
  }
}

// If this file is run directly
if (require.main === module) {
  runSeed()
    .then(() => {

      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}
