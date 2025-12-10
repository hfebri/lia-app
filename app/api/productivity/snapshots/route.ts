import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  getDailySnapshots,
  calculateDailySnapshot,
} from "@/lib/db/queries/productivity";

/**
 * GET /api/productivity/snapshots
 *
 * Get daily productivity snapshots for authenticated user
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: startDate and endDate",
        },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Get daily snapshots
    const snapshots = await getDailySnapshots(userId, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: snapshots,
      meta: {
        count: snapshots.length,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
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

    console.error("[Productivity Snapshots] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch productivity snapshots",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/snapshots
 *
 * Manually trigger snapshot calculation for a specific date
 *
 * Body:
 * - date: ISO date string (the date to calculate snapshot for)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedUser();
    const body = await request.json();

    const { date } = body;

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: date",
        },
        { status: 400 }
      );
    }

    const snapshotDate = new Date(date);

    // Calculate snapshot
    await calculateDailySnapshot(userId, snapshotDate);

    // Fetch the newly calculated snapshot
    const snapshots = await getDailySnapshots(userId, snapshotDate, snapshotDate);

    return NextResponse.json({
      success: true,
      message: "Snapshot calculated successfully",
      data: snapshots[0] || null,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("[Productivity Snapshots] Calculation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate productivity snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
