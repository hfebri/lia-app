import { NextRequest, NextResponse } from "next/server";
import { collectDailyMetrics } from "@/lib/jobs/collect-daily-metrics";
import { getCronSecret } from "@/lib/utils/cron-secret";

export async function GET(request: NextRequest) {
  try {
    // Scheduled jobs must include an Authorization header with the CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedSecret = getCronSecret();

    // Must have Bearer token matching generated CRON_SECRET
    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error("[Cron API] Unauthorized request - invalid or missing Authorization header");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await collectDailyMetrics();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Cron API] Failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
