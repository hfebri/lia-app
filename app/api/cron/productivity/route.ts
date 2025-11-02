import { NextRequest, NextResponse } from "next/server";
import { calculateMetricsForAllUsers } from "@/lib/db/queries/productivity";

/**
 * POST /api/cron/productivity
 *
 * Background job to calculate productivity metrics for all users
 * Should be called daily by a cron scheduler (Vercel Cron, Supabase pg_cron, etc.)
 *
 * Authorization: Bearer token via CRON_SECRET environment variable
 *
 * Query params:
 * - date: ISO date string (optional, defaults to yesterday)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Productivity Cron] CRON_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Productivity Cron] Invalid authorization");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get date from query params or default to yesterday
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : undefined;

    // Calculate metrics for all users
    await calculateMetricsForAllUsers(targetDate);

    return NextResponse.json({
      success: true,
      message: "Productivity metrics calculated for all users",
      date: targetDate
        ? targetDate.toISOString().split("T")[0]
        : new Date(Date.now() - 86400000).toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("[Productivity Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate productivity metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
