/**
 * Test script for the cron metrics collection endpoint
 *
 * This script calls the /api/cron/collect-metrics endpoint with proper
 * authorization to verify it works correctly.
 *
 * Usage:
 *   # Make sure your dev server is running first
 *   npm run dev
 *
 *   # Then in another terminal:
 *   npx tsx scripts/test-cron-endpoint.ts
 *
 *   # Or test production:
 *   npx tsx scripts/test-cron-endpoint.ts https://your-app.netlify.app
 */

import { getCronSecret } from "@/lib/utils/cron-secret";

async function main() {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  const apiUrl = `${baseUrl}/api/cron/collect-metrics`;

  console.log("========================================");
  console.log("Testing Cron Endpoint");
  console.log("========================================\n");

  console.log("API URL:", apiUrl);

  try {
    // Get the generated secret
    const cronSecret = getCronSecret();
    console.log("Using generated cron secret:", cronSecret.substring(0, 8) + "...\n");

    console.log("Calling endpoint...");
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    console.log("Response status:", response.status, response.statusText);

    const data = await response.json();
    console.log("\nResponse body:");
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✓ Success! Metrics collection works correctly.");
    } else {
      console.log("\n✗ Failed! Check the response above for details.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n✗ Error calling endpoint:");
    console.error(error);
    process.exit(1);
  }
}

main();
