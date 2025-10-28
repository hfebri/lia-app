import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  getProductivityMetrics,
  getProductivityMetricsRange,
  calculateAndStoreMetrics,
} from "@/lib/db/queries/productivity";

/**
 * GET /api/productivity/metrics
 *
 * Get detailed productivity metrics for authenticated user
 *
 * Query params:
 * - periodType: "day" | "week" | "month"
 * - startDate: ISO date string (required for specific period)
 * - endDate: ISO date string (optional, for range queries)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const periodType = searchParams.get("periodType") as
      | "day"
      | "week"
      | "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!periodType || !startDateParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: periodType and startDate",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);

    // If endDate provided, return range of metrics
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      const metrics = await getProductivityMetricsRange(
        userId,
        startDate,
        endDate
      );

      return NextResponse.json({
        success: true,
        data: metrics,
      });
    }

    // Otherwise, return single period metrics
    const metrics = await getProductivityMetrics(userId, periodType, startDate);

    if (!metrics) {
      return NextResponse.json(
        {
          success: false,
          error: "Metrics not found for this period",
          hint: "Metrics may not have been calculated yet. Try triggering a recalculation.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Productivity Metrics] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch productivity metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/metrics
 *
 * Manually trigger metrics calculation for a period
 *
 * Body:
 * - periodType: "day" | "week" | "month"
 * - periodStart: ISO date string
 * - periodEnd: ISO date string
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const body = await request.json();

    const { periodType, periodStart, periodEnd } = body;

    if (!periodType || !periodStart || !periodEnd) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: periodType, periodStart, and periodEnd",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Calculate and store metrics
    await calculateAndStoreMetrics(userId, periodType, startDate, endDate);

    // Fetch the newly calculated metrics
    const metrics = await getProductivityMetrics(userId, periodType, startDate);

    return NextResponse.json({
      success: true,
      message: "Metrics calculated successfully",
      data: metrics,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Productivity Metrics] Calculation error:", error);
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
