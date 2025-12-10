import { schedule } from "@netlify/functions";
import { getCronSecret } from "../../lib/utils/cron-secret";

/**
 * Netlify Scheduled Function that runs daily at 00:00 UTC
 * Calls the metrics collection API endpoint with proper authorization
 */
const handler = schedule("0 0 * * *", async () => {
  console.log("[Netlify Scheduler] Running daily metrics collection...");

  try {
    // Get the generated cron secret
    const cronSecret = getCronSecret();

    // Determine the API base URL
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/cron/collect-metrics`;

    console.log(`[Netlify Scheduler] Calling ${apiUrl}`);

    // Call the metrics collection endpoint with authorization
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Netlify Scheduler] Metrics collection failed: ${response.status} ${response.statusText}`,
        errorText
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: `API returned ${response.status}`,
          details: errorText,
        }),
      };
    }

    const result = await response.json();
    console.log("[Netlify Scheduler] Metrics collection completed successfully:", result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result,
      }),
    };
  } catch (error) {
    console.error("[Netlify Scheduler] Error calling metrics API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
});

export { handler };
