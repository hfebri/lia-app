import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  getProductivityDashboard,
  getDailySnapshots,
  getProductivityMetricsRange,
} from "@/lib/db/queries/productivity";

/**
 * GET /api/productivity/dashboard
 *
 * Get productivity dashboard data for authenticated user
 *
 * Query params:
 * - period: "week" | "month" (default: "week")
 * - startDate: ISO date string (optional, overrides period)
 * - endDate: ISO date string (optional, overrides period)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get("period") || "week") as "week" | "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Use custom date range if provided, otherwise use period
    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      startDate = new Date(endDate);
      if (period === "week") {
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }
    }

    // Get dashboard data
    const dashboardData = await getProductivityDashboard(userId, period);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          type: period,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        current: dashboardData.currentPeriod,
        previous: dashboardData.previousPeriod,
        trend: dashboardData.trend,
      },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Productivity Dashboard] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch productivity dashboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
